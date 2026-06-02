import { StudentContractFlowType } from "@prisma/client";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";
import { prisma } from "@/lib/prisma";
import { listParentBillingForPackage, type ParentInvoiceItem, type ParentReceiptItem } from "@/lib/student-parent-billing";

const STUDENT_CONTRACT_INVOICE_CHOICE_KEY = "student_contract_invoice_choice_v1";

export type StudentContractInvoiceChoiceMode = "CREATE_NEW" | "LINK_EXISTING";

export type StudentContractInvoiceChoice = {
  contractId: string;
  packageId: string;
  mode: StudentContractInvoiceChoiceMode;
  invoiceId: string | null;
  confirmationNote: string | null;
  selectedBy: string;
  selectedAt: string;
};

type Store = {
  choices: StudentContractInvoiceChoice[];
};

const EMPTY_STORE: Store = { choices: [] };

function sanitizeChoice(input: unknown): StudentContractInvoiceChoice | null {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const contractId = String(row.contractId ?? "").trim();
  const packageId = String(row.packageId ?? "").trim();
  const modeRaw = String(row.mode ?? "").trim();
  const mode: StudentContractInvoiceChoiceMode = modeRaw === "LINK_EXISTING" ? "LINK_EXISTING" : "CREATE_NEW";
  const selectedBy = String(row.selectedBy ?? "").trim().toLowerCase();
  const selectedAt = String(row.selectedAt ?? "").trim();
  if (!contractId || !packageId || !selectedBy || !selectedAt) return null;
  return {
    contractId,
    packageId,
    mode,
    invoiceId: mode === "LINK_EXISTING" ? String(row.invoiceId ?? "").trim() || null : null,
    confirmationNote: String(row.confirmationNote ?? "").trim() || null,
    selectedBy,
    selectedAt,
  };
}

function sanitizeStore(input: unknown): Store {
  const root = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const choices = Array.isArray(root.choices) ? root.choices.map(sanitizeChoice).filter(Boolean) as StudentContractInvoiceChoice[] : [];
  return { choices };
}

async function loadStore() {
  const { store } = await loadJsonAppSettingForDb(
    prisma as any,
    STUDENT_CONTRACT_INVOICE_CHOICE_KEY,
    EMPTY_STORE,
    sanitizeStore
  );
  return store;
}

export async function getStudentContractInvoiceChoice(contractId: string) {
  const id = contractId.trim();
  if (!id) return null;
  const store = await loadStore();
  return store.choices.find((choice) => choice.contractId === id) ?? null;
}

function invoiceHasReceipt(invoice: ParentInvoiceItem, receipts: ParentReceiptItem[]) {
  return receipts.some((receipt) => receipt.invoiceId === invoice.id);
}

function invoiceReceiptTotal(invoice: ParentInvoiceItem, receipts: ParentReceiptItem[]) {
  return receipts
    .filter((receipt) => receipt.invoiceId === invoice.id)
    .reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0);
}

export function findSimilarContractInvoices(input: {
  invoices: ParentInvoiceItem[];
  receipts: ParentReceiptItem[];
  amount: number | null | undefined;
  issueDate?: string | null;
}) {
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return [];
  return input.invoices.filter((invoice) => {
    const invoiceAmount = Number(invoice.totalAmount ?? 0);
    if (Math.abs(invoiceAmount - amount) > 0.009) return false;
    if (input.issueDate && invoice.issueDate && invoice.issueDate !== input.issueDate) {
      return invoiceHasReceipt(invoice, input.receipts);
    }
    return true;
  });
}

export async function listStudentContractInvoiceOptions(packageId: string) {
  const billing = await listParentBillingForPackage(packageId);
  const contractLinks = await prisma.studentContract.findMany({
    where: {
      packageId,
      invoiceId: { in: billing.invoices.map((invoice) => invoice.id) },
    },
    select: {
      id: true,
      flowType: true,
      status: true,
      invoiceId: true,
      invoiceNo: true,
      signedAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const linksByInvoice = new Map<string, typeof contractLinks>();
  for (const link of contractLinks) {
    if (!link.invoiceId) continue;
    const bucket = linksByInvoice.get(link.invoiceId) ?? [];
    bucket.push(link);
    linksByInvoice.set(link.invoiceId, bucket);
  }
  return billing.invoices.map((invoice) => {
    const receipts = billing.receipts.filter((receipt) => receipt.invoiceId === invoice.id);
    const linkedContracts = linksByInvoice.get(invoice.id) ?? [];
    return {
      invoice,
      receiptCount: receipts.length,
      receiptTotal: invoiceReceiptTotal(invoice, billing.receipts),
      hasReceipt: receipts.length > 0,
      linkedContracts,
      source:
        String(invoice.note ?? "").includes("student-contract:")
          ? "CONTRACT"
          : "MANUAL",
    };
  });
}

export async function saveStudentContractInvoiceChoice(input: {
  contractId: string;
  packageId: string;
  mode: StudentContractInvoiceChoiceMode;
  invoiceId?: string | null;
  confirmationNote?: string | null;
  selectedBy: string;
}) {
  const contractId = input.contractId.trim();
  const packageId = input.packageId.trim();
  const selectedBy = input.selectedBy.trim().toLowerCase();
  const mode = input.mode === "LINK_EXISTING" ? "LINK_EXISTING" : "CREATE_NEW";
  const invoiceId = String(input.invoiceId ?? "").trim();
  const confirmationNote = String(input.confirmationNote ?? "").trim();
  if (!contractId || !packageId || !selectedBy) throw new Error("Missing contract invoice choice target");

  const contract = await prisma.studentContract.findUnique({
    where: { id: contractId },
    select: { id: true, packageId: true, flowType: true, status: true },
  });
  if (!contract || contract.packageId !== packageId) throw new Error("Contract not found for this package");
  if (contract.flowType !== StudentContractFlowType.RENEWAL) {
    return null;
  }

  const billing = await listParentBillingForPackage(packageId);
  const invoice = invoiceId ? billing.invoices.find((row) => row.id === invoiceId) ?? null : null;
  const feeAmount = await prisma.studentContract.findUnique({
    where: { id: contractId },
    select: { businessInfoJson: true },
  }).then((row) => Number((row?.businessInfoJson as any)?.feeAmount ?? 0));
  const similarInvoices = findSimilarContractInvoices({
    invoices: billing.invoices,
    receipts: billing.receipts,
    amount: feeAmount,
  });

  if (mode === "LINK_EXISTING") {
    if (!invoice) throw new Error("Select an existing invoice to link");
    const hasReceipt = billing.receipts.some((receipt) => receipt.invoiceId === invoice.id);
    if (hasReceipt && confirmationNote.length < 6) {
      throw new Error("Linking a receipted invoice requires a confirmation note");
    }
  } else if (similarInvoices.length > 0 && confirmationNote.length < 6) {
    throw new Error("Creating a new invoice when a similar invoice exists requires a confirmation note");
  }

  const choice: StudentContractInvoiceChoice = {
    contractId,
    packageId,
    mode,
    invoiceId: mode === "LINK_EXISTING" ? invoiceId : null,
    confirmationNote: confirmationNote || null,
    selectedBy,
    selectedAt: new Date().toISOString(),
  };

  await mutateJsonAppSetting<Store>({
    key: STUDENT_CONTRACT_INVOICE_CHOICE_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      store.choices = store.choices.filter((row) => row.contractId !== contractId);
      store.choices.unshift(choice);
      store.choices = store.choices.slice(0, 1000);
    },
  });

  return choice;
}

import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import {
  applyParentInvoiceNumberAssignments,
  listAllParentBilling,
} from "@/lib/student-parent-billing";
import {
  applyPartnerInvoiceNumberAssignments,
  listPartnerBilling,
} from "@/lib/partner-billing";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";

type InvoiceOwner = "PARENT" | "PARTNER";

type GlobalInvoiceRow = {
  owner: InvoiceOwner;
  id: string;
  invoiceNo: string;
  createdAt: string;
  fixed: boolean;
};

function two(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromDate(input: string | Date | null | undefined) {
  const d = input ? new Date(input) : new Date();
  const x = Number.isNaN(+d) ? new Date() : d;
  return `${x.getFullYear()}${two(x.getMonth() + 1)}`;
}

export function parseInvoiceNoParts(invoiceNo: string): { monthKey: string; seq: number } | null {
  const m = /^RGT-(\d{6})-(\d{4})$/i.exec(String(invoiceNo ?? "").trim());
  if (!m) return null;
  return { monthKey: m[1], seq: Number(m[2]) };
}

function formatInvoiceNo(monthKey: string, seq: number) {
  return `RGT-${monthKey}-${String(seq).padStart(4, "0")}`;
}

async function loadGlobalInvoices(): Promise<GlobalInvoiceRow[]> {
  const [parent, partner, cfg] = await Promise.all([
    listAllParentBilling(),
    listPartnerBilling(),
    getApprovalRoleConfig(),
  ]);

  const parentReceiptByInvoice = new Map(
    parent.receipts.filter((x) => x.invoiceId).map((x) => [String(x.invoiceId), x.id]),
  );
  const partnerReceiptByInvoice = new Map(
    partner.receipts.map((x) => [x.invoiceId, x.id]),
  );

  const [parentApprovalMap, partnerApprovalMap] = await Promise.all([
    getParentReceiptApprovalMap(Array.from(parentReceiptByInvoice.values())),
    getPartnerReceiptApprovalMap(Array.from(partnerReceiptByInvoice.values())),
  ]);

  const isFinalApproved = (managerApprovedBy: string[], financeApprovedBy: string[]) =>
    areAllApproversConfirmed(managerApprovedBy, cfg.managerApproverEmails) &&
    areAllApproversConfirmed(financeApprovedBy, cfg.financeApproverEmails);

  const out: GlobalInvoiceRow[] = [];
  for (const inv of parent.invoices) {
    const receiptId = parentReceiptByInvoice.get(inv.id);
    const approval = receiptId ? parentApprovalMap.get(receiptId) : undefined;
    out.push({
      owner: "PARENT",
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      createdAt: inv.createdAt,
      fixed: Boolean(
        approval && isFinalApproved(approval.managerApprovedBy ?? [], approval.financeApprovedBy ?? []),
      ),
    });
  }
  for (const inv of partner.invoices) {
    const receiptId = partnerReceiptByInvoice.get(inv.id);
    const approval = receiptId ? partnerApprovalMap.get(receiptId) : undefined;
    out.push({
      owner: "PARTNER",
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      createdAt: inv.createdAt,
      fixed: Boolean(
        approval && isFinalApproved(approval.managerApprovedBy ?? [], approval.financeApprovedBy ?? []),
      ),
    });
  }
  return out;
}

export async function assertGlobalInvoiceNoAvailable(invoiceNo: string, exclude?: { owner: InvoiceOwner; invoiceId: string }) {
  const normalized = String(invoiceNo ?? "").trim();
  if (!/^RGT-\d{6}-\d{4}$/i.test(normalized)) {
    throw new Error("Invoice No. format must be RGT-yyyymm-xxxx");
  }
  const key = normalized.toLowerCase();
  const all = await loadGlobalInvoices();
  const conflict = all.find((x) => {
    if (x.invoiceNo.trim().toLowerCase() !== key) return false;
    if (!exclude) return true;
    return !(x.owner === exclude.owner && x.id === exclude.invoiceId);
  });
  if (conflict) throw new Error(`Invoice No. already exists: ${normalized}`);
}

export async function getNextGlobalInvoiceNo(issueDate?: string | Date | null) {
  const monthKey = monthKeyFromDate(issueDate);
  const all = await loadGlobalInvoices();
  const used = new Set(
    all
      .map((x) => parseInvoiceNoParts(x.invoiceNo))
      .filter((x): x is { monthKey: string; seq: number } => Boolean(x))
      .filter((x) => x.monthKey === monthKey)
      .map((x) => x.seq),
  );
  let seq = 1;
  while (used.has(seq)) seq += 1;
  return formatInvoiceNo(monthKey, seq);
}

export async function resequenceGlobalInvoiceNumbersForMonth(monthKey: string) {
  if (!/^\d{6}$/.test(monthKey)) throw new Error("Invalid month key");
  const all = (await loadGlobalInvoices())
    .map((x) => ({ row: x, parsed: parseInvoiceNoParts(x.invoiceNo) }))
    .filter((x): x is { row: GlobalInvoiceRow; parsed: { monthKey: string; seq: number } } => Boolean(x.parsed))
    .filter((x) => x.parsed.monthKey === monthKey);

  if (all.length === 0) return { changed: 0 };

  const fixed = all.filter((x) => x.row.fixed);
  const fixedBySeq = new Map<number, { owner: InvoiceOwner; id: string; invoiceNo: string }>();
  for (const f of fixed) {
    const existed = fixedBySeq.get(f.parsed.seq);
    if (existed) {
      throw new Error(
        `Cannot resequence ${monthKey}: duplicate fixed invoice numbers (${existed.invoiceNo}, ${f.row.invoiceNo})`,
      );
    }
    fixedBySeq.set(f.parsed.seq, { owner: f.row.owner, id: f.row.id, invoiceNo: f.row.invoiceNo });
  }

  const mutable = all
    .filter((x) => !x.row.fixed)
    .sort((a, b) => {
      if (a.parsed.seq !== b.parsed.seq) return a.parsed.seq - b.parsed.seq;
      return +new Date(a.row.createdAt) - +new Date(b.row.createdAt);
    });

  const reserved = new Set(fixed.map((x) => x.parsed.seq));
  const parentAssignments: Array<{ invoiceId: string; invoiceNo: string }> = [];
  const partnerAssignments: Array<{ invoiceId: string; invoiceNo: string }> = [];
  let next = 1;
  for (const m of mutable) {
    while (reserved.has(next)) next += 1;
    const nextNo = formatInvoiceNo(monthKey, next);
    if (m.row.invoiceNo !== nextNo) {
      if (m.row.owner === "PARENT") parentAssignments.push({ invoiceId: m.row.id, invoiceNo: nextNo });
      else partnerAssignments.push({ invoiceId: m.row.id, invoiceNo: nextNo });
    }
    next += 1;
  }

  const [parentChanged, partnerChanged] = await Promise.all([
    applyParentInvoiceNumberAssignments(parentAssignments),
    applyPartnerInvoiceNumberAssignments(partnerAssignments),
  ]);
  return { changed: parentChanged + partnerChanged };
}


import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, monthKeyFromDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";
import { logAudit } from "@/lib/audit-log";

const BUSINESS_ACCOUNTS_KEY = "business_accounts_v1";

export type BusinessAccountType = "INTERCOMPANY" | "EDUCATION_PARTNER" | "SALES_AGENT" | "CHANNEL_PARTNER" | "CORPORATE_CLIENT";
export type BusinessAgreementType =
  | "FIXED_PLUS_VARIABLE_TUTOR"
  | "COMMISSION_BY_SALES"
  | "REFERRAL_FEE_PER_STUDENT"
  | "CUSTOM_INVOICE";
export type BusinessPaymentMethod = "BANK_TRANSFER" | "PAYNOW" | "OTHER";
export type BusinessMonthlyDocumentStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

export type BusinessAccount = {
  id: string;
  type: BusinessAccountType;
  legalNameEn: string;
  legalNameZh: string;
  registrationNo: string;
  registeredAddress: string | null;
  contactName: string | null;
  contactEmail: string | null;
  currency: "SGD";
  fixedMonthlyFee: number;
  agreementType: BusinessAgreementType;
  agreementTitle: string | null;
  agreementDate: string | null;
  paymentMethod: BusinessPaymentMethod;
  paymentTerms: string;
  payeeName: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankSwiftCode: string | null;
  bankCode: string | null;
  bankBranchCode: string | null;
  paymentReferencePrefix: string | null;
  paymentInstructions: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusinessMonthlyDocument = {
  id: string;
  accountId: string;
  monthKey: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  fixedMonthlyFee: number;
  variableTutorFee: number;
  totalAmount: number;
  serviceSummary: string;
  platformsUsed: string;
  personnelInvolved: string;
  benefitSummary: string;
  tutorCostSummary: string;
  note: string | null;
  status: BusinessMonthlyDocumentStatus;
  receiptNo: string | null;
  receivedFrom: string | null;
  paidDate: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentNote: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessAccountsStore = {
  accounts: BusinessAccount[];
  monthlyDocuments: BusinessMonthlyDocument[];
  invoiceSeqByMonth: Record<string, number>;
};

const SHANGHAI_ACCOUNT_ID = "shanghai-xin-zhuo-si";

const EMPTY_STORE: BusinessAccountsStore = {
  accounts: [],
  monthlyDocuments: [],
  invoiceSeqByMonth: {},
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeAccountType(input: unknown): BusinessAccountType {
  const value = String(input ?? "").trim().toUpperCase();
  if (["INTERCOMPANY", "EDUCATION_PARTNER", "SALES_AGENT", "CHANNEL_PARTNER", "CORPORATE_CLIENT"].includes(value)) {
    return value as BusinessAccountType;
  }
  return "INTERCOMPANY";
}

function normalizeAgreementType(input: unknown): BusinessAgreementType {
  const value = String(input ?? "").trim().toUpperCase();
  if (["FIXED_PLUS_VARIABLE_TUTOR", "COMMISSION_BY_SALES", "REFERRAL_FEE_PER_STUDENT", "CUSTOM_INVOICE"].includes(value)) {
    return value as BusinessAgreementType;
  }
  return "FIXED_PLUS_VARIABLE_TUTOR";
}

function normalizePaymentMethod(input: unknown): BusinessPaymentMethod {
  const value = String(input ?? "").trim().toUpperCase();
  if (["BANK_TRANSFER", "PAYNOW", "OTHER"].includes(value)) return value as BusinessPaymentMethod;
  return "BANK_TRANSFER";
}

function normalizeDocumentStatus(input: unknown): BusinessMonthlyDocumentStatus {
  const value = String(input ?? "").trim().toUpperCase();
  if (["DRAFT", "ISSUED", "PAID", "VOID"].includes(value)) return value as BusinessMonthlyDocumentStatus;
  return "DRAFT";
}

function textOrNull(input: unknown) {
  return String(input ?? "").trim() || null;
}

function roundMoney(input: unknown) {
  return Math.round((Number(input ?? 0) || 0) * 100) / 100;
}

function slugifyCompanyName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return base || `business-${crypto.randomUUID().slice(0, 8)}`;
}

function sanitizeStore(input: unknown): BusinessAccountsStore {
  const root = input && typeof input === "object" ? (input as any) : {};
  const accounts = Array.isArray(root.accounts) ? root.accounts : [];
  const monthlyDocuments = Array.isArray(root.monthlyDocuments) ? root.monthlyDocuments : [];
  const invoiceSeqByMonth = root.invoiceSeqByMonth && typeof root.invoiceSeqByMonth === "object" ? root.invoiceSeqByMonth : {};
  return {
    accounts: accounts
      .map((x: any) => ({
        id: String(x.id ?? "").trim(),
        type: normalizeAccountType(x.type),
        legalNameEn: String(x.legalNameEn ?? "").trim(),
        legalNameZh: String(x.legalNameZh ?? "").trim(),
        registrationNo: String(x.registrationNo ?? "").trim(),
        registeredAddress: textOrNull(x.registeredAddress),
        contactName: textOrNull(x.contactName),
        contactEmail: textOrNull(x.contactEmail),
        currency: "SGD" as const,
        fixedMonthlyFee: roundMoney(x.fixedMonthlyFee),
        agreementType: normalizeAgreementType(x.agreementType),
        agreementTitle: textOrNull(x.agreementTitle),
        agreementDate: normalizeDateOnly(x.agreementDate) ?? null,
        paymentMethod: normalizePaymentMethod(x.paymentMethod),
        paymentTerms: String(x.paymentTerms ?? "").trim() || "Due within 14 days",
        payeeName: textOrNull(x.payeeName),
        bankName: textOrNull(x.bankName),
        bankAccountNo: textOrNull(x.bankAccountNo),
        bankSwiftCode: textOrNull(x.bankSwiftCode),
        bankCode: textOrNull(x.bankCode),
        bankBranchCode: textOrNull(x.bankBranchCode),
        paymentReferencePrefix: textOrNull(x.paymentReferencePrefix),
        paymentInstructions: textOrNull(x.paymentInstructions),
        note: textOrNull(x.note),
        isActive: x.isActive !== false,
        createdAt: String(x.createdAt ?? nowIso()),
        updatedAt: String(x.updatedAt ?? nowIso()),
      }))
      .filter((x: BusinessAccount) => x.id && x.legalNameEn),
    monthlyDocuments: monthlyDocuments
      .map((x: any) => ({
        id: String(x.id ?? "").trim(),
        accountId: String(x.accountId ?? "").trim(),
        monthKey: String(x.monthKey ?? "").trim(),
        invoiceNo: String(x.invoiceNo ?? "").trim(),
        issueDate: normalizeDateOnly(x.issueDate) ?? formatBusinessDateOnly(new Date()),
        dueDate: normalizeDateOnly(x.dueDate) ?? formatBusinessDateOnly(new Date()),
        fixedMonthlyFee: roundMoney(x.fixedMonthlyFee),
        variableTutorFee: roundMoney(x.variableTutorFee),
        totalAmount: roundMoney(x.totalAmount),
        serviceSummary: String(x.serviceSummary ?? "").trim(),
        platformsUsed: String(x.platformsUsed ?? "").trim(),
        personnelInvolved: String(x.personnelInvolved ?? "").trim(),
        benefitSummary: String(x.benefitSummary ?? "").trim(),
        tutorCostSummary: String(x.tutorCostSummary ?? "").trim(),
        note: textOrNull(x.note),
        status: normalizeDocumentStatus(x.status),
        receiptNo: textOrNull(x.receiptNo),
        receivedFrom: textOrNull(x.receivedFrom),
        paidDate: normalizeDateOnly(x.paidDate) ?? null,
        paidAmount: x.paidAmount == null || String(x.paidAmount).trim() === "" ? null : roundMoney(x.paidAmount),
        paymentMethod: textOrNull(x.paymentMethod),
        paymentReference: textOrNull(x.paymentReference),
        paymentNote: textOrNull(x.paymentNote),
        issuedAt: textOrNull(x.issuedAt),
        issuedBy: textOrNull(x.issuedBy),
        voidedAt: textOrNull(x.voidedAt),
        voidedBy: textOrNull(x.voidedBy),
        voidReason: textOrNull(x.voidReason),
        createdBy: String(x.createdBy ?? "").trim(),
        createdAt: String(x.createdAt ?? nowIso()),
        updatedAt: String(x.updatedAt ?? nowIso()),
      }))
      .filter((x: BusinessMonthlyDocument) => x.id && x.accountId && /^\d{4}-\d{2}$/.test(x.monthKey)),
    invoiceSeqByMonth: Object.entries(invoiceSeqByMonth).reduce<Record<string, number>>((acc, [k, v]) => {
      const key = String(k);
      if (/^\d{6}$/.test(key)) acc[key] = Math.max(0, Math.floor(Number(v) || 0));
      return acc;
    }, {}),
  };
}

function defaultShanghaiAccount(): BusinessAccount {
  const now = nowIso();
  return {
    id: SHANGHAI_ACCOUNT_ID,
    type: "INTERCOMPANY",
    legalNameZh: "上海新卓思教育科技有限公司",
    legalNameEn: "shang hai xin zhuo si Education Technology Co. Ltd.",
    registrationNo: "91310113MADBXWF54D",
    registeredAddress: null,
    contactName: null,
    contactEmail: null,
    currency: "SGD",
    fixedMonthlyFee: 14000,
    agreementType: "FIXED_PLUS_VARIABLE_TUTOR",
    agreementTitle: "Intercompany Services Agreement",
    agreementDate: null,
    paymentMethod: "BANK_TRANSFER",
    paymentTerms: "Due within 14 days",
    payeeName: "GT Educational Institute Pte Ltd",
    bankName: null,
    bankAccountNo: null,
    bankSwiftCode: null,
    bankCode: null,
    bankBranchCode: null,
    paymentReferencePrefix: "GTEI",
    paymentInstructions: "Please pay by bank transfer and quote the invoice number as the payment reference.",
    note: "Company-level intercompany service billing. Keep separate from New Oriental partner settlement.",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function ensureDefaults(store: BusinessAccountsStore) {
  if (!store.accounts.some((x) => x.id === SHANGHAI_ACCOUNT_ID)) {
    store.accounts.unshift(defaultShanghaiAccount());
  }
}

export async function listBusinessAccounts() {
  const { store } = await loadJsonAppSettingForDb(prisma as any, BUSINESS_ACCOUNTS_KEY, EMPTY_STORE, sanitizeStore);
  ensureDefaults(store);
  return store;
}

export async function getBusinessAccount(accountId: string) {
  const store = await listBusinessAccounts();
  return store.accounts.find((x) => x.id === accountId) ?? null;
}

export async function createBusinessAccount(input: {
  type: BusinessAccountType;
  legalNameEn: string;
  legalNameZh?: string | null;
  registrationNo?: string | null;
  registeredAddress?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  fixedMonthlyFee?: number;
  agreementType?: BusinessAgreementType;
  agreementTitle?: string | null;
  agreementDate?: string | null;
  paymentMethod?: BusinessPaymentMethod;
  paymentTerms?: string | null;
  payeeName?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankSwiftCode?: string | null;
  bankCode?: string | null;
  bankBranchCode?: string | null;
  paymentReferencePrefix?: string | null;
  paymentInstructions?: string | null;
  note?: string | null;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let created: BusinessAccount | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const legalNameEn = input.legalNameEn.trim();
      if (!legalNameEn) throw new Error("English company name is required");
      const idBase = slugifyCompanyName(legalNameEn);
      let id = idBase;
      let i = 2;
      while (store.accounts.some((x) => x.id === id)) {
        id = `${idBase}-${i}`;
        i += 1;
      }
      const now = nowIso();
      created = {
        id,
        type: normalizeAccountType(input.type),
        legalNameEn,
        legalNameZh: input.legalNameZh?.trim() || legalNameEn,
        registrationNo: input.registrationNo?.trim() || "",
        registeredAddress: textOrNull(input.registeredAddress),
        contactName: textOrNull(input.contactName),
        contactEmail: textOrNull(input.contactEmail),
        currency: "SGD",
        fixedMonthlyFee: Math.max(0, roundMoney(input.fixedMonthlyFee)),
        agreementType: normalizeAgreementType(input.agreementType),
        agreementTitle: textOrNull(input.agreementTitle),
        agreementDate: normalizeDateOnly(input.agreementDate) ?? null,
        paymentMethod: normalizePaymentMethod(input.paymentMethod),
        paymentTerms: input.paymentTerms?.trim() || "Due within 14 days",
        payeeName: textOrNull(input.payeeName) ?? "GT Educational Institute Pte Ltd",
        bankName: textOrNull(input.bankName),
        bankAccountNo: textOrNull(input.bankAccountNo),
        bankSwiftCode: textOrNull(input.bankSwiftCode),
        bankCode: textOrNull(input.bankCode),
        bankBranchCode: textOrNull(input.bankBranchCode),
        paymentReferencePrefix: textOrNull(input.paymentReferencePrefix) ?? "GTEI",
        paymentInstructions: textOrNull(input.paymentInstructions),
        note: textOrNull(input.note),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      store.accounts.unshift(created);
    },
  });
  const createdAccount = created as BusinessAccount | null;
  if (!createdAccount) throw new Error("Business account was not created");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "CREATE_ACCOUNT",
    entityType: "BusinessAccount",
    entityId: createdAccount.id,
    meta: { legalNameEn: createdAccount.legalNameEn, type: createdAccount.type },
  });
  return createdAccount;
}

export async function updateBusinessAccount(input: {
  accountId: string;
  type: BusinessAccountType;
  legalNameEn: string;
  legalNameZh?: string | null;
  registrationNo?: string | null;
  registeredAddress?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  fixedMonthlyFee?: number;
  agreementType?: BusinessAgreementType;
  agreementTitle?: string | null;
  agreementDate?: string | null;
  paymentMethod?: BusinessPaymentMethod;
  paymentTerms?: string | null;
  payeeName?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankSwiftCode?: string | null;
  bankCode?: string | null;
  bankBranchCode?: string | null;
  paymentReferencePrefix?: string | null;
  paymentInstructions?: string | null;
  note?: string | null;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let updated: BusinessAccount | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const idx = store.accounts.findIndex((x) => x.id === input.accountId);
      if (idx < 0) throw new Error("Business account not found");
      const current = store.accounts[idx];
      const legalNameEn = input.legalNameEn.trim();
      if (!legalNameEn) throw new Error("English company name is required");
      updated = {
        ...current,
        type: normalizeAccountType(input.type),
        legalNameEn,
        legalNameZh: input.legalNameZh?.trim() || legalNameEn,
        registrationNo: input.registrationNo?.trim() || "",
        registeredAddress: textOrNull(input.registeredAddress),
        contactName: textOrNull(input.contactName),
        contactEmail: textOrNull(input.contactEmail),
        fixedMonthlyFee: Math.max(0, roundMoney(input.fixedMonthlyFee)),
        agreementType: normalizeAgreementType(input.agreementType),
        agreementTitle: textOrNull(input.agreementTitle),
        agreementDate: normalizeDateOnly(input.agreementDate) ?? null,
        paymentMethod: normalizePaymentMethod(input.paymentMethod),
        paymentTerms: input.paymentTerms?.trim() || "Due within 14 days",
        payeeName: textOrNull(input.payeeName) ?? "GT Educational Institute Pte Ltd",
        bankName: textOrNull(input.bankName),
        bankAccountNo: textOrNull(input.bankAccountNo),
        bankSwiftCode: textOrNull(input.bankSwiftCode),
        bankCode: textOrNull(input.bankCode),
        bankBranchCode: textOrNull(input.bankBranchCode),
        paymentReferencePrefix: textOrNull(input.paymentReferencePrefix) ?? "GTEI",
        paymentInstructions: textOrNull(input.paymentInstructions),
        note: textOrNull(input.note),
        updatedAt: nowIso(),
      };
      store.accounts[idx] = updated;
    },
  });
  const updatedAccount = updated as BusinessAccount | null;
  if (!updatedAccount) throw new Error("Business account was not updated");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "UPDATE_ACCOUNT",
    entityType: "BusinessAccount",
    entityId: input.accountId,
    meta: { legalNameEn: updatedAccount.legalNameEn, type: updatedAccount.type },
  });
  return updatedAccount;
}

function nextInvoiceNo(store: BusinessAccountsStore, issueDate: string) {
  const monthKey = monthKeyFromDateOnly(issueDate).replace("-", "");
  const current = Math.max(
    Number(store.invoiceSeqByMonth[monthKey] ?? 0) || 0,
    ...store.monthlyDocuments
      .map((x) => new RegExp(`^GTEI-${monthKey}-(\\d{3,})$`, "i").exec(x.invoiceNo)?.[1])
      .filter((x): x is string => Boolean(x))
      .map((x) => Number(x) || 0),
  );
  const next = current + 1;
  store.invoiceSeqByMonth[monthKey] = next;
  return `GTEI-${monthKey}-${String(next).padStart(3, "0")}`;
}

export async function createBusinessMonthlyDocument(input: {
  accountId: string;
  monthKey: string;
  issueDate: string;
  dueDate: string;
  variableTutorFee: number;
  serviceSummary: string;
  platformsUsed: string;
  personnelInvolved: string;
  benefitSummary: string;
  tutorCostSummary: string;
  note?: string | null;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let created: BusinessMonthlyDocument | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const account = store.accounts.find((x) => x.id === input.accountId);
      if (!account) throw new Error("Business account not found");
      const monthKey = String(input.monthKey ?? "").trim();
      if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error("Month must be YYYY-MM");
      if (store.monthlyDocuments.some((x) => x.accountId === account.id && x.monthKey === monthKey && x.status !== "VOID")) {
        throw new Error("Monthly document already exists for this account and month");
      }
      const issueDate = normalizeDateOnly(input.issueDate) ?? formatBusinessDateOnly(new Date());
      const dueDate = normalizeDateOnly(input.dueDate) ?? issueDate;
      const variableTutorFee = Math.max(0, Number(input.variableTutorFee ?? 0) || 0);
      const fixedMonthlyFee = Math.max(0, Number(account.fixedMonthlyFee ?? 0) || 0);
      const now = nowIso();
      created = {
        id: crypto.randomUUID(),
        accountId: account.id,
        monthKey,
        invoiceNo: nextInvoiceNo(store, issueDate),
        issueDate,
        dueDate,
        fixedMonthlyFee,
        variableTutorFee,
        totalAmount: fixedMonthlyFee + variableTutorFee,
        serviceSummary: input.serviceSummary.trim() || "Recurring corporate support services and tutor-related support services.",
        platformsUsed: input.platformsUsed.trim() || "SGT Manage, email, online collaboration tools, video calls.",
        personnelInvolved: input.personnelInvolved.trim() || "-",
        benefitSummary: input.benefitSummary.trim() || "Operational, market, academic, and tutor coordination support for the reporting period.",
        tutorCostSummary: input.tutorCostSummary.trim() || "Tutor fees and directly attributable tutor support costs for the billing period.",
        note: input.note?.trim() || null,
        status: "DRAFT",
        receiptNo: null,
        receivedFrom: null,
        paidDate: null,
        paidAmount: null,
        paymentMethod: null,
        paymentReference: null,
        paymentNote: null,
        issuedAt: null,
        issuedBy: null,
        voidedAt: null,
        voidedBy: null,
        voidReason: null,
        createdBy: input.actor.email ?? "",
        createdAt: now,
        updatedAt: now,
      };
      store.monthlyDocuments.unshift(created);
    },
  });
  const createdDoc = created as BusinessMonthlyDocument | null;
  if (!createdDoc) throw new Error("Document was not created");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "CREATE_MONTHLY_DOCUMENT",
    entityType: "BusinessMonthlyDocument",
    entityId: createdDoc.id,
    meta: { accountId: input.accountId, monthKey: input.monthKey, invoiceNo: createdDoc.invoiceNo },
  });
  return createdDoc;
}

function buildReceiptNo(invoiceNo: string) {
  return `${invoiceNo}-R001`;
}

export async function issueBusinessMonthlyDocument(input: {
  documentId: string;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let item: BusinessMonthlyDocument | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const idx = store.monthlyDocuments.findIndex((x) => x.id === input.documentId);
      if (idx < 0) throw new Error("Document not found");
      const current = store.monthlyDocuments[idx];
      if (current.status !== "DRAFT") throw new Error("Only draft documents can be issued");
      item = {
        ...current,
        status: "ISSUED",
        issuedAt: nowIso(),
        issuedBy: input.actor.email ?? "",
        updatedAt: nowIso(),
      };
      store.monthlyDocuments[idx] = item;
    },
  });
  const issuedItem = item as BusinessMonthlyDocument | null;
  if (!issuedItem) throw new Error("Document was not issued");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "ISSUE_MONTHLY_DOCUMENT",
    entityType: "BusinessMonthlyDocument",
    entityId: input.documentId,
    meta: { invoiceNo: issuedItem.invoiceNo },
  });
  return issuedItem;
}

export async function deleteDraftBusinessMonthlyDocument(input: {
  documentId: string;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let deleted: BusinessMonthlyDocument | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const idx = store.monthlyDocuments.findIndex((x) => x.id === input.documentId);
      if (idx < 0) throw new Error("Document not found");
      const current = store.monthlyDocuments[idx];
      if (current.status !== "DRAFT") throw new Error("Only draft documents can be deleted. Void issued or paid documents instead.");
      deleted = current;
      store.monthlyDocuments.splice(idx, 1);
    },
  });
  const deletedItem = deleted as BusinessMonthlyDocument | null;
  if (!deletedItem) throw new Error("Document was not deleted");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "DELETE_DRAFT_MONTHLY_DOCUMENT",
    entityType: "BusinessMonthlyDocument",
    entityId: input.documentId,
    meta: { invoiceNo: deletedItem.invoiceNo, monthKey: deletedItem.monthKey },
  });
  return deletedItem;
}

export async function voidBusinessMonthlyDocument(input: {
  documentId: string;
  reason: string;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let item: BusinessMonthlyDocument | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const idx = store.monthlyDocuments.findIndex((x) => x.id === input.documentId);
      if (idx < 0) throw new Error("Document not found");
      const current = store.monthlyDocuments[idx];
      if (current.status === "VOID") throw new Error("Document is already voided");
      const now = nowIso();
      item = {
        ...current,
        status: "VOID",
        voidedAt: now,
        voidedBy: input.actor.email ?? "",
        voidReason: input.reason.trim() || "Voided by finance/admin",
        updatedAt: now,
      };
      store.monthlyDocuments[idx] = item;
    },
  });
  const voidedItem = item as BusinessMonthlyDocument | null;
  if (!voidedItem) throw new Error("Document was not voided");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "VOID_MONTHLY_DOCUMENT",
    entityType: "BusinessMonthlyDocument",
    entityId: input.documentId,
    meta: { invoiceNo: voidedItem.invoiceNo, reason: voidedItem.voidReason },
  });
  return voidedItem;
}

export async function recordBusinessMonthlyPayment(input: {
  documentId: string;
  receiptNo?: string | null;
  receivedFrom?: string | null;
  paidDate: string;
  paidAmount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  paymentNote?: string | null;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  let item: BusinessMonthlyDocument | null = null;
  await mutateJsonAppSetting({
    key: BUSINESS_ACCOUNTS_KEY,
    fallback: EMPTY_STORE,
    sanitize: sanitizeStore,
    mutate: (store) => {
      ensureDefaults(store);
      const idx = store.monthlyDocuments.findIndex((x) => x.id === input.documentId);
      if (idx < 0) throw new Error("Document not found");
      const current = store.monthlyDocuments[idx];
      if (current.status === "VOID") throw new Error("Voided documents cannot be marked paid");
      const paidDate = normalizeDateOnly(input.paidDate) ?? formatBusinessDateOnly(new Date());
      const paidAmount = Math.max(0, roundMoney(input.paidAmount));
      if (paidAmount <= 0) throw new Error("Paid amount must be greater than zero");
      const now = nowIso();
      const account = store.accounts.find((x) => x.id === current.accountId);
      const receiptNo = textOrNull(input.receiptNo) ?? current.receiptNo ?? buildReceiptNo(current.invoiceNo);
      item = {
        ...current,
        status: "PAID",
        receiptNo,
        receivedFrom: textOrNull(input.receivedFrom) ?? account?.legalNameEn ?? account?.legalNameZh ?? null,
        paidDate,
        paidAmount,
        paymentMethod: input.paymentMethod.trim() || "Bank Transfer",
        paymentReference: textOrNull(input.paymentReference),
        paymentNote: textOrNull(input.paymentNote),
        issuedAt: current.issuedAt ?? now,
        issuedBy: current.issuedBy ?? input.actor.email ?? "",
        updatedAt: now,
      };
      store.monthlyDocuments[idx] = item;
    },
  });
  const paidItem = item as BusinessMonthlyDocument | null;
  if (!paidItem) throw new Error("Payment was not recorded");
  await logAudit({
    actor: input.actor,
    module: "BUSINESS_ACCOUNTS",
    action: "RECORD_PAYMENT",
    entityType: "BusinessMonthlyDocument",
    entityId: input.documentId,
    meta: { invoiceNo: paidItem.invoiceNo, receiptNo: paidItem.receiptNo, paidAmount: paidItem.paidAmount },
  });
  return paidItem;
}

export async function getBusinessMonthlyDocument(id: string) {
  const store = await listBusinessAccounts();
  const document = store.monthlyDocuments.find((x) => x.id === id) ?? null;
  if (!document) return null;
  const account = store.accounts.find((x) => x.id === document.accountId) ?? null;
  return account ? { account, document } : null;
}

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, monthKeyFromDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";
import { logAudit } from "@/lib/audit-log";

const BUSINESS_ACCOUNTS_KEY = "business_accounts_v1";

export type BusinessAccountType = "INTERCOMPANY" | "EDUCATION_PARTNER" | "SALES_AGENT";
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
  agreementTitle: string | null;
  agreementDate: string | null;
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

function sanitizeStore(input: unknown): BusinessAccountsStore {
  const root = input && typeof input === "object" ? (input as any) : {};
  const accounts = Array.isArray(root.accounts) ? root.accounts : [];
  const monthlyDocuments = Array.isArray(root.monthlyDocuments) ? root.monthlyDocuments : [];
  const invoiceSeqByMonth = root.invoiceSeqByMonth && typeof root.invoiceSeqByMonth === "object" ? root.invoiceSeqByMonth : {};
  return {
    accounts: accounts
      .map((x: any) => ({
        id: String(x.id ?? "").trim(),
        type: String(x.type ?? "INTERCOMPANY") as BusinessAccountType,
        legalNameEn: String(x.legalNameEn ?? "").trim(),
        legalNameZh: String(x.legalNameZh ?? "").trim(),
        registrationNo: String(x.registrationNo ?? "").trim(),
        registeredAddress: String(x.registeredAddress ?? "").trim() || null,
        contactName: String(x.contactName ?? "").trim() || null,
        contactEmail: String(x.contactEmail ?? "").trim() || null,
        currency: "SGD" as const,
        fixedMonthlyFee: Number(x.fixedMonthlyFee ?? 0) || 0,
        agreementTitle: String(x.agreementTitle ?? "").trim() || null,
        agreementDate: normalizeDateOnly(x.agreementDate) ?? null,
        note: String(x.note ?? "").trim() || null,
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
        fixedMonthlyFee: Number(x.fixedMonthlyFee ?? 0) || 0,
        variableTutorFee: Number(x.variableTutorFee ?? 0) || 0,
        totalAmount: Number(x.totalAmount ?? 0) || 0,
        serviceSummary: String(x.serviceSummary ?? "").trim(),
        platformsUsed: String(x.platformsUsed ?? "").trim(),
        personnelInvolved: String(x.personnelInvolved ?? "").trim(),
        benefitSummary: String(x.benefitSummary ?? "").trim(),
        tutorCostSummary: String(x.tutorCostSummary ?? "").trim(),
        note: String(x.note ?? "").trim() || null,
        status: String(x.status ?? "DRAFT") as BusinessMonthlyDocumentStatus,
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
    agreementTitle: "Intercompany Services Agreement",
    agreementDate: null,
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

export async function getBusinessMonthlyDocument(id: string) {
  const store = await listBusinessAccounts();
  const document = store.monthlyDocuments.find((x) => x.id === id) ?? null;
  if (!document) return null;
  const account = store.accounts.find((x) => x.id === document.accountId) ?? null;
  return account ? { account, document } : null;
}

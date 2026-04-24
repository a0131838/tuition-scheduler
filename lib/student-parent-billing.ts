import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import crypto from "crypto";
import { formatDateOnly, monthKeyFromDateOnly, normalizeDateOnly, normalizeNullableDateOnly } from "@/lib/date-only";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";

const PARENT_BILLING_KEY = "parent_billing_v1";

export type ParentInvoiceItem = {
  id: string;
  packageId: string;
  studentId: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  courseStartDate: string | null;
  courseEndDate: string | null;
  billTo: string;
  quantity: number;
  description: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  paymentTerms: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ParentPaymentRecordItem = {
  id: string;
  packageId: string;
  studentId: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentAmount: number | null;
  referenceNo: string | null;
  uploadedBy: string;
  uploadedAt: string;
  originalFileName: string;
  storedFileName: string;
  relativePath: string;
  note: string | null;
};

export type ParentReceiptItem = {
  id: string;
  packageId: string;
  studentId: string;
  invoiceId: string | null;
  paymentRecordId: string | null;
  receiptNo: string;
  receiptDate: string;
  receivedFrom: string;
  paidBy: string;
  quantity: number;
  description: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  amountReceived: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type ParentBillingStore = {
  invoices: ParentInvoiceItem[];
  paymentRecords: ParentPaymentRecordItem[];
  receipts: ParentReceiptItem[];
  deletedInvoices: Array<{
    id: string;
    invoiceId: string;
    invoiceNo: string;
    packageId: string;
    studentId: string;
    billTo: string;
    issueDate: string;
    deletedBy: string;
    deletedAt: string;
  }>;
  invoiceSeqByMonth: Record<string, number>;
};

const EMPTY_PARENT_BILLING_STORE: ParentBillingStore = {
  invoices: [],
  paymentRecords: [],
  receipts: [],
  deletedInvoices: [],
  invoiceSeqByMonth: {},
};

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function parseNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(v: number) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

function buildParentReceiptNo(invoiceNo: string, ordinal: number) {
  return ordinal <= 1 ? `${invoiceNo}-RC` : `${invoiceNo}-RC${ordinal}`;
}

function parseParentReceiptOrdinal(receiptNo: string, invoiceNo: string) {
  const normalizedReceiptNo = String(receiptNo ?? "").trim().toLowerCase();
  const normalizedInvoiceNo = String(invoiceNo ?? "").trim().toLowerCase();
  if (!normalizedReceiptNo || !normalizedInvoiceNo) return 0;
  const firstReceiptNo = `${normalizedInvoiceNo}-rc`;
  if (normalizedReceiptNo === firstReceiptNo) return 1;
  const match = normalizedReceiptNo.match(new RegExp(`^${normalizedInvoiceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-rc([2-9]\\d*)$`, "i"));
  if (!match) return 0;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal >= 2 ? ordinal : 0;
}

function nextParentReceiptOrdinalForInvoice(
  receipts: Array<Pick<ParentReceiptItem, "receiptNo">>,
  invoiceNo: string,
) {
  let maxOrdinal = 0;
  for (const receipt of receipts) {
    maxOrdinal = Math.max(maxOrdinal, parseParentReceiptOrdinal(receipt.receiptNo, invoiceNo));
  }
  return maxOrdinal + 1;
}

function sanitizeStore(input: unknown): ParentBillingStore {
  const out: ParentBillingStore = {
    invoices: [],
    paymentRecords: [],
    receipts: [],
    deletedInvoices: [],
    invoiceSeqByMonth: {},
  };
  const today = formatDateOnly(new Date());
  if (!input || typeof input !== "object") return out;
  const root = input as Record<string, unknown>;

  const invoicesRaw = Array.isArray(root.invoices) ? root.invoices : [];
  for (const row of invoicesRaw) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = String(x.id ?? "").trim();
    const packageId = String(x.packageId ?? "").trim();
    const studentId = String(x.studentId ?? "").trim();
    const invoiceNo = String(x.invoiceNo ?? "").trim();
    if (!id || !packageId || !studentId || !invoiceNo) continue;
    out.invoices.push({
      id,
      packageId,
      studentId,
      invoiceNo,
      issueDate: normalizeDateOnly(x.issueDate as string | Date | null | undefined, new Date()) ?? today,
      dueDate: normalizeDateOnly(x.dueDate as string | Date | null | undefined, new Date()) ?? today,
      courseStartDate: normalizeNullableDateOnly(x.courseStartDate as string | Date | null | undefined),
      courseEndDate: normalizeNullableDateOnly(x.courseEndDate as string | Date | null | undefined),
      billTo: String(x.billTo ?? "").trim(),
      quantity: parseNumber(x.quantity, 1),
      description: String(x.description ?? "").trim(),
      amount: parseNumber(x.amount, 0),
      gstAmount: parseNumber(x.gstAmount, 0),
      totalAmount: parseNumber(x.totalAmount, 0),
      paymentTerms: String(x.paymentTerms ?? "").trim() || "Immediate",
      note: String(x.note ?? "").trim() || null,
      createdBy: normalizeEmail(String(x.createdBy ?? "")),
      createdAt: String(x.createdAt ?? "").trim() || new Date().toISOString(),
      updatedAt: String(x.updatedAt ?? "").trim() || new Date().toISOString(),
    });
  }

  const paymentRaw = Array.isArray(root.paymentRecords) ? root.paymentRecords : [];
  for (const row of paymentRaw) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = String(x.id ?? "").trim();
    const packageId = String(x.packageId ?? "").trim();
    const studentId = String(x.studentId ?? "").trim();
    const relativePath = String(x.relativePath ?? "").trim();
    if (!id || !packageId || !studentId || !relativePath) continue;
    out.paymentRecords.push({
      id,
      packageId,
      studentId,
      paymentDate: normalizeNullableDateOnly(x.paymentDate as string | Date | null | undefined),
      paymentMethod: String(x.paymentMethod ?? "").trim() || null,
      paymentAmount:
        x.paymentAmount == null || String(x.paymentAmount).trim() === ""
          ? null
          : roundMoney(parseNumber(x.paymentAmount, 0)),
      referenceNo: String(x.referenceNo ?? "").trim() || null,
      uploadedBy: normalizeEmail(String(x.uploadedBy ?? "")),
      uploadedAt: String(x.uploadedAt ?? "").trim() || new Date().toISOString(),
      originalFileName: String(x.originalFileName ?? "").trim() || "payment-proof",
      storedFileName: String(x.storedFileName ?? "").trim() || "payment-proof",
      relativePath,
      note: String(x.note ?? "").trim() || null,
    });
  }

  const receiptsRaw = Array.isArray(root.receipts) ? root.receipts : [];
  for (const row of receiptsRaw) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = String(x.id ?? "").trim();
    const packageId = String(x.packageId ?? "").trim();
    const studentId = String(x.studentId ?? "").trim();
    const receiptNo = String(x.receiptNo ?? "").trim();
    if (!id || !packageId || !studentId || !receiptNo) continue;
    out.receipts.push({
      id,
      packageId,
      studentId,
      invoiceId: String(x.invoiceId ?? "").trim() || null,
      paymentRecordId: String(x.paymentRecordId ?? "").trim() || null,
      receiptNo,
      receiptDate: normalizeDateOnly(x.receiptDate as string | Date | null | undefined, new Date()) ?? today,
      receivedFrom: String(x.receivedFrom ?? "").trim(),
      paidBy: String(x.paidBy ?? "").trim(),
      quantity: parseNumber(x.quantity, 1),
      description: String(x.description ?? "").trim(),
      amount: parseNumber(x.amount, 0),
      gstAmount: parseNumber(x.gstAmount, 0),
      totalAmount: parseNumber(x.totalAmount, 0),
      amountReceived: parseNumber(x.amountReceived, 0),
      note: String(x.note ?? "").trim() || null,
      createdBy: normalizeEmail(String(x.createdBy ?? "")),
      createdAt: String(x.createdAt ?? "").trim() || new Date().toISOString(),
      updatedAt: String(x.updatedAt ?? "").trim() || new Date().toISOString(),
    });
  }

  const deletedInvoicesRaw = Array.isArray(root.deletedInvoices) ? root.deletedInvoices : [];
  for (const row of deletedInvoicesRaw) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = String(x.id ?? "").trim();
    const invoiceId = String(x.invoiceId ?? "").trim();
    const invoiceNo = String(x.invoiceNo ?? "").trim();
    const packageId = String(x.packageId ?? "").trim();
    const studentId = String(x.studentId ?? "").trim();
    if (!id || !invoiceId || !invoiceNo || !packageId || !studentId) continue;
    out.deletedInvoices.push({
      id,
      invoiceId,
      invoiceNo,
      packageId,
      studentId,
      billTo: String(x.billTo ?? "").trim(),
      issueDate: normalizeDateOnly(x.issueDate as string | Date | null | undefined, new Date()) ?? today,
      deletedBy: normalizeEmail(String(x.deletedBy ?? "")),
      deletedAt: String(x.deletedAt ?? "").trim() || new Date().toISOString(),
    });
  }

  const seqRaw = root.invoiceSeqByMonth;
  if (seqRaw && typeof seqRaw === "object" && !Array.isArray(seqRaw)) {
    for (const [k, v] of Object.entries(seqRaw as Record<string, unknown>)) {
      if (!/^\d{6}$/.test(k)) continue;
      const n = parseNumber(v, 0);
      if (n > 0) out.invoiceSeqByMonth[k] = Math.floor(n);
    }
  }

  return out;
}

async function loadStore(): Promise<ParentBillingStore> {
  const { store } = await loadJsonAppSettingForDb(
    prisma as any,
    PARENT_BILLING_KEY,
    EMPTY_PARENT_BILLING_STORE,
    sanitizeStore,
  );
  return store;
}

function byNewest<T>(rows: T[], pickTime: (row: T) => string) {
  return [...rows].sort((a, b) => +new Date(pickTime(b)) - +new Date(pickTime(a)));
}

function monthKeyFromDate(input: string | Date | null | undefined) {
  return monthKeyFromDateOnly(input).replace("-", "");
}

function parseInvoiceNo(invoiceNo: string): { monthKey: string; seq: number } | null {
  const m = /^RGT-(\d{6})-(\d{4})$/i.exec(String(invoiceNo ?? "").trim());
  if (!m) return null;
  return { monthKey: m[1], seq: Number(m[2]) };
}

function rebuildInvoiceSeqByMonth(store: ParentBillingStore) {
  const out: Record<string, number> = {};
  for (const inv of store.invoices) {
    const parsed = parseInvoiceNo(inv.invoiceNo);
    if (!parsed) continue;
    const current = Number(out[parsed.monthKey] || 0);
    if (parsed.seq > current) out[parsed.monthKey] = parsed.seq;
  }
  store.invoiceSeqByMonth = out;
}

function ensureUniqueInvoiceNo(store: ParentBillingStore, invoiceNo: string) {
  const key = invoiceNo.trim().toLowerCase();
  if (!key) throw new Error("Invoice No. is required");
  if (!/^rgt-\d{6}-\d{4}$/i.test(key)) {
    throw new Error("Invoice No. format must be RGT-yyyymm-xxxx");
  }
  if (store.invoices.some((x) => x.invoiceNo.trim().toLowerCase() === key)) {
    throw new Error(`Invoice No. already exists: ${invoiceNo}`);
  }
}

function ensureUniqueReceiptNo(store: ParentBillingStore, receiptNo: string) {
  const key = receiptNo.trim().toLowerCase();
  if (!key) throw new Error("Receipt No. is required");
  if (!/^rgt-\d{6}-\d{4}-rc(?:[2-9]\d*)?$/i.test(key)) {
    throw new Error("Receipt No. format must be RGT-yyyymm-xxxx-RC or RGT-yyyymm-xxxx-RC2");
  }
  if (store.receipts.some((x) => x.receiptNo.trim().toLowerCase() === key)) {
    throw new Error(`Receipt No. already exists: ${receiptNo}`);
  }
}

function consumeInvoiceNoSequence(store: ParentBillingStore, invoiceNo: string) {
  const parsed = parseInvoiceNo(invoiceNo);
  if (!parsed) return;
  const current = Number(store.invoiceSeqByMonth[parsed.monthKey] || 0);
  if (parsed.seq > current) {
    store.invoiceSeqByMonth[parsed.monthKey] = parsed.seq;
  }
}

function nextInvoiceNoFromStore(store: ParentBillingStore, monthKey: string) {
  const base = Number(store.invoiceSeqByMonth[monthKey] || 0);
  let next = base + 1;
  const used = new Set(
    store.invoices
      .map((x) => parseInvoiceNo(x.invoiceNo))
      .filter((x): x is { monthKey: string; seq: number } => Boolean(x))
      .filter((x) => x.monthKey === monthKey)
      .map((x) => x.seq)
  );
  while (used.has(next)) next += 1;
  return `RGT-${monthKey}-${String(next).padStart(4, "0")}`;
}

export async function getNextParentInvoiceNo(issueDate?: string | Date | null) {
  const store = await loadStore();
  return nextInvoiceNoFromStore(store, monthKeyFromDate(issueDate));
}

export async function listParentBillingForPackage(packageId: string) {
  const store = await loadStore();
  return {
    invoices: byNewest<ParentInvoiceItem>(
      store.invoices.filter((x) => x.packageId === packageId),
      (x) => x.createdAt
    ),
    paymentRecords: byNewest<ParentPaymentRecordItem>(
      store.paymentRecords.filter((x) => x.packageId === packageId),
      (x) => x.uploadedAt
    ),
    receipts: byNewest<ParentReceiptItem>(
      store.receipts.filter((x) => x.packageId === packageId),
      (x) => x.createdAt
    ),
  };
}

export async function listAllParentBilling() {
  const store = await loadStore();
  return {
    invoices: byNewest<ParentInvoiceItem>(store.invoices, (x) => x.createdAt),
    paymentRecords: byNewest<ParentPaymentRecordItem>(store.paymentRecords, (x) => x.uploadedAt),
    receipts: byNewest<ParentReceiptItem>(store.receipts, (x) => x.createdAt),
  };
}

export async function getParentInvoiceById(invoiceId: string) {
  const store = await loadStore();
  return store.invoices.find((x) => x.id === invoiceId) ?? null;
}

export async function getParentReceiptById(receiptId: string) {
  const store = await loadStore();
  return store.receipts.find((x) => x.id === receiptId) ?? null;
}

export async function createParentInvoice(input: {
  packageId: string;
  studentId: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  courseStartDate?: string | null;
  courseEndDate?: string | null;
  billTo: string;
  quantity: number;
  description: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  paymentTerms: string;
  note?: string | null;
  createdBy: string;
}) {
  const now = new Date().toISOString();
  const normalizedInvoiceNo = input.invoiceNo.trim();
  const item: ParentInvoiceItem = {
    id: crypto.randomUUID(),
    packageId: input.packageId,
    studentId: input.studentId,
    invoiceNo: normalizedInvoiceNo,
    issueDate: normalizeDateOnly(input.issueDate, new Date()) ?? formatDateOnly(new Date()),
    dueDate: normalizeDateOnly(input.dueDate, new Date()) ?? formatDateOnly(new Date()),
    courseStartDate: normalizeNullableDateOnly(input.courseStartDate),
    courseEndDate: normalizeNullableDateOnly(input.courseEndDate),
    billTo: input.billTo.trim(),
    quantity: Math.max(1, Math.floor(input.quantity || 1)),
    description: input.description.trim(),
    amount: Number(input.amount) || 0,
    gstAmount: Number(input.gstAmount) || 0,
    totalAmount: Number(input.totalAmount) || 0,
    paymentTerms: input.paymentTerms.trim() || "Immediate",
    note: input.note?.trim() || null,
    createdBy: normalizeEmail(input.createdBy),
    createdAt: now,
    updatedAt: now,
  };
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      ensureUniqueInvoiceNo(store, normalizedInvoiceNo);
      consumeInvoiceNoSequence(store, normalizedInvoiceNo);
      store.invoices.push(item);
    },
  });
  await logAudit({
    actor: { email: input.createdBy, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "CREATE_INVOICE",
    entityType: "ParentInvoice",
    entityId: item.id,
    meta: { packageId: item.packageId, studentId: item.studentId, invoiceNo: item.invoiceNo },
  });
  return item;
}

export async function addParentPaymentRecord(input: {
  packageId: string;
  studentId: string;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  paymentAmount?: number | null;
  referenceNo?: string | null;
  originalFileName: string;
  storedFileName: string;
  relativePath: string;
  note?: string | null;
  uploadedBy: string;
}) {
  const item: ParentPaymentRecordItem = {
    id: crypto.randomUUID(),
    packageId: input.packageId,
    studentId: input.studentId,
    paymentDate: normalizeNullableDateOnly(input.paymentDate),
    paymentMethod: input.paymentMethod?.trim() || null,
    paymentAmount: input.paymentAmount == null ? null : roundMoney(input.paymentAmount),
    referenceNo: input.referenceNo?.trim() || null,
    uploadedBy: normalizeEmail(input.uploadedBy),
    uploadedAt: new Date().toISOString(),
    originalFileName: input.originalFileName.trim(),
    storedFileName: input.storedFileName.trim(),
    relativePath: input.relativePath.trim(),
    note: input.note?.trim() || null,
  };
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      store.paymentRecords.push(item);
    },
  });
  await logAudit({
    actor: { email: input.uploadedBy, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "UPLOAD_PAYMENT_PROOF",
    entityType: "ParentPaymentRecord",
    entityId: item.id,
    meta: { packageId: item.packageId, studentId: item.studentId, file: item.originalFileName },
  });
  return item;
}

export async function getParentPaymentRecordById(recordId: string) {
  const store = await loadStore();
  return store.paymentRecords.find((x) => x.id === recordId) ?? null;
}

export async function replaceParentPaymentRecord(input: {
  recordId: string;
  packageId: string;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  paymentAmount?: number | null;
  referenceNo?: string | null;
  originalFileName: string;
  storedFileName: string;
  relativePath: string;
  note?: string | null;
  uploadedBy: string;
}) {
  let oldItem: ParentPaymentRecordItem | null = null;
  let next: ParentPaymentRecordItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const idx = store.paymentRecords.findIndex((x) => x.id === input.recordId.trim());
      if (idx < 0) throw new Error("Payment record not found");
      oldItem = store.paymentRecords[idx];
      if (oldItem.packageId !== input.packageId) {
        throw new Error("Payment record does not belong to this package");
      }
      next = {
        ...oldItem,
        paymentDate: normalizeNullableDateOnly(input.paymentDate),
        paymentMethod: input.paymentMethod?.trim() || null,
        paymentAmount: input.paymentAmount == null ? null : roundMoney(input.paymentAmount),
        referenceNo: input.referenceNo?.trim() || null,
        originalFileName: input.originalFileName.trim(),
        storedFileName: input.storedFileName.trim(),
        relativePath: input.relativePath.trim(),
        note: input.note?.trim() || null,
        uploadedBy: normalizeEmail(input.uploadedBy),
        uploadedAt: new Date().toISOString(),
      };
      store.paymentRecords[idx] = next;
    },
  });
  await logAudit({
    actor: { email: input.uploadedBy, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "REPLACE_PAYMENT_PROOF",
    entityType: "ParentPaymentRecord",
    entityId: next!.id,
    meta: { packageId: next!.packageId, studentId: next!.studentId, file: next!.originalFileName },
  });
  return { oldItem: oldItem!, item: next! };
}

export async function updateParentPaymentRecordAmount(input: {
  recordId: string;
  packageId: string;
  paymentAmount?: number | null;
  actorEmail: string;
}) {
  let item: ParentPaymentRecordItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const idx = store.paymentRecords.findIndex((x) => x.id === input.recordId.trim());
      if (idx < 0) throw new Error("Payment record not found");
      const current = store.paymentRecords[idx];
      if (current.packageId !== input.packageId.trim()) {
        throw new Error("Payment record does not belong to this package");
      }
      item = {
        ...current,
        paymentAmount: input.paymentAmount == null ? null : roundMoney(input.paymentAmount),
      };
      store.paymentRecords[idx] = item;
    },
  });
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "UPDATE_PAYMENT_PROOF_AMOUNT",
    entityType: "ParentPaymentRecord",
    entityId: item!.id,
    meta: {
      packageId: item!.packageId,
      studentId: item!.studentId,
      file: item!.originalFileName,
      paymentAmount: item!.paymentAmount,
    },
  });
  return item!;
}

export async function deleteParentPaymentRecord(input: { recordId: string; actorEmail: string }) {
  let row: ParentPaymentRecordItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const id = input.recordId.trim();
      row = store.paymentRecords.find((x) => x.id === id) ?? null;
      if (!row) throw new Error("Payment record not found");
      const usedByReceipt = store.receipts.find((x) => x.paymentRecordId === id);
      if (usedByReceipt) {
        throw new Error("Cannot delete payment record: linked receipt exists");
      }
      store.paymentRecords = store.paymentRecords.filter((x) => x.id !== id);
    },
  });
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DELETE_PAYMENT_PROOF",
    entityType: "ParentPaymentRecord",
    entityId: input.recordId.trim(),
    meta: { packageId: row!.packageId, studentId: row!.studentId, file: row!.originalFileName },
  });
  return row!;
}

export async function createParentReceipt(input: {
  packageId: string;
  studentId: string;
  invoiceId?: string | null;
  paymentRecordId?: string | null;
  receiptNo: string;
  receiptDate: string;
  receivedFrom: string;
  paidBy: string;
  quantity: number;
  description: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  amountReceived: number;
  note?: string | null;
  createdBy: string;
}) {
  const now = new Date().toISOString();
  const normalizedReceiptNo = input.receiptNo.trim();
  const invoiceId = input.invoiceId?.trim() || null;
  let item: ParentReceiptItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      ensureUniqueReceiptNo(store, normalizedReceiptNo);
      if (invoiceId) {
        const invoice = store.invoices.find((x) => x.id === invoiceId);
        if (!invoice) throw new Error("Selected invoice not found");
        if (invoice.packageId !== input.packageId) {
          throw new Error("Invoice does not belong to this package");
        }
        const linkedReceipts = store.receipts.filter((x) => x.invoiceId === invoiceId);
        const alreadyReceipted = roundMoney(
          linkedReceipts.reduce((sum, receipt) => sum + (Number(receipt.amountReceived) || 0), 0),
        );
        const nextAmountReceived = roundMoney(alreadyReceipted + (Number(input.amountReceived) || 0));
        const invoiceTotal = roundMoney(Number(invoice.totalAmount) || 0);
        if (nextAmountReceived > invoiceTotal + 0.01) {
          const remainingAmount = Math.max(0, roundMoney(invoiceTotal - alreadyReceipted));
          throw new Error(`Amount Received exceeds invoice remaining balance: ${remainingAmount.toFixed(2)}`);
        }
        const expectedReceiptNo = buildParentReceiptNo(
          invoice.invoiceNo,
          nextParentReceiptOrdinalForInvoice(linkedReceipts, invoice.invoiceNo),
        );
        if (normalizedReceiptNo.toLowerCase() !== expectedReceiptNo.toLowerCase()) {
          throw new Error(`Receipt No. must match linked invoice: ${expectedReceiptNo}`);
        }
      }
      const paymentRecordId = input.paymentRecordId?.trim() || null;
      if (paymentRecordId && store.receipts.some((x) => x.paymentRecordId === paymentRecordId)) {
        throw new Error("This payment record is already linked to another receipt");
      }
      item = {
        id: crypto.randomUUID(),
        packageId: input.packageId,
        studentId: input.studentId,
        invoiceId,
        paymentRecordId,
        receiptNo: normalizedReceiptNo,
        receiptDate: normalizeDateOnly(input.receiptDate, new Date()) ?? formatDateOnly(new Date()),
        receivedFrom: input.receivedFrom.trim(),
        paidBy: input.paidBy.trim() || "Cash or Bank Transfer",
        quantity: Math.max(1, Math.floor(input.quantity || 1)),
        description: input.description.trim(),
        amount: Number(input.amount) || 0,
        gstAmount: Number(input.gstAmount) || 0,
        totalAmount: Number(input.totalAmount) || 0,
        amountReceived: Number(input.amountReceived) || 0,
        note: input.note?.trim() || null,
        createdBy: normalizeEmail(input.createdBy),
        createdAt: now,
        updatedAt: now,
      };
      store.receipts.push(item);
    },
  });
  await logAudit({
    actor: { email: input.createdBy, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "CREATE_RECEIPT",
    entityType: "ParentReceipt",
    entityId: item!.id,
    meta: { packageId: item!.packageId, studentId: item!.studentId, receiptNo: item!.receiptNo },
  });
  return item!;
}

export async function updateParentReceiptDirect(input: {
  receiptId: string;
  packageId: string;
  receiptDate: string;
  receivedFrom: string;
  paidBy: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  amountReceived: number;
  note?: string | null;
  actorEmail: string;
}) {
  let before: ParentReceiptItem | null = null;
  let after: ParentReceiptItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const receiptId = String(input.receiptId ?? "").trim();
      const packageId = String(input.packageId ?? "").trim();
      const idx = store.receipts.findIndex((x) => x.id === receiptId);
      if (idx < 0) throw new Error("Receipt not found");
      const current = store.receipts[idx];
      if (current.packageId !== packageId) {
        throw new Error("Receipt does not belong to this package");
      }

      const normalizedAmountReceived = roundMoney(Number(input.amountReceived) || 0);
      if (current.invoiceId) {
        const invoice = store.invoices.find((x) => x.id === current.invoiceId);
        if (!invoice) throw new Error("Linked invoice not found");
        const otherReceiptsTotal = roundMoney(
          store.receipts
            .filter((x) => x.invoiceId === current.invoiceId && x.id !== current.id)
            .reduce((sum, receipt) => sum + (Number(receipt.amountReceived) || 0), 0),
        );
        const invoiceTotal = roundMoney(Number(invoice.totalAmount) || 0);
        if (roundMoney(otherReceiptsTotal + normalizedAmountReceived) > invoiceTotal + 0.01) {
          const remainingAmount = Math.max(0, roundMoney(invoiceTotal - otherReceiptsTotal));
          throw new Error(`Amount Received exceeds invoice remaining balance: ${remainingAmount.toFixed(2)}`);
        }
      }

      before = { ...current };
      after = {
        ...current,
        receiptDate: normalizeDateOnly(input.receiptDate, new Date()) ?? formatDateOnly(new Date()),
        receivedFrom: String(input.receivedFrom ?? "").trim(),
        paidBy: String(input.paidBy ?? "").trim() || current.paidBy,
        amount: roundMoney(Number(input.amount) || 0),
        gstAmount: roundMoney(Number(input.gstAmount) || 0),
        totalAmount: roundMoney(Number(input.totalAmount) || 0),
        amountReceived: normalizedAmountReceived,
        note: String(input.note ?? "").trim() || null,
        updatedAt: new Date().toISOString(),
      };
      if (!after.receivedFrom) throw new Error("Received From is required");
      store.receipts[idx] = after;
    },
  });
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DIRECT_EDIT_RECEIPT",
    entityType: "ParentReceipt",
    entityId: input.receiptId.trim(),
    meta: {
      packageId: after!.packageId,
      studentId: after!.studentId,
      receiptNo: after!.receiptNo,
      approvalsPreserved: true,
      before: {
        receiptDate: before!.receiptDate,
        receivedFrom: before!.receivedFrom,
        paidBy: before!.paidBy,
        amount: before!.amount,
        gstAmount: before!.gstAmount,
        totalAmount: before!.totalAmount,
        amountReceived: before!.amountReceived,
        note: before!.note,
      },
      after: {
        receiptDate: after!.receiptDate,
        receivedFrom: after!.receivedFrom,
        paidBy: after!.paidBy,
        amount: after!.amount,
        gstAmount: after!.gstAmount,
        totalAmount: after!.totalAmount,
        amountReceived: after!.amountReceived,
        note: after!.note,
      },
    },
  });
  return { before: before!, after: after! };
}

export async function buildParentReceiptNoForInvoice(invoiceId: string) {
  const store = await loadStore();
  const invoice = store.invoices.find((x) => x.id === invoiceId.trim());
  if (!invoice) throw new Error("Invoice not found");
  const linkedReceipts = store.receipts.filter((x) => x.invoiceId === invoice.id);
  const receiptNo = buildParentReceiptNo(
    invoice.invoiceNo,
    nextParentReceiptOrdinalForInvoice(linkedReceipts, invoice.invoiceNo),
  );
  if (store.receipts.some((x) => x.receiptNo.trim().toLowerCase() === receiptNo.trim().toLowerCase())) {
    throw new Error(`Receipt No. already exists: ${receiptNo}`);
  }
  return receiptNo;
}

export async function deleteParentInvoice(input: { invoiceId: string; actorEmail: string }) {
  let invoice: ParentInvoiceItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const invoiceId = input.invoiceId.trim();
      invoice = store.invoices.find((x) => x.id === invoiceId) ?? null;
      if (!invoice) throw new Error("Invoice not found");
      if (store.receipts.some((x) => x.invoiceId === invoiceId)) {
        throw new Error("Cannot delete invoice: linked receipt exists");
      }
      store.invoices = store.invoices.filter((x) => x.id !== invoiceId);
      rebuildInvoiceSeqByMonth(store);
      store.deletedInvoices.unshift({
        id: crypto.randomUUID(),
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        packageId: invoice.packageId,
        studentId: invoice.studentId,
        billTo: invoice.billTo,
        issueDate: invoice.issueDate,
        deletedBy: normalizeEmail(input.actorEmail),
        deletedAt: new Date().toISOString(),
      });
    },
  });
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DELETE_INVOICE",
    entityType: "ParentInvoice",
    entityId: input.invoiceId.trim(),
    meta: { invoiceNo: invoice!.invoiceNo, packageId: invoice!.packageId, studentId: invoice!.studentId },
  });
}

export async function applyParentInvoiceNumberAssignments(
  assignments: Array<{ invoiceId: string; invoiceNo: string }>,
) {
  if (!Array.isArray(assignments) || assignments.length === 0) return 0;
  const map = new Map<string, string>();
  for (const item of assignments) {
    const invoiceId = String(item.invoiceId ?? "").trim();
    const invoiceNo = String(item.invoiceNo ?? "").trim();
    if (!invoiceId || !invoiceNo) continue;
    map.set(invoiceId, invoiceNo);
  }
  if (map.size === 0) return 0;

  let changed = 0;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const invoiceById = new Map(store.invoices.map((x) => [x.id, x]));
      for (const [invoiceId, invoiceNo] of map.entries()) {
        if (!invoiceById.has(invoiceId)) throw new Error(`Parent invoice not found: ${invoiceId}`);
        if (!/^RGT-\d{6}-\d{4}$/i.test(invoiceNo)) throw new Error(`Invalid invoice number format: ${invoiceNo}`);
      }

      const originalNoById = new Map<string, string>();
      for (const inv of store.invoices) originalNoById.set(inv.id, inv.invoiceNo);

      changed = 0;
      for (const inv of store.invoices) {
        const nextNo = map.get(inv.id);
        if (!nextNo) continue;
        if (inv.invoiceNo !== nextNo) {
          inv.invoiceNo = nextNo;
          inv.updatedAt = new Date().toISOString();
          changed += 1;
        }
      }

      if (changed > 0) {
        const used = new Set<string>();
        for (const inv of store.invoices) {
          const key = inv.invoiceNo.trim().toLowerCase();
          if (!key) throw new Error(`Empty invoice number on parent invoice: ${inv.id}`);
          if (used.has(key)) throw new Error(`Duplicate parent invoice number after reassignment: ${inv.invoiceNo}`);
          used.add(key);
        }

        for (const [invoiceId, afterNo] of map.entries()) {
          const beforeNo = originalNoById.get(invoiceId);
          if (!beforeNo || beforeNo === afterNo) continue;
          const receipts = store.receipts
            .filter((rec) => rec.invoiceId === invoiceId)
            .sort((a, b) => {
              const aOrdinal = parseParentReceiptOrdinal(a.receiptNo, beforeNo) || Number.MAX_SAFE_INTEGER;
              const bOrdinal = parseParentReceiptOrdinal(b.receiptNo, beforeNo) || Number.MAX_SAFE_INTEGER;
              if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;
              return String(a.createdAt).localeCompare(String(b.createdAt));
            });
          const usedOrdinals = new Set<number>();
          let nextFallbackOrdinal = 1;
          for (const rec of receipts) {
            let ordinal = parseParentReceiptOrdinal(rec.receiptNo, beforeNo);
            if (ordinal < 1 || usedOrdinals.has(ordinal)) {
              while (usedOrdinals.has(nextFallbackOrdinal)) nextFallbackOrdinal += 1;
              ordinal = nextFallbackOrdinal;
            }
            usedOrdinals.add(ordinal);
            const nextReceiptNo = buildParentReceiptNo(afterNo, ordinal);
            if (rec.receiptNo !== nextReceiptNo) {
              rec.receiptNo = nextReceiptNo;
              rec.updatedAt = new Date().toISOString();
            }
          }
        }
      }

      rebuildInvoiceSeqByMonth(store);
    },
  });
  return changed;
}

export async function deleteParentReceipt(input: { receiptId: string; actorEmail: string }) {
  let receipt: ParentReceiptItem | null = null;
  await mutateJsonAppSetting({
    key: PARENT_BILLING_KEY,
    fallback: EMPTY_PARENT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const receiptId = input.receiptId.trim();
      receipt = store.receipts.find((x) => x.id === receiptId) ?? null;
      if (!receipt) throw new Error("Receipt not found");
      store.receipts = store.receipts.filter((x) => x.id !== receiptId);
    },
  });
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DELETE_RECEIPT",
    entityType: "ParentReceipt",
    entityId: input.receiptId.trim(),
    meta: { receiptNo: receipt!.receiptNo, packageId: receipt!.packageId, studentId: receipt!.studentId },
  });
}

export async function listDeletedParentInvoicesForPackage(packageId: string) {
  const store = await loadStore();
  return byNewest(
    store.deletedInvoices.filter((x) => x.packageId === packageId),
    (x) => x.deletedAt,
  );
}

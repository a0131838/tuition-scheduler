import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import crypto from "crypto";

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
  invoiceSeqByMonth: Record<string, number>;
};

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function parseNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeStore(input: unknown): ParentBillingStore {
  const out: ParentBillingStore = { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} };
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
      issueDate: String(x.issueDate ?? "").trim() || new Date().toISOString(),
      dueDate: String(x.dueDate ?? "").trim() || new Date().toISOString(),
      courseStartDate: String(x.courseStartDate ?? "").trim() || null,
      courseEndDate: String(x.courseEndDate ?? "").trim() || null,
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
      paymentDate: String(x.paymentDate ?? "").trim() || null,
      paymentMethod: String(x.paymentMethod ?? "").trim() || null,
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
      receiptDate: String(x.receiptDate ?? "").trim() || new Date().toISOString(),
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
  const row = await prisma.appSetting.findUnique({
    where: { key: PARENT_BILLING_KEY },
    select: { value: true },
  });
  if (!row?.value) return { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} };
  try {
    return sanitizeStore(JSON.parse(row.value));
  } catch {
    return { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} };
  }
}

async function saveStore(store: ParentBillingStore) {
  await prisma.appSetting.upsert({
    where: { key: PARENT_BILLING_KEY },
    update: { value: JSON.stringify(store) },
    create: { key: PARENT_BILLING_KEY, value: JSON.stringify(store) },
  });
}

function byNewest<T>(rows: T[], pickTime: (row: T) => string) {
  return [...rows].sort((a, b) => +new Date(pickTime(b)) - +new Date(pickTime(a)));
}

function two(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromDate(input: string | Date | null | undefined) {
  const d = input ? new Date(input) : new Date();
  const x = Number.isNaN(+d) ? new Date() : d;
  return `${x.getFullYear()}${two(x.getMonth() + 1)}`;
}

function parseInvoiceNo(invoiceNo: string): { monthKey: string; seq: number } | null {
  const m = /^RGT-(\d{6})-(\d{4})$/i.exec(String(invoiceNo ?? "").trim());
  if (!m) return null;
  return { monthKey: m[1], seq: Number(m[2]) };
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
  if (!/^rgt-\d{6}-\d{4}-rc$/i.test(key)) {
    throw new Error("Receipt No. format must be RGT-yyyymm-xxxx-RC");
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
  const store = await loadStore();
  const now = new Date().toISOString();
  const normalizedInvoiceNo = input.invoiceNo.trim();
  ensureUniqueInvoiceNo(store, normalizedInvoiceNo);
  const item: ParentInvoiceItem = {
    id: crypto.randomUUID(),
    packageId: input.packageId,
    studentId: input.studentId,
    invoiceNo: normalizedInvoiceNo,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    courseStartDate: input.courseStartDate?.trim() || null,
    courseEndDate: input.courseEndDate?.trim() || null,
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
  consumeInvoiceNoSequence(store, normalizedInvoiceNo);
  store.invoices.push(item);
  await saveStore(store);
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
  referenceNo?: string | null;
  originalFileName: string;
  storedFileName: string;
  relativePath: string;
  note?: string | null;
  uploadedBy: string;
}) {
  const store = await loadStore();
  const item: ParentPaymentRecordItem = {
    id: crypto.randomUUID(),
    packageId: input.packageId,
    studentId: input.studentId,
    paymentDate: input.paymentDate?.trim() || null,
    paymentMethod: input.paymentMethod?.trim() || null,
    referenceNo: input.referenceNo?.trim() || null,
    uploadedBy: normalizeEmail(input.uploadedBy),
    uploadedAt: new Date().toISOString(),
    originalFileName: input.originalFileName.trim(),
    storedFileName: input.storedFileName.trim(),
    relativePath: input.relativePath.trim(),
    note: input.note?.trim() || null,
  };
  store.paymentRecords.push(item);
  await saveStore(store);
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
  referenceNo?: string | null;
  originalFileName: string;
  storedFileName: string;
  relativePath: string;
  note?: string | null;
  uploadedBy: string;
}) {
  const store = await loadStore();
  const idx = store.paymentRecords.findIndex((x) => x.id === input.recordId.trim());
  if (idx < 0) throw new Error("Payment record not found");
  const oldItem = store.paymentRecords[idx];
  if (oldItem.packageId !== input.packageId) {
    throw new Error("Payment record does not belong to this package");
  }
  const next: ParentPaymentRecordItem = {
    ...oldItem,
    paymentDate: input.paymentDate?.trim() || null,
    paymentMethod: input.paymentMethod?.trim() || null,
    referenceNo: input.referenceNo?.trim() || null,
    originalFileName: input.originalFileName.trim(),
    storedFileName: input.storedFileName.trim(),
    relativePath: input.relativePath.trim(),
    note: input.note?.trim() || null,
    uploadedBy: normalizeEmail(input.uploadedBy),
    uploadedAt: new Date().toISOString(),
  };
  store.paymentRecords[idx] = next;
  await saveStore(store);
  await logAudit({
    actor: { email: input.uploadedBy, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "REPLACE_PAYMENT_PROOF",
    entityType: "ParentPaymentRecord",
    entityId: next.id,
    meta: { packageId: next.packageId, studentId: next.studentId, file: next.originalFileName },
  });
  return { oldItem, item: next };
}

export async function deleteParentPaymentRecord(input: { recordId: string; actorEmail: string }) {
  const store = await loadStore();
  const id = input.recordId.trim();
  const row = store.paymentRecords.find((x) => x.id === id);
  if (!row) throw new Error("Payment record not found");
  const usedByReceipt = store.receipts.find((x) => x.paymentRecordId === id);
  if (usedByReceipt) {
    throw new Error("Cannot delete payment record: linked receipt exists");
  }
  store.paymentRecords = store.paymentRecords.filter((x) => x.id !== id);
  await saveStore(store);
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DELETE_PAYMENT_PROOF",
    entityType: "ParentPaymentRecord",
    entityId: id,
    meta: { packageId: row.packageId, studentId: row.studentId, file: row.originalFileName },
  });
  return row;
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
  const store = await loadStore();
  const now = new Date().toISOString();
  const normalizedReceiptNo = input.receiptNo.trim();
  ensureUniqueReceiptNo(store, normalizedReceiptNo);
  const invoiceId = input.invoiceId?.trim() || null;
  if (invoiceId) {
    const invoice = store.invoices.find((x) => x.id === invoiceId);
    if (!invoice) throw new Error("Selected invoice not found");
    if (invoice.packageId !== input.packageId) {
      throw new Error("Invoice does not belong to this package");
    }
    const hasLinked = store.receipts.some((x) => x.invoiceId === invoiceId);
    if (hasLinked) throw new Error("This invoice already has a receipt");
    const expectedReceiptNo = `${invoice.invoiceNo}-RC`;
    if (normalizedReceiptNo.toLowerCase() !== expectedReceiptNo.toLowerCase()) {
      throw new Error(`Receipt No. must match linked invoice: ${expectedReceiptNo}`);
    }
  }
  const item: ParentReceiptItem = {
    id: crypto.randomUUID(),
    packageId: input.packageId,
    studentId: input.studentId,
    invoiceId,
    paymentRecordId: input.paymentRecordId?.trim() || null,
    receiptNo: normalizedReceiptNo,
    receiptDate: input.receiptDate,
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
  await saveStore(store);
  await logAudit({
    actor: { email: input.createdBy, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "CREATE_RECEIPT",
    entityType: "ParentReceipt",
    entityId: item.id,
    meta: { packageId: item.packageId, studentId: item.studentId, receiptNo: item.receiptNo },
  });
  return item;
}

export async function buildParentReceiptNoForInvoice(invoiceId: string) {
  const store = await loadStore();
  const invoice = store.invoices.find((x) => x.id === invoiceId.trim());
  if (!invoice) throw new Error("Invoice not found");
  const receiptNo = `${invoice.invoiceNo}-RC`;
  const already = store.receipts.find((x) => x.invoiceId === invoice.id);
  if (already) throw new Error("This invoice already has a receipt");
  if (store.receipts.some((x) => x.receiptNo.trim().toLowerCase() === receiptNo.trim().toLowerCase())) {
    throw new Error(`Receipt No. already exists: ${receiptNo}`);
  }
  return receiptNo;
}

export async function deleteParentInvoice(input: { invoiceId: string; actorEmail: string }) {
  const store = await loadStore();
  const invoiceId = input.invoiceId.trim();
  const invoice = store.invoices.find((x) => x.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (store.receipts.some((x) => x.invoiceId === invoiceId)) {
    throw new Error("Cannot delete invoice: linked receipt exists");
  }
  store.invoices = store.invoices.filter((x) => x.id !== invoiceId);
  await saveStore(store);
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DELETE_INVOICE",
    entityType: "ParentInvoice",
    entityId: invoiceId,
    meta: { invoiceNo: invoice.invoiceNo, packageId: invoice.packageId, studentId: invoice.studentId },
  });
}

export async function deleteParentReceipt(input: { receiptId: string; actorEmail: string }) {
  const store = await loadStore();
  const receiptId = input.receiptId.trim();
  const receipt = store.receipts.find((x) => x.id === receiptId);
  if (!receipt) throw new Error("Receipt not found");
  store.receipts = store.receipts.filter((x) => x.id !== receiptId);
  await saveStore(store);
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "DELETE_RECEIPT",
    entityType: "ParentReceipt",
    entityId: receiptId,
    meta: { receiptNo: receipt.receiptNo, packageId: receipt.packageId, studentId: receipt.studentId },
  });
}

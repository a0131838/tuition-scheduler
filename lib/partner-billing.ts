import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import crypto from "crypto";

const PARTNER_BILLING_KEY = "partner_billing_v1";

export type PartnerBillingMode = "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY";

export type PartnerInvoiceLine = {
  id: string;
  type: "SETTLEMENT" | "MANUAL";
  settlementId: string | null;
  description: string;
  quantity: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
};

export type PartnerInvoiceItem = {
  id: string;
  partnerName: string;
  mode: PartnerBillingMode;
  monthKey: string | null;
  settlementIds: string[];
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  billTo: string;
  paymentTerms: string;
  courseStartDate: string | null;
  courseEndDate: string | null;
  description: string;
  lines: PartnerInvoiceLine[];
  amount: number;
  gstAmount: number;
  totalAmount: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PartnerPaymentRecordItem = {
  id: string;
  mode: PartnerBillingMode;
  monthKey: string | null;
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

export type PartnerReceiptItem = {
  id: string;
  mode: PartnerBillingMode;
  monthKey: string | null;
  invoiceId: string;
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

type PartnerBillingStore = {
  invoices: PartnerInvoiceItem[];
  paymentRecords: PartnerPaymentRecordItem[];
  receipts: PartnerReceiptItem[];
  invoiceSeqByMonth: Record<string, number>;
};

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function parseNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeQuantity(v: unknown, fallback = 1) {
  const n = parseNumber(v, fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Number(n.toFixed(2));
}

function sanitizeLine(input: unknown): PartnerInvoiceLine | null {
  if (!input || typeof input !== "object") return null;
  const x = input as Record<string, unknown>;
  const description = String(x.description ?? "").trim();
  if (!description) return null;
  return {
    id: String(x.id ?? "").trim() || crypto.randomUUID(),
    type: String(x.type ?? "").trim() === "MANUAL" ? "MANUAL" : "SETTLEMENT",
    settlementId: String(x.settlementId ?? "").trim() || null,
    description,
    quantity: normalizeQuantity(x.quantity, 1),
    amount: parseNumber(x.amount, 0),
    gstAmount: parseNumber(x.gstAmount, 0),
    totalAmount: parseNumber(x.totalAmount, 0),
  };
}

function sanitizeStore(input: unknown): PartnerBillingStore {
  const out: PartnerBillingStore = { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} };
  if (!input || typeof input !== "object") return out;
  const root = input as Record<string, unknown>;

  const invoicesRaw = Array.isArray(root.invoices) ? root.invoices : [];
  for (const row of invoicesRaw) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = String(x.id ?? "").trim();
    const invoiceNo = String(x.invoiceNo ?? "").trim();
    if (!id || !invoiceNo) continue;
    const linesRaw = Array.isArray(x.lines) ? x.lines : [];
    const lines = linesRaw.map(sanitizeLine).filter((v): v is PartnerInvoiceLine => Boolean(v));
    const mode = String(x.mode ?? "") === "OFFLINE_MONTHLY" ? "OFFLINE_MONTHLY" : "ONLINE_PACKAGE_END";
    out.invoices.push({
      id,
      partnerName: String(x.partnerName ?? "").trim() || "Partner",
      mode,
      monthKey: String(x.monthKey ?? "").trim() || null,
      settlementIds: Array.isArray(x.settlementIds)
        ? x.settlementIds.map((v) => String(v ?? "").trim()).filter(Boolean)
        : [],
      invoiceNo,
      issueDate: String(x.issueDate ?? "").trim() || new Date().toISOString(),
      dueDate: String(x.dueDate ?? "").trim() || new Date().toISOString(),
      billTo: String(x.billTo ?? "").trim() || "Partner",
      paymentTerms: String(x.paymentTerms ?? "").trim() || "Immediate",
      courseStartDate: String(x.courseStartDate ?? "").trim() || null,
      courseEndDate: String(x.courseEndDate ?? "").trim() || null,
      description: String(x.description ?? "").trim() || "",
      lines,
      amount: parseNumber(x.amount, lines.reduce((a, b) => a + Math.max(0, b.totalAmount - b.gstAmount), 0)),
      gstAmount: parseNumber(x.gstAmount, lines.reduce((a, b) => a + b.gstAmount, 0)),
      totalAmount: parseNumber(x.totalAmount, lines.reduce((a, b) => a + b.totalAmount, 0)),
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
    const relativePath = String(x.relativePath ?? "").trim();
    if (!id || !relativePath) continue;
    const mode = String(x.mode ?? "") === "OFFLINE_MONTHLY" ? "OFFLINE_MONTHLY" : "ONLINE_PACKAGE_END";
    out.paymentRecords.push({
      id,
      mode,
      monthKey: String(x.monthKey ?? "").trim() || null,
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
    const invoiceId = String(x.invoiceId ?? "").trim();
    const receiptNo = String(x.receiptNo ?? "").trim();
    if (!id || !invoiceId || !receiptNo) continue;
    const mode = String(x.mode ?? "") === "OFFLINE_MONTHLY" ? "OFFLINE_MONTHLY" : "ONLINE_PACKAGE_END";
    out.receipts.push({
      id,
      mode,
      monthKey: String(x.monthKey ?? "").trim() || null,
      invoiceId,
      paymentRecordId: String(x.paymentRecordId ?? "").trim() || null,
      receiptNo,
      receiptDate: String(x.receiptDate ?? "").trim() || new Date().toISOString(),
      receivedFrom: String(x.receivedFrom ?? "").trim(),
      paidBy: String(x.paidBy ?? "").trim(),
      quantity: Math.max(1, Math.floor(parseNumber(x.quantity, 1))),
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

async function loadStore(): Promise<PartnerBillingStore> {
  const row = await prisma.appSetting.findUnique({ where: { key: PARTNER_BILLING_KEY }, select: { value: true } });
  if (!row?.value) return { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} };
  try {
    return sanitizeStore(JSON.parse(row.value));
  } catch {
    return { invoices: [], paymentRecords: [], receipts: [], invoiceSeqByMonth: {} };
  }
}

async function saveStore(store: PartnerBillingStore) {
  await prisma.appSetting.upsert({
    where: { key: PARTNER_BILLING_KEY },
    update: { value: JSON.stringify(store) },
    create: { key: PARTNER_BILLING_KEY, value: JSON.stringify(store) },
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

function rebuildInvoiceSeqByMonth(store: PartnerBillingStore) {
  const out: Record<string, number> = {};
  for (const inv of store.invoices) {
    const parsed = parseInvoiceNo(inv.invoiceNo);
    if (!parsed) continue;
    const current = Number(out[parsed.monthKey] || 0);
    if (parsed.seq > current) out[parsed.monthKey] = parsed.seq;
  }
  store.invoiceSeqByMonth = out;
}

function ensureUniqueInvoiceNo(store: PartnerBillingStore, invoiceNo: string) {
  const key = invoiceNo.trim().toLowerCase();
  if (!key) throw new Error("Invoice No. is required");
  if (!/^rgt-\d{6}-\d{4}$/i.test(key)) throw new Error("Invoice No. format must be RGT-yyyymm-xxxx");
  if (store.invoices.some((x) => x.invoiceNo.trim().toLowerCase() === key)) {
    throw new Error(`Invoice No. already exists: ${invoiceNo}`);
  }
}

function ensureUniqueReceiptNo(store: PartnerBillingStore, receiptNo: string) {
  const key = receiptNo.trim().toLowerCase();
  if (!key) throw new Error("Receipt No. is required");
  if (!/^rgt-\d{6}-\d{4}-rc$/i.test(key)) throw new Error("Receipt No. format must be RGT-yyyymm-xxxx-RC");
  if (store.receipts.some((x) => x.receiptNo.trim().toLowerCase() === key)) {
    throw new Error(`Receipt No. already exists: ${receiptNo}`);
  }
}

function consumeInvoiceNoSequence(store: PartnerBillingStore, invoiceNo: string) {
  const parsed = parseInvoiceNo(invoiceNo);
  if (!parsed) return;
  const current = Number(store.invoiceSeqByMonth[parsed.monthKey] || 0);
  if (parsed.seq > current) store.invoiceSeqByMonth[parsed.monthKey] = parsed.seq;
}

function nextInvoiceNoFromStore(store: PartnerBillingStore, monthKey: string) {
  const base = Number(store.invoiceSeqByMonth[monthKey] || 0);
  let next = base + 1;
  const used = new Set(
    store.invoices
      .map((x) => parseInvoiceNo(x.invoiceNo))
      .filter((x): x is { monthKey: string; seq: number } => Boolean(x))
      .filter((x) => x.monthKey === monthKey)
      .map((x) => x.seq),
  );
  while (used.has(next)) next += 1;
  return `RGT-${monthKey}-${String(next).padStart(4, "0")}`;
}

export async function getNextPartnerInvoiceNo(issueDate?: string | Date | null) {
  const store = await loadStore();
  return nextInvoiceNoFromStore(store, monthKeyFromDate(issueDate));
}

export async function listPartnerBilling() {
  const store = await loadStore();
  return {
    invoices: byNewest(store.invoices, (x) => x.createdAt),
    paymentRecords: byNewest(store.paymentRecords, (x) => x.uploadedAt),
    receipts: byNewest(store.receipts, (x) => x.createdAt),
  };
}

export async function getPartnerBilledSettlementIdSet() {
  const store = await loadStore();
  return new Set(store.invoices.flatMap((x) => x.settlementIds));
}

export async function listPartnerBillingByMode(mode: PartnerBillingMode, monthKey?: string | null) {
  const store = await loadStore();
  return {
    invoices: byNewest(
      store.invoices.filter((x) => x.mode === mode && (mode === "ONLINE_PACKAGE_END" ? true : x.monthKey === (monthKey ?? null))),
      (x) => x.createdAt,
    ),
    paymentRecords: byNewest(
      store.paymentRecords.filter((x) => x.mode === mode && (mode === "ONLINE_PACKAGE_END" ? true : x.monthKey === (monthKey ?? null))),
      (x) => x.uploadedAt,
    ),
    receipts: byNewest(
      store.receipts.filter((x) => x.mode === mode && (mode === "ONLINE_PACKAGE_END" ? true : x.monthKey === (monthKey ?? null))),
      (x) => x.createdAt,
    ),
  };
}

export async function getPartnerInvoiceById(invoiceId: string) {
  const store = await loadStore();
  return store.invoices.find((x) => x.id === invoiceId) ?? null;
}

export async function getPartnerReceiptById(receiptId: string) {
  const store = await loadStore();
  return store.receipts.find((x) => x.id === receiptId) ?? null;
}

export async function getPartnerPaymentRecordById(recordId: string) {
  const store = await loadStore();
  return store.paymentRecords.find((x) => x.id === recordId) ?? null;
}

export async function createPartnerInvoice(input: {
  partnerName: string;
  mode: PartnerBillingMode;
  monthKey?: string | null;
  settlementIds: string[];
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  billTo: string;
  paymentTerms: string;
  courseStartDate?: string | null;
  courseEndDate?: string | null;
  description: string;
  lines: Array<Omit<PartnerInvoiceLine, "id">>;
  note?: string | null;
  createdBy: string;
}) {
  const store = await loadStore();
  const now = new Date().toISOString();
  const normalizedInvoiceNo = input.invoiceNo.trim();
  ensureUniqueInvoiceNo(store, normalizedInvoiceNo);

  const settlementIdSet = new Set(input.settlementIds.map((x) => String(x ?? "").trim()).filter(Boolean));
  const alreadyUsed = new Set(store.invoices.flatMap((x) => x.settlementIds));
  for (const sid of settlementIdSet) {
    if (alreadyUsed.has(sid)) throw new Error(`Settlement already linked in another invoice: ${sid}`);
  }

  const lines: PartnerInvoiceLine[] = input.lines
    .map((x) => ({
      id: crypto.randomUUID(),
      type: (x.type === "MANUAL" ? "MANUAL" : "SETTLEMENT") as "MANUAL" | "SETTLEMENT",
      settlementId: x.settlementId?.trim() || null,
      description: String(x.description ?? "").trim(),
      quantity: normalizeQuantity(x.quantity, 1),
      amount: Number(x.amount) || 0,
      gstAmount: Number(x.gstAmount) || 0,
      totalAmount: Number(x.totalAmount) || 0,
    }))
    .filter((x) => x.description);
  if (lines.length === 0) throw new Error("Invoice must contain at least one line item");

  const amount = lines.reduce((a, b) => a + Math.max(0, b.totalAmount - b.gstAmount), 0);
  const gstAmount = lines.reduce((a, b) => a + b.gstAmount, 0);
  const totalAmount = lines.reduce((a, b) => a + b.totalAmount, 0);

  const item: PartnerInvoiceItem = {
    id: crypto.randomUUID(),
    partnerName: input.partnerName.trim() || "Partner",
    mode: input.mode,
    monthKey: input.mode === "OFFLINE_MONTHLY" ? (input.monthKey?.trim() || null) : null,
    settlementIds: Array.from(settlementIdSet),
    invoiceNo: normalizedInvoiceNo,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    billTo: input.billTo.trim() || input.partnerName.trim() || "Partner",
    paymentTerms: input.paymentTerms.trim() || "Immediate",
    courseStartDate: input.courseStartDate?.trim() || null,
    courseEndDate: input.courseEndDate?.trim() || null,
    description: input.description.trim(),
    lines,
    amount,
    gstAmount,
    totalAmount,
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
    module: "PARTNER_BILLING",
    action: "CREATE_INVOICE",
    entityType: "PartnerInvoice",
    entityId: item.id,
    meta: { invoiceNo: item.invoiceNo, mode: item.mode, monthKey: item.monthKey, settlementCount: item.settlementIds.length },
  });
  return item;
}

export async function addPartnerPaymentRecord(input: {
  mode: PartnerBillingMode;
  monthKey?: string | null;
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
  const item: PartnerPaymentRecordItem = {
    id: crypto.randomUUID(),
    mode: input.mode,
    monthKey: input.mode === "OFFLINE_MONTHLY" ? (input.monthKey?.trim() || null) : null,
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
  return item;
}

export async function replacePartnerPaymentRecord(input: {
  recordId: string;
  mode: PartnerBillingMode;
  monthKey?: string | null;
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
  if (oldItem.mode !== input.mode) throw new Error("Payment record mode mismatch");
  if (input.mode === "OFFLINE_MONTHLY" && oldItem.monthKey !== (input.monthKey?.trim() || null)) {
    throw new Error("Payment record month mismatch");
  }
  const next: PartnerPaymentRecordItem = {
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
  return { oldItem, item: next };
}

export async function deletePartnerPaymentRecord(input: { recordId: string; actorEmail: string }) {
  const store = await loadStore();
  const id = input.recordId.trim();
  const row = store.paymentRecords.find((x) => x.id === id);
  if (!row) throw new Error("Payment record not found");
  if (store.receipts.some((x) => x.paymentRecordId === id)) {
    throw new Error("Cannot delete payment record: linked receipt exists");
  }
  store.paymentRecords = store.paymentRecords.filter((x) => x.id !== id);
  await saveStore(store);
  return row;
}

export async function createPartnerReceipt(input: {
  invoiceId: string;
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
  const invoiceId = input.invoiceId.trim();
  const invoice = store.invoices.find((x) => x.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (store.receipts.some((x) => x.invoiceId === invoiceId)) {
    throw new Error("This invoice already has a receipt");
  }

  const normalizedReceiptNo = input.receiptNo.trim();
  ensureUniqueReceiptNo(store, normalizedReceiptNo);
  const expectedReceiptNo = `${invoice.invoiceNo}-RC`;
  if (normalizedReceiptNo.toLowerCase() !== expectedReceiptNo.toLowerCase()) {
    throw new Error(`Receipt No. must match linked invoice: ${expectedReceiptNo}`);
  }

  const item: PartnerReceiptItem = {
    id: crypto.randomUUID(),
    mode: invoice.mode,
    monthKey: invoice.monthKey,
    invoiceId,
    paymentRecordId: input.paymentRecordId?.trim() || null,
    receiptNo: normalizedReceiptNo,
    receiptDate: input.receiptDate,
    receivedFrom: input.receivedFrom.trim(),
    paidBy: input.paidBy.trim(),
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
  return item;
}

export async function buildPartnerReceiptNoForInvoice(invoiceId: string) {
  const store = await loadStore();
  const invoice = store.invoices.find((x) => x.id === invoiceId.trim());
  if (!invoice) throw new Error("Invoice not found");
  const receiptNo = `${invoice.invoiceNo}-RC`;
  if (store.receipts.some((x) => x.invoiceId === invoice.id)) throw new Error("This invoice already has a receipt");
  if (store.receipts.some((x) => x.receiptNo.trim().toLowerCase() === receiptNo.toLowerCase())) {
    throw new Error(`Receipt No. already exists: ${receiptNo}`);
  }
  return receiptNo;
}

export async function deletePartnerInvoice(input: { invoiceId: string; actorEmail: string }) {
  const store = await loadStore();
  const invoiceId = input.invoiceId.trim();
  const row = store.invoices.find((x) => x.id === invoiceId);
  if (!row) throw new Error("Invoice not found");
  if (store.receipts.some((x) => x.invoiceId === invoiceId)) {
    throw new Error("Cannot delete invoice: linked receipt exists");
  }
  store.invoices = store.invoices.filter((x) => x.id !== invoiceId);
  rebuildInvoiceSeqByMonth(store);
  await saveStore(store);
}

export async function applyPartnerInvoiceNumberAssignments(
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

  const store = await loadStore();
  const invoiceById = new Map(store.invoices.map((x) => [x.id, x]));
  for (const [invoiceId, invoiceNo] of map.entries()) {
    if (!invoiceById.has(invoiceId)) throw new Error(`Partner invoice not found: ${invoiceId}`);
    if (!/^RGT-\d{6}-\d{4}$/i.test(invoiceNo)) throw new Error(`Invalid invoice number format: ${invoiceNo}`);
  }

  const originalNoById = new Map<string, string>();
  for (const inv of store.invoices) originalNoById.set(inv.id, inv.invoiceNo);

  let changed = 0;
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
      if (!key) throw new Error(`Empty invoice number on partner invoice: ${inv.id}`);
      if (used.has(key)) throw new Error(`Duplicate partner invoice number after reassignment: ${inv.invoiceNo}`);
      used.add(key);
    }

    for (const rec of store.receipts) {
      const beforeNo = originalNoById.get(rec.invoiceId);
      const afterNo = map.get(rec.invoiceId);
      if (!beforeNo || !afterNo || beforeNo === afterNo) continue;
      const expectedOld = `${beforeNo}-RC`.toLowerCase();
      if (rec.receiptNo.trim().toLowerCase() === expectedOld) {
        rec.receiptNo = `${afterNo}-RC`;
        rec.updatedAt = new Date().toISOString();
      }
    }
  }

  rebuildInvoiceSeqByMonth(store);
  await saveStore(store);
  return changed;
}

export async function deletePartnerReceipt(input: { receiptId: string; actorEmail: string }) {
  const store = await loadStore();
  const receiptId = input.receiptId.trim();
  const row = store.receipts.find((x) => x.id === receiptId);
  if (!row) throw new Error("Receipt not found");
  store.receipts = store.receipts.filter((x) => x.id !== receiptId);
  await saveStore(store);
}

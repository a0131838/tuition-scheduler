import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";

const PARTNER_RECEIPT_APPROVAL_KEY = "partner_receipt_approval_v1";

export type PartnerReceiptApprovalItem = {
  receiptId: string;
  managerApprovedBy: string[];
  financeApprovedBy: string[];
  managerRejectedAt: string | null;
  managerRejectedBy: string | null;
  managerRejectReason: string | null;
  financeRejectedAt: string | null;
  financeRejectedBy: string | null;
  financeRejectReason: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseItems(input: unknown): PartnerReceiptApprovalItem[] {
  if (input == null) return [];
  try {
    const parsed = typeof input === "string" ? (JSON.parse(input) as unknown) : input;
    if (!Array.isArray(parsed)) return [];
    const out: PartnerReceiptApprovalItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const x = item as Record<string, unknown>;
      const receiptId = typeof x.receiptId === "string" ? x.receiptId : "";
      if (!receiptId) continue;
      out.push({
        receiptId,
        managerApprovedBy: Array.isArray(x.managerApprovedBy)
          ? x.managerApprovedBy.map((v) => normalizeEmail(String(v ?? ""))).filter(Boolean)
          : [],
        financeApprovedBy: Array.isArray(x.financeApprovedBy)
          ? x.financeApprovedBy.map((v) => normalizeEmail(String(v ?? ""))).filter(Boolean)
          : [],
        managerRejectedAt: typeof x.managerRejectedAt === "string" && x.managerRejectedAt.trim() ? x.managerRejectedAt : null,
        managerRejectedBy:
          typeof x.managerRejectedBy === "string" && x.managerRejectedBy.trim() ? normalizeEmail(x.managerRejectedBy) : null,
        managerRejectReason:
          typeof x.managerRejectReason === "string" && x.managerRejectReason.trim() ? x.managerRejectReason.trim() : null,
        financeRejectedAt: typeof x.financeRejectedAt === "string" && x.financeRejectedAt.trim() ? x.financeRejectedAt : null,
        financeRejectedBy:
          typeof x.financeRejectedBy === "string" && x.financeRejectedBy.trim() ? normalizeEmail(x.financeRejectedBy) : null,
        financeRejectReason:
          typeof x.financeRejectReason === "string" && x.financeRejectReason.trim() ? x.financeRejectReason.trim() : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function loadItems() {
  const { store } = await loadJsonAppSettingForDb(
    prisma as any,
    PARTNER_RECEIPT_APPROVAL_KEY,
    [],
    parseItems,
  );
  return store;
}

function ensureItem(items: PartnerReceiptApprovalItem[], receiptId: string) {
  const existing = items.find((x) => x.receiptId === receiptId);
  if (existing) return existing;
  const created: PartnerReceiptApprovalItem = {
    receiptId,
    managerApprovedBy: [],
    financeApprovedBy: [],
    managerRejectedAt: null,
    managerRejectedBy: null,
    managerRejectReason: null,
    financeRejectedAt: null,
    financeRejectedBy: null,
    financeRejectReason: null,
  };
  items.push(created);
  return created;
}

export async function getPartnerReceiptApprovalMap(receiptIds: string[]) {
  const idSet = new Set(receiptIds);
  const items = await loadItems();
  const out = new Map<string, PartnerReceiptApprovalItem>();
  for (const item of items) {
    if (idSet.has(item.receiptId)) out.set(item.receiptId, item);
  }
  return out;
}

export async function managerApprovePartnerReceipt(receiptId: string, approverEmail: string) {
  await mutateJsonAppSetting({
    key: PARTNER_RECEIPT_APPROVAL_KEY,
    fallback: [] as PartnerReceiptApprovalItem[],
    sanitize: parseItems,
    mutate(items) {
      const item = ensureItem(items, receiptId);
      item.managerApprovedBy = Array.from(new Set([...item.managerApprovedBy, normalizeEmail(approverEmail)]));
      item.managerRejectedAt = null;
      item.managerRejectedBy = null;
      item.managerRejectReason = null;
    },
  });
  await logAudit({
    actor: { email: approverEmail, role: "ADMIN" },
    module: "PARTNER_BILLING",
    action: "MANAGER_APPROVE_RECEIPT",
    entityType: "PartnerReceipt",
    entityId: receiptId,
  });
}

export async function managerRejectPartnerReceipt(receiptId: string, approverEmail: string, reason: string) {
  await mutateJsonAppSetting({
    key: PARTNER_RECEIPT_APPROVAL_KEY,
    fallback: [] as PartnerReceiptApprovalItem[],
    sanitize: parseItems,
    mutate(items) {
      const item = ensureItem(items, receiptId);
      const email = normalizeEmail(approverEmail);
      item.managerApprovedBy = item.managerApprovedBy.filter((x) => x !== email);
      item.financeApprovedBy = [];
      item.managerRejectedAt = new Date().toISOString();
      item.managerRejectedBy = email;
      item.managerRejectReason = reason.trim();
      item.financeRejectedAt = null;
      item.financeRejectedBy = null;
      item.financeRejectReason = null;
    },
  });
}

export async function financeApprovePartnerReceipt(receiptId: string, approverEmail: string) {
  await mutateJsonAppSetting({
    key: PARTNER_RECEIPT_APPROVAL_KEY,
    fallback: [] as PartnerReceiptApprovalItem[],
    sanitize: parseItems,
    mutate(items) {
      const item = ensureItem(items, receiptId);
      item.financeApprovedBy = Array.from(new Set([...item.financeApprovedBy, normalizeEmail(approverEmail)]));
      item.financeRejectedAt = null;
      item.financeRejectedBy = null;
      item.financeRejectReason = null;
    },
  });
}

export async function financeRejectPartnerReceipt(receiptId: string, approverEmail: string, reason: string) {
  await mutateJsonAppSetting({
    key: PARTNER_RECEIPT_APPROVAL_KEY,
    fallback: [] as PartnerReceiptApprovalItem[],
    sanitize: parseItems,
    mutate(items) {
      const item = ensureItem(items, receiptId);
      const email = normalizeEmail(approverEmail);
      item.financeApprovedBy = item.financeApprovedBy.filter((x) => x !== email);
      item.financeRejectedAt = new Date().toISOString();
      item.financeRejectedBy = email;
      item.financeRejectReason = reason.trim();
    },
  });
}

export async function deletePartnerReceiptApproval(receiptId: string) {
  const id = String(receiptId ?? "").trim();
  if (!id) return;
  await mutateJsonAppSetting({
    key: PARTNER_RECEIPT_APPROVAL_KEY,
    fallback: [] as PartnerReceiptApprovalItem[],
    sanitize: parseItems,
    mutate(items) {
      const next = items.filter((x) => x.receiptId !== id);
      if (next.length === items.length) return;
      items.splice(0, items.length, ...next);
    },
  });
}

export async function revokePartnerReceiptApprovalForRedo(receiptId: string, actorEmail: string, reason?: string) {
  const id = String(receiptId ?? "").trim();
  if (!id) return;
  await mutateJsonAppSetting({
    key: PARTNER_RECEIPT_APPROVAL_KEY,
    fallback: [] as PartnerReceiptApprovalItem[],
    sanitize: parseItems,
    mutate(items) {
      const item = ensureItem(items, id);
      item.managerApprovedBy = [];
      item.financeApprovedBy = [];
      item.managerRejectedAt = null;
      item.managerRejectedBy = null;
      item.managerRejectReason = null;
      item.financeRejectedAt = null;
      item.financeRejectedBy = null;
      item.financeRejectReason = null;
    },
  });
  await logAudit({
    actor: { email: actorEmail, role: "ADMIN" },
    module: "PARTNER_BILLING",
    action: "REVOKE_RECEIPT_APPROVAL_FOR_REDO",
    entityType: "PartnerReceipt",
    entityId: id,
    meta: { reason: String(reason ?? "").trim() || null },
  });
}

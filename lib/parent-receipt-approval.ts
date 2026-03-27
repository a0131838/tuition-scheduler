import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";

const PARENT_RECEIPT_APPROVAL_KEY = "parent_receipt_approval_v1";

export type ParentReceiptApprovalItem = {
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

function parseItems(raw?: string | null): ParentReceiptApprovalItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ParentReceiptApprovalItem[] = [];
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
    PARENT_RECEIPT_APPROVAL_KEY,
    [],
    (input) => parseItems(typeof input === "string" ? input : null),
  );
  return store;
}

function ensureItem(items: ParentReceiptApprovalItem[], receiptId: string) {
  const existing = items.find((x) => x.receiptId === receiptId);
  if (existing) return existing;
  const created: ParentReceiptApprovalItem = {
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

export async function getParentReceiptApprovalMap(receiptIds: string[]) {
  const idSet = new Set(receiptIds);
  const items = await loadItems();
  const out = new Map<string, ParentReceiptApprovalItem>();
  for (const item of items) {
    if (idSet.has(item.receiptId)) out.set(item.receiptId, item);
  }
  return out;
}

export async function managerApproveParentReceipt(receiptId: string, approverEmail: string) {
  await mutateJsonAppSetting({
    key: PARENT_RECEIPT_APPROVAL_KEY,
    fallback: [] as ParentReceiptApprovalItem[],
    sanitize: (input) => parseItems(typeof input === "string" ? input : null),
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
    module: "PARENT_BILLING",
    action: "MANAGER_APPROVE_RECEIPT",
    entityType: "ParentReceipt",
    entityId: receiptId,
  });
}

export async function managerRejectParentReceipt(receiptId: string, approverEmail: string, reason: string) {
  await mutateJsonAppSetting({
    key: PARENT_RECEIPT_APPROVAL_KEY,
    fallback: [] as ParentReceiptApprovalItem[],
    sanitize: (input) => parseItems(typeof input === "string" ? input : null),
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
  await logAudit({
    actor: { email: approverEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "MANAGER_REJECT_RECEIPT",
    entityType: "ParentReceipt",
    entityId: receiptId,
    meta: { reason: reason.trim() },
  });
}

export async function financeApproveParentReceipt(receiptId: string, approverEmail: string) {
  await mutateJsonAppSetting({
    key: PARENT_RECEIPT_APPROVAL_KEY,
    fallback: [] as ParentReceiptApprovalItem[],
    sanitize: (input) => parseItems(typeof input === "string" ? input : null),
    mutate(items) {
      const item = ensureItem(items, receiptId);
      item.financeApprovedBy = Array.from(new Set([...item.financeApprovedBy, normalizeEmail(approverEmail)]));
      item.financeRejectedAt = null;
      item.financeRejectedBy = null;
      item.financeRejectReason = null;
    },
  });
  await logAudit({
    actor: { email: approverEmail, role: "FINANCE" },
    module: "PARENT_BILLING",
    action: "FINANCE_APPROVE_RECEIPT",
    entityType: "ParentReceipt",
    entityId: receiptId,
  });
}

export async function financeRejectParentReceipt(receiptId: string, approverEmail: string, reason: string) {
  await mutateJsonAppSetting({
    key: PARENT_RECEIPT_APPROVAL_KEY,
    fallback: [] as ParentReceiptApprovalItem[],
    sanitize: (input) => parseItems(typeof input === "string" ? input : null),
    mutate(items) {
      const item = ensureItem(items, receiptId);
      const email = normalizeEmail(approverEmail);
      item.financeApprovedBy = item.financeApprovedBy.filter((x) => x !== email);
      item.financeRejectedAt = new Date().toISOString();
      item.financeRejectedBy = email;
      item.financeRejectReason = reason.trim();
    },
  });
  await logAudit({
    actor: { email: approverEmail, role: "FINANCE" },
    module: "PARENT_BILLING",
    action: "FINANCE_REJECT_RECEIPT",
    entityType: "ParentReceipt",
    entityId: receiptId,
    meta: { reason: reason.trim() },
  });
}

export async function deleteParentReceiptApproval(receiptId: string) {
  const id = String(receiptId ?? "").trim();
  if (!id) return;
  await mutateJsonAppSetting({
    key: PARENT_RECEIPT_APPROVAL_KEY,
    fallback: [] as ParentReceiptApprovalItem[],
    sanitize: (input) => parseItems(typeof input === "string" ? input : null),
    mutate(items) {
      const next = items.filter((x) => x.receiptId !== id);
      if (next.length === items.length) return;
      items.splice(0, items.length, ...next);
    },
  });
}

export async function revokeParentReceiptApprovalForRedo(receiptId: string, actorEmail: string, reason?: string) {
  const id = String(receiptId ?? "").trim();
  if (!id) return;
  await mutateJsonAppSetting({
    key: PARENT_RECEIPT_APPROVAL_KEY,
    fallback: [] as ParentReceiptApprovalItem[],
    sanitize: (input) => parseItems(typeof input === "string" ? input : null),
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
    module: "PARENT_BILLING",
    action: "REVOKE_RECEIPT_APPROVAL_FOR_REDO",
    entityType: "ParentReceipt",
    entityId: id,
    meta: { reason: String(reason ?? "").trim() || null },
  });
}

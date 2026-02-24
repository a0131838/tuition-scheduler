import { prisma } from "@/lib/prisma";

const PARTNER_SETTLEMENT_APPROVAL_KEY = "partner_settlement_approval_v1";

export type PartnerSettlementApprovalItem = {
  settlementId: string;
  managerApprovedBy: string[];
  financeApprovedBy: string[];
  exportedAt: string | null;
  exportedBy: string | null;
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

function parseItems(raw?: string | null): PartnerSettlementApprovalItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PartnerSettlementApprovalItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const x = item as Record<string, unknown>;
      const settlementId = typeof x.settlementId === "string" ? x.settlementId : "";
      if (!settlementId) continue;
      out.push({
        settlementId,
        managerApprovedBy: Array.isArray(x.managerApprovedBy)
          ? x.managerApprovedBy.map((v) => normalizeEmail(String(v ?? ""))).filter(Boolean)
          : [],
        financeApprovedBy: Array.isArray(x.financeApprovedBy)
          ? x.financeApprovedBy.map((v) => normalizeEmail(String(v ?? ""))).filter(Boolean)
          : [],
        exportedAt: typeof x.exportedAt === "string" && x.exportedAt.trim() ? x.exportedAt : null,
        exportedBy: typeof x.exportedBy === "string" && x.exportedBy.trim() ? normalizeEmail(x.exportedBy) : null,
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
  const row = await prisma.appSetting.findUnique({
    where: { key: PARTNER_SETTLEMENT_APPROVAL_KEY },
    select: { value: true },
  });
  return parseItems(row?.value ?? null);
}

async function saveItems(items: PartnerSettlementApprovalItem[]) {
  await prisma.appSetting.upsert({
    where: { key: PARTNER_SETTLEMENT_APPROVAL_KEY },
    update: { value: JSON.stringify(items) },
    create: { key: PARTNER_SETTLEMENT_APPROVAL_KEY, value: JSON.stringify(items) },
  });
}

function ensureItem(items: PartnerSettlementApprovalItem[], settlementId: string) {
  const existing = items.find((x) => x.settlementId === settlementId);
  if (existing) return existing;
  const created: PartnerSettlementApprovalItem = {
    settlementId,
    managerApprovedBy: [],
    financeApprovedBy: [],
    exportedAt: null,
    exportedBy: null,
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

export async function getPartnerSettlementApprovalMap(settlementIds: string[]) {
  const idSet = new Set(settlementIds);
  const items = await loadItems();
  const out = new Map<string, PartnerSettlementApprovalItem>();
  for (const item of items) {
    if (idSet.has(item.settlementId)) out.set(item.settlementId, item);
  }
  return out;
}

export async function managerApprovePartnerSettlement(settlementId: string, approverEmail: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  item.managerApprovedBy = Array.from(new Set([...item.managerApprovedBy, normalizeEmail(approverEmail)]));
  item.managerRejectedAt = null;
  item.managerRejectedBy = null;
  item.managerRejectReason = null;
  await saveItems(items);
}

export async function managerRejectPartnerSettlement(settlementId: string, approverEmail: string, reason: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  const email = normalizeEmail(approverEmail);
  item.managerApprovedBy = item.managerApprovedBy.filter((x) => x !== email);
  item.financeApprovedBy = [];
  item.exportedAt = null;
  item.exportedBy = null;
  item.managerRejectedAt = new Date().toISOString();
  item.managerRejectedBy = email;
  item.managerRejectReason = reason.trim();
  await saveItems(items);
}

export async function financeApprovePartnerSettlement(settlementId: string, approverEmail: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  item.financeApprovedBy = Array.from(new Set([...item.financeApprovedBy, normalizeEmail(approverEmail)]));
  item.financeRejectedAt = null;
  item.financeRejectedBy = null;
  item.financeRejectReason = null;
  await saveItems(items);
}

export async function financeRejectPartnerSettlement(settlementId: string, approverEmail: string, reason: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  const email = normalizeEmail(approverEmail);
  item.financeApprovedBy = item.financeApprovedBy.filter((x) => x !== email);
  item.exportedAt = null;
  item.exportedBy = null;
  item.financeRejectedAt = new Date().toISOString();
  item.financeRejectedBy = email;
  item.financeRejectReason = reason.trim();
  await saveItems(items);
}

export async function markPartnerSettlementExported(settlementId: string, exporterEmail: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  item.exportedAt = new Date().toISOString();
  item.exportedBy = normalizeEmail(exporterEmail);
  await saveItems(items);
}

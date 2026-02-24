import { prisma } from "@/lib/prisma";

const PARTNER_SETTLEMENT_APPROVAL_KEY = "partner_settlement_approval_v1";

export type PartnerSettlementApprovalItem = {
  settlementId: string;
  managerApprovedBy: string[];
  financeApprovedBy: string[];
  exportedAt: string | null;
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
  await saveItems(items);
}

export async function financeApprovePartnerSettlement(settlementId: string, approverEmail: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  item.financeApprovedBy = Array.from(new Set([...item.financeApprovedBy, normalizeEmail(approverEmail)]));
  await saveItems(items);
}

export async function markPartnerSettlementExported(settlementId: string) {
  const items = await loadItems();
  const item = ensureItem(items, settlementId);
  item.exportedAt = new Date().toISOString();
  await saveItems(items);
}


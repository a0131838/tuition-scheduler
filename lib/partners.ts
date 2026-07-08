import { prisma } from "@/lib/prisma";

export const LEGACY_XDF_PARTNER_NAME = "新东方";
export const LEGACY_XDF_SOURCE_CHANNEL_NAME = "新东方学生";
export const SHANGHAI_XZS_PARTNER_NAME = "上海新卓思";
export const SHANGHAI_XZS_SOURCE_CHANNEL_NAME = "上海新卓思学生";

export const DEFAULT_PARTNER_ONLINE_RATE_PER_45 = 70;
export const DEFAULT_PARTNER_OFFLINE_RATE_PER_45 = 90;
export const DEFAULT_PARTNER_LESSON_MINUTES = 45;
export const DEFAULT_PARTNER_PACKAGE_MINUTES = 450;
export const DEFAULT_PARTNER_TOP_UP_MINUTES = 270;

export type PartnerConfig = {
  id: string;
  name: string;
  sourceChannelId: string;
  sourceChannelName: string;
  billTo: string;
  invoiceDisplayName: string;
  onlineRatePer45: number;
  offlineRatePer45: number;
  lessonMinutes: number;
  defaultPackageMinutes: number;
  defaultTopUpMinutes: number;
  supportsOnlineSettlement: boolean;
  supportsOfflineMonthly: boolean;
  intakeEnabled: boolean;
  isActive: boolean;
};

function normalizePositiveInt(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

function normalizeRate(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

function toPartnerConfig(row: {
  id: string;
  name: string;
  sourceChannelId: string;
  billTo: string;
  invoiceDisplayName: string | null;
  onlineRatePer45: number;
  offlineRatePer45: number;
  lessonMinutes: number;
  defaultPackageMinutes: number;
  defaultTopUpMinutes: number;
  supportsOnlineSettlement: boolean;
  supportsOfflineMonthly: boolean;
  intakeEnabled: boolean;
  isActive: boolean;
  sourceChannel: { name: string };
}): PartnerConfig {
  return {
    id: row.id,
    name: row.name,
    sourceChannelId: row.sourceChannelId,
    sourceChannelName: row.sourceChannel.name,
    billTo: row.billTo || row.name,
    invoiceDisplayName: row.invoiceDisplayName || row.name,
    onlineRatePer45: normalizeRate(row.onlineRatePer45, DEFAULT_PARTNER_ONLINE_RATE_PER_45),
    offlineRatePer45: normalizeRate(row.offlineRatePer45, DEFAULT_PARTNER_OFFLINE_RATE_PER_45),
    lessonMinutes: normalizePositiveInt(row.lessonMinutes, DEFAULT_PARTNER_LESSON_MINUTES),
    defaultPackageMinutes: normalizePositiveInt(row.defaultPackageMinutes, DEFAULT_PARTNER_PACKAGE_MINUTES),
    defaultTopUpMinutes: normalizePositiveInt(row.defaultTopUpMinutes, DEFAULT_PARTNER_TOP_UP_MINUTES),
    supportsOnlineSettlement: row.supportsOnlineSettlement,
    supportsOfflineMonthly: row.supportsOfflineMonthly,
    intakeEnabled: row.intakeEnabled,
    isActive: row.isActive,
  };
}

export async function listActivePartners() {
  const rows = await prisma.partner.findMany({
    where: { isActive: true },
    include: { sourceChannel: { select: { name: true } } },
    orderBy: [{ name: "asc" }],
  });
  return rows.map(toPartnerConfig);
}

export async function getLegacyXdfPartner() {
  const row = await prisma.partner.findFirst({
    where: {
      OR: [
        { name: LEGACY_XDF_PARTNER_NAME },
        { sourceChannel: { name: LEGACY_XDF_SOURCE_CHANNEL_NAME } },
      ],
    },
    include: { sourceChannel: { select: { name: true } } },
  });
  return row ? toPartnerConfig(row) : null;
}

export async function getPartnerById(partnerId: string | null | undefined) {
  const id = String(partnerId ?? "").trim();
  if (!id) return null;
  const row = await prisma.partner.findUnique({
    where: { id },
    include: { sourceChannel: { select: { name: true } } },
  });
  return row ? toPartnerConfig(row) : null;
}

export async function getPartnerByIdOrDefault(partnerId: string | null | undefined) {
  return (await getPartnerById(partnerId)) ?? (await getLegacyXdfPartner());
}

export async function getPartnerBySourceChannelId(sourceChannelId: string | null | undefined) {
  const id = String(sourceChannelId ?? "").trim();
  if (!id) return null;
  const row = await prisma.partner.findUnique({
    where: { sourceChannelId: id },
    include: { sourceChannel: { select: { name: true } } },
  });
  return row ? toPartnerConfig(row) : null;
}

export async function getPartnerByStudentId(studentId: string | null | undefined) {
  const id = String(studentId ?? "").trim();
  if (!id) return null;
  const student = await prisma.student.findUnique({
    where: { id },
    select: { sourceChannelId: true },
  });
  return getPartnerBySourceChannelId(student?.sourceChannelId);
}

export function isPartnerSourceNameFallback(sourceName: string | null | undefined) {
  const normalized = String(sourceName ?? "").trim();
  return normalized === LEGACY_XDF_SOURCE_CHANNEL_NAME || normalized === SHANGHAI_XZS_SOURCE_CHANNEL_NAME;
}

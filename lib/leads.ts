import { Prisma } from "@prisma/client";

export const LEAD_SOURCE_TYPES = [
  "小红书",
  "抖音",
  "短视频/自媒体",
  "老客户介绍",
  "渠道介绍",
  "微信/私域",
  "官网/表单",
  "线下活动",
  "其他",
];

export const LEAD_SOURCE_PLATFORMS = [
  "小红书",
  "抖音",
  "视频号",
  "微信公众号",
  "微信群",
  "朋友圈",
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "Google",
  "官网",
  "老客户介绍",
  "渠道介绍",
  "线下活动",
  "其他",
];

export const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Need Assessment",
  "Assessment Done",
  "Trial Pending",
  "Proposal Sent",
  "Won",
  "Lost",
  "Dormant",
];

export const LEAD_STATUS_LABELS: Record<string, { en: string; zh: string }> = {
  "New Lead": { en: "New Lead", zh: "新资源" },
  Contacted: { en: "Contacted", zh: "已联系" },
  "Need Assessment": { en: "Need Assessment", zh: "待老师评估" },
  "Assessment Done": { en: "Assessment Done", zh: "评估完成" },
  "Trial Pending": { en: "Trial Pending", zh: "待试听/体验" },
  "Proposal Sent": { en: "Proposal Sent", zh: "已发方案" },
  Won: { en: "Won", zh: "已成交" },
  Lost: { en: "Lost", zh: "已流失" },
  Dormant: { en: "Dormant", zh: "暂缓" },
};

export const LEAD_INTENT_LEVELS = ["Hot", "Warm", "Cold"];
export const LEAD_FOLLOW_UP_CHANNELS = ["微信", "电话", "面谈", "群聊", "邮件", "其他"];
export const LEAD_ASSESSMENT_STATUSES = ["Pending", "Submitted", "Revision Requested", "Cancelled"];

export function normalizeLeadText(value: unknown, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function normalizeLeadOption(value: unknown, allowed: string[], fallback = "") {
  const text = normalizeLeadText(value, 120);
  if (!text) return fallback;
  return allowed.includes(text) ? text : fallback;
}

export function normalizeLeadFlexibleOption(value: unknown, allowed: string[], fallback = "") {
  const text = normalizeLeadText(value, 120);
  if (!text) return fallback;
  if (allowed.includes(text)) return text;
  return text;
}

export function parseLeadDateTime(value: unknown) {
  const text = normalizeLeadText(value, 40);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T23:59:59+08:00`);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return new Date(`${text}:00+08:00`);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatLeadDateInput(value: Date | null | undefined) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function buildLeadSourceChannelName(input: { sourceType?: string | null; sourcePlatform?: string | null }) {
  const sourceType = normalizeLeadText(input.sourceType, 80);
  const sourcePlatform = normalizeLeadText(input.sourcePlatform, 80);
  if (sourcePlatform && sourcePlatform !== sourceType) return `${sourceType || "其他"} - ${sourcePlatform}`.slice(0, 120);
  return (sourceType || sourcePlatform || "其他").slice(0, 120);
}

export function buildLeadStudentNote(input: {
  existingNote?: string | null;
  leadNo: string;
  sourceType?: string | null;
  sourcePlatform?: string | null;
  sourceDetail?: string | null;
  parentName?: string | null;
  parentWechat?: string | null;
  parentPhone?: string | null;
  needs?: string | null;
}) {
  const parts = [
    `Converted from lead ${input.leadNo}`,
    `Source: ${[input.sourceType, input.sourcePlatform].filter(Boolean).join(" / ") || "-"}`,
    input.sourceDetail ? `Source detail: ${input.sourceDetail}` : "",
    input.parentName ? `Parent: ${input.parentName}` : "",
    input.parentWechat ? `Wechat: ${input.parentWechat}` : "",
    input.parentPhone ? `Phone: ${input.parentPhone}` : "",
    input.needs ? `Needs: ${input.needs}` : "",
  ].filter(Boolean);
  return [input.existingNote, parts.join("\n")].filter(Boolean).join("\n\n").slice(0, 3000);
}

function leadDayKey(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${year}${month}${day}`;
}

export async function allocateLeadNo(tx: Prisma.TransactionClient, now = new Date()) {
  const dayKey = leadDayKey(now);
  const counter = await tx.leadDailyCounter.upsert({
    where: { dayKey },
    create: { dayKey, nextSeq: 2 },
    update: { nextSeq: { increment: 1 } },
    select: { nextSeq: true },
  });
  const seq = Math.max(1, counter.nextSeq - 1);
  return `L${dayKey}-${String(seq).padStart(3, "0")}`;
}

export function summarizeLeadRows<T extends { status: string; intentLevel: string; nextActionDue: Date | null }>(rows: T[], now = new Date()) {
  const openRows = rows.filter((row) => row.status !== "Won" && row.status !== "Lost");
  const overdueRows = openRows.filter((row) => row.nextActionDue && row.nextActionDue.getTime() < now.getTime());
  return {
    total: rows.length,
    open: openRows.length,
    hot: rows.filter((row) => row.intentLevel === "Hot").length,
    overdue: overdueRows.length,
    won: rows.filter((row) => row.status === "Won").length,
    lost: rows.filter((row) => row.status === "Lost").length,
  };
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

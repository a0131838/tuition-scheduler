import { Prisma } from "@prisma/client";

export type OptionItem = {
  value: string;
  zh: string;
  en: string;
};

export const TICKET_SOURCE_OPTIONS: OptionItem[] = [
  { value: "新东方外包", zh: "新东方外包", en: "New Oriental Outsourced" },
  { value: "自营学生", zh: "自营学生", en: "In-house Student" },
];

export const TICKET_TYPE_OPTIONS: OptionItem[] = [
  { value: "改课程时间", zh: "改课程时间", en: "Reschedule Lesson Time" },
  { value: "改上课老师", zh: "改上课老师", en: "Change Teacher" },
  { value: "临时取消&请假课程", zh: "临时取消&请假课程", en: "Temporary Cancel / Leave" },
  { value: "补课加课", zh: "补课加课", en: "Extra Session" },
  { value: "新学生购买课时包", zh: "新学生购买课时包", en: "New Student Package Purchase" },
  { value: "新排课", zh: "新排课", en: "New Scheduling" },
  { value: "临时评估学生（没有买课程）", zh: "临时评估学生（没有买课程）", en: "Assessment Without Package" },
  { value: "评估学生（已买课程）", zh: "评估学生（已买课程）", en: "Assessment With Package" },
  { value: "学术问题", zh: "学术问题", en: "Academic Issue" },
  { value: "非学术问题", zh: "非学术问题", en: "Non-academic Issue" },
];

export const TICKET_PRIORITY_OPTIONS: OptionItem[] = [
  { value: "普通", zh: "普通", en: "Normal" },
  { value: "1小时紧急", zh: "1小时紧急", en: "Urgent in 1 Hour" },
  { value: "6小时紧急", zh: "6小时紧急", en: "Urgent in 6 Hours" },
  { value: "24小时紧急", zh: "24小时紧急", en: "Urgent in 24 Hours" },
];

export const TICKET_STATUS_OPTIONS: OptionItem[] = [
  { value: "Need Info", zh: "待补信息", en: "Need Info" },
  { value: "Waiting Teacher", zh: "等老师", en: "Waiting Teacher" },
  { value: "Waiting Parent", zh: "等家长/合作方", en: "Waiting Parent/Partner" },
  { value: "Confirmed", zh: "已确认", en: "Confirmed" },
  { value: "Completed", zh: "已完成", en: "Completed" },
  { value: "Cancelled", zh: "已取消", en: "Cancelled" },
  { value: "Exception", zh: "异常升级", en: "Exception" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  "Need Info": ["Waiting Teacher", "Waiting Parent", "Cancelled"],
  "Waiting Teacher": ["Waiting Parent", "Confirmed", "Need Info", "Exception", "Cancelled"],
  "Waiting Parent": ["Waiting Teacher", "Confirmed", "Need Info", "Exception", "Cancelled"],
  Confirmed: ["Completed", "Exception", "Cancelled"],
  Completed: ["Confirmed"],
  Cancelled: [],
  Exception: ["Waiting Teacher", "Waiting Parent", "Confirmed", "Completed", "Cancelled"],
};

export function canTransitionTicketStatus(from: string, to: string) {
  if (from === to) return true;
  const allowed = STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export const TICKET_OWNER_OPTIONS: OptionItem[] = [
  { value: "Eva", zh: "Eva", en: "Eva" },
  { value: "Emily", zh: "Emily", en: "Emily" },
  { value: "Jasmine", zh: "Jasmine", en: "Jasmine" },
];

export const TICKET_MODE_OPTIONS: OptionItem[] = [
  { value: "Online", zh: "线上", en: "Online" },
  { value: "Onsite", zh: "线下", en: "Onsite" },
];

export const TICKET_SYSTEM_UPDATED_OPTIONS: OptionItem[] = [
  { value: "Y", zh: "是", en: "Yes" },
  { value: "N", zh: "否", en: "No" },
];

export const TICKET_VERSION_OPTIONS: OptionItem[] = [
  { value: "V1", zh: "V1", en: "V1" },
  { value: "V2", zh: "V2", en: "V2" },
  { value: "V3", zh: "V3", en: "V3" },
  { value: "V4", zh: "V4", en: "V4" },
  { value: "V5", zh: "V5", en: "V5" },
];

const LEGACY_TICKET_TYPE_MAP: Record<string, string> = {
  改课调课: "改课程时间",
  取消: "临时取消&请假课程",
  请假: "临时取消&请假课程",
};

const LEGACY_TICKET_PRIORITY_MAP: Record<string, string> = {
  "紧急(24h内要上课)": "24小时紧急",
};

const SITUATION_CURRENT_TAG = "[SITUATION_CURRENT]";
const SITUATION_ACTION_TAG = "[SITUATION_ACTION]";
const SITUATION_DEADLINE_TAG = "[SITUATION_DEADLINE]";

export function normalizeTicketTypeValue(value: string | null | undefined) {
  if (!value) return "";
  return LEGACY_TICKET_TYPE_MAP[value] ?? value;
}

export function ticketTypeAliases(value: string | null | undefined) {
  const normalized = normalizeTicketTypeValue(value);
  if (!normalized) return [];
  return Array.from(
    new Set(
      [normalized, ...Object.entries(LEGACY_TICKET_TYPE_MAP).filter(([, next]) => next === normalized).map(([legacy]) => legacy)].filter(
        Boolean
      )
    )
  );
}

export function normalizeTicketPriorityValue(value: string | null | undefined) {
  if (!value) return "";
  return LEGACY_TICKET_PRIORITY_MAP[value] ?? value;
}

export function composeTicketSituation(input: {
  currentIssue: string;
  requiredAction: string;
  latestDeadlineText: string;
}) {
  return [
    SITUATION_CURRENT_TAG,
    input.currentIssue.trim(),
    "",
    SITUATION_ACTION_TAG,
    input.requiredAction.trim(),
    "",
    SITUATION_DEADLINE_TAG,
    input.latestDeadlineText.trim(),
  ].join("\n");
}

export function parseTicketSituationSummary(raw: string | null | undefined) {
  const src = String(raw ?? "");
  const readBlock = (startTag: string, nextTag?: string) => {
    const start = src.indexOf(startTag);
    if (start < 0) return "";
    const contentStart = start + startTag.length;
    const completionNoteStart = src.indexOf("[Completed Note]", contentStart);
    const nextTagStart = nextTag ? src.indexOf(nextTag, contentStart) : -1;
    const endCandidates = [nextTagStart, completionNoteStart].filter((idx) => idx >= 0);
    const end = endCandidates.length > 0 ? Math.min(...endCandidates) : -1;
    const text = end >= 0 ? src.slice(contentStart, end) : src.slice(contentStart);
    return text.trim();
  };

  const currentIssue = readBlock(SITUATION_CURRENT_TAG, SITUATION_ACTION_TAG);
  const requiredAction = readBlock(SITUATION_ACTION_TAG, SITUATION_DEADLINE_TAG);
  const latestDeadlineText = readBlock(SITUATION_DEADLINE_TAG);
  if (!currentIssue && !requiredAction && !latestDeadlineText) {
    return {
      currentIssue: src.trim(),
      requiredAction: "",
      latestDeadlineText: "",
    };
  }
  return { currentIssue, requiredAction, latestDeadlineText };
}

export function normalizeTicketString(v: unknown, maxLen = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

export function normalizeTicketInt(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded <= 0) return null;
  return rounded;
}

export function parseDateLike(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00+08:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return new Date(`${s}:00+08:00`);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function ticketDayKey(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}${m}${day}`;
}

export async function allocateTicketNo(tx: Prisma.TransactionClient, now = new Date()) {
  const dayKey = ticketDayKey(now);
  const counter = await tx.ticketDailyCounter.upsert({
    where: { dayKey },
    create: { dayKey, nextSeq: 2 },
    update: { nextSeq: { increment: 1 } },
    select: { nextSeq: true },
  });
  const seq = Math.max(1, counter.nextSeq - 1);
  return `${dayKey}-${String(seq).padStart(3, "0")}`;
}

export function generateIntakeToken() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 24; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export const TICKET_UPLOAD_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const TICKET_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

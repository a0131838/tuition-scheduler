import { prisma } from "@/lib/prisma";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";

export type TeacherNotice = {
  id: string;
  titleEn: string;
  titleZh: string;
  bodyEn: string;
  bodyZh: string;
  publishedAt: string;
  important: boolean;
  active: boolean;
};

export type TeacherNoticeReadStore = {
  readsByUser: Record<string, Record<string, string>>;
};

const TEACHER_NOTICES_KEY = "teacher_notices_v1";
const TEACHER_NOTICE_READS_KEY = "teacher_notice_reads_v1";

export const DEFAULT_TEACHER_NOTICES: TeacherNotice[] = [
  {
    id: "company-name-update-20260508",
    titleEn: "Company name update",
    titleZh: "公司名称更新",
    bodyEn:
      "Please note that our official company name is now GT Educational Institute Pte. Ltd. Please use this name for invoices, receipts, expense claims, payroll-related documents, and external communication where company name is required.",
    bodyZh:
      "请注意，公司正式名称现为 GT Educational Institute Pte. Ltd. 如涉及发票、收据、报销、工资相关文件或需要填写公司名称的对外沟通，请使用此名称。",
    publishedAt: "2026-05-08",
    important: true,
    active: true,
  },
];

function cleanString(v: unknown, fallback = "") {
  return typeof v === "string" ? v.trim() : fallback;
}

export function sanitizeTeacherNotices(input: unknown): TeacherNotice[] {
  if (!Array.isArray(input)) return DEFAULT_TEACHER_NOTICES;
  const notices = input
    .map((raw): TeacherNotice | null => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const id = cleanString(row.id);
      const titleEn = cleanString(row.titleEn);
      const titleZh = cleanString(row.titleZh);
      const bodyEn = cleanString(row.bodyEn);
      const bodyZh = cleanString(row.bodyZh);
      if (!id || !titleEn || !titleZh || !bodyEn || !bodyZh) return null;
      return {
        id,
        titleEn,
        titleZh,
        bodyEn,
        bodyZh,
        publishedAt: cleanString(row.publishedAt, new Date().toISOString().slice(0, 10)),
        important: Boolean(row.important),
        active: row.active !== false,
      };
    })
    .filter((x): x is TeacherNotice => Boolean(x));
  return notices.length > 0 ? notices : DEFAULT_TEACHER_NOTICES;
}

export function sanitizeTeacherNoticeReads(input: unknown): TeacherNoticeReadStore {
  const fallback: TeacherNoticeReadStore = { readsByUser: {} };
  if (!input || typeof input !== "object") return fallback;
  const rawStore = input as Record<string, unknown>;
  const rawReads = rawStore.readsByUser;
  if (!rawReads || typeof rawReads !== "object") return fallback;

  const readsByUser: TeacherNoticeReadStore["readsByUser"] = {};
  for (const [userId, rawNoticeMap] of Object.entries(rawReads as Record<string, unknown>)) {
    if (!userId || !rawNoticeMap || typeof rawNoticeMap !== "object") continue;
    const noticeMap: Record<string, string> = {};
    for (const [noticeId, readAt] of Object.entries(rawNoticeMap as Record<string, unknown>)) {
      if (!noticeId || typeof readAt !== "string" || !readAt.trim()) continue;
      noticeMap[noticeId] = readAt;
    }
    if (Object.keys(noticeMap).length > 0) readsByUser[userId] = noticeMap;
  }
  return { readsByUser };
}

export function activeTeacherNotices(notices: TeacherNotice[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return notices
    .filter((notice) => notice.active && notice.publishedAt <= today)
    .sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}

export async function getTeacherNoticeState(userId: string) {
  const [{ store: notices }, { store: reads }] = await Promise.all([
    loadJsonAppSettingForDb(prisma as any, TEACHER_NOTICES_KEY, DEFAULT_TEACHER_NOTICES, sanitizeTeacherNotices),
    loadJsonAppSettingForDb(prisma as any, TEACHER_NOTICE_READS_KEY, { readsByUser: {} }, sanitizeTeacherNoticeReads),
  ]);
  const active = activeTeacherNotices(notices);
  const readMap = reads.readsByUser[userId] ?? {};
  return {
    notices: active,
    unreadNotices: active.filter((notice) => !readMap[notice.id]),
    readMap,
  };
}

export async function markTeacherNoticeRead(userId: string, noticeId: string) {
  const normalizedNoticeId = noticeId.trim();
  if (!normalizedNoticeId) throw new Error("Missing notice id");

  await mutateJsonAppSetting<TeacherNoticeReadStore>({
    key: TEACHER_NOTICE_READS_KEY,
    fallback: { readsByUser: {} },
    sanitize: sanitizeTeacherNoticeReads,
    mutate: (store) => {
      const userReads = store.readsByUser[userId] ?? {};
      userReads[normalizedNoticeId] = new Date().toISOString();
      store.readsByUser[userId] = userReads;
    },
  });
}

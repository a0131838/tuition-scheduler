import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { logAudit } from "@/lib/audit-log";

const BIZ_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MONTHLY_SCHEDULING_CAMPAIGN_STATUSES = ["DRAFT", "OPEN", "CLOSED", "ARCHIVED"] as const;
export const MONTHLY_SCHEDULING_ITEM_STATUSES = [
  "NOT_SENT",
  "SENT",
  "VIEWED",
  "SUBMITTED",
  "OFFERED",
  "PARENT_SELECTED",
  "NEEDS_CLARIFICATION",
  "MATCHED",
  "TEACHER_EXCEPTION",
  "SCHEDULED",
  "PAUSED",
  "NO_RESPONSE",
  "CHANGE_REQUESTED",
  "EXCLUDED",
] as const;
export const MONTHLY_SCHEDULING_INTENTS = ["KEEP", "CHANGE", "PAUSE", "UNSURE"] as const;
export const MONTHLY_SCHEDULING_RESPONSE_CHANNELS = ["WECHAT_GROUP", "WECHAT_PRIVATE", "PHONE", "OTHER"] as const;
export const MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES = ["NOT_SENT", "SENT", "VIEWED", "SUBMITTED", "OFFERED", "NEEDS_CLARIFICATION", "NO_RESPONSE"] as const;

export type MonthlySchedulingCampaignStatus = (typeof MONTHLY_SCHEDULING_CAMPAIGN_STATUSES)[number];
export type MonthlySchedulingItemStatus = (typeof MONTHLY_SCHEDULING_ITEM_STATUSES)[number];
export type MonthlySchedulingIntent = (typeof MONTHLY_SCHEDULING_INTENTS)[number];
export type MonthlySchedulingResponseChannel = (typeof MONTHLY_SCHEDULING_RESPONSE_CHANNELS)[number];

export const responseChannelLabels: Record<MonthlySchedulingResponseChannel, { en: string; zh: string }> = {
  WECHAT_GROUP: { en: "WeChat group", zh: "微信群" },
  WECHAT_PRIVATE: { en: "WeChat private chat", zh: "微信私聊" },
  PHONE: { en: "Phone", zh: "电话" },
  OTHER: { en: "Other", zh: "其他" },
};

export type MonthlyAvailabilityPayload = {
  selectionMode: "weekly" | "calendar";
  weekdays: string[];
  timeRanges: Array<{ start: string; end: string }>;
  dateSelections: Array<{ date: string; start: string; end: string }>;
};

export const itemStatusLabels: Record<MonthlySchedulingItemStatus, { en: string; zh: string }> = {
  NOT_SENT: { en: "Not sent", zh: "待发送" },
  SENT: { en: "Sent", zh: "已发送" },
  VIEWED: { en: "Viewed", zh: "家长已查看" },
  SUBMITTED: { en: "Submitted", zh: "家长已提交" },
  OFFERED: { en: "Options ready", zh: "待家长选择具体时间" },
  PARENT_SELECTED: { en: "Parent selected", zh: "家长已选时间" },
  NEEDS_CLARIFICATION: { en: "Needs clarification", zh: "需要澄清" },
  MATCHED: { en: "Matched", zh: "已匹配" },
  TEACHER_EXCEPTION: { en: "Teacher exception", zh: "需要老师例外确认" },
  SCHEDULED: { en: "Scheduled", zh: "已完成排课" },
  PAUSED: { en: "Paused", zh: "下月暂停" },
  NO_RESPONSE: { en: "No response", zh: "未回复" },
  CHANGE_REQUESTED: { en: "Change requested", zh: "家长申请再次调整" },
  EXCLUDED: { en: "Excluded", zh: "已排除" },
};

export const intentLabels: Record<MonthlySchedulingIntent, { en: string; zh: string }> = {
  KEEP: { en: "Keep current arrangement", zh: "保持目前安排" },
  CHANGE: { en: "Request a change", zh: "希望修改时间" },
  PAUSE: { en: "Pause next month", zh: "下个月暂停" },
  UNSURE: { en: "Please contact me", zh: "尚未确定，请联系我" },
};

function monthParts(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const value = Number(match[2]);
  if (value < 1 || value > 12) return null;
  return { year, month: value };
}

export function monthlySchedulingRange(month: string) {
  const parsed = monthParts(month);
  if (!parsed) return null;
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1) - BIZ_OFFSET_MS);
  const end = new Date(Date.UTC(parsed.year, parsed.month, 1) - BIZ_OFFSET_MS);
  return { start, end };
}

export function monthlySchedulingMonthKey(date: Date) {
  const business = new Date(date.getTime() + BIZ_OFFSET_MS);
  return `${business.getUTCFullYear()}-${String(business.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextMonthlySchedulingMonth(now = new Date()) {
  const business = new Date(now.getTime() + BIZ_OFFSET_MS);
  const start = new Date(Date.UTC(business.getUTCFullYear(), business.getUTCMonth() + 1, 1) - BIZ_OFFSET_MS);
  return monthlySchedulingMonthKey(start);
}

export function defaultMonthlySchedulingDates(month: string) {
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month");
  return {
    month: range.start,
    teacherAvailabilityDueAt: new Date(range.start.getTime() - 12 * DAY_MS),
    opensAt: new Date(range.start.getTime() - 10 * DAY_MS),
    dueAt: new Date(range.start.getTime() - 3 * DAY_MS),
  };
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function unique<T>(rows: T[]) {
  return Array.from(new Set(rows));
}

export function monthlySchedulingRelevantCourseIds(input: {
  availableCourseIds: string[];
  targetMonthCourseIds: string[];
  recentCourseIds: string[];
  packageOwner: boolean;
  baseCourseId: string;
}) {
  const available = new Set(input.availableCourseIds);
  const target = unique(input.targetMonthCourseIds.filter((id) => available.has(id)));
  if (target.length) return target;
  const recent = unique(input.recentCourseIds.filter((id) => available.has(id)));
  if (recent.length) return recent;
  if (input.packageOwner && available.has(input.baseCourseId)) return [input.baseCourseId];
  return unique(input.availableCourseIds);
}

export function monthlySchedulingSessionStudentIds(session: any) {
  const enrolled = (session.class?.enrollments ?? []).map((row: any) => row.studentId as string);
  if (session.class?.capacity === 1) {
    const studentId = session.studentId ?? session.class?.oneOnOneStudentId ?? enrolled[0] ?? null;
    return studentId ? [studentId] : [];
  }
  return unique(enrolled.filter(Boolean));
}

function scheduleRow(session: any) {
  const teacher = session.teacher?.name ?? session.class?.teacher?.name ?? null;
  return {
    sessionId: session.id,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    startText: formatBusinessDateTime(session.startAt),
    endText: formatBusinessDateTime(session.endAt),
    durationMin: Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000)),
    teacher,
    campus: session.class?.campus?.name ?? null,
    mode: session.class?.campus?.isOnline ? "ONLINE" : "OFFLINE",
  };
}

export async function createMonthlySchedulingCampaign(input: {
  month: string;
  actor: { id: string; name: string };
}) {
  const dates = defaultMonthlySchedulingDates(input.month);
  return prisma.monthlySchedulingCampaign.upsert({
    where: { month: dates.month },
    create: {
      ...dates,
      createdByUserId: input.actor.id,
      createdByName: input.actor.name,
    },
    update: {},
  });
}

export async function syncMonthlySchedulingCampaignItems(campaignId: string) {
  const campaign = await prisma.monthlySchedulingCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const month = monthlySchedulingMonthKey(campaign.month);
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month");
  const historyStart = new Date(range.start.getTime() - 120 * DAY_MS);

  const [packages, sessions, existingRows] = await Promise.all([
    prisma.coursePackage.findMany({
      where: {
        status: "ACTIVE",
        validFrom: { lt: range.end },
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: range.start } }] },
          { OR: [{ type: "MONTHLY" }, { type: "HOURS", remainingMinutes: { gt: 0 } }] },
        ],
      },
      include: {
        student: {
          include: {
            parentLinks: { include: { parent: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          },
        },
        course: true,
        sharedCourses: { include: { course: true } },
        sharedStudents: {
          include: {
            student: {
              include: {
                parentLinks: { include: { parent: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.session.findMany({
      where: { startAt: { gte: historyStart, lt: range.end } },
      include: {
        teacher: { select: { name: true } },
        class: {
          include: {
            teacher: { select: { name: true } },
            campus: { select: { name: true, isOnline: true } },
            enrollments: { select: { studentId: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 10000,
    }),
    prisma.monthlySchedulingItem.findMany({
      where: { campaignId },
      select: { id: true, studentId: true, courseId: true, status: true },
    }),
  ]);
  const existingKeys = new Set(existingRows.map((row) => `${row.studentId}:${row.courseId}`));

  const schedules = new Map<string, ReturnType<typeof scheduleRow>[]>();
  const recentCoursesByStudent = new Map<string, Set<string>>();
  for (const session of sessions) {
    for (const studentId of monthlySchedulingSessionStudentIds(session)) {
      const recentCourses = recentCoursesByStudent.get(studentId) ?? new Set<string>();
      recentCourses.add(session.class.courseId);
      recentCoursesByStudent.set(studentId, recentCourses);
      if (session.startAt < range.start || session.startAt >= range.end) continue;
      const key = `${studentId}:${session.class.courseId}`;
      schedules.set(key, [...(schedules.get(key) ?? []), scheduleRow(session)]);
    }
  }

  const candidateKeys = new Set<string>();
  let created = 0;
  let refreshed = 0;

  for (const pkg of packages) {
    const courseRows = [pkg.course, ...pkg.sharedCourses.map((row) => row.course)];
    const courses = Array.from(new Map(courseRows.map((row) => [row.id, row])).values());
    const studentRows = [pkg.student, ...pkg.sharedStudents.map((row) => row.student)];
    const students = Array.from(new Map(studentRows.map((row) => [row.id, row])).values());

    for (const student of students) {
      const scheduledCourseIds = courses.filter((course) => schedules.has(`${student.id}:${course.id}`)).map((course) => course.id);
      const relevantCourseIds = monthlySchedulingRelevantCourseIds({
        availableCourseIds: courses.map((course) => course.id),
        targetMonthCourseIds: scheduledCourseIds,
        recentCourseIds: Array.from(recentCoursesByStudent.get(student.id) ?? []),
        packageOwner: student.id === pkg.studentId,
        baseCourseId: pkg.courseId,
      });
      const relevantCourses = courses.filter((course) => relevantCourseIds.includes(course.id));

      for (const course of relevantCourses) {
        const key = `${student.id}:${course.id}`;
        if (candidateKeys.has(key)) continue;
        candidateKeys.add(key);
        const parentId = student.parentLinks[0]?.parentId ?? null;
        await prisma.monthlySchedulingItem.upsert({
          where: { campaignId_studentId_courseId: { campaignId, studentId: student.id, courseId: course.id } },
          create: {
            campaignId,
            studentId: student.id,
            courseId: course.id,
            packageId: pkg.id,
            parentId,
            token: token(),
            currentScheduleJson: schedules.get(key) ?? [],
          },
          update: {
            packageId: pkg.id,
            parentId,
            currentScheduleJson: schedules.get(key) ?? [],
          },
        });
        if (existingKeys.has(key)) refreshed += 1;
        else created += 1;
      }
    }
  }

  const staleIds = existingRows
    .filter((row) => !candidateKeys.has(`${row.studentId}:${row.courseId}`) && ["NOT_SENT", "SENT", "VIEWED"].includes(row.status))
    .map((row) => row.id);
  if (staleIds.length) {
    await prisma.monthlySchedulingItem.updateMany({
      where: { id: { in: staleIds }, status: { in: ["NOT_SENT", "SENT", "VIEWED"] } },
      data: { status: "EXCLUDED" },
    });
  }

  return { created, refreshed, excluded: staleIds.length, candidates: candidateKeys.size };
}

export async function getMonthlySchedulingCampaign(month?: string | null) {
  const where = month && monthlySchedulingRange(month) ? { month: monthlySchedulingRange(month)!.start } : undefined;
  return prisma.monthlySchedulingCampaign.findFirst({
    where,
    orderBy: { month: "desc" },
    include: {
      items: {
        include: {
          student: { select: { id: true, name: true, grade: true } },
          course: { select: { id: true, name: true } },
          package: { select: { id: true, type: true, remainingMinutes: true, validTo: true } },
          parent: { select: { id: true, name: true, phone: true } },
          offers: {
            where: { status: { notIn: ["WITHDRAWN", "EXPIRED"] } },
            include: { teacher: { select: { name: true } } },
            orderBy: [{ parentRank: "asc" }, { generatedAt: "asc" }],
          },
        },
        orderBy: [{ status: "asc" }, { student: { name: "asc" } }],
      },
    },
  });
}

export async function setMonthlySchedulingCampaignStatus(campaignId: string, status: MonthlySchedulingCampaignStatus) {
  if (!MONTHLY_SCHEDULING_CAMPAIGN_STATUSES.includes(status)) throw new Error("Invalid campaign status");
  return prisma.monthlySchedulingCampaign.update({
    where: { id: campaignId },
    data: { status, opensAt: status === "OPEN" ? new Date() : undefined },
  });
}

export async function updateMonthlySchedulingItem(input: {
  itemId: string;
  status: MonthlySchedulingItemStatus;
  expectedStatus?: MonthlySchedulingItemStatus;
  ownerUserId?: string | null;
  ownerName?: string | null;
  internalNote?: string | null;
}) {
  if (!MONTHLY_SCHEDULING_ITEM_STATUSES.includes(input.status)) throw new Error("Invalid item status");
  if (input.expectedStatus && !MONTHLY_SCHEDULING_ITEM_STATUSES.includes(input.expectedStatus)) throw new Error("Invalid expected status");
  if (input.status === "MATCHED" && input.expectedStatus === "PARENT_SELECTED") {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const item = await tx.monthlySchedulingItem.findFirst({
        where: { id: input.itemId, status: "PARENT_SELECTED" },
        include: { offers: { where: { status: "HELD" }, orderBy: { parentRank: "asc" } } },
      });
      const offer = item?.offers[0];
      if (!item || !offer || !offer.holdExpiresAt || offer.holdExpiresAt <= now) {
        throw new Error("The parent time hold expired; ask the parent to select again");
      }
      await tx.monthlySchedulingOffer.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED", acceptedAt: now, holdExpiresAt: null },
      });
      await tx.monthlySchedulingOffer.updateMany({
        where: { itemId: item.id, id: { not: offer.id }, status: { in: ["AVAILABLE", "HELD"] } },
        data: { status: "WITHDRAWN", holdExpiresAt: null },
      });
      return tx.monthlySchedulingItem.update({
        where: { id: item.id },
        data: {
          status: "MATCHED",
          ownerUserId: input.ownerUserId,
          ownerName: input.ownerName,
          internalNote: input.internalNote,
          matchedAt: now,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  if (input.status === "SCHEDULED") {
    const item = await prisma.monthlySchedulingItem.findUnique({
      where: { id: input.itemId },
      include: { campaign: true },
    });
    if (!item) throw new Error("Scheduling item not found");
    const month = monthlySchedulingMonthKey(item.campaign.month);
    const range = monthlySchedulingRange(month);
    if (!range) throw new Error("Invalid campaign month");
    const sessions = await prisma.session.findMany({
      where: { startAt: { gte: range.start, lt: range.end }, class: { courseId: item.courseId } },
      include: { class: { include: { enrollments: { select: { studentId: true } } } } },
      take: 1000,
    });
    if (!sessions.some((session) => monthlySchedulingSessionStudentIds(session).includes(item.studentId))) {
      throw new Error("Create the formal lesson before marking this item as scheduled");
    }
  }
  const now = new Date();
  const transitioning = !input.expectedStatus || input.expectedStatus !== input.status;
  const updated = await prisma.monthlySchedulingItem.updateMany({
    where: { id: input.itemId, ...(input.expectedStatus ? { status: input.expectedStatus } : {}) },
    data: {
      status: input.status,
      ownerUserId: input.ownerUserId,
      ownerName: input.ownerName,
      internalNote: input.internalNote,
      sentAt: transitioning && input.status === "SENT" ? now : undefined,
      clarifiedAt: transitioning && input.status === "NEEDS_CLARIFICATION" ? now : undefined,
      matchedAt: transitioning && input.status === "MATCHED" ? now : undefined,
      scheduledAt: transitioning && input.status === "SCHEDULED" ? now : undefined,
      pausedAt: transitioning && input.status === "PAUSED" ? now : undefined,
    },
  });
  if (updated.count !== 1) throw new Error("This item changed in another session; refresh and try again");
  const row = await prisma.monthlySchedulingItem.findUnique({ where: { id: input.itemId } });
  if (!row) throw new Error("Scheduling item not found");
  if (input.status === "SCHEDULED") {
    await prisma.monthlySchedulingOffer.updateMany({
      where: { itemId: input.itemId, status: "ACCEPTED" },
      data: { status: "COMPLETED", holdExpiresAt: null },
    });
  }
  return row;
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max) || null;
}

function cleanStringList(value: unknown, pattern: RegExp, max = 20) {
  return Array.isArray(value)
    ? unique(value.map((item) => String(item).trim()).filter((item) => pattern.test(item))).slice(0, max)
    : [];
}

function validTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

function validDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

function boundedInteger(value: unknown, max: number, label: string) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number`);
  return Math.min(max, Math.max(0, Math.round(parsed)));
}

export function normalizeMonthlyAvailability(value: unknown): MonthlyAvailabilityPayload {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const selectionMode = body.selectionMode === "calendar" ? "calendar" : "weekly";
  const weekdays = cleanStringList(body.weekdays, /^(MON|TUE|WED|THU|FRI|SAT|SUN)$/);
  const timeRanges = Array.isArray(body.timeRanges)
    ? body.timeRanges
        .map((row) => ({ start: cleanText((row as any)?.start, 5) ?? "", end: cleanText((row as any)?.end, 5) ?? "" }))
        .filter((row) => validTime(row.start) && validTime(row.end) && row.end > row.start)
        .slice(0, 3)
    : [];
  const dateSelections = Array.isArray(body.dateSelections)
    ? body.dateSelections
        .map((row) => ({
          date: cleanText((row as any)?.date, 10) ?? "",
          start: cleanText((row as any)?.start, 5) ?? "",
          end: cleanText((row as any)?.end, 5) ?? "",
        }))
        .filter((row) => validDateKey(row.date) && validTime(row.start) && validTime(row.end) && row.end > row.start)
        .slice(0, 30)
    : [];
  return { selectionMode, weekdays, timeRanges, dateSelections };
}

type MonthlySchedulingPreferenceInput = {
  itemId: string;
  intent: MonthlySchedulingIntent;
  expectedSessionsPerWeek?: number | null;
  expectedMinutes?: number | null;
  preferredMode?: string | null;
  preferredCampus?: string | null;
  preferredTeacher?: string | null;
  availability?: unknown;
  unavailableDates?: unknown;
  parentNotes?: string | null;
};

type MonthlySchedulingProxyAuditInput = {
  actorUserId: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  responseChannel: MonthlySchedulingResponseChannel;
  parentConfirmationNote: string;
  parentConfirmedAt: string | Date;
};

function proxyAuditValues(input: MonthlySchedulingProxyAuditInput) {
  if (!MONTHLY_SCHEDULING_RESPONSE_CHANNELS.includes(input.responseChannel)) throw new Error("Invalid parent response channel");
  const note = cleanText(input.parentConfirmationNote, 1000);
  if (!note) throw new Error("Parent message or confirmation summary is required");
  const raw = input.parentConfirmedAt instanceof Date ? input.parentConfirmedAt.toISOString() : String(input.parentConfirmedAt ?? "").trim();
  const confirmedAt = validDateKey(raw) ? new Date(`${raw}T00:00:00+08:00`) : new Date(raw);
  if (Number.isNaN(confirmedAt.getTime())) throw new Error("Invalid parent confirmation date");
  if (confirmedAt.getTime() > Date.now() + 5 * 60 * 1000) throw new Error("Parent confirmation cannot be in the future");
  return { note, confirmedAt };
}

async function persistMonthlySchedulingPreference(
  item: { id: string; status: string; campaign: { month: Date } },
  input: MonthlySchedulingPreferenceInput,
  audit: {
    entryMode: "PARENT" | "STAFF_PROXY";
    responseChannel: string;
    respondedByParentId: string | null;
    respondedByUserId: string | null;
    respondedByName: string | null;
    parentConfirmationNote: string | null;
    parentConfirmedAt: Date;
  },
) {
  if (!MONTHLY_SCHEDULING_INTENTS.includes(input.intent)) throw new Error("Invalid intent");
  const expectedSessionsPerWeek = boundedInteger(input.expectedSessionsPerWeek, 14, "Sessions per week");
  const expectedMinutes = boundedInteger(input.expectedMinutes, 20000, "Expected minutes");
  const availability = normalizeMonthlyAvailability(input.availability);
  if (input.intent === "CHANGE" && availability.weekdays.length === 0 && availability.dateSelections.length === 0) {
    throw new Error("Please provide at least one available day or date");
  }
  const unavailableDates = cleanStringList(input.unavailableDates, /^\d{4}-\d{2}-\d{2}$/, 40).filter(validDateKey);
  const campaignMonth = monthlySchedulingMonthKey(item.campaign.month);
  if (unavailableDates.some((date) => !date.startsWith(`${campaignMonth}-`))) {
    throw new Error("Unavailable dates must be inside the target month");
  }
  const preferredMode = ["ONLINE", "OFFLINE"].includes(String(input.preferredMode ?? "")) ? String(input.preferredMode) : null;

  const now = new Date();
  const updated = await prisma.monthlySchedulingItem.updateMany({
    where: {
      id: item.id,
      status: item.status,
      campaign: { status: "OPEN" },
    },
    data: {
      status: input.intent === "PAUSE" ? "PAUSED" : "SUBMITTED",
      intent: input.intent,
      expectedSessionsPerWeek,
      expectedMinutes,
      preferredMode,
      preferredCampus: cleanText(input.preferredCampus, 120),
      preferredTeacher: cleanText(input.preferredTeacher, 120),
      availabilityJson: availability,
      unavailableDatesJson: unavailableDates,
      parentNotes: cleanText(input.parentNotes, 1000),
      responseEntryMode: audit.entryMode,
      responseChannel: audit.responseChannel,
      respondedByParentId: audit.respondedByParentId,
      respondedByUserId: audit.respondedByUserId,
      respondedByName: audit.respondedByName,
      parentConfirmationNote: audit.parentConfirmationNote,
      parentConfirmedAt: audit.parentConfirmedAt,
      offerSelectionEntryMode: null,
      offerSelectionChannel: null,
      offerSelectedByUserId: null,
      offerSelectedByName: null,
      offerSelectionNote: null,
      offerParentConfirmedAt: null,
      submittedAt: now,
      pausedAt: input.intent === "PAUSE" ? now : null,
    },
  });
  if (updated.count !== 1) throw new Error("The scheduling item changed; refresh before submitting again");
  if (input.intent === "CHANGE") await refreshMonthlySchedulingOffers(item.id);
  else {
    await prisma.monthlySchedulingOffer.updateMany({
      where: { itemId: item.id, status: { in: ["AVAILABLE", "HELD"] } },
      data: { status: "WITHDRAWN", holdExpiresAt: null, parentRank: null },
    });
  }
  const row = await prisma.monthlySchedulingItem.findUnique({ where: { id: item.id } });
  if (!row) throw new Error("Scheduling item is unavailable");
  return row;
}

export async function submitMonthlySchedulingPreference(input: MonthlySchedulingPreferenceInput & { parentId: string }) {
  const item = await prisma.monthlySchedulingItem.findFirst({
    where: {
      id: input.itemId,
      campaign: { status: "OPEN" },
      student: { parentLinks: { some: { parentId: input.parentId, canCreateRequests: true } } },
    },
    include: { campaign: true },
  });
  if (!item) throw new Error("Scheduling item is unavailable");
  if (["OFFERED", "PARENT_SELECTED", "MATCHED", "SCHEDULED", "CHANGE_REQUESTED"].includes(item.status)) {
    throw new Error("The school is processing the confirmed schedule; please contact the school for changes");
  }
  return persistMonthlySchedulingPreference(item, input, {
    entryMode: "PARENT",
    responseChannel: "MINIAPP",
    respondedByParentId: input.parentId,
    respondedByUserId: null,
    respondedByName: null,
    parentConfirmationNote: null,
    parentConfirmedAt: new Date(),
  });
}

export async function submitMonthlySchedulingPreferenceByStaff(
  input: MonthlySchedulingPreferenceInput & { expectedStatus: MonthlySchedulingItemStatus } & MonthlySchedulingProxyAuditInput,
) {
  if (!MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES.includes(input.expectedStatus as (typeof MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES)[number])) {
    throw new Error("This item is no longer open for proxy entry");
  }
  const item = await prisma.monthlySchedulingItem.findFirst({
    where: { id: input.itemId, status: input.expectedStatus, campaign: { status: "OPEN" } },
    include: { campaign: true },
  });
  if (!item) throw new Error("This item changed; refresh before entering the parent response");
  const audit = proxyAuditValues(input);
  const row = await persistMonthlySchedulingPreference(item, input, {
    entryMode: "STAFF_PROXY",
    responseChannel: input.responseChannel,
    respondedByParentId: null,
    respondedByUserId: input.actorUserId,
    respondedByName: cleanText(input.actorName, 120),
    parentConfirmationNote: audit.note,
    parentConfirmedAt: audit.confirmedAt,
  });
  await logAudit({
    actor: { email: input.actorEmail, name: input.actorName, role: input.actorRole },
    module: "MONTHLY_SCHEDULING",
    action: "PROXY_PARENT_PREFERENCE",
    entityType: "MonthlySchedulingItem",
    entityId: item.id,
    meta: {
      intent: input.intent,
      responseChannel: input.responseChannel,
      parentConfirmedAt: audit.confirmedAt.toISOString(),
      parentConfirmationNote: audit.note,
      resultingStatus: row.status,
    },
  });
  return row;
}

export async function listParentMonthlyScheduling(parentId: string, options: { markViewed?: boolean } = {}) {
  await expireMonthlySchedulingOfferHolds();
  const items = await prisma.monthlySchedulingItem.findMany({
    where: {
      campaign: { status: "OPEN" },
      status: { not: "EXCLUDED" },
      student: { parentLinks: { some: { parentId, canCreateRequests: true } } },
    },
    include: {
      campaign: true,
      student: { select: { id: true, name: true, grade: true } },
      course: { select: { id: true, name: true } },
      package: { select: { type: true, remainingMinutes: true, validTo: true } },
      offers: {
        where: { status: { notIn: ["WITHDRAWN", "EXPIRED"] } },
        include: { teacher: { select: { name: true } } },
        orderBy: [{ parentRank: "asc" as const }, { generatedAt: "asc" as const }],
      },
    },
    orderBy: [{ campaign: { month: "desc" } }, { student: { name: "asc" } }, { course: { name: "asc" } }],
  });
  const unseenIds = options.markViewed
    ? items.filter((row) => !row.viewedAt && ["NOT_SENT", "SENT"].includes(row.status)).map((row) => row.id)
    : [];
  if (unseenIds.length) {
    await prisma.monthlySchedulingItem.updateMany({
      where: { id: { in: unseenIds }, status: { in: ["NOT_SENT", "SENT"] } },
      data: { viewedAt: new Date(), status: "VIEWED" },
    });
  }
  return items.map((row) => ({ ...row, status: unseenIds.includes(row.id) ? "VIEWED" : row.status }));
}

type OfferSessionDate = { date: string; startAt: string; endAt: string };

function offerSessionDates(value: unknown): OfferSessionDate[] {
  return Array.isArray(value)
    ? value.filter((row): row is OfferSessionDate => Boolean(
        row && typeof row === "object" && validDateKey(String((row as any).date ?? ""))
        && !Number.isNaN(new Date(String((row as any).startAt ?? "")).getTime())
        && !Number.isNaN(new Date(String((row as any).endAt ?? "")).getTime())
      ))
    : [];
}

function monthlyOfferDuration(item: { currentScheduleJson: unknown; expectedMinutes: number | null; expectedSessionsPerWeek: number | null }) {
  const current = jsonRows(item.currentScheduleJson);
  const currentDuration = Number(current[0]?.durationMin ?? 0);
  if (currentDuration >= 15 && currentDuration <= 360) return ceilQuarter(currentDuration);
  if (item.expectedMinutes && item.expectedSessionsPerWeek) {
    const estimated = item.expectedMinutes / Math.max(1, item.expectedSessionsPerWeek * 4);
    return Math.min(180, Math.max(30, ceilQuarter(estimated)));
  }
  return 60;
}

export function monthlySchedulingOfferView(row: any) {
  const dates = offerSessionDates(row.sessionDatesJson).sort((a, b) => a.startAt.localeCompare(b.startAt));
  let suggestedWeeks = dates.length ? 1 : 0;
  while (suggestedWeeks < dates.length) {
    const previous = new Date(dates[suggestedWeeks - 1].startAt).getTime();
    const current = new Date(dates[suggestedWeeks].startAt).getTime();
    if (current - previous !== 7 * DAY_MS) break;
    suggestedWeeks += 1;
  }
  const weekdayLabels: Record<string, string> = { MON: "周一", TUE: "周二", WED: "周三", THU: "周四", FRI: "周五", SAT: "周六", SUN: "周日" };
  return {
    id: row.id,
    status: row.status,
    teacherId: row.teacherId,
    teacherName: row.teacher?.name ?? "-",
    weekdayCode: row.weekdayLabel,
    weekdayLabel: weekdayLabels[row.weekdayLabel] ?? row.weekdayLabel,
    start: `${String(Math.floor(row.startMin / 60)).padStart(2, "0")}:${String(row.startMin % 60).padStart(2, "0")}`,
    end: `${String(Math.floor(row.endMin / 60)).padStart(2, "0")}:${String(row.endMin % 60).padStart(2, "0")}`,
    durationMin: row.durationMin,
    sessionDates: dates,
    sessionCount: dates.length,
    suggestedWeeks,
    parentRank: row.parentRank,
    holdExpiresAt: row.holdExpiresAt?.toISOString?.() ?? null,
    holdExpiresText: row.holdExpiresAt ? formatBusinessDateTime(row.holdExpiresAt) : null,
  };
}

export async function refreshMonthlySchedulingOffers(itemId: string) {
  const item = await prisma.monthlySchedulingItem.findUnique({
    where: { id: itemId },
    include: { campaign: true },
  });
  if (!item || item.intent !== "CHANGE") return [];
  if (["PARENT_SELECTED", "MATCHED", "SCHEDULED"].includes(item.status)) return [];
  const month = monthlySchedulingMonthKey(item.campaign.month);
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month");
  const parent = normalizeMonthlyAvailability(item.availabilityJson);
  const unavailableDates = new Set(cleanStringList(item.unavailableDatesJson, /^\d{4}-\d{2}-\d{2}$/, 40));
  const durationMin = monthlyOfferDuration(item);
  const [teachers, sessions, appointments] = await Promise.all([
    prisma.teacher.findMany({
      include: {
        dateAvailabilities: { where: { date: { gte: range.start, lt: range.end } } },
        courseRates: { select: { courseId: true } },
        classes: { select: { courseId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: range.start, lt: range.end } },
      select: {
        startAt: true,
        endAt: true,
        teacherId: true,
        studentId: true,
        class: {
          select: {
            teacherId: true,
            capacity: true,
            oneOnOneStudentId: true,
            enrollments: { select: { studentId: true } },
          },
        },
      },
      take: 10000,
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: range.start, lt: range.end } },
      select: { startAt: true, endAt: true, teacherId: true },
      take: 5000,
    }),
  ]);
  const busyByTeacher = new Map<string, Array<{ startAt: Date; endAt: Date }>>();
  for (const row of sessions) {
    const teacherId = row.teacherId ?? row.class.teacherId;
    busyByTeacher.set(teacherId, [...(busyByTeacher.get(teacherId) ?? []), row]);
  }
  for (const row of appointments) busyByTeacher.set(row.teacherId, [...(busyByTeacher.get(row.teacherId) ?? []), row]);
  const busyForStudent = sessions.filter((row) => monthlySchedulingSessionStudentIds(row).includes(item.studentId));

  const candidates: Array<{
    teacherId: string;
    weekdayLabel: string;
    startMin: number;
    endMin: number;
    dates: OfferSessionDate[];
  }> = [];
  for (const teacher of teachers) {
    const canTeach = new Set([...teacher.courseRates.map((row) => row.courseId), ...teacher.classes.map((row) => row.courseId)]).has(item.courseId);
    if (!canTeach) continue;
    const groups = new Map<string, { weekdayLabel: string; startMin: number; endMin: number; dates: OfferSessionDate[] }>();
    for (const interval of intervalsForTeacher({ month, dates: teacher.dateAvailabilities })) {
      if (unavailableDates.has(interval.date)) continue;
      const weekdayLabel = monthlySchedulingWeekdayCode(interval.date);
      const ranges = parent.selectionMode === "calendar"
        ? parent.dateSelections.filter((row) => row.date === interval.date).map((row) => ({ start: row.start, end: row.end }))
        : parent.weekdays.includes(weekdayLabel) ? parent.timeRanges : [];
      for (const rangeRow of ranges) {
        const [startHour, startMinute] = rangeRow.start.split(":").map(Number);
        const [endHour, endMinute] = rangeRow.end.split(":").map(Number);
        const startMin = ceilQuarter(Math.max(interval.startMin, startHour * 60 + startMinute));
        const endMin = startMin + durationMin;
        if (endMin > Math.min(interval.endMin, endHour * 60 + endMinute)) continue;
        const startAt = dateMinute(interval.date, startMin);
        const endAt = dateMinute(interval.date, endMin);
        if ((busyByTeacher.get(teacher.id) ?? []).some((row) => startAt < row.endAt && row.startAt < endAt)) continue;
        if (busyForStudent.some((row) => startAt < row.endAt && row.startAt < endAt)) continue;
        const key = `${weekdayLabel}:${startMin}:${endMin}`;
        const group = groups.get(key) ?? { weekdayLabel, startMin, endMin, dates: [] };
        if (!group.dates.some((row) => row.date === interval.date)) {
          group.dates.push({ date: interval.date, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
        }
        groups.set(key, group);
        break;
      }
    }
    for (const group of Array.from(groups.values()).sort((a, b) => b.dates.length - a.dates.length || a.startMin - b.startMin).slice(0, 3)) {
      candidates.push({ teacherId: teacher.id, ...group });
    }
  }
  candidates.sort((a, b) => b.dates.length - a.dates.length || a.dates[0]?.startAt.localeCompare(b.dates[0]?.startAt ?? "") || 0);
  const selected = candidates.slice(0, 5);
  await prisma.$transaction(async (tx) => {
    await tx.monthlySchedulingOffer.deleteMany({
      where: { itemId, status: { in: ["AVAILABLE", "EXPIRED", "WITHDRAWN"] } },
    });
    for (const candidate of selected) {
      await tx.monthlySchedulingOffer.create({
        data: {
          itemId,
          teacherId: candidate.teacherId,
          weekdayLabel: candidate.weekdayLabel,
          startMin: candidate.startMin,
          endMin: candidate.endMin,
          durationMin,
          sessionDatesJson: candidate.dates,
        },
      });
    }
    await tx.monthlySchedulingItem.updateMany({
      where: { id: itemId, status: "SUBMITTED" },
      data: { status: selected.length ? "OFFERED" : "SUBMITTED" },
    });
  });
  return listMonthlySchedulingOffers(itemId);
}

export async function listMonthlySchedulingOffers(itemId: string) {
  const rows = await prisma.monthlySchedulingOffer.findMany({
    where: { itemId, status: { notIn: ["WITHDRAWN", "EXPIRED"] } },
    include: { teacher: { select: { name: true } } },
    orderBy: [{ parentRank: "asc" }, { generatedAt: "asc" }],
  });
  return rows.map(monthlySchedulingOfferView);
}

export function monthlySchedulingOffersConflict(left: OfferSessionDate[], right: OfferSessionDate[]) {
  return left.some((a) => right.some((b) => new Date(a.startAt) < new Date(b.endAt) && new Date(b.startAt) < new Date(a.endAt)));
}

async function rankMonthlySchedulingOffersCore(input: {
  itemId: string;
  offerIds: string[];
  parentId?: string;
  entryMode: "PARENT" | "STAFF_PROXY";
  responseChannel: string;
  selectedByUserId: string | null;
  selectedByName: string | null;
  selectionNote: string | null;
  parentConfirmedAt: Date;
}) {
  const offerIds = unique(input.offerIds.map((id) => String(id).trim()).filter(Boolean)).slice(0, 3);
  if (!offerIds.length) throw new Error("Please rank at least one available time");
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const item = await tx.monthlySchedulingItem.findFirst({
      where: {
        id: input.itemId,
        status: { in: ["OFFERED", "PARENT_SELECTED"] },
        campaign: { status: "OPEN" },
        ...(input.parentId ? { student: { parentLinks: { some: { parentId: input.parentId, canCreateRequests: true } } } } : {}),
      },
      include: { offers: { include: { teacher: { select: { name: true } } } } },
    });
    if (!item) throw new Error("This scheduling choice is no longer available");
    const ranked = offerIds.map((id) => item.offers.find((row) => row.id === id && ["AVAILABLE", "HELD"].includes(row.status))).filter(Boolean) as typeof item.offers;
    if (ranked.length !== offerIds.length) throw new Error("One or more time choices are invalid");
    const teacherIds = unique(ranked.map((row) => row.teacherId));
    const active = await tx.monthlySchedulingOffer.findMany({
      where: {
        itemId: { not: item.id },
        AND: [
          { OR: [{ status: "ACCEPTED" }, { status: "HELD", holdExpiresAt: { gt: now } }] },
          { OR: [{ teacherId: { in: teacherIds } }, { item: { studentId: item.studentId } }] },
        ],
      },
      include: { item: { select: { studentId: true } } },
    });
    const chosen = ranked.find((candidate) => !active.some((held) =>
      (held.teacherId === candidate.teacherId || held.item.studentId === item.studentId)
      && monthlySchedulingOffersConflict(offerSessionDates(candidate.sessionDatesJson), offerSessionDates(held.sessionDatesJson))
    ));
    if (!chosen) throw new Error("The selected times were just taken; refresh for new choices");
    await tx.monthlySchedulingOffer.updateMany({ where: { itemId: item.id, status: "HELD" }, data: { status: "AVAILABLE", holdExpiresAt: null, heldByParentId: null } });
    await tx.monthlySchedulingOffer.updateMany({ where: { itemId: item.id }, data: { parentRank: null } });
    for (let index = 0; index < ranked.length; index += 1) {
      await tx.monthlySchedulingOffer.update({ where: { id: ranked[index].id }, data: { parentRank: index + 1 } });
    }
    const held = await tx.monthlySchedulingOffer.update({
      where: { id: chosen.id },
      data: { status: "HELD", heldByParentId: input.parentId ?? item.parentId, holdExpiresAt },
      include: { teacher: { select: { name: true } } },
    });
    await tx.monthlySchedulingItem.update({
      where: { id: item.id },
      data: {
        status: "PARENT_SELECTED",
        submittedAt: now,
        offerSelectionEntryMode: input.entryMode,
        offerSelectionChannel: input.responseChannel,
        offerSelectedByUserId: input.selectedByUserId,
        offerSelectedByName: input.selectedByName,
        offerSelectionNote: input.selectionNote,
        offerParentConfirmedAt: input.parentConfirmedAt,
      },
    });
    return monthlySchedulingOfferView(held);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rankMonthlySchedulingOffers(input: { itemId: string; parentId: string; offerIds: string[] }) {
  return rankMonthlySchedulingOffersCore({
    ...input,
    entryMode: "PARENT",
    responseChannel: "MINIAPP",
    selectedByUserId: null,
    selectedByName: null,
    selectionNote: null,
    parentConfirmedAt: new Date(),
  });
}

export async function rankMonthlySchedulingOffersByStaff(input: {
  itemId: string;
  offerIds: string[];
} & MonthlySchedulingProxyAuditInput) {
  const audit = proxyAuditValues(input);
  const selected = await rankMonthlySchedulingOffersCore({
    itemId: input.itemId,
    offerIds: input.offerIds,
    entryMode: "STAFF_PROXY",
    responseChannel: input.responseChannel,
    selectedByUserId: input.actorUserId,
    selectedByName: cleanText(input.actorName, 120),
    selectionNote: audit.note,
    parentConfirmedAt: audit.confirmedAt,
  });
  await logAudit({
    actor: { email: input.actorEmail, name: input.actorName, role: input.actorRole },
    module: "MONTHLY_SCHEDULING",
    action: "PROXY_PARENT_OFFER_RANKING",
    entityType: "MonthlySchedulingItem",
    entityId: input.itemId,
    meta: {
      offerIds: input.offerIds.slice(0, 3),
      selectedOfferId: selected.id,
      responseChannel: input.responseChannel,
      parentConfirmedAt: audit.confirmedAt.toISOString(),
      parentConfirmationNote: audit.note,
    },
  });
  return selected;
}

export async function requestMonthlySchedulingChange(input: { itemId: string; parentId: string; note: string }) {
  const note = cleanText(input.note, 1000);
  if (!note) throw new Error("Please explain what needs to change");
  const item = await prisma.monthlySchedulingItem.findFirst({
    where: {
      id: input.itemId,
      status: { in: ["MATCHED", "SCHEDULED"] },
      student: { parentLinks: { some: { parentId: input.parentId, canCreateRequests: true } } },
    },
  });
  if (!item) throw new Error("This arrangement cannot be changed here");
  const updated = await prisma.monthlySchedulingItem.updateMany({
    where: { id: item.id, status: item.status },
    data: { status: "CHANGE_REQUESTED", parentNotes: note, submittedAt: new Date() },
  });
  if (updated.count !== 1) throw new Error("This arrangement changed; refresh and try again");
  return prisma.monthlySchedulingItem.findUniqueOrThrow({ where: { id: item.id } });
}

export async function expireMonthlySchedulingOfferHolds(now = new Date()) {
  const expired = await prisma.monthlySchedulingOffer.findMany({
    where: { status: "HELD", holdExpiresAt: { lte: now } },
    select: { id: true, itemId: true },
    take: 500,
  });
  if (!expired.length) return 0;
  const itemIds = unique(expired.map((row) => row.itemId));
  await prisma.$transaction([
    prisma.monthlySchedulingOffer.updateMany({ where: { id: { in: expired.map((row) => row.id) }, status: "HELD" }, data: { status: "EXPIRED", holdExpiresAt: null } }),
    prisma.monthlySchedulingItem.updateMany({ where: { id: { in: itemIds }, status: "PARENT_SELECTED" }, data: { status: "OFFERED" } }),
  ]);
  return expired.length;
}

function intervalsForTeacher(input: {
  month: string;
  dates: Array<{ date: Date; startMin: number; endMin: number }>;
}) {
  const range = monthlySchedulingRange(input.month);
  if (!range) return [] as Array<{ date: string; startMin: number; endMin: number }>;
  const rows: Array<{ date: string; startMin: number; endMin: number }> = [];
  for (const slot of input.dates) rows.push({ date: formatBusinessDateOnly(slot.date), startMin: slot.startMin, endMin: slot.endMin });
  const grouped = new Map<string, Array<{ startMin: number; endMin: number }>>();
  for (const row of rows) grouped.set(row.date, [...(grouped.get(row.date) ?? []), row]);
  return Array.from(grouped.entries()).flatMap(([date, values]) => {
    const sorted = values.sort((a, b) => a.startMin - b.startMin);
    const merged: Array<{ date: string; startMin: number; endMin: number }> = [];
    for (const value of sorted) {
      const last = merged[merged.length - 1];
      if (last && value.startMin <= last.endMin) last.endMin = Math.max(last.endMin, value.endMin);
      else merged.push({ date, startMin: value.startMin, endMin: value.endMin });
    }
    return merged;
  });
}

function jsonRows(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function businessMinuteOfDay(date: Date) {
  const shifted = new Date(date.getTime() + BIZ_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function monthlySchedulingBusyOverlapMinutes(
  intervals: Array<{ date: string; startMin: number; endMin: number }>,
  busy: Array<{ date: string; startMin: number; endMin: number }>,
) {
  const busyByDate = new Map<string, Array<{ startMin: number; endMin: number }>>();
  for (const row of busy) busyByDate.set(row.date, [...(busyByDate.get(row.date) ?? []), row]);
  let total = 0;
  for (const interval of intervals) {
    const sorted = [...(busyByDate.get(interval.date) ?? [])].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const merged: Array<{ startMin: number; endMin: number }> = [];
    for (const row of sorted) {
      const last = merged[merged.length - 1];
      if (last && row.startMin <= last.endMin) last.endMin = Math.max(last.endMin, row.endMin);
      else merged.push({ startMin: row.startMin, endMin: row.endMin });
    }
    for (const row of merged) total += Math.max(0, Math.min(interval.endMin, row.endMin) - Math.max(interval.startMin, row.startMin));
  }
  return total;
}

export function allocateMonthlyCourseCapacity(
  rows: Array<{ courseId: string; unscheduledMinutes: number; qualifiedTeacherIds: string[] }>,
  capacityByTeacher: Map<string, number>,
) {
  const remaining = new Map(Array.from(capacityByTeacher.entries(), ([teacherId, minutes]) => [teacherId, Math.max(0, minutes)]));
  const allocations = new Map<string, number>();
  const sortedRows = [...rows].sort((a, b) =>
    a.qualifiedTeacherIds.length - b.qualifiedTeacherIds.length
    || b.unscheduledMinutes - a.unscheduledMinutes
    || a.courseId.localeCompare(b.courseId));

  for (const row of sortedRows) {
    let needed = Math.max(0, row.unscheduledMinutes);
    let allocated = 0;
    const teacherIds = [...new Set(row.qualifiedTeacherIds)].sort((a, b) =>
      (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0) || a.localeCompare(b));
    for (const teacherId of teacherIds) {
      if (needed <= 0) break;
      const available = remaining.get(teacherId) ?? 0;
      const assigned = Math.min(needed, available);
      allocated += assigned;
      needed -= assigned;
      remaining.set(teacherId, available - assigned);
    }
    allocations.set(row.courseId, allocated);
  }

  return allocations;
}

export async function buildMonthlyStaffingReport(campaignId: string) {
  const campaign = await prisma.monthlySchedulingCampaign.findUnique({
    where: { id: campaignId },
    include: { items: { include: { course: true, student: true } } },
  });
  if (!campaign) throw new Error("Campaign not found");
  const month = monthlySchedulingMonthKey(campaign.month);
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month");

  const [teachers, sessions, appointments] = await Promise.all([
    prisma.teacher.findMany({
      include: {
        dateAvailabilities: { where: { date: { gte: range.start, lt: range.end } } },
        courseRates: { select: { courseId: true } },
        classes: { select: { courseId: true } },
      },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: range.start, lt: range.end } },
      include: { class: { include: { enrollments: { select: { studentId: true } } } } },
      take: 10000,
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: range.start, lt: range.end } },
      select: { teacherId: true, startAt: true, endAt: true },
      take: 5000,
    }),
  ]);

  const capacityByTeacher = new Map<string, number>();
  const availabilityByTeacher = new Map<string, Array<{ date: string; startMin: number; endMin: number }>>();
  for (const teacher of teachers) {
    const intervals = intervalsForTeacher({ month, dates: teacher.dateAvailabilities });
    availabilityByTeacher.set(teacher.id, intervals);
    capacityByTeacher.set(teacher.id, intervals.reduce((sum, row) => sum + Math.max(0, row.endMin - row.startMin), 0));
  }
  const busyByTeacher = new Map<string, Array<{ date: string; startMin: number; endMin: number }>>();
  for (const session of sessions) {
    const teacherId = session.teacherId ?? session.class.teacherId;
    busyByTeacher.set(teacherId, [...(busyByTeacher.get(teacherId) ?? []), {
      date: formatBusinessDateOnly(session.startAt),
      startMin: businessMinuteOfDay(session.startAt),
      endMin: businessMinuteOfDay(session.endAt),
    }]);
  }
  for (const appointment of appointments) {
    busyByTeacher.set(appointment.teacherId, [...(busyByTeacher.get(appointment.teacherId) ?? []), {
      date: formatBusinessDateOnly(appointment.startAt),
      startMin: businessMinuteOfDay(appointment.startAt),
      endMin: businessMinuteOfDay(appointment.endAt),
    }]);
  }
  for (const teacher of teachers) {
    const occupied = monthlySchedulingBusyOverlapMinutes(availabilityByTeacher.get(teacher.id) ?? [], busyByTeacher.get(teacher.id) ?? []);
    capacityByTeacher.set(teacher.id, Math.max(0, (capacityByTeacher.get(teacher.id) ?? 0) - occupied));
  }

  const courseIdsByTeacher = new Map<string, Set<string>>();
  for (const teacher of teachers) {
    courseIdsByTeacher.set(teacher.id, new Set([...teacher.courseRates.map((row) => row.courseId), ...teacher.classes.map((row) => row.courseId)]));
  }
  const scheduledMinutes = new Map<string, number>();
  for (const session of sessions) {
    const duration = Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000));
    for (const studentId of monthlySchedulingSessionStudentIds(session)) {
      const key = `${studentId}:${session.class.courseId}`;
      scheduledMinutes.set(key, (scheduledMinutes.get(key) ?? 0) + duration);
    }
  }

  const activeStatuses = new Set(["SUBMITTED", "NEEDS_CLARIFICATION", "MATCHED", "TEACHER_EXCEPTION", "SCHEDULED"]);
  const courseMap = new Map<string, { courseId: string; courseName: string; students: Set<string>; demandMinutes: number; scheduledMinutes: number; pendingCount: number }>();
  const timeBandMap = new Map<string, { label: string; itemCount: number; demandMinutes: number }>();
  for (const item of campaign.items) {
    if (!activeStatuses.has(item.status) || item.intent === "PAUSE") continue;
    const key = `${item.studentId}:${item.courseId}`;
    const alreadyScheduled = scheduledMinutes.get(key) ?? 0;
    const currentRows = jsonRows(item.currentScheduleJson) as Array<{ durationMin?: number }>;
    const baseline = currentRows.reduce((sum, row) => sum + Math.max(0, Number(row.durationMin ?? 0)), 0);
    const demand = item.expectedMinutes ?? (((item.expectedSessionsPerWeek ?? 0) * 60 * 4) || baseline || 240);
    const row = courseMap.get(item.courseId) ?? { courseId: item.courseId, courseName: item.course.name, students: new Set<string>(), demandMinutes: 0, scheduledMinutes: 0, pendingCount: 0 };
    row.students.add(item.studentId);
    row.demandMinutes += demand;
    row.scheduledMinutes += alreadyScheduled;
    if (item.status !== "SCHEDULED") row.pendingCount += 1;
    courseMap.set(item.courseId, row);

    const availability = normalizeMonthlyAvailability(item.availabilityJson);
    if (availability.selectionMode === "weekly") {
      for (const weekday of availability.weekdays) {
        for (const time of availability.timeRanges) {
          const bandKey = `${weekday}:${time.start}-${time.end}`;
          const band = timeBandMap.get(bandKey) ?? { label: `${weekday} ${time.start}-${time.end}`, itemCount: 0, demandMinutes: 0 };
          band.itemCount += 1;
          band.demandMinutes += demand;
          timeBandMap.set(bandKey, band);
        }
      }
    }
  }

  const courseCapacityInputs = Array.from(courseMap.values()).map((row) => ({
    courseId: row.courseId,
    unscheduledMinutes: Math.max(0, row.demandMinutes - row.scheduledMinutes),
    qualifiedTeacherIds: teachers.filter((teacher) => courseIdsByTeacher.get(teacher.id)?.has(row.courseId)).map((teacher) => teacher.id),
  }));
  const allocatedCapacity = allocateMonthlyCourseCapacity(courseCapacityInputs, capacityByTeacher);
  const capacityInputByCourse = new Map(courseCapacityInputs.map((row) => [row.courseId, row]));

  const courses = Array.from(courseMap.values()).map((row) => {
    const capacityInput = capacityInputByCourse.get(row.courseId)!;
    const qualifiedTeacherIds = capacityInput.qualifiedTeacherIds;
    const availableMinutes = allocatedCapacity.get(row.courseId) ?? 0;
    const unscheduledMinutes = capacityInput.unscheduledMinutes;
    const gapMinutes = Math.max(0, unscheduledMinutes - availableMinutes);
    const utilization = availableMinutes > 0 ? unscheduledMinutes / availableMinutes : unscheduledMinutes > 0 ? 999 : 0;
    return {
      courseId: row.courseId,
      courseName: row.courseName,
      studentCount: row.students.size,
      demandMinutes: row.demandMinutes,
      scheduledMinutes: row.scheduledMinutes,
      unscheduledMinutes,
      availableMinutes,
      gapMinutes,
      qualifiedTeacherCount: qualifiedTeacherIds.length,
      pendingCount: row.pendingCount,
      tone: gapMinutes > 0 || qualifiedTeacherIds.length === 0 ? "RED" : utilization >= 0.8 ? "AMBER" : "GREEN",
    };
  }).sort((a, b) => b.gapMinutes - a.gapMinutes || b.unscheduledMinutes - a.unscheduledMinutes);

  return {
    month,
    courses,
    timeBands: Array.from(timeBandMap.values()).sort((a, b) => b.itemCount - a.itemCount).slice(0, 30),
    summary: {
      demandMinutes: courses.reduce((sum, row) => sum + row.demandMinutes, 0),
      scheduledMinutes: courses.reduce((sum, row) => sum + row.scheduledMinutes, 0),
      gapMinutes: courses.reduce((sum, row) => sum + row.gapMinutes, 0),
      redCourses: courses.filter((row) => row.tone === "RED").length,
    },
  };
}

export function monthlySchedulingWeekdayCode(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][parsed.getUTCDay()] ?? "";
}

function dateMinute(date: string, minute: number) {
  return new Date(new Date(`${date}T00:00:00+08:00`).getTime() + minute * 60000);
}

function ceilQuarter(value: number) {
  return Math.ceil(value / 15) * 15;
}

export async function buildMonthlyMatchSuggestions(campaignId: string) {
  const campaign = await prisma.monthlySchedulingCampaign.findUnique({
    where: { id: campaignId },
    include: { items: { include: { student: true, course: true } } },
  });
  if (!campaign) throw new Error("Campaign not found");
  const month = monthlySchedulingMonthKey(campaign.month);
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month");
  const [teachers, sessions, appointments] = await Promise.all([
    prisma.teacher.findMany({
      include: {
        dateAvailabilities: { where: { date: { gte: range.start, lt: range.end } } },
        courseRates: { select: { courseId: true } },
        classes: { select: { courseId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: range.start, lt: range.end } },
      select: { startAt: true, endAt: true, teacherId: true, class: { select: { teacherId: true } } },
      take: 10000,
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: range.start, lt: range.end } },
      select: { startAt: true, endAt: true, teacherId: true },
      take: 5000,
    }),
  ]);
  const busyByTeacher = new Map<string, Array<{ startAt: Date; endAt: Date }>>();
  for (const row of sessions) {
    const teacherId = row.teacherId ?? row.class.teacherId;
    busyByTeacher.set(teacherId, [...(busyByTeacher.get(teacherId) ?? []), row]);
  }
  for (const row of appointments) busyByTeacher.set(row.teacherId, [...(busyByTeacher.get(row.teacherId) ?? []), row]);

  const suggestions = new Map<string, Array<{ teacherId: string; teacherName: string; date: string; start: string; end: string; startAt: string; endAt: string }>>();
  for (const item of campaign.items) {
    if (!["SUBMITTED", "OFFERED", "PARENT_SELECTED", "NEEDS_CLARIFICATION", "MATCHED", "TEACHER_EXCEPTION", "CHANGE_REQUESTED"].includes(item.status) || item.intent !== "CHANGE") {
      suggestions.set(item.id, []);
      continue;
    }
    const parent = normalizeMonthlyAvailability(item.availabilityJson);
    const unavailableDates = new Set(cleanStringList(item.unavailableDatesJson, /^\d{4}-\d{2}-\d{2}$/, 40));
    const options: Array<{ teacherId: string; teacherName: string; date: string; start: string; end: string; startAt: string; endAt: string }> = [];
    const qualified = teachers.filter((teacher) => new Set([...teacher.courseRates.map((row) => row.courseId), ...teacher.classes.map((row) => row.courseId)]).has(item.courseId));
    for (const teacher of qualified) {
      const intervals = intervalsForTeacher({ month, dates: teacher.dateAvailabilities });
      for (const interval of intervals) {
        if (unavailableDates.has(interval.date)) continue;
        const parentRanges = parent.selectionMode === "calendar"
          ? parent.dateSelections.filter((row) => row.date === interval.date).map((row) => ({ start: row.start, end: row.end }))
          : parent.weekdays.includes(monthlySchedulingWeekdayCode(interval.date)) ? parent.timeRanges : [];
        for (const parentRange of parentRanges) {
          const [parentStartHour, parentStartMinute] = parentRange.start.split(":").map(Number);
          const [parentEndHour, parentEndMinute] = parentRange.end.split(":").map(Number);
          const parentStart = parentStartHour * 60 + parentStartMinute;
          const parentEnd = parentEndHour * 60 + parentEndMinute;
          const startMin = ceilQuarter(Math.max(interval.startMin, parentStart));
          const endMin = startMin + 60;
          if (endMin > Math.min(interval.endMin, parentEnd)) continue;
          const startAt = dateMinute(interval.date, startMin);
          const endAt = dateMinute(interval.date, endMin);
          const busy = (busyByTeacher.get(teacher.id) ?? []).some((row) => startAt < row.endAt && row.startAt < endAt);
          if (busy) continue;
          options.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            date: interval.date,
            start: `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`,
            end: `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          });
          if (options.length >= 5) break;
        }
        if (options.length >= 5) break;
      }
      if (options.length >= 5) break;
    }
    suggestions.set(item.id, options.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.teacherName.localeCompare(b.teacherName)).slice(0, 5));
  }
  return suggestions;
}

export function monthlySchedulingParentMessage(input: {
  parentName?: string | null;
  month: string;
  students: Array<{ studentName: string; courseName: string }>;
  dueAt?: Date | null;
}) {
  const names = unique(input.students.map((row) => row.studentName)).join("、");
  const lines = input.students.map((row) => `${row.studentName}：${row.courseName}`).join("；");
  const due = input.dueAt ? formatBusinessDateOnly(input.dueAt) : "-";
  return `${input.parentName || "家长"}您好，为提前安排${input.month}的课程和老师，请确认${names}下月的上课安排。\n${lines}\n请于${due}前在博思学业管家小程序完成“下月排课确认”。老师偏好将尽量协调，但以最终确认课表为准。\n\nDear Parent, to arrange classes and teaching resources for ${input.month}, please complete the Next-month Scheduling Confirmation in the Boss Academic Parent Mini Program by ${due}. Teacher preferences will be considered but are subject to the final confirmed timetable.`;
}

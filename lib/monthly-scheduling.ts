import {monthlyStaffingLessonFacts,confirmedMonthlyDemand,monthlyBusyDateIntervals} from "./monthly-staffing-facts";
import { assertMonthlyStaffStatusChange } from "./monthly-scheduling-status-policy";
import { resolveAttendanceRoster } from "./session-attendance-roster";
import { completionSessionInclude, verifyMonthlySchedule, monthlyCompletionReviews } from "./monthly-scheduling-completion";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { renderPublishedCommunicationTemplate } from "@/lib/parent-communication-templates";
import { LEGACY_XDF_SOURCE_CHANNEL_NAME } from "@/lib/partners";

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
export const MONTHLY_SCHEDULING_TEACHER_PREFERENCE_TYPES = ["NONE", "CURRENT", "PREFERRED", "VERIFY"] as const;
export const MONTHLY_SCHEDULING_TIME_PRIORITIES = ["REQUIRED", "PREFERRED", "ACCEPTABLE"] as const;
export const MONTHLY_SCHEDULING_PROXY_EDITABLE_STATUSES = ["NOT_SENT", "SENT", "VIEWED", "SUBMITTED", "OFFERED", "NEEDS_CLARIFICATION", "NO_RESPONSE"] as const;
export const MONTHLY_SCHEDULING_COHORTS = ["BOSS_OTHER", "XDF"] as const;
const MONTHLY_SCHEDULING_FAMILY_KEEP_STATUSES = ["NOT_SENT", "SENT", "VIEWED", "SUBMITTED", "NEEDS_CLARIFICATION", "NO_RESPONSE"] as const;

export type MonthlySchedulingCampaignStatus = (typeof MONTHLY_SCHEDULING_CAMPAIGN_STATUSES)[number];
export type MonthlySchedulingItemStatus = (typeof MONTHLY_SCHEDULING_ITEM_STATUSES)[number];
export type MonthlySchedulingIntent = (typeof MONTHLY_SCHEDULING_INTENTS)[number];
export type MonthlySchedulingResponseChannel = (typeof MONTHLY_SCHEDULING_RESPONSE_CHANNELS)[number];
export type MonthlySchedulingTeacherPreferenceType = (typeof MONTHLY_SCHEDULING_TEACHER_PREFERENCE_TYPES)[number];
export type MonthlySchedulingTimePriority = (typeof MONTHLY_SCHEDULING_TIME_PRIORITIES)[number];
export type MonthlySchedulingCohort = (typeof MONTHLY_SCHEDULING_COHORTS)[number];

export function monthlySchedulingCohortForSourceName(sourceName: string | null | undefined): MonthlySchedulingCohort {
  return sourceName?.trim() === LEGACY_XDF_SOURCE_CHANNEL_NAME ? "XDF" : "BOSS_OTHER";
}

export const responseChannelLabels: Record<MonthlySchedulingResponseChannel, { en: string; zh: string }> = {
  WECHAT_GROUP: { en: "WeChat group", zh: "微信群" },
  WECHAT_PRIVATE: { en: "WeChat private chat", zh: "微信私聊" },
  PHONE: { en: "Phone", zh: "电话" },
  OTHER: { en: "Other", zh: "其他" },
};

export type MonthlyAvailabilityPayload = {
  selectionMode: "weekly" | "calendar";
  weekdays: string[];
  timeRanges: Array<{ start: string; end: string; priority: MonthlySchedulingTimePriority }>;
  dateSelections: Array<{ date: string; start: string; end: string; priority: MonthlySchedulingTimePriority }>;
};

export const timePriorityLabels: Record<MonthlySchedulingTimePriority, { en: string; zh: string }> = {
  REQUIRED: { en: "Must fit", zh: "必须满足" },
  PREFERRED: { en: "Preferred", zh: "优先选择" },
  ACCEPTABLE: { en: "Acceptable", zh: "可以接受" },
};

export const itemStatusLabels: Record<MonthlySchedulingItemStatus, { en: string; zh: string }> = {
  NOT_SENT: { en: "Not sent", zh: "待发送" },
  SENT: { en: "Send recorded", zh: "已记录发送" },
  VIEWED: { en: "Viewed", zh: "家长已查看" },
  SUBMITTED: { en: "Submitted", zh: "家长已提交" },
  OFFERED: { en: "Options ready", zh: "待家长选择具体时间" },
  PARENT_SELECTED: { en: "Parent selected", zh: "家长已选时间" },
  NEEDS_CLARIFICATION: { en: "Needs clarification", zh: "需要澄清" },
  MATCHED: { en: "Arrangement confirmed; lessons to verify", zh: "安排已确认，待核验课表" },
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
  return resolveAttendanceRoster(session).students.map(row => row.id);
}

function scheduleRow(session: any) {
  const effectiveTeacher = session.teacher ?? session.class?.teacher ?? null;
  return {
    sessionId: session.id,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    startText: formatBusinessDateTime(session.startAt),
    endText: formatBusinessDateTime(session.endAt),
    durationMin: Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000)),
    teacher: effectiveTeacher?.name ?? null,
    teacherId: effectiveTeacher?.id ?? null,
    campus: session.class?.campus?.name ?? null,
    mode: session.class?.campus?.isOnline ? "ONLINE" : "OFFLINE",
  };
}

export type MonthlyCarryForwardScheduleRow = {
  weekdayCode: string;
  weekdayLabel: string;
  start: string;
  end: string;
  durationMin: number;
  teacher: string | null;
  teacherId: string | null;
  campus: string | null;
  mode: string;
  sourceCount: number;
  sourceDates: string[];
};

const weekdayZh: Record<string, string> = { MON: "周一", TUE: "周二", WED: "周三", THU: "周四", FRI: "周五", SAT: "周六", SUN: "周日" };

export function buildMonthlyCarryForwardSchedule(rows: ReturnType<typeof scheduleRow>[]) {
  const grouped = new Map<string, MonthlyCarryForwardScheduleRow>();
  for (const row of rows) {
    const startAt = new Date(row.startAt);
    const endAt = new Date(row.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) continue;
    const weekdayCode = monthlySchedulingWeekdayCode(formatBusinessDateOnly(startAt));
    const startMin = businessMinuteOfDay(startAt);
    const endMin = businessMinuteOfDay(endAt);
    const start = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const key = [weekdayCode, start, end, row.teacherId ?? "", row.campus ?? "", row.mode].join(":");
    const existing: MonthlyCarryForwardScheduleRow = grouped.get(key) ?? {
      weekdayCode,
      weekdayLabel: weekdayZh[weekdayCode] ?? weekdayCode,
      start,
      end,
      durationMin: row.durationMin,
      teacher: row.teacher,
      teacherId: row.teacherId,
      campus: row.campus,
      mode: row.mode,
      sourceCount: 0,
      sourceDates: [],
    };
    existing.sourceCount += 1;
    existing.sourceDates.push(formatBusinessDateOnly(startAt));
    grouped.set(key, existing);
  }
  return Array.from(grouped.values())
    .sort((a, b) => b.sourceCount - a.sourceCount || a.weekdayCode.localeCompare(b.weekdayCode) || a.start.localeCompare(b.start))
    .slice(0, 6);
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
  const previousMonthRange = monthlySchedulingRange(monthlySchedulingMonthKey(new Date(range.start.getTime() - DAY_MS)));

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
        teacher: { select: { id: true, name: true } },
        class: {
          include: {
            teacher: { select: { id: true, name: true } },
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
  const previousSchedules = new Map<string, ReturnType<typeof scheduleRow>[]>();
  const recentCoursesByStudent = new Map<string, Set<string>>();
  for (const session of sessions) {
    for (const studentId of monthlySchedulingSessionStudentIds(session)) {
      const recentCourses = recentCoursesByStudent.get(studentId) ?? new Set<string>();
      recentCourses.add(session.class.courseId);
      recentCoursesByStudent.set(studentId, recentCourses);
      if (previousMonthRange && session.startAt >= previousMonthRange.start && session.startAt < range.start) {
        const previousKey = `${studentId}:${session.class.courseId}`;
        previousSchedules.set(previousKey, [...(previousSchedules.get(previousKey) ?? []), scheduleRow(session)]);
      }
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
            carryForwardScheduleJson: buildMonthlyCarryForwardSchedule(previousSchedules.get(key) ?? []),
          },
          update: {
            packageId: pkg.id,
            parentId,
            currentScheduleJson: schedules.get(key) ?? [],
            carryForwardScheduleJson: buildMonthlyCarryForwardSchedule(previousSchedules.get(key) ?? []),
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

export async function syncNextMonthlySchedulingAutomation(now = new Date()) {
  const month = nextMonthlySchedulingMonth(now);
  const campaign = await createMonthlySchedulingCampaign({
    month,
    actor: { id: "SYSTEM_MONTHLY_SCHEDULING", name: "System / 系统" },
  });
  const roster = await syncMonthlySchedulingCampaignItems(campaign.id);
  let status = campaign.status;
  if (campaign.status === "DRAFT" && campaign.opensAt && now >= campaign.opensAt) {
    await prisma.monthlySchedulingCampaign.update({ where: { id: campaign.id }, data: { status: "OPEN" } });
    status = "OPEN";
  }
  let noResponse = 0;
  if (status === "OPEN" && campaign.dueAt && now > campaign.dueAt) {
    const result = await prisma.monthlySchedulingItem.updateMany({
      where: { campaignId: campaign.id, status: { in: ["NOT_SENT", "SENT", "VIEWED"] } },
      data: { status: "NO_RESPONSE" },
    });
    noResponse = result.count;
  }
  return { campaignId: campaign.id, month, status, roster, noResponse };
}

export async function getMonthlySchedulingCampaign(month?: string | null) {
  const where = month && monthlySchedulingRange(month) ? { month: monthlySchedulingRange(month)!.start } : undefined;
  const campaign = await prisma.monthlySchedulingCampaign.findFirst({
    where,
    orderBy: { month: "desc" },
    include: {
      items: {
        include: {
          student: { select: { id: true, name: true, grade: true, sourceChannel: { select: { name: true } } } },
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
  if (!campaign) return null;
  const reviews=await monthlyCompletionReviews(campaign.items,campaign.month);
  return {...campaign,items:campaign.items.map(item=>({...item,completionNeedsReview:reviews.get(item.id)?.needsReview??false}))};
}

export async function listMonthlySchedulingQualifiedTeachers(courseIds: string[]) {
  const ids = unique(courseIds.filter(Boolean));
  if (!ids.length) return new Map<string, Array<{ id: string; name: string }>>();
  const teachers = await prisma.teacher.findMany({
    where: { OR: [{ courseRates: { some: { courseId: { in: ids } } } }, { classes: { some: { courseId: { in: ids } } } }] },
    select: { id: true, name: true, courseRates: { where: { courseId: { in: ids } }, select: { courseId: true } }, classes: { where: { courseId: { in: ids } }, select: { courseId: true } } },
    orderBy: { name: "asc" },
  });
  const result = new Map<string, Array<{ id: string; name: string }>>();
  for (const courseId of ids) result.set(courseId, []);
  for (const teacher of teachers) {
    for (const courseId of unique([...teacher.courseRates.map((row) => row.courseId), ...teacher.classes.map((row) => row.courseId)])) {
      result.set(courseId, [...(result.get(courseId) ?? []), { id: teacher.id, name: teacher.name }]);
    }
  }
  return result;
}

export async function setMonthlySchedulingCampaignStatus(campaignId: string, status: MonthlySchedulingCampaignStatus) {
  if (!MONTHLY_SCHEDULING_CAMPAIGN_STATUSES.includes(status)) throw new Error("Invalid campaign status");
  return prisma.monthlySchedulingCampaign.update({
    where: { id: campaignId },
    data: { status, opensAt: status === "OPEN" ? new Date() : undefined },
  });
}

export async function updateMonthlySchedulingItem(input: {
  itemId: string; status: MonthlySchedulingItemStatus; expectedStatus?: MonthlySchedulingItemStatus;
  expectedUpdatedAt?: string; ownerUserId?: string | null; ownerName?: string | null; internalNote?: string | null;
  sessionIds?: string[]; expectedSessionCount?: number; completionReason?: string;
}) {
  if (!MONTHLY_SCHEDULING_ITEM_STATUSES.includes(input.status) || !input.expectedStatus || !MONTHLY_SCHEDULING_ITEM_STATUSES.includes(input.expectedStatus))
    throw new Error("Refresh and select a valid status / 请刷新后选择有效状态");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "MonthlySchedulingItem" WHERE "id" = ${input.itemId} FOR UPDATE`;
    const item = await tx.monthlySchedulingItem.findUnique({where:{id:input.itemId},include:{campaign:true,offers:true}});
    if (!item || item.status !== input.expectedStatus || (input.expectedUpdatedAt && item.updatedAt.toISOString() !== input.expectedUpdatedAt))
      throw new Error("This item changed; refresh and try again / 记录已变化，请刷新重试");
    const actor = input.ownerUserId ? await tx.user.findUnique({where:{id:input.ownerUserId}}) : null;
    if (!actor) throw new Error("Authenticated staff required / 需要已登录员工身份");
    if (["PAUSED","EXCLUDED"].includes(input.status) && (input.internalNote?.trim().length ?? 0) < 5)
      throw new Error("Record the pause or exclusion reason / 请填写暂停或排除原因（至少5字）");
    assertMonthlyStaffStatusChange(item,input.status,input.internalNote);
    const now = new Date();
    if (input.status === "MATCHED" && item.status === "PARENT_SELECTED") {
      const offer = item.offers.filter(o=>o.status==='HELD').sort((a,b)=>(a.parentRank??999)-(b.parentRank??999))[0];
      if (!offer || !offer.holdExpiresAt || offer.holdExpiresAt <= now) throw new Error("The parent time hold expired; ask the parent to select again / 家长选时已过期，请重新选择");
      await tx.monthlySchedulingOffer.update({where:{id:offer.id},data:{status:"ACCEPTED",acceptedAt:now,holdExpiresAt:null}});
      await tx.monthlySchedulingOffer.updateMany({where:{itemId:item.id,id:{not:offer.id},status:{in:["AVAILABLE","HELD"]}},data:{status:"WITHDRAWN",holdExpiresAt:null}});
    }
    let evidence: Prisma.InputJsonValue | undefined;
    const verifyCompletion=input.status === "SCHEDULED" && (item.status !== "SCHEDULED" || !!input.sessionIds?.length);
    if (verifyCompletion) {
      if (!input.expectedUpdatedAt || !["MATCHED","SCHEDULED"].includes(item.status))
        throw new Error("Confirm the arrangement, then verify formal lessons in the web workspace / 请先确认安排，再到网页工作台核验正式课次");
      const ids=input.sessionIds??[];
      if (!ids.length || ids.length>100) throw new Error("Select formal lessons in the web workspace / 请到网页工作台选择正式课次核验");
      await tx.$queryRaw`SELECT "id" FROM "Session" WHERE "id" IN (${Prisma.join([...new Set(ids)].sort())}) ORDER BY "id" FOR UPDATE`;
      const sessions=await tx.session.findMany({where:{id:{in:ids}},include:completionSessionInclude});
      evidence=verifyMonthlySchedule({studentId:item.studentId,courseId:item.courseId,month:item.campaign.month,sessions,ids,
        expectedSessionCount:input.expectedSessionCount??0,reason:input.completionReason??'',actorName:actor.name??actor.email,
        expectedMinutes:item.expectedMinutes,offers:item.offers.filter(o=>['ACCEPTED','COMPLETED'].includes(o.status))});
      await tx.monthlySchedulingOffer.updateMany({where:{itemId:item.id,status:"ACCEPTED"},data:{status:"COMPLETED",holdExpiresAt:null}});
    }
    const transitioning=item.status!==input.status;
    const row=await tx.monthlySchedulingItem.update({where:{id:item.id},data:{status:input.status,
      ownerUserId:item.ownerUserId??actor.id,ownerName:item.ownerName??actor.name,
      internalNote:input.internalNote, scheduleEvidenceJson:evidence,
      sentAt:transitioning&&input.status==='SENT'?now:undefined,
      clarifiedAt:transitioning&&input.status==='NEEDS_CLARIFICATION'?now:undefined,
      matchedAt:transitioning&&input.status==='MATCHED'?now:undefined,
      scheduledAt:verifyCompletion?now:undefined,
      pausedAt:transitioning&&input.status==='PAUSED'?now:undefined}});
    await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'MONTHLY_SCHEDULING',
      action:'ITEM_STATUS_VERIFIED',entityType:'MonthlySchedulingItem',entityId:item.id,
      meta:{before:{status:item.status,ownerUserId:item.ownerUserId,internalNote:item.internalNote,scheduleEvidenceJson:item.scheduleEvidenceJson},
        after:{status:row.status,ownerUserId:row.ownerUserId,internalNote:row.internalNote,scheduleEvidenceJson:row.scheduleEvidenceJson}}}});
    return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
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
        .map((row, index) => ({
          start: cleanText((row as any)?.start, 5) ?? "",
          end: cleanText((row as any)?.end, 5) ?? "",
          priority: MONTHLY_SCHEDULING_TIME_PRIORITIES.includes((row as any)?.priority)
            ? (row as any).priority as MonthlySchedulingTimePriority
            : MONTHLY_SCHEDULING_TIME_PRIORITIES[Math.min(index, MONTHLY_SCHEDULING_TIME_PRIORITIES.length - 1)],
        }))
        .filter((row) => validTime(row.start) && validTime(row.end) && row.end > row.start)
        .slice(0, 3)
    : [];
  const dateSelections = Array.isArray(body.dateSelections)
    ? body.dateSelections
        .map((row) => ({
          date: cleanText((row as any)?.date, 10) ?? "",
          start: cleanText((row as any)?.start, 5) ?? "",
          end: cleanText((row as any)?.end, 5) ?? "",
          priority: MONTHLY_SCHEDULING_TIME_PRIORITIES.includes((row as any)?.priority)
            ? (row as any).priority as MonthlySchedulingTimePriority
            : "PREFERRED",
        }))
        .filter((row) => validDateKey(row.date) && validTime(row.start) && validTime(row.end) && row.end > row.start)
        .slice(0, 30)
    : [];
  return { selectionMode, weekdays, timeRanges, dateSelections };
}

type MonthlySchedulingPreferenceInput = {
  itemId: string;
  expectedUpdatedAt?: string;
  intent: MonthlySchedulingIntent;
  expectedSessionsPerWeek?: number | null;
  expectedMinutes?: number | null;
  preferredMode?: string | null;
  preferredCampus?: string | null;
  preferredTeacher?: string | null;
  preferredTeacherId?: string | null;
  teacherPreferenceType?: MonthlySchedulingTeacherPreferenceType | null;
  teacherPreferenceNote?: string | null;
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
  item: { id: string; studentId: string; updatedAt: Date; status: string; courseId: string; currentScheduleJson: unknown; carryForwardScheduleJson: unknown; campaign: { month: Date } },
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
  if(input.expectedUpdatedAt && input.expectedUpdatedAt!==item.updatedAt.toISOString())throw new Error("Response changed; refresh first / 回复已变化，请先刷新");
  if(input.intent==='PAUSE' && (input.parentNotes?.trim()||audit.parentConfirmationNote?.trim()||'').length<5)
    throw new Error("Please record why next month is paused / 请填写下月暂停的原因（至少5字）");
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
  const legacyTeacher = cleanText(input.preferredTeacher, 120);
  const preferenceType = MONTHLY_SCHEDULING_TEACHER_PREFERENCE_TYPES.includes(input.teacherPreferenceType as MonthlySchedulingTeacherPreferenceType)
    ? input.teacherPreferenceType as MonthlySchedulingTeacherPreferenceType
    : input.preferredTeacherId ? "PREFERRED" : legacyTeacher ? "VERIFY" : "NONE";
  const preferenceNote = preferenceType === "VERIFY" ? cleanText(input.teacherPreferenceNote ?? legacyTeacher, 300) : null;
  let preferredTeacherId = cleanText(input.preferredTeacherId, 80);
  let preferredTeacher: string | null = null;
  if (preferenceType === "CURRENT") {
    const currentRows = jsonRows(item.currentScheduleJson);
    const teacherSource = currentRows.length ? currentRows : jsonRows(item.carryForwardScheduleJson);
    const currentTeachers = unique(teacherSource.map((row: any) => String(row.teacherId ?? "")).filter(Boolean));
    if (currentTeachers.length !== 1) throw new Error("当前课表没有唯一老师，请选择具体老师或标记待核对");
    preferredTeacherId = currentTeachers[0];
  }
  if (preferenceType === "PREFERRED" && !preferredTeacherId) throw new Error("请选择合格老师");
  if (preferenceType === "VERIFY" && !preferenceNote) throw new Error("请记录家长提到的老师姓名，交由教务核对");
  if (["CURRENT", "PREFERRED"].includes(preferenceType)) {
    const options = await listMonthlySchedulingQualifiedTeachers([item.courseId]);
    const selected = (options.get(item.courseId) ?? []).find((teacher) => teacher.id === preferredTeacherId);
    if (!selected) throw new Error("所选老师不在该课程的合格老师名单中，请刷新后重选");
    preferredTeacher = selected.name;
  } else {
    preferredTeacherId = null;
    preferredTeacher = preferenceType === "VERIFY" ? preferenceNote : null;
  }

  const now = new Date();
  return prisma.$transaction(async tx=>{
    const before=await tx.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}});
    const updated=await tx.monthlySchedulingItem.updateMany({where:{
      id:item.id,status:item.status,updatedAt:item.updatedAt,campaign:{status:"OPEN"},
      ...(audit.respondedByParentId?{student:{parentLinks:{some:{parentId:audit.respondedByParentId,canCreateRequests:true}}}}:{}),
    },
    data: {
      status: input.intent === "PAUSE" ? "PAUSED" : "SUBMITTED",
      intent: input.intent,
      expectedSessionsPerWeek,
      expectedMinutes,
      preferredMode,
      preferredCampus: cleanText(input.preferredCampus, 120),
      preferredTeacher,
      preferredTeacherId,
      teacherPreferenceType: preferenceType,
      teacherPreferenceNote: preferenceNote,
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
    if(updated.count!==1)throw new Error("The scheduling item or access changed; refresh before submitting again / 排课需求或权限已变化，请刷新后重试");
    const previousOffers=await tx.monthlySchedulingOffer.findMany({where:{itemId:item.id,status:{in:["AVAILABLE","HELD","ACCEPTED","COMPLETED"]}},select:{id:true,status:true}});
    // Previous arrangements remain as records; this does not cancel their formal lessons.
    await tx.monthlySchedulingOffer.updateMany({where:{id:{in:previousOffers.map(row=>row.id)}},data:{status:"WITHDRAWN",holdExpiresAt:null}});
    if(input.intent==='CHANGE')await refreshMonthlySchedulingOffers(item.id,tx);
    const row=await tx.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}});
    const snapshot=(value:typeof row)=>({status:value.status,intent:value.intent,expectedMinutes:value.expectedMinutes,expectedSessionsPerWeek:value.expectedSessionsPerWeek,
      preferredTeacherId:value.preferredTeacherId,availabilityJson:value.availabilityJson,unavailableDatesJson:value.unavailableDatesJson,parentNotes:value.parentNotes,
      responseEntryMode:value.responseEntryMode,responseChannel:value.responseChannel,parentConfirmationNote:value.parentConfirmationNote,parentConfirmedAt:value.parentConfirmedAt?.toISOString()??null});
    const meta={before:snapshot(before),after:snapshot(row),retainedOffers:previousOffers};
    if(audit.respondedByParentId)await tx.parentPortalAudit.create({data:{parentId:audit.respondedByParentId,studentId:item.studentId,action:'MONTHLY_PREFERENCE',targetType:'MonthlySchedulingItem',targetId:item.id,metaJson:meta}});
    else {
      const actor=await tx.user.findUniqueOrThrow({where:{id:audit.respondedByUserId??''}});
      await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'MONTHLY_SCHEDULING',action:'PROXY_PARENT_PREFERENCE',entityType:'MonthlySchedulingItem',entityId:item.id,meta}});
    }
    return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});

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
  if (item.status === "EXCLUDED") throw new Error("This item is excluded; contact the school / 此项已排除，请联系学校核对");
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
  return row;
}

type MonthlyFamilyKeepRow = {
  id: string;
  status: string;
  studentId?: string;
  parentId?: string | null;
  currentScheduleJson: unknown;
  carryForwardScheduleJson: unknown;
  expectedSessionsPerWeek: number | null;
};

export function monthlySchedulingFamilyCanKeep(rows: MonthlyFamilyKeepRow[]) {
  const editable = rows.filter((row) => MONTHLY_SCHEDULING_FAMILY_KEEP_STATUSES.includes(row.status as (typeof MONTHLY_SCHEDULING_FAMILY_KEEP_STATUSES)[number]));
  return editable.length > 0 && editable.every((row) => jsonRows(row.currentScheduleJson).length > 0 || jsonRows(row.carryForwardScheduleJson).length > 0);
}

function carryForwardFrequency(row: MonthlyFamilyKeepRow) {
  if (row.expectedSessionsPerWeek != null) return row.expectedSessionsPerWeek;
  const source = jsonRows(row.currentScheduleJson).length ? jsonRows(row.currentScheduleJson) : jsonRows(row.carryForwardScheduleJson);
  return Math.max(1, unique(source.map((entry: any) => `${entry.weekdayCode ?? ""}:${entry.start ?? entry.startText ?? ""}`).filter(Boolean)).length);
}

async function persistMonthlySchedulingFamilyKeep(input: {
  campaignId: string;
  parentId?: string;
  linkedParentId?: string;
  seedItemId?: string;
  entryMode: "PARENT" | "STAFF_PROXY";
  responseChannel: string;
  respondedByParentId: string | null;
  respondedByUserId: string | null;
  respondedByName: string | null;
  parentConfirmationNote: string | null;
  parentConfirmedAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
  const seed = input.seedItemId ? await tx.monthlySchedulingItem.findFirst({ where: { id: input.seedItemId, campaignId: input.campaignId } }) : null;
  const parentId = input.parentId ?? seed?.parentId ?? null;
  const studentId = parentId ? null : seed?.studentId ?? null;
  if (!input.linkedParentId && !parentId && !studentId) throw new Error("Family scheduling record is unavailable");
  const rows = await tx.monthlySchedulingItem.findMany({
    where: {
      campaignId: input.campaignId,
      campaign: { status: "OPEN" },
      status: { in: [...MONTHLY_SCHEDULING_FAMILY_KEEP_STATUSES] },
      ...(input.linkedParentId
        ? { student: { parentLinks: { some: { parentId: input.linkedParentId, canCreateRequests: true } } } }
        : parentId ? { parentId } : { studentId: studentId! }),
    },
    select: { id: true, updatedAt: true, status: true, intent: true, studentId: true, parentId: true,
      currentScheduleJson: true, carryForwardScheduleJson: true, expectedSessionsPerWeek: true,
      familyDecisionBatchId: true, responseEntryMode: true, responseChannel: true, respondedByParentId: true,
      respondedByUserId: true, parentConfirmationNote: true, parentConfirmedAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (!monthlySchedulingFamilyCanKeep(rows)) throw new Error("这个家庭有课程没有可沿用的固定安排，请逐项确认");
  const existingBatch = rows[0].familyDecisionBatchId;
  const sameReply = existingBatch && rows.every(row => row.status === 'SUBMITTED' && row.intent === 'KEEP'
    && row.familyDecisionBatchId === existingBatch && row.responseEntryMode === input.entryMode
    && row.responseChannel === input.responseChannel && row.respondedByParentId === input.respondedByParentId
    && row.respondedByUserId === input.respondedByUserId && row.parentConfirmationNote === input.parentConfirmationNote
    && (input.entryMode === 'PARENT' || row.parentConfirmedAt?.getTime() === input.parentConfirmedAt.getTime()));
  if (sameReply) return {batchId: existingBatch, itemIds: rows.map(row=>row.id), count: rows.length};
  const batchId = crypto.randomUUID();
  const now = new Date();
    for (const row of rows) {
      const updated = await tx.monthlySchedulingItem.updateMany({
        where: { id: row.id, status: row.status, updatedAt: row.updatedAt, campaign: { status: "OPEN" },
          ...(input.linkedParentId ? { student: { parentLinks: { some: { parentId: input.linkedParentId, canCreateRequests: true } } } } : {}),
        },
        data: {
          status: "SUBMITTED",
          intent: "KEEP",
          expectedSessionsPerWeek: carryForwardFrequency(row),
          familyDecisionBatchId: batchId,
          responseEntryMode: input.entryMode,
          responseChannel: input.responseChannel,
          respondedByParentId: input.respondedByParentId,
          respondedByUserId: input.respondedByUserId,
          respondedByName: input.respondedByName,
          parentConfirmationNote: input.parentConfirmationNote,
          parentConfirmedAt: input.parentConfirmedAt,
          submittedAt: now,
          pausedAt: null,
          offerSelectionEntryMode: null,
          offerSelectionChannel: null,
          offerSelectedByUserId: null,
          offerSelectedByName: null,
          offerSelectionNote: null,
          offerParentConfirmedAt: null,
        },
      });
      if (updated.count !== 1) throw new Error("家庭安排已被其他同事更新，请刷新后重试");
    }
    await tx.monthlySchedulingOffer.updateMany({
      where: { itemId: { in: rows.map((row) => row.id) }, status: { in: ["AVAILABLE", "HELD"] } },
      data: { status: "WITHDRAWN", holdExpiresAt: null },
    });
  const familyTaskKeys = unique(rows.map((row) => `monthly-scheduling:${input.campaignId}:${row.parentId ?? `STUDENT:${row.studentId}`}`));
  const waivedTaskIds: string[] = [];
  for (const taskKey of familyTaskKeys) {
    const family = rows.find(row => taskKey === `monthly-scheduling:${input.campaignId}:${row.parentId ?? `STUDENT:${row.studentId}`}`)!;
    // A partial household reply must not close another child's initial reminder.
    const remaining = await tx.monthlySchedulingItem.count({where: {
      campaignId: input.campaignId,
      ...(family.parentId ? {parentId: family.parentId} : {studentId: family.studentId}),
      status: {in: ['NOT_SENT','SENT','VIEWED','NO_RESPONSE','NEEDS_CLARIFICATION','OFFERED']},
    }});
    if (remaining) continue;
    const tasks = await tx.parentCommunicationTask.findMany({where: {
      taskKey, manualSentAt: null, status: {in: ['PENDING_REVIEW','READY_TO_SEND','CLAIMED','RETURNED','ATTENTION']},
    }, select: {id: true}});
    await tx.parentCommunicationTask.updateMany({where: {id: {in: tasks.map(task=>task.id)}}, data: {
      status: 'WAIVED', note: 'Family confirmed current arrangements; initial reminder waived / 家庭已确认沿用安排，免除初始提醒', completedAt: now,
    }});
    waivedTaskIds.push(...tasks.map(task=>task.id));
  }
  const meta = {itemIds: rows.map(row=>row.id), responseChannel: input.responseChannel,
    parentConfirmationNote: input.parentConfirmationNote, parentConfirmedAt: input.parentConfirmedAt.toISOString(),
    before: rows.map(row=>({id:row.id,status:row.status,intent:row.intent,revision:row.updatedAt.toISOString(),
      expectedSessionsPerWeek:row.expectedSessionsPerWeek,responseChannel:row.responseChannel,parentConfirmationNote:row.parentConfirmationNote,
      parentConfirmedAt:row.parentConfirmedAt?.toISOString()??null})), waivedTaskIds};
  if (input.respondedByParentId) {
    for (const row of rows) await tx.parentPortalAudit.create({data: {
      parentId: input.respondedByParentId, studentId: row.studentId, action: 'MONTHLY_FAMILY_KEEP',
      targetType: 'MonthlySchedulingItem', targetId: row.id, metaJson: {...meta,batchId},
    }});
  } else {
    const actor = await tx.user.findUniqueOrThrow({where: {id: input.respondedByUserId ?? ''}});
    await tx.auditLog.create({data: {actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,
      module:'MONTHLY_SCHEDULING',action:'PROXY_FAMILY_KEEP_CURRENT',entityType:'MonthlySchedulingFamily',entityId:batchId,meta}});
  }
  return { batchId, itemIds: rows.map((row) => row.id), count: rows.length };
  }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
}

export async function submitMonthlySchedulingFamilyKeep(input: { campaignId: string; parentId: string }) {
  return persistMonthlySchedulingFamilyKeep({
    campaignId: input.campaignId,
    linkedParentId: input.parentId,
    entryMode: "PARENT",
    responseChannel: "MINIAPP",
    respondedByParentId: input.parentId,
    respondedByUserId: null,
    respondedByName: null,
    parentConfirmationNote: null,
    parentConfirmedAt: new Date(),
  });
}

export async function submitMonthlySchedulingFamilyKeepByStaff(input: {
  campaignId: string;
  seedItemId: string;
} & MonthlySchedulingProxyAuditInput) {
  const audit = proxyAuditValues(input);
  const result = await persistMonthlySchedulingFamilyKeep({
    campaignId: input.campaignId,
    seedItemId: input.seedItemId,
    entryMode: "STAFF_PROXY",
    responseChannel: input.responseChannel,
    respondedByParentId: null,
    respondedByUserId: input.actorUserId,
    respondedByName: cleanText(input.actorName, 120),
    parentConfirmationNote: audit.note,
    parentConfirmedAt: audit.confirmedAt,
  });
  return result;
}

export type MonthlySchedulingQueueLane = "READY_CONFIRM" | "WAITING_PARENT" | "EXCEPTIONS" | "COMPLETED" | "OTHER";

export function monthlySchedulingQueueLane(row: { status: string; intent?: string | null; teacherPreferenceType?: string | null; completionNeedsReview?: boolean }): MonthlySchedulingQueueLane {
  if (row.status === "SCHEDULED" && row.completionNeedsReview) return "EXCEPTIONS";
  if (["SCHEDULED", "PAUSED", "EXCLUDED"].includes(row.status)) return "COMPLETED";
  if (row.status === "MATCHED") return "READY_CONFIRM";
  if (row.status === "SUBMITTED" && (row.intent === "UNSURE" || row.teacherPreferenceType === "VERIFY")) return "EXCEPTIONS";
  if (row.status === "PARENT_SELECTED" || (row.status === "SUBMITTED" && row.intent === "KEEP")) return "READY_CONFIRM";
  if (["NOT_SENT", "SENT", "VIEWED", "OFFERED"].includes(row.status)) return "WAITING_PARENT";
  if (["NO_RESPONSE", "NEEDS_CLARIFICATION", "TEACHER_EXCEPTION", "CHANGE_REQUESTED"].includes(row.status)) return "EXCEPTIONS";
  if (row.status === "SUBMITTED" || row.intent === "UNSURE" || row.teacherPreferenceType === "VERIFY") return "EXCEPTIONS";
  return "OTHER";
}

export function monthlySchedulingExceptionReason(row: { status: string; intent?: string | null; teacherPreferenceType?: string | null }) {
  if (row.status === "NO_RESPONSE") return "家长逾期未回复";
  if (row.teacherPreferenceType === "VERIFY") return "老师姓名需要核对";
  if (row.intent === "UNSURE") return "家长尚未确定，需要联系";
  if (row.status === "SUBMITTED" && row.intent === "CHANGE") return "没有标准时间完全匹配";
  if (row.status === "NEEDS_CLARIFICATION") return "家长需求需要澄清";
  if (row.status === "TEACHER_EXCEPTION") return "等待老师例外确认";
  if (row.status === "CHANGE_REQUESTED") return "正式方案后再次申请调整";
  return null;
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
  const reviews=new Map<string, {needsReview:boolean}>();
  for (const campaignId of unique(items.map(row=>row.campaignId))) {
    const group=items.filter(row=>row.campaignId===campaignId);
    for (const [id,result] of await monthlyCompletionReviews(group,group[0].campaign.month)) reviews.set(id,result);
  }
  return items.map((row) => ({ ...row, status: unseenIds.includes(row.id) ? "VIEWED" : row.status, completionNeedsReview:reviews.get(row.id)?.needsReview??false }));
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

function monthlyOfferDuration(item: { currentScheduleJson: unknown; carryForwardScheduleJson: unknown; expectedMinutes: number | null; expectedSessionsPerWeek: number | null }) {
  const targetMonth = jsonRows(item.currentScheduleJson);
  const current = targetMonth.length ? targetMonth : jsonRows(item.carryForwardScheduleJson);
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
    preferenceLevel: row.preferenceLevel ?? null,
    preferenceLabel: row.preferenceLevel ? timePriorityLabels[row.preferenceLevel as MonthlySchedulingTimePriority]?.zh ?? row.preferenceLevel : null,
    sessionDates: dates,
    sessionCount: dates.length,
    suggestedWeeks,
    parentRank: row.parentRank,
    holdExpiresAt: row.holdExpiresAt?.toISOString?.() ?? null,
    holdExpiresText: row.holdExpiresAt ? formatBusinessDateTime(row.holdExpiresAt) : null,
  };
}

/** Fresh availability and conflicts used both for suggestions and for taking a hold.
 * Dated teacher availability remains the monthly planning source; a hold is not a formal booking.
 */
async function monthlyOfferFeasibility(database: Prisma.TransactionClient, month: string, studentId: string) {
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month / 排课月份无效");
  const [teachers, sessions, appointments, leaves] = await Promise.all([
    database.teacher.findMany({
      include: {
        dateAvailabilities: { where: { date: { gte: range.start, lt: range.end } } },
        courseRates: { select: { courseId: true } },
        classes: { select: { courseId: true } },
      },
      orderBy: { name: "asc" },
    }),
    database.session.findMany({
      where: { startAt: { lt: range.end }, endAt: { gt: range.start } },
      select: {
        startAt: true,
        endAt: true,
        teacherId: true,
        studentId: true,
        attendances: { select: { studentId: true, status: true } },
        class: {
          select: {
            teacherId: true,
            capacity: true,
            oneOnOneStudentId: true,
            enrollments: { select: { studentId: true } },
          },
        },
      },
      take: 10001,
    }),
    database.appointment.findMany({
      where: { startAt: { lt: range.end }, endAt: { gt: range.start } },
      select: { startAt: true, endAt: true, teacherId: true, studentId: true },
      take: 5001,
    }),
    database.hrLeaveRequest.findMany({
      where: {status: "APPROVED", startAt: {lt: range.end}, endAt: {gt: range.start}, employee: {teacherId: {not: null}}},
      select: {startAt: true, endAt: true, employee: {select: {teacherId: true}}}, take: 5001,
    }),
  ]);
  if(sessions.length > 10000 || appointments.length > 5000 || leaves.length > 5000)
    throw new Error("Too many scheduling records to verify safely; contact school / 排课记录超出安全核验范围，请联系学校");
  const busyByTeacher = new Map<string, Array<{startAt: Date; endAt: Date}>>();
  const busyForStudent: Array<{startAt: Date; endAt: Date}> = [];
  const add = (id: string, row: {startAt: Date; endAt: Date}) => busyByTeacher.set(id, [...(busyByTeacher.get(id) ?? []), row]);
  for(const row of sessions) {
    const facts = monthlyStaffingLessonFacts(row);
    if(facts.teacherBusy) add(row.teacherId ?? row.class.teacherId, row);
    // Ambiguous historical ownership never proves the student is free.
    if(facts.studentIds.includes(studentId) || facts.needsReview && row.class.enrollments.some(e => e.studentId === studentId)) busyForStudent.push(row);
  }
  for(const row of appointments) {
    add(row.teacherId, row);
    if(row.studentId === studentId) busyForStudent.push(row);
  }
  for(const row of leaves) if(row.employee.teacherId) add(row.employee.teacherId, row);
  const free = (teacherId: string, startAt: Date, endAt: Date) =>
    ![...(busyByTeacher.get(teacherId) ?? []), ...busyForStudent].some(row => startAt < row.endAt && row.startAt < endAt);
  return {teachers, free};
}

export async function refreshMonthlySchedulingOffers(itemId: string, db?: Prisma.TransactionClient) {
  const database=db??prisma;
  const item = await database.monthlySchedulingItem.findUnique({
    where: { id: itemId },
    include: { campaign: true },
  });
  if (!item || item.intent !== "CHANGE") return [];
  if (!["SUBMITTED", "OFFERED"].includes(item.status) || item.campaign.status !== "OPEN") return [];
  const month = monthlySchedulingMonthKey(item.campaign.month);
  const range = monthlySchedulingRange(month);
  if (!range) throw new Error("Invalid campaign month");
  const parent = normalizeMonthlyAvailability(item.availabilityJson);
  const unavailableDates = new Set(cleanStringList(item.unavailableDatesJson, /^\d{4}-\d{2}-\d{2}$/, 40));
  const durationMin = monthlyOfferDuration(item);
  const {teachers, free} = await monthlyOfferFeasibility(database, month, item.studentId);

  const candidates: Array<{
    teacherId: string;
    weekdayLabel: string;
    startMin: number;
    endMin: number;
    preferenceLevel: MonthlySchedulingTimePriority;
    dates: OfferSessionDate[];
  }> = [];
  for (const teacher of teachers) {
    const canTeach = new Set([...teacher.courseRates.map((row) => row.courseId), ...teacher.classes.map((row) => row.courseId)]).has(item.courseId);
    if (!canTeach) continue;
    const groups = new Map<string, { weekdayLabel: string; startMin: number; endMin: number; preferenceLevel: MonthlySchedulingTimePriority; dates: OfferSessionDate[] }>();
    for (const interval of intervalsForTeacher({ month, dates: teacher.dateAvailabilities })) {
      if (unavailableDates.has(interval.date)) continue;
      const weekdayLabel = monthlySchedulingWeekdayCode(interval.date);
      const ranges = parent.selectionMode === "calendar"
        ? parent.dateSelections.filter((row) => row.date === interval.date)
        : parent.weekdays.includes(weekdayLabel) ? parent.timeRanges : [];
      for (const rangeRow of ranges) {
        const [startHour, startMinute] = rangeRow.start.split(":").map(Number);
        const [endHour, endMinute] = rangeRow.end.split(":").map(Number);
        const limit = Math.min(interval.endMin, endHour * 60 + endMinute);
        let startMin = ceilQuarter(Math.max(interval.startMin, startHour * 60 + startMinute));
        while(startMin + durationMin <= limit && !free(teacher.id, dateMinute(interval.date, startMin), dateMinute(interval.date, startMin + durationMin))) startMin += 15;
        const endMin = startMin + durationMin;
        if (endMin > limit) continue;
        const startAt = dateMinute(interval.date, startMin);
        const endAt = dateMinute(interval.date, endMin);
        const key = `${weekdayLabel}:${startMin}:${endMin}`;
        const group = groups.get(key) ?? { weekdayLabel, startMin, endMin, preferenceLevel: rangeRow.priority, dates: [] };
        if (MONTHLY_SCHEDULING_TIME_PRIORITIES.indexOf(rangeRow.priority) < MONTHLY_SCHEDULING_TIME_PRIORITIES.indexOf(group.preferenceLevel)) {
          group.preferenceLevel = rangeRow.priority;
        }
        if (!group.dates.some((row) => row.date === interval.date)) {
          group.dates.push({ date: interval.date, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
        }
        groups.set(key, group);
        break;
      }
    }
    for (const group of Array.from(groups.values()).sort((a, b) => MONTHLY_SCHEDULING_TIME_PRIORITIES.indexOf(a.preferenceLevel) - MONTHLY_SCHEDULING_TIME_PRIORITIES.indexOf(b.preferenceLevel) || b.dates.length - a.dates.length || a.startMin - b.startMin).slice(0, 3)) {
      candidates.push({ teacherId: teacher.id, ...group });
    }
  }
  candidates.sort((a, b) => MONTHLY_SCHEDULING_TIME_PRIORITIES.indexOf(a.preferenceLevel) - MONTHLY_SCHEDULING_TIME_PRIORITIES.indexOf(b.preferenceLevel) || Number(b.teacherId === item.preferredTeacherId) - Number(a.teacherId === item.preferredTeacherId) || b.dates.length - a.dates.length || a.dates[0]?.startAt.localeCompare(b.dates[0]?.startAt ?? "") || 0);
  const selected = candidates.slice(0, 5);
  const persist=async (tx:Prisma.TransactionClient)=>{
    const claimed=await tx.monthlySchedulingItem.updateMany({
      where:{id:item.id,status:item.status,updatedAt:item.updatedAt,intent:"CHANGE",campaign:{status:"OPEN"},offers:{none:{status:{in:["HELD","ACCEPTED","COMPLETED"]}}}},
      data:{status:selected.length?"OFFERED":"SUBMITTED"},
    });
    if(claimed.count!==1)throw new Error("The response or time selection changed; refresh before generating options / 家长回复或选时已变化，请刷新后重新生成方案");
    const previous=await tx.monthlySchedulingOffer.findMany({where:{itemId},select:{id:true,status:true,generation:true}});
    const generation=Math.max(0,...previous.map(row=>row.generation))+1;
    await tx.monthlySchedulingOffer.updateMany({where:{itemId,status:"AVAILABLE"},data:{status:"WITHDRAWN"}});
    const offerIds:string[]=[];
    for (const candidate of selected) {
      const created=await tx.monthlySchedulingOffer.create({data:{itemId,generation,teacherId:candidate.teacherId,
        weekdayLabel:candidate.weekdayLabel,startMin:candidate.startMin,endMin:candidate.endMin,durationMin,
        preferenceLevel:candidate.preferenceLevel,sessionDatesJson:candidate.dates}});
      offerIds.push(created.id);
    }
    await tx.auditLog.create({data:{actorEmail:'system.monthly-scheduling@sgtmanage.local',actorName:'Monthly scheduling',actorRole:'SYSTEM',
      module:'MONTHLY_SCHEDULING',action:'GENERATE_TIME_OPTIONS',entityType:'MonthlySchedulingItem',entityId:itemId,
      meta:{sourceRevision:item.updatedAt.toISOString(),generation,offerIds,retainedOfferIds:previous.map(row=>row.id)}}});
  };
  if(db)await persist(db);else await prisma.$transaction(persist,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  const rows=await database.monthlySchedulingOffer.findMany({where:{itemId,status:{notIn:["WITHDRAWN","EXPIRED"]}},include:{teacher:{select:{name:true}}},orderBy:[{parentRank:"asc"},{generatedAt:"asc"}]});
  return rows.map(monthlySchedulingOfferView);
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
      include: { campaign: true, offers: { include: { teacher: { select: { name: true } } } } },
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
          { OR: [{ teacherId: { in: teacherIds } }, { item: { studentId: item.studentId } }, ...(item.parentId ? [{ item: { parentId: item.parentId } }] : [])] },
        ],
      },
      include: { item: { select: { studentId: true, parentId: true } } },
    });
    const month = monthlySchedulingMonthKey(item.campaign.month);
    const feasibility = await monthlyOfferFeasibility(tx, month, item.studentId);
    const chosen = ranked.find((candidate) => {
      const dates = offerSessionDates(candidate.sessionDatesJson);
      // Reject incomplete/corrupt historical options rather than retaining only the valid fragments.
      if(!Array.isArray(candidate.sessionDatesJson) || !dates.length || dates.length !== candidate.sessionDatesJson.length) return false;
      const teacher = feasibility.teachers.find(row => row.id === candidate.teacherId);
      if(!teacher || ![...teacher.courseRates, ...teacher.classes].some(row => row.courseId === item.courseId)) return false;
      const intervals = intervalsForTeacher({month, dates: teacher.dateAvailabilities});
      if(!dates.every(date => {
        const start = new Date(date.startAt), end = new Date(date.endAt);
        return date.date.startsWith(month + "-") && formatBusinessDateOnly(start) === date.date
          && start.getTime() === dateMinute(date.date, candidate.startMin).getTime()
          && end.getTime() === dateMinute(date.date, candidate.endMin).getTime()
          && candidate.endMin - candidate.startMin === candidate.durationMin && candidate.durationMin > 0
          && intervals.some(slot => slot.date === date.date && slot.startMin <= candidate.startMin && slot.endMin >= candidate.endMin)
          && feasibility.free(candidate.teacherId, start, end);
      })) return false;
      return !active.some(held =>
        (held.teacherId === candidate.teacherId || held.item.studentId === item.studentId || Boolean(item.parentId && held.item.parentId === item.parentId))
        && monthlySchedulingOffersConflict(dates, offerSessionDates(held.sessionDatesJson)));
    });
    if (!chosen) throw new Error("The selected times are no longer available; refresh or contact school / 所选时间已不可用，请刷新或联系学校重新提供方案");
    await tx.monthlySchedulingOffer.updateMany({ where: { itemId: item.id, status: "HELD" }, data: { status: "AVAILABLE", holdExpiresAt: null, heldByParentId: null } });
    await tx.monthlySchedulingOffer.updateMany({ where: { itemId: item.id, status: {in: ["AVAILABLE","HELD"]} }, data: { parentRank: null } });
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
    const meta = {offerIds, selectedOfferId: held.id, holdExpiresAt: holdExpiresAt.toISOString(),
      responseChannel: input.responseChannel, parentConfirmedAt: input.parentConfirmedAt.toISOString(),
      parentConfirmationNote: input.selectionNote, beforeStatus: item.status,
      previousChoices:item.offers.filter(row=>["AVAILABLE","HELD"].includes(row.status)).map(row=>({id:row.id,status:row.status,rank:row.parentRank,holdExpiresAt:row.holdExpiresAt?.toISOString()??null}))};
    if (input.parentId) await tx.parentPortalAudit.create({data: {
      parentId:input.parentId,studentId:item.studentId,action:'MONTHLY_OFFER_RANKING',
      targetType:'MonthlySchedulingItem',targetId:item.id,metaJson:meta,
    }});
    else {
      const actor=await tx.user.findUniqueOrThrow({where:{id:input.selectedByUserId??''}});
      await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,
        module:'MONTHLY_SCHEDULING',action:'PROXY_PARENT_OFFER_RANKING',entityType:'MonthlySchedulingItem',entityId:item.id,meta}});
    }
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
  return selected;
}

export async function requestMonthlySchedulingChange(input: { itemId: string; parentId: string; note: string; expectedUpdatedAt?: string }) {
  const note = cleanText(input.note, 1000);
  if (!note) throw new Error("Please explain what needs to change / 请说明需要调整的内容");
  return prisma.$transaction(async tx => {
    const item = await tx.monthlySchedulingItem.findFirst({where: {
      id: input.itemId, status: {in: ['MATCHED','SCHEDULED']}, campaign: {status:'OPEN'},
      student: {parentLinks:{some:{parentId:input.parentId,canCreateRequests:true}}},
    }});
    if (!item) throw new Error("This arrangement cannot be changed here / 此安排暂不可申请调整，请联系学校");
    if(input.expectedUpdatedAt && input.expectedUpdatedAt!==item.updatedAt.toISOString())
      throw new Error("Arrangement changed; refresh first / 安排已变化，请先刷新");
    const changed=await tx.monthlySchedulingItem.updateMany({where:{id:item.id,status: item.status,updatedAt:item.updatedAt,
      campaign:{status:'OPEN'},student:{parentLinks:{some:{parentId:input.parentId,canCreateRequests:true}}}},
      data:{status:'CHANGE_REQUESTED',parentNotes:note,submittedAt:new Date()}});
    if(changed.count!==1)throw new Error("Arrangement or access changed; refresh first / 安排或权限已变化，请先刷新");
    const row=await tx.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}});
    await tx.parentPortalAudit.create({data:{parentId:input.parentId,studentId:item.studentId,action:'MONTHLY_CHANGE_REQUEST',
      targetType:'MonthlySchedulingItem',targetId:item.id,metaJson:{beforeStatus:item.status,beforeNote:item.parentNotes,note,
        revision:item.updatedAt.toISOString(),formalLessonsRetained:true}}});
    return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function expireMonthlySchedulingOfferHolds(now = new Date()): Promise<number> {
  // Renewal and acceptance can race a scan. Read and mutate the same fresh snapshot;
  // retry only serialization failures, never expire a hold from an earlier scan.
  for (let attempt=0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx=>{
        const expired=await tx.monthlySchedulingOffer.findMany({
          where:{status:"HELD",holdExpiresAt:{lte:now}},select:{id:true,itemId:true},take:500,
          orderBy:{id:'asc'},
        });
        if(!expired.length)return 0;
        const changed=await tx.monthlySchedulingOffer.updateMany({
          where:{id:{in:expired.map(row=>row.id)},status:"HELD",holdExpiresAt:{lte:now}},
          data:{status:"EXPIRED",holdExpiresAt:null},
        });
        for(const itemId of unique(expired.map(row=>row.itemId))) {
          const reverted=await tx.monthlySchedulingItem.updateMany({
            where:{id:itemId,status:"PARENT_SELECTED",offers:{none:{status:{in:["HELD","ACCEPTED","COMPLETED"]}}}},
            data:{status:"OFFERED"},
          });
          await tx.auditLog.create({data:{actorEmail:'system.monthly-scheduling@sgtmanage.local',actorName:'Monthly scheduling',actorRole:'SYSTEM',
            module:'MONTHLY_SCHEDULING',action:'EXPIRE_TIME_HOLD',entityType:'MonthlySchedulingItem',entityId:itemId,
            meta:{offerIds:expired.filter(row=>row.itemId===itemId).map(row=>row.id),asOf:now.toISOString(),returnedToOptions:reverted.count===1}}});
        }
        return changed.count;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    } catch(error) {
      const retryable=error instanceof Prisma.PrismaClientKnownRequestError && (error.code==='P2034'||error.code==='P2010'&&['40001','40P01'].includes(String(error.meta?.code)));
      if(!retryable||attempt>=2)throw error;
    }
  }
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

export async function buildMonthlyStaffingReport(campaignId: string, cohort?: MonthlySchedulingCohort) {
  const campaign = await prisma.monthlySchedulingCampaign.findUnique({
    where: { id: campaignId },
    include: { items: { include: { course: true, student: { include: { sourceChannel: { select: { name: true } } } } } } },
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
      where: { startAt: { lt: range.end }, endAt: { gt: range.start } },
      include: { class: { include: { enrollments: { select: { studentId: true } } } }, attendances: {select: {studentId:true,status:true}} },
      take: 10001,
    }),
    prisma.appointment.findMany({
      where: { startAt: { lt: range.end }, endAt: { gt: range.start } },
      select: { teacherId: true, startAt: true, endAt: true },
      take: 5001,
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
  let unresolvedLessons=0;
  for (const session of sessions) {
    const facts=monthlyStaffingLessonFacts(session);
    if(facts.needsReview)unresolvedLessons++;
    if(!facts.teacherBusy)continue;
    const teacherId=session.teacherId??session.class.teacherId;
    busyByTeacher.set(teacherId,[...(busyByTeacher.get(teacherId)??[]),...monthlyBusyDateIntervals(session.startAt,session.endAt,range)]);
  }
  for (const appointment of appointments) {
    busyByTeacher.set(appointment.teacherId,[...(busyByTeacher.get(appointment.teacherId)??[]),...monthlyBusyDateIntervals(appointment.startAt,appointment.endAt,range)]);
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
    const duration = Math.max(0, (Math.min(session.endAt.getTime(),range.end.getTime()) - Math.max(session.startAt.getTime(),range.start.getTime())) / 60000);
    for (const studentId of monthlyStaffingLessonFacts(session).studentIds) {
      const key = `${studentId}:${session.class.courseId}`;
      scheduledMinutes.set(key, (scheduledMinutes.get(key) ?? 0) + duration);
    }
  }

  const incomplete = sessions.length>10000 || appointments.length>5000;
  const activeStatuses = new Set(["SUBMITTED", "OFFERED", "PARENT_SELECTED", "CHANGE_REQUESTED", "NEEDS_CLARIFICATION", "MATCHED", "TEACHER_EXCEPTION", "SCHEDULED"]);
  const courseMap = new Map<string, { courseId: string; courseName: string; students: Set<string>; demandMinutes: number; scheduledMinutes: number; unscheduledMinutes:number; unknownDemandCount:number; pendingCount: number }>();
  const timeBandMap = new Map<string, { label: string; itemCount: number; demandMinutes: number }>();
  for (const item of campaign.items) {
    if (cohort && monthlySchedulingCohortForSourceName(item.student.sourceChannel?.name) !== cohort) continue;
    if (!activeStatuses.has(item.status) || item.intent === "PAUSE") continue;
    const key = `${item.studentId}:${item.courseId}`;
    const alreadyScheduled = scheduledMinutes.get(key) ?? 0;
    const demand = confirmedMonthlyDemand(item);
    const row = courseMap.get(item.courseId) ?? { courseId: item.courseId, courseName: item.course.name, students: new Set<string>(), demandMinutes: 0, scheduledMinutes: 0, unscheduledMinutes:0, unknownDemandCount:0, pendingCount: 0 };
    row.students.add(item.studentId);
    row.demandMinutes += demand ?? 0;
    if(demand==null)row.unknownDemandCount++;
    else row.unscheduledMinutes += Math.max(0,demand-alreadyScheduled);
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
          band.demandMinutes += demand ?? 0;
          timeBandMap.set(bandKey, band);
        }
      }
    }
  }

  const courseCapacityInputs = Array.from(courseMap.values()).map((row) => ({
    courseId: row.courseId,
    unscheduledMinutes: row.unscheduledMinutes,
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
      unknownDemandCount:row.unknownDemandCount,
      tone: gapMinutes > 0 || qualifiedTeacherIds.length === 0 ? "RED" : row.unknownDemandCount>0 || unresolvedLessons>0 || incomplete || utilization >= 0.8 ? "AMBER" : "GREEN",
    };
  }).sort((a, b) => b.gapMinutes - a.gapMinutes || b.unscheduledMinutes - a.unscheduledMinutes);

  return {
    month,
    courses,
    timeBands: Array.from(timeBandMap.values()).sort((a, b) => b.itemCount - a.itemCount).slice(0, 30),
    summary: {
      unknownDemandCount:courses.reduce((sum,row)=>sum+row.unknownDemandCount,0),
      unresolvedLessons,incomplete,
      demandMinutes: courses.reduce((sum, row) => sum + row.demandMinutes, 0),
      scheduledMinutes: courses.reduce((sum, row) => sum + row.scheduledMinutes, 0),
      gapMinutes: courses.reduce((sum, row) => sum + row.gapMinutes, 0),
      redCourses: courses.filter((row) => row.tone === "RED").length,
      teachersWithoutAvailability: teachers.filter((teacher) => (availabilityByTeacher.get(teacher.id) ?? []).length === 0).length,
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

export async function monthlySchedulingParentMessageFromTemplate(input: {
  parentName?: string | null;
  month: string;
  students: Array<{ studentName: string; courseName: string }>;
  dueAt?: Date | null;
}) {
  const due = input.dueAt ? formatBusinessDateOnly(input.dueAt) : "-";
  const rendered = await renderPublishedCommunicationTemplate("MONTHLY_INITIAL", {
    parentName: input.parentName || "家长",
    month: input.month,
    studentNames: unique(input.students.map((row) => row.studentName)).join("、"),
    studentCourseLines: input.students.map((row) => `${row.studentName}：${row.courseName}`).join("；"),
    dueDate: due,
  });
  return rendered.messageText;
}

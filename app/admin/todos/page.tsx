import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import AdminTodosRemindersClient from "./AdminTodosRemindersClient";
import AdminTodosOpsClient from "./AdminTodosOpsClient";
import AcademicManagementAlertsClient, { type AcademicAlertRow } from "./AcademicManagementAlertsClient";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import WorkbenchActionBanner from "../_components/WorkbenchActionBanner";
import WorkbenchScrollMemoryClient from "../_components/WorkbenchScrollMemoryClient";
import {
  autoResolveTeacherConflicts,
  getLatestAutoFixResult,
  getOrRunDailyConflictAudit,
  refreshDailyConflictAudit,
  saveAutoFixResult,
} from "@/lib/conflict-audit";
import { getOverdueUnmarkedFollowupGroups } from "@/lib/unmarked-followups";
import { LEDGER_INTEGRITY_ALERT_KEY, parseLedgerIntegrityAlertState } from "@/lib/ledger-integrity-alert";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  workbenchHeroStyle,
  workbenchInfoBarStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
  workbenchStickyPanelStyle,
} from "../_components/workbenchStyles";
import { SCHEDULING_COORDINATION_TICKET_TYPE } from "@/lib/tickets";
import { deriveSchedulingCoordinationPhase } from "@/lib/scheduling-coordination";
import {
  ACADEMIC_MANAGEMENT_LOOKAHEAD_DAYS,
  ACADEMIC_STUDENT_LANES,
  academicLanePackageWarning,
  academicProfileCompleteness,
  academicRiskLabel,
  academicStudentLaneLabel,
  isAcademicProfileIncomplete,
  matchesAcademicStudentLane,
  normalizeAcademicStudentLane,
  requiresMonthlyAcademicReport,
  servicePlanLabel,
  studentAcademicStudentLane,
} from "@/lib/academic-management";

const TODO_DESK_COOKIE = "adminTodosDesk";
const FORECAST_WINDOW_DAYS = 30;
const STUDENT_SCHEDULE_LOOKAHEAD_DAYS = ACADEMIC_MANAGEMENT_LOOKAHEAD_DAYS;
const DEFAULT_WARN_DAYS = 3;
const DEFAULT_WARN_MINUTES = 240;
const MAX_LIST_ITEMS = 6;
const TEACHER_SELF_CONFIRM_TODAY = "TEACHER_SELF_CONFIRM_TODAY";
const TEACHER_SELF_CONFIRM_TOMORROW = "TEACHER_SELF_CONFIRM_TOMORROW";

function fmtMinutes(m?: number | null) {
  if (m == null) return "-";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  if (mm === 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

function toInt(v: string | undefined, def: number) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : def;
}

function normalizeWarnDays(value: string | undefined, fallback = DEFAULT_WARN_DAYS) {
  return Math.max(1, toInt(value, fallback));
}

function normalizeWarnMinutes(value: string | undefined, fallback = DEFAULT_WARN_MINUTES) {
  return Math.max(1, toInt(value, fallback));
}

function normalizePastDays(value: string | undefined, fallback = 30) {
  return Math.min(365, Math.max(7, toInt(value, fallback)));
}

function parseRememberedTodoDesk(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const warnDays = normalizeWarnDays(params.get("warnDays") ?? undefined);
  const warnMinutes = normalizeWarnMinutes(params.get("warnMinutes") ?? undefined);
  const pastDays = normalizePastDays(params.get("pastDays") ?? undefined);
  const showConfirmed = params.get("showConfirmed") === "1";
  const includeConflicts = params.get("includeConflicts") === "1";
  const normalized = new URLSearchParams();
  if (warnDays !== DEFAULT_WARN_DAYS) normalized.set("warnDays", String(warnDays));
  if (warnMinutes !== DEFAULT_WARN_MINUTES) normalized.set("warnMinutes", String(warnMinutes));
  if (pastDays !== 30) normalized.set("pastDays", String(pastDays));
  if (showConfirmed) normalized.set("showConfirmed", "1");
  if (includeConflicts) normalized.set("includeConflicts", "1");
  return {
    warnDays,
    warnMinutes,
    pastDays,
    showConfirmed,
    includeConflicts,
    value: normalized.toString(),
  };
}

function fmtDateRange(startAt: Date, endAt: Date) {
  return `${formatBusinessDateTime(startAt)} - ${formatBusinessTimeOnly(endAt)}`;
}

function courseLabel(cls: any) {
  if (!cls?.course) return "-";
  const parts = [cls.course?.name, cls.subject?.name, cls.level?.name].filter(Boolean);
  return parts.join(" / ");
}

function formatSessionBrief(s: any) {
  return `${fmtDateRange(new Date(s.startAt), new Date(s.endAt))} | ${courseLabel(s.class)}`;
}

function listWithLimit(items: string[], limit = MAX_LIST_ITEMS) {
  if (items.length <= limit) return items.join("; ");
  const shown = items.slice(0, limit).join("; ");
  return `${shown}; +${items.length - limit} more`;
}

function todoReturnHref(anchor: string) {
  return `/admin/todos${anchor}`;
}

function attendanceFromTodoHref(sessionId: string, anchor: string) {
  const params = new URLSearchParams();
  params.set("source", "todo");
  params.set("todoBack", todoReturnHref(anchor));
  return `/admin/sessions/${encodeURIComponent(sessionId)}/attendance?${params.toString()}`;
}

function todoWorkMapAnchor(href: string, label: string, detail: string, background: string, border: string) {
  const style = {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
  return href.startsWith("#") ? (
    <a key={href} href={href} style={style}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{detail}</span>
    </a>
  ) : (
    <Link key={href} href={href} scroll={false} style={style}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{detail}</span>
    </Link>
  );
}

function ticketFromTodoHref(ticketId: string, anchor: string) {
  const back = todoReturnHref(anchor);
  const params = new URLSearchParams();
  params.set("back", back);
  params.set("source", "todo");
  params.set("todoBack", back);
  return `/admin/tickets/${encodeURIComponent(ticketId)}?${params.toString()}`;
}

function todoTicketStatusLabel(lang: Awaited<ReturnType<typeof getLang>>, status: string) {
  if (status === "Need Info") return t(lang, "Information action needed", "待补信息");
  if (status === "Waiting Teacher") return t(lang, "Teacher action needed", "等待老师处理");
  if (status === "Waiting Parent") return t(lang, "Parent action needed", "等待家长处理");
  if (status === "Confirmed") return t(lang, "Ready to schedule", "可继续排课");
  if (status === "Completed") return t(lang, "Completed", "已完成");
  if (status === "Cancelled") return t(lang, "Cancelled", "已取消");
  return status || "-";
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function expectedStudentsForReminder(session: any, enrollmentsByClass: Map<string, any[]>) {
  const cancelledSet = new Set(
    Array.isArray(session.attendances)
      ? session.attendances.filter((a: any) => a?.status === "EXCUSED").map((a: any) => a.studentId as string)
      : []
  );

  const roster = (enrollmentsByClass.get(session.classId) ?? []).map((e: any) => ({
    id: e.studentId as string,
    name: e.student?.name ?? "-",
  }));
  if (session.class?.capacity === 1) {
    if (session.studentId) {
      const fromRoster = roster.find((x) => x.id === session.studentId);
      if (cancelledSet.has(session.studentId as string)) return [];
      return [{ id: session.studentId as string, name: session.student?.name ?? fromRoster?.name ?? "-" }];
    }
    if (session.class?.oneOnOneStudentId) {
      if (cancelledSet.has(session.class.oneOnOneStudentId as string)) return [];
      return [
        {
          id: session.class.oneOnOneStudentId as string,
          name: session.class.oneOnOneStudent?.name ?? roster.find((x) => x.id === session.class.oneOnOneStudentId)?.name ?? "-",
        },
      ];
    }
    const first = roster.find((x) => !cancelledSet.has(x.id));
    return first ? [first] : [];
  }
  return roster.filter((x) => !cancelledSet.has(x.id));
}

function expectedStudentIdsForAttendanceTask(
  session: any,
  enrollmentsByClass: Map<string, Array<{ classId: string; studentId: string }>>,
  attendanceBySession: Map<string, Array<{ sessionId: string; studentId: string; status: string }>>
) {
  const enrolledStudentIds = (enrollmentsByClass.get(session.classId) ?? []).map((e) => e.studentId);
  const oneOnOneId = session.studentId ?? session.class?.oneOnOneStudentId ?? enrolledStudentIds[0] ?? null;
  const expectedStudentIds = session.class.capacity === 1 ? (oneOnOneId ? [oneOnOneId] : []) : enrolledStudentIds;
  const cancelledSet = new Set(
    (attendanceBySession.get(session.id) ?? [])
      .filter((a) => a.status === "EXCUSED")
      .map((a) => a.studentId)
  );
  return expectedStudentIds.filter((sid) => !cancelledSet.has(sid));
}

async function confirmReminder(kind: "teacher" | "student", formData: FormData) {
  "use server";
  const dateStr = String(formData.get("date") ?? "");
  const targetIdsRaw = String(formData.get("targetIds") ?? "");
  const warnDays = String(formData.get("warnDays") ?? "");
  const warnMinutes = String(formData.get("warnMinutes") ?? "");

  if (!dateStr) redirect("/admin/todos");
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) redirect("/admin/todos");

  const type = kind === "teacher" ? "TEACHER_TOMORROW" : "STUDENT_TOMORROW";
  const targetIds = targetIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (targetIds.length) {
    await prisma.todoReminderConfirm.createMany({
      data: targetIds.map((targetId) => ({ type, targetId, date })),
      skipDuplicates: true,
    });
  }

  const params = new URLSearchParams();
  if (warnDays) params.set("warnDays", warnDays);
  if (warnMinutes) params.set("warnMinutes", warnMinutes);
  const qs = params.toString();
  redirect(qs ? `/admin/todos?${qs}` : "/admin/todos");
}

async function rerunConflictAudit(formData: FormData) {
  "use server";
  await requireAdmin();
  await refreshDailyConflictAudit(new Date());

  const warnDays = String(formData.get("warnDays") ?? "");
  const warnMinutes = String(formData.get("warnMinutes") ?? "");
  const pastDays = String(formData.get("pastDays") ?? "");
  const showConfirmed = String(formData.get("showConfirmed") ?? "");
  const includeConflicts = String(formData.get("includeConflicts") ?? "");
  const p = new URLSearchParams();
  if (warnDays) p.set("warnDays", warnDays);
  if (warnMinutes) p.set("warnMinutes", warnMinutes);
  if (pastDays) p.set("pastDays", pastDays);
  if (showConfirmed === "1") p.set("showConfirmed", "1");
  if (includeConflicts === "1") p.set("includeConflicts", "1");
  redirect(`/admin/todos?${p.toString()}`);
}

async function runAutoFixNow(formData: FormData) {
  "use server";
  await requireAdmin();
  const result = await autoResolveTeacherConflicts(new Date());
  await saveAutoFixResult(result, new Date());
  await refreshDailyConflictAudit(new Date());

  const warnDays = String(formData.get("warnDays") ?? "");
  const warnMinutes = String(formData.get("warnMinutes") ?? "");
  const pastDays = String(formData.get("pastDays") ?? "");
  const showConfirmed = String(formData.get("showConfirmed") ?? "");
  const includeConflicts = String(formData.get("includeConflicts") ?? "");
  const p = new URLSearchParams();
  if (warnDays) p.set("warnDays", warnDays);
  if (warnMinutes) p.set("warnMinutes", warnMinutes);
  if (pastDays) p.set("pastDays", pastDays);
  if (showConfirmed === "1") p.set("showConfirmed", "1");
  if (includeConflicts === "1") p.set("includeConflicts", "1");
  redirect(`/admin/todos?${p.toString()}`);
}

export default async function AdminTodosPage({
  searchParams,
}: {
  searchParams?: Promise<{ clearDesk?: string; warnDays?: string; warnMinutes?: string; pastDays?: string; pastPage?: string; showConfirmed?: string; includeConflicts?: string; academicLane?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const clearDesk = String(sp?.clearDesk ?? "").trim() === "1";
  const hasWarnDaysParam = typeof sp?.warnDays === "string";
  const hasWarnMinutesParam = typeof sp?.warnMinutes === "string";
  const hasPastDaysParam = typeof sp?.pastDays === "string";
  const hasShowConfirmedParam = typeof sp?.showConfirmed === "string";
  const hasIncludeConflictsParam = typeof sp?.includeConflicts === "string";
  const hasExplicitDeskContext = !clearDesk && (hasWarnDaysParam || hasWarnMinutesParam || hasPastDaysParam || hasShowConfirmedParam || hasIncludeConflictsParam);
  const cookieStore = await cookies();
  const rememberedDesk = hasExplicitDeskContext || clearDesk
    ? {
        warnDays: DEFAULT_WARN_DAYS,
        warnMinutes: DEFAULT_WARN_MINUTES,
        pastDays: 30,
        showConfirmed: false,
        includeConflicts: false,
        value: "",
      }
    : parseRememberedTodoDesk(cookieStore.get(TODO_DESK_COOKIE)?.value ?? "");
  const warnDays = normalizeWarnDays(hasWarnDaysParam ? sp?.warnDays : undefined, hasExplicitDeskContext || clearDesk ? DEFAULT_WARN_DAYS : rememberedDesk.warnDays);
  const warnMinutes = normalizeWarnMinutes(
    hasWarnMinutesParam ? sp?.warnMinutes : undefined,
    hasExplicitDeskContext || clearDesk ? DEFAULT_WARN_MINUTES : rememberedDesk.warnMinutes
  );
  const pastDays = normalizePastDays(hasPastDaysParam ? sp?.pastDays : undefined, hasExplicitDeskContext || clearDesk ? 30 : rememberedDesk.pastDays);
  const pastPage = Math.max(1, toInt(sp?.pastPage, 1));
  const pastPageSize = 50;
  const showConfirmed = hasShowConfirmedParam ? sp?.showConfirmed === "1" : rememberedDesk.showConfirmed;
  const includeConflicts = hasIncludeConflictsParam ? sp?.includeConflicts === "1" : rememberedDesk.includeConflicts;
  const academicLane = normalizeAcademicStudentLane(sp?.academicLane);
  const resumedRememberedDesk = !clearDesk && !hasExplicitDeskContext && Boolean(rememberedDesk.value);
  const rememberedDeskValue = (() => {
    const params = new URLSearchParams();
    if (warnDays !== DEFAULT_WARN_DAYS) params.set("warnDays", String(warnDays));
    if (warnMinutes !== DEFAULT_WARN_MINUTES) params.set("warnMinutes", String(warnMinutes));
    if (pastDays !== 30) params.set("pastDays", String(pastDays));
    if (showConfirmed) params.set("showConfirmed", "1");
    if (includeConflicts) params.set("includeConflicts", "1");
    return params.toString();
  })();

  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const yesterdayStart = new Date(dayStart);
  yesterdayStart.setDate(dayStart.getDate() - 1);
  const yesterdayEnd = new Date(dayEnd);
  yesterdayEnd.setDate(dayEnd.getDate() - 1);
  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setDate(dayStart.getDate() + 1);
  const tomorrowEnd = new Date(dayEnd);
  tomorrowEnd.setDate(dayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const pastSince = new Date(dayStart);
  pastSince.setDate(dayStart.getDate() - pastDays);

  const [sessionsTodayAll, sessionsYesterdayAll, pastSessionsAll, sessionsTomorrow, sessionsTomorrowAll] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { gte: dayStart, lte: dayEnd } },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { lt: dayStart, gte: pastSince } },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "desc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: tomorrowStart, lte: tomorrowEnd } },
      include: {
        teacher: true,
        student: true,
        attendances: { select: { studentId: true, status: true } },
        class: {
          include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true, oneOnOneStudent: true },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: tomorrowStart, lte: tomorrowEnd } },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
  ]);
  const todayClassIds = Array.from(new Set(sessionsTodayAll.map((s) => s.classId)));
  const todayEnrollments = todayClassIds.length
    ? await prisma.enrollment.findMany({
        where: { classId: { in: todayClassIds } },
        select: { classId: true, studentId: true },
      })
    : [];
  const todayEnrollmentsByClass = new Map<string, typeof todayEnrollments>();
  for (const e of todayEnrollments) {
    const arr = todayEnrollmentsByClass.get(e.classId) ?? [];
    arr.push(e);
    todayEnrollmentsByClass.set(e.classId, arr);
  }
  const todayAttendances = sessionsTodayAll.length
    ? await prisma.attendance.findMany({
        where: { sessionId: { in: sessionsTodayAll.map((s) => s.id) } },
        select: {
          sessionId: true,
          studentId: true,
          status: true,
          deductedMinutes: true,
          deductedCount: true,
          excusedCharge: true,
          waiveDeduction: true,
        },
      })
    : [];
  const todayAttendanceBySession = new Map<string, typeof todayAttendances>();
  for (const a of todayAttendances) {
    const arr = todayAttendanceBySession.get(a.sessionId) ?? [];
    arr.push(a);
    todayAttendanceBySession.set(a.sessionId, arr);
  }
  const unmarkedMap = new Map<string, number>();
  const deductRequiredMap = new Map<string, number>();
  const deductDoneMap = new Map<string, number>();
  const deductPendingMap = new Map<string, number>();
  const sessionsToday = sessionsTodayAll.filter((s) => {
    const expectedStudentIds = expectedStudentIdsForAttendanceTask(s, todayEnrollmentsByClass, todayAttendanceBySession);
    if (expectedStudentIds.length === 0) return false;

    const expectedSet = new Set(expectedStudentIds);
    const rows = (todayAttendanceBySession.get(s.id) ?? []).filter((a) => expectedSet.has(a.studentId));
    const markedSet = new Set(rows.map((a) => a.studentId));
    const unmarkedRows = rows.filter((a) => a.status === "UNMARKED").length;
    let missingRows = 0;
    for (const sid of expectedSet) {
      if (!markedSet.has(sid)) missingRows += 1;
    }

    const unmarkedCount = unmarkedRows + missingRows;
    if (unmarkedCount <= 0) return false;
    unmarkedMap.set(s.id, unmarkedCount);
    return true;
  });
  for (const s of sessionsTodayAll) {
    const expectedStudentIds = expectedStudentIdsForAttendanceTask(s, todayEnrollmentsByClass, todayAttendanceBySession);
    if (expectedStudentIds.length === 0) {
      deductRequiredMap.set(s.id, 0);
      deductDoneMap.set(s.id, 0);
      deductPendingMap.set(s.id, 0);
      continue;
    }

    const rowsByStudent = new Map((todayAttendanceBySession.get(s.id) ?? []).map((a) => [a.studentId, a]));
    const isGroupClass = s.class.capacity !== 1;
    let required = 0;
    let done = 0;

    for (const sid of expectedStudentIds) {
      const row = rowsByStudent.get(sid);
      if (!row) continue;
      const status = row.status;
      const waiveDeduction = Boolean((row as any).waiveDeduction);
      const requiresDeduct =
        !waiveDeduction &&
        (status === "PRESENT" ||
          status === "LATE" ||
          (status === "EXCUSED" && Boolean((row as any).excusedCharge)));
      if (!requiresDeduct) continue;

      required += 1;
      const hasDeduct =
        Number((row as any).deductedMinutes ?? 0) > 0 ||
        Number((row as any).deductedCount ?? 0) > 0;
      if (hasDeduct) done += 1;
    }

    deductRequiredMap.set(s.id, required);
    deductDoneMap.set(s.id, done);
    deductPendingMap.set(s.id, Math.max(0, required - done));
  }
  const sessionsTodayVisible = sessionsTodayAll.filter(
    (s) => expectedStudentIdsForAttendanceTask(s, todayEnrollmentsByClass, todayAttendanceBySession).length > 0
  );
  const yesterdayClassIds = Array.from(new Set(sessionsYesterdayAll.map((s) => s.classId)));
  const yesterdayEnrollments = yesterdayClassIds.length
    ? await prisma.enrollment.findMany({
        where: { classId: { in: yesterdayClassIds } },
        select: { classId: true, studentId: true },
      })
    : [];
  const yesterdayEnrollmentsByClass = new Map<string, typeof yesterdayEnrollments>();
  for (const e of yesterdayEnrollments) {
    const arr = yesterdayEnrollmentsByClass.get(e.classId) ?? [];
    arr.push(e);
    yesterdayEnrollmentsByClass.set(e.classId, arr);
  }
  const yesterdayAttendances = sessionsYesterdayAll.length
    ? await prisma.attendance.findMany({
        where: { sessionId: { in: sessionsYesterdayAll.map((s) => s.id) } },
        select: { sessionId: true, studentId: true, status: true },
      })
    : [];
  const yesterdayAttendanceBySession = new Map<string, typeof yesterdayAttendances>();
  for (const a of yesterdayAttendances) {
    const arr = yesterdayAttendanceBySession.get(a.sessionId) ?? [];
    arr.push(a);
    yesterdayAttendanceBySession.set(a.sessionId, arr);
  }
  const unmarkedYesterdayMap = new Map<string, number>();
  const sessionsYesterday = sessionsYesterdayAll.filter((s) => {
    const expectedStudentIds = expectedStudentIdsForAttendanceTask(s, yesterdayEnrollmentsByClass, yesterdayAttendanceBySession);
    if (expectedStudentIds.length === 0) return false;

    const expectedSet = new Set(expectedStudentIds);
    const rows = (yesterdayAttendanceBySession.get(s.id) ?? []).filter((a) => expectedSet.has(a.studentId));
    const markedSet = new Set(rows.map((a) => a.studentId));
    const unmarkedRows = rows.filter((a) => a.status === "UNMARKED").length;
    let missingRows = 0;
    for (const sid of expectedSet) {
      if (!markedSet.has(sid)) missingRows += 1;
    }

    const unmarkedCount = unmarkedRows + missingRows;
    if (unmarkedCount <= 0) return false;
    unmarkedYesterdayMap.set(s.id, unmarkedCount);
    return true;
  });

  const pastClassIds = Array.from(new Set(pastSessionsAll.map((s) => s.classId)));
  const pastEnrollments = pastClassIds.length
    ? await prisma.enrollment.findMany({
        where: { classId: { in: pastClassIds } },
        select: { classId: true, studentId: true },
      })
    : [];
  const pastEnrollmentsByClass = new Map<string, typeof pastEnrollments>();
  for (const e of pastEnrollments) {
    const arr = pastEnrollmentsByClass.get(e.classId) ?? [];
    arr.push(e);
    pastEnrollmentsByClass.set(e.classId, arr);
  }
  const pastAttendances = pastSessionsAll.length
    ? await prisma.attendance.findMany({
        where: { sessionId: { in: pastSessionsAll.map((s) => s.id) } },
        select: { sessionId: true, studentId: true, status: true },
      })
    : [];
  const pastAttendanceBySession = new Map<string, typeof pastAttendances>();
  for (const a of pastAttendances) {
    const arr = pastAttendanceBySession.get(a.sessionId) ?? [];
    arr.push(a);
    pastAttendanceBySession.set(a.sessionId, arr);
  }
  const pastCalculated = pastSessionsAll
    .map((s) => {
      const expectedStudentIds = expectedStudentIdsForAttendanceTask(s, pastEnrollmentsByClass, pastAttendanceBySession);
      if (expectedStudentIds.length === 0) return null;

      const expectedSet = new Set(expectedStudentIds);
      const rows = (pastAttendanceBySession.get(s.id) ?? []).filter((a) => expectedSet.has(a.studentId));
      const markedSet = new Set(rows.map((a) => a.studentId));
      const unmarkedRows = rows.filter((a) => a.status === "UNMARKED").length;
      let missingRows = 0;
      for (const sid of expectedSet) {
        if (!markedSet.has(sid)) missingRows += 1;
      }

      const unmarkedCount = unmarkedRows + missingRows;
      if (unmarkedCount <= 0) return null;
      return { session: s, unmarkedCount };
    })
    .filter((x): x is { session: (typeof pastSessionsAll)[number]; unmarkedCount: number } => !!x);
  const pastTotal = pastCalculated.length;
  const pastTotalPages = Math.max(1, Math.ceil(pastTotal / pastPageSize));
  const pastSlice = pastCalculated.slice((pastPage - 1) * pastPageSize, pastPage * pastPageSize);
  const pastSessions = pastSlice.map((x) => x.session);
  const pastUnmarkedMap = new Map(pastSlice.map((x) => [x.session.id, x.unmarkedCount]));

  const tomorrowClassIds = Array.from(new Set(sessionsTomorrow.map((s) => s.classId)));
  const tomorrowEnrollments = tomorrowClassIds.length
    ? await prisma.enrollment.findMany({
        where: { classId: { in: tomorrowClassIds } },
        include: { student: true, class: { include: { teacher: true } } },
      })
    : [];
  const enrollmentsByClass = new Map<string, typeof tomorrowEnrollments>();
  for (const e of tomorrowEnrollments) {
    const arr = enrollmentsByClass.get(e.classId) ?? [];
    arr.push(e);
    enrollmentsByClass.set(e.classId, arr);
  }

  const sessionsTomorrowForReminders = sessionsTomorrow.filter(
    (s) => expectedStudentsForReminder(s, enrollmentsByClass).length > 0
  );

  const teacherRemindersMap = new Map<string, { id: string; name: string; sessions: any[] }>();
  for (const s of sessionsTomorrowForReminders) {
    const tid = s.teacherId ?? s.class.teacherId;
    const tname = s.teacher?.name ?? s.class.teacher.name;
    const entry = teacherRemindersMap.get(tid) ?? { id: tid, name: tname, sessions: [] };
    entry.sessions.push(s);
    teacherRemindersMap.set(tid, entry);
  }
  const teacherReminders = Array.from(teacherRemindersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const teacherTodayMap = new Map<string, { id: string; name: string; sessions: any[] }>();
  for (const s of sessionsTodayAll) {
    const tid = s.teacherId ?? s.class.teacherId;
    const tname = s.class.teacher.name;
    const entry = teacherTodayMap.get(tid) ?? { id: tid, name: tname, sessions: [] };
    entry.sessions.push(s);
    teacherTodayMap.set(tid, entry);
  }
  const teacherTodayReminders = Array.from(teacherTodayMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const studentRemindersMap = new Map<string, { id: string; name: string; sessions: any[] }>();
  for (const s of sessionsTomorrowForReminders) {
    const list = expectedStudentsForReminder(s, enrollmentsByClass);
    for (const e of list) {
      const sid = e.id;
      const sname = e.name ?? "-";
      const entry = studentRemindersMap.get(sid) ?? { id: sid, name: sname, sessions: [] as any[] };
      entry.sessions.push(s);
      studentRemindersMap.set(sid, entry);
    }
  }
  const studentReminders = Array.from(studentRemindersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const confirmDate = toDateOnly(tomorrowStart);
  const todayConfirmDate = toDateOnly(dayStart);
  const [teacherConfirmations, teacherSelfTodayConfirmations, teacherSelfTomorrowConfirmations, studentConfirmations] = await Promise.all([
    teacherReminders.length
      ? prisma.todoReminderConfirm.findMany({
          where: {
            type: "TEACHER_TOMORROW",
            date: confirmDate,
            targetId: { in: teacherReminders.map((r) => r.id) },
          },
          select: { targetId: true },
        })
      : Promise.resolve([]),
    teacherTodayReminders.length
      ? prisma.todoReminderConfirm.findMany({
          where: {
            type: TEACHER_SELF_CONFIRM_TODAY,
            date: todayConfirmDate,
            targetId: { in: teacherTodayReminders.map((r) => r.id) },
          },
          select: { targetId: true, createdAt: true },
        })
      : Promise.resolve([]),
    teacherReminders.length
      ? prisma.todoReminderConfirm.findMany({
          where: {
            type: TEACHER_SELF_CONFIRM_TOMORROW,
            date: confirmDate,
            targetId: { in: teacherReminders.map((r) => r.id) },
          },
          select: { targetId: true, createdAt: true },
        })
      : Promise.resolve([]),
    studentReminders.length
      ? prisma.todoReminderConfirm.findMany({
          where: {
            type: "STUDENT_TOMORROW",
            date: confirmDate,
            targetId: { in: studentReminders.map((r) => r.id) },
          },
          select: { targetId: true },
        })
      : Promise.resolve([]),
  ]);
  const teacherConfirmed = new Set(teacherConfirmations.map((x) => x.targetId));
  const teacherSelfTodayMap = new Map(teacherSelfTodayConfirmations.map((x) => [x.targetId, x.createdAt]));
  const teacherSelfTomorrowMap = new Map(teacherSelfTomorrowConfirmations.map((x) => [x.targetId, x.createdAt]));
  const studentConfirmed = new Set(studentConfirmations.map((x) => x.targetId));
  const teacherRemindersPending = teacherReminders.filter((r) => !teacherConfirmed.has(r.id));
  const studentRemindersPending = studentReminders.filter((r) => !studentConfirmed.has(r.id));
  const teacherRemindersConfirmed = teacherReminders.filter((r) => teacherConfirmed.has(r.id));
  const studentRemindersConfirmed = studentReminders.filter((r) => studentConfirmed.has(r.id));

  const usageSince = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const schedulingFollowupWindowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const [dailyConflictAudit, lastAutoFix, packages, overdueUnmarkedGroups, ledgerAlertRow, schedulingCoordinationRows, submittedParentAvailabilityRows] = await Promise.all([
    getOrRunDailyConflictAudit(now),
    getLatestAutoFixResult(),
    prisma.coursePackage.findMany({
      where: {
        type: "HOURS",
        status: "ACTIVE",
        remainingMinutes: { gt: 0 },
      },
      include: { student: { include: { studentType: true, sourceChannel: true } }, course: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    getOverdueUnmarkedFollowupGroups({ now, thresholdHours: 3, lookbackDays: 7, perTeacherLimit: 4, totalLimit: 120 }),
    prisma.appSetting.findUnique({ where: { key: LEDGER_INTEGRITY_ALERT_KEY }, select: { value: true } }),
    prisma.ticket.findMany({
      where: {
        type: SCHEDULING_COORDINATION_TICKET_TYPE,
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled"] },
        nextActionDue: { lte: schedulingFollowupWindowEnd },
      },
      orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        ticketNo: true,
        studentName: true,
        owner: true,
        status: true,
        nextAction: true,
        nextActionDue: true,
        parentAvailability: true,
        parentAvailabilityRequest: {
          select: {
            submittedAt: true,
          },
        },
      },
    }),
    prisma.parentAvailabilityRequest.findMany({
      where: {
        isActive: true,
        submittedAt: { not: null },
        ticket: {
          isArchived: false,
          status: { notIn: ["Completed", "Cancelled"] },
          type: SCHEDULING_COORDINATION_TICKET_TYPE,
        },
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        ticketId: true,
        submittedAt: true,
        courseLabel: true,
        ticket: {
          select: {
            ticketNo: true,
            studentName: true,
            owner: true,
            status: true,
            nextAction: true,
            parentAvailability: true,
          },
        },
      },
    }),
  ]);
  const ledgerAlert = parseLedgerIntegrityAlertState(ledgerAlertRow?.value);
  const academicPackages = packages;
  const activePackageStudentIds = Array.from(new Set(academicPackages.map((p) => p.studentId).filter(Boolean)));
  const scheduleLookaheadEnd = new Date(now);
  scheduleLookaheadEnd.setDate(scheduleLookaheadEnd.getDate() + STUDENT_SCHEDULE_LOOKAHEAD_DAYS);
  const activePackageStudentIdSet = new Set(activePackageStudentIds);
  const upcomingStudentSessions = activePackageStudentIds.length
    ? await prisma.session.findMany({
        where: {
          startAt: { gte: now, lt: scheduleLookaheadEnd },
          OR: [
            { studentId: { in: activePackageStudentIds } },
            { class: { oneOnOneStudentId: { in: activePackageStudentIds } } },
            { class: { enrollments: { some: { studentId: { in: activePackageStudentIds } } } } },
          ],
        },
        include: {
          student: { select: { id: true, name: true } },
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              oneOnOneStudent: { select: { id: true, name: true } },
              enrollments: { select: { studentId: true, student: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { startAt: "asc" },
        take: 1000,
      })
    : [];
  const nextSessionByStudentId = new Map<string, (typeof upcomingStudentSessions)[number]>();
  for (const session of upcomingStudentSessions) {
    const ids = new Set<string>();
    if (session.studentId && activePackageStudentIdSet.has(session.studentId)) ids.add(session.studentId);
    if (session.class.oneOnOneStudentId && activePackageStudentIdSet.has(session.class.oneOnOneStudentId)) {
      ids.add(session.class.oneOnOneStudentId);
    }
    for (const enrollment of session.class.enrollments) {
      if (activePackageStudentIdSet.has(enrollment.studentId)) ids.add(enrollment.studentId);
    }
    for (const sid of ids) {
      if (!nextSessionByStudentId.has(sid)) nextSessionByStudentId.set(sid, session);
    }
  }
  const activePackageByStudent = new Map<string, {
    student: (typeof packages)[number]["student"];
    packageCount: number;
    totalRemainingMinutes: number;
    settlementModes: Array<string | null>;
  }>();
  for (const p of academicPackages) {
    if (!p.student) continue;
    const existing = activePackageByStudent.get(p.studentId) ?? {
      student: p.student,
      packageCount: 0,
      totalRemainingMinutes: 0,
      settlementModes: [],
    };
    existing.packageCount += 1;
    existing.totalRemainingMinutes += p.remainingMinutes ?? 0;
    existing.settlementModes.push(p.settlementMode ?? null);
    activePackageByStudent.set(p.studentId, existing);
  }
  const academicManagementAlerts = Array.from(activePackageByStudent.entries())
    .map(([studentId, row]) => {
      const nextSession = nextSessionByStudentId.get(studentId) ?? null;
      const nextActionDue = row.student?.nextActionDue ? new Date(row.student.nextActionDue) : null;
      const actionDueSoon = Boolean(nextActionDue && nextActionDue.getTime() <= scheduleLookaheadEnd.getTime());
      const noUpcomingSession = !nextSession;
      const highRisk = row.student?.academicRiskLevel === "HIGH";
      const profileIncomplete = isAcademicProfileIncomplete(row.student ?? {});
      const monthlyReportNeeded = requiresMonthlyAcademicReport(row.student?.servicePlanType);
      const studentLane = studentAcademicStudentLane({ studentTypeName: row.student?.studentType?.name });
      const packageWarning = academicLanePackageWarning({
        studentTypeName: row.student?.studentType?.name,
        settlementModes: row.settlementModes,
      });
      const needsAttention = noUpcomingSession || actionDueSoon || (highRisk && !nextSession) || profileIncomplete || monthlyReportNeeded;
      return {
        studentId,
        ...row,
        nextSession,
        nextActionDue,
        actionDueSoon,
        noUpcomingSession,
        highRisk,
        profileIncomplete,
        profileCompleteness: academicProfileCompleteness(row.student ?? {}),
        monthlyReportNeeded,
        studentLane,
        packageWarning,
        needsAttention,
      };
    })
    .filter((row) => row.needsAttention)
    .sort((a, b) => {
      if (a.highRisk !== b.highRisk) return a.highRisk ? -1 : 1;
      if (a.noUpcomingSession !== b.noUpcomingSession) return a.noUpcomingSession ? -1 : 1;
      const ad = a.nextActionDue?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bd = b.nextActionDue?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });
  const academicManagementAlertRows: AcademicAlertRow[] = academicManagementAlerts.map((row) => ({
    studentId: row.studentId,
    studentName: row.student?.name ?? "-",
    remainingLabel: `${t(lang, "Remaining", "剩余")}: ${fmtMinutes(row.totalRemainingMinutes)}`,
    lane: row.studentLane,
    laneLabel: academicStudentLaneLabel(row.studentLane),
    studentTypeLabel: row.student?.studentType?.name ?? row.student?.sourceChannel?.name ?? "-",
    packageWarning: row.packageWarning,
    riskLabel: academicRiskLabel(row.student?.academicRiskLevel),
    riskColor: row.highRisk ? "#be123c" : row.student?.academicRiskLevel === "MEDIUM" ? "#c2410c" : "#64748b",
    profileLabel: `${t(lang, "Profile", "档案")}: ${row.profileCompleteness.percent}%`,
    profileColor: row.profileIncomplete ? "#c2410c" : "#64748b",
    profileBold: row.profileIncomplete,
    servicePlanLabel: servicePlanLabel(row.student?.servicePlanType),
    monthlyReportLabel: row.monthlyReportNeeded ? t(lang, "Monthly report", "需要月报") : null,
    nextLessonLabel: row.nextSession
      ? `${formatBusinessDateTime(new Date(row.nextSession.startAt))} | ${courseLabel(row.nextSession.class)}`
      : null,
    noUpcomingLessonLabel: t(lang, "No upcoming lesson", "暂无未来课程"),
    nextAction: row.student?.nextAction || "-",
    nextActionDueLabel: row.nextActionDue ? `${t(lang, "Due", "截止")}: ${formatBusinessDateOnly(row.nextActionDue)}` : null,
    nextActionDueColor: row.actionDueSoon ? "#be123c" : "#64748b",
    nextActionDueBold: row.actionDueSoon,
    ownerLabel: row.student?.advisorOwner || "-",
    actionLabel: t(lang, "Student Detail", "学生详情"),
  }));
  const packageIds = packages.map((p) => p.id);
  const deductedRows = packageIds.length
    ? await prisma.packageTxn.groupBy({
        by: ["packageId"],
        where: {
          packageId: { in: packageIds },
          kind: "DEDUCT",
          createdAt: { gte: usageSince },
        },
        _sum: { deltaMinutes: true },
      })
    : [];
  const deducted30Map = new Map(deductedRows.map((r) => [r.packageId, Math.abs(Math.min(0, r._sum.deltaMinutes ?? 0))]));

  const renewAlerts = packages
    .map((p) => {
      const remaining = p.remainingMinutes ?? 0;
      const deducted30 = deducted30Map.get(p.id) ?? 0;
      const avgPerDay = deducted30 / FORECAST_WINDOW_DAYS;
      const estDays = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;
      const lowMinutes = remaining <= warnMinutes;
      const lowDays = estDays != null && estDays <= warnDays;
      const isAlert = lowMinutes || lowDays;
      return { p, remaining, deducted30, estDays, lowMinutes, lowDays, isAlert };
    })
    .filter((x) => x.isAlert)
    .sort((a, b) => {
      const da = a.estDays ?? Number.MAX_SAFE_INTEGER;
      const db = b.estDays ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return a.remaining - b.remaining;
    });

  const [monthSessions, monthAppointments] = includeConflicts
    ? await Promise.all([
        prisma.session.findMany({
          where: { startAt: { gte: monthStart, lt: monthEnd } },
          include: {
            teacher: true,
            class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
          },
          orderBy: { startAt: "asc" },
        }),
        prisma.appointment.findMany({
          where: { startAt: { gte: monthStart, lt: monthEnd } },
          include: { teacher: true, student: true },
          orderBy: { startAt: "asc" },
        }),
      ])
    : [[], []];

  const conflicts: Array<{
    type: string;
    time: string;
    entity: string;
    detail: string;
  }> = [];

  const sessionsByTeacher = new Map<string, typeof monthSessions>();
  const sessionsByRoom = new Map<string, typeof monthSessions>();
  for (const s of monthSessions) {
    const tid = s.teacherId ?? s.class.teacherId;
    const tArr = sessionsByTeacher.get(tid) ?? [];
    tArr.push(s);
    sessionsByTeacher.set(tid, tArr);

    const roomId = s.class.roomId;
    if (roomId) {
      const rArr = sessionsByRoom.get(roomId) ?? [];
      rArr.push(s);
      sessionsByRoom.set(roomId, rArr);
    }
  }

  for (const list of sessionsByTeacher.values()) {
    const sorted = list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (new Date(b.startAt) < new Date(a.endAt)) {
        const teacherName = a.teacher?.name ?? a.class.teacher.name;
        conflicts.push({
          type: "老师课次重叠 / Teacher Session Overlap",
          time: `${fmtDateRange(new Date(a.startAt), new Date(a.endAt))} & ${fmtDateRange(
            new Date(b.startAt),
            new Date(b.endAt)
          )}`,
          entity: teacherName,
          detail: `${courseLabel(a.class)} | ${courseLabel(b.class)}`,
        });
      }
    }
  }

  for (const list of sessionsByRoom.values()) {
    const sorted = list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (new Date(b.startAt) < new Date(a.endAt)) {
        const roomName = a.class.room?.name ?? "Room";
        conflicts.push({
          type: "教室课次重叠 / Room Session Overlap",
          time: `${fmtDateRange(new Date(a.startAt), new Date(a.endAt))} & ${fmtDateRange(
            new Date(b.startAt),
            new Date(b.endAt)
          )}`,
          entity: roomName,
          detail: `${courseLabel(a.class)} | ${courseLabel(b.class)}`,
        });
      }
    }
  }

  const apptsByTeacher = new Map<string, typeof monthAppointments>();
  for (const a of monthAppointments) {
    const arr = apptsByTeacher.get(a.teacherId) ?? [];
    arr.push(a);
    apptsByTeacher.set(a.teacherId, arr);
  }
  for (const [tid, appts] of apptsByTeacher.entries()) {
    const sessions = (sessionsByTeacher.get(tid) ?? []).sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    const sortedAppts = appts.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    let i = 0;
    let j = 0;
    while (i < sessions.length && j < sortedAppts.length) {
      const s = sessions[i];
      const a = sortedAppts[j];
      const sStart = new Date(s.startAt);
      const sEnd = new Date(s.endAt);
      const aStart = new Date(a.startAt);
      const aEnd = new Date(a.endAt);
      if (aEnd <= sStart) {
        j += 1;
        continue;
      }
      if (sEnd <= aStart) {
        i += 1;
        continue;
      }
      const teacherName = s.teacher?.name ?? s.class.teacher.name;
      conflicts.push({
        type: "老师预约重叠 / Teacher Appointment Overlap",
        time: `${fmtDateRange(sStart, sEnd)} & ${fmtDateRange(aStart, aEnd)}`,
        entity: teacherName,
        detail: `${courseLabel(s.class)} | ${a.student?.name ?? "预约 / Appointment"}`,
      });
      if (sEnd <= aEnd) i += 1;
      else j += 1;
    }
  }

  const conflictList = conflicts.slice(0, 200);
  const confirmDateStr = `${confirmDate.getFullYear()}-${String(confirmDate.getMonth() + 1).padStart(2, "0")}-${String(
    confirmDate.getDate()
  ).padStart(2, "0")}`;
  const teacherIds = teacherRemindersPending.map((r) => r.id).join(",");
  const studentIds = studentRemindersPending.map((r) => r.id).join(",");
  const undeductedRows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    WITH completed_sessions AS (
      SELECT
        s.id AS session_id,
        COALESCE(s."teacherId", c."teacherId") AS effective_teacher_id
      FROM "Session" s
      JOIN "Class" c ON c.id = s."classId"
      WHERE EXISTS (SELECT 1 FROM "Attendance" a WHERE a."sessionId" = s.id)
        AND NOT EXISTS (
          SELECT 1 FROM "Attendance" a
          WHERE a."sessionId" = s.id
            AND a.status = 'UNMARKED'
        )
        AND EXISTS (
          SELECT 1 FROM "SessionFeedback" f
          WHERE f."sessionId" = s.id
            AND f."teacherId" = COALESCE(s."teacherId", c."teacherId")
            AND length(trim(COALESCE(f.content, ''))) > 0
        )
    )
    SELECT COUNT(*)::bigint AS cnt
    FROM completed_sessions cs
    JOIN "Attendance" a ON a."sessionId" = cs.session_id
    WHERE a.status IN ('PRESENT', 'LATE', 'ABSENT')
      AND COALESCE(a."deductedMinutes", 0) = 0
      AND COALESCE(a."deductedCount", 0) = 0
      AND COALESCE(a."waiveDeduction", false) = false
  `;
  const undeductedCompletedCount = Number(undeductedRows[0]?.cnt ?? 0n);

  const sectionStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
    marginBottom: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  } as const;
  const reminderStyle = {
    border: "2px solid #bfdbfe",
    borderRadius: 12,
    padding: 14,
    background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
    marginBottom: 16,
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.08)",
  } as const;
  const heroStyle = {
    ...workbenchHeroStyle("amber"),
    border: "2px solid #f59e0b",
    boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)",
  } as const;
  const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  } as const;
  const detailLineStyle = {
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.4,
  } as const;
  const summaryCardStyle = {
    display: "grid",
    gap: 4,
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
  } as const;
  const todoSectionLinkStyle = (background: string, border: string) =>
    ({
      display: "grid",
      gap: 4,
      minWidth: 170,
      padding: "10px 12px",
      borderRadius: 12,
      border: `1px solid ${border}`,
      background,
      textDecoration: "none",
      color: "inherit",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    }) as const;
  const pageWrapStyle = {
    display: "grid",
    gap: 16,
  } as const;
  const tableStyle = { borderCollapse: "collapse", width: "100%" } as const;
  const todoHref = (extra: Record<string, string | number | null | undefined>) => {
    const p = new URLSearchParams();
    p.set("warnDays", String(warnDays));
    p.set("warnMinutes", String(warnMinutes));
    p.set("pastDays", String(pastDays));
    if (pastPage) p.set("pastPage", String(pastPage));
    if (showConfirmed) p.set("showConfirmed", "1");
    if (includeConflicts) p.set("includeConflicts", "1");
    if (academicLane !== "all") p.set("academicLane", academicLane);
    Object.entries(extra).forEach(([k, v]) => {
      if (v == null || v === "") p.delete(k);
      else p.set(k, String(v));
    });
    return `/admin/todos?${p.toString()}`;
  };
  const overdueUnmarkedSessionCount = overdueUnmarkedGroups.reduce((sum, group) => sum + group.count, 0);
  const reminderPendingCount = teacherRemindersPending.length + studentRemindersPending.length;
  const systemRiskCount =
    (ledgerAlert?.totalIssueCount ?? 0) +
    dailyConflictAudit.totalIssues +
    undeductedCompletedCount;
  const quickJumpItems = [
    sessionsToday.length > 0
      ? {
          href: "#todo-today-focus",
          label: t(lang, "Open today's attendance queue", "打开今日点名队列"),
          detail: t(lang, `${sessionsToday.length} sessions need marking`, `还有${sessionsToday.length}节课待点名`),
        }
      : null,
    overdueUnmarkedSessionCount > 0
      ? {
          href: "#todo-overdue-follow-up",
          label: t(lang, "Open overdue follow-up", "打开超时跟进"),
          detail: t(
            lang,
            `${overdueUnmarkedSessionCount} sessions need escalation`,
            `还有${overdueUnmarkedSessionCount}节课需要催办`
          ),
        }
      : null,
    systemRiskCount > 0
      ? {
          href: "#todo-system-checks",
          label: t(lang, "Open system checks", "打开系统巡检"),
          detail: t(lang, `${systemRiskCount} risks need review`, `还有${systemRiskCount}项系统风险待看`),
        }
      : null,
    reminderPendingCount > 0
      ? {
          href: "#todo-reminder-desk",
          label: t(lang, "Open reminder desk", "打开提醒台"),
          detail: t(lang, `${reminderPendingCount} reminders are still pending`, `还有${reminderPendingCount}项提醒待确认`),
        }
      : null,
  ].filter(
    (
      item
    ): item is {
      href: string;
      label: string;
      detail: string;
    } => Boolean(item)
  );
  const todoFocusTitle =
    sessionsToday.length > 0
      ? t(lang, "Start with today's attendance queue", "先清今天的点名队列")
      : overdueUnmarkedSessionCount > 0
        ? t(lang, "Overdue follow-up is now the first stop", "当前应先处理超时跟进")
        : systemRiskCount > 0
          ? t(lang, "System checks are the next useful stop", "下一步适合先看系统巡检")
          : reminderPendingCount > 0
            ? t(lang, "Reminder desk is the next useful stop", "下一步适合先看提醒台")
            : t(lang, "Todo center is relatively clear", "待办中心目前相对清爽");
  const todoFocusDetail =
    sessionsToday.length > 0
      ? t(lang, "The top attendance queue still has unmarked sessions, so finish that before secondary work.", "顶部点名队列还有未处理课次，建议先清这一条，再做次级工作。")
      : overdueUnmarkedSessionCount > 0
        ? t(lang, "Today is clear, but older attendance gaps still need escalation and follow-up.", "今天的点名已经清掉，但历史未点名还需要催办。")
        : systemRiskCount > 0
          ? t(lang, "Only after the live queues are clear should you spend time on ledger, conflict, or deduction repair.", "只有实时队列清掉后，才建议把时间花在对账、冲突和减扣修复上。")
          : t(lang, "Nothing urgent is blocking operations right now, so you can use reminders and renewals as cleanup lanes.", "当前没有紧急阻塞项，可以把提醒和续费预警当作清尾工作。");
  const todoWorkMapLinks = [
    {
      href: "#todo-today-focus",
      label: t(lang, "Today queue", "今日队列"),
      detail: t(lang, `${sessionsToday.length} need attendance`, `${sessionsToday.length} 条待点名`),
      background: sessionsToday.length > 0 ? "#fff7ed" : "#ffffff",
      border: sessionsToday.length > 0 ? "#fdba74" : "#dbe4f0",
    },
    {
      href: "#todo-overdue-follow-up",
      label: t(lang, "Overdue follow-up", "超时跟进"),
      detail: t(lang, `${overdueUnmarkedSessionCount} overdue session(s)`, `${overdueUnmarkedSessionCount} 条超时课次`),
      background: overdueUnmarkedSessionCount > 0 ? "#fff7ed" : "#ffffff",
      border: overdueUnmarkedSessionCount > 0 ? "#fdba74" : "#dbe4f0",
    },
    {
      href: "#todo-scheduling-coordination",
      label: t(lang, "Scheduling follow-up", "排课跟进"),
      detail: t(lang, `${schedulingCoordinationRows.length} coordination row(s)`, `${schedulingCoordinationRows.length} 条协调跟进`),
      background: schedulingCoordinationRows.length > 0 ? "#eff6ff" : "#ffffff",
      border: schedulingCoordinationRows.length > 0 ? "#bfdbfe" : "#dbe4f0",
    },
    {
      href: "#todo-reminder-desk",
      label: t(lang, "Reminder desk", "提醒台"),
      detail: t(lang, `${reminderPendingCount} reminder(s) pending`, `${reminderPendingCount} 项提醒待确认`),
      background: reminderPendingCount > 0 ? "#eff6ff" : "#ffffff",
      border: reminderPendingCount > 0 ? "#bfdbfe" : "#dbe4f0",
    },
    {
      href: "#todo-system-checks",
      label: t(lang, "System checks", "系统巡检"),
      detail: t(lang, `${systemRiskCount} risk item(s)`, `${systemRiskCount} 项系统风险`),
      background: systemRiskCount > 0 ? "#fff7f7" : "#ffffff",
      border: systemRiskCount > 0 ? "#fecaca" : "#dbe4f0",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <RememberedWorkbenchQueryClient
        cookieKey={TODO_DESK_COOKIE}
        storageKey="adminTodosDesk"
        value={rememberedDeskValue}
      />
      <WorkbenchScrollMemoryClient storageKey="adminTodosScroll" />
      <div
        style={{
          ...workbenchHeroStyle("amber"),
          padding: 18,
          marginBottom: 0,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e", letterSpacing: 0.4 }}>
          {t(lang, "Today First", "今天先处理")}
        </div>
        <h2 style={{ margin: "6px 0 0" }}>{t(lang, "Todo Center", "待办中心")}</h2>
        <p style={{ color: "#475569", lineHeight: 1.5, margin: "8px 0 0" }}>
          {t(
            lang,
            "This page works best when the first screen only answers three questions: what needs action now, what is blocked, and what can wait until after today's queue is clear.",
            "这个页面最好先回答三个问题：现在最该处理什么、哪里被阻塞了、哪些可以等今天队列清完再看。"
          )}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ ...workbenchMetricCardStyle("amber"), ...summaryCardStyle, background: "#fff7ed" }}>
          <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Need attendance", "待点名")}</div>
          <div style={workbenchMetricValueStyle("amber")}>{sessionsToday.length}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Today's sessions that still need marking.", "今天仍需完成点名的课次。")}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle("amber"), ...summaryCardStyle, background: "#fff7ed" }}>
          <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Overdue follow-up", "超时跟进")}</div>
          <div style={workbenchMetricValueStyle("amber")}>{overdueUnmarkedSessionCount}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Older unmarked sessions that need escalation.", "需要催办的历史未点名课次。")}</div>
        </div>
        <div
          style={{
            ...workbenchMetricCardStyle(systemRiskCount > 0 ? "rose" : "emerald"),
            ...summaryCardStyle,
            background: systemRiskCount > 0 ? "#fff1f2" : "#f0fdf4",
          }}
        >
          <div style={workbenchMetricLabelStyle(systemRiskCount > 0 ? "rose" : "emerald")}>{t(lang, "System risks", "系统风险")}</div>
          <div style={workbenchMetricValueStyle(systemRiskCount > 0 ? "rose" : "emerald")}>{systemRiskCount}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Ledger, conflict, and deduction repair issues.", "对账、冲突和减扣修复类问题。")}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle("blue"), ...summaryCardStyle, background: "#eff6ff" }}>
          <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Reminder desk", "提醒台")}</div>
          <div style={workbenchMetricValueStyle("blue")}>{reminderPendingCount}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Teacher and student reminders still pending.", "老师和学生提醒中仍待确认的项。")}</div>
        </div>
      </div>

      <section
        style={{
          ...workbenchInfoBarStyle,
          marginBottom: 0,
          ...workbenchStickyPanelStyle(),
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{t(lang, "Todo work map", "待办工作地图")}</div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            <b>{todoFocusTitle}</b> {todoFocusDetail}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {todoWorkMapLinks.map((item) => todoWorkMapAnchor(item.href, item.label, item.detail, item.background, item.border))}
        </div>
      </section>

      {resumedRememberedDesk ? (
        <WorkbenchActionBanner
          tone="warn"
          title={t(lang, "Resumed your last todo desk", "已恢复你上次使用的待办工作台")}
          description={t(
            lang,
            "This page reopened with your last reminder thresholds and desk toggles because you came back without explicit filters.",
            "你这次没有显式指定筛选，所以系统自动恢复了你上次使用的提醒阈值和工作台开关。"
          )}
          actions={[{ href: "/admin/todos?clearDesk=1", label: t(lang, "Back to default desk", "回到默认工作台") }]}
        />
      ) : null}

      {quickJumpItems.length > 0 ? (
        <WorkbenchActionBanner
          tone="info"
          title={t(lang, "Next step shortcuts", "下一步快捷入口")}
          description={t(
            lang,
            "Jump straight back to the section that most likely needs your next click.",
            "直接跳回最可能需要你下一步处理的区块。"
          )}
          actions={quickJumpItems.map((item) => ({ href: item.href, label: item.label }))}
        />
      ) : null}

      <details
        id="todo-system-checks"
        open={Boolean((ledgerAlert?.totalIssueCount ?? 0) > 0 || dailyConflictAudit.totalIssues > 0)}
        style={{ ...sectionStyle, marginBottom: 0, background: "#fcfcfd", scrollMarginTop: 104 }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>
          {t(lang, "System Checks & Risks", "系统巡检与风险")}
        </summary>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {ledgerAlert && ledgerAlert.totalIssueCount > 0 ? (
            <div
              style={{
                border: "2px solid #ef4444",
                borderRadius: 12,
                padding: 12,
                background: "#fff1f2",
                boxShadow: "0 2px 6px rgba(239, 68, 68, 0.15)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>
                {t(lang, "Ledger Integrity Alert", "课包对账告警")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>
                {t(lang, `${ledgerAlert.totalIssueCount} issues found`, `发现${ledgerAlert.totalIssueCount}个异常`)}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                {t(lang, "Mismatch", "流水不匹配")}: {ledgerAlert.mismatchCount} ·{" "}
                {t(lang, "No package binding", "无课包绑定扣减")}: {ledgerAlert.noPackageDeductCount} ·{" "}
                {t(lang, "Updated", "更新时间")}: {formatBusinessDateTime(new Date(ledgerAlert.generatedAt))}
              </div>
              <div style={{ marginTop: 8 }}>
                <a href="/admin/reports/undeducted-completed">{t(lang, "Open Repair Report", "打开减扣修复报表")}</a>
              </div>
            </div>
          ) : null}

          <div
            style={{
              border: dailyConflictAudit.totalIssues > 0 ? "2px solid #ef4444" : "2px solid #22c55e",
              borderRadius: 12,
              padding: 12,
              background: dailyConflictAudit.totalIssues > 0 ? "#fff1f2" : "#f0fdf4",
              boxShadow:
                dailyConflictAudit.totalIssues > 0
                  ? "0 2px 6px rgba(239, 68, 68, 0.15)"
                  : "0 2px 6px rgba(34, 197, 94, 0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: dailyConflictAudit.totalIssues > 0 ? "#991b1b" : "#166534" }}>
                  {t(lang, "Daily Conflict Audit", "每日冲突巡检")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: dailyConflictAudit.totalIssues > 0 ? "#991b1b" : "#166534" }}>
                  {dailyConflictAudit.totalIssues > 0
                    ? t(lang, `${dailyConflictAudit.totalIssues} issues found`, `发现${dailyConflictAudit.totalIssues}个问题`)
                    : t(lang, "No issues found", "未发现问题")}
                </div>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  {t(lang, "Range", "范围")}: {dailyConflictAudit.scannedFrom} ~ {dailyConflictAudit.scannedTo}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <a
                  href={`/admin/conflicts?${new URLSearchParams({
                    from: dailyConflictAudit.scannedFrom,
                    to: dailyConflictAudit.scannedTo,
                  }).toString()}`}
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: dailyConflictAudit.totalIssues > 0 ? "1px solid #ef4444" : "1px solid #16a34a",
                    background: "#fff",
                    color: dailyConflictAudit.totalIssues > 0 ? "#991b1b" : "#166534",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {t(lang, "Open Conflict Desk", "去冲突处理")}
                </a>
                <AdminTodosOpsClient
                  payload={{
                    warnDays: String(warnDays),
                    warnMinutes: String(warnMinutes),
                    pastDays: String(pastDays),
                    showConfirmed: showConfirmed ? "1" : "",
                  }}
                  labels={{
                    ok: t(lang, "OK", "成功"),
                    error: t(lang, "Error", "错误"),
                    recheckNow: t(lang, "Recheck Now", "立即复检"),
                    runNow: t(lang, "Run Now", "立即执行"),
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
              {dailyConflictAudit.sample.join(" | ")}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: 12,
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  {t(lang, "Teacher Conflict Auto-fix Log", "老师冲突自动修复日志")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  {lastAutoFix?.day === todayYmd
                    ? t(lang, "Auto-fix ran today", "今日已执行自动修复")
                    : t(lang, "Auto-fix not run today", "今日未执行自动修复")}
                </div>
              </div>
            </div>
            {lastAutoFix?.result ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#334155", display: "grid", gap: 2 }}>
                <div>
                  {t(lang, "Last run date", "最近执行日期")}: {lastAutoFix.day ?? "-"}
                </div>
                <div>
                  {t(lang, "Detected pairs", "检测冲突对")}: {lastAutoFix.result.detectedPairs} | {t(lang, "Fixed sessions", "已修复课次")}:{" "}
                  {lastAutoFix.result.fixedSessions} | {t(lang, "Skipped pairs", "跳过冲突对")}: {lastAutoFix.result.skippedPairs}
                </div>
                <div>{lastAutoFix.result.notes.slice(0, 3).join(" | ") || t(lang, "No notes", "无备注")}</div>
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                {t(lang, "No auto-fix run record yet.", "暂无自动修复执行记录。")}
              </div>
            )}
          </div>
        </div>
      </details>

      <div id="todo-today-focus" style={{ ...heroStyle, scrollMarginTop: 104 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>{t(lang, "Today Focus", "今日重点")}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {t(lang, "Unmarked Sessions", "未点名课次")}: {sessionsToday.length}
            </div>
          </div>
          <div style={{ color: "#92400e", fontSize: 12 }}>
            {t(lang, "Date", "日期")}: {formatBusinessDateOnly(new Date())}
          </div>
        </div>

        {sessionsToday.length === 0 ? (
          <div style={{ marginTop: 10, color: "#92400e", border: "1px solid #fde68a", borderRadius: 10, background: "#fffbeb", padding: 10, display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Today's attendance queue is clear", "今天的点名队列已清空")}</div>
            <div style={{ fontSize: 13 }}>
              {t(lang, "Next, check overdue follow-up or reminder desk only if you still have operations time.", "接下来只有在还有运营处理时间时，再看超时跟进或提醒台。")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="#todo-overdue-follow-up">{t(lang, "Check overdue follow-up", "查看超时跟进")}</a>
              <a href="#todo-reminder-desk">{t(lang, "Open reminder desk", "打开提醒台")}</a>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <table cellPadding={8} style={tableStyle}>
              <thead>
                <tr style={{ background: "#fde68a" }}>
                  <th align="left">{t(lang, "Session Time", "课次时间")}</th>
                  <th align="left">{t(lang, "Class", "班级")}</th>
                  <th align="left">{t(lang, "Teacher", "老师")}</th>
                  <th align="left">{t(lang, "Campus", "校区")}</th>
                  <th align="left">{t(lang, "Unmarked", "未点名")}</th>
                  <th align="left">{t(lang, "Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {sessionsToday.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #fcd34d" }}>
                    <td>
                      {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <ClassTypeBadge capacity={s.class.capacity} compact />
                        <span>
                          {s.class.course.name}
                          {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                          {s.class.level ? ` / ${s.class.level.name}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>{s.class.teacher.name}</td>
                    <td>
                      {s.class.campus.name}
                      {s.class.room ? ` / ${s.class.room.name}` : ""}
                    </td>
                    <td>
                      <span style={{ color: "#b00", fontWeight: 700 }}>{unmarkedMap.get(s.id) ?? 0}</span>
                    </td>
                    <td>
                      <a href={attendanceFromTodoHref(s.id, "#todo-today-focus")}>{t(lang, "Go Attendance", "去点名")}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        id="todo-overdue-follow-up"
        style={{ ...sectionStyle, borderColor: "#fdba74", background: "linear-gradient(180deg, #fff7ed 0%, #fff 100%)", scrollMarginTop: 104 }}
      >
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0 }}>{t(lang, "Overdue Unmarked Follow-up", "超时未点名催办")}</h3>
          <span style={{ color: "#9a3412", fontSize: 12 }}>
            {t(lang, "Threshold", "提醒阈值")}: 3h
          </span>
        </div>
        {overdueUnmarkedGroups.length === 0 ? (
          <div style={{ color: "#166534", border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", padding: 10 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "No overdue attendance follow-up", "当前没有超时点名催办")}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {t(lang, "This means the delayed-attendance lane is clear. Continue with scheduling coordination or reminders if needed.", "说明延迟点名这一条线已经清空；如有需要再继续看排课协调或提醒台。")}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            {overdueUnmarkedGroups.map((group) => (
              <div key={group.teacherId} style={{ border: "1px solid #fdba74", borderRadius: 10, background: "#fff", padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{group.teacherName}</div>
                  <div style={{ color: "#c2410c", fontWeight: 700 }}>{group.count} {t(lang, "sessions", "节")}</div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {group.items.map((item) => (
                    <div key={item.id} style={{ border: "1px solid #fed7aa", borderRadius: 8, background: "#fffaf0", padding: 8, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                        <b>{formatBusinessDateOnly(new Date(item.startAt))}</b>
                        <span style={{ color: "#b91c1c", fontWeight: 700 }}>{item.overdueLabel}</span>
                      </div>
                      <div style={detailLineStyle}>{formatBusinessTimeOnly(new Date(item.startAt))} - {formatBusinessTimeOnly(new Date(item.endAt))}</div>
                      <div style={detailLineStyle}>{item.courseLabel}</div>
                      <div style={detailLineStyle}>{t(lang, "Students", "学生")}: {listWithLimit(item.studentNames, 3)}</div>
                      <div style={detailLineStyle}>{t(lang, "Unmarked", "未点名")}: {item.unmarkedCount}</div>
                      <a href={attendanceFromTodoHref(item.id, "#todo-overdue-follow-up")}>{t(lang, "Go Attendance", "去点名")}</a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        id="todo-scheduling-coordination"
        style={{ ...sectionStyle, borderColor: "#93c5fd", background: "linear-gradient(180deg, #eff6ff 0%, #fff 100%)", scrollMarginTop: 104 }}
      >
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0 }}>{t(lang, "Scheduling Coordination Follow-up", "排课协调跟进")}</h3>
          <span style={{ color: "#1d4ed8", fontSize: 12 }}>
            {t(lang, "Window", "观察窗口")}: 48h
          </span>
        </div>
        {schedulingCoordinationRows.length === 0 ? (
          <div style={{ color: "#166534", border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", padding: 10 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "No scheduling coordination follow-up is due soon", "近期没有到期的排课协调跟进")}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {t(lang, "Nothing in this 48-hour lane needs action. Use the parent-submission lane below only when a new form arrives.", "48 小时窗口内没有需要处理的项；只有家长新提交表单时，再看下面的提交队列。")}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            {schedulingCoordinationRows.map((row) => {
              const isOverdue = !!row.nextActionDue && row.nextActionDue.getTime() < now.getTime();
              const phase = deriveSchedulingCoordinationPhase({
                ticketStatus: row.status,
                hasParentForm: Boolean(row.parentAvailabilityRequest),
                parentSubmittedAt: row.parentAvailabilityRequest?.submittedAt ?? null,
                parentAvailabilitySummary: row.parentAvailability ?? null,
              });
              return (
                <div key={row.id} style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{row.ticketNo}</div>
                    <div style={{ color: isOverdue ? "#b91c1c" : "#1d4ed8", fontSize: 12, fontWeight: 700 }}>
                      {isOverdue ? t(lang, "Overdue", "已超时") : t(lang, "Due soon", "即将到期")}
                    </div>
                  </div>
                  <div style={detailLineStyle}>{t(lang, "Student", "学生")}: {row.studentName}</div>
                  <div style={detailLineStyle}>{t(lang, "Owner", "负责人")}: {row.owner ?? t(lang, "Unassigned", "未分配")}</div>
                  <div style={detailLineStyle}>{t(lang, "Status", "状态")}: {todoTicketStatusLabel(lang, row.status)}</div>
                  <div style={detailLineStyle}>{t(lang, "Phase", "协调阶段")}: {phase.title}</div>
                  <div style={detailLineStyle}>{t(lang, "Next step", "下一步")}: {row.nextAction ?? "-"}</div>
                  <div style={detailLineStyle}>
                    {t(lang, "Due", "截止")}: {row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "-"}
                  </div>
                  <a href={ticketFromTodoHref(row.id, "#todo-scheduling-coordination")}>
                    {t(lang, "Open ticket", "打开工单")}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        id="todo-parent-availability-submitted"
        style={{ ...sectionStyle, borderColor: "#86efac", background: "linear-gradient(180deg, #f0fdf4 0%, #fff 100%)" }}
      >
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0 }}>{t(lang, "Parent Availability Submitted", "家长时间表单已提交")}</h3>
          <span style={{ color: "#166534", fontSize: 12 }}>
            {t(lang, "Needs scheduling follow-up", "待教务继续处理")}
          </span>
        </div>
        {submittedParentAvailabilityRows.length === 0 ? (
          <div style={{ color: "#166534", border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", padding: 10 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "No new parent availability submission is waiting", "当前没有新的家长时间表单待处理")}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {t(lang, "If a parent says they submitted but it is not here, open the related ticket and check the parent-form timestamp.", "如果家长说已经提交但这里没出现，请打开相关工单检查家长表单提交时间。")}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            {submittedParentAvailabilityRows.map((row) => (
              (() => {
                const phase = deriveSchedulingCoordinationPhase({
                  ticketStatus: row.ticket.status ?? "Need Info",
                  hasParentForm: true,
                  parentSubmittedAt: row.submittedAt,
                  parentAvailabilitySummary: row.ticket.parentAvailability ?? null,
                });
                return (
                  <div key={row.ticketId} style={{ border: "1px solid #bbf7d0", borderRadius: 10, background: "#fff", padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ fontWeight: 700 }}>{row.ticket.ticketNo}</div>
                      <div style={{ color: "#166534", fontSize: 12, fontWeight: 700 }}>
                        {t(lang, "Submitted", "已提交")}
                      </div>
                    </div>
                    <div style={detailLineStyle}>{t(lang, "Student", "学生")}: {row.ticket.studentName}</div>
                    <div style={detailLineStyle}>{t(lang, "Course", "课程")}: {row.courseLabel || "-"}</div>
                    <div style={detailLineStyle}>{t(lang, "Owner", "负责人")}: {row.ticket.owner ?? t(lang, "Unassigned", "未分配")}</div>
                    <div style={detailLineStyle}>{t(lang, "Submitted at", "提交时间")}: {row.submittedAt ? formatBusinessDateTime(row.submittedAt) : "-"}</div>
                    <div style={detailLineStyle}>{t(lang, "Status", "状态")}: {todoTicketStatusLabel(lang, row.ticket.status ?? "Need Info")}</div>
                    <div style={detailLineStyle}>{t(lang, "Phase", "协调阶段")}: {phase.title}</div>
                    <div style={detailLineStyle}>{t(lang, "Next step", "下一步")}: {row.ticket.nextAction ?? "-"}</div>
                    <a href={ticketFromTodoHref(row.ticketId, "#todo-parent-availability-submitted")}>
                      {t(lang, "Open ticket", "打开工单")}
                    </a>
                  </div>
                );
              })()
            ))}
          </div>
        )}
      </div>

      <details id="todo-reminder-desk" style={{ ...sectionStyle, marginBottom: 0, scrollMarginTop: 104 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>
          {t(lang, "Reminder Desk & Supporting Views", "提醒台与辅助视图")}
        </summary>
        <div style={{ marginTop: 14, display: "grid", gap: 16 }}>
      <div style={{ ...sectionStyle, borderColor: "#fca5a5", background: "linear-gradient(180deg, #fff5f5 0%, #fff 100%)", marginBottom: 0 }}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0 }}>{t(lang, "Yesterday Unmarked Details", "昨日未点名明细")}</h3>
          <span style={{ color: "#666", fontSize: 12 }}>
            {t(lang, "Unmarked Session Count", "未点名课次数")}: {sessionsYesterday.length}
          </span>
        </div>
        {sessionsYesterday.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No unmarked sessions yesterday.", "昨天没有未点名课次。")}</div>
        ) : (
          <table cellPadding={8} style={tableStyle}>
            <thead>
              <tr style={{ background: "#fee2e2" }}>
                <th align="left">{t(lang, "Session Time", "课次时间")}</th>
                <th align="left">{t(lang, "Class", "班级")}</th>
                <th align="left">{t(lang, "Teacher", "老师")}</th>
                <th align="left">{t(lang, "Campus", "校区")}</th>
                <th align="left">{t(lang, "Unmarked", "未点名")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
                {sessionsYesterday.map((s) => (
                  <tr key={`y-${s.id}`} style={{ borderTop: "1px solid #fecaca" }}>
                  <td>
                    {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={s.class.capacity} compact />
                      <span>
                        {s.class.course.name}
                        {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                        {s.class.level ? ` / ${s.class.level.name}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>{s.class.teacher.name}</td>
                  <td>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </td>
                  <td>
                    <span style={{ color: "#b00", fontWeight: 700 }}>{unmarkedYesterdayMap.get(s.id) ?? 0}</span>
                  </td>
                  <td>
                    <a href={attendanceFromTodoHref(s.id, "#todo-reminder-desk")}>{t(lang, "Go Attendance", "去点名")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={pageWrapStyle}>
        <div style={{ fontWeight: 700, color: "#1d4ed8", fontSize: 12, letterSpacing: 0.5 }}>
          {t(lang, "Reminders", "重点提醒")}
        </div>

        <div style={{ ...reminderStyle, borderColor: "#93c5fd", background: "#f0f9ff" }}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>{t(lang, "Teacher Course Confirm Status", "老师课程确认状态")}</h3>
            <span style={{ color: "#666", fontSize: 12 }}>
              {t(lang, "Today", "今日")}: {teacherTodayReminders.length} / {t(lang, "Tomorrow", "明日")}: {teacherReminders.length}
            </span>
          </div>
          {teacherTodayReminders.length === 0 && teacherReminders.length === 0 ? (
            <div style={{ color: "#999" }}>{t(lang, "No teacher courses today/tomorrow.", "今日和明日没有老师课次。")}</div>
          ) : (
            <table cellPadding={8} style={tableStyle}>
              <thead>
                <tr style={{ background: "#e0f2fe" }}>
                  <th align="left">{t(lang, "Teacher", "老师")}</th>
                  <th align="left">{t(lang, "Today Confirm", "今日确认")}</th>
                  <th align="left">{t(lang, "Tomorrow Confirm", "明日确认")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  new Map(
                    [...teacherTodayReminders, ...teacherReminders].map((r) => [r.id, { id: r.id, name: r.name }])
                  ).values()
                ).map((r) => {
                  const todayAt = teacherSelfTodayMap.get(r.id);
                  const tomorrowAt = teacherSelfTomorrowMap.get(r.id);
                  return (
                    <tr key={`self-${r.id}`} style={{ borderTop: "1px solid #bae6fd" }}>
                      <td>{r.name}</td>
                      <td style={{ color: todayAt ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                        {todayAt
                          ? `${t(lang, "Confirmed", "已确认")} ${formatBusinessTimeOnly(new Date(todayAt))}`
                          : t(lang, "Not confirmed", "未确认")}
                      </td>
                      <td style={{ color: tomorrowAt ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                        {tomorrowAt
                          ? `${t(lang, "Confirmed", "已确认")} ${formatBusinessTimeOnly(new Date(tomorrowAt))}`
                          : t(lang, "Not confirmed", "未确认")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <AdminTodosRemindersClient
          date={confirmDateStr}
          maxListItems={MAX_LIST_ITEMS}
          teacherPending={teacherRemindersPending.map((x) => ({
            id: x.id,
            name: x.name,
            teacherConfirmAt: teacherSelfTomorrowMap.get(x.id) ? new Date(teacherSelfTomorrowMap.get(x.id) as Date).toISOString() : null,
            sessions: x.sessions.map((s) => ({
              startAt: new Date(s.startAt).toISOString(),
              endAt: new Date(s.endAt).toISOString(),
              courseName: s.class.course.name,
              subjectName: s.class.subject?.name ?? null,
              levelName: s.class.level?.name ?? null,
              studentNames: expectedStudentsForReminder(s, enrollmentsByClass).map((e) => e.name ?? "-"),
            })),
          }))}
          teacherConfirmed={teacherRemindersConfirmed.map((x) => ({
            id: x.id,
            name: x.name,
            teacherConfirmAt: teacherSelfTomorrowMap.get(x.id) ? new Date(teacherSelfTomorrowMap.get(x.id) as Date).toISOString() : null,
            sessions: x.sessions.map((s) => ({
              startAt: new Date(s.startAt).toISOString(),
              endAt: new Date(s.endAt).toISOString(),
              courseName: s.class.course.name,
              subjectName: s.class.subject?.name ?? null,
              levelName: s.class.level?.name ?? null,
              studentNames: expectedStudentsForReminder(s, enrollmentsByClass).map((e) => e.name ?? "-"),
            })),
          }))}
          studentPending={studentRemindersPending.map((x) => ({
            id: x.id,
            name: x.name,
            sessions: x.sessions.map((s) => ({
              startAt: new Date(s.startAt).toISOString(),
              endAt: new Date(s.endAt).toISOString(),
              courseName: s.class.course.name,
              subjectName: s.class.subject?.name ?? null,
              levelName: s.class.level?.name ?? null,
            })),
          }))}
          studentConfirmed={studentRemindersConfirmed.map((x) => ({
            id: x.id,
            name: x.name,
            sessions: x.sessions.map((s) => ({
              startAt: new Date(s.startAt).toISOString(),
              endAt: new Date(s.endAt).toISOString(),
              courseName: s.class.course.name,
              subjectName: s.class.subject?.name ?? null,
              levelName: s.class.level?.name ?? null,
            })),
          }))}
          labels={{
            teacherTitle: t(lang, "Tomorrow Reminders (Teachers)", "明天上课提醒(老师)"),
            studentTitle: t(lang, "Tomorrow Reminders (Students)", "明天上课提醒(学生)"),
            count: t(lang, "Count", "数量"),
            showConfirmed: t(lang, "Show Confirmed", "显示已确认"),
            hideConfirmed: t(lang, "Hide Confirmed", "隐藏已确认"),
            confirmAll: t(lang, "Confirm All", "批量确认已提醒"),
            confirm: t(lang, "Confirm", "确认已提醒"),
            confirmed: t(lang, "Confirmed", "已确认"),
            emptyTeachers: t(lang, "No sessions tomorrow.", "明天没有课次。"),
            emptyStudents: t(lang, "No students to remind tomorrow.", "明天没有需要提醒的学生。"),
          }}
        />

        <div style={{ fontWeight: 700, color: "#6b7280", fontSize: 12, letterSpacing: 0.5 }}>
          {t(lang, "Other Tasks", "其他事项")}
        </div>
        <div style={{ ...sectionStyle, borderColor: undeductedCompletedCount > 0 ? "#fca5a5" : "#86efac", background: undeductedCompletedCount > 0 ? "#fff1f2" : "#f0fdf4" }}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>{t(lang, "Completed But Undeducted", "已完成未减扣")}</h3>
            <span style={{ color: undeductedCompletedCount > 0 ? "#b91c1c" : "#166534", fontWeight: 700 }}>
              {t(lang, "Count", "数量")}: {undeductedCompletedCount}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
            {t(lang, "Completed sessions with zero deduction and no waive mark.", "已完成课次中，未减扣且未标记免扣的记录。")}
          </div>
          <a href="/admin/reports/undeducted-completed">
            {t(lang, "Open Repair Queue", "打开修复队列")}
          </a>
        </div>

        <div style={{ ...sectionStyle, borderColor: "#fde68a" }}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>{t(lang, "Today's Courses", "今日课程")}</h3>
            <span style={{ color: "#666", fontSize: 12 }}>
              {t(lang, "Count", "数量")}: {sessionsTodayVisible.length}
            </span>
          </div>
          {sessionsTodayVisible.length === 0 ? (
            <div style={{ color: "#999" }}>{t(lang, "No sessions today.", "今天没有课程。")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {sessionsTodayVisible.map((s) => (
                <div
                  key={s.id}
                  style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 10, background: "#fffdf3" }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={s.class.capacity} compact />
                      <span>
                        {s.class.course.name}
                        {s.class.subject ? ` / ${s.class.subject.name}` : ""} {s.class.level ? ` / ${s.class.level.name}` : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {t(lang, "Teacher", "老师")}: {s.class.teacher.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {t(lang, "Campus", "校区")}: {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a href={attendanceFromTodoHref(s.id, "#todo-reminder-desk")}>{t(lang, "Go Attendance", "去点名")}</a>
                    <span style={{ marginLeft: 8, fontSize: 12, color: "#666" }}>
                      {t(lang, "Unmarked", "未点名")}: {unmarkedMap.get(s.id) ?? 0}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    {(() => {
                      const required = deductRequiredMap.get(s.id) ?? 0;
                      const done = deductDoneMap.get(s.id) ?? 0;
                      const pending = deductPendingMap.get(s.id) ?? 0;
                      if (required <= 0) {
                        return (
                          <span style={{ color: "#6b7280" }}>
                            {t(lang, "Deduct", "减扣")}: {t(lang, "No deduction required", "无需减扣")}
                          </span>
                        );
                      }
                      if (pending > 0) {
                        return (
                          <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                            {t(lang, "Deduct", "减扣")}: {t(lang, "Pending", "待减扣")} {pending} ({done}/{required})
                          </span>
                        );
                      }
                      return (
                        <span style={{ color: "#166534", fontWeight: 700 }}>
                          {t(lang, "Deduct", "减扣")}: {t(lang, "Completed", "已减扣")} ({done}/{required})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...sectionStyle, borderColor: "#bfdbfe" }}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>{t(lang, "Tomorrow's Courses", "明日课程")}</h3>
            <span style={{ color: "#666", fontSize: 12 }}>
              {t(lang, "Count", "数量")}: {sessionsTomorrowAll.length}
            </span>
          </div>
          {sessionsTomorrowAll.length === 0 ? (
            <div style={{ color: "#999" }}>{t(lang, "No sessions tomorrow.", "明天没有课程。")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {sessionsTomorrowAll.map((s) => (
                <div
                  key={s.id}
                  style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, background: "#f8fbff" }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={s.class.capacity} compact />
                      <span>
                        {s.class.course.name}
                        {s.class.subject ? ` / ${s.class.subject.name}` : ""} {s.class.level ? ` / ${s.class.level.name}` : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {t(lang, "Teacher", "老师")}: {s.class.teacher.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {t(lang, "Campus", "校区")}: {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>{t(lang, "Past Unmarked Sessions", "历史未点名课次")}</h3>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#666", fontSize: 12 }}>
                {t(lang, "Count", "数量")}: {pastTotal}
              </span>
            <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="warnDays" value={String(warnDays)} />
              <input type="hidden" name="warnMinutes" value={String(warnMinutes)} />
              <input type="hidden" name="showConfirmed" value={showConfirmed ? "1" : ""} />
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                {t(lang, "Recent days", "最近天数")}
                <select name="pastDays" defaultValue={String(pastDays)}>
                    <option value="7">7</option>
                    <option value="14">14</option>
                    <option value="30">30</option>
                    <option value="90">90</option>
                    <option value="365">365</option>
                  </select>
                </label>
                <button type="submit" data-apply-submit="1">
                  {t(lang, "Apply", "应用")}
                </button>
              </form>
            </div>
          </div>
        {pastSessions.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No past unmarked sessions.", "没有历史未点名课次。")}</div>
        ) : (
          <table cellPadding={8} style={tableStyle}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Session Time", "课次时间")}</th>
                <th align="left">{t(lang, "Class", "班级")}</th>
                <th align="left">{t(lang, "Teacher", "老师")}</th>
                <th align="left">{t(lang, "Campus", "校区")}</th>
                <th align="left">{t(lang, "Unmarked", "未点名")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {pastSessions.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>
                    {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={s.class.capacity} compact />
                      <span>
                        {s.class.course.name}
                        {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                        {s.class.level ? ` / ${s.class.level.name}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>{s.class.teacher.name}</td>
                  <td>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </td>
                  <td>
                    <span style={{ color: "#b00", fontWeight: 700 }}>{pastUnmarkedMap.get(s.id) ?? 0}</span>
                  </td>
                  <td>
                    <a href={attendanceFromTodoHref(s.id, "#todo-reminder-desk")}>{t(lang, "Go Attendance", "去点名")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pastTotalPages > 1 ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#666", fontSize: 12 }}>
              {t(lang, "Page", "页")}: {pastPage} / {pastTotalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
            {pastPage > 1 ? (
              <a
                href={todoHref({ pastPage: pastPage - 1 })}
              >
                {t(lang, "Prev", "上一页")}
              </a>
            ) : null}
            {pastPage < pastTotalPages ? (
              <a
                href={todoHref({ pastPage: pastPage + 1 })}
              >
                {t(lang, "Next", "下一页")}
              </a>
            ) : null}
            </div>
          </div>
        ) : null}
        </div>

        <div style={sectionStyle}>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {t(lang, "Academic Management Alerts", "学业管理提醒")} ({academicManagementAlerts.length})
            </summary>
            <div style={{ marginTop: 10 }}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ margin: 0 }}>{t(lang, "Academic Management Alerts", "学业管理提醒")}</h3>
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>
                {t(
                  lang,
                  `Active package students without a lesson in the next ${STUDENT_SCHEDULE_LOOKAHEAD_DAYS} days, incomplete profiles, due next actions, monthly-report plans, or marked high risk.`,
                  `有有效课包但未来 ${STUDENT_SCHEDULE_LOOKAHEAD_DAYS} 天无课、档案未完整、下一步动作临近、服务计划需要月报，或被标记为高风险的学生。`
                )}
              </div>
              <AcademicManagementAlertsClient
                initialLane={academicLane}
                lanes={ACADEMIC_STUDENT_LANES.map((item) => ({ value: item.value, label: item.zh }))}
                rows={academicManagementAlertRows}
                labels={{
                  empty: t(lang, "No academic management alerts.", "暂无学业管理提醒。"),
                  student: t(lang, "Student", "学生"),
                  type: t(lang, "Type", "类型"),
                  risk: t(lang, "Risk", "风险"),
                  servicePlan: t(lang, "Service plan", "服务计划"),
                  nextLesson: t(lang, "Next lesson", "下一节课"),
                  nextAction: t(lang, "Next action", "下一步动作"),
                  owner: t(lang, "Owner", "负责人"),
                  action: t(lang, "Action", "操作"),
                }}
              />
            </div>
          </details>
        </div>

        <div style={sectionStyle}>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {t(lang, "This Month Conflict Details", "本月冲突明细")} ({t(lang, "Count", "数量")}: {conflictList.length})
            </summary>
            <div style={{ marginTop: 10 }}>
              {!includeConflicts ? (
                <div style={{ color: "#64748b" }}>
                  {t(lang, "Conflict scan is lazy-loaded to reduce DB compute.", "为减少数据库算力占用，冲突扫描默认按需加载。")}{" "}
                  <a href={todoHref({ includeConflicts: 1, pastPage: 1 })}>{t(lang, "Load now", "立即加载")}</a>
                </div>
              ) : conflictList.length === 0 ? (
                <div style={{ color: "#999" }}>
                  {t(lang, "No conflicts found this month.", "本月未发现冲突。")}
                </div>
              ) : (
                <table cellPadding={8} style={tableStyle}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th align="left">{t(lang, "Type", "类型")}</th>
                      <th align="left">{t(lang, "Time", "时间")}</th>
                      <th align="left">{t(lang, "Teacher/Room", "老师/教室")}</th>
                      <th align="left">{t(lang, "Detail", "详情")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflictList.map((c, idx) => (
                      <tr key={`${c.type}-${idx}`} style={{ borderTop: "1px solid #eee" }}>
                        <td>{c.type}</td>
                        <td>{c.time}</td>
                        <td>{c.entity}</td>
                        <td>{c.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>
        </div>

        <div style={sectionStyle}>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {t(lang, "Renewal Alerts", "续费预警")}
            </summary>
            <div style={{ marginTop: 10 }}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ margin: 0 }}>{t(lang, "Renewal Alerts", "续费预警")}</h3>
              </div>
              <form method="GET" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <label>
                  {t(lang, "Warn Days", "预警天数")}:
                  <input name="warnDays" type="number" min={1} defaultValue={String(warnDays)} style={{ marginLeft: 6, width: 90 }} />
                </label>
                <label>
                  {t(lang, "Warn Minutes", "预警分钟")}:
                  <input
                    name="warnMinutes"
                    type="number"
                    min={1}
                    defaultValue={String(warnMinutes)}
                    style={{ marginLeft: 6, width: 100 }}
                  />
                </label>
                <input type="hidden" name="pastDays" value={String(pastDays)} />
                <input type="hidden" name="showConfirmed" value={showConfirmed ? "1" : ""} />
                <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
              </form>

              {renewAlerts.length === 0 ? (
                <div style={{ color: "#999" }}>{t(lang, "No renewal alerts.", "暂无续费预警。")}</div>
              ) : (
                <table cellPadding={8} style={tableStyle}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th align="left">{t(lang, "Student", "学生")}</th>
                      <th align="left">{t(lang, "Course", "课程")}</th>
                      <th align="left">{t(lang, "Remaining", "剩余")}</th>
                      <th align="left">{t(lang, "Usage 30d", "近30天消耗")}</th>
                      <th align="left">{t(lang, "Forecast", "预计用完")}</th>
                      <th align="left">{t(lang, "Alert", "预警")}</th>
                      <th align="left">{t(lang, "Action", "操作")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewAlerts.map((x) => (
                      <tr key={x.p.id} style={{ borderTop: "1px solid #eee" }}>
                        <td>{x.p.student?.name ?? "-"}</td>
                        <td>{x.p.course?.name ?? "-"}</td>
                        <td style={{ color: x.lowMinutes ? "#b00" : undefined, fontWeight: x.lowMinutes ? 700 : 400 }}>
                          {fmtMinutes(x.remaining)}
                        </td>
                        <td>{fmtMinutes(x.deducted30)} / {FORECAST_WINDOW_DAYS}d</td>
                        <td>
                          {x.estDays == null
                            ? t(lang, "No usage (30d)", "近30天无消耗")
                            : `${x.estDays} ${t(lang, "days", "天")}`}
                        </td>
                        <td style={{ color: "#b00", fontWeight: 700 }}>
                          {x.lowMinutes && x.lowDays
                            ? `${t(lang, "Low balance", "余额低")} + ${t(lang, "Likely to run out soon", "即将用完")}`
                            : x.lowMinutes
                            ? t(lang, "Low balance", "余额低")
                            : t(lang, "Likely to run out soon", "即将用完")}
                        </td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <a href={`/admin/students/${x.p.studentId}`}>{t(lang, "Student Detail", "学生详情")}</a>
                          <a href={`/admin/packages/${x.p.id}/ledger`}>{t(lang, "Ledger", "对账单")}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>
        </div>
      </div>
        </div>
      </details>
    </div>
  );
}

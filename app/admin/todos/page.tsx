import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import AdminTodosRemindersClient from "./AdminTodosRemindersClient";
import AdminTodosOpsClient from "./AdminTodosOpsClient";
import {
  autoResolveTeacherConflicts,
  getLatestAutoFixResult,
  getOrRunDailyConflictAudit,
  refreshDailyConflictAudit,
  saveAutoFixResult,
} from "@/lib/conflict-audit";

const FORECAST_WINDOW_DAYS = 30;
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

function fmtDateRange(startAt: Date, endAt: Date) {
  return `${startAt.toLocaleString()} - ${endAt.toLocaleTimeString()}`;
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

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
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
  const p = new URLSearchParams();
  if (warnDays) p.set("warnDays", warnDays);
  if (warnMinutes) p.set("warnMinutes", warnMinutes);
  if (pastDays) p.set("pastDays", pastDays);
  if (showConfirmed === "1") p.set("showConfirmed", "1");
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
  const p = new URLSearchParams();
  if (warnDays) p.set("warnDays", warnDays);
  if (warnMinutes) p.set("warnMinutes", warnMinutes);
  if (pastDays) p.set("pastDays", pastDays);
  if (showConfirmed === "1") p.set("showConfirmed", "1");
  redirect(`/admin/todos?${p.toString()}`);
}

export default async function AdminTodosPage({
  searchParams,
}: {
  searchParams?: Promise<{ warnDays?: string; warnMinutes?: string; pastDays?: string; pastPage?: string; showConfirmed?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const warnDays = Math.max(1, toInt(sp?.warnDays, DEFAULT_WARN_DAYS));
  const warnMinutes = Math.max(1, toInt(sp?.warnMinutes, DEFAULT_WARN_MINUTES));
  const pastDays = Math.min(365, Math.max(7, toInt(sp?.pastDays, 30)));
  const pastPage = Math.max(1, toInt(sp?.pastPage, 1));
  const pastPageSize = 50;
  const showConfirmed = sp?.showConfirmed === "1";

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

  const sessionsTodayAll = await prisma.session.findMany({
    where: { startAt: { gte: dayStart, lte: dayEnd } },
    include: {
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "asc" },
  });
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
        select: { sessionId: true, studentId: true, status: true },
      })
    : [];
  const todayAttendanceBySession = new Map<string, typeof todayAttendances>();
  for (const a of todayAttendances) {
    const arr = todayAttendanceBySession.get(a.sessionId) ?? [];
    arr.push(a);
    todayAttendanceBySession.set(a.sessionId, arr);
  }
  const unmarkedMap = new Map<string, number>();
  const sessionsToday = sessionsTodayAll.filter((s) => {
    const enrolledStudentIds = (todayEnrollmentsByClass.get(s.classId) ?? []).map((e) => e.studentId);
    const expectedStudentIds = s.class.capacity === 1 && s.studentId ? [s.studentId] : enrolledStudentIds;
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
  const sessionsYesterdayAll = await prisma.session.findMany({
    where: { startAt: { gte: yesterdayStart, lte: yesterdayEnd } },
    include: {
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "asc" },
  });
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
    const enrolledStudentIds = (yesterdayEnrollmentsByClass.get(s.classId) ?? []).map((e) => e.studentId);
    const expectedStudentIds = s.class.capacity === 1 && s.studentId ? [s.studentId] : enrolledStudentIds;
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

  const pastSince = new Date(dayStart);
  pastSince.setDate(dayStart.getDate() - pastDays);

  const pastSessionsAll = await prisma.session.findMany({
    where: { startAt: { lt: dayStart, gte: pastSince } },
    include: {
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "desc" },
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
      const enrolledStudentIds = (pastEnrollmentsByClass.get(s.classId) ?? []).map((e) => e.studentId);
      const expectedStudentIds = s.class.capacity === 1 && s.studentId ? [s.studentId] : enrolledStudentIds;
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

  const sessionsTomorrow = await prisma.session.findMany({
    where: { startAt: { gte: tomorrowStart, lte: tomorrowEnd } },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "asc" },
  });
  const sessionsTomorrowAll = await prisma.session.findMany({
    where: { startAt: { gte: tomorrowStart, lte: tomorrowEnd } },
    include: {
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "asc" },
  });
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

  const teacherRemindersMap = new Map<string, { id: string; name: string; sessions: any[] }>();
  for (const s of sessionsTomorrow) {
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
  for (const s of sessionsTomorrow) {
    const list = enrollmentsByClass.get(s.classId) ?? [];
    for (const e of list) {
      const sid = e.studentId;
      const sname = e.student?.name ?? "-";
      const entry = studentRemindersMap.get(sid) ?? { id: sid, name: sname, sessions: [] };
      entry.sessions.push(s);
      studentRemindersMap.set(sid, entry);
    }
  }
  const studentReminders = Array.from(studentRemindersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const confirmDate = toDateOnly(tomorrowStart);
  const todayConfirmDate = toDateOnly(dayStart);
  const teacherConfirmations = teacherReminders.length
    ? await prisma.todoReminderConfirm.findMany({
        where: {
          type: "TEACHER_TOMORROW",
          date: confirmDate,
          targetId: { in: teacherReminders.map((r) => r.id) },
        },
        select: { targetId: true },
      })
    : [];
  const teacherSelfTodayConfirmations = teacherTodayReminders.length
    ? await prisma.todoReminderConfirm.findMany({
        where: {
          type: TEACHER_SELF_CONFIRM_TODAY,
          date: todayConfirmDate,
          targetId: { in: teacherTodayReminders.map((r) => r.id) },
        },
        select: { targetId: true, createdAt: true },
      })
    : [];
  const teacherSelfTomorrowConfirmations = teacherReminders.length
    ? await prisma.todoReminderConfirm.findMany({
        where: {
          type: TEACHER_SELF_CONFIRM_TOMORROW,
          date: confirmDate,
          targetId: { in: teacherReminders.map((r) => r.id) },
        },
        select: { targetId: true, createdAt: true },
      })
    : [];
  const studentConfirmations = studentReminders.length
    ? await prisma.todoReminderConfirm.findMany({
        where: {
          type: "STUDENT_TOMORROW",
          date: confirmDate,
          targetId: { in: studentReminders.map((r) => r.id) },
        },
        select: { targetId: true },
      })
    : [];
  const teacherConfirmed = new Set(teacherConfirmations.map((x) => x.targetId));
  const teacherSelfTodayMap = new Map(teacherSelfTodayConfirmations.map((x) => [x.targetId, x.createdAt]));
  const teacherSelfTomorrowMap = new Map(teacherSelfTomorrowConfirmations.map((x) => [x.targetId, x.createdAt]));
  const studentConfirmed = new Set(studentConfirmations.map((x) => x.targetId));
  const teacherRemindersPending = teacherReminders.filter((r) => !teacherConfirmed.has(r.id));
  const studentRemindersPending = studentReminders.filter((r) => !studentConfirmed.has(r.id));
  const teacherRemindersConfirmed = teacherReminders.filter((r) => teacherConfirmed.has(r.id));
  const studentRemindersConfirmed = studentReminders.filter((r) => studentConfirmed.has(r.id));

  const usageSince = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const dailyConflictAudit = await getOrRunDailyConflictAudit(now);
  const lastAutoFix = await getLatestAutoFixResult();
  const packages = await prisma.coursePackage.findMany({
    where: {
      type: "HOURS",
      status: "ACTIVE",
      remainingMinutes: { gt: 0 },
    },
    include: { student: true, course: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
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

  const monthSessions = await prisma.session.findMany({
    where: { startAt: { gte: monthStart, lt: monthEnd } },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "asc" },
  });
  const monthAppointments = await prisma.appointment.findMany({
    where: { startAt: { gte: monthStart, lt: monthEnd } },
    include: { teacher: true, student: true },
    orderBy: { startAt: "asc" },
  });

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
          type: "Teacher Session Overlap",
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
          type: "Room Session Overlap",
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
        type: "Teacher Appointment Overlap",
        time: `${fmtDateRange(sStart, sEnd)} & ${fmtDateRange(aStart, aEnd)}`,
        entity: teacherName,
        detail: `${courseLabel(s.class)} | ${a.student?.name ?? "Appointment"}`,
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
    border: "2px solid #f59e0b",
    borderRadius: 14,
    padding: 16,
    background: "linear-gradient(180deg, #fff7ed 0%, #fffbeb 100%)",
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
    Object.entries(extra).forEach(([k, v]) => {
      if (v == null || v === "") p.delete(k);
      else p.set(k, String(v));
    });
    return `/admin/todos?${p.toString()}`;
  };

  return (
    <div>
      <h2>{t(lang, "Todo Center", "待办中心")}</h2>
      <p style={{ color: "#666" }}>
        {t(
          lang,
          "Focus on today's attendance tasks and package renewal alerts.",
          "聚焦今日点名任务和课包续费预警。"
        )}
      </p>

      <div
        style={{
          border: dailyConflictAudit.totalIssues > 0 ? "2px solid #ef4444" : "2px solid #22c55e",
          borderRadius: 12,
          padding: 12,
          background: dailyConflictAudit.totalIssues > 0 ? "#fff1f2" : "#f0fdf4",
          marginBottom: 14,
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
              href="/admin/conflicts"
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
          marginBottom: 14,
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

      <div style={heroStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>{t(lang, "Today Focus", "今日重点")}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {t(lang, "Unmarked Sessions", "未点名课次")}: {sessionsToday.length}
            </div>
          </div>
          <div style={{ color: "#92400e", fontSize: 12 }}>
            {t(lang, "Date", "日期")}: {new Date().toLocaleDateString()}
          </div>
        </div>

        {sessionsToday.length === 0 ? (
          <div style={{ marginTop: 10, color: "#b45309" }}>
            {t(lang, "No unmarked sessions today.", "今天没有未点名课次。")}
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
                      {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
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
                      <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Go Attendance", "去点名")}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...sectionStyle, borderColor: "#fca5a5", background: "linear-gradient(180deg, #fff5f5 0%, #fff 100%)" }}>
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
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
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
                    <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Go Attendance", "去点名")}</a>
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
                          ? `${t(lang, "Confirmed", "已确认")} ${new Date(todayAt).toLocaleTimeString()}`
                          : t(lang, "Not confirmed", "未确认")}
                      </td>
                      <td style={{ color: tomorrowAt ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                        {tomorrowAt
                          ? `${t(lang, "Confirmed", "已确认")} ${new Date(tomorrowAt).toLocaleTimeString()}`
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

        <div style={{ ...sectionStyle, borderColor: "#fde68a" }}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ margin: 0 }}>{t(lang, "Today's Courses", "今日课程")}</h3>
            <span style={{ color: "#666", fontSize: 12 }}>
              {t(lang, "Count", "数量")}: {sessionsTodayAll.length}
            </span>
          </div>
          {sessionsTodayAll.length === 0 ? (
            <div style={{ color: "#999" }}>{t(lang, "No sessions today.", "今天没有课程。")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {sessionsTodayAll.map((s) => (
                <div
                  key={s.id}
                  style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 10, background: "#fffdf3" }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
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
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
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
                <button type="submit">
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
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
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
                    <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Go Attendance", "去点名")}</a>
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
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {t(lang, "This Month Conflict Details", "本月冲突明细")} ({t(lang, "Count", "数量")}: {conflictList.length})
            </summary>
            <div style={{ marginTop: 10 }}>
              {conflictList.length === 0 ? (
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
                <button type="submit">{t(lang, "Apply", "应用")}</button>
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
  );
}

















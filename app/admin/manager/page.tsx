import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireManager } from "@/lib/auth";
import { packageModeFromNote } from "@/lib/package-mode";

const ATTENDED_STATUS = new Set(["PRESENT", "LATE"]);
const DEFAULT_REQ_OVERDUE_HOURS = 24;
const DEFAULT_RECENT_DAYS = 3;

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString()}`;
}

function courseLabel(cls: {
  course?: { name: string } | null;
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return [cls?.course?.name, cls?.subject?.name, cls?.level?.name].filter(Boolean).join(" / ");
}

function listWithLimit(names: string[], limit = 2) {
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
}

function colorByKey(key: string) {
  const palette = [
    { bg: "#fee2e2", fg: "#7f1d1d" },
    { bg: "#ffedd5", fg: "#9a3412" },
    { bg: "#fef9c3", fg: "#713f12" },
    { bg: "#dcfce7", fg: "#166534" },
    { bg: "#dbeafe", fg: "#1e3a8a" },
    { bg: "#e0e7ff", fg: "#3730a3" },
    { bg: "#f3e8ff", fg: "#6b21a8" },
    { bg: "#ffe4e6", fg: "#9f1239" },
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function buildCalendarDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === monthDate.getMonth() };
  });
}

type SessionLite = {
  id: string;
  classId: string;
  teacherId: string | null;
  studentId: string | null;
  teacher?: { name: string } | null;
  student?: { name: string } | null;
  startAt: Date;
  endAt: Date;
  class: {
    capacity: number;
    teacherId: string;
    oneOnOneStudentId?: string | null;
    campusId: string;
    courseId: string;
    teacher: { name: string };
    course: { name: string };
    subject: { name: string } | null;
    level: { name: string } | null;
    campus: { name: string };
    room: { name: string } | null;
  };
};

function expectedStudentIdsForSession(s: SessionLite, enrollmentsByClass: Map<string, string[]>) {
  const enrolled = enrollmentsByClass.get(s.classId) ?? [];
  if (s.class.capacity === 1) {
    if (s.studentId) return [s.studentId];
    if (s.class.oneOnOneStudentId) return [s.class.oneOnOneStudentId];
    return enrolled.length > 0 ? [enrolled[0]] : [];
  }
  return enrolled;
}

function calcUnmarkedCount(
  s: SessionLite,
  enrollmentsByClass: Map<string, string[]>,
  attendanceBySession: Map<string, Array<{ studentId: string; status: string }>>
) {
  const expected = expectedStudentIdsForSession(s, enrollmentsByClass);
  if (!expected.length) return 0;
  const expectedSet = new Set(expected);
  const rows = (attendanceBySession.get(s.id) ?? []).filter((a) => expectedSet.has(a.studentId));
  const rowSet = new Set(rows.map((a) => a.studentId));
  const unmarkedRows = rows.filter((a) => a.status === "UNMARKED").length;
  let missing = 0;
  for (const sid of expectedSet) if (!rowSet.has(sid)) missing += 1;
  return unmarkedRows + missing;
}

function hoursAgo(d: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (60 * 60 * 1000)));
}

export default async function AdminManagerPage({
  searchParams,
}: {
  searchParams?: Promise<{
    campusId?: string;
    teacherId?: string;
    courseId?: string;
    reqOverdueHours?: string;
    recentDays?: string;
    eventType?: string;
  }>;
}) {
  await requireManager();
  const lang = await getLang();

  const sp = await searchParams;
  const selectedCampusId = (sp?.campusId ?? "").trim();
  const selectedTeacherId = (sp?.teacherId ?? "").trim();
  const selectedCourseId = (sp?.courseId ?? "").trim();
  const selectedEventType = (sp?.eventType ?? "").trim().toUpperCase();
  const recentDays = Math.min(30, Math.max(1, Number(sp?.recentDays ?? DEFAULT_RECENT_DAYS) || DEFAULT_RECENT_DAYS));
  const reqOverdueHours = Math.max(
    1,
    Number(sp?.reqOverdueHours ?? DEFAULT_REQ_OVERDUE_HOURS) || DEFAULT_REQ_OVERDUE_HOURS
  );

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const recentStart = new Date(dayStart);
  recentStart.setDate(dayStart.getDate() - recentDays);
  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setDate(dayStart.getDate() + 1);
  const tomorrowEnd = new Date(dayEnd);
  tomorrowEnd.setDate(dayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  const [
    monthSessionsRaw,
    weekSessionsRaw,
    tomorrowSessionsRaw,
    bookingReqsRaw,
    teacherChangesRaw,
    packageTxnsRaw,
    attendanceEventsRaw,
  ] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { gte: monthStart, lt: monthEnd } },
      include: {
        teacher: true,
        student: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: recentStart, lte: dayEnd } },
      include: {
        student: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: { startAt: { gte: tomorrowStart, lte: tomorrowEnd } },
      include: {
        student: true,
        class: { include: { teacher: true, course: true, subject: true, level: true, campus: true, room: true } },
      },
    }),
    prisma.studentBookingRequest.findMany({
      where: { updatedAt: { gte: recentStart } },
      include: { student: true, teacher: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.sessionTeacherChange.findMany({
      where: { changedAt: { gte: recentStart } },
      include: { session: true, fromTeacher: true, toTeacher: true },
      orderBy: { changedAt: "desc" },
      take: 40,
    }),
    prisma.packageTxn.findMany({
      where: { createdAt: { gte: recentStart }, kind: { in: ["ADJUST", "ROLLBACK"] } },
      include: { package: { include: { student: true, course: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.attendance.findMany({
      where: { updatedAt: { gte: recentStart }, status: { not: "UNMARKED" } },
      include: {
        student: true,
        session: {
          include: { class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
  ]);

  const monthSessions = monthSessionsRaw as unknown as SessionLite[];
  const weekSessionsAll = weekSessionsRaw as unknown as SessionLite[];
  const tomorrowSessions = tomorrowSessionsRaw as unknown as SessionLite[];

  const sessionMatchesFilter = (s: SessionLite) => {
    const tid = s.teacherId ?? s.class.teacherId;
    if (selectedCampusId && s.class.campusId !== selectedCampusId) return false;
    if (selectedTeacherId && tid !== selectedTeacherId) return false;
    if (selectedCourseId && s.class.courseId !== selectedCourseId) return false;
    return true;
  };

  const monthSessionsFiltered = monthSessions.filter(sessionMatchesFilter);
  const weekSessions = weekSessionsAll.filter(sessionMatchesFilter);
  const tomorrowSessionsFiltered = tomorrowSessions.filter(sessionMatchesFilter);

  const campusOptions = Array.from(
    new Map(monthSessions.map((s) => [s.class.campusId, { id: s.class.campusId, name: s.class.campus.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const teacherOptions = Array.from(
    new Map(monthSessions.map((s) => [s.teacherId ?? s.class.teacherId, { id: s.teacherId ?? s.class.teacherId, name: s.class.teacher.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const courseOptions = Array.from(
    new Map(monthSessions.map((s) => [s.class.courseId, { id: s.class.courseId, name: s.class.course.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const monthClassIds = Array.from(new Set(monthSessionsFiltered.map((s) => s.classId)));
  const monthEnrollments = monthClassIds.length
    ? await prisma.enrollment.findMany({
        where: { classId: { in: monthClassIds } },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              sourceChannelId: true,
              sourceChannel: { select: { name: true } },
            },
          },
        },
      })
    : [];
  const monthStudentsByClass = new Map<
    string,
    Array<{ id: string; name: string; sourceKey: string; sourceLabel: string }>
  >();
  for (const e of monthEnrollments) {
    const arr = monthStudentsByClass.get(e.classId) ?? [];
    if (e.student?.name && !arr.some((x) => x.id === e.studentId)) {
      arr.push({
        id: e.studentId,
        name: e.student.name,
        sourceKey: e.student.sourceChannelId ?? e.student.sourceChannel?.name ?? "unknown",
        sourceLabel: e.student.sourceChannel?.name ?? "Unknown",
      });
    }
    monthStudentsByClass.set(e.classId, arr);
  }

  const sessionIds = weekSessions.map((s) => s.id);
  const classIds = Array.from(new Set(weekSessions.map((s) => s.classId)));
  const [enrollments, attendances] = await Promise.all([
    classIds.length
      ? prisma.enrollment.findMany({
          where: { classId: { in: classIds } },
          include: { student: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    sessionIds.length
      ? prisma.attendance.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, studentId: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  const enrollmentsByClass = new Map<string, string[]>();
  const enrollmentsByClassWithStudent = new Map<string, Array<{ studentId: string; studentName: string }>>();
  for (const e of enrollments) {
    const ids = enrollmentsByClass.get(e.classId) ?? [];
    ids.push(e.studentId);
    enrollmentsByClass.set(e.classId, ids);
    const rows = enrollmentsByClassWithStudent.get(e.classId) ?? [];
    rows.push({ studentId: e.studentId, studentName: e.student?.name ?? "-" });
    enrollmentsByClassWithStudent.set(e.classId, rows);
  }

  const attendanceBySession = new Map<string, Array<{ studentId: string; status: string }>>();
  for (const a of attendances) {
    const rows = attendanceBySession.get(a.sessionId) ?? [];
    rows.push({ studentId: a.studentId, status: a.status });
    attendanceBySession.set(a.sessionId, rows);
  }

  const todayIncomplete = weekSessions
    .filter((s) => s.startAt >= dayStart && s.startAt <= dayEnd)
    .map((s) => ({ session: s, unmarked: calcUnmarkedCount(s, enrollmentsByClass, attendanceBySession) }))
    .filter((x) => x.unmarked > 0);
  const overdueTodayIncomplete = todayIncomplete.filter((x) => x.session.endAt < now);

  const past7Incomplete = weekSessions
    .filter((s) => s.startAt < dayStart)
    .map((s) => ({ session: s, unmarked: calcUnmarkedCount(s, enrollmentsByClass, attendanceBySession) }))
    .filter((x) => x.unmarked > 0)
    .sort((a, b) => b.session.startAt.getTime() - a.session.startAt.getTime());

  const studentScheduleMap = new Map<string, { name: string; scheduled: number; attended: number; missed: number }>();
  for (const s of weekSessions) {
    const enrolled = enrollmentsByClassWithStudent.get(s.classId) ?? [];
    const expected =
      s.class.capacity === 1
        ? (() => {
            const id = s.studentId ?? s.class.oneOnOneStudentId ?? enrolled[0]?.studentId ?? null;
            if (!id) return [];
            const hit = enrolled.find((x) => x.studentId === id);
            return [{ studentId: id, studentName: s.student?.name ?? hit?.studentName ?? id }];
          })()
        : enrolled;
    if (!expected.length) continue;

    const rows = attendanceBySession.get(s.id) ?? [];
    const rowMap = new Map(rows.map((r) => [r.studentId, r.status]));
    for (const st of expected) {
      const entry = studentScheduleMap.get(st.studentId) ?? { name: st.studentName, scheduled: 0, attended: 0, missed: 0 };
      entry.scheduled += 1;
      const status = rowMap.get(st.studentId);
      if (status && ATTENDED_STATUS.has(status)) entry.attended += 1;
      else entry.missed += 1;
      studentScheduleMap.set(st.studentId, entry);
    }
  }
  const noAttendStudents = Array.from(studentScheduleMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .filter((x) => x.scheduled > 0 && x.attended === 0)
    .sort((a, b) => b.scheduled - a.scheduled || a.name.localeCompare(b.name));

  const teacherIdsTomorrow = Array.from(new Set(tomorrowSessionsFiltered.map((s) => s.teacherId ?? s.class.teacherId)));
  const tomorrowClassIds = Array.from(new Set(tomorrowSessionsFiltered.map((s) => s.classId)));
  const tomorrowEnrollments = tomorrowClassIds.length
    ? await prisma.enrollment.findMany({ where: { classId: { in: tomorrowClassIds } }, select: { classId: true, studentId: true } })
    : [];
  const tomorrowEnrollmentsByClass = new Map<string, string[]>();
  for (const e of tomorrowEnrollments) {
    const arr = tomorrowEnrollmentsByClass.get(e.classId) ?? [];
    arr.push(e.studentId);
    tomorrowEnrollmentsByClass.set(e.classId, arr);
  }
  const studentIdsTomorrow = Array.from(
    new Set(tomorrowSessionsFiltered.flatMap((s) => expectedStudentIdsForSession(s, tomorrowEnrollmentsByClass)))
  );
  const confirmDate = new Date(tomorrowStart.getFullYear(), tomorrowStart.getMonth(), tomorrowStart.getDate(), 0, 0, 0, 0);
  const [teacherConfirms, studentConfirms] = await Promise.all([
    teacherIdsTomorrow.length
      ? prisma.todoReminderConfirm.count({ where: { type: "TEACHER_TOMORROW", date: confirmDate, targetId: { in: teacherIdsTomorrow } } })
      : Promise.resolve(0),
    studentIdsTomorrow.length
      ? prisma.todoReminderConfirm.count({ where: { type: "STUDENT_TOMORROW", date: confirmDate, targetId: { in: studentIdsTomorrow } } })
      : Promise.resolve(0),
  ]);
  const reminderPendingCount = Math.max(0, teacherIdsTomorrow.length - teacherConfirms) + Math.max(0, studentIdsTomorrow.length - studentConfirms);

  const overdueBookingReqs = bookingReqsRaw.filter((r) => r.status === "PENDING" && hoursAgo(r.createdAt, now) >= reqOverdueHours);

  const monthDayMap = new Map<string, typeof monthSessionsFiltered>();
  for (const s of monthSessionsFiltered) {
    const key = ymd(new Date(s.startAt));
    const arr = monthDayMap.get(key) ?? [];
    arr.push(s);
    monthDayMap.set(key, arr);
  }
  const monthDays = buildCalendarDays(now);

  const attendanceEvents = attendanceEventsRaw.filter((a) => sessionMatchesFilter(a.session as unknown as SessionLite));
  const eventFeed = [
    ...bookingReqsRaw.map((r) => ({
      type: "BOOKING",
      at: r.updatedAt,
      label: `Booking request ${r.status}`,
      detail: `${r.student?.name ?? "-"} / ${r.teacher?.name ?? "-"} / ${new Date(r.startAt).toLocaleString()}`,
      href: `/admin/booking-links/${r.linkId}`,
    })),
    ...teacherChangesRaw.map((c) => ({
      type: "TEACHER_CHANGE",
      at: c.changedAt,
      label: "Teacher changed",
      detail: `${c.fromTeacher.name} -> ${c.toTeacher.name} / ${new Date(c.session.startAt).toLocaleString()}`,
      href: `/admin/sessions/${c.sessionId}/attendance`,
    })),
    ...packageTxnsRaw.map((x) => ({
      type: "PACKAGE",
      at: x.createdAt,
      label: `Package ${x.kind}`,
      detail: `${x.package.student?.name ?? "-"} / ${x.package.course?.name ?? "-"} / ${
        packageModeFromNote(x.package.note) === "GROUP_COUNT" ? `${x.deltaMinutes} cls` : `${x.deltaMinutes}m`
      }`,
      href: `/admin/packages/${x.packageId}/ledger`,
    })),
    ...attendanceEvents.map((a) => ({
      type: "ATTENDANCE",
      at: a.updatedAt,
      label: "Attendance saved",
      detail: `${a.student?.name ?? "-"} / ${a.status} / ${courseLabel(a.session.class)} / ${new Date(a.session.startAt).toLocaleString()}`,
      href: `/admin/sessions/${a.sessionId}/attendance`,
    })),
  ]
    .filter((e) => !selectedEventType || e.type === selectedEventType)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 20);

  const card = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" } as const;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>{t(lang, "Manager Console", "管理者驾驶舱")}</h2>
      <div style={{ color: "#64748b" }}>{t(lang, "Snapshot of recent operations and risks.", "最近运营与风险的一屏概览。")}</div>
      <div>
        <a href="/admin/manager/users">{t(lang, "Open System User Admin", "打开系统使用者管理")}</a>
      </div>

      <div style={{ ...card, background: "#f8fafc" }}>
        <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            {t(lang, "Campus", "校区")}:
            <select name="campusId" defaultValue={selectedCampusId} style={{ marginLeft: 6 }}>
              <option value="">{t(lang, "All", "全部")}</option>
              {campusOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label>
            {t(lang, "Teacher", "老师")}:
            <select name="teacherId" defaultValue={selectedTeacherId} style={{ marginLeft: 6 }}>
              <option value="">{t(lang, "All", "全部")}</option>
              {teacherOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label>
            {t(lang, "Course", "课程")}:
            <select name="courseId" defaultValue={selectedCourseId} style={{ marginLeft: 6 }}>
              <option value="">{t(lang, "All", "全部")}</option>
              {courseOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label>
            {t(lang, "Request SLA(h)", "请求超时阈值(小时)")}:
            <input name="reqOverdueHours" type="number" min={1} defaultValue={String(reqOverdueHours)} style={{ marginLeft: 6, width: 90 }} />
          </label>
          <label>
            {t(lang, "Recent Days", "最近天数")}:
            <input name="recentDays" type="number" min={1} max={30} defaultValue={String(recentDays)} style={{ marginLeft: 6, width: 70 }} />
          </label>
          <label>
            {t(lang, "Event Type", "事件类型")}:
            <select name="eventType" defaultValue={selectedEventType} style={{ marginLeft: 6 }}>
              <option value="">{t(lang, "All", "全部")}</option>
              <option value="ATTENDANCE">{t(lang, "Attendance", "点名")}</option>
              <option value="TEACHER_CHANGE">{t(lang, "Teacher Change", "换老师")}</option>
              <option value="BOOKING">{t(lang, "Booking", "预约")}</option>
              <option value="PACKAGE">{t(lang, "Package", "课包")}</option>
            </select>
          </label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
          <a href="/admin/manager">{t(lang, "Clear", "清除")}</a>
        </form>
      </div>

      <div style={{ ...card, borderColor: "#fca5a5", background: "linear-gradient(180deg,#fff5f5 0%,#fff 100%)" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "High Risk", "高风险事项")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #fecaca", borderRadius: 8, padding: 10, background: "#fef2f2" }}>
            <div style={{ fontSize: 12, color: "#7f1d1d" }}>{t(lang, "Overdue Attendance Today", "今日逾期未点名")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#b91c1c" }}>{overdueTodayIncomplete.length}</div>
            <a href="/admin/todos">{t(lang, "Handle Now", "立即处理")}</a>
          </div>
          <div style={{ border: "1px solid #fed7aa", borderRadius: 8, padding: 10, background: "#fff7ed" }}>
            <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Overdue Booking Requests", "超时待处理预约")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#c2410c" }}>{overdueBookingReqs.length}</div>
            <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Threshold", "阈值")}: {reqOverdueHours}h</div>
            <a href="/admin/booking-links">{t(lang, "Go Requests", "去处理请求")}</a>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t(lang, "This Month Calendar", "本月课程日历")}</h3>
          <a href="/admin/reports/monthly-schedule">{t(lang, "Open Full Monthly View", "打开完整月课表")}</a>
        </div>
        <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => <th key={w} align="left">{w}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, row) => (
              <tr key={row}>
                {monthDays.slice(row * 7, row * 7 + 7).map((d) => {
                  const key = ymd(d.date);
                  const list = monthDayMap.get(key) ?? [];
                  return (
                    <td key={key} style={{ border: "1px solid #eee", height: 110, verticalAlign: "top", background: d.inMonth ? "#fff" : "#fafafa" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: d.inMonth ? "#111827" : "#9ca3af" }}>{d.date.getDate()}</div>
                      <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
                        {list.map((s) => {
                          const rows = monthStudentsByClass.get(s.classId) ?? [];
                          const picked =
                            s.class.capacity === 1 && s.student?.name
                              ? (() => {
                                  const one = rows.find((x) => x.name === s.student?.name);
                                  if (one) return [one];
                                  return [{ id: s.studentId ?? s.id, name: s.student.name, sourceKey: "unknown", sourceLabel: "Unknown" }];
                                })()
                              : rows;
                          const sourceKeys = Array.from(new Set(picked.map((x) => x.sourceKey)));
                          const hasOneSource = sourceKeys.length === 1;
                          const tone = hasOneSource ? colorByKey(sourceKeys[0]) : { bg: "#f3f4f6", fg: "#334155" };
                          return (
                            <a
                              key={s.id}
                              href={`/admin/sessions/${s.id}/attendance`}
                              style={{
                                fontSize: 11,
                                color: "#1d4ed8",
                                textDecoration: "none",
                                display: "grid",
                                gap: 1,
                                borderRadius: 6,
                                padding: "4px 6px",
                                border: "1px solid #e5e7eb",
                                background: tone.bg,
                              }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: tone.fg }}>
                                {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {courseLabel(s.class)}
                                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px", background: s.class.capacity === 1 ? "#fee2e2" : "#dbeafe", color: s.class.capacity === 1 ? "#991b1b" : "#1e3a8a" }}>
                                  {s.class.capacity === 1 ? t(lang, "1-on-1", "一对一") : t(lang, "Group", "班课")}
                                </span>
                              </span>
                              <span style={{ color: "#334155" }}>{t(lang, "Teacher", "老师")}: {s.teacher?.name ?? s.class.teacher.name}</span>
                              <span style={{ color: "#334155" }}>
                                {t(lang, "Students", "学生")}: {picked.length ? listWithLimit(picked.map((x) => x.name), 2) : "-"}
                                {picked.length ? ` (${hasOneSource ? picked[0]?.sourceLabel ?? "Unknown" : t(lang, "Mixed Sources", "混合来源")})` : ""}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Recent Events (7d)", "最近事件流(7天)")}</h3>
        {eventFeed.length === 0 ? (
          <div style={{ color: "#64748b" }}>{t(lang, "No recent events.", "最近无事件。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {eventFeed.map((e, idx) => (
              <div key={`${e.label}-${idx}`} style={{ border: "1px solid #eef2f7", borderRadius: 8, padding: 8, background: "#fafcff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{new Date(e.at).toLocaleString()}</div>
                <div style={{ fontWeight: 700 }}>{e.label}</div>
                <div style={{ fontSize: 12, color: "#334155" }}>{e.detail}</div>
                <div style={{ marginTop: 4 }}><a href={e.href}>{t(lang, "Open", "打开")}</a></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

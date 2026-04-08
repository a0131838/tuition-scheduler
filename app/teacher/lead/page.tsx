import { requireTeacherLead } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function resolveSessionStudents(session: any) {
  const cancelledSet = new Set(
    Array.isArray(session.attendances)
      ? session.attendances.filter((a: any) => a?.status === "EXCUSED").map((a: any) => a.studentId as string)
      : []
  );
  const enrolled = (session.class?.enrollments ?? []).map((e: any) => ({
    id: e.studentId as string,
    name: e.student?.name ?? "-",
  }));

  if (session.class?.capacity === 1) {
    const candidateId = (session.studentId as string | null) ?? (session.class?.oneOnOneStudent?.id as string | null) ?? (enrolled[0]?.id ?? null);
    const candidateName =
      (session.student?.name as string | null) ??
      (session.class?.oneOnOneStudent?.name as string | null) ??
      (candidateId ? enrolled.find((x: any) => x.id === candidateId)?.name ?? null : null);
    if (candidateId && cancelledSet.has(candidateId)) return [] as string[];
    return candidateName ? [candidateName] : [];
  }

  return enrolled.filter((x: any) => !cancelledSet.has(x.id)).map((x: any) => x.name);
}

function parseMonthValue(value?: string | null) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(month: string) {
  const start = parseBusinessDateStart(`${month}-01`);
  const parsed = parseMonthValue(month);
  if (!start || !parsed) return null;
  const nextMonthDate = new Date(parsed.year, parsed.month, 1);
  const nextMonthStart = parseBusinessDateStart(`${monthKey(nextMonthDate)}-01`);
  if (!nextMonthStart) return null;
  return { start, endExclusive: nextMonthStart };
}

function buildCalendarDays(month: string) {
  const parsed = parseMonthValue(month);
  if (!parsed) return [];
  const monthDate = new Date(parsed.year, parsed.month - 1, 1);
  const start = new Date(monthDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return Array.from({ length: 42 }).map((_, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    return {
      date,
      dateKey: formatBusinessDateOnly(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export default async function TeacherLeadPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; date?: string; teacherId?: string; campusId?: string }>;
}) {
  await requireTeacherLead();
  const lang = await getLang();
  const sp = await searchParams;
  const today = formatBusinessDateOnly(new Date());
  const requestedDate = String(sp?.date ?? today).trim() || today;
  const selectedMonth = parseMonthValue(sp?.month) ? String(sp?.month) : requestedDate.slice(0, 7);
  const date = requestedDate.startsWith(selectedMonth) ? requestedDate : `${selectedMonth}-01`;
  const teacherId = String(sp?.teacherId ?? "").trim();
  const campusId = String(sp?.campusId ?? "").trim();
  const selectedDateStart = parseBusinessDateStart(date) ?? parseBusinessDateStart(today)!;
  const selectedDateEnd = parseBusinessDateEnd(date) ?? parseBusinessDateEnd(today)!;
  const selectedMonthRange = monthRange(selectedMonth) ?? {
    start: parseBusinessDateStart(`${today.slice(0, 7)}-01`)!,
    endExclusive: parseBusinessDateStart(`${monthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}-01`)!,
  };

  const teacherFilter = teacherId
    ? {
        OR: [
          { teacherId },
          {
            teacherId: null as string | null,
            class: { teacherId },
          },
        ],
      }
    : {};
  const campusFilter = campusId ? { class: { campusId } } : {};

  const [teachers, campuses, sessions] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.campus.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.session.findMany({
      where: {
        startAt: { gte: selectedMonthRange.start, lt: selectedMonthRange.endExclusive },
        ...teacherFilter,
        ...campusFilter,
      },
      include: {
        teacher: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        attendances: { select: { studentId: true, status: true } },
        class: {
          include: {
            teacher: { select: { id: true, name: true } },
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            campus: { select: { id: true, name: true } },
            room: { select: { name: true } },
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: {
              include: { student: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 5000,
    }),
  ]);

  const calendarItems = sessions.map((session) => {
    const teacherName = session.teacher?.name ?? session.class.teacher.name;
    const students = resolveSessionStudents(session);
    return {
      id: session.id,
      startAt: session.startAt,
      endAt: session.endAt,
      teacherName,
      courseText: [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / "),
      campusText: `${session.class.campus.name}${session.class.room ? ` / ${session.class.room.name}` : ""}`,
      classId: session.classId,
      students,
    };
  });

  const rows = calendarItems.filter((row) => {
    const rowDate = new Date(row.startAt);
    return rowDate >= selectedDateStart && rowDate <= selectedDateEnd;
  });

  const itemsByDay = new Map<string, typeof calendarItems>();
  for (const item of calendarItems) {
    const key = formatBusinessDateOnly(new Date(item.startAt));
    if (!itemsByDay.has(key)) itemsByDay.set(key, []);
    itemsByDay.get(key)!.push(item);
  }

  const calendarDays = buildCalendarDays(selectedMonth);
  const parsedMonth = parseMonthValue(selectedMonth);
  const monthDate = parsedMonth ? new Date(parsedMonth.year, parsedMonth.month - 1, 1) : new Date();
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const visibleTeacherCount = new Set(calendarItems.map((row) => row.teacherName)).size;
  const visibleStudentCount = new Set(calendarItems.flatMap((row) => row.students)).size;
  const visibleCampusCount = new Set(calendarItems.map((row) => row.campusText)).size;

  const navBase = new URLSearchParams();
  if (teacherId) navBase.set("teacherId", teacherId);
  if (campusId) navBase.set("campusId", campusId);
  const prevParams = new URLSearchParams(navBase);
  prevParams.set("month", monthKey(prevMonth));
  prevParams.set("date", `${monthKey(prevMonth)}-01`);
  const nextParams = new URLSearchParams(navBase);
  nextParams.set("month", monthKey(nextMonth));
  nextParams.set("date", `${monthKey(nextMonth)}-01`);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Teacher Lead Desk", "老师主管工作台")}
        subtitle={t(
          lang,
          "Scan the whole month first, then click a day to inspect the detailed schedule for teacher coverage and coordination.",
          "先用月历查看整个月的课次分布，再点具体日期查看当天详细排班，方便主管协调老师安排。"
        )}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/sessions", label: t(lang, "Open my sessions", "打开我的课次") },
        ]}
      />

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={{ border: "1px solid #dbeafe", borderRadius: 16, padding: 14, background: "#eff6ff" }}>
          <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>{t(lang, "Selected day", "当前日期")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{date}</div>
        </div>
        <div style={{ border: "1px solid #dcfce7", borderRadius: 16, padding: 14, background: "#f0fdf4" }}>
          <div style={{ color: "#15803d", fontSize: 12, fontWeight: 700 }}>{t(lang, "Month sessions", "本月课次数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{calendarItems.length}</div>
        </div>
        <div style={{ border: "1px solid #e9d5ff", borderRadius: 16, padding: 14, background: "#faf5ff" }}>
          <div style={{ color: "#7c3aed", fontSize: 12, fontWeight: 700 }}>{t(lang, "Teachers this month", "本月老师数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{visibleTeacherCount}</div>
        </div>
        <div style={{ border: "1px solid #fde68a", borderRadius: 16, padding: 14, background: "#fffbeb" }}>
          <div style={{ color: "#b45309", fontSize: 12, fontWeight: 700 }}>{t(lang, "Students this month", "本月学生数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{visibleStudentCount}</div>
          <div style={{ marginTop: 4, color: "#92400e", fontSize: 12 }}>
            {t(lang, "Campus combinations", "校区组合")}: {visibleCampusCount}
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, background: "#ffffff" }}>
        <form method="GET" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Month", "月份")}</span>
            <input type="month" name="month" defaultValue={selectedMonth} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Selected day", "当前日期")}</span>
            <input type="date" name="date" defaultValue={date} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Teacher", "老师")}</span>
            <select name="teacherId" defaultValue={teacherId}>
              <option value="">{t(lang, "All teachers", "全部老师")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Campus", "校区")}</span>
            <select name="campusId" defaultValue={campusId}>
              <option value="">{t(lang, "All campuses", "全部校区")}</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
          <a href={`/teacher/lead?month=${today.slice(0, 7)}&date=${today}`}>{t(lang, "Today view", "回到今天")}</a>
          <a href="/teacher/lead">{t(lang, "Clear filters", "清除筛选")}</a>
        </form>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 800 }}>
          {t(lang, "Monthly teacher schedule calendar", "月历课表总览")}
        </div>
        {calendarItems.length === 0 ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            {t(
              lang,
              "No sessions match this month and filter set. Try switching month or clearing teacher and campus filters.",
              "当前月份和筛选条件下没有课次。可以切换月份，或放宽老师、校区筛选。"
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", flexWrap: "wrap" }}>
              <a href={`/teacher/lead?${prevParams.toString()}`}>&lt;&lt; {t(lang, "Prev month", "上月")}</a>
              <b>{selectedMonth}</b>
              <a href={`/teacher/lead?${nextParams.toString()}`}>{t(lang, "Next month", "下月")} &gt;&gt;</a>
            </div>
            <div style={{ padding: 12, background: "#f8fafc" }}>
              <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {WEEKDAYS.map((weekday) => (
                      <th key={weekday} align="left" style={{ color: "#475569", fontSize: 13 }}>
                        {weekday}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, rowIdx) => (
                    <tr key={`calendar-row-${rowIdx}`}>
                      {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((day) => {
                        const dayItems = (itemsByDay.get(day.dateKey) ?? []).slice().sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
                        const topItems = dayItems.slice(0, 4);
                        const extraCount = Math.max(0, dayItems.length - topItems.length);
                        const selected = day.dateKey === date;
                        const dayHrefParams = new URLSearchParams(navBase);
                        dayHrefParams.set("month", selectedMonth);
                        dayHrefParams.set("date", day.dateKey);
                        return (
                          <td
                            key={day.dateKey}
                            style={{
                              border: "1px solid #e2e8f0",
                              verticalAlign: "top",
                              height: 170,
                              width: `${100 / 7}%`,
                              background: selected ? "#eff6ff" : day.inMonth ? "#ffffff" : "#f8fafc",
                              padding: 0,
                            }}
                          >
                            <a href={`/teacher/lead?${dayHrefParams.toString()}`} style={{ display: "block", color: "inherit", height: "100%", padding: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <b style={{ color: day.inMonth ? "#0f172a" : "#94a3b8" }}>{day.date.getDate()}</b>
                                <span style={{ fontSize: 12, color: selected ? "#1d4ed8" : "#64748b" }}>
                                  {dayItems.length} {t(lang, "sessions", "课次")}
                                </span>
                              </div>
                              <div style={{ display: "grid", gap: 6 }}>
                                {topItems.map((item) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      fontSize: 12,
                                      lineHeight: 1.25,
                                      padding: 6,
                                      border: "1px solid #dbeafe",
                                      borderRadius: 8,
                                      background: "#fcfcff",
                                    }}
                                  >
                                    <div style={{ fontWeight: 800, color: "#0f172a" }}>
                                      {formatBusinessTimeOnly(new Date(item.startAt))} {item.teacherName}
                                    </div>
                                    <div style={{ color: "#334155" }}>{item.courseText}</div>
                                  </div>
                                ))}
                                {extraCount > 0 && (
                                  <div style={{ fontSize: 12, color: "#64748b", paddingLeft: 2 }}>
                                    +{extraCount} {t(lang, "more", "更多")}
                                  </div>
                                )}
                              </div>
                            </a>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 800 }}>
          {t(lang, "Selected day details", "当天详细排班")}
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            {t(
              lang,
              "No sessions match this selected day. Choose another date in the calendar above.",
              "当前选中日期没有符合筛选的课次，请在上面的月历里选择其他日期。"
            )}
          </div>
        ) : (
          <div style={{ padding: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", background: "#f8fafc" }}>
            {rows.map((row) => (
              <div
                key={`selected-${row.id}`}
                style={{
                  border: "1px solid #dbeafe",
                  borderRadius: 14,
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                  padding: 12,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    {formatBusinessTimeOnly(new Date(row.startAt))} - {formatBusinessTimeOnly(new Date(row.endAt))}
                  </div>
                  <div style={{ color: "#1d4ed8", fontWeight: 700 }}>{row.teacherName}</div>
                </div>
                <div style={{ color: "#334155", fontSize: 14, lineHeight: 1.4 }}>{row.courseText}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  <b>{t(lang, "Campus", "校区")}</b>: {row.campusText}
                </div>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  <b>{t(lang, "Students", "学生")}</b>: {row.students.length ? row.students.join(", ") : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <details style={{ border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff", overflow: "hidden" }}>
        <summary style={{ padding: "12px 14px", cursor: "pointer", fontWeight: 800, background: "#f8fafc" }}>
          {t(lang, "Detailed schedule table", "详细排班表")}
        </summary>
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 18, color: "#64748b" }}>
              {t(
                lang,
                "No sessions match this selected day. Choose another date in the calendar above.",
                "当前选中日期没有符合筛选的课次，请在上面的月历里选择其他日期。"
              )}
            </div>
          ) : (
            <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th>{t(lang, "Time", "时间")}</th>
                  <th>{t(lang, "Teacher", "老师")}</th>
                  <th>{t(lang, "Course", "课程")}</th>
                  <th>{t(lang, "Campus / Room", "校区 / 教室")}</th>
                  <th>{t(lang, "Students", "学生")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`table-${row.id}`} style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{formatBusinessDateTime(new Date(row.startAt))}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{formatBusinessTimeOnly(new Date(row.endAt))}</div>
                    </td>
                    <td>{row.teacherName}</td>
                    <td>{row.courseText}</td>
                    <td>{row.campusText}</td>
                    <td>{row.students.length ? row.students.join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>
    </div>
  );
}

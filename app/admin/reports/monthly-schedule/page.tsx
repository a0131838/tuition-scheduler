import { getLang } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import {
  buildCalendarDays,
  choose,
  fmtHHMM,
  fmtYMD,
  loadMonthlyScheduleData,
  monthKey,
  parseMonth,
  resolveSessionStudentsForMonthlySchedule,
} from "./_lib";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  teacherName: string;
  courseText: string;
  capacity: number;
  placeText: string;
  students: string[];
  classId: string;
};

export default async function MonthlyScheduleReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; teacherId?: string; campusId?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const teacherId = sp?.teacherId ?? "";
  const campusId = sp?.campusId ?? "";
  const data = await loadMonthlyScheduleData({ month, teacherId, campusId });

  if (!data) {
    return (
      <div>
        <h2>{choose(lang, "Monthly Schedule Calendar", "月课表总览")}</h2>
        <div style={{ color: "#b00" }}>
          {choose(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}
        </div>
      </div>
    );
  }

  const { range, teachers, campuses, sessions } = data;
  const parsedMonth = parseMonth(month);
  const monthDate = parsedMonth ? new Date(parsedMonth.year, parsedMonth.month - 1, 1) : new Date(range.start);
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const calendarDays = buildCalendarDays(monthDate);

  const itemsByDay = new Map<string, CalendarItem[]>();
  const teacherSet = new Set<string>();
  const studentSet = new Set<string>();
  let visibleSessionCount = 0;

  for (const s of sessions) {
    const resolved = resolveSessionStudentsForMonthlySchedule(s);
    if (resolved.hidden) continue;

    const dateKey = fmtYMD(new Date(s.startAt));
    const teacherName = s.teacher?.name ?? s.class.teacher.name;
    const students = resolved.students;

    visibleSessionCount += 1;
    teacherSet.add(teacherName);
    for (const studentName of students) studentSet.add(studentName);

    const courseText = [s.class.course.name, s.class.subject?.name, s.class.level?.name].filter(Boolean).join(" / ");
    const item: CalendarItem = {
      id: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      teacherName,
      courseText,
      capacity: s.class.capacity,
      placeText: `${s.class.campus.name}${s.class.room ? ` / ${s.class.room.name}` : ""}`,
      students,
      classId: s.classId,
    };

    if (!itemsByDay.has(dateKey)) itemsByDay.set(dateKey, []);
    itemsByDay.get(dateKey)!.push(item);
  }

  const baseParams = new URLSearchParams();
  baseParams.set("month", month);
  if (teacherId) baseParams.set("teacherId", teacherId);
  if (campusId) baseParams.set("campusId", campusId);

  const csvHref = `/admin/reports/monthly-schedule/export/csv?${baseParams.toString()}`;
  const pdfHref = `/admin/reports/monthly-schedule/export/pdf?${baseParams.toString()}`;

  const prevParams = new URLSearchParams(baseParams);
  prevParams.set("month", monthKey(prevMonth));
  const nextParams = new URLSearchParams(baseParams);
  nextParams.set("month", monthKey(nextMonth));

  return (
    <div>
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Monthly Schedule / 月课表总览</div>
          <h2>{choose(lang, "Monthly Schedule Calendar", "月课表总览")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {choose(
              lang,
              "Pick the month and optional teacher/campus first, then use the calendar for scan-and-compare work.",
              "先选月份和可选的老师/校区，再用月历做整体扫读和对比。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{choose(lang, "Sessions", "课次数")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{visibleSessionCount}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{choose(lang, "Teachers", "老师数")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{teacherSet.size}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{choose(lang, "Students", "学生数")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{studentSet.size}</div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 10, color: "#666" }}>
        {choose(
          lang,
          "Overview of all sessions in this month across all teachers and students.",
          "展示本月全部老师与学生的课程总览。"
        )}
      </div>

      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #dbeafe",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#monthly-schedule-filters">{choose(lang, "Filters", "筛选")}</a>
        <a href="#monthly-schedule-calendar">{choose(lang, "Calendar", "月历")}</a>
      </div>

      <div id="monthly-schedule-filters" style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 10, scrollMarginTop: 96 }}>
        <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>
            {choose(lang, "Month", "月份")}:
            <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {choose(lang, "Teacher", "老师")}:
            <select name="teacherId" defaultValue={teacherId} style={{ marginLeft: 6 }}>
              <option value="">{choose(lang, "All", "全部")}</option>
              {teachers.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {choose(lang, "Campus", "校区")}:
            <select name="campusId" defaultValue={campusId} style={{ marginLeft: 6 }}>
              <option value="">{choose(lang, "All", "全部")}</option>
              {campuses.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" data-apply-submit="1">{choose(lang, "Apply", "应用")}</button>
          <a href={csvHref}>{choose(lang, "Export CSV", "导出CSV")}</a>
          <a href={pdfHref}>{choose(lang, "Export PDF", "导出PDF")}</a>
        </form>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <a href={`/admin/reports/monthly-schedule?${prevParams.toString()}`}>
          &lt;&lt; {choose(lang, "Prev Month", "上月")}
        </a>
        <b>{month}</b>
        <a href={`/admin/reports/monthly-schedule?${nextParams.toString()}`}>
          {choose(lang, "Next Month", "下月")} &gt;&gt;
        </a>
      </div>

      <div style={{ marginBottom: 12, color: "#444" }}>
        {choose(lang, "Sessions", "课次数")}: <b>{visibleSessionCount}</b> | {choose(lang, "Teachers", "老师数")}: <b>{teacherSet.size}</b> |{" "}
        {choose(lang, "Students", "学生数")}: <b>{studentSet.size}</b>
      </div>

      <table id="monthly-schedule-calendar" cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", scrollMarginTop: 96 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {WEEKDAYS.map((wd) => (
              <th key={wd} align="left">
                {wd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <tr key={`row-${rowIdx}`}>
              {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((d) => {
                const key = fmtYMD(d.date);
                const dayItems = itemsByDay.get(key) ?? [];
                const topItems = dayItems.slice(0, 6);
                const extraItems = dayItems.slice(6);
                return (
                  <td
                    key={key}
                    style={{
                      border: "1px solid #eee",
                      verticalAlign: "top",
                      height: 170,
                      width: `${100 / 7}%`,
                      background: d.inMonth ? "#fff" : "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <b style={{ color: d.inMonth ? "#222" : "#aaa" }}>{d.date.getDate()}</b>
                      <span style={{ fontSize: 12, color: "#666" }}>
                        {dayItems.length} {choose(lang, "Sessions", "课次")}
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {topItems.map((it) => (
                        <a
                          key={it.id}
                          href={`/admin/classes/${it.classId}/sessions`}
                          style={{
                            display: "block",
                            fontSize: 12,
                            lineHeight: 1.25,
                            padding: 6,
                            border: "1px solid #e8e8e8",
                            borderRadius: 6,
                            background: "#fcfcfc",
                            color: "#222",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {fmtHHMM(new Date(it.startAt))}-{fmtHHMM(new Date(it.endAt))}
                          </div>
                          <div>{it.teacherName}</div>
                          <div style={{ color: "#444", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <ClassTypeBadge capacity={it.capacity} compact />
                            <span>{it.courseText}</span>
                          </div>
                          <div style={{ color: "#666" }}>{it.placeText}</div>
                          <div style={{ color: "#0a7" }}>
                            {choose(lang, "Students", "学生")}: {it.students.length > 0 ? it.students.join(", ") : "-"}
                          </div>
                        </a>
                      ))}
                      {extraItems.length > 0 && (
                        <details>
                          <summary style={{ fontSize: 12, color: "#666", cursor: "pointer" }}>
                            +{extraItems.length} {choose(lang, "more sessions", "更多课次")}
                          </summary>
                          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                            {extraItems.map((it) => (
                              <a
                                key={it.id}
                                href={`/admin/classes/${it.classId}/sessions`}
                                style={{
                                  display: "block",
                                  fontSize: 12,
                                  lineHeight: 1.25,
                                  padding: 6,
                                  border: "1px solid #e8e8e8",
                                  borderRadius: 6,
                                  background: "#fcfcfc",
                                  color: "#222",
                                }}
                              >
                                <div style={{ fontWeight: 700 }}>
                                  {fmtHHMM(new Date(it.startAt))}-{fmtHHMM(new Date(it.endAt))}
                                </div>
                                <div>{it.teacherName}</div>
                                <div style={{ color: "#444", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                  <ClassTypeBadge capacity={it.capacity} compact />
                                  <span>{it.courseText}</span>
                                </div>
                                <div style={{ color: "#666" }}>{it.placeText}</div>
                                <div style={{ color: "#0a7" }}>
                                  {choose(lang, "Students", "学生")}: {it.students.length > 0 ? it.students.join(", ") : "-"}
                                </div>
                              </a>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

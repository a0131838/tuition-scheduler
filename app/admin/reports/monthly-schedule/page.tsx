import { getLang } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import {
  buildCalendarDays,
  choose,
  fmtHHMM,
  fmtYMD,
  loadMonthlyScheduleData,
  monthKey,
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
  const monthDate = new Date(range.start);
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const calendarDays = buildCalendarDays(monthDate);

  const itemsByDay = new Map<string, CalendarItem[]>();
  const teacherSet = new Set<string>();
  const studentSet = new Set<string>();

  for (const s of sessions) {
    const dateKey = fmtYMD(new Date(s.startAt));
    const teacherName = s.teacher?.name ?? s.class.teacher.name;
    const enrolledStudents = s.class.enrollments.map((e) => e.student.name).filter(Boolean);
    const oneOnOneStudent =
      s.student?.name ?? s.class.oneOnOneStudent?.name ?? (enrolledStudents.length > 0 ? enrolledStudents[0] : null);
    const students =
      s.class.capacity === 1
        ? oneOnOneStudent
          ? [oneOnOneStudent]
          : []
        : enrolledStudents;

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
      <h2>{choose(lang, "Monthly Schedule Calendar", "月课表总览")}</h2>
      <div style={{ marginBottom: 10, color: "#666" }}>
        {choose(
          lang,
          "Overview of all sessions in this month across all teachers and students.",
          "展示本月全部老师与学生的课程总览。"
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 10 }}>
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
          <button type="submit">{choose(lang, "Apply", "应用")}</button>
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
        {choose(lang, "Sessions", "课次数")}: <b>{sessions.length}</b> | {choose(lang, "Teachers", "老师数")}: <b>{teacherSet.size}</b> |{" "}
        {choose(lang, "Students", "学生数")}: <b>{studentSet.size}</b>
      </div>

      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
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

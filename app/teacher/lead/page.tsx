import { requireTeacherLead } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

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

function businessHour(value: Date) {
  return Number(formatBusinessTimeOnly(value).slice(0, 2));
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default async function TeacherLeadPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; teacherId?: string; campusId?: string }>;
}) {
  await requireTeacherLead();
  const lang = await getLang();
  const sp = await searchParams;
  const today = formatBusinessDateOnly(new Date());
  const date = String(sp?.date ?? today).trim() || today;
  const teacherId = String(sp?.teacherId ?? "").trim();
  const campusId = String(sp?.campusId ?? "").trim();
  const rangeStart = parseBusinessDateStart(date) ?? parseBusinessDateStart(today)!;
  const rangeEnd = parseBusinessDateEnd(date) ?? parseBusinessDateEnd(today)!;

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
        startAt: { gte: rangeStart, lte: rangeEnd },
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
      take: 1000,
    }),
  ]);

  const rows = sessions.map((session) => {
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

  const earliestHour = rows.length > 0 ? Math.max(0, Math.min(...rows.map((row) => businessHour(new Date(row.startAt)))) - 1) : 8;
  const latestHour = rows.length > 0 ? Math.min(23, Math.max(...rows.map((row) => businessHour(new Date(row.endAt)))) + 1) : 21;
  const hourSlots = Array.from({ length: latestHour - earliestHour + 1 }, (_, idx) => earliestHour + idx);
  const rowsByHour = new Map<number, typeof rows>();
  for (const hour of hourSlots) rowsByHour.set(hour, []);
  for (const row of rows) {
    const hour = businessHour(new Date(row.startAt));
    if (!rowsByHour.has(hour)) rowsByHour.set(hour, []);
    rowsByHour.get(hour)!.push(row);
  }

  const visibleTeacherCount = new Set(rows.map((row) => row.teacherName)).size;
  const visibleStudentCount = new Set(rows.flatMap((row) => row.students)).size;
  const visibleCampusCount = new Set(rows.map((row) => row.campusText)).size;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Teacher Lead Desk", "老师主管工作台")}
        subtitle={t(
          lang,
          "Review the full-day teaching schedule across all teachers, then narrow by teacher or campus when you need to coordinate coverage.",
          "先查看当天全部老师课表，再按老师或校区筛选，方便主管协调排班与跟进。"
        )}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/sessions", label: t(lang, "Open my sessions", "打开我的课次") },
        ]}
      />

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={{ border: "1px solid #dbeafe", borderRadius: 16, padding: 14, background: "#eff6ff" }}>
          <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>{t(lang, "Schedule date", "排班日期")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{date}</div>
        </div>
        <div style={{ border: "1px solid #dcfce7", borderRadius: 16, padding: 14, background: "#f0fdf4" }}>
          <div style={{ color: "#15803d", fontSize: 12, fontWeight: 700 }}>{t(lang, "Visible sessions", "当前课次数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{rows.length}</div>
        </div>
        <div style={{ border: "1px solid #e9d5ff", borderRadius: 16, padding: 14, background: "#faf5ff" }}>
          <div style={{ color: "#7c3aed", fontSize: 12, fontWeight: 700 }}>{t(lang, "Teachers in view", "当前老师数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{visibleTeacherCount}</div>
        </div>
        <div style={{ border: "1px solid #fde68a", borderRadius: 16, padding: 14, background: "#fffbeb" }}>
          <div style={{ color: "#b45309", fontSize: 12, fontWeight: 700 }}>{t(lang, "Students in view", "当前学生数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{visibleStudentCount}</div>
          <div style={{ marginTop: 4, color: "#92400e", fontSize: 12 }}>
            {t(lang, "Campus combinations", "校区组合")}: {visibleCampusCount}
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, background: "#ffffff" }}>
        <form method="GET" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Date", "日期")}</span>
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
          <a href={`/teacher/lead?date=${today}`}>{t(lang, "Today view", "回到今天")}</a>
          <a href="/teacher/lead">{t(lang, "Clear filters", "清除筛选")}</a>
        </form>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 800 }}>
          {t(lang, "Visual day board", "日历板视图")}
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            {t(
              lang,
              "No sessions match this date and filter set. Try opening the full teacher desk for today.",
              "当前日期和筛选条件下没有课次。可以切回今天或放宽老师、校区筛选。"
            )}
          </div>
        ) : (
          <div style={{ display: "grid" }}>
            {hourSlots.map((hour) => {
              const slotRows = rowsByHour.get(hour) ?? [];
              return (
                <div
                  key={`hour-${hour}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr",
                    borderTop: hour === hourSlots[0] ? "none" : "1px solid #f1f5f9",
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 12px",
                      background: "#f8fafc",
                      borderRight: "1px solid #e2e8f0",
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    {hourLabel(hour)}
                  </div>
                  <div style={{ padding: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                    {slotRows.length === 0 ? (
                      <div
                        style={{
                          minHeight: 64,
                          borderRadius: 12,
                          border: "1px dashed #e2e8f0",
                          background: "#ffffff",
                          color: "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          fontSize: 13,
                        }}
                      >
                        {t(lang, "No class starts in this hour", "这个整点没有课次开始")}
                      </div>
                    ) : (
                      slotRows.map((row) => (
                        <div
                          key={row.id}
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
                      ))
                    )}
                  </div>
                </div>
              );
            })}
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
                "No sessions match this date and filter set. Try opening the full teacher desk for today.",
                "当前日期和筛选条件下没有课次。可以切回今天或放宽老师、校区筛选。"
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

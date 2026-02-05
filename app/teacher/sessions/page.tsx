import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

export default async function TeacherSessionsPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 14);

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: start, lte: end },
      OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
    },
    include: {
      class: { include: { course: true, subject: true, level: true, campus: true, room: true } },
      attendances: true,
      feedbacks: { where: { teacherId: teacher.id } },
    },
    orderBy: { startAt: "asc" },
    take: 300,
  });

  return (
    <div>
      <h2>{t(lang, "My Sessions", "我的课次")}</h2>
      {sessions.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No sessions in range.", "当前范围内没有课次。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Time", "时间")}</th>
              <th align="left">{t(lang, "Class", "班级")}</th>
              <th align="left">{t(lang, "Campus", "校区")}</th>
              <th align="left">{t(lang, "Attendance", "点名")}</th>
              <th align="left">{t(lang, "Feedback", "课后反馈")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const total = s.attendances.length;
              const marked = s.attendances.filter((a) => a.status !== "UNMARKED").length;
              const hasFeedback = s.feedbacks.length > 0;
              return (
                <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
                  </td>
                  <td>
                    {s.class.course.name}
                    {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                    {s.class.level ? ` / ${s.class.level.name}` : ""}
                  </td>
                  <td>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </td>
                  <td>{marked}/{total}</td>
                  <td>{hasFeedback ? t(lang, "Submitted", "已提交") : t(lang, "Pending", "待提交")}</td>
                  <td>
                    <a href={`/teacher/sessions/${s.id}`}>{t(lang, "Open", "打开")}</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

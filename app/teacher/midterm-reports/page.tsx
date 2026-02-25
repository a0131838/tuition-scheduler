import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";

function fmt(d?: Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

export default async function TeacherMidtermReportsPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b91c1c" }}>{t(lang, "Teacher profile not linked.", "老师账号未绑定档案。")}</div>;
  }

  const rows = await prisma.midtermReport.findMany({
    where: { teacherId: teacher.id },
    include: {
      student: true,
      course: true,
      subject: true,
    },
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
    take: 300,
  });

  const pending = rows.filter((r) => r.status === "ASSIGNED");
  const submitted = rows.filter((r) => r.status === "SUBMITTED");

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>{t(lang, "Midterm Reports", "中期报告")}</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        {t(lang, "Open pending students, fill template, then submit.", "打开待处理学生，填写模板后提交。")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 1fr))", gap: 8, marginBottom: 12 }}>
        <div style={{ border: "1px solid #f59e0b", background: "#fff7ed", borderRadius: 8, padding: 10 }}>
          <div style={{ color: "#9a3412" }}>{t(lang, "Pending", "待填写")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{pending.length}</div>
        </div>
        <div style={{ border: "1px solid #34d399", background: "#ecfdf3", borderRadius: 8, padding: 10 }}>
          <div style={{ color: "#166534" }}>{t(lang, "Submitted", "已提交")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{submitted.length}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No midterm report tasks yet.", "暂无中期报告任务。")}</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left" style={{ padding: 6 }}>
                {t(lang, "Student", "学生")}
              </th>
              <th align="left" style={{ padding: 6 }}>
                {t(lang, "Course", "课程")}
              </th>
              <th align="left" style={{ padding: 6 }}>
                {t(lang, "Progress", "进度")}
              </th>
              <th align="left" style={{ padding: 6 }}>
                {t(lang, "Assigned At", "推送时间")}
              </th>
              <th align="left" style={{ padding: 6 }}>
                {t(lang, "Status", "状态")}
              </th>
              <th align="left" style={{ padding: 6 }}>
                {t(lang, "Action", "操作")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: 6, fontWeight: 700 }}>{r.student.name}</td>
                <td style={{ padding: 6 }}>
                  {r.course.name}
                  {r.subject ? ` / ${r.subject.name}` : ""}
                </td>
                <td style={{ padding: 6 }}>
                  {r.progressPercent}% ({formatMinutesToHours(r.consumedMinutes)}h / {formatMinutesToHours(r.totalMinutes)}h)
                </td>
                <td style={{ padding: 6 }}>{fmt(r.assignedAt)}</td>
                <td style={{ padding: 6 }}>
                  {r.status === "SUBMITTED" ? (
                    <span style={{ color: "#166534", fontWeight: 700 }}>{t(lang, "Submitted", "已提交")}</span>
                  ) : (
                    <span style={{ color: "#9a3412", fontWeight: 700 }}>{t(lang, "Pending", "待填写")}</span>
                  )}
                </td>
                <td style={{ padding: 6 }}>
                  <a href={`/teacher/midterm-reports/${encodeURIComponent(r.id)}`}>
                    {r.status === "SUBMITTED" ? t(lang, "View", "查看") : t(lang, "Fill", "填写")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

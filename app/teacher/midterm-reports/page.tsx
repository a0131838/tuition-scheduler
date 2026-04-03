import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/date-only";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

function fmt(d?: Date | null) {
  if (!d) return "-";
  return formatBusinessDateTime(new Date(d));
}

function statCard(bg: string, border: string) {
  return {
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: bg,
  } as const;
}

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  textDecoration: "none",
} as const;

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  textDecoration: "none",
} as const;

const emptyStateCardStyle = {
  border: "1px solid #dbeafe",
  background: "#f8fbff",
  borderRadius: 16,
  padding: 18,
  display: "grid",
  gap: 10,
} as const;

export default async function TeacherMidtermReportsPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <TeacherWorkspaceHero
          title={t(lang, "Midterm Reports", "中期报告")}
          subtitle={t(lang, "Open pending report tasks and submit them one student at a time.", "一次查看一位学生的报告任务并完成提交。")}
          actions={[
            { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          ]}
        />
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
            {t(lang, "Your teacher profile is not linked yet", "老师账号暂时还未绑定档案")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "Midterm report tasks stay unavailable until the current account is linked to a teacher profile.",
              "在当前账号和老师档案完成绑定前，这里的中期报告任务还不能使用。"
            )}
          </div>
        </section>
      </div>
    );
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
  const latestAssignedAt = rows[0]?.assignedAt ?? null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Midterm Reports", "中期报告")}
        subtitle={t(
          lang,
          "Review your pending report tasks, open one student at a time, and submit the completed report without scanning a dense admin-style table.",
          "在这里查看待处理的中期报告任务，一次打开一位学生完成填写，再提交，不必在密集后台表格里来回扫。"
        )}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/midterm-reports?focus=pending", label: t(lang, "Focus pending", "聚焦待填写") },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={statCard("#fff7ed", "#f59e0b")}>
          <div style={{ color: "#9a3412" }}>{t(lang, "Pending", "待填写")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{pending.length}</div>
        </div>
        <div style={statCard("#ecfdf3", "#34d399")}>
          <div style={{ color: "#166534" }}>{t(lang, "Submitted", "已提交")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{submitted.length}</div>
        </div>
        <div style={statCard("#eff6ff", "#bfdbfe")}>
          <div style={{ color: "#1d4ed8" }}>{t(lang, "Total tasks", "任务总数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1d4ed8" }}>{rows.length}</div>
        </div>
        <div style={statCard("#f8fafc", "#cbd5e1")}>
          <div style={{ color: "#334155" }}>{t(lang, "Latest assigned", "最近推送")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 12 }}>{fmt(latestAssignedAt)}</div>
        </div>
      </div>

      <div style={{ color: "#666", marginTop: -2 }}>
        {t(lang, "Open pending students, fill template, then submit.", "打开待处理学生，填写模板后提交。")}
      </div>

      {rows.length === 0 ? (
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>
            {t(lang, "No midterm report tasks yet", "暂时还没有中期报告任务")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "You do not need to do anything here right now. Come back when operations assigns a new report task, or return to sessions to continue daily teaching work.",
              "你现在不需要在这里操作。等教务分配新的报告任务后再回来，或者先返回课次页面继续日常教学。"
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/teacher/sessions" style={primaryButtonStyle}>{t(lang, "Open sessions", "打开课次")}</a>
            <a href="/teacher" style={secondaryButtonStyle}>{t(lang, "Back to dashboard", "返回工作台")}</a>
          </div>
        </section>
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
                  <a href={`/teacher/midterm-reports/${encodeURIComponent(r.id)}`} style={r.status === "SUBMITTED" ? secondaryButtonStyle : primaryButtonStyle}>
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

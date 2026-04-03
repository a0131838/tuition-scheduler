import { requireTeacherProfile } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
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

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string) {
  if (status === "FORWARDED") return t(lang, "Forwarded", "已转发");
  if (status === "SUBMITTED") return t(lang, "Submitted", "已提交");
  return t(lang, "Pending", "待填写");
}

function safeMinutes(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0));
}

export default async function TeacherFinalReportsPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <TeacherWorkspaceHero
          title={t(lang, "Final Reports", "结课报告")}
          subtitle={t(lang, "Open pending final report tasks and complete them one package at a time.", "按课包查看待处理的结课报告任务并逐个完成。")}
          actions={[{ href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") }]}
        />
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
            {t(lang, "Your teacher profile is not linked yet", "老师账号暂时还未绑定档案")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "Final report tasks stay unavailable until the current account is linked to a teacher profile.",
              "在当前账号和老师档案完成绑定前，这里的结课报告任务还不能使用。"
            )}
          </div>
        </section>
      </div>
    );
  }

  const rows = await prisma.finalReport.findMany({
    where: { teacherId: teacher.id },
    include: {
      student: true,
      course: true,
      subject: true,
      package: true,
    },
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
    take: 300,
  });

  const pending = rows.filter((row) => row.status === "ASSIGNED");
  const submitted = rows.filter((row) => row.status === "SUBMITTED");
  const forwarded = rows.filter((row) => row.status === "FORWARDED");
  const latestAssignedAt = rows[0]?.assignedAt ?? null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Final Reports", "结课报告")}
        subtitle={t(
          lang,
          "Review package-end report tasks, open one student at a time, and submit the final summary without scanning a dense operations table.",
          "在这里查看课包结课报告任务，一次打开一位学生完成总结并提交，不必在密集教务表格里来回扫。"
        )}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/final-reports?focus=pending", label: t(lang, "Focus pending", "聚焦待填写") },
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
        <div style={statCard("#eef2ff", "#c7d2fe")}>
          <div style={{ color: "#4338ca" }}>{t(lang, "Forwarded", "已转发")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{forwarded.length}</div>
        </div>
        <div style={statCard("#f8fafc", "#cbd5e1")}>
          <div style={{ color: "#334155" }}>{t(lang, "Latest assigned", "最近推送")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 12 }}>{fmt(latestAssignedAt)}</div>
        </div>
      </div>

      <div style={{ color: "#666", marginTop: -2 }}>
        {t(lang, "Open pending packages, complete the final summary, then submit.", "打开待处理课包，完成结课总结后提交。")}
      </div>

      {rows.length === 0 ? (
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>
            {t(lang, "No final report tasks yet", "暂时还没有结课报告任务")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "You do not need to do anything here right now. Come back when operations assigns a package-end report task, or return to sessions to continue daily teaching work.",
              "你现在不需要在这里操作。等教务分配新的结课报告任务后再回来，或者先返回课次页面继续日常教学。"
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
              <th align="left" style={{ padding: 6 }}>{t(lang, "Student", "学生")}</th>
              <th align="left" style={{ padding: 6 }}>{t(lang, "Course", "课程")}</th>
              <th align="left" style={{ padding: 6 }}>{t(lang, "Package balance", "课包余额")}</th>
              <th align="left" style={{ padding: 6 }}>{t(lang, "Assigned At", "推送时间")}</th>
              <th align="left" style={{ padding: 6 }}>{t(lang, "Status", "状态")}</th>
              <th align="left" style={{ padding: 6 }}>{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: 6, fontWeight: 700 }}>{row.student.name}</td>
                <td style={{ padding: 6 }}>
                  {row.course.name}
                  {row.subject ? ` / ${row.subject.name}` : ""}
                </td>
                <td style={{ padding: 6 }}>
                  {formatMinutesToHours(safeMinutes(row.package.remainingMinutes))}h / {formatMinutesToHours(safeMinutes(row.package.totalMinutes))}h
                </td>
                <td style={{ padding: 6 }}>{fmt(row.assignedAt)}</td>
                <td style={{ padding: 6 }}>
                  <span
                    style={{
                      color: row.status === "FORWARDED" ? "#4338ca" : row.status === "SUBMITTED" ? "#166534" : "#9a3412",
                      fontWeight: 700,
                    }}
                  >
                    {statusLabel(lang, row.status)}
                  </span>
                </td>
                <td style={{ padding: 6 }}>
                  <a
                    href={`/teacher/final-reports/${encodeURIComponent(row.id)}`}
                    style={row.status === "ASSIGNED" ? primaryButtonStyle : secondaryButtonStyle}
                  >
                    {row.status === "ASSIGNED" ? t(lang, "Fill", "填写") : t(lang, "View", "查看")}
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

import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { parseFinalReportDraft } from "@/lib/final-report";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

function cardStyle(border: string, background: string) {
  return {
    border: `1px solid ${border}`,
    background,
    borderRadius: 16,
    padding: 18,
  } as const;
}

function infoCard(color: string) {
  return {
    display: "grid",
    gap: 8,
    border: `1px solid ${color}`,
    background: "#ffffff",
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
  } as const;
}

function recommendationLabel(lang: "BILINGUAL" | "ZH" | "EN", value: string) {
  switch (value) {
    case "CONTINUE_CURRENT":
      return t(lang, "Continue current course", "继续当前课程");
    case "MOVE_TO_NEXT_LEVEL":
      return t(lang, "Move to next level", "进入下一阶段");
    case "CHANGE_FOCUS":
      return t(lang, "Change subject or focus", "调整课程方向");
    case "PAUSE_AFTER_COMPLETION":
      return t(lang, "Pause after completion", "结课后暂缓继续");
    case "COURSE_COMPLETED":
      return t(lang, "Course completed", "课程已完成");
    default:
      return "-";
  }
}

function deliveryChannelLabel(lang: "BILINGUAL" | "ZH" | "EN", value: string | null | undefined) {
  switch (value) {
    case "WECHAT":
      return t(lang, "WeChat", "微信");
    case "EMAIL":
      return t(lang, "Email", "邮件");
    case "WHATSAPP":
      return t(lang, "WhatsApp", "WhatsApp");
    case "PRINTED":
      return t(lang, "Printed copy", "纸质版");
    case "OTHER":
      return t(lang, "Other", "其他");
    default:
      return "-";
  }
}

function section(title: string, content: string) {
  return (
    <section
      style={{
        border: "1px solid #dbeafe",
        background: "#ffffff",
        borderRadius: 16,
        padding: 18,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>{title}</div>
      <div style={{ color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{content || "-"}</div>
    </section>
  );
}

export default async function FinalReportSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await getLang();
  const { id } = await params;
  const sp = await searchParams;
  const token = String(sp.token ?? "").trim();

  const report = await prisma.finalReport.findUnique({
    where: { id },
    include: {
      student: true,
      teacher: true,
      course: true,
      subject: true,
      package: true,
    },
  });

  const shareIsValid =
    Boolean(report) &&
    Boolean(token) &&
    report!.shareToken === token &&
    Boolean(report!.shareEnabledAt) &&
    !report!.shareRevokedAt;

  if (!shareIsValid || !report) {
    return (
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 16 }}>
        <section style={cardStyle("#fecaca", "#fff7f7")}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#b91c1c" }}>{t(lang, "Final report link unavailable", "结课报告链接不可用")}</div>
          <div style={{ color: "#475569", lineHeight: 1.7 }}>
            {t(
              lang,
              "This read-only final report link is missing, expired, or has been disabled by the school team. Please contact the school if you still need the final report.",
              "这份只读结课报告链接不存在、已失效，或已被教务停用。如仍需要查看报告，请联系教务。"
            )}
          </div>
        </section>
      </main>
    );
  }

  const draft = parseFinalReportDraft({
    ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}),
    recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep,
  });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px 40px", display: "grid", gap: 18 }}>
      <section style={cardStyle("#bfdbfe", "#f8fbff")}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#2563eb", marginBottom: 10 }}>
          {t(lang, "Student Final Report", "学生结课报告")}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: "#0f172a", lineHeight: 1.15 }}>
          {report.student.name}
        </div>
        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
          {report.course.name}
          {report.subject ? ` / ${report.subject.name}` : ""}
          {" · "}
          {report.teacher.name}
        </div>
        <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.7 }}>
          {t(lang, "Shared on", "分享时间")} {formatBusinessDateTime(new Date(report.shareEnabledAt!))}
          {report.deliveredAt ? ` · ${t(lang, "Delivered", "已交付")} ${formatBusinessDateOnly(new Date(report.deliveredAt))}` : ""}
          {report.deliveryChannel ? ` · ${deliveryChannelLabel(lang, report.deliveryChannel)}` : ""}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={infoCard("#dbeafe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Report period", "报告阶段")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{report.reportPeriodLabel || "-"}</div>
        </div>
        <div style={infoCard("#bbf7d0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Final level", "最终水平")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{report.finalLevel || "-"}</div>
        </div>
        <div style={infoCard("#fde68a")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#a16207" }}>{t(lang, "Overall score", "综合评分")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{report.overallScore?.toString() || "-"}</div>
        </div>
        <div style={infoCard("#ddd6fe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9" }}>{t(lang, "Next step", "下一步建议")}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{recommendationLabel(lang, report.recommendation || draft.recommendedNextStep)}</div>
        </div>
      </section>

      {section(t(lang, "Initial goals", "开始目标"), draft.initialGoals)}
      {section(t(lang, "Final outcome summary", "最终结果总结"), draft.finalSummary)}

      <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {section(t(lang, "Strengths", "学生优势"), draft.strengths)}
        {section(t(lang, "Areas to continue", "后续提升建议"), draft.areasToContinue)}
      </section>

      <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {section(t(lang, "Attendance comment", "出勤表现"), draft.attendanceComment)}
        {section(t(lang, "Homework comment", "作业表现"), draft.homeworkComment)}
      </section>

      {section(t(lang, "Message for parents", "给家长的话"), draft.parentNote)}
    </main>
  );
}

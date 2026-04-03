import { requireTeacherProfile } from "@/lib/auth";
import { formatBusinessDateOnly } from "@/lib/date-only";
import {
  EMPTY_FINAL_REPORT_DRAFT,
  FINAL_REPORT_RECOMMENDATIONS,
  parseFinalDraftFromFormData,
  parseFinalReportDraft,
} from "@/lib/final-report";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import TeacherWorkspaceHero from "../../_components/TeacherWorkspaceHero";

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

function statCard(bg: string, border: string) {
  return {
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: bg,
  } as const;
}

function asScore(v: string) {
  const text = v.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 9.99) return null;
  return Number(n.toFixed(2));
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

function safeMinutes(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0));
}

export default async function TeacherFinalReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const ok = String(sp.ok ?? "");
  const err = String(sp.err ?? "");
  const { teacher } = await requireTeacherProfile();
  const { id } = await params;

  if (!teacher) {
    return (
      <section style={emptyStateCardStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
          {t(lang, "Your teacher profile is not linked yet", "老师账号暂时还未绑定档案")}
        </div>
        <div style={{ color: "#475569", lineHeight: 1.6 }}>
          {t(lang, "This report cannot be opened until the current account is linked to a teacher profile.", "在当前账号和老师档案绑定之前，无法打开这份报告。")}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/teacher/final-reports" style={secondaryButtonStyle}>{t(lang, "Back to report list", "返回报告列表")}</a>
        </div>
      </section>
    );
  }

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

  if (!report || report.teacherId !== teacher.id || report.status === "EXEMPT" || report.archivedAt) {
    return (
      <section style={emptyStateCardStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
          {t(lang, "Report not found", "未找到这份报告")}
        </div>
        <div style={{ color: "#475569", lineHeight: 1.6 }}>
          {t(lang, "This report either no longer exists or is not assigned to your teacher account.", "这份报告可能已不存在，或并不属于当前老师账号。")}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/teacher/final-reports" style={secondaryButtonStyle}>{t(lang, "Back to report list", "返回报告列表")}</a>
        </div>
      </section>
    );
  }

  const reportId = report.id;
  const ownerTeacherId = report.teacherId;
  const isLocked = report.status === "FORWARDED";

  async function saveReport(formData: FormData) {
    "use server";
    const { teacher: currentTeacher } = await requireTeacherProfile();
    if (!currentTeacher || currentTeacher.id !== ownerTeacherId) {
      redirect("/teacher/final-reports?err=forbidden");
    }

    const latest = await prisma.finalReport.findUnique({
      where: { id: reportId },
      select: { status: true, submittedAt: true, archivedAt: true },
    });
    if (!latest || latest.status === "FORWARDED" || latest.status === "EXEMPT" || latest.archivedAt) {
      redirect(`/teacher/final-reports/${encodeURIComponent(reportId)}?err=locked`);
    }

    const intent = String(formData.get("intent") ?? "save");
    const draft = parseFinalDraftFromFormData(formData);
    const periodLabel = String(formData.get("reportPeriodLabel") ?? "").trim();
    const finalLevel = String(formData.get("finalLevel") ?? "").trim();
    const score = asScore(String(formData.get("overallScore") ?? ""));

    await prisma.finalReport.update({
      where: { id: reportId },
      data: {
        reportJson: draft as any,
        reportPeriodLabel: periodLabel || null,
        finalLevel: finalLevel || null,
        overallScore: score,
        recommendation: draft.recommendedNextStep || null,
        status: intent === "submit" ? "SUBMITTED" : latest.status,
        submittedAt: intent === "submit" ? new Date() : latest.submittedAt,
      },
    });

    revalidatePath("/teacher/final-reports");
    revalidatePath(`/teacher/final-reports/${reportId}`);
    revalidatePath("/admin/reports/final");
    redirect(`/teacher/final-reports/${encodeURIComponent(reportId)}?ok=${intent === "submit" ? "submitted" : "saved"}`);
  }

  const draft = parseFinalReportDraft({
    ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}),
    recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep,
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Final Report", "结课报告")}
        subtitle={`${report.student.name} | ${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}`}
        actions={[{ href: "/teacher/final-reports", label: t(lang, "Back to report list", "返回报告列表") }]}
      />

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={statCard("#fff7ed", "#fdba74")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412" }}>{t(lang, "Current status", "当前状态")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#9a3412", marginTop: 10 }}>
            {report.status === "FORWARDED"
              ? t(lang, "Forwarded", "已转发")
              : report.status === "SUBMITTED"
                ? t(lang, "Submitted", "已提交")
                : t(lang, "Pending", "待填写")}
          </div>
        </div>
        <div style={statCard("#eff6ff", "#bfdbfe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Assigned date", "推送日期")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8", marginTop: 10 }}>{formatBusinessDateOnly(new Date(report.assignedAt))}</div>
        </div>
        <div style={statCard("#ecfdf5", "#bbf7d0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Package balance", "课包余额")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#166534", marginTop: 10 }}>
            {formatMinutesToHours(safeMinutes(report.package.remainingMinutes))}h / {formatMinutesToHours(safeMinutes(report.package.totalMinutes))}h
          </div>
        </div>
        <div style={statCard("#f5f3ff", "#ddd6fe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9" }}>{t(lang, "Next step", "下一步")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#6d28d9", marginTop: 10 }}>
            {recommendationLabel(lang, report.recommendation ?? draft.recommendedNextStep)}
          </div>
        </div>
      </section>

      {ok ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {ok === "submitted" ? t(lang, "Final report submitted.", "结课报告已提交。") : t(lang, "Draft saved.", "草稿已保存。")}
        </div>
      ) : null}
      {isLocked || err === "locked" ? (
        <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 8, padding: "6px 8px", marginBottom: 10, color: "#1d4ed8" }}>
          {t(lang, "This final report has already been forwarded by operations and is now read-only.", "该结课报告已由教务转发，当前为只读不可修改。")}
        </div>
      ) : null}

      <form action={saveReport} style={{ display: "grid", gap: 10 }}>
        <fieldset disabled={isLocked} style={{ border: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          <div style={{ border: "1px solid #dbeafe", borderRadius: 10, background: "#eff6ff", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t(lang, "Package summary", "课包总结信息")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <label>
                {t(lang, "Report period", "报告阶段")}
                <input name="reportPeriodLabel" defaultValue={report.reportPeriodLabel ?? ""} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Final level", "最终水平")}
                <input name="finalLevel" defaultValue={report.finalLevel ?? ""} placeholder="A2 / B1 / Ready for next level..." style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Overall score", "综合评分")}
                <input name="overallScore" defaultValue={report.overallScore?.toString() ?? ""} placeholder="4.5" style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Recommended next step", "下一步建议")}
                <select name="recommendedNextStep" defaultValue={draft.recommendedNextStep} style={{ width: "100%" }}>
                  <option value="">{t(lang, "Select recommendation", "请选择建议")}</option>
                  {FINAL_REPORT_RECOMMENDATIONS.map((value) => (
                    <option key={value} value={value}>{recommendationLabel(lang, value)}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Initial goals", "开始目标")}</div>
            <textarea name="initialGoals" defaultValue={draft.initialGoals} rows={3} style={{ width: "100%" }} />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Final outcome summary", "最终结果总结")}</div>
            <textarea name="finalSummary" defaultValue={draft.finalSummary} rows={4} style={{ width: "100%" }} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "block" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Strengths", "学生优势")}</div>
              <textarea name="strengths" defaultValue={draft.strengths} rows={4} style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Areas to continue", "后续提升建议")}</div>
              <textarea name="areasToContinue" defaultValue={draft.areasToContinue} rows={4} style={{ width: "100%" }} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "block" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Attendance comment", "出勤表现")}</div>
              <textarea name="attendanceComment" defaultValue={draft.attendanceComment} rows={3} style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Homework comment", "作业表现")}</div>
              <textarea name="homeworkComment" defaultValue={draft.homeworkComment} rows={3} style={{ width: "100%" }} />
            </label>
          </div>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Parent note", "给家长的话")}</div>
            <textarea name="parentNote" defaultValue={draft.parentNote} rows={4} style={{ width: "100%" }} />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Teacher internal note", "教师内部备注")}</div>
            <textarea name="teacherComment" defaultValue={draft.teacherComment} rows={3} style={{ width: "100%" }} />
          </label>
        </fieldset>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!isLocked ? (
            <>
              <button type="submit" name="intent" value="save" style={secondaryButtonStyle}>
                {t(lang, "Save draft", "保存草稿")}
              </button>
              <button type="submit" name="intent" value="submit" style={primaryButtonStyle}>
                {t(lang, "Submit final report", "提交结课报告")}
              </button>
            </>
          ) : null}
          <a href="/teacher/final-reports" style={secondaryButtonStyle}>{t(lang, "Back to report list", "返回报告列表")}</a>
        </div>
      </form>
    </div>
  );
}

import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { EMPTY_REPORT_DRAFT, parseDraftFromFormData, parseReportDraft } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatBusinessDateOnly } from "@/lib/date-only";
import TeacherWorkspaceHero from "../../_components/TeacherWorkspaceHero";

const LEVEL_OPTIONS = ["", "A1", "A2", "B1", "B2", "C1"] as const;

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

function asScore(v: string) {
  const text = v.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 9.99) return null;
  return Number(n.toFixed(2));
}

function readLockedAfterForward(raw: unknown) {
  if (!raw || typeof raw !== "object") return false;
  const meta = (raw as any)?._meta;
  if (!meta || typeof meta !== "object") return false;
  return Boolean((meta as any).lockedAfterForwarded);
}

function SkillBlock({
  title,
  levelName,
  performanceName,
  strengthsName,
  improvementsName,
  draft,
  lang,
}: {
  title: string;
  levelName: "listeningLevel" | "readingLevel" | "writingLevel" | "speakingLevel";
  performanceName: "listeningPerformance" | "readingPerformance" | "writingPerformance" | "speakingPerformance";
  strengthsName: "listeningStrengths" | "readingStrengths" | "writingStrengths" | "speakingStrengths";
  improvementsName: "listeningImprovements" | "readingImprovements" | "writingImprovements" | "speakingImprovements";
  draft: ReturnType<typeof parseReportDraft>;
  lang: "BILINGUAL" | "ZH" | "EN";
}) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ marginBottom: 6 }}>
        <label>
          {t(lang, "Current Level", "当前水平")}
          <select name={levelName} defaultValue={draft[levelName]} style={{ marginLeft: 8 }}>
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || "-"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: "block", marginBottom: 6 }}>
        {t(lang, "Performance Summary", "表现概述")}
        <textarea name={performanceName} defaultValue={draft[performanceName]} rows={3} style={{ width: "100%" }} />
      </label>
      <label style={{ display: "block", marginBottom: 6 }}>
        {t(lang, "Strengths Observed", "优势表现")}
        <textarea name={strengthsName} defaultValue={draft[strengthsName]} rows={3} style={{ width: "100%" }} />
      </label>
      <label style={{ display: "block" }}>
        {t(lang, "Areas for Development", "待提升方向")}
        <textarea name={improvementsName} defaultValue={draft[improvementsName]} rows={3} style={{ width: "100%" }} />
      </label>
    </div>
  );
}

export default async function TeacherMidtermReportDetailPage({
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
          <a href="/teacher/midterm-reports" style={secondaryButtonStyle}>{t(lang, "Back to report list", "返回报告列表")}</a>
        </div>
      </section>
    );
  }

  const report = await prisma.midtermReport.findUnique({
    where: { id },
    include: {
      student: true,
      teacher: true,
      course: true,
      subject: true,
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
          <a href="/teacher/midterm-reports" style={secondaryButtonStyle}>{t(lang, "Back to report list", "返回报告列表")}</a>
        </div>
      </section>
    );
  }

  const reportId = report.id;
  const ownerTeacherId = report.teacherId;
  const currentStatus = report.status;
  const currentSubmittedAt = report.submittedAt;
  const isLocked = readLockedAfterForward(report.reportJson);

  async function saveReport(formData: FormData) {
    "use server";
    const { teacher: currentTeacher } = await requireTeacherProfile();
    if (!currentTeacher || currentTeacher.id !== ownerTeacherId) {
      redirect("/teacher/midterm-reports?err=forbidden");
    }

    const latest = await prisma.midtermReport.findUnique({
      where: { id: reportId },
      select: { reportJson: true, status: true, submittedAt: true, archivedAt: true },
    });
    if (!latest || latest.status === "EXEMPT" || latest.archivedAt || readLockedAfterForward(latest.reportJson)) {
      redirect(`/teacher/midterm-reports/${encodeURIComponent(reportId)}?err=locked`);
    }

    const intent = String(formData.get("intent") ?? "save");
    const draft = parseDraftFromFormData(formData);
    const estimatedCefr = String(formData.get("examTargetStatus") ?? "").trim();
    const periodLabel = String(formData.get("reportPeriodLabel") ?? "").trim();
    const score = asScore(String(formData.get("overallScore") ?? ""));

    await prisma.midtermReport.update({
      where: { id: reportId },
      data: {
        reportJson: draft as any,
        examTargetStatus: estimatedCefr || null,
        reportPeriodLabel: periodLabel || null,
        overallScore: score,
        status: intent === "submit" ? "SUBMITTED" : latest.status,
        submittedAt: intent === "submit" ? new Date() : latest.submittedAt,
      },
    });

    revalidatePath("/teacher/midterm-reports");
    revalidatePath(`/teacher/midterm-reports/${reportId}`);
    revalidatePath("/admin/reports/midterm");
    redirect(`/teacher/midterm-reports/${encodeURIComponent(reportId)}?ok=${intent === "submit" ? "submitted" : "saved"}`);
  }

  const draft = parseReportDraft(report.reportJson ?? EMPTY_REPORT_DRAFT);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Mid-term Report", "阶段性学习评估报告")}
        subtitle={`${report.student.name} | ${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}`}
        actions={[
          { href: "/teacher/midterm-reports", label: t(lang, "Back to report list", "返回报告列表") },
        ]}
      />

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={statCard("#fff7ed", "#fdba74")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412" }}>{t(lang, "Current status", "当前状态")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#9a3412", marginTop: 10 }}>
            {report.status === "SUBMITTED" ? t(lang, "Submitted", "已提交") : t(lang, "Pending", "待填写")}
          </div>
        </div>
        <div style={statCard("#eff6ff", "#bfdbfe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Assigned date", "推送日期")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8", marginTop: 10 }}>{formatBusinessDateOnly(new Date(report.assignedAt))}</div>
        </div>
        <div style={statCard("#ecfdf5", "#bbf7d0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Progress", "学习进度")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#166534", marginTop: 10 }}>{report.progressPercent}%</div>
          <div style={{ color: "#166534", marginTop: 4 }}>{`${report.consumedMinutes} / ${report.totalMinutes} min`}</div>
        </div>
        <div style={statCard("#f5f3ff", "#ddd6fe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9" }}>{t(lang, "Report mode", "报告模式")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6d28d9", marginTop: 10 }}>
            {isLocked ? t(lang, "Read only", "只读") : t(lang, "Editable", "可编辑")}
          </div>
        </div>
      </section>

      {ok ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {ok === "submitted" ? t(lang, "Report submitted.", "报告已提交。") : t(lang, "Draft saved.", "草稿已保存。")}
        </div>
      ) : null}
      {isLocked || err === "locked" ? (
        <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 8, padding: "6px 8px", marginBottom: 10, color: "#1d4ed8" }}>
          {t(lang, "This report has been forwarded by admin and is now locked (read-only).", "该报告已由教务转发并锁定，当前为只读不可修改。")}
        </div>
      ) : null}

      <form action={saveReport} style={{ display: "grid", gap: 10 }}>
        <fieldset disabled={isLocked} style={{ border: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          <div style={{ border: "1px solid #dbeafe", borderRadius: 10, background: "#eff6ff", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t(lang, "Student Information", "学生基本信息")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(180px, 1fr))", gap: 8 }}>
              <label>
                {t(lang, "Date of Report", "报告日期")}
                <input value={formatBusinessDateOnly(new Date())} readOnly style={{ width: "100%", background: "#f8fafc" }} />
              </label>
              <label>
                {t(lang, "Assessment Period", "评估阶段")}
                <input name="reportPeriodLabel" defaultValue={report.reportPeriodLabel ?? ""} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Assessment Tool Used", "评估工具")}
                <input name="assessmentTool" defaultValue={draft.assessmentTool} placeholder="iTEP / Internal Placement Test / CEFR..." style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Overall Score (if applicable)", "综合成绩（如适用）")}
                <input name="overallScore" defaultValue={report.overallScore?.toString() ?? ""} placeholder="4.2" style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Estimated CEFR Level", "预估CEFR等级")}
                <input name="examTargetStatus" defaultValue={report.examTargetStatus ?? ""} placeholder="A2 / B1..." style={{ width: "100%" }} />
              </label>
            </div>
          </div>

          <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Important Note", "重要声明")}</div>
            <textarea name="warningNote" defaultValue={draft.warningNote} rows={3} style={{ width: "100%" }} />
          </div>

          <div style={{ border: "1px solid #fde68a", borderRadius: 10, background: "#fffbeb", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Overall Evaluation", "总体评估")}</div>
            <label style={{ display: "block", marginBottom: 6 }}>
              {t(lang, "Estimated Level Statement", "整体水平陈述")}
              <input name="overallEstimatedLevel" defaultValue={draft.overallEstimatedLevel} style={{ width: "100%" }} />
            </label>
            <label style={{ display: "block" }}>
              {t(lang, "Summary of Performance", "综合表现概述")}
              <textarea name="overallSummary" defaultValue={draft.overallSummary} rows={4} style={{ width: "100%" }} />
            </label>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#f8fafc", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t(lang, "Skill-Based Evaluation", "分项能力评估")}</div>
            <div style={{ display: "grid", gap: 8 }}>
              <SkillBlock
                title={t(lang, "Listening", "听力")}
                levelName="listeningLevel"
                performanceName="listeningPerformance"
                strengthsName="listeningStrengths"
                improvementsName="listeningImprovements"
                draft={draft}
                lang={lang}
              />
              <SkillBlock
                title={t(lang, "Reading", "阅读")}
                levelName="readingLevel"
                performanceName="readingPerformance"
                strengthsName="readingStrengths"
                improvementsName="readingImprovements"
                draft={draft}
                lang={lang}
              />
              <SkillBlock
                title={t(lang, "Writing", "写作")}
                levelName="writingLevel"
                performanceName="writingPerformance"
                strengthsName="writingStrengths"
                improvementsName="writingImprovements"
                draft={draft}
                lang={lang}
              />
              <SkillBlock
                title={t(lang, "Speaking", "口语")}
                levelName="speakingLevel"
                performanceName="speakingPerformance"
                strengthsName="speakingStrengths"
                improvementsName="speakingImprovements"
                draft={draft}
                lang={lang}
              />
            </div>
          </div>

          <div style={{ border: "1px solid #c7d2fe", borderRadius: 10, background: "#eef2ff", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Learning Disposition & Classroom Performance", "学习态度与课堂表现")}</div>
            <div style={{ display: "grid", gap: 6 }}>
              <label>
                {t(lang, "Class Participation", "课堂参与度")}
                <textarea name="classParticipation" defaultValue={draft.classParticipation} rows={2} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Focus & Engagement", "专注度与投入度")}
                <textarea name="focusEngagement" defaultValue={draft.focusEngagement} rows={2} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Homework Completion & Preparation", "作业完成情况")}
                <textarea name="homeworkPreparation" defaultValue={draft.homeworkPreparation} rows={2} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "General Attitude Toward Learning", "学习态度总体评价")}
                <textarea name="attitudeGeneral" defaultValue={draft.attitudeGeneral} rows={2} style={{ width: "100%" }} />
              </label>
            </div>
          </div>

          <div style={{ border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Summary & Recommendations", "总结与学习建议")}</div>
            <div style={{ display: "grid", gap: 6 }}>
              <label>
                {t(lang, "Key Strengths", "核心优势")}
                <textarea name="keyStrengths" defaultValue={draft.keyStrengths} rows={3} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Primary Bottlenecks", "主要瓶颈")}
                <textarea name="primaryBottlenecks" defaultValue={draft.primaryBottlenecks} rows={3} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Recommended Focus for Next Phase", "下一阶段重点方向")}
                <textarea name="nextPhaseFocus" defaultValue={draft.nextPhaseFocus} rows={3} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Suggested Practice Load", "建议练习时长")}
                <input name="suggestedPracticeLoad" defaultValue={draft.suggestedPracticeLoad} style={{ width: "100%" }} />
              </label>
              <label>
                {t(lang, "Target Level / Target Score", "目标等级或分数")}
                <input name="targetLevelScore" defaultValue={draft.targetLevelScore} style={{ width: "100%" }} />
              </label>
            </div>
          </div>

          <div style={{ border: "1px solid #fbcfe8", borderRadius: 10, background: "#fdf2f8", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 2 }}>{t(lang, "Exam Score Block (Optional)", "考试成绩板块（可选）")}</div>
            <div style={{ fontSize: 12, color: "#7c2d12", marginBottom: 6 }}>
              {t(
                lang,
                "Customize exam name and score items (e.g. iTEP / WIDA / IELTS). Leave blank to hide this section in PDF.",
                "可自定义考试名称与分项（如 iTEP / WIDA / IELTS）；若不填写，PDF 中将不显示该板块。"
              )}
            </div>
            <label style={{ display: "block", marginBottom: 8 }}>
              {t(lang, "Exam Name", "考试名称")}
              <input name="examName" defaultValue={draft.examName} placeholder="iTEP / WIDA / IELTS..." style={{ width: "100%" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 8 }}>
              <label>{t(lang, "Item 1 Name", "分项1名称")}<input name="examMetric1Label" defaultValue={draft.examMetric1Label} /></label>
              <label>{t(lang, "Item 1 Score", "分项1分数")}<input name="examMetric1Value" defaultValue={draft.examMetric1Value} /></label>
              <label>{t(lang, "Item 2 Name", "分项2名称")}<input name="examMetric2Label" defaultValue={draft.examMetric2Label} /></label>
              <label>{t(lang, "Item 2 Score", "分项2分数")}<input name="examMetric2Value" defaultValue={draft.examMetric2Value} /></label>
              <label>{t(lang, "Item 3 Name", "分项3名称")}<input name="examMetric3Label" defaultValue={draft.examMetric3Label} /></label>
              <label>{t(lang, "Item 3 Score", "分项3分数")}<input name="examMetric3Value" defaultValue={draft.examMetric3Value} /></label>
              <label>{t(lang, "Item 4 Name", "分项4名称")}<input name="examMetric4Label" defaultValue={draft.examMetric4Label} /></label>
              <label>{t(lang, "Item 4 Score", "分项4分数")}<input name="examMetric4Value" defaultValue={draft.examMetric4Value} /></label>
              <label>{t(lang, "Item 5 Name", "分项5名称")}<input name="examMetric5Label" defaultValue={draft.examMetric5Label} /></label>
              <label>{t(lang, "Item 5 Score", "分项5分数")}<input name="examMetric5Value" defaultValue={draft.examMetric5Value} /></label>
              <label>{t(lang, "Item 6 Name", "分项6名称")}<input name="examMetric6Label" defaultValue={draft.examMetric6Label} /></label>
              <label>{t(lang, "Item 6 Score", "分项6分数")}<input name="examMetric6Value" defaultValue={draft.examMetric6Value} /></label>
              <label>{t(lang, "Total Label", "总分名称")}<input name="examTotalLabel" defaultValue={draft.examTotalLabel} placeholder="Total" /></label>
              <label>{t(lang, "Total Score", "总分")}<input name="examTotalValue" defaultValue={draft.examTotalValue} /></label>
            </div>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" name="intent" value="save" disabled={isLocked} style={secondaryButtonStyle}>
            {t(lang, "Save Draft", "保存草稿")}
          </button>
          <button type="submit" name="intent" value="submit" disabled={isLocked} style={primaryButtonStyle}>
            {t(lang, "Submit Report", "提交报告")}
          </button>
          {report.status === "SUBMITTED" ? <span style={{ color: "#166534", fontWeight: 700 }}>{t(lang, "Submitted", "已提交")}</span> : null}
          {isLocked ? <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{t(lang, "Locked", "已锁定")}</span> : null}
        </div>
      </form>
    </div>
  );
}

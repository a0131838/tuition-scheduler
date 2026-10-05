import { parseReportDraft } from "@/lib/midterm-report";
import { createLearningReportAttendanceSnapshot, learningReportPeriodLabel, parseLearningReportAttendanceSnapshot } from "@/lib/learning-report-attendance";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { renderLearningReportPdf, reportPdfLabel, type ReportPdfLang, type ReportPdfSection } from "./learning-report-pdf-layout";

function safeName(s: string) { return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_"); }

export function midtermPdfSections(draft: ReturnType<typeof parseReportDraft>, overview: Array<{ label: string; value: string }>, lang: ReportPdfLang): ReportPdfSection[] {
  const label = (en: string, zh: string) => reportPdfLabel(lang, en, zh);
  const sections: ReportPdfSection[] = [
    { title: label("Student overview", "学生基本信息"), table: true, fields: overview },
    { title: label("Important note", "重要声明"), fields: [{ label: "", value: draft.warningNote }] },
    { title: label("Overall assessment", "总体评估"), fields: [
      { label: label("Overall level", "整体水平"), value: draft.overallEstimatedLevel },
      { label: label("Performance summary", "综合表现概述"), value: draft.overallSummary },
    ] },
  ];
  const skills = [
    ["Listening", "听力", draft.listeningLevel, draft.listeningPerformance, draft.listeningStrengths, draft.listeningImprovements],
    ["Reading", "阅读", draft.readingLevel, draft.readingPerformance, draft.readingStrengths, draft.readingImprovements],
    ["Writing", "写作", draft.writingLevel, draft.writingPerformance, draft.writingStrengths, draft.writingImprovements],
    ["Speaking", "口语", draft.speakingLevel, draft.speakingPerformance, draft.speakingStrengths, draft.speakingImprovements],
  ];
  for (const [en, zh, level, performance, strengths, improvements] of skills) sections.push({
    title: label(en, zh), fields: [
      { label: label("Current level", "当前水平"), value: level },
      { label: label("Performance", "表现概述"), value: performance },
      { label: label("Strengths", "优势表现"), value: strengths },
      { label: label("Areas to improve", "待提升方向"), value: improvements },
    ],
  });
  sections.push({ title: label("Learning attitude and class performance", "学习态度与课堂表现"), fields: [
    { label: label("Class participation", "课堂参与度"), value: draft.classParticipation },
    { label: label("Focus and engagement", "专注度与投入度"), value: draft.focusEngagement },
    { label: label("Homework", "作业完成情况"), value: draft.homeworkPreparation },
    { label: label("Overall learning attitude", "学习态度总体评价"), value: draft.attitudeGeneral },
  ] }, { title: label("Summary and learning recommendations", "总结与学习建议"), fields: [
    { label: label("Key strengths", "核心优势"), value: draft.keyStrengths },
    { label: label("Main challenges", "主要瓶颈"), value: draft.primaryBottlenecks },
    { label: label("Next-stage focus", "下一阶段重点方向"), value: draft.nextPhaseFocus },
    { label: label("Suggested practice", "建议练习时长"), value: draft.suggestedPracticeLoad },
    { label: label("Target level or score", "目标等级或分数"), value: draft.targetLevelScore },
  ] });
  const scores = [
    { label: draft.examMetric1Label, value: draft.examMetric1Value },
    { label: draft.examMetric2Label, value: draft.examMetric2Value },
    { label: draft.examMetric3Label, value: draft.examMetric3Value },
    { label: draft.examMetric4Label, value: draft.examMetric4Value },
    { label: draft.examMetric5Label, value: draft.examMetric5Value },
    { label: draft.examMetric6Label, value: draft.examMetric6Value },
    { label: draft.examTotalLabel, value: draft.examTotalValue },
  ].filter(row => row.value.trim());
  if (scores.length) sections.push({ title: `${draft.examName || label("Assessment", "考试")} - ${label("Scores", "成绩分项")}`, table: true, fields: scores });
  return sections;
}

export async function buildMidtermReportPdfResponse(id: string, lang: ReportPdfLang = "ZH") {
  const report = await prisma.midtermReport.findUnique({
    where: { id },
    include: { student: true, teacher: true, course: true, subject: true },
  });
  if (!report) return new Response("Report not found", { status: 404 });

  const draft = parseReportDraft(report.reportJson);
  const attendanceSnapshot =
    parseLearningReportAttendanceSnapshot(report.reportJson) ??
    (await createLearningReportAttendanceSnapshot({
      packageId: report.packageId,
      studentId: report.studentId,
      subjectId: report.subjectId,
      teacherId: report.teacherId,
      throughAt: report.submittedAt ?? new Date(),
    }));

  const label = (en: string, zh: string) => reportPdfLabel(lang, en, zh);
  const sections = midtermPdfSections(draft, [
    { label: label("Student", "学生姓名"), value: report.student.name },
    { label: label("Course", "课程"), value: `${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}` },
    { label: label("Report date", "报告日期"), value: formatBusinessDateOnly(new Date()) },
    { label: label("Learning period", "评估阶段"), value: learningReportPeriodLabel(attendanceSnapshot, report.reportPeriodLabel, lang) },
    { label: label("Assessment tool", "评估工具"), value: draft.assessmentTool },
    { label: label("Overall score", "综合成绩"), value: String(report.overallScore ?? "-") },
    { label: label("Estimated CEFR level", "预估CEFR等级"), value: report.examTargetStatus || "-" },
  ], lang);
  const bytes = await renderLearningReportPdf(label("Midterm Learning Report", "阶段性学习评估报告"), sections, lang);
  const filename = `midterm-report-${safeName(report.student.name)}-${safeName(report.course.name)}.pdf`;
  const filenameAscii = filename.replace(/[^\x20-\x7E]/g, "_");
  const filenameUtf8 = encodeURIComponent(filename);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`,
    },
  });
}

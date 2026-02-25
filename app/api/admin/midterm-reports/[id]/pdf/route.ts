import { requireAdmin } from "@/lib/auth";
import { parseReportDraft } from "@/lib/midterm-report";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function drawSectionTitle(doc: PDFDoc, title: string, y: number) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  doc.roundedRect(left, y, width, 24, 8).fill("#f3f4f6");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(12).text(title, left + 10, y + 6);
  setPdfFont(doc);
  return y + 30;
}

function drawParagraph(doc: PDFDoc, text: string, y: number, color = "#1f2937") {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  setPdfFont(doc);
  doc.fillColor(color).fontSize(10.5);
  doc.text(text || "-", left, y, { width, lineGap: 2 });
  return doc.y + 6;
}

function ensurePage(doc: PDFDoc, y: number, need = 90) {
  if (y + need <= doc.page.height - doc.page.margins.bottom) return y;
  doc.addPage();
  return doc.page.margins.top;
}

function drawSkillBlock(doc: PDFDoc, y: number, title: string, level: string, performance: string, strengths: string, improvements: string) {
  y = drawSectionTitle(doc, title, y);
  y = drawParagraph(doc, `Current Level / 当前水平: ${level || "-"}`, y);
  y = drawParagraph(doc, `Performance Summary / 表现概述: ${performance || "-"}`, y);
  y = drawParagraph(doc, `Strengths Observed / 优势表现: ${strengths || "-"}`, y);
  y = drawParagraph(doc, `Areas for Development / 待提升方向: ${improvements || "-"}`, y);
  return y;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const report = await prisma.midtermReport.findUnique({
    where: { id },
    include: {
      student: true,
      teacher: true,
      course: true,
      subject: true,
    },
  });
  if (!report) return new Response("Report not found", { status: 404 });
  const draft = parseReportDraft(report.reportJson);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  setPdfFont(doc);

  setPdfBoldFont(doc);
  doc.fillColor("#7f1d1d").fontSize(18).text("MID-TERM / PROGRESS ASSESSMENT REPORT");
  doc.fontSize(14).text("阶段性学习评估报告");
  setPdfFont(doc);
  doc.moveDown(0.5);

  let y = doc.y + 2;
  y = drawSectionTitle(doc, "Student Information / 学生基本信息", y);
  y = drawParagraph(doc, `Student Name / 学生姓名: ${report.student.name}`, y);
  y = drawParagraph(doc, `Date of Report / 报告日期: ${new Date().toLocaleDateString()}`, y);
  y = drawParagraph(doc, `Assessment Period / 评估阶段: ${report.reportPeriodLabel || "-"}`, y);
  y = drawParagraph(doc, `Assessment Tool Used / 评估工具: ${draft.assessmentTool || "-"}`, y);
  y = drawParagraph(doc, `Overall Score (if applicable) / 综合成绩（如适用）: ${report.overallScore ?? "-"}`, y);
  y = drawParagraph(doc, `Estimated CEFR Level / 预估CEFR等级: ${report.examTargetStatus || "-"}`, y);

  y = ensurePage(doc, y, 80);
  y = drawSectionTitle(doc, "Important Note / 重要声明", y);
  y = drawParagraph(doc, draft.warningNote, y, "#7f1d1d");

  y = ensurePage(doc, y, 120);
  y = drawSectionTitle(doc, "Overall Evaluation / 总体评估", y);
  y = drawParagraph(doc, `Estimated overall level / 整体水平: ${draft.overallEstimatedLevel || "-"}`, y);
  y = drawParagraph(doc, `Summary of Performance / 综合表现概述: ${draft.overallSummary || "-"}`, y);

  y = ensurePage(doc, y, 200);
  y = drawSectionTitle(doc, "Skill-Based Evaluation / 分项能力评估", y);
  y = drawSkillBlock(doc, y, "Listening / 听力", draft.listeningLevel, draft.listeningPerformance, draft.listeningStrengths, draft.listeningImprovements);
  y = ensurePage(doc, y, 160);
  y = drawSkillBlock(doc, y, "Reading / 阅读", draft.readingLevel, draft.readingPerformance, draft.readingStrengths, draft.readingImprovements);
  y = ensurePage(doc, y, 160);
  y = drawSkillBlock(doc, y, "Writing / 写作", draft.writingLevel, draft.writingPerformance, draft.writingStrengths, draft.writingImprovements);
  y = ensurePage(doc, y, 160);
  y = drawSkillBlock(doc, y, "Speaking / 口语", draft.speakingLevel, draft.speakingPerformance, draft.speakingStrengths, draft.speakingImprovements);

  y = ensurePage(doc, y, 150);
  y = drawSectionTitle(doc, "Learning Disposition & Classroom Performance / 学习态度与课堂表现", y);
  y = drawParagraph(doc, `Class Participation / 课堂参与度: ${draft.classParticipation || "-"}`, y);
  y = drawParagraph(doc, `Focus & Engagement / 专注度与投入度: ${draft.focusEngagement || "-"}`, y);
  y = drawParagraph(doc, `Homework Completion & Preparation / 作业完成情况: ${draft.homeworkPreparation || "-"}`, y);
  y = drawParagraph(doc, `General Attitude Toward Learning / 学习态度总体评价: ${draft.attitudeGeneral || "-"}`, y);

  y = ensurePage(doc, y, 170);
  y = drawSectionTitle(doc, "Summary & Recommendations / 总结与学习建议", y);
  y = drawParagraph(doc, `Key Strengths / 核心优势: ${draft.keyStrengths || "-"}`, y);
  y = drawParagraph(doc, `Primary Bottlenecks / 主要瓶颈: ${draft.primaryBottlenecks || "-"}`, y);
  y = drawParagraph(doc, `Recommended Focus for Next Phase / 下一阶段重点方向: ${draft.nextPhaseFocus || "-"}`, y);
  y = drawParagraph(doc, `Suggested Practice Load / 建议练习时长: ${draft.suggestedPracticeLoad || "-"}`, y);
  y = drawParagraph(doc, `Target Level / Target Score / 目标等级或分数: ${draft.targetLevelScore || "-"}`, y);

  const examRows = [
    { label: draft.examMetric1Label, value: draft.examMetric1Value },
    { label: draft.examMetric2Label, value: draft.examMetric2Value },
    { label: draft.examMetric3Label, value: draft.examMetric3Value },
    { label: draft.examMetric4Label, value: draft.examMetric4Value },
    { label: draft.examMetric5Label, value: draft.examMetric5Value },
    { label: draft.examMetric6Label, value: draft.examMetric6Value },
    { label: draft.examTotalLabel, value: draft.examTotalValue },
  ].filter((r) => String(r.label || "").trim() || String(r.value || "").trim());
  const hasExamBlock = String(draft.examName || "").trim() || examRows.length > 0;
  if (hasExamBlock) {
    y = ensurePage(doc, y, 120);
    const examTitle = String(draft.examName || "").trim();
    y = drawSectionTitle(
      doc,
      examTitle
        ? `${examTitle} Score Breakdown (Optional) / ${examTitle} 成绩分项（可选）`
        : "Exam Score Breakdown (Optional) / 考试成绩分项（可选）",
      y
    );
    if (examRows.length === 0) {
      y = drawParagraph(doc, "No score items provided. / 未填写分项分数。", y, "#6b7280");
    } else {
      for (const row of examRows) {
        const name = String(row.label || "").trim() || "-";
        const score = String(row.value || "").trim() || "-";
        y = drawParagraph(doc, `${name}: ${score}`, y);
      }
    }
  }

  setPdfFont(doc);
  doc.fillColor("#6b7280").fontSize(9).text(`Generated at ${new Date().toLocaleString()}`, doc.page.margins.left, doc.page.height - 30, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: "right",
  });

  const stream = streamPdf(doc);
  const filename = `midterm-report-${safeName(report.student.name)}-${safeName(report.course.name)}.pdf`;
  const filenameAscii = filename.replace(/[^\x20-\x7E]/g, "_");
  const filenameUtf8 = encodeURIComponent(filename);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`,
    },
  });
}

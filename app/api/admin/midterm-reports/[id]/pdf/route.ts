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

function fitText(doc: PDFDoc, text: string, width: number, maxLines: number, fontSize: number) {
  const raw = String(text || "").replace(/\r/g, "").trim();
  if (!raw) return "-";
  setPdfFont(doc);
  doc.fontSize(fontSize);
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (doc.widthOfString(candidate) <= width) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = w;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  let result = lines.slice(0, maxLines).join("\n");
  if (lines.length >= maxLines && words.join(" ").length > result.replace(/\n/g, " ").length) {
    result = `${result.slice(0, Math.max(0, result.length - 1))}…`;
  }
  return result;
}

function drawTitleBlock(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill("#f8fafc").stroke("#cbd5e1");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#0f172a").fontSize(9.5).text(title, x + 6, y + 5, { width: w - 12 });
}

function drawKeyValue(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string, lines = 1) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(7.5).text(label, x, y, { width: w });
  setPdfFont(doc);
  doc.fillColor("#0f172a").fontSize(7.5).text(fitText(doc, value, w, lines, 7.5), x, y + 10, { width: w, lineGap: 1 });
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

  // Force single page by using landscape + dense layout.
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 18 });
  setPdfFont(doc);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const contentW = pageW - left * 2;
  const contentH = pageH - top * 2;

  setPdfBoldFont(doc);
  doc.fillColor("#7f1d1d").fontSize(13).text("MID-TERM / PROGRESS ASSESSMENT REPORT", left, top);
  doc.fontSize(10.5).text("阶段性学习评估报告", left + 360, top + 1);
  setPdfFont(doc);

  // Row 1: Student info + Important note
  const y1 = top + 20;
  const h1 = 84;
  const gap = 8;
  const w1a = Math.floor(contentW * 0.52);
  const w1b = contentW - w1a - gap;
  drawTitleBlock(doc, left, y1, w1a, h1, "Student Information / 学生基本信息");
  drawKeyValue(doc, left + 8, y1 + 20, 160, "Student / 学生", report.student.name);
  drawKeyValue(doc, left + 176, y1 + 20, 140, "Date / 日期", new Date().toLocaleDateString());
  drawKeyValue(doc, left + 324, y1 + 20, w1a - 332, "Period / 评估阶段", report.reportPeriodLabel || "-");
  drawKeyValue(doc, left + 8, y1 + 46, 220, "Tool / 评估工具", draft.assessmentTool || "-");
  drawKeyValue(doc, left + 236, y1 + 46, 120, "Score / 综合成绩", String(report.overallScore ?? "-"));
  drawKeyValue(doc, left + 364, y1 + 46, w1a - 372, "Estimated CEFR / 预估CEFR", report.examTargetStatus || "-");

  drawTitleBlock(doc, left + w1a + gap, y1, w1b, h1, "Important Note / 重要声明");
  setPdfFont(doc);
  doc.fillColor("#7f1d1d").fontSize(7.2).text(fitText(doc, draft.warningNote, w1b - 14, 8, 7.2), left + w1a + gap + 7, y1 + 20, {
    width: w1b - 14,
    lineGap: 1,
  });

  // Row 2: Overall + skill grid
  const y2 = y1 + h1 + gap;
  const h2 = 170;
  const w2a = Math.floor(contentW * 0.34);
  const w2b = contentW - w2a - gap;
  drawTitleBlock(doc, left, y2, w2a, h2, "Overall Evaluation / 总体评估");
  drawKeyValue(doc, left + 8, y2 + 20, w2a - 16, "Estimated Level / 整体水平", draft.overallEstimatedLevel || "-", 2);
  drawKeyValue(doc, left + 8, y2 + 54, w2a - 16, "Summary / 综合表现", draft.overallSummary || "-", 10);

  drawTitleBlock(doc, left + w2a + gap, y2, w2b, h2, "Skill-Based Evaluation / 分项能力评估");
  const cardGap = 6;
  const cardW = Math.floor((w2b - cardGap) / 2);
  const cardH = Math.floor((h2 - 24 - cardGap) / 2);
  const sx = left + w2a + gap + 6;
  const sy = y2 + 18;
  const skillCards = [
    { t: "Listening / 听力", l: draft.listeningLevel, p: draft.listeningPerformance, s: draft.listeningStrengths, d: draft.listeningImprovements, x: sx, y: sy },
    { t: "Reading / 阅读", l: draft.readingLevel, p: draft.readingPerformance, s: draft.readingStrengths, d: draft.readingImprovements, x: sx + cardW + cardGap, y: sy },
    { t: "Writing / 写作", l: draft.writingLevel, p: draft.writingPerformance, s: draft.writingStrengths, d: draft.writingImprovements, x: sx, y: sy + cardH + cardGap },
    { t: "Speaking / 口语", l: draft.speakingLevel, p: draft.speakingPerformance, s: draft.speakingStrengths, d: draft.speakingImprovements, x: sx + cardW + cardGap, y: sy + cardH + cardGap },
  ];
  for (const c of skillCards) {
    doc.save();
    doc.roundedRect(c.x, c.y, cardW - 6, cardH - 6, 5).fill("#ffffff").stroke("#e2e8f0");
    doc.restore();
    setPdfBoldFont(doc);
    doc.fillColor("#0f172a").fontSize(8).text(c.t, c.x + 5, c.y + 4, { width: cardW - 16 });
    setPdfFont(doc);
    doc.fillColor("#334155").fontSize(7).text(`Level: ${c.l || "-"}`, c.x + 5, c.y + 16, { width: cardW - 16 });
    doc
      .fontSize(6.7)
      .fillColor("#111827")
      .text(`Performance Summary / 表现概述: ${fitText(doc, c.p || "-", cardW - 22, 2, 6.7)}`, c.x + 5, c.y + 28, { width: cardW - 16 });
    doc.text(`Strengths Observed / 优势表现: ${fitText(doc, c.s || "-", cardW - 22, 2, 6.7)}`, c.x + 5, c.y + 43, { width: cardW - 16 });
    doc.text(`Areas for Development / 待提升方向: ${fitText(doc, c.d || "-", cardW - 22, 2, 6.7)}`, c.x + 5, c.y + 58, { width: cardW - 16 });
  }

  // Row 3: disposition + recommendation + optional exam
  const y3 = y2 + h2 + gap;
  const h3 = contentH - (y3 - top);
  const colW = Math.floor((contentW - gap * 2) / 3);
  drawTitleBlock(doc, left, y3, colW, h3, "Learning Disposition / 学习态度与课堂表现");
  drawKeyValue(doc, left + 8, y3 + 20, colW - 16, "Class Participation / 课堂参与度", draft.classParticipation, 3);
  drawKeyValue(doc, left + 8, y3 + 50, colW - 16, "Focus & Engagement / 专注度", draft.focusEngagement, 3);
  drawKeyValue(doc, left + 8, y3 + 80, colW - 16, "Homework / 作业完成", draft.homeworkPreparation, 3);
  drawKeyValue(doc, left + 8, y3 + 110, colW - 16, "General Attitude / 学习态度", draft.attitudeGeneral, 3);

  const c2x = left + colW + gap;
  drawTitleBlock(doc, c2x, y3, colW, h3, "Summary & Recommendations / 总结与学习建议");
  drawKeyValue(doc, c2x + 8, y3 + 20, colW - 16, "Key Strengths / 核心优势", draft.keyStrengths, 3);
  drawKeyValue(doc, c2x + 8, y3 + 50, colW - 16, "Primary Bottlenecks / 主要瓶颈", draft.primaryBottlenecks, 3);
  drawKeyValue(doc, c2x + 8, y3 + 80, colW - 16, "Next Phase Focus / 下一阶段重点", draft.nextPhaseFocus, 3);
  drawKeyValue(doc, c2x + 8, y3 + 110, colW - 16, "Practice Load / 建议练习时长", draft.suggestedPracticeLoad, 2);
  drawKeyValue(doc, c2x + 8, y3 + 136, colW - 16, "Target Level/Score / 目标等级或分数", draft.targetLevelScore, 2);

  const c3x = c2x + colW + gap;
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
  drawTitleBlock(
    doc,
    c3x,
    y3,
    colW,
    h3,
    hasExamBlock
      ? `${draft.examName || "Exam"} Score (Optional) / 考试成绩（可选）`
      : "Exam Score (Optional) / 考试成绩（可选）- Hidden in final if blank"
  );
  if (hasExamBlock) {
    let ey = y3 + 24;
    for (const row of examRows.slice(0, 8)) {
      drawKeyValue(doc, c3x + 8, ey, colW - 16, row.label || "Item", row.value || "-", 1);
      ey += 20;
    }
  } else {
    setPdfFont(doc);
    doc.fillColor("#64748b").fontSize(7.5).text("No exam metrics provided.", c3x + 8, y3 + 30, { width: colW - 16 });
  }

  setPdfFont(doc);
  doc.fillColor("#64748b").fontSize(6.8).text(
    `Generated at ${new Date().toLocaleString()} | One-page compressed export`,
    left,
    pageH - 14,
    { width: contentW, align: "right" }
  );

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

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

function trimToLines(doc: PDFDoc, text: string, width: number, maxLines: number, fontSize: number) {
  const raw = String(text || "").replace(/\r/g, "").trim();
  if (!raw) return "-";
  setPdfFont(doc);
  doc.fontSize(fontSize);
  const lines: string[] = [];
  let cur = "";
  for (const ch of raw) {
    const next = `${cur}${ch}`;
    if (doc.widthOfString(next) <= width) {
      cur = next;
      continue;
    }
    lines.push(cur);
    cur = ch;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  let out = lines.slice(0, maxLines).join("\n");
  const used = out.replace(/\n/g, "");
  if (used.length < raw.length) {
    out = `${out.slice(0, Math.max(0, out.length - 1))}…`;
  }
  return out;
}

function blockTitle(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill("#f8fafc").stroke("#cbd5e1");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#0f172a").fontSize(9.4).text(title, x + 6, y + 5, { width: w - 12 });
}

function kv(doc: PDFDoc, x: number, y: number, w: number, k: string, v: string, lines = 1) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(7.4).text(k, x, y, { width: w });
  setPdfFont(doc);
  doc.fillColor("#0f172a").fontSize(7.4).text(trimToLines(doc, v, w, lines, 7.4), x, y + 10, { width: w, lineGap: 1 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const report = await prisma.midtermReport.findUnique({
    where: { id },
    include: { student: true, teacher: true, course: true, subject: true },
  });
  if (!report) return new Response("Report not found", { status: 404 });
  const draft = parseReportDraft(report.reportJson);

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 18 });
  setPdfFont(doc);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const contentW = pageW - left * 2;
  const contentH = pageH - top * 2;
  const gap = 8;

  setPdfBoldFont(doc);
  doc.fillColor("#7f1d1d").fontSize(14).text("阶段性学习评估报告", left, top);
  setPdfFont(doc);

  // Row 1
  const y1 = top + 20;
  const h1 = 84;
  const w1a = Math.floor(contentW * 0.52);
  const w1b = contentW - w1a - gap;
  blockTitle(doc, left, y1, w1a, h1, "学生基本信息");
  kv(doc, left + 8, y1 + 20, 160, "学生姓名", report.student.name);
  kv(doc, left + 176, y1 + 20, 140, "报告日期", new Date().toLocaleDateString());
  kv(doc, left + 324, y1 + 20, w1a - 332, "评估阶段", report.reportPeriodLabel || "-");
  kv(doc, left + 8, y1 + 46, 220, "评估工具", draft.assessmentTool || "-");
  kv(doc, left + 236, y1 + 46, 120, "综合成绩", String(report.overallScore ?? "-"));
  kv(doc, left + 364, y1 + 46, w1a - 372, "预估CEFR等级", report.examTargetStatus || "-");

  blockTitle(doc, left + w1a + gap, y1, w1b, h1, "重要声明");
  setPdfFont(doc);
  doc.fillColor("#7f1d1d").fontSize(7.2).text(trimToLines(doc, draft.warningNote, w1b - 14, 8, 7.2), left + w1a + gap + 7, y1 + 20, {
    width: w1b - 14,
    lineGap: 1,
  });

  // Row 2
  const y2 = y1 + h1 + gap;
  const h2 = 170;
  const w2a = Math.floor(contentW * 0.34);
  const w2b = contentW - w2a - gap;
  blockTitle(doc, left, y2, w2a, h2, "总体评估");
  kv(doc, left + 8, y2 + 20, w2a - 16, "整体水平", draft.overallEstimatedLevel || "-", 2);
  kv(doc, left + 8, y2 + 54, w2a - 16, "综合表现概述", draft.overallSummary || "-", 10);

  blockTitle(doc, left + w2a + gap, y2, w2b, h2, "分项能力评估");
  const cardGap = 6;
  const cardW = Math.floor((w2b - cardGap) / 2);
  const cardH = Math.floor((h2 - 24 - cardGap) / 2);
  const sx = left + w2a + gap + 6;
  const sy = y2 + 18;
  const cards = [
    { t: "听力", l: draft.listeningLevel, p: draft.listeningPerformance, s: draft.listeningStrengths, d: draft.listeningImprovements, x: sx, y: sy },
    { t: "阅读", l: draft.readingLevel, p: draft.readingPerformance, s: draft.readingStrengths, d: draft.readingImprovements, x: sx + cardW + cardGap, y: sy },
    { t: "写作", l: draft.writingLevel, p: draft.writingPerformance, s: draft.writingStrengths, d: draft.writingImprovements, x: sx, y: sy + cardH + cardGap },
    { t: "口语", l: draft.speakingLevel, p: draft.speakingPerformance, s: draft.speakingStrengths, d: draft.speakingImprovements, x: sx + cardW + cardGap, y: sy + cardH + cardGap },
  ];
  for (const c of cards) {
    doc.save();
    doc.roundedRect(c.x, c.y, cardW - 6, cardH - 6, 5).fill("#ffffff").stroke("#e2e8f0");
    doc.restore();
    setPdfBoldFont(doc);
    doc.fillColor("#0f172a").fontSize(8).text(c.t, c.x + 5, c.y + 4, { width: cardW - 16 });
    setPdfFont(doc);
    doc.fillColor("#334155").fontSize(7).text(`当前水平：${c.l || "-"}`, c.x + 5, c.y + 16, { width: cardW - 16 });
    doc
      .fontSize(6.7)
      .fillColor("#111827")
      .text(`表现概述：${trimToLines(doc, c.p || "-", cardW - 22, 2, 6.7)}`, c.x + 5, c.y + 28, { width: cardW - 16 });
    doc.text(`优势表现：${trimToLines(doc, c.s || "-", cardW - 22, 2, 6.7)}`, c.x + 5, c.y + 43, { width: cardW - 16 });
    doc.text(`待提升方向：${trimToLines(doc, c.d || "-", cardW - 22, 2, 6.7)}`, c.x + 5, c.y + 58, { width: cardW - 16 });
  }

  // Row 3
  const y3 = y2 + h2 + gap;
  const h3 = contentH - (y3 - top);
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

  if (!hasExamBlock) {
    const w = Math.floor((contentW - gap) / 2);
    const c2x = left + w + gap;
    blockTitle(doc, left, y3, w, h3, "学习态度与课堂表现");
    kv(doc, left + 8, y3 + 20, w - 16, "课堂参与度", draft.classParticipation, 3);
    kv(doc, left + 8, y3 + 50, w - 16, "专注度与投入度", draft.focusEngagement, 3);
    kv(doc, left + 8, y3 + 80, w - 16, "作业完成情况", draft.homeworkPreparation, 3);
    kv(doc, left + 8, y3 + 110, w - 16, "学习态度总体评价", draft.attitudeGeneral, 3);

    blockTitle(doc, c2x, y3, w, h3, "总结与学习建议");
    kv(doc, c2x + 8, y3 + 20, w - 16, "核心优势", draft.keyStrengths, 3);
    kv(doc, c2x + 8, y3 + 50, w - 16, "主要瓶颈", draft.primaryBottlenecks, 3);
    kv(doc, c2x + 8, y3 + 80, w - 16, "下一阶段重点方向", draft.nextPhaseFocus, 3);
    kv(doc, c2x + 8, y3 + 110, w - 16, "建议练习时长", draft.suggestedPracticeLoad, 2);
    kv(doc, c2x + 8, y3 + 136, w - 16, "目标等级或分数", draft.targetLevelScore, 2);
  } else {
    const w = Math.floor((contentW - gap * 2) / 3);
    const c2x = left + w + gap;
    const c3x = c2x + w + gap;
    blockTitle(doc, left, y3, w, h3, "学习态度与课堂表现");
    kv(doc, left + 8, y3 + 20, w - 16, "课堂参与度", draft.classParticipation, 3);
    kv(doc, left + 8, y3 + 50, w - 16, "专注度与投入度", draft.focusEngagement, 3);
    kv(doc, left + 8, y3 + 80, w - 16, "作业完成情况", draft.homeworkPreparation, 3);
    kv(doc, left + 8, y3 + 110, w - 16, "学习态度总体评价", draft.attitudeGeneral, 3);

    blockTitle(doc, c2x, y3, w, h3, "总结与学习建议");
    kv(doc, c2x + 8, y3 + 20, w - 16, "核心优势", draft.keyStrengths, 3);
    kv(doc, c2x + 8, y3 + 50, w - 16, "主要瓶颈", draft.primaryBottlenecks, 3);
    kv(doc, c2x + 8, y3 + 80, w - 16, "下一阶段重点方向", draft.nextPhaseFocus, 3);
    kv(doc, c2x + 8, y3 + 110, w - 16, "建议练习时长", draft.suggestedPracticeLoad, 2);
    kv(doc, c2x + 8, y3 + 136, w - 16, "目标等级或分数", draft.targetLevelScore, 2);

    blockTitle(doc, c3x, y3, w, h3, `${draft.examName || "考试"}成绩分项`);
    let ey = y3 + 24;
    for (const row of examRows.slice(0, 7)) {
      kv(doc, c3x + 8, ey, w - 16, row.label || "分项", row.value || "-", 1);
      ey += 20;
    }
  }

  setPdfFont(doc);
  doc.fillColor("#64748b").fontSize(6.8).text(`生成时间：${new Date().toLocaleString()} | 单页导出`, left, pageH - 14, {
    width: contentW,
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

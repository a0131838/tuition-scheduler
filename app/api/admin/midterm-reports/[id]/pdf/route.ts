import { requireAdmin } from "@/lib/auth";
import { parseReportDraft } from "@/lib/midterm-report";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;
type PanelTone = { bg: string; border: string; title: string };

const ZH = {
  title: "\u9636\u6bb5\u6027\u5b66\u4e60\u8bc4\u4f30\u62a5\u544a",
  base: "\u5b66\u751f\u57fa\u672c\u4fe1\u606f",
  name: "\u5b66\u751f\u59d3\u540d",
  date: "\u62a5\u544a\u65e5\u671f",
  period: "\u8bc4\u4f30\u9636\u6bb5",
  tool: "\u8bc4\u4f30\u5de5\u5177",
  score: "\u7efc\u5408\u6210\u7ee9",
  cefr: "\u9884\u4f30CEFR\u7b49\u7ea7",
  note: "\u91cd\u8981\u58f0\u660e",
  overall: "\u603b\u4f53\u8bc4\u4f30",
  level: "\u6574\u4f53\u6c34\u5e73",
  summary: "\u7efc\u5408\u8868\u73b0\u6982\u8ff0",
  skills: "\u5206\u9879\u80fd\u529b\u8bc4\u4f30",
  listening: "\u542c\u529b",
  reading: "\u9605\u8bfb",
  writing: "\u5199\u4f5c",
  speaking: "\u53e3\u8bed",
  current: "\u5f53\u524d\u6c34\u5e73",
  perf: "\u8868\u73b0\u6982\u8ff0",
  strength: "\u4f18\u52bf\u8868\u73b0",
  improve: "\u5f85\u63d0\u5347\u65b9\u5411",
  learning: "\u5b66\u4e60\u6001\u5ea6\u4e0e\u8bfe\u5802\u8868\u73b0",
  participation: "\u8bfe\u5802\u53c2\u4e0e\u5ea6",
  focus: "\u4e13\u6ce8\u5ea6\u4e0e\u6295\u5165\u5ea6",
  homework: "\u4f5c\u4e1a\u5b8c\u6210\u60c5\u51b5",
  attitude: "\u5b66\u4e60\u6001\u5ea6\u603b\u4f53\u8bc4\u4ef7",
  rec: "\u603b\u7ed3\u4e0e\u5b66\u4e60\u5efa\u8bae",
  key: "\u6838\u5fc3\u4f18\u52bf",
  bottleneck: "\u4e3b\u8981\u74f6\u9888",
  next: "\u4e0b\u4e00\u9636\u6bb5\u91cd\u70b9\u65b9\u5411",
  load: "\u5efa\u8bae\u7ec3\u4e60\u65f6\u957f",
  target: "\u76ee\u6807\u7b49\u7ea7\u6216\u5206\u6570",
  examSuffix: "\u6210\u7ee9\u5206\u9879",
};

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function normalizeText(input: string | null | undefined) {
  const raw = String(input || "").replace(/\r/g, "").trim();
  return raw || "-";
}

type DrawBoxOptions = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize?: number;
  lineGap?: number;
  color?: string;
  maxLines?: number;
};

function drawTextBox(doc: PDFDoc, options: DrawBoxOptions) {
  const fontSize = options.fontSize ?? 7.2;
  const lineGap = options.lineGap ?? 1;
  const maxByHeight = Math.max(1, Math.floor(options.h / (fontSize + lineGap + 0.6)));
  const maxLines = Math.max(1, Math.min(options.maxLines ?? maxByHeight, maxByHeight));
  const text = normalizeText(options.text);
  const maxHeight = maxLines * (fontSize + lineGap + 0.6);

  doc.save();
  doc.rect(options.x, options.y, options.w, options.h).clip();
  setPdfFont(doc);
  doc.fillColor(options.color ?? "#0f172a").fontSize(fontSize);
  doc.text(text, options.x, options.y, {
    width: options.w,
    height: maxHeight,
    lineBreak: true,
    ellipsis: false,
    lineGap,
  });
  doc.restore();
}

function panel(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string, tone?: PanelTone) {
  const bg = tone?.bg ?? "#f8fafc";
  const border = tone?.border ?? "#cbd5e1";
  const titleColor = tone?.title ?? "#0f172a";
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill(bg).stroke(border);
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor(titleColor).fontSize(9.6).text(title, x + 6, y + 5, { width: w - 12 });
}

function kv(doc: PDFDoc, x: number, y: number, w: number, k: string, v: string, boxH = 16, lines = 1) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(7.2).text(k, x, y, { width: w });
  drawTextBox(doc, {
    x,
    y: y + 9,
    w,
    h: boxH,
    text: normalizeText(v),
    fontSize: 7.2,
    maxLines: lines,
    color: "#0f172a",
  });
}

function kvCompact(
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  k: string,
  v: string,
  boxH: number,
  lines: number,
  fontSize = 6.6,
) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(6.8).text(k, x, y, { width: w });
  drawTextBox(doc, {
    x,
    y: y + 8,
    w,
    h: boxH,
    text: normalizeText(v),
    fontSize,
    maxLines: lines,
    lineGap: 0.8,
    color: "#0f172a",
  });
}

function drawInfoCell(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(7.1).text(label, x, y, { width: w });
  drawTextBox(doc, {
    x,
    y: y + 9,
    w,
    h: 13,
    text: normalizeText(value),
    fontSize: 7.2,
    maxLines: 1,
    lineGap: 0.8,
  });
}

function drawSkillCard(
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  level: string,
  perf: string,
  strength: string,
  improve: string,
  tone?: PanelTone,
) {
  const bg = tone?.bg ?? "#ffffff";
  const border = tone?.border ?? "#e2e8f0";
  const titleColor = tone?.title ?? "#0f172a";
  doc.save();
  doc.roundedRect(x, y, w, h, 5).fill(bg).stroke(border);
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor(titleColor).fontSize(9.2).text(title, x + 6, y + 5, { width: w - 12 });

  drawTextBox(doc, {
    x: x + 6,
    y: y + 15,
    w: w - 12,
    h: h - 18,
    text: `${ZH.current}：${normalizeText(level)}\n${ZH.perf}：${normalizeText(perf)}\n${ZH.strength}：${normalizeText(strength)}\n${ZH.improve}：${normalizeText(improve)}`,
    fontSize: 6.2,
    maxLines: 14,
    lineGap: 0.45,
    color: "#0f172a",
  });
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
  const TONES = {
    base: { bg: "#eff6ff", border: "#bfdbfe", title: "#1e3a8a" },
    note: { bg: "#fff1f2", border: "#fecdd3", title: "#9f1239" },
    overall: { bg: "#fff7ed", border: "#fed7aa", title: "#9a3412" },
    skills: { bg: "#ecfeff", border: "#a5f3fc", title: "#155e75" },
    listening: { bg: "#eef2ff", border: "#c7d2fe", title: "#3730a3" },
    reading: { bg: "#f0fdf4", border: "#bbf7d0", title: "#166534" },
    writing: { bg: "#fff7ed", border: "#fed7aa", title: "#9a3412" },
    speaking: { bg: "#fdf4ff", border: "#f5d0fe", title: "#86198f" },
    learning: { bg: "#f5f3ff", border: "#ddd6fe", title: "#5b21b6" },
    rec: { bg: "#f0fdf4", border: "#bbf7d0", title: "#166534" },
    exam: { bg: "#f8fafc", border: "#cbd5e1", title: "#0f172a" },
  } satisfies Record<string, PanelTone>;

  setPdfBoldFont(doc);
  doc.fillColor("#7f1d1d").fontSize(16).text(ZH.title, left, top);

  const y1 = top + 20;
  const h1 = 76;
  const w1a = Math.floor(contentW * 0.52);
  const w1b = contentW - w1a - gap;

  panel(doc, left, y1, w1a, h1, ZH.base, TONES.base);
  const cGap = 12;
  const colW = Math.floor((w1a - 16 - cGap * 2) / 3);
  const row1Y = y1 + 20;
  const row2Y = y1 + 44;
  drawInfoCell(doc, left + 8, row1Y, colW, ZH.name, report.student.name);
  drawInfoCell(doc, left + 8 + colW + cGap, row1Y, colW, ZH.date, new Date().toLocaleDateString());
  drawInfoCell(doc, left + 8 + (colW + cGap) * 2, row1Y, colW, ZH.period, report.reportPeriodLabel || "-");
  drawInfoCell(doc, left + 8, row2Y, colW, ZH.tool, draft.assessmentTool || "-");
  drawInfoCell(doc, left + 8 + colW + cGap, row2Y, colW, ZH.score, String(report.overallScore ?? "-"));
  drawInfoCell(doc, left + 8 + (colW + cGap) * 2, row2Y, colW, ZH.cefr, report.examTargetStatus || "-");

  panel(doc, left + w1a + gap, y1, w1b, h1, ZH.note, TONES.note);
  drawTextBox(doc, {
    x: left + w1a + gap + 7,
    y: y1 + 20,
    w: w1b - 14,
    h: h1 - 26,
    text: draft.warningNote,
    fontSize: 7.2,
    maxLines: 8,
    color: "#7f1d1d",
  });

  const y2 = y1 + h1 + gap;
  const h2 = 252;
  const w2a = Math.floor(contentW * 0.34);
  const w2b = contentW - w2a - gap;

  panel(doc, left, y2, w2a, h2, ZH.overall, TONES.overall);
  kvCompact(doc, left + 8, y2 + 20, w2a - 16, ZH.level, draft.overallEstimatedLevel || "-", 28, 4, 6.6);
  kvCompact(doc, left + 8, y2 + 58, w2a - 16, ZH.summary, draft.overallSummary || "-", h2 - 68, 18, 6.4);

  panel(doc, left + w2a + gap, y2, w2b, h2, ZH.skills, TONES.skills);
  const cardGap = 8;
  const innerX = left + w2a + gap + 6;
  const innerY = y2 + 18;
  const innerW = w2b - 12;
  const innerH = h2 - 24;
  const cardW = Math.floor((innerW - cardGap) / 2);
  const cardH = Math.floor((innerH - cardGap) / 2);

  drawSkillCard(
    doc,
    innerX,
    innerY,
    cardW,
    cardH,
    ZH.listening,
    draft.listeningLevel,
    draft.listeningPerformance,
    draft.listeningStrengths,
    draft.listeningImprovements,
    TONES.listening,
  );
  drawSkillCard(
    doc,
    innerX + cardW + cardGap,
    innerY,
    cardW,
    cardH,
    ZH.reading,
    draft.readingLevel,
    draft.readingPerformance,
    draft.readingStrengths,
    draft.readingImprovements,
    TONES.reading,
  );
  drawSkillCard(
    doc,
    innerX,
    innerY + cardH + cardGap,
    cardW,
    cardH,
    ZH.writing,
    draft.writingLevel,
    draft.writingPerformance,
    draft.writingStrengths,
    draft.writingImprovements,
    TONES.writing,
  );
  drawSkillCard(
    doc,
    innerX + cardW + cardGap,
    innerY + cardH + cardGap,
    cardW,
    cardH,
    ZH.speaking,
    draft.speakingLevel,
    draft.speakingPerformance,
    draft.speakingStrengths,
    draft.speakingImprovements,
    TONES.speaking,
  );

  const y3 = y2 + h2 + 6;
  const h3 = contentH - (y3 - top);

  const examRowsRaw = [
    { label: draft.examMetric1Label, value: draft.examMetric1Value },
    { label: draft.examMetric2Label, value: draft.examMetric2Value },
    { label: draft.examMetric3Label, value: draft.examMetric3Value },
    { label: draft.examMetric4Label, value: draft.examMetric4Value },
    { label: draft.examMetric5Label, value: draft.examMetric5Value },
    { label: draft.examMetric6Label, value: draft.examMetric6Value },
    { label: draft.examTotalLabel, value: draft.examTotalValue },
  ];

  const examRows = examRowsRaw.filter((row) => String(row.value || "").trim());
  const hasExamBlock = examRows.length > 0;

  if (!hasExamBlock) {
    const w = Math.floor((contentW - gap) / 2);
    const c2x = left + w + gap;

    panel(doc, left, y3, w, h3, ZH.learning, TONES.learning);
    kvCompact(doc, left + 8, y3 + 20, w - 16, ZH.participation, draft.classParticipation, 24, 3);
    kvCompact(doc, left + 8, y3 + 50, w - 16, ZH.focus, draft.focusEngagement, 24, 3);
    kvCompact(doc, left + 8, y3 + 80, w - 16, ZH.homework, draft.homeworkPreparation, 24, 3);
    kvCompact(doc, left + 8, y3 + 110, w - 16, ZH.attitude, draft.attitudeGeneral, 24, 3);

    panel(doc, c2x, y3, w, h3, ZH.rec, TONES.rec);
    kvCompact(doc, c2x + 8, y3 + 20, w - 16, ZH.key, draft.keyStrengths, 24, 3);
    kvCompact(doc, c2x + 8, y3 + 50, w - 16, ZH.bottleneck, draft.primaryBottlenecks, 24, 3);
    kvCompact(doc, c2x + 8, y3 + 80, w - 16, ZH.next, draft.nextPhaseFocus, 24, 3);
    kv(doc, c2x + 8, y3 + 110, w - 16, ZH.load, draft.suggestedPracticeLoad, 16, 1);
    kv(doc, c2x + 8, y3 + 132, w - 16, ZH.target, draft.targetLevelScore, 16, 1);
  } else {
    // Keep exam metrics as a compact optional sidebar so core narrative panels have enough room.
    const examW = Math.max(78, Math.floor(contentW * 0.08));
    const mainW = Math.floor((contentW - examW - gap * 2) / 2);
    const w = mainW;
    const c2x = left + w + gap;
    const c3x = c2x + w + gap;

    panel(doc, left, y3, w, h3, ZH.learning, TONES.learning);
    kvCompact(doc, left + 8, y3 + 20, w - 16, ZH.participation, draft.classParticipation, 28, 4, 6.3);
    kvCompact(doc, left + 8, y3 + 52, w - 16, ZH.focus, draft.focusEngagement, 28, 4, 6.3);
    kvCompact(doc, left + 8, y3 + 84, w - 16, ZH.homework, draft.homeworkPreparation, 28, 4, 6.3);
    kvCompact(doc, left + 8, y3 + 116, w - 16, ZH.attitude, draft.attitudeGeneral, 28, 4, 6.3);

    panel(doc, c2x, y3, w, h3, ZH.rec, TONES.rec);
    kvCompact(doc, c2x + 8, y3 + 20, w - 16, ZH.key, draft.keyStrengths, 28, 4, 6.3);
    kvCompact(doc, c2x + 8, y3 + 52, w - 16, ZH.bottleneck, draft.primaryBottlenecks, 28, 4, 6.3);
    kvCompact(doc, c2x + 8, y3 + 84, w - 16, ZH.next, draft.nextPhaseFocus, 28, 4, 6.3);
    kvCompact(doc, c2x + 8, y3 + 116, w - 16, ZH.load, draft.suggestedPracticeLoad, 22, 2, 6.2);
    kvCompact(doc, c2x + 8, y3 + 142, w - 16, ZH.target, draft.targetLevelScore, 22, 2, 6.2);

    const examTitle = `${normalizeText(draft.examName || "\u8003\u8bd5")}${ZH.examSuffix}`;
    panel(doc, c3x, y3, examW, h3, examTitle, TONES.exam);

    let ey = y3 + 20;
    for (const row of examRows.slice(0, 7)) {
      const label = normalizeText(row.label || "\u5206\u9879");
      const value = normalizeText(row.value || "-");
      kv(doc, c3x + 8, ey, examW - 16, label, value, 12, 1);
      ey += 16;
    }
  }

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


import { requireAdmin } from "@/lib/auth";
import { parseReportDraft } from "@/lib/midterm-report";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

type PanelTone = {
  bg: string;
  border: string;
  title: string;
  accentBar?: string;
};

const ZH = {
  title: "阶段性学习评估报告",
  base: "学生基本信息",
  name: "学生姓名",
  date: "报告日期",
  period: "评估阶段",
  tool: "评估工具",
  score: "综合成绩",
  cefr: "预估CEFR等级",
  note: "重要声明",
  overall: "总体评估",
  level: "整体水平",
  summary: "综合表现概述",
  skills: "分项能力评估",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
  current: "当前水平",
  perf: "表现概述",
  strength: "优势表现",
  improve: "待提升方向",
  learning: "学习态度与课堂表现",
  participation: "课堂参与度",
  focus: "专注度与投入度",
  homework: "作业完成情况",
  attitude: "学习态度总体评价",
  rec: "总结与学习建议",
  key: "核心优势",
  bottleneck: "主要瓶颈",
  next: "下一阶段重点方向",
  load: "建议练习时长",
  target: "目标等级或分数",
  examSuffix: "成绩分项",
};

const MM_TO_PT = 72 / 25.4;
function mm(value: number) {
  return value * MM_TO_PT;
}

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

function paintPageBackground(doc: PDFDoc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#F5F7FA");
  doc.restore();
}

type FitTextOptions = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  preferredSize?: number;
  minSize?: number;
  lineGap?: number;
  color?: string;
};

function drawFitText(doc: PDFDoc, options: FitTextOptions) {
  const text = normalizeText(options.text);
  const preferred = options.preferredSize ?? 12;
  const min = options.minSize ?? 8.2;
  const lineGap = options.lineGap ?? 2;

  let fontSize = preferred;
  setPdfFont(doc);
  while (fontSize > min) {
    doc.fontSize(fontSize);
    const needed = doc.heightOfString(text, { width: options.w, lineGap, align: "left" });
    if (needed <= options.h) break;
    fontSize -= 0.25;
  }

  doc.save();
  doc.rect(options.x, options.y, options.w, options.h).clip();
  setPdfFont(doc);
  doc.fillColor(options.color ?? "#1F2937").fontSize(Math.max(fontSize, min));
  doc.text(text, options.x, options.y, {
    width: options.w,
    height: options.h,
    lineGap,
    align: "left",
  });
  doc.restore();
}

function panel(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string, tone: PanelTone) {
  doc.save();
  doc.roundedRect(x, y, w, h, 9).fill(tone.bg).stroke(tone.border);
  if (tone.accentBar) {
    doc.roundedRect(x + 1.5, y + 8, 4, h - 16, 2).fill(tone.accentBar);
  }
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor(tone.title).fontSize(15).text(title, x + 12, y + 10, { width: w - 24 });
}

function infoCell(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string) {
  setPdfBoldFont(doc);
  doc.fillColor("#475569").fontSize(10.2).text(label, x, y, { width: w });
  drawFitText(doc, {
    x,
    y: y + 14,
    w,
    h: 20,
    text: normalizeText(value),
    preferredSize: 12,
    minSize: 9.2,
    lineGap: 1,
    color: "#0F172A",
  });
}

function fieldBox(doc: PDFDoc, x: number, y: number, w: number, h: number, label: string, value: string, bodyPreferred = 11.8) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(10.8).text(label, x, y, { width: w });
  drawFitText(doc, {
    x,
    y: y + 15,
    w,
    h: Math.max(10, h - 15),
    text: normalizeText(value),
    preferredSize: bodyPreferred,
    minSize: 8.4,
    lineGap: 2,
    color: "#111827",
  });
}

function skillCard(
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
) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fill("#FFFFFF").stroke("#E6ECF2");
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor("#1E3A8A").fontSize(13.2).text(title, x + 10, y + 9, { width: w - 20 });

  const levelLabel = `${ZH.current}`;
  const levelVal = normalizeText(level);
  setPdfFont(doc);
  doc.fillColor("#475569").fontSize(9.4).text(levelLabel, x + w - 146, y + 10, { width: 56, align: "right" });
  doc.save();
  doc.roundedRect(x + w - 84, y + 8, 70, 20, 10).fill("#DBEAFE").stroke("#BFDBFE");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#1E40AF").fontSize(10.8).text(levelVal, x + w - 84, y + 13, { width: 70, align: "center" });

  drawFitText(doc, {
    x: x + 10,
    y: y + 34,
    w: w - 20,
    h: h - 42,
    text: `${ZH.perf}：${normalizeText(perf)}\n${ZH.strength}：${normalizeText(strength)}\n${ZH.improve}：${normalizeText(improve)}`,
    preferredSize: 11,
    minSize: 8.2,
    lineGap: 2,
    color: "#1F2937",
  });
}

function stackedFields(
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  fields: Array<{ label: string; value: string }>,
  gap = 10,
) {
  const available = h - gap * (fields.length - 1);
  const each = Math.max(40, available / fields.length);
  let cy = y;
  for (const field of fields) {
    fieldBox(doc, x, cy, w, each, field.label, field.value, 11.2);
    cy += each + gap;
  }
}

function examCards(
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: Array<{ label: string; value: string }>,
) {
  const n = rows.length;
  if (n <= 0) return;

  const innerX = x + 10;
  const innerY = y + 40;
  const innerW = w - 20;
  const innerH = h - 50;

  const colCount = n >= 5 ? 2 : 1;
  const rowCount = Math.ceil(n / colCount);
  const g = 8;
  const cardW = (innerW - g * (colCount - 1)) / colCount;
  const cardH = (innerH - g * (rowCount - 1)) / rowCount;

  rows.forEach((row, i) => {
    const r = Math.floor(i / colCount);
    const c = i % colCount;
    const cx = innerX + c * (cardW + g);
    const cy = innerY + r * (cardH + g);

    doc.save();
    doc.roundedRect(cx, cy, cardW, cardH, 7).fill("#FFFFFF").stroke("#E6ECF2");
    doc.restore();

    setPdfBoldFont(doc);
    doc.fillColor("#334155").fontSize(10.2).text(normalizeText(row.label), cx + 8, cy + 7, { width: cardW - 16 });

    setPdfBoldFont(doc);
    doc.fillColor("#0F172A").fontSize(19).text(normalizeText(row.value), cx + 8, cy + 24, {
      width: cardW - 16,
      align: "center",
    });
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

  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margin: mm(16),
  });
  setPdfFont(doc);

  paintPageBackground(doc);
  doc.on("pageAdded", () => {
    paintPageBackground(doc);
    setPdfFont(doc);
  });

  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const right = doc.page.margins.right;
  const bottom = doc.page.margins.bottom;
  const contentW = doc.page.width - left - right;
  const contentH = doc.page.height - top - bottom;

  const gap = 16;

  const TONES = {
    normal: { bg: "#FFFFFF", border: "#E6ECF2", title: "#0F172A" } satisfies PanelTone,
    note: { bg: "#FFF7ED", border: "#FDE7CF", title: "#9A3412", accentBar: "#F59E0B" } satisfies PanelTone,
  };

  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(23).text(ZH.title, left, top, { width: contentW });

  const y1 = top + 36;
  const h1 = 124;
  const row1Total = 3; // 2fr + 1fr
  const w1a = (contentW - gap) * (2 / row1Total);
  const w1b = (contentW - gap) * (1 / row1Total);

  panel(doc, left, y1, w1a, h1, ZH.base, TONES.normal);
  const cGap = 12;
  const infoInnerW = w1a - 24;
  const colW = (infoInnerW - cGap * 2) / 3;
  const r1 = y1 + 34;
  const r2 = y1 + 70;

  infoCell(doc, left + 12, r1, colW, ZH.name, report.student.name);
  infoCell(doc, left + 12 + colW + cGap, r1, colW, ZH.date, new Date().toLocaleDateString());
  infoCell(doc, left + 12 + (colW + cGap) * 2, r1, colW, ZH.period, report.reportPeriodLabel || "-");
  infoCell(doc, left + 12, r2, colW, ZH.tool, draft.assessmentTool || "-");
  infoCell(doc, left + 12 + colW + cGap, r2, colW, ZH.score, String(report.overallScore ?? "-"));
  infoCell(doc, left + 12 + (colW + cGap) * 2, r2, colW, ZH.cefr, report.examTargetStatus || "-");

  panel(doc, left + w1a + gap, y1, w1b, h1, ZH.note, TONES.note);
  drawFitText(doc, {
    x: left + w1a + gap + 14,
    y: y1 + 34,
    w: w1b - 24,
    h: h1 - 44,
    text: draft.warningNote,
    preferredSize: 11.5,
    minSize: 9.4,
    lineGap: 2,
    color: "#374151",
  });

  const y2 = y1 + h1 + gap;
  const h2 = 318;
  const row2Total = 3; // 1fr + 2fr
  const w2a = (contentW - gap) * (1 / row2Total);
  const w2b = (contentW - gap) * (2 / row2Total);

  panel(doc, left, y2, w2a, h2, ZH.overall, TONES.normal);
  const overallInnerX = left + 12;
  const overallW = w2a - 24;
  fieldBox(doc, overallInnerX, y2 + 36, overallW, 118, ZH.level, draft.overallEstimatedLevel || "-", 12);
  fieldBox(doc, overallInnerX, y2 + 164, overallW, h2 - 176, ZH.summary, draft.overallSummary || "-", 11.3);

  panel(doc, left + w2a + gap, y2, w2b, h2, ZH.skills, TONES.normal);
  const sx = left + w2a + gap + 10;
  const sy = y2 + 38;
  const sw = w2b - 20;
  const sh = h2 - 48;
  const sg = 10;
  const cardW = (sw - sg) / 2;
  const cardH = (sh - sg) / 2;

  skillCard(doc, sx, sy, cardW, cardH, ZH.listening, draft.listeningLevel, draft.listeningPerformance, draft.listeningStrengths, draft.listeningImprovements);
  skillCard(doc, sx + cardW + sg, sy, cardW, cardH, ZH.reading, draft.readingLevel, draft.readingPerformance, draft.readingStrengths, draft.readingImprovements);
  skillCard(doc, sx, sy + cardH + sg, cardW, cardH, ZH.writing, draft.writingLevel, draft.writingPerformance, draft.writingStrengths, draft.writingImprovements);
  skillCard(doc, sx + cardW + sg, sy + cardH + sg, cardW, cardH, ZH.speaking, draft.speakingLevel, draft.speakingPerformance, draft.speakingStrengths, draft.speakingImprovements);

  const y3 = y2 + h2 + gap;
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

  // Fixed ratio: 1fr 1fr 0.6fr
  const row3Total = 2.6;
  const baseUnit = (contentW - gap * 2) / row3Total;
  const w3a = baseUnit;
  const w3b = baseUnit;
  const w3c = baseUnit * 0.6;
  const x3b = left + w3a + gap;
  const x3c = x3b + w3b + gap;

  panel(doc, left, y3, w3a, h3, ZH.learning, TONES.normal);
  stackedFields(doc, left + 12, y3 + 36, w3a - 24, h3 - 48, [
    { label: ZH.participation, value: draft.classParticipation },
    { label: ZH.focus, value: draft.focusEngagement },
    { label: ZH.homework, value: draft.homeworkPreparation },
    { label: ZH.attitude, value: draft.attitudeGeneral },
  ]);

  panel(doc, x3b, y3, w3b, h3, ZH.rec, TONES.normal);
  stackedFields(doc, x3b + 12, y3 + 36, w3b - 24, h3 - 48, [
    { label: ZH.key, value: draft.keyStrengths },
    { label: ZH.bottleneck, value: draft.primaryBottlenecks },
    { label: ZH.next, value: draft.nextPhaseFocus },
    { label: ZH.load, value: draft.suggestedPracticeLoad },
    { label: ZH.target, value: draft.targetLevelScore },
  ]);

  const examTitle = `${normalizeText(draft.examName || "考试")}${ZH.examSuffix}`;
  panel(doc, x3c, y3, w3c, h3, examTitle, TONES.normal);
  examCards(doc, x3c, y3, w3c, h3, examRows.slice(0, 7));

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

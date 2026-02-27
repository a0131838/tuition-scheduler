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

  // If still too tall at minimum size, clamp content to avoid PDF page spillover.
  doc.fontSize(Math.max(fontSize, min));
  let finalText = text;
  let needed = doc.heightOfString(finalText, { width: options.w, lineGap, align: "left" });
  if (needed > options.h) {
    const src = finalText;
    let lo = 0;
    let hi = src.length;
    let best = "";
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const probe = `${src.slice(0, mid).trimEnd()}…`;
      const h = doc.heightOfString(probe, { width: options.w, lineGap, align: "left" });
      if (h <= options.h) {
        best = probe;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    finalText = best || "…";
    needed = doc.heightOfString(finalText, { width: options.w, lineGap, align: "left" });
    if (needed > options.h) {
      finalText = "…";
    }
  }

  doc.save();
  doc.rect(options.x, options.y, options.w, options.h).clip();
  setPdfFont(doc);
  doc.fillColor(options.color ?? "#1F2937").fontSize(Math.max(fontSize, min));
  doc.text(finalText, options.x, options.y, {
    width: options.w,
    height: options.h,
    lineGap,
    align: "left",
  });
  doc.restore();
}

function panel(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string, tone: PanelTone) {
  doc.save();
  doc.lineWidth(0.8);
  doc.roundedRect(x, y, w, h, 6).fill(tone.bg).stroke(tone.border);
  if (tone.accentBar) {
    doc.roundedRect(x + 1.2, y + 6, 3, h - 12, 2).fill(tone.accentBar);
  }
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor(tone.title).fontSize(12.2).text(title, x + 8, y + 6, { width: w - 16 });
}

function infoCell(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string) {
  setPdfBoldFont(doc);
  doc.fillColor("#475569").fontSize(8.6).text(label, x, y, { width: w });
  drawFitText(doc, {
    x,
    y: y + 10,
    w,
    h: 15,
    text: normalizeText(value),
    preferredSize: 9.6,
    minSize: 7.6,
    lineGap: 0.8,
    color: "#0F172A",
  });
}

function fieldBox(doc: PDFDoc, x: number, y: number, w: number, h: number, label: string, value: string, bodyPreferred = 11.8) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(9.2).text(label, x, y, { width: w });
  drawFitText(doc, {
    x,
    y: y + 11,
    w,
    h: Math.max(8, h - 11),
    text: normalizeText(value),
    preferredSize: bodyPreferred,
    minSize: 6.2,
    lineGap: 0.8,
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
  doc.lineWidth(0.8);
  doc.roundedRect(x, y, w, h, 6).fill("#FFFFFF").stroke("#E6ECF2");
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor("#1E3A8A").fontSize(10.4).text(title, x + 7, y + 4, { width: w - 14 });

  const levelLabel = `${ZH.current}`;
  const levelVal = normalizeText(level);
  setPdfFont(doc);
  doc.fillColor("#475569").fontSize(7.4).text(levelLabel, x + w - 108, y + 5, { width: 38, align: "right" });
  doc.save();
  doc.lineWidth(0.8);
  doc.roundedRect(x + w - 66, y + 4, 54, 13, 7).fill("#DBEAFE").stroke("#BFDBFE");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#1E40AF").fontSize(8.5).text(levelVal, x + w - 66, y + 6.8, { width: 54, align: "center" });

  drawFitText(doc, {
    x: x + 7,
    y: y + 18,
    w: w - 14,
    h: h - 19,
    text: `${ZH.perf}：${normalizeText(perf)}\n${ZH.strength}：${normalizeText(strength)}\n${ZH.improve}：${normalizeText(improve)}`,
    preferredSize: 8.8,
    minSize: 6.8,
    lineGap: 0.4,
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
  gap = 2,
  bodyPreferred = 9,
) {
  const available = Math.max(0, h - gap * (fields.length - 1));
  const each = fields.length > 0 ? available / fields.length : 0;
  let cy = y;
  for (const field of fields) {
    fieldBox(doc, x, cy, w, each, field.label, field.value, bodyPreferred);
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
    doc.roundedRect(cx, cy, cardW, cardH, 5).fill("#FFFFFF").stroke("#E6ECF2");
    doc.restore();

    setPdfBoldFont(doc);
    doc.fillColor("#334155").fontSize(8.8).text(normalizeText(row.label), cx + 6, cy + 5, { width: cardW - 12 });

    setPdfBoldFont(doc);
    doc.fillColor("#0F172A").fontSize(14).text(normalizeText(row.value), cx + 6, cy + 18, {
      width: cardW - 12,
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
    layout: "landscape",
    margin: mm(10),
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

  const gap = 8;

  const TONES = {
    normal: { bg: "#FFFFFF", border: "#E6ECF2", title: "#0F172A" } satisfies PanelTone,
    note: { bg: "#FFF7ED", border: "#FDE7CF", title: "#9A3412", accentBar: "#F59E0B" } satisfies PanelTone,
  };

  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(17).text(ZH.title, left, top, { width: contentW });
  const titleH = doc.heightOfString(ZH.title, { width: contentW });

  const y1 = top + titleH + 8;
  const usableH = contentH - (y1 - top) - gap * 2;
  const h1 = Math.floor(usableH * 0.16);
  const row1Total = 3; // 2fr + 1fr
  const w1a = (contentW - gap) * (2 / row1Total);
  const w1b = (contentW - gap) * (1 / row1Total);

  panel(doc, left, y1, w1a, h1, ZH.base, TONES.normal);
  const cGap = 8;
  const infoInnerW = w1a - 16;
  const colW = (infoInnerW - cGap * 2) / 3;
  const r1 = y1 + 20;
  const r2 = y1 + 42;

  infoCell(doc, left + 8, r1, colW, ZH.name, report.student.name);
  infoCell(doc, left + 8 + colW + cGap, r1, colW, ZH.date, new Date().toLocaleDateString());
  infoCell(doc, left + 8 + (colW + cGap) * 2, r1, colW, ZH.period, report.reportPeriodLabel || "-");
  infoCell(doc, left + 8, r2, colW, ZH.tool, draft.assessmentTool || "-");
  infoCell(doc, left + 8 + colW + cGap, r2, colW, ZH.score, String(report.overallScore ?? "-"));
  infoCell(doc, left + 8 + (colW + cGap) * 2, r2, colW, ZH.cefr, report.examTargetStatus || "-");

  panel(doc, left + w1a + gap, y1, w1b, h1, ZH.note, TONES.note);
  drawFitText(doc, {
    x: left + w1a + gap + 8,
    y: y1 + 22,
    w: w1b - 14,
    h: h1 - 24,
    text: draft.warningNote,
    preferredSize: 8.6,
    minSize: 6.2,
    lineGap: 0.6,
    color: "#374151",
  });

  const y2 = y1 + h1 + gap;
  const h2 = Math.floor(usableH * 0.50);
  const row2Total = 3; // 1fr + 2fr
  const w2a = (contentW - gap) * (1 / row2Total);
  const w2b = (contentW - gap) * (2 / row2Total);

  panel(doc, left, y2, w2a, h2, ZH.overall, TONES.normal);
  const overallInnerX = left + 8;
  const overallW = w2a - 16;
  fieldBox(doc, overallInnerX, y2 + 24, overallW, 100, ZH.level, draft.overallEstimatedLevel || "-", 10.4);
  fieldBox(doc, overallInnerX, y2 + 130, overallW, h2 - 136, ZH.summary, draft.overallSummary || "-", 9.8);

  panel(doc, left + w2a + gap, y2, w2b, h2, ZH.skills, TONES.normal);
  const sx = left + w2a + gap + 6;
  const sy = y2 + 24;
  const sw = w2b - 12;
  const sh = h2 - 26;
  const sg = 6;
  const cardW = (sw - sg) / 2;
  const cardH = (sh - sg) / 2;

  skillCard(doc, sx, sy, cardW, cardH, ZH.listening, draft.listeningLevel, draft.listeningPerformance, draft.listeningStrengths, draft.listeningImprovements);
  skillCard(doc, sx + cardW + sg, sy, cardW, cardH, ZH.reading, draft.readingLevel, draft.readingPerformance, draft.readingStrengths, draft.readingImprovements);
  skillCard(doc, sx, sy + cardH + sg, cardW, cardH, ZH.writing, draft.writingLevel, draft.writingPerformance, draft.writingStrengths, draft.writingImprovements);
  skillCard(doc, sx + cardW + sg, sy + cardH + sg, cardW, cardH, ZH.speaking, draft.speakingLevel, draft.speakingPerformance, draft.speakingStrengths, draft.speakingImprovements);

  const y3 = y2 + h2 + gap;
  const h3 = Math.max(0, usableH - h1 - h2);

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

  const w3a = hasExamBlock ? (contentW - gap * 2) / 2.6 : (contentW - gap) / 2;
  const w3b = hasExamBlock ? (contentW - gap * 2) / 2.6 : (contentW - gap) / 2;
  const w3c = hasExamBlock ? ((contentW - gap * 2) / 2.6) * 0.6 : 0;
  const x3b = left + w3a + gap;
  const x3c = x3b + w3b + gap;

  panel(doc, left, y3, w3a, h3, ZH.learning, TONES.normal);
  stackedFields(doc, left + 8, y3 + 20, w3a - 16, h3 - 22, [
    { label: ZH.participation, value: draft.classParticipation },
    { label: ZH.focus, value: draft.focusEngagement },
    { label: ZH.homework, value: draft.homeworkPreparation },
    { label: ZH.attitude, value: draft.attitudeGeneral },
  ], 1, 8.0);

  panel(doc, x3b, y3, w3b, h3, ZH.rec, TONES.normal);
  stackedFields(doc, x3b + 8, y3 + 20, w3b - 16, h3 - 22, [
    { label: ZH.key, value: draft.keyStrengths },
    { label: ZH.bottleneck, value: draft.primaryBottlenecks },
    { label: ZH.next, value: draft.nextPhaseFocus },
    { label: ZH.load, value: draft.suggestedPracticeLoad },
    { label: ZH.target, value: draft.targetLevelScore },
  ], 1, 7.8);

  if (hasExamBlock) {
    const examTitle = `${normalizeText(draft.examName || "考试")}${ZH.examSuffix}`;
    panel(doc, x3c, y3, w3c, h3, examTitle, TONES.normal);
    examCards(doc, x3c, y3, w3c, h3, examRows.slice(0, 7));
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

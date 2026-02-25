import { requireAdmin } from "@/lib/auth";
import { parseReportDraft } from "@/lib/midterm-report";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

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
  item: "\u5206\u9879",
  generated: "\u751f\u6210\u65f6\u95f4",
  onePage: "\u5355\u9875\u5bfc\u51fa",
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

function breakLines(doc: PDFDoc, text: string, width: number, maxLines: number, fontSize: number) {
  const raw = String(text || "").replace(/\r/g, "");
  if (!raw.trim()) return ["-"];
  setPdfFont(doc);
  doc.fontSize(fontSize);

  const src = raw.split("\n");
  const lines: string[] = [];
  for (const seg of src) {
    let cur = "";
    for (const ch of seg) {
      const next = `${cur}${ch}`;
      if (doc.widthOfString(next) <= width) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        cur = ch;
        if (lines.length >= maxLines) break;
      }
    }
    if (lines.length >= maxLines) break;
    lines.push(cur || "");
    if (lines.length >= maxLines) break;
  }

  const out = lines.slice(0, maxLines);
  const joined = out.join("\n");
  if (joined.replace(/\n/g, "").length < raw.replace(/\n/g, "").length) {
    const last = out.length - 1;
    out[last] = `${out[last].slice(0, Math.max(0, out[last].length - 1))}…`;
  }
  return out;
}

function drawTextBox(doc: PDFDoc, x: number, y: number, w: number, h: number, text: string, fontSize = 7.2, maxLines = 3, color = "#0f172a") {
  const lines = breakLines(doc, text, w, maxLines, fontSize);
  doc.save();
  doc.rect(x, y, w, h).clip();
  setPdfFont(doc);
  doc.fillColor(color).fontSize(fontSize);
  doc.text(lines.join("\n"), x, y, { width: w, lineGap: 1 });
  doc.restore();
}

function panel(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill("#f8fafc").stroke("#cbd5e1");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#0f172a").fontSize(9.4).text(title, x + 6, y + 5, { width: w - 12 });
}

function kv(doc: PDFDoc, x: number, y: number, w: number, k: string, v: string, boxH = 16, lines = 1) {
  setPdfBoldFont(doc);
  doc.fillColor("#334155").fontSize(7.2).text(k, x, y, { width: w });
  drawTextBox(doc, x, y + 9, w, boxH, v, 7.2, lines, "#0f172a");
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
  doc.fillColor("#7f1d1d").fontSize(14).text(ZH.title, left, top);

  const y1 = top + 20;
  const h1 = 84;
  const w1a = Math.floor(contentW * 0.52);
  const w1b = contentW - w1a - gap;
  panel(doc, left, y1, w1a, h1, ZH.base);
  kv(doc, left + 8, y1 + 20, 160, ZH.name, report.student.name, 15, 1);
  kv(doc, left + 176, y1 + 20, 140, ZH.date, new Date().toLocaleDateString(), 15, 1);
  kv(doc, left + 324, y1 + 20, w1a - 332, ZH.period, report.reportPeriodLabel || "-", 15, 1);
  kv(doc, left + 8, y1 + 46, 220, ZH.tool, draft.assessmentTool || "-", 15, 1);
  kv(doc, left + 236, y1 + 46, 120, ZH.score, String(report.overallScore ?? "-"), 15, 1);
  kv(doc, left + 364, y1 + 46, w1a - 372, ZH.cefr, report.examTargetStatus || "-", 15, 1);

  panel(doc, left + w1a + gap, y1, w1b, h1, ZH.note);
  drawTextBox(doc, left + w1a + gap + 7, y1 + 20, w1b - 14, h1 - 26, draft.warningNote, 7.2, 8, "#7f1d1d");

  const y2 = y1 + h1 + gap;
  const h2 = 170;
  const w2a = Math.floor(contentW * 0.34);
  const w2b = contentW - w2a - gap;
  panel(doc, left, y2, w2a, h2, ZH.overall);
  kv(doc, left + 8, y2 + 20, w2a - 16, ZH.level, draft.overallEstimatedLevel || "-", 16, 2);
  kv(doc, left + 8, y2 + 54, w2a - 16, ZH.summary, draft.overallSummary || "-", h2 - 64, 10);

  panel(doc, left + w2a + gap, y2, w2b, h2, ZH.skills);
  const cardGap = 6;
  const cardW = Math.floor((w2b - cardGap) / 2);
  const cardH = Math.floor((h2 - 24 - cardGap) / 2);
  const sx = left + w2a + gap + 6;
  const sy = y2 + 18;
  const cards = [
    { t: ZH.listening, l: draft.listeningLevel, p: draft.listeningPerformance, s: draft.listeningStrengths, d: draft.listeningImprovements, x: sx, y: sy },
    { t: ZH.reading, l: draft.readingLevel, p: draft.readingPerformance, s: draft.readingStrengths, d: draft.readingImprovements, x: sx + cardW + cardGap, y: sy },
    { t: ZH.writing, l: draft.writingLevel, p: draft.writingPerformance, s: draft.writingStrengths, d: draft.writingImprovements, x: sx, y: sy + cardH + cardGap },
    { t: ZH.speaking, l: draft.speakingLevel, p: draft.speakingPerformance, s: draft.speakingStrengths, d: draft.speakingImprovements, x: sx + cardW + cardGap, y: sy + cardH + cardGap },
  ];
  for (const c of cards) {
    doc.save();
    doc.roundedRect(c.x, c.y, cardW - 6, cardH - 6, 5).fill("#ffffff").stroke("#e2e8f0");
    doc.restore();
    setPdfBoldFont(doc);
    doc.fillColor("#0f172a").fontSize(8).text(c.t, c.x + 5, c.y + 4, { width: cardW - 16 });
    kv(doc, c.x + 5, c.y + 16, cardW - 16, ZH.current, c.l || "-", 12, 1);
    kv(doc, c.x + 5, c.y + 30, cardW - 16, ZH.perf, c.p || "-", 12, 1);
    kv(doc, c.x + 5, c.y + 44, cardW - 16, ZH.strength, c.s || "-", 12, 1);
    kv(doc, c.x + 5, c.y + 58, cardW - 16, ZH.improve, c.d || "-", 12, 1);
  }

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
    panel(doc, left, y3, w, h3, ZH.learning);
    kv(doc, left + 8, y3 + 20, w - 16, ZH.participation, draft.classParticipation, 22, 2);
    kv(doc, left + 8, y3 + 48, w - 16, ZH.focus, draft.focusEngagement, 22, 2);
    kv(doc, left + 8, y3 + 76, w - 16, ZH.homework, draft.homeworkPreparation, 22, 2);
    kv(doc, left + 8, y3 + 104, w - 16, ZH.attitude, draft.attitudeGeneral, 22, 2);

    panel(doc, c2x, y3, w, h3, ZH.rec);
    kv(doc, c2x + 8, y3 + 20, w - 16, ZH.key, draft.keyStrengths, 22, 2);
    kv(doc, c2x + 8, y3 + 48, w - 16, ZH.bottleneck, draft.primaryBottlenecks, 22, 2);
    kv(doc, c2x + 8, y3 + 76, w - 16, ZH.next, draft.nextPhaseFocus, 22, 2);
    kv(doc, c2x + 8, y3 + 104, w - 16, ZH.load, draft.suggestedPracticeLoad, 16, 1);
    kv(doc, c2x + 8, y3 + 126, w - 16, ZH.target, draft.targetLevelScore, 16, 1);
  } else {
    const w = Math.floor((contentW - gap * 2) / 3);
    const c2x = left + w + gap;
    const c3x = c2x + w + gap;
    panel(doc, left, y3, w, h3, ZH.learning);
    kv(doc, left + 8, y3 + 20, w - 16, ZH.participation, draft.classParticipation, 18, 2);
    kv(doc, left + 8, y3 + 43, w - 16, ZH.focus, draft.focusEngagement, 18, 2);
    kv(doc, left + 8, y3 + 66, w - 16, ZH.homework, draft.homeworkPreparation, 18, 2);
    kv(doc, left + 8, y3 + 89, w - 16, ZH.attitude, draft.attitudeGeneral, 18, 2);

    panel(doc, c2x, y3, w, h3, ZH.rec);
    kv(doc, c2x + 8, y3 + 20, w - 16, ZH.key, draft.keyStrengths, 18, 2);
    kv(doc, c2x + 8, y3 + 43, w - 16, ZH.bottleneck, draft.primaryBottlenecks, 18, 2);
    kv(doc, c2x + 8, y3 + 66, w - 16, ZH.next, draft.nextPhaseFocus, 18, 2);
    kv(doc, c2x + 8, y3 + 89, w - 16, ZH.load, draft.suggestedPracticeLoad, 12, 1);
    kv(doc, c2x + 8, y3 + 106, w - 16, ZH.target, draft.targetLevelScore, 12, 1);

    panel(doc, c3x, y3, w, h3, `${draft.examName || "\u8003\u8bd5"}${ZH.examSuffix}`);
    let ey = y3 + 20;
    for (const row of examRows.slice(0, 7)) {
      kv(doc, c3x + 8, ey, w - 16, row.label || ZH.item, row.value || "-", 12, 1);
      ey += 17;
    }
  }

  setPdfFont(doc);
  doc.fillColor("#64748b").fontSize(6.8).text(`${ZH.generated}\uff1a${new Date().toLocaleString()} | ${ZH.onePage}`, left, pageH - 14, {
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

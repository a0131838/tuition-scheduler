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

function drawHeader(doc: PDFDoc, report: any) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const right = left + width;
  doc.save();
  doc.roundedRect(left, 36, width, 86, 12).fill("#fff1f2");
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor("#991b1b").fontSize(23).text("Midterm Report / 中期报告", left + 14, 48);
  setPdfFont(doc);
  doc.fillColor("#374151").fontSize(11);
  doc.text(`Student 学生: ${report.student.name}`, left + 14, 84);
  doc.text(`Teacher 老师: ${report.teacher.name}`, left + 14, 102);
  doc.text(
    `Course 课程: ${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}`,
    left + 260,
    84,
    { width: right - (left + 260) - 10 }
  );
  doc.text(
    `Score 总分: ${report.overallScore ?? "-"}   Exam 准备状态: ${report.examTargetStatus || "-"}`,
    left + 260,
    102,
    { width: right - (left + 260) - 10 }
  );
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

function drawSkillRow(doc: PDFDoc, label: string, level: string, comment: string, y: number) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const levelW = 70;
  const rowPad = 8;
  const blockH = Math.max(30, doc.heightOfString(comment || "-", { width: width - levelW - 20, lineGap: 2 }) + 10);
  doc.save();
  doc.roundedRect(left, y, width, blockH, 8).fill("#ffffff").stroke("#e5e7eb");
  doc.restore();
  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(10.5).text(label, left + rowPad, y + 8);
  setPdfFont(doc);
  doc.fillColor("#4b5563").fontSize(10).text(level || "-", left + width - levelW, y + 8, { width: levelW - rowPad, align: "right" });
  doc.fillColor("#1f2937").fontSize(10).text(comment || "-", left + rowPad, y + 24, { width: width - rowPad * 2, lineGap: 2 });
  return y + blockH + 6;
}

function ensurePage(doc: PDFDoc, y: number, need = 90) {
  if (y + need <= doc.page.height - doc.page.margins.bottom) return y;
  doc.addPage();
  return doc.page.margins.top;
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
  drawHeader(doc, report);
  let y = 132;

  y = ensurePage(doc, y, 60);
  y = drawSectionTitle(doc, "Important Notice / 重要免责声明", y);
  y = drawParagraph(doc, draft.warningNote, y, "#7f1d1d");

  y = ensurePage(doc, y, 120);
  y = drawSectionTitle(doc, "Overall Evaluation / 总评", y);
  y = drawParagraph(doc, draft.overallComment, y);

  y = ensurePage(doc, y, 260);
  y = drawSectionTitle(doc, "Skill Breakdown / 分项能力", y);
  y = drawSkillRow(doc, "Vocabulary & Grammar / 词汇与语法", draft.vocabularyLevel, draft.vocabularyComment, y);
  y = drawSkillRow(doc, "Listening / 听力", draft.listeningLevel, draft.listeningComment, y);
  y = drawSkillRow(doc, "Reading / 阅读", draft.readingLevel, draft.readingComment, y);
  y = drawSkillRow(doc, "Writing / 写作", draft.writingLevel, draft.writingComment, y);
  y = drawSkillRow(doc, "Speaking / 口语", draft.speakingLevel, draft.speakingComment, y);

  y = ensurePage(doc, y, 110);
  y = drawSectionTitle(doc, "Summary / 总结", y);
  y = drawParagraph(doc, draft.summaryComment, y);

  y = ensurePage(doc, y, 120);
  y = drawSectionTitle(doc, "iTEP Predicted / iTEP 预估分", y);
  const hasAnyItep =
    String(draft.itepGrammar || "").trim() ||
    String(draft.itepVocab || "").trim() ||
    String(draft.itepListening || "").trim() ||
    String(draft.itepReading || "").trim() ||
    String(draft.itepWriting || "").trim() ||
    String(draft.itepSpeaking || "").trim() ||
    String(draft.itepTotal || "").trim();
  if (!hasAnyItep) {
    y = drawParagraph(doc, "Not provided (optional) / 未提供（可选）", y, "#6b7280");
  } else {
    y = drawParagraph(
      doc,
      `Grammar 语法: ${draft.itepGrammar || "-"}   Vocab 词汇: ${draft.itepVocab || "-"}   Listening 听力: ${draft.itepListening || "-"}`,
      y
    );
    y = drawParagraph(
      doc,
      `Reading 阅读: ${draft.itepReading || "-"}   Writing 写作: ${draft.itepWriting || "-"}   Speaking 口语: ${draft.itepSpeaking || "-"}   Total 总分: ${draft.itepTotal || "-"}`,
      y
    );
  }

  y = ensurePage(doc, y, 160);
  y = drawSectionTitle(doc, "Class Discipline / 课堂纪律", y);
  y = drawParagraph(doc, `Subject 科目: ${draft.disciplineSubject || "-"}    Scope 范围: ${draft.disciplinePages || "-"}`, y);
  y = drawParagraph(doc, `Progress 进度: ${draft.disciplineProgress || "-"}`, y);
  y = drawParagraph(doc, `Strengths 优点: ${draft.disciplineStrengths || "-"}`, y);
  y = drawParagraph(doc, `Behavior 课堂表现: ${draft.disciplineClassBehavior || "-"}`, y);
  y = drawParagraph(doc, `Next Steps 建议: ${draft.disciplineNextStep || "-"}`, y);

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

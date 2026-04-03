import { requireAdmin } from "@/lib/auth";
import { parseFinalReportDraft, parseFinalReportMeta } from "@/lib/final-report";
import { getLang } from "@/lib/i18n";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly } from "@/lib/date-only";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

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
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#F8FAFC");
  doc.restore();
}

function panel(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string, tone: { bg: string; border: string; title: string }) {
  doc.save();
  doc.lineWidth(0.8);
  doc.roundedRect(x, y, w, h, 8).fill(tone.bg).stroke(tone.border);
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor(tone.title).fontSize(11.5).text(title, x + 10, y + 8, { width: w - 20 });
}

function field(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string, height = 48) {
  setPdfBoldFont(doc);
  doc.fillColor("#475569").fontSize(8.5).text(label, x, y, { width: w });
  setPdfFont(doc);
  doc.fillColor("#0F172A").fontSize(10.5).text(normalizeText(value), x, y + 12, {
    width: w,
    height,
    lineGap: 1.5,
  });
}

function sectionText(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string, minHeight = 78) {
  const h = Math.max(minHeight, doc.heightOfString(normalizeText(value), { width: w, lineGap: 1.5 }) + 18);
  panel(doc, x, y, w, h, label, { bg: "#FFFFFF", border: "#E2E8F0", title: "#0F172A" });
  setPdfFont(doc);
  doc.fillColor("#1F2937").fontSize(10.5).text(normalizeText(value), x + 10, y + 28, {
    width: w - 20,
    lineGap: 1.5,
  });
  return h;
}

function recommendationLabel(value: string, lang: "BILINGUAL" | "ZH" | "EN") {
  const zh =
    value === "CONTINUE_CURRENT"
      ? "继续当前课程"
      : value === "MOVE_TO_NEXT_LEVEL"
        ? "进入下一阶段"
        : value === "CHANGE_FOCUS"
          ? "调整课程方向"
          : value === "PAUSE_AFTER_COMPLETION"
            ? "结课后暂缓继续"
            : value === "COURSE_COMPLETED"
              ? "课程已完成"
              : "-";
  const en =
    value === "CONTINUE_CURRENT"
      ? "Continue current course"
      : value === "MOVE_TO_NEXT_LEVEL"
        ? "Move to next level"
        : value === "CHANGE_FOCUS"
          ? "Change subject or focus"
          : value === "PAUSE_AFTER_COMPLETION"
            ? "Pause after completion"
            : value === "COURSE_COMPLETED"
              ? "Course completed"
              : "-";
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

function deliveryChannelLabel(value: string | null | undefined, lang: "BILINGUAL" | "ZH" | "EN") {
  const zh =
    value === "WECHAT"
      ? "微信"
      : value === "EMAIL"
        ? "邮件"
        : value === "WHATSAPP"
          ? "WhatsApp"
          : value === "PRINTED"
            ? "纸质版"
            : value === "OTHER"
              ? "其他"
              : "-";
  const en =
    value === "WECHAT"
      ? "WeChat"
      : value === "EMAIL"
        ? "Email"
        : value === "WHATSAPP"
          ? "WhatsApp"
          : value === "PRINTED"
            ? "Printed copy"
            : value === "OTHER"
              ? "Other"
              : "-";
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

function statusLabel(value: string, lang: "BILINGUAL" | "ZH" | "EN") {
  const zh = value === "FORWARDED" ? "已转发" : value === "SUBMITTED" ? "已提交" : "待填写";
  const en = value === "FORWARDED" ? "Forwarded" : value === "SUBMITTED" ? "Submitted" : "Assigned";
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const lang = await getLang();
  const { id } = await params;

  const report = await prisma.finalReport.findUnique({
    where: { id },
    include: { student: true, teacher: true, course: true, subject: true, package: true, deliveredByUser: { select: { name: true } } },
  });
  if (!report) return new Response("Report not found", { status: 404 });

  const draft = parseFinalReportDraft({
    ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}),
    recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep,
  });
  const meta = parseFinalReportMeta(report.reportJson);

  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margin: mm(12),
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
  const contentW = doc.page.width - left - right;
  const gap = 10;
  let y = top;

  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(18).text(lang === "ZH" ? "结课报告" : lang === "EN" ? "Final Report" : "Final Report / 结课报告", left, y, {
    width: contentW,
  });
  y += 28;

  panel(doc, left, y, contentW, 84, lang === "ZH" ? "基本信息" : lang === "EN" ? "Report Overview" : "Report Overview / 基本信息", {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    title: "#1D4ED8",
  });
  const colGap = 12;
  const colW = (contentW - colGap * 2) / 3;
  field(doc, left + 10, y + 28, colW, lang === "ZH" ? "学生" : lang === "EN" ? "Student" : "Student / 学生", report.student.name);
  field(doc, left + 10 + colW + colGap, y + 28, colW, lang === "ZH" ? "课程" : lang === "EN" ? "Course" : "Course / 课程", `${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}`);
  field(doc, left + 10 + (colW + colGap) * 2, y + 28, colW, lang === "ZH" ? "老师" : lang === "EN" ? "Teacher" : "Teacher / 老师", report.teacher.name);
  y += 84 + gap;

  panel(doc, left, y, contentW, 84, lang === "ZH" ? "结课结论" : lang === "EN" ? "Outcome Snapshot" : "Outcome Snapshot / 结课结论", {
    bg: "#ECFDF5",
    border: "#BBF7D0",
    title: "#166534",
  });
  field(doc, left + 10, y + 28, colW, lang === "ZH" ? "报告阶段" : lang === "EN" ? "Report period" : "Report period / 报告阶段", report.reportPeriodLabel || "");
  field(doc, left + 10 + colW + colGap, y + 28, colW, lang === "ZH" ? "最终水平" : lang === "EN" ? "Final level" : "Final level / 最终水平", report.finalLevel || "");
  field(doc, left + 10 + (colW + colGap) * 2, y + 28, colW, lang === "ZH" ? "下一步建议" : lang === "EN" ? "Recommended next step" : "Recommended next step / 下一步建议", recommendationLabel(report.recommendation || draft.recommendedNextStep, lang));
  y += 84 + gap;

  panel(doc, left, y, contentW, 84, lang === "ZH" ? "交付记录" : lang === "EN" ? "Delivery Record" : "Delivery Record / 交付记录", {
    bg: "#FFF7ED",
    border: "#FDBA74",
    title: "#9A3412",
  });
  field(doc, left + 10, y + 28, colW, lang === "ZH" ? "报告状态" : lang === "EN" ? "Report status" : "Report status / 报告状态", statusLabel(report.status, lang));
  field(doc, left + 10 + colW + colGap, y + 28, colW, lang === "ZH" ? "交付方式" : lang === "EN" ? "Delivery channel" : "Delivery channel / 交付方式", deliveryChannelLabel(report.deliveryChannel, lang));
  field(
    doc,
    left + 10 + (colW + colGap) * 2,
    y + 28,
    colW,
    lang === "ZH" ? "交付时间" : lang === "EN" ? "Delivered at" : "Delivered at / 交付时间",
    report.deliveredAt ? formatBusinessDateOnly(new Date(report.deliveredAt)) : "-"
  );
  y += 84 + gap;

  y += sectionText(doc, left, y, contentW, lang === "ZH" ? "开始目标" : lang === "EN" ? "Initial goals" : "Initial goals / 开始目标", draft.initialGoals, 64) + gap;
  y += sectionText(doc, left, y, contentW, lang === "ZH" ? "最终结果总结" : lang === "EN" ? "Final outcome summary" : "Final outcome summary / 最终结果总结", draft.finalSummary, 88) + gap;

  const halfW = (contentW - gap) / 2;
  const strengthsH = sectionText(doc, left, y, halfW, lang === "ZH" ? "学生优势" : lang === "EN" ? "Strengths" : "Strengths / 学生优势", draft.strengths, 82);
  const continueH = sectionText(doc, left + halfW + gap, y, halfW, lang === "ZH" ? "后续提升建议" : lang === "EN" ? "Areas to continue" : "Areas to continue / 后续提升建议", draft.areasToContinue, 82);
  y += Math.max(strengthsH, continueH) + gap;

  const attendanceH = sectionText(doc, left, y, halfW, lang === "ZH" ? "出勤表现" : lang === "EN" ? "Attendance comment" : "Attendance comment / 出勤表现", draft.attendanceComment, 64);
  const homeworkH = sectionText(doc, left + halfW + gap, y, halfW, lang === "ZH" ? "作业表现" : lang === "EN" ? "Homework comment" : "Homework comment / 作业表现", draft.homeworkComment, 64);
  y += Math.max(attendanceH, homeworkH) + gap;

  y += sectionText(doc, left, y, contentW, lang === "ZH" ? "给家长的话" : lang === "EN" ? "Parent note" : "Parent note / 给家长的话", draft.parentNote, 88) + gap;
  y += sectionText(doc, left, y, contentW, lang === "ZH" ? "家长交付备注" : lang === "EN" ? "Parent delivery note" : "Parent delivery note / 家长交付备注", meta.deliveryNote, 64) + gap;
  sectionText(doc, left, y, contentW, lang === "ZH" ? "教师内部备注" : lang === "EN" ? "Teacher internal note" : "Teacher internal note / 教师内部备注", draft.teacherComment, 64);

  const stream = streamPdf(doc);
  const filename = `final-report-${safeName(report.student.name)}-${safeName(report.course.name)}.pdf`;
  const filenameAscii = filename.replace(/[^\x20-\x7E]/g, "_");
  const filenameUtf8 = encodeURIComponent(filename);

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filenameAscii}\"; filename*=UTF-8''${filenameUtf8}`,
    },
  });
}

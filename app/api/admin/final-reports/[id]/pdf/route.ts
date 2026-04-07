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

function fitBodyFontSize(doc: PDFDoc, value: string, width: number, height: number, max = 9.2, min = 6.6) {
  const text = normalizeText(value);
  for (let size = max; size >= min; size -= 0.2) {
    const measured = doc.heightOfString(text, { width, lineGap: 1.15, align: "left" });
    if (measured <= height) return Number(size.toFixed(1));
    doc.fontSize(size);
  }
  return min;
}

function compactSectionText(
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  tone: { bg: string; border: string; title: string } = { bg: "#FFFFFF", border: "#E2E8F0", title: "#0F172A" }
) {
  panel(doc, x, y, w, h, label, tone);
  const bodyX = x + 9;
  const bodyY = y + 26;
  const bodyW = w - 18;
  const bodyH = h - 34;
  const fontSize = fitBodyFontSize(doc, value, bodyW, bodyH);

  doc.save();
  doc.rect(bodyX, bodyY, bodyW, bodyH).clip();
  setPdfFont(doc);
  doc.fillColor("#1F2937").fontSize(fontSize).text(normalizeText(value), bodyX, bodyY, {
    width: bodyW,
    height: bodyH,
    lineGap: 1.15,
  });
  doc.restore();
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
    layout: "landscape",
    margin: mm(8),
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
  const contentH = doc.page.height - top - doc.page.margins.bottom;
  const gap = 8;
  let y = top;

  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(18).text(lang === "ZH" ? "结课报告" : lang === "EN" ? "Final Report" : "Final Report / 结课报告", left, y, { width: contentW });
  setPdfFont(doc);
  doc.fillColor("#64748B").fontSize(9.2).text(
    lang === "ZH"
      ? `${report.student.name} · ${report.course.name}`
      : lang === "EN"
        ? `${report.student.name} · ${report.course.name}`
        : `${report.student.name} · ${report.course.name}`,
    left,
    y + 18,
    { width: contentW }
  );
  y += 34;

  const summaryH = 58;
  panel(doc, left, y, contentW, summaryH, lang === "ZH" ? "报告总览" : lang === "EN" ? "Report Overview" : "Report Overview / 报告总览", {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    title: "#1D4ED8",
  });
  const colGap = 10;
  const summaryColW = (contentW - colGap * 3 - 20) / 4;
  field(doc, left + 10, y + 24, summaryColW, lang === "ZH" ? "学生" : lang === "EN" ? "Student" : "Student / 学生", report.student.name, 28);
  field(doc, left + 10 + (summaryColW + colGap), y + 24, summaryColW, lang === "ZH" ? "课程" : lang === "EN" ? "Course" : "Course / 课程", `${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}`, 28);
  field(doc, left + 10 + (summaryColW + colGap) * 2, y + 24, summaryColW, lang === "ZH" ? "老师" : lang === "EN" ? "Teacher" : "Teacher / 老师", report.teacher.name, 28);
  field(doc, left + 10 + (summaryColW + colGap) * 3, y + 24, summaryColW, lang === "ZH" ? "状态" : lang === "EN" ? "Status" : "Status / 状态", statusLabel(report.status, lang), 28);
  y += summaryH + gap;

  const snapshotH = 56;
  panel(doc, left, y, contentW, snapshotH, lang === "ZH" ? "结课结论" : lang === "EN" ? "Outcome Snapshot" : "Outcome Snapshot / 结课结论", {
    bg: "#ECFDF5",
    border: "#BBF7D0",
    title: "#166534",
  });
  field(doc, left + 10, y + 24, summaryColW, lang === "ZH" ? "报告阶段" : lang === "EN" ? "Report period" : "Report period / 报告阶段", report.reportPeriodLabel || "", 24);
  field(doc, left + 10 + (summaryColW + colGap), y + 24, summaryColW, lang === "ZH" ? "最终水平" : lang === "EN" ? "Final level" : "Final level / 最终水平", report.finalLevel || "", 24);
  field(doc, left + 10 + (summaryColW + colGap) * 2, y + 24, summaryColW, lang === "ZH" ? "下一步建议" : lang === "EN" ? "Recommended next step" : "Recommended next step / 下一步建议", recommendationLabel(report.recommendation || draft.recommendedNextStep, lang), 24);
  field(doc, left + 10 + (summaryColW + colGap) * 3, y + 24, summaryColW, lang === "ZH" ? "交付方式" : lang === "EN" ? "Delivery channel" : "Delivery channel / 交付方式", deliveryChannelLabel(report.deliveryChannel, lang), 24);
  y += snapshotH + gap;

  const deliveryH = 56;
  panel(doc, left, y, contentW, deliveryH, lang === "ZH" ? "交付记录" : lang === "EN" ? "Delivery Record" : "Delivery Record / 交付记录", {
    bg: "#FFF7ED",
    border: "#FDBA74",
    title: "#9A3412",
  });
  field(doc, left + 10, y + 24, summaryColW, lang === "ZH" ? "交付时间" : lang === "EN" ? "Delivered at" : "Delivered at / 交付时间", report.deliveredAt ? formatBusinessDateOnly(new Date(report.deliveredAt)) : "-", 24);
  field(doc, left + 10 + (summaryColW + colGap), y + 24, summaryColW, lang === "ZH" ? "交付人" : lang === "EN" ? "Delivered by" : "Delivered by / 交付人", report.deliveredByUser?.name || "-", 24);
  field(doc, left + 10 + (summaryColW + colGap) * 2, y + 24, summaryColW, lang === "ZH" ? "老师内部备注" : lang === "EN" ? "Teacher note status" : "Teacher note status / 教师备注", draft.teacherComment ? (lang === "ZH" ? "已填写" : lang === "EN" ? "Included" : "Included / 已填写") : "-", 24);
  field(
    doc,
    left + 10 + (summaryColW + colGap) * 3,
    y + 24,
    summaryColW,
    lang === "ZH" ? "内部转发" : lang === "EN" ? "Forwarded by" : "Forwarded by / 内部转发",
    meta.forwardedByName || "-"
  );
  y += deliveryH + gap;

  const remainingH = top + contentH - y;
  const bodyRows = 3;
  const rowGap = gap;
  const colW = (contentW - gap * 2) / 3;
  const rowH = Math.floor((remainingH - rowGap * (bodyRows - 1)) / bodyRows);

  compactSectionText(doc, left, y, colW, rowH, lang === "ZH" ? "开始目标" : lang === "EN" ? "Initial goals" : "Initial goals / 开始目标", draft.initialGoals, {
    bg: "#FFFFFF",
    border: "#DBEAFE",
    title: "#1D4ED8",
  });
  compactSectionText(doc, left + colW + gap, y, colW, rowH, lang === "ZH" ? "最终结果总结" : lang === "EN" ? "Final outcome summary" : "Final outcome summary / 最终结果总结", draft.finalSummary, {
    bg: "#FFFFFF",
    border: "#BBF7D0",
    title: "#166534",
  });
  compactSectionText(doc, left + (colW + gap) * 2, y, colW, rowH, lang === "ZH" ? "学生优势" : lang === "EN" ? "Strengths" : "Strengths / 学生优势", draft.strengths, {
    bg: "#FFFFFF",
    border: "#FDE68A",
    title: "#92400E",
  });
  y += rowH + rowGap;

  compactSectionText(doc, left, y, colW, rowH, lang === "ZH" ? "后续提升建议" : lang === "EN" ? "Areas to continue" : "Areas to continue / 后续提升建议", draft.areasToContinue, {
    bg: "#FFFFFF",
    border: "#DDD6FE",
    title: "#6D28D9",
  });
  compactSectionText(doc, left + colW + gap, y, colW, rowH, lang === "ZH" ? "出勤表现" : lang === "EN" ? "Attendance comment" : "Attendance comment / 出勤表现", draft.attendanceComment);
  compactSectionText(doc, left + (colW + gap) * 2, y, colW, rowH, lang === "ZH" ? "作业表现" : lang === "EN" ? "Homework comment" : "Homework comment / 作业表现", draft.homeworkComment);
  y += rowH + rowGap;

  compactSectionText(doc, left, y, colW, rowH, lang === "ZH" ? "给家长的话" : lang === "EN" ? "Parent note" : "Parent note / 给家长的话", draft.parentNote, {
    bg: "#FFF7ED",
    border: "#FDBA74",
    title: "#9A3412",
  });
  compactSectionText(doc, left + colW + gap, y, colW, rowH, lang === "ZH" ? "家长交付备注" : lang === "EN" ? "Parent delivery note" : "Parent delivery note / 家长交付备注", meta.deliveryNote || "-", {
    bg: "#F8FAFC",
    border: "#CBD5E1",
    title: "#334155",
  });
  compactSectionText(doc, left + (colW + gap) * 2, y, colW, rowH, lang === "ZH" ? "教师内部备注" : lang === "EN" ? "Teacher internal note" : "Teacher internal note / 教师内部备注", draft.teacherComment || "-", {
    bg: "#F8FAFC",
    border: "#CBD5E1",
    title: "#334155",
  });

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

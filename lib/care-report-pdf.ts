import PDFDocument from "pdfkit";
import path from "path";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { reportTypeLabel } from "@/lib/care-report-validation";

type PDFDoc = InstanceType<typeof PDFDocument>;

type CareReportPdfData = {
  id: string;
  title: string;
  reportType: "MONTHLY" | "MILESTONE" | "INCIDENT" | "TERM";
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  riskLevel: string;
  overallSummary: string;
  academicSummary: string | null;
  schoolSummary: string | null;
  lifeSummary: string | null;
  riskSummary: string | null;
  actionsCompleted: string;
  evidenceSummary: string | null;
  nextPlan: string;
  studentActions: string | null;
  parentActions: string | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
  student: { name: string; school: string | null; grade: string | null };
  preparedBy: { name: string };
  approvedBy: { name: string } | null;
};

const ORANGE = "#EC5E0A";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function addLogo(doc: PDFDoc) {
  try {
    doc.image(LOGO_PATH, 40, 32, { width: 150 });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, 40, 32, { width: 150 });
    } catch {}
  }
}

function ensureSpace(doc: PDFDoc, y: number, minimum = 100) {
  if (y + minimum <= doc.page.height - 55) return y;
  doc.addPage();
  return 46;
}

function section(doc: PDFDoc, y: number, title: string, body: string | null) {
  if (!body) return y;
  y = ensureSpace(doc, y, 90);
  doc.fillColor(ORANGE).rect(40, y, 4, 17).fill();
  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(11).text(title, 52, y, { width: 500 });
  y += 25;
  setPdfFont(doc);
  doc.fillColor("#374151").fontSize(9.5).text(body, 52, y, { width: 493, lineGap: 3 });
  return doc.y + 18;
}

export function buildCareReportPdf(report: CareReportPdfData) {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, info: { Title: report.title } });
  setPdfFont(doc);
  addLogo(doc);

  setPdfBoldFont(doc);
  doc.fillColor(ORANGE).fontSize(22).text("学生托管进展报告", 250, 34, { width: 305, align: "right" });
  setPdfFont(doc);
  doc.fillColor("#6B7280").fontSize(9).text("Student Care Progress Report", 250, 65, { width: 305, align: "right" });
  doc.moveTo(40, 98).lineTo(555, 98).lineWidth(1).strokeColor("#D1D5DB").stroke();

  const metaY = 115;
  const rows = [
    ["学生 / Student", report.student.name],
    ["学校与年级 / School & Grade", [report.student.school, report.student.grade].filter(Boolean).join(" · ") || "-"],
    ["报告类型 / Type", reportTypeLabel(report.reportType)],
    ["报告期间 / Period", `${report.periodLabel} · ${formatBusinessDateOnly(report.periodStart)} - ${formatBusinessDateOnly(report.periodEnd)}`],
    ["风险等级 / Risk", report.riskLevel],
  ];
  rows.forEach(([label, value], index) => {
    const y = metaY + index * 20;
    setPdfBoldFont(doc);
    doc.fillColor("#4B5563").fontSize(8.5).text(label, 40, y, { width: 170 });
    setPdfFont(doc);
    doc.fillColor("#111827").fontSize(9).text(value, 210, y, { width: 345 });
  });

  let y = metaY + rows.length * 20 + 22;
  y = section(doc, y, "本期结论 / Overall conclusion", report.overallSummary);
  y = section(doc, y, "学业进展 / Academic progress", report.academicSummary);
  y = section(doc, y, "学校沟通 / School communication", report.schoolSummary);
  y = section(doc, y, "生活与状态 / Life and wellbeing", report.lifeSummary);
  y = section(doc, y, "风险与专业判断 / Risks and judgement", report.riskSummary);
  y = section(doc, y, "已完成行动 / Actions completed", report.actionsCompleted);
  y = section(doc, y, "服务交付证据 / Delivery evidence", report.evidenceSummary);
  y = section(doc, y, "下一阶段计划 / Next plan", report.nextPlan);
  y = section(doc, y, "学生需要完成 / Student actions", report.studentActions);
  y = section(doc, y, "家长需要配合 / Parent actions", report.parentActions);

  y = ensureSpace(doc, y, 90);
  doc.moveTo(40, y).lineTo(555, y).lineWidth(1).strokeColor("#D1D5DB").stroke();
  y += 14;
  setPdfFont(doc);
  doc.fillColor("#6B7280").fontSize(8.5).text(`起草 / Prepared by: ${report.preparedBy.name}`, 40, y, { width: 250 });
  doc.text(`审核 / Approved by: ${report.approvedBy?.name ?? "-"}`, 305, y, { width: 250, align: "right" });
  y += 18;
  doc.text(`批准时间 / Approved: ${report.approvedAt ? formatBusinessDateTime(report.approvedAt) : "-"}`, 40, y, { width: 250 });
  doc.text(`发布时间 / Published: ${report.publishedAt ? formatBusinessDateTime(report.publishedAt) : "-"}`, 305, y, { width: 250, align: "right" });

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    setPdfFont(doc);
    doc.fillColor("#9CA3AF").fontSize(8).text(
      `GT Educational Institute Pte. Ltd. · ${index + 1}/${range.count}`,
      40,
      doc.page.height - 52,
      { width: 515, align: "center", lineBreak: false },
    );
  }

  const fileName = `${safeName(report.student.name)}_${safeName(report.periodLabel)}_${safeName(reportTypeLabel(report.reportType))}.pdf`;
  return { doc, fileName };
}

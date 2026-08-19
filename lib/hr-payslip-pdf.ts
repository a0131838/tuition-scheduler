import PDFDocument from "pdfkit";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { formatHrMoney } from "@/lib/hr-payslip";

type PDFDoc = InstanceType<typeof PDFDocument>;
type PayslipData = {
  month: string; currencyCode: string; basicSalaryCents: number; allowanceCents: number; deductionCents: number;
  employeeCpfCents: number; employerCpfCents: number; reimbursementCents: number; grossPayCents: number; netPayCents: number;
  status: string; paymentReference: string | null; paidAt: Date | null; note: string | null;
  employee: { employeeNo: string | null; department: string | null; jobTitle: string | null; user: { name: string }; legalEntity: { name: string; registrationNumber: string | null } };
};

function line(doc: PDFDoc, y: number, label: string, amount: number, currencyCode: string, bold = false) {
  (bold ? setPdfBoldFont : setPdfFont)(doc); doc.fillColor("#111827").fontSize(bold ? 11 : 9.5).text(label, 52, y, { width: 330 }); doc.text(formatHrMoney(amount, currencyCode), 390, y, { width: 150, align: "right" });
}

export function buildHrPayslipPdf(row: PayslipData) {
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Payslip ${row.month} ${row.employee.user.name}` } });
  setPdfFont(doc);
  try { doc.image(path.join(process.cwd(), "public", "GTI2.png"), 44, 35, { width: 145 }); } catch { try { doc.image(path.join(process.cwd(), "public", "invoice-org.png"), 44, 35, { width: 145 }); } catch {} }
  setPdfBoldFont(doc); doc.fillColor("#ea580c").fontSize(23).text("PAYSLIP / 工资单", 280, 44, { width: 260, align: "right" });
  doc.moveTo(44, 105).lineTo(551, 105).strokeColor("#cbd5e1").stroke();
  setPdfBoldFont(doc); doc.fillColor("#111827").fontSize(12).text(row.employee.legalEntity.name, 52, 125);
  setPdfFont(doc); doc.fontSize(9.5).text(`UEN / 注册号: ${row.employee.legalEntity.registrationNumber || "-"}`, 52, 146);
  const details = [["Employee / 员工", row.employee.user.name], ["Employee No. / 员工号", row.employee.employeeNo || "-"], ["Role / 职位", row.employee.jobTitle || "-"], ["Department / 部门", row.employee.department || "-"], ["Payroll month / 工资月份", row.month], ["Status / 状态", row.status]];
  details.forEach(([label, value], index) => { const y = 185 + index * 23; setPdfBoldFont(doc); doc.fontSize(9).text(label, 52, y, { width: 190 }); setPdfFont(doc); doc.text(value, 250, y, { width: 290 }); });
  doc.fillColor("#eff6ff").rect(44, 335, 507, 28).fill(); setPdfBoldFont(doc); doc.fillColor("#1d4ed8").fontSize(11).text("Earnings and deductions / 收入与扣款", 52, 344);
  line(doc, 382, "Basic salary / 基本工资", row.basicSalaryCents, row.currencyCode); line(doc, 408, "Allowance / 津贴", row.allowanceCents, row.currencyCode); line(doc, 434, "Gross pay / 应发工资", row.grossPayCents, row.currencyCode, true);
  line(doc, 474, "Employee CPF / 员工 CPF", -row.employeeCpfCents, row.currencyCode); line(doc, 500, "Other deductions / 其他扣款", -row.deductionCents, row.currencyCode); line(doc, 526, "Reimbursement / 报销", row.reimbursementCents, row.currencyCode);
  doc.moveTo(52, 561).lineTo(540, 561).strokeColor("#94a3b8").stroke(); line(doc, 577, "NET PAY / 实发工资", row.netPayCents, row.currencyCode, true);
  setPdfFont(doc); doc.fillColor("#475569").fontSize(8.5).text(`Employer CPF / 雇主 CPF: ${formatHrMoney(row.employerCpfCents, row.currencyCode)}`, 52, 624);
  doc.text(`Payment reference / 付款编号: ${row.paymentReference || "-"}`, 52, 645); doc.text(`Paid date / 付款日期: ${row.paidAt ? row.paidAt.toLocaleDateString("en-SG") : "-"}`, 52, 663);
  if (row.note) doc.text(`Note / 备注: ${row.note}`, 52, 690, { width: 488 });
  doc.fontSize(7.5).fillColor("#64748b").text("Confidential payroll document. Generated from the approved HRIS record. / 私密工资文件，由已审批的人事记录生成。", 52, 770, { width: 488, align: "center" });
  return doc;
}

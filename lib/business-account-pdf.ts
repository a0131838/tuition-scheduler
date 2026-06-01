import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import type { BusinessAccount, BusinessMonthlyDocument } from "@/lib/business-accounts";

type PDFDoc = InstanceType<typeof PDFDocument>;

const BLUE = "#2563eb";
const DARK = "#111827";
const MUTED = "#475569";
const BORDER = "#cbd5e1";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function text(doc: PDFDoc, value: string, x: number, y: number, width: number, options: {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  lineGap?: number;
} = {}) {
  if (options.bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fontSize(options.size ?? 10).fillColor(options.color ?? DARK).text(value, x, y, {
    width,
    align: options.align ?? "left",
    lineGap: options.lineGap ?? 2,
  });
}

function money(v: number) {
  return `SGD ${Number(v || 0).toFixed(2)}`;
}

function paymentMethodLabel(value: string | null | undefined) {
  switch (String(value ?? "").toUpperCase()) {
    case "PAYNOW":
      return "PayNow";
    case "OTHER":
      return "Other";
    case "BANK_TRANSFER":
    default:
      return "Bank Transfer";
  }
}

function drawHeader(doc: PDFDoc, title: string, subtitle: string) {
  try {
    doc.image(LOGO_PATH, 40, 34, { width: 138 });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, 40, 34, { width: 138 });
    } catch {}
  }
  text(doc, title, 280, 36, 275, { size: 20, bold: true, color: BLUE, align: "right", lineGap: 1 });
  text(doc, subtitle, 280, 64, 275, { size: 10, color: MUTED, align: "right" });
  doc.moveTo(40, 96).lineTo(555, 96).strokeColor(BORDER).stroke();
}

function sectionTitle(doc: PDFDoc, label: string, y: number) {
  doc.roundedRect(40, y, 515, 24, 8).fillAndStroke("#eff6ff", "#bfdbfe");
  text(doc, label, 52, y + 6, 490, { size: 11, bold: true, color: BLUE });
}

function row(doc: PDFDoc, label: string, value: string, x: number, y: number, w = 245) {
  text(doc, label, x, y, w, { size: 8.5, bold: true, color: MUTED });
  text(doc, value || "-", x, y + 13, w, { size: 10, lineGap: 1 });
}

export function buildBusinessInvoicePdf(account: BusinessAccount, item: BusinessMonthlyDocument) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  drawHeader(doc, "INTERCOMPANY INVOICE", "关联服务费发票");

  sectionTitle(doc, "Invoice Details / 发票信息", 116);
  row(doc, "Invoice No. / 发票编号", item.invoiceNo, 52, 154);
  row(doc, "Invoice Date / 发票日期", item.issueDate, 310, 154);
  row(doc, "Billing Period / 结算期间", item.monthKey, 52, 196);
  row(doc, "Payment Due Date / 付款到期日", item.dueDate, 310, 196);

  sectionTitle(doc, "Seller / 开票方", 246);
  row(doc, "Company", "GT Educational Institute Pte Ltd", 52, 284);
  row(doc, "UEN", "202303312G", 310, 284);

  sectionTitle(doc, "Customer / 收款对应客户", 354);
  row(doc, "English name / 英文名称", account.legalNameEn, 52, 392, 503);
  row(doc, "Chinese name / 中文名称", account.legalNameZh, 52, 434);
  row(doc, "Unified Social Credit Code / 统一社会信用代码", account.registrationNo, 310, 434);

  sectionTitle(doc, "Fee Breakdown / 费用明细", 500);
  const tableX = 52;
  const widths = [280, 90, 120];
  const y = 536;
  text(doc, "Description / 说明", tableX, y, widths[0], { bold: true, color: MUTED });
  text(doc, "Amount / 金额", tableX + widths[0], y, widths[1] + widths[2], { bold: true, color: MUTED, align: "right" });
  doc.moveTo(tableX, y + 20).lineTo(543, y + 20).strokeColor(BORDER).stroke();
  text(doc, "Fixed monthly corporate services fee / 固定月度企业服务费", tableX, y + 32, widths[0], {});
  text(doc, money(item.fixedMonthlyFee), tableX + widths[0], y + 32, widths[1] + widths[2], { align: "right" });
  text(doc, "Variable monthly tutor fee / 浮动月度导师费用", tableX, y + 62, widths[0], {});
  text(doc, money(item.variableTutorFee), tableX + widths[0], y + 62, widths[1] + widths[2], { align: "right" });
  doc.moveTo(tableX, y + 94).lineTo(543, y + 94).strokeColor(BORDER).stroke();
  text(doc, "Total service fee / 服务费合计", tableX, y + 106, widths[0], { bold: true });
  text(doc, money(item.totalAmount), tableX + widths[0], y + 106, widths[1] + widths[2], { bold: true, align: "right" });

  sectionTitle(doc, "Payment Instructions / 付款信息", 672);
  row(doc, "Payment method / 付款方式", paymentMethodLabel(account.paymentMethod), 52, 710);
  row(doc, "Payee name / 收款方", account.payeeName ?? "GT Educational Institute Pte. Ltd.", 310, 710);
  row(doc, "Receiving bank / 收款银行", account.bankName ?? "-", 52, 752);
  row(doc, "Receiving account no. / 收款账号", account.bankAccountNo ?? "-", 310, 752);
  row(doc, "SWIFT / Bank code / Branch code", [account.bankSwiftCode, account.bankCode, account.bankBranchCode].filter(Boolean).join(" / ") || "-", 52, 794, 245);
  row(doc, "Payment reference / 付款备注", item.invoiceNo, 310, 794, 245);

  doc.addPage({ margin: 0 });
  setPdfFont(doc);
  drawHeader(doc, "INTERCOMPANY INVOICE", "Payment Notes / 付款备注");
  text(doc, "Notes / 备注", 52, 128, 490, { size: 11, bold: true, color: BLUE });
  text(
    doc,
    "This invoice is for service fees only and does not include any separate royalty, franchise fee, or standalone intellectual property licence fee. / 本发票仅对应服务费，不包含任何独立特许权使用费、加盟费或独立知识产权许可费。",
    52,
    152,
    490,
    { size: 9, color: MUTED },
  );
  text(doc, `Payment terms / 付款期限: ${account.paymentTerms}`, 52, 206, 490, { size: 10 });
  text(doc, `Receiving bank address / 收款银行地址: ${account.bankAddress ?? "-"}`, 52, 232, 490, { size: 10 });
  text(doc, `Additional payment instruction / 其他付款说明: ${account.paymentInstructions ?? "-"}`, 52, 258, 490, { size: 10 });
  text(doc, "Authorized Signatory / 授权签字人: ____________________", 52, 760, 260, { size: 10 });
  text(doc, "Date / 日期: ____________________", 330, 760, 210, { size: 10 });
  return streamPdf(doc);
}

export function buildBusinessServiceReportPdf(account: BusinessAccount, item: BusinessMonthlyDocument) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  drawHeader(doc, "MONTHLY SERVICE REPORT", "月度服务报告");

  sectionTitle(doc, "Report Summary / 报告概要", 116);
  row(doc, "Reporting Period / 报告期间", item.monthKey, 52, 154);
  row(doc, "Agreement Reference / 协议依据", account.agreementTitle ?? "Intercompany Services Agreement", 310, 154);
  row(doc, "Service Provider / 服务提供方", "GT Educational Institute Pte Ltd", 52, 198);
  row(doc, "Service Recipient / 服务接受方", `${account.legalNameEn} / ${account.legalNameZh}`, 310, 198);

  sectionTitle(doc, "Services Performed / 已提供服务", 268);
  text(doc, item.serviceSummary, 52, 306, 490, { size: 10 });
  row(doc, "Platforms, systems, or tools used / 使用的平台、系统或工具", item.platformsUsed, 52, 380, 490);
  row(doc, "Personnel involved / 参与人员", item.personnelInvolved, 52, 432, 490);

  sectionTitle(doc, "Benefit to Party A / 甲方受益说明", 494);
  text(doc, item.benefitSummary, 52, 532, 490, { size: 10 });

  sectionTitle(doc, "Cost and Pricing Summary / 成本与定价汇总", 604);
  row(doc, "Tutor fees and directly attributable support costs / 导师费用及支持成本", item.tutorCostSummary, 52, 642, 490);
  row(doc, "Fixed monthly corporate services fee / 固定月度企业服务费", money(item.fixedMonthlyFee), 52, 708);
  row(doc, "Variable monthly tutor fee / 浮动月度导师费用", money(item.variableTutorFee), 310, 708);
  row(doc, "Total service fee / 服务费合计", money(item.totalAmount), 52, 752);
  text(doc, "Prepared by / 编制人: ____________________", 52, 800, 220, { size: 10 });
  text(doc, "Reviewed by / 复核人: ____________________", 310, 800, 230, { size: 10 });
  return streamPdf(doc);
}

export function buildBusinessReceiptPdf(account: BusinessAccount, item: BusinessMonthlyDocument) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  drawHeader(doc, "BUSINESS RECEIPT", "企业收据");

  sectionTitle(doc, "Receipt Details / 收据信息", 116);
  row(doc, "Receipt No. / 收据编号", item.receiptNo ?? "-", 52, 154);
  row(doc, "Invoice No. / 发票编号", item.invoiceNo, 310, 154);
  row(doc, "Payment Date / 付款日期", item.paidDate ?? "-", 52, 198);
  row(doc, "Paid via / 付款方式", item.paymentMethod ?? paymentMethodLabel(account.paymentMethod), 310, 198);
  row(doc, "Received From / 收款对象", item.receivedFrom ?? account.legalNameEn, 52, 242);
  row(doc, "Payment Reference / 付款备注", item.paymentReference ?? "-", 310, 242);
  row(doc, "Billing Period / 结算期间", item.monthKey, 52, 284);

  sectionTitle(doc, "Received From / 付款方", 312);
  row(doc, "English name / 英文名称", account.legalNameEn, 52, 350, 503);
  row(doc, "Chinese name / 中文名称", account.legalNameZh, 52, 392);
  row(doc, "Registration No. / 注册号", account.registrationNo || "-", 310, 392);

  sectionTitle(doc, "Amount Received / 收款金额", 462);
  row(doc, "Invoice total / 发票金额", money(item.totalAmount), 52, 500);
  row(doc, "Amount received / 已收金额", money(item.paidAmount ?? item.totalAmount), 310, 500);
  row(doc, "Payment note / 收款备注", item.paymentNote ?? "-", 52, 548, 503);

  text(doc, "This receipt confirms payment received for the business invoice above. / 本收据确认已收到上述企业发票对应款项。", 52, 650, 490, {
    size: 10,
    color: MUTED,
  });
  text(doc, "Issued by / 开具方: GT Educational Institute Pte Ltd", 52, 720, 490, { size: 10 });
  text(doc, "Authorized Signatory / 授权签字人: ____________________", 52, 780, 260, { size: 10 });
  text(doc, "Date / 日期: ____________________", 330, 780, 210, { size: 10 });
  return streamPdf(doc);
}

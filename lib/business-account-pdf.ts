import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import type { BusinessAccount, BusinessMonthlyDocument } from "@/lib/business-accounts";

type PDFDoc = InstanceType<typeof PDFDocument>;

const BLUE = "#2563eb";
const ORANGE = "#f97316";
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

function templateText(
  doc: PDFDoc,
  str: string,
  x: number,
  y: number,
  size = 10,
  bold = false,
  color = "#111827",
  width?: number,
  align: "left" | "right" | "center" = "left",
  lineBreak = false,
) {
  if (bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fillColor(color).fontSize(size).text(str, x, y, { width, align, lineBreak });
}

function drawInvoiceOrReceiptFrame(doc: PDFDoc, title: "INVOICE" | "RECEIPT") {
  const x = 16;
  const y = 16;
  const w = 554;
  const h = 520;
  doc.lineWidth(1).strokeColor("#111827").rect(x, y, w, h).stroke();
  try {
    doc.image(LOGO_PATH, x + 14, y + 10, { width: 155 });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, x + 14, y + 10, { width: 155 });
    } catch {}
  }
  templateText(doc, title, x + w - 180, y + 18, 30, true, ORANGE, 165, "right");
  const companyY = y + 78;
  const leftInfoW = 332;
  templateText(doc, "Company:  GT Educational Institute Pte. Ltd.", x + 8, companyY, 9, true, "#111827", leftInfoW);
  templateText(doc, "Address:  150 Orchard Road, #08-15, Orchard Plaza, Singapore 238841", x + 8, companyY + 20, 9, true, "#111827", leftInfoW);
  templateText(doc, "Phone:  (65) 80421572", x + 8, companyY + 40, 9, true, "#111827", leftInfoW);
  templateText(doc, "Email:  contact.greatthinkers@gmail.com", x + 8, companyY + 60, 9, true, "#111827", leftInfoW);
  templateText(doc, "Company Reg No. 202303312G", x + 8, companyY + 80, 9, true, "#111827", leftInfoW);
  return { x, y, w, h, companyY };
}

export function buildBusinessInvoicePdf(account: BusinessAccount, item: BusinessMonthlyDocument) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  const { x, y, w, h, companyY } = drawInvoiceOrReceiptFrame(doc, "INVOICE");
  const rightPadding = 12;
  const rightValueW = 96;
  const rightGap = 4;
  const rightLabelW = 96;
  const rightValueX = x + w - rightPadding - rightValueW;
  const rightLabelX = rightValueX - rightGap - rightLabelW;
  const rightY = companyY - 2;
  const rightRows: Array<[string, string]> = [
    ["Invoice Date", item.issueDate],
    ["Invoice No.", item.invoiceNo],
    ["Payment Terms", account.paymentTerms || "Immediate"],
    ["Due Date", item.dueDate],
    ["Billing Month", item.monthKey],
    ["Agreement", account.agreementTitle ?? "-"],
  ];
  rightRows.forEach((r, i) => {
    const yy = rightY + i * 21;
    templateText(doc, r[0], rightLabelX, yy, 10, true, "#111827", rightLabelW, "right");
    templateText(doc, r[1], rightValueX, yy, 9, false, "#111827", rightValueW, "right");
  });

  const billY = y + 180;
  doc.fillColor(ORANGE).rect(x, billY, w, 18).fill();
  templateText(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
  templateText(doc, `Customer Name   ${account.legalNameEn}`, x + 8, billY + 36, 10, true);
  templateText(doc, `Registration No.   ${account.registrationNo || "-"}`, x + 8, billY + 56, 9, false, "#111827", 500);

  const tableY = y + 258;
  const colX = [x + 16, x + 76, x + 274, x + 354, x + 432];
  templateText(doc, "Quantity", colX[0], tableY, 10, true);
  templateText(doc, "Description", colX[1], tableY, 10, true);
  templateText(doc, "Amount", colX[2], tableY, 10, true);
  templateText(doc, "GST", colX[3], tableY, 10, true);
  templateText(doc, "Total Amount", colX[4], tableY, 10, true);

  const rowY = tableY + 24;
  templateText(doc, "1", colX[0] + 16, rowY, 10);
  templateText(doc, `Corporate service fee for ${item.monthKey}`, colX[1], rowY, 10, false, "#111827", 196, "left", true);
  templateText(doc, money(item.totalAmount), colX[2], rowY, 10);
  templateText(doc, money(0), colX[3], rowY, 10);
  templateText(doc, money(item.totalAmount), colX[4], rowY, 10);

  const totalBoxX = x + 338;
  const totalBoxY = y + 442;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(item.totalAmount)],
    ["GST Total", money(0)],
    ["Amount Due", money(item.totalAmount)],
  ];
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    templateText(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", 92, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + 94, yy, 84, 24).fill();
    templateText(doc, r[1], totalBoxX + 98, yy + 5, 9, false, "#111827", 76, "right");
  });

  const noteY = y + h + 18;
  templateText(doc, "Please note that all remittance fees and charges must be borne by the Payer.", x + 4, noteY, 10, true);
  templateText(doc, "Your invoice number serves as the bank transfer/wire reference number.", x + 4, noteY + 18, 10, true);
  templateText(doc, "All payments must be made in Singapore dollars.", x + 4, noteY + 36, 10, true);
  templateText(doc, 'Please e-mail remittance advice to "sggreatthinker@gmail.com".', x + 4, noteY + 54, 10, true);
  templateText(doc, `Account name: ${account.payeeName ?? "GT Educational Institute Pte. Ltd."}`, x + 4, noteY + 94, 10);
  templateText(doc, `Bankname: ${account.bankName ?? "-"}`, x + 4, noteY + 112, 10);
  templateText(doc, `Bankaddress: ${account.bankAddress ?? "-"}`, x + 4, noteY + 130, 10);
  templateText(doc, `Account number: ${account.bankAccountNo ?? "-"}`, x + 4, noteY + 148, 10);
  templateText(doc, `Swift code: ${account.bankSwiftCode ?? "-"}`, x + 4, noteY + 166, 10);
  templateText(doc, "Currency: SGD", x + 4, noteY + 184, 10);
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
  const { x, y, w, companyY } = drawInvoiceOrReceiptFrame(doc, "RECEIPT");
  const rightPadding = 12;
  const rightValueW = 96;
  const rightGap = 4;
  const rightLabelW = 96;
  const rightValueX = x + w - rightPadding - rightValueW;
  const rightLabelX = rightValueX - rightGap - rightLabelW;
  const rightY = companyY - 2;
  const rightRows: Array<[string, string]> = [
    ["Receipt Date", item.paidDate ?? "-"],
    ["Receipt No.", item.receiptNo ?? "-"],
    ["Invoice No.", item.invoiceNo],
    ["Paid By", item.paymentMethod ?? paymentMethodLabel(account.paymentMethod)],
    ["Billing Month", item.monthKey],
  ];
  rightRows.forEach((r, i) => {
    const yy = rightY + i * 21;
    templateText(doc, r[0], rightLabelX, yy, 10, true, "#111827", rightLabelW, "right");
    templateText(doc, r[1], rightValueX, yy, 9, false, "#111827", rightValueW, "right");
  });

  const billY = y + 180;
  doc.fillColor(ORANGE).rect(x, billY, w, 18).fill();
  templateText(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
  templateText(doc, `Received From :   ${item.receivedFrom ?? account.legalNameEn}`, x + 8, billY + 36, 10, true);

  const tableY = y + 258;
  const colX = [x + 16, x + 76, x + 274, x + 354, x + 432];
  templateText(doc, "Quantity", colX[0], tableY, 10, true);
  templateText(doc, "Description", colX[1], tableY, 10, true);
  templateText(doc, "Amount", colX[2], tableY, 10, true);
  templateText(doc, "GST", colX[3], tableY, 10, true);
  templateText(doc, "Total Amount", colX[4], tableY, 10, true);

  const rowY = tableY + 24;
  templateText(doc, "1", colX[0] + 16, rowY, 10);
  templateText(doc, `Corporate service fee for ${item.monthKey}`, colX[1], rowY, 10, false, "#111827", 196, "left", true);
  templateText(doc, money(item.totalAmount), colX[2], rowY, 10);
  templateText(doc, money(0), colX[3], rowY, 10);
  templateText(doc, money(item.totalAmount), colX[4], rowY, 10);

  const totalBoxX = x + 338;
  const totalBoxY = y + 442;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(item.totalAmount)],
    ["GST Total", money(0)],
    ["Amount Received", money(item.paidAmount ?? item.totalAmount)],
  ];
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    templateText(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", 92, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + 94, yy, 84, 24).fill();
    templateText(doc, r[1], totalBoxX + 98, yy + 5, 9, false, "#111827", 76, "right");
  });
  return streamPdf(doc);
}

import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { prisma } from "@/lib/prisma";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { normalizeDateOnly } from "@/lib/date-only";
import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { isReceiptFinanceApproved } from "@/lib/receipt-approval-policy";
import { getParentInvoiceById, getParentReceiptById, type ParentInvoiceItem, type ParentReceiptItem } from "@/lib/student-parent-billing";

type PDFDoc = InstanceType<typeof PDFDocument>;

const ORANGE = "#f97316";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function fmtDate(input: string | Date | null | undefined) {
  return normalizeDateOnly(input) ?? "-";
}

function money(n: number) {
  return `SGD ${Number(n || 0).toFixed(2)}`;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function text(
  doc: PDFDoc,
  str: string,
  x: number,
  y: number,
  size = 10,
  bold = false,
  color = "#111827",
  width?: number,
  align: "left" | "right" | "center" = "left"
) {
  if (bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fillColor(color).fontSize(size);
  doc.text(str, x, y, { width, align, lineBreak: false });
}

function drawHeader(doc: PDFDoc, title: string) {
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
  text(doc, title, x + w - 180, y + 18, 30, true, ORANGE, 165, "right");

  const companyY = y + 78;
  const leftInfoW = 332;
  text(doc, "Company:  GT Educational Institute Pte. Ltd.", x + 8, companyY, 9, true, "#111827", leftInfoW);
  text(doc, "Address:  150 Orchard Road, #08-15, Orchard Plaza, Singapore 238841", x + 8, companyY + 20, 9, true, "#111827", leftInfoW);
  text(doc, "Phone:  (65) 80421572", x + 8, companyY + 40, 9, true, "#111827", leftInfoW);
  text(doc, "Email:  contact.greatthinkers@gmail.com", x + 8, companyY + 60, 9, true, "#111827", leftInfoW);
  text(doc, "Company Reg No. 202303312G", x + 8, companyY + 80, 9, true, "#111827", leftInfoW);
}

function drawRightRows(doc: PDFDoc, rows: Array<[string, string]>) {
  const x = 16;
  const w = 554;
  const rightPadding = 12;
  const rightValueW = 96;
  const rightGap = 4;
  const rightLabelW = 96;
  const rightValueX = x + w - rightPadding - rightValueW;
  const rightLabelX = rightValueX - rightGap - rightLabelW;
  const rightY = 92;
  rows.forEach((r, i) => {
    const yy = rightY + i * 21;
    text(doc, r[0], rightLabelX, yy, 10, true, "#111827", rightLabelW, "right");
    text(doc, r[1], rightValueX, yy, 9, false, "#111827", rightValueW, "right");
  });
}

function drawBillingTable(
  doc: PDFDoc,
  data: {
    quantity: string;
    description: string;
    amount: string;
    gst: string;
    total: string;
    finalLabel: string;
    finalValue: string;
  }
) {
  const x = 16;
  const y = 16;
  const tableY = y + 258;
  const colX = [x + 16, x + 76, x + 274, x + 354, x + 432];
  const colW = [58, 196, 80, 78, 122];
  text(doc, "Quantity", colX[0], tableY, 10, true);
  text(doc, "Description", colX[1], tableY, 10, true);
  text(doc, "Amount", colX[2], tableY, 10, true);
  text(doc, "GST", colX[3], tableY, 10, true);
  text(doc, "Total Amount", colX[4], tableY, 10, true);

  const rowY = tableY + 24;
  text(doc, data.quantity, colX[0] + 16, rowY, 10);
  text(doc, data.description, colX[1], rowY, 10, false, "#111827", colW[1]);
  text(doc, data.amount, colX[2], rowY, 10);
  text(doc, data.gst, colX[3], rowY, 10);
  text(doc, data.total, colX[4], rowY, 10);

  const totalBoxX = x + 338;
  const totalBoxY = y + 442;
  const totalLabelW = 94;
  const totalValueW = 84;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", data.amount],
    ["GST Total", data.gst],
    [data.finalLabel, data.finalValue],
  ];
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    text(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", totalLabelW - 2, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + totalLabelW, yy, totalValueW, 24).fill();
    text(doc, r[1], totalBoxX + totalLabelW + 4, yy + 5, 9, false, "#111827", totalValueW - 8, "right");
  });
}

function pdfResponse(doc: PDFDoc, fileName: string) {
  const stream = streamPdf(doc);
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

export async function getParentInvoicePdfContext(invoiceId: string) {
  const invoice = await getParentInvoiceById(invoiceId);
  if (!invoice) return null;
  const pkg = await prisma.coursePackage.findUnique({
    where: { id: invoice.packageId },
    include: { student: true, course: true },
  });
  if (!pkg) return null;
  return { invoice, pkg };
}

export async function getParentReceiptPdfContext(receiptId: string) {
  const receipt = await getParentReceiptById(receiptId);
  if (!receipt) return null;
  const pkg = await prisma.coursePackage.findUnique({
    where: { id: receipt.packageId },
    include: { student: true, course: true },
  });
  if (!pkg) return null;
  const [cfg, approvalMap, linkedInvoice] = await Promise.all([
    getApprovalRoleConfig(),
    getParentReceiptApprovalMap([receiptId]),
    receipt.invoiceId ? getParentInvoiceById(receipt.invoiceId) : Promise.resolve(null),
  ]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  return {
    receipt,
    pkg,
    linkedInvoice,
    financeReady: isReceiptFinanceApproved(approval, cfg),
  };
}

export function buildParentInvoicePdfResponse(invoice: ParentInvoiceItem, pkg: NonNullable<Awaited<ReturnType<typeof getParentInvoicePdfContext>>>["pkg"]) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  drawHeader(doc, "INVOICE");
  drawRightRows(doc, [
    ["Invoice Date", fmtDate(invoice.issueDate)],
    ["Invoice No.", invoice.invoiceNo],
    ["Payment Terms", invoice.paymentTerms || "Immediate"],
    ["Due Date", fmtDate(invoice.dueDate)],
    ["Course Start Date", fmtDate(invoice.courseStartDate)],
    ["Course End Date", fmtDate(invoice.courseEndDate)],
  ]);

  const x = 16;
  const billY = 196;
  doc.fillColor(ORANGE).rect(x, billY, 554, 18).fill();
  text(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
  text(doc, `Invoice To:   ${invoice.billTo || pkg.student.name || "XXXXXX"}`, x + 8, billY + 36, 10, true);

  drawBillingTable(doc, {
    quantity: String(Math.max(1, Math.floor(invoice.quantity || 1))),
    description: invoice.description || `Course Fees for ${pkg.student.name} (${Math.floor((pkg.totalMinutes ?? 0) / 60)} hours)`,
    amount: money(invoice.amount),
    gst: money(invoice.gstAmount),
    total: money(invoice.totalAmount),
    finalLabel: "Amount Due",
    finalValue: money(invoice.totalAmount),
  });

  const noteY = 554;
  text(doc, "Please note that all remittance fees and charges must be borne by the Payer.", x + 4, noteY, 10, true);
  text(doc, "Your invoice number serves as the bank transfer/wire reference number.", x + 4, noteY + 18, 10, true);
  text(doc, "All payments must be made in Singapore dollars.", x + 4, noteY + 36, 10, true);
  text(doc, 'Please e-mail remittance advice to "sggreatthinker@gmail.com".', x + 4, noteY + 54, 10, true);
  text(doc, "Account name: GT Educational Institute Pte. Ltd.", x + 4, noteY + 94, 10);
  text(doc, "Bankname: OCBC Bank Singapore", x + 4, noteY + 112, 10);
  text(doc, "Bankaddress: 65 Chulia Street #01-40 OCBC Centre Singapore, S049513", x + 4, noteY + 130, 10);
  text(doc, "Account number: 595214891001", x + 4, noteY + 148, 10);
  text(doc, "Swift code: OCBCSGSG", x + 4, noteY + 166, 10);
  text(doc, "Currency: SGD", x + 4, noteY + 184, 10);

  return pdfResponse(doc, `invoice_${safeName(invoice.invoiceNo)}_${safeName(pkg.student.name)}.pdf`);
}

export function buildParentReceiptPdfResponse(
  receipt: ParentReceiptItem,
  pkg: NonNullable<Awaited<ReturnType<typeof getParentReceiptPdfContext>>>["pkg"],
  linkedInvoice: ParentInvoiceItem | null
) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  drawHeader(doc, "RECEIPT");
  drawRightRows(doc, [
    ["Receipt Date", fmtDate(receipt.receiptDate)],
    ["Receipt No.", receipt.receiptNo],
    ["Invoice No.", linkedInvoice?.invoiceNo ?? "-"],
    ["Paid By", receipt.paidBy || "Cash or Bank Transfer"],
    ["Course Start Date", fmtDate(linkedInvoice?.courseStartDate ?? null)],
    ["Course End Date", fmtDate(linkedInvoice?.courseEndDate ?? null)],
  ]);

  const x = 16;
  const billY = 196;
  doc.fillColor(ORANGE).rect(x, billY, 554, 18).fill();
  text(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
  text(doc, `Received From :   ${receipt.receivedFrom || pkg.student.name || "XXXXXX"}`, x + 8, billY + 36, 10, true);

  drawBillingTable(doc, {
    quantity: String(Math.max(1, Math.floor(receipt.quantity || 1))),
    description: receipt.description || `Course fee for ${pkg.student.name}`,
    amount: money(receipt.amount),
    gst: money(receipt.gstAmount),
    total: money(receipt.totalAmount),
    finalLabel: "Amount Received",
    finalValue: money(receipt.amountReceived),
  });

  return pdfResponse(doc, `receipt_${safeName(receipt.receiptNo)}_${safeName(pkg.student.name)}.pdf`);
}

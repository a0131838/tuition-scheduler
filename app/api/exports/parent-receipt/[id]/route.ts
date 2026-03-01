import { requireAdmin } from "@/lib/auth";
import { getParentInvoiceById, getParentPaymentRecordById, getParentReceiptById } from "@/lib/student-parent-billing";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";

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
  if (!input) return "-";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(+d)) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function money(n: number) {
  return `SGD ${Number(n || 0).toFixed(2)}`;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function text(doc: PDFDoc, str: string, x: number, y: number, size = 10, bold = false, color = "#111827", width?: number, align: "left" | "right" | "center" = "left") {
  if (bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fillColor(color).fontSize(size);
  doc.text(str, x, y, { width, align, lineBreak: false });
}

function drawTemplate(doc: PDFDoc, data: {
  receiptNo: string;
  receiptDate: string;
  invoiceNo: string;
  courseStartDate: string;
  courseEndDate: string;
  receivedFrom: string;
  paidBy: string;
  quantity: string;
  description: string;
  amount: string;
  gst: string;
  total: string;
  amountReceived: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNo: string;
}) {
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
  text(doc, "RECEIPT", x + w - 180, y + 18, 30, true, ORANGE, 165, "right");

  const companyY = y + 78;
  const leftInfoW = 332;
  text(doc, "Company:  Reshape Great Thinkers Pte. Ltd", x + 8, companyY, 9, true, "#111827", leftInfoW, "left");
  text(doc, "Address:  150 Orchard Road, #08-15, Orchard Plaza, Singapore 238841", x + 8, companyY + 20, 9, true, "#111827", leftInfoW, "left");
  text(doc, "Phone:  (65) 80421572", x + 8, companyY + 40, 9, true, "#111827", leftInfoW, "left");
  text(doc, "Email:  contact.greatthinkers@gmail.com", x + 8, companyY + 60, 9, true, "#111827", leftInfoW, "left");
  text(doc, "Company Reg No. 202303312G", x + 8, companyY + 80, 9, true, "#111827", leftInfoW, "left");

  const rightPadding = 12;
  const rightValueW = 96;
  const rightGap = 4;
  const rightLabelW = 96;
  const rightValueX = x + w - rightPadding - rightValueW;
  const rightLabelX = rightValueX - rightGap - rightLabelW;
  const rightY = companyY - 2;
  const rightRows: Array<[string, string]> = [
    ["Receipt Date", data.receiptDate],
    ["Receipt No.", data.receiptNo],
    ["Invoice No.", data.invoiceNo],
    ["Paid By", data.paidBy],
    ["Course Start Date", data.courseStartDate],
    ["Course End Date", data.courseEndDate],
  ];
  rightRows.forEach((r, i) => {
    const yy = rightY + i * 21;
    text(doc, r[0], rightLabelX, yy, 10, true, "#111827", rightLabelW, "right");
    text(doc, r[1], rightValueX, yy, 9, false, "#111827", rightValueW, "right");
  });

  const billY = y + 180;
  doc.fillColor(ORANGE).rect(x, billY, w, 18).fill();
  text(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
  text(doc, `Received From :   ${data.receivedFrom}`, x + 8, billY + 36, 10, true);

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
    ["Amount Received", data.amountReceived],
  ];
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    text(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", totalLabelW - 2, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + totalLabelW, yy, totalValueW, 24).fill();
    text(doc, r[1], totalBoxX + totalLabelW + 4, yy + 5, 9, false, "#111827", totalValueW - 8, "right");
  });

  const noteY = y + h + 18;
  text(doc, "Please note that all remittance fees and charges must be borne by the Payer.", x + 4, noteY, 10, true);
  text(doc, "Your invoice number serves as the bank transfer/wire reference number.", x + 4, noteY + 18, 10, true);
  text(doc, "All payments must be made in Singapore dollars.", x + 4, noteY + 36, 10, true);
  text(doc, 'Please e-mail remittance advice to "sggreatthinker@gmail.com".', x + 4, noteY + 54, 10, true);

  text(doc, "Account name: Reshape Great Thinkers Pte Ltd.", x + 4, noteY + 94, 10);
  text(doc, "Bankname: OCBC Bank Singapore", x + 4, noteY + 112, 10);
  text(doc, "Bankaddress: 65 Chulia Street #01-40 OCBC Centre Singapore, S049513", x + 4, noteY + 130, 10);
  text(doc, "Account number: 595214891001", x + 4, noteY + 148, 10);
  text(doc, "Swift code: OCBCSGSG", x + 4, noteY + 166, 10);
  text(doc, "Currency: SGD", x + 4, noteY + 184, 10);

  text(doc, `Payment Date: ${data.paymentDate}`, x + 320, noteY + 94, 10, true);
  text(doc, `Payment Method: ${data.paymentMethod}`, x + 320, noteY + 112, 10, true);
  text(doc, `Reference No.: ${data.referenceNo}`, x + 320, noteY + 130, 10, true);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const receipt = await getParentReceiptById(id);
  if (!receipt) return new Response("Receipt not found", { status: 404 });

  const [cfg, approvalMap] = await Promise.all([
    getApprovalRoleConfig(),
    getParentReceiptApprovalMap([id]),
  ]);
  const approval = approvalMap.get(id) ?? {
    managerApprovedBy: [],
    financeApprovedBy: [],
  };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, cfg.financeApproverEmails);
  if (!(managerReady && financeReady)) {
    return new Response("Receipt export requires manager and finance approvals", { status: 403 });
  }

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: receipt.packageId },
    include: { student: true, course: true },
  });
  if (!pkg) return new Response("Package not found", { status: 404 });
  const [linkedInvoice, paymentRecord] = await Promise.all([
    receipt.invoiceId ? getParentInvoiceById(receipt.invoiceId) : Promise.resolve(null),
    receipt.paymentRecordId ? getParentPaymentRecordById(receipt.paymentRecordId) : Promise.resolve(null),
  ]);

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);

  drawTemplate(doc, {
    receiptNo: receipt.receiptNo,
    receiptDate: fmtDate(receipt.receiptDate),
    invoiceNo: linkedInvoice?.invoiceNo ?? "-",
    courseStartDate: fmtDate(linkedInvoice?.courseStartDate ?? null),
    courseEndDate: fmtDate(linkedInvoice?.courseEndDate ?? null),
    receivedFrom: receipt.receivedFrom || pkg.student.name || "XXXXXX",
    paidBy: receipt.paidBy || "Cash or Bank Transfer",
    quantity: String(Math.max(1, Math.floor(receipt.quantity || 1))),
    description: receipt.description || `Course fee for ${pkg.student.name}`,
    amount: money(receipt.amount),
    gst: money(receipt.gstAmount),
    total: money(receipt.totalAmount),
    amountReceived: money(receipt.amountReceived),
    paymentDate: fmtDate(paymentRecord?.paymentDate ?? null),
    paymentMethod: paymentRecord?.paymentMethod || receipt.paidBy || "-",
    referenceNo: paymentRecord?.referenceNo || "-",
  });

  const stream = streamPdf(doc);
  const fileName = `receipt_${safeName(receipt.receiptNo)}_${safeName(pkg.student.name)}.pdf`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

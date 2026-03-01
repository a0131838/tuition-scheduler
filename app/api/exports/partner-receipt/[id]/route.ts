import { requireAdmin } from "@/lib/auth";
import { getPartnerInvoiceById, getPartnerReceiptById } from "@/lib/partner-billing";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";

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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const receipt = await getPartnerReceiptById(id);
  if (!receipt) return new Response("Receipt not found", { status: 404 });

  const [cfg, approvalMap] = await Promise.all([
    getApprovalRoleConfig(),
    getPartnerReceiptApprovalMap([id]),
  ]);
  const approval = approvalMap.get(id) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, cfg.financeApproverEmails);
  if (!(managerReady && financeReady)) {
    return new Response("Receipt export requires manager and finance approvals", { status: 403 });
  }

  const invoice = await getPartnerInvoiceById(receipt.invoiceId);
  if (!invoice) return new Response("Linked invoice not found", { status: 404 });

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);

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
    ["Receipt Date", fmtDate(receipt.receiptDate)],
    ["Receipt No.", receipt.receiptNo],
    ["Invoice No.", invoice.invoiceNo],
    ["Paid By", receipt.paidBy],
    ["Mode", invoice.mode === "ONLINE_PACKAGE_END" ? "Online" : "Offline"],
    ["Month", invoice.monthKey ?? "-"],
  ];
  rightRows.forEach((r, i) => {
    const yy = rightY + i * 21;
    text(doc, r[0], rightLabelX, yy, 10, true, "#111827", rightLabelW, "right");
    text(doc, r[1], rightValueX, yy, 9, false, "#111827", rightValueW, "right");
  });

  const billY = y + 180;
  doc.fillColor(ORANGE).rect(x, billY, w, 18).fill();
  text(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
  text(doc, `Received From :   ${receipt.receivedFrom}`, x + 8, billY + 36, 10, true);

  const tableY = y + 258;
  const colX = [x + 16, x + 76, x + 274, x + 354, x + 432];
  const colW = [58, 196, 80, 78, 122];
  text(doc, "Quantity", colX[0], tableY, 10, true);
  text(doc, "Description", colX[1], tableY, 10, true);
  text(doc, "Amount", colX[2], tableY, 10, true);
  text(doc, "GST", colX[3], tableY, 10, true);
  text(doc, "Total Amount", colX[4], tableY, 10, true);

  const rowY = tableY + 24;
  text(doc, String(Math.max(1, Math.floor(receipt.quantity || 1))), colX[0] + 16, rowY, 10);
  text(doc, receipt.description, colX[1], rowY, 10, false, "#111827", colW[1]);
  text(doc, money(receipt.amount), colX[2], rowY, 10);
  text(doc, money(receipt.gstAmount), colX[3], rowY, 10);
  text(doc, money(receipt.totalAmount), colX[4], rowY, 10);

  const totalBoxX = x + 338;
  const totalBoxY = y + 442;
  const totalLabelW = 94;
  const totalValueW = 84;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(receipt.amount)],
    ["GST Total", money(receipt.gstAmount)],
    ["Amount Received", money(receipt.amountReceived)],
  ];
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    text(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", totalLabelW - 2, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + totalLabelW, yy, totalValueW, 24).fill();
    text(doc, r[1], totalBoxX + totalLabelW + 4, yy + 5, 9, false, "#111827", totalValueW - 8, "right");
  });

  const stream = streamPdf(doc);
  const fileName = `partner_receipt_${safeName(receipt.receiptNo)}.pdf`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

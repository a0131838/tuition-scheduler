import { requireAdmin } from "@/lib/auth";
import { getPartnerInvoiceById } from "@/lib/partner-billing";
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
  const invoice = await getPartnerInvoiceById(id);
  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);

  const x = 16;
  const y = 16;
  const w = 554;
  const h = 780;
  doc.lineWidth(1).strokeColor("#111827").rect(x, y, w, h).stroke();

  try {
    doc.image(LOGO_PATH, x + 14, y + 10, { width: 155 });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, x + 14, y + 10, { width: 155 });
    } catch {}
  }
  text(doc, "INVOICE", x + w - 180, y + 18, 30, true, ORANGE, 165, "right");

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
    ["Invoice Date", fmtDate(invoice.issueDate)],
    ["Invoice No.", invoice.invoiceNo],
    ["Payment Terms", invoice.paymentTerms || "Immediate"],
    ["Due Date", fmtDate(invoice.dueDate)],
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
  text(doc, `Invoice To:   ${invoice.billTo || invoice.partnerName}`, x + 8, billY + 36, 10, true);

  const tableY = y + 258;
  const colX = [x + 10, x + 54, x + 292, x + 372, x + 450];
  const colW = [42, 236, 78, 78, 96];
  text(doc, "Qty", colX[0], tableY, 10, true);
  text(doc, "Description", colX[1], tableY, 10, true);
  text(doc, "Amount", colX[2], tableY, 10, true);
  text(doc, "GST", colX[3], tableY, 10, true);
  text(doc, "Total", colX[4], tableY, 10, true);

  const maxRows = 12;
  const lines = invoice.lines.slice(0, maxRows);
  lines.forEach((line, idx) => {
    const yy = tableY + 24 + idx * 22;
    text(doc, String(Math.max(1, Math.floor(line.quantity || 1))), colX[0] + 8, yy, 9);
    text(doc, line.description, colX[1], yy, 9, false, "#111827", colW[1]);
    text(doc, money(line.amount), colX[2], yy, 9);
    text(doc, money(line.gstAmount), colX[3], yy, 9);
    text(doc, money(line.totalAmount), colX[4], yy, 9);
  });
  if (invoice.lines.length > maxRows) {
    const yy = tableY + 24 + maxRows * 22;
    text(doc, `... and ${invoice.lines.length - maxRows} more items`, colX[1], yy, 9, false, "#6b7280", 220);
  }

  const totalBoxX = x + 338;
  const totalBoxY = y + 642;
  const totalLabelW = 94;
  const totalValueW = 84;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(invoice.amount)],
    ["GST Total", money(invoice.gstAmount)],
    ["Amount Due", money(invoice.totalAmount)],
  ];
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    text(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", totalLabelW - 2, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + totalLabelW, yy, totalValueW, 24).fill();
    text(doc, r[1], totalBoxX + totalLabelW + 4, yy + 5, 9, false, "#111827", totalValueW - 8, "right");
  });

  const stream = streamPdf(doc);
  const fileName = `partner_invoice_${safeName(invoice.invoiceNo)}.pdf`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

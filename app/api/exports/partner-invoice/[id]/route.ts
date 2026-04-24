import { requireAdmin } from "@/lib/auth";
import { getPartnerInvoiceById } from "@/lib/partner-billing";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { normalizeDateOnly } from "@/lib/date-only";

type PDFDoc = InstanceType<typeof PDFDocument>;

const ORANGE = "#f97316";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");
const SEAL_PATH = path.join(process.cwd(), "public", "reshapeSeal.png");

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

function fmtQty(n: number) {
  const x = Number(n || 0);
  if (!Number.isFinite(x) || x <= 0) return "1";
  return x % 1 === 0 ? String(Math.round(x)) : x.toFixed(2).replace(/\.?0+$/, "");
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function displayPartnerInvoiceLineDescription(description: string) {
  const raw = String(description ?? "").trim();
  if (!raw) return "-";
  const legacyMatch = /^Package settlement\s*-\s*(.+?)\s*-\s*.+$/i.exec(raw);
  if (legacyMatch?.[1]) return legacyMatch[1].trim();
  return raw;
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
  align: "left" | "right" | "center" = "left",
  lineBreak = false
) {
  if (bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fillColor(color).fontSize(size);
  doc.text(str, x, y, { width, align, lineBreak });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const withSeal = new URL(request.url).searchParams.get("seal") === "1";
  const { id } = await params;
  const invoice = await getPartnerInvoiceById(id);
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  const partnerInvoice = invoice;

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);

  const x = 16;
  const y = 16;
  const w = 554;
  const colX = [x + 10, x + 54, x + 292, x + 372, x + 450];
  const colW = [42, 236, 78, 78, 96];
  const pageBottom = 826;
  const notesStartY = 646;
  const tableHeaderGap = 24;
  const continuationTopY = y + 52;
  const totalBoxX = x + 338;
  const totalLabelW = 94;
  const totalValueW = 84;
  const pageInnerBottomPadding = 10;

  function drawPageFrame() {
    doc.lineWidth(1).strokeColor("#111827").rect(x, y, w, pageBottom - y).stroke();
  }

  function drawLogoAndTitle() {
    try {
      doc.image(LOGO_PATH, x + 14, y + 10, { width: 155 });
    } catch {
      try {
        doc.image(LOGO_FALLBACK_PATH, x + 14, y + 10, { width: 155 });
      } catch {}
    }
    text(doc, "INVOICE", x + w - 180, y + 18, 30, true, ORANGE, 165, "right");
  }

  function drawFirstPageHeader() {
    drawPageFrame();
    drawLogoAndTitle();

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
      ["Invoice Date", fmtDate(partnerInvoice.issueDate)],
      ["Invoice No.", partnerInvoice.invoiceNo],
      ["Payment Terms", partnerInvoice.paymentTerms || "Immediate"],
      ["Due Date", fmtDate(partnerInvoice.dueDate)],
      ["Mode", partnerInvoice.mode === "ONLINE_PACKAGE_END" ? "Online" : "Offline"],
      ["Month", partnerInvoice.monthKey ?? "-"],
    ];
    if (partnerInvoice.courseStartDate) rightRows.push(["Course Start", fmtDate(partnerInvoice.courseStartDate)]);
    if (partnerInvoice.courseEndDate) rightRows.push(["Course End", fmtDate(partnerInvoice.courseEndDate)]);
    rightRows.forEach((r, i) => {
      const yy = rightY + i * 21;
      text(doc, r[0], rightLabelX, yy, 10, true, "#111827", rightLabelW, "right");
      text(doc, r[1], rightValueX, yy, 9, false, "#111827", rightValueW, "right");
    });

    const billY = y + 180;
    doc.fillColor(ORANGE).rect(x, billY, w, 18).fill();
    text(doc, "Bill To:", x + 8, billY + 4, 10, true, "#ffffff");
    text(doc, `Customer Name   ${partnerInvoice.billTo || partnerInvoice.partnerName}`, x + 8, billY + 36, 10, true);

    return y + 258;
  }

  function drawContinuationHeader() {
    doc.addPage({ size: "A4", margin: 0 });
    drawPageFrame();
    text(doc, "INVOICE (continued)", x + 12, y + 18, 18, true, ORANGE, 220, "left");
    text(doc, `Invoice No. ${partnerInvoice.invoiceNo}`, x + w - 180, y + 18, 10, true, "#111827", 168, "right");
    text(doc, `Bill To: ${partnerInvoice.billTo || partnerInvoice.partnerName}`, x + 12, y + 42, 10, true, "#111827", 360, "left");
    return continuationTopY;
  }

  function drawTableHeader(tableY: number) {
    text(doc, "Qty", colX[0], tableY, 10, true);
    text(doc, "Description", colX[1], tableY, 10, true);
    text(doc, "Amount", colX[2], tableY, 10, true);
    text(doc, "GST", colX[3], tableY, 10, true);
    text(doc, "Total", colX[4], tableY, 10, true);
    return tableY + tableHeaderGap;
  }

  function rowHeightFor(description: string) {
    setPdfFont(doc);
    doc.fontSize(9);
    const descHeight = doc.heightOfString(description, { width: colW[1], align: "left" });
    return Math.max(22, Math.ceil(descHeight) + 4);
  }

  function renderLineRow(line: (typeof partnerInvoice.lines)[number], yy: number, rowHeight: number) {
    const description = displayPartnerInvoiceLineDescription(line.description);
    text(doc, fmtQty(line.quantity), colX[0] + 8, yy, 9);
    text(doc, description, colX[1], yy, 9, false, "#111827", colW[1], "left", true);
    text(doc, money(line.amount), colX[2], yy, 9);
    text(doc, money(line.gstAmount), colX[3], yy, 9);
    text(doc, money(line.totalAmount), colX[4], yy, 9);
    return yy + rowHeight;
  }

  let currentY = drawTableHeader(drawFirstPageHeader());
  for (const line of partnerInvoice.lines) {
    const description = displayPartnerInvoiceLineDescription(line.description);
    const rowHeight = rowHeightFor(description);
    const needsContinuation = currentY + rowHeight > notesStartY - 12;
    if (needsContinuation) {
      currentY = drawTableHeader(drawContinuationHeader());
    }
    currentY = renderLineRow(line, currentY, rowHeight);
  }

  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(partnerInvoice.amount)],
    ["GST Total", money(partnerInvoice.gstAmount)],
    ["Amount Due", money(partnerInvoice.totalAmount)],
  ];
  const totalsHeight = totalRows.length * 24;
  const noteBlockHeight = 206;
  const finalSectionGap = 16;

  if (currentY + finalSectionGap + totalsHeight + 12 + noteBlockHeight > pageBottom - pageInnerBottomPadding) {
    currentY = drawContinuationHeader();
  }

  const totalBoxY = currentY + finalSectionGap;
  totalRows.forEach((r, i) => {
    const yy = totalBoxY + i * 24;
    text(doc, r[0], totalBoxX, yy + 5, 10, true, "#111827", totalLabelW - 2, "right");
    doc.fillColor("#f3dfd1").rect(totalBoxX + totalLabelW, yy, totalValueW, 24).fill();
    text(doc, r[1], totalBoxX + totalLabelW + 4, yy + 5, 9, false, "#111827", totalValueW - 8, "right");
  });

  const noteY = totalBoxY + totalsHeight + 12;
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
  if (withSeal) {
    try {
      const sealWidth = 118;
      const sealX = totalBoxX - 54;
      const sealY = totalBoxY + 6;
      doc.image(SEAL_PATH, sealX, sealY, { width: sealWidth });
    } catch {}
  }

  const stream = streamPdf(doc);
  const fileName = withSeal
    ? `partner_invoice_${safeName(partnerInvoice.invoiceNo)}_sealed.pdf`
    : `partner_invoice_${safeName(partnerInvoice.invoiceNo)}.pdf`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

import { requireAdmin } from "@/lib/auth";
import { getPartnerCreditNoteById, listPartnerCreditNotes } from "@/lib/partner-credit-notes";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import PDFDocument from "pdfkit";
import path from "path";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

const ACCENT = "#0f766e";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");
const SEAL_PATH = path.join(process.cwd(), "public", "gt_edu_seal.png");
const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";

function text(
  doc: PDFDoc,
  value: string,
  x: number,
  y: number,
  size = 10,
  bold = false,
  color = "#111827",
  width?: number,
  align: "left" | "right" | "center" = "left",
) {
  if (bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fillColor(color).fontSize(size).text(value, x, y, { width, align });
}

function fittedSingleLineText(
  doc: PDFDoc,
  value: string,
  x: number,
  y: number,
  width: number,
  baseSize = 9,
  minSize = 6,
) {
  setPdfFont(doc);
  let size = baseSize;
  doc.fontSize(size);
  while (size > minSize && doc.widthOfString(value) > width) {
    size -= 0.25;
    doc.fontSize(size);
  }
  doc.fillColor("#111827").text(value, x, y, { width, align: "right", lineBreak: false, ellipsis: true });
}

function money(value: unknown) {
  return `SGD ${Number(value ?? 0).toFixed(2)}`;
}

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "FINANCE" && admin.email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return new Response("Forbidden", { status: 403 });
  }
  const withSeal = new URL(request.url).searchParams.get("seal") === "1";
  const { id } = await params;
  const foundNote = await getPartnerCreditNoteById(id);
  if (!foundNote) return new Response("Credit note not found", { status: 404 });
  const note = foundNote;
  if (withSeal && note.status !== "ISSUED") return new Response("Only issued credit notes can be sealed", { status: 409 });

  const relatedNotes = await listPartnerCreditNotes([note.sourceInvoiceId]);
  const issuedCreditTotal = relatedNotes
    .filter((row) => row.status === "ISSUED")
    .reduce((sum, row) => sum + Number(row.totalAmount), 0);
  const projectedCreditTotal = note.status === "DRAFT" ? issuedCreditTotal + Number(note.totalAmount) : issuedCreditTotal;
  const adjustedInvoiceTotal = Math.max(0, Number(note.originalInvoiceTotal) - projectedCreditTotal);

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  setPdfFont(doc);
  const frameX = 16;
  const frameY = 16;
  const frameW = 563;
  const pageBottom = 826;
  const colX = [26, 74, 334, 414, 494];
  const colW = [42, 250, 74, 74, 74];

  function drawFrame() {
    doc.lineWidth(1).strokeColor("#111827").rect(frameX, frameY, frameW, pageBottom - frameY).stroke();
  }

  function drawHeader(firstPage: boolean) {
    if (!firstPage) doc.addPage({ size: "A4", margin: 0 });
    drawFrame();
    try {
      doc.image(LOGO_PATH, frameX + 14, frameY + 10, { width: 155 });
    } catch {
      try { doc.image(LOGO_FALLBACK_PATH, frameX + 14, frameY + 10, { width: 155 }); } catch {}
    }
    text(doc, firstPage ? "CREDIT NOTE" : "CREDIT NOTE (continued)", 330, 34, firstPage ? 27 : 17, true, ACCENT, 230, "right");
    if (note.status !== "ISSUED") {
      text(doc, note.status, 330, 70, 14, true, note.status === "VOID" ? "#991b1b" : "#92400e", 230, "right");
    }
    if (!firstPage) {
      text(doc, `Credit Note No. ${note.creditNoteNo}`, 30, 76, 9, true);
      return 110;
    }

    const companyY = 94;
    text(doc, `Company:  ${note.supplierName}`, 26, companyY, 9, true, "#111827", 320);
    text(doc, `Address:  ${note.supplierAddress}`, 26, companyY + 20, 9, true, "#111827", 320);
    text(doc, `Company Reg No. ${note.supplierRegistrationNo}`, 26, companyY + 40, 9, true, "#111827", 320);
    if (note.supplierGstRegistrationNo) text(doc, `GST Reg No. ${note.supplierGstRegistrationNo}`, 26, companyY + 60, 9, true, "#111827", 320);

    const rightRows: Array<[string, string]> = [
      ["Credit Note Date", note.issueDate],
      ["Credit Note No.", note.creditNoteNo],
      ["Original Invoice", note.sourceInvoiceNo],
      ["Original Invoice Date", note.sourceInvoiceDate],
      ["Currency", note.currency],
    ];
    rightRows.forEach(([label, value], index) => {
      const yy = companyY + index * 20;
      text(doc, label, 330, yy, 9, true, "#111827", 105, "right");
      fittedSingleLineText(doc, value, 440, yy, 120);
    });

    const customerY = 204;
    doc.fillColor(ACCENT).rect(frameX, customerY, frameW, 20).fill();
    text(doc, "Credit To:", 26, customerY + 4, 10, true, "#ffffff");
    text(doc, `Customer Name   ${note.customerName}`, 26, customerY + 34, 10, true, "#111827", 530);
    text(doc, `Customer Address   ${note.customerAddress || "-"}`, 26, customerY + 56, 9, false, "#111827", 530);
    text(doc, "Reason for credit", 26, customerY + 88, 9, true, ACCENT);
    text(doc, note.reason, 26, customerY + 106, 9, false, "#111827", 530);
    return customerY + 154;
  }

  function drawTableHeader(y: number) {
    doc.fillColor("#ecfdf5").rect(24, y - 6, 543, 22).fill();
    text(doc, "Qty", colX[0], y, 9, true);
    text(doc, "Description", colX[1], y, 9, true);
    text(doc, "Amount", colX[2], y, 9, true);
    text(doc, "GST", colX[3], y, 9, true);
    text(doc, "Total", colX[4], y, 9, true);
    return y + 24;
  }

  let currentY = drawTableHeader(drawHeader(true));
  for (const line of note.lines) {
    setPdfFont(doc);
    doc.fontSize(9);
    const rowHeight = Math.max(24, Math.ceil(doc.heightOfString(line.description, { width: colW[1] })) + 6);
    if (currentY + rowHeight > 690) currentY = drawTableHeader(drawHeader(false));
    text(doc, Number(line.quantity).toFixed(2).replace(/\.00$/, ""), colX[0], currentY, 9);
    text(doc, line.description, colX[1], currentY, 9, false, "#111827", colW[1]);
    text(doc, money(line.amount), colX[2], currentY, 8, false, "#111827", colW[2]);
    text(doc, money(line.gstAmount), colX[3], currentY, 8, false, "#111827", colW[3]);
    text(doc, money(line.totalAmount), colX[4], currentY, 8, false, "#111827", colW[4]);
    currentY += rowHeight;
  }

  if (currentY > 620) currentY = drawHeader(false);
  const totalsY = currentY + 18;
  const totals: Array<[string, string]> = [
    ["Credit subtotal", money(note.amount)],
    ["GST credited", money(note.gstAmount)],
    ["This credit note", money(note.totalAmount)],
    ["Original invoice total", money(note.originalInvoiceTotal)],
    [note.status === "DRAFT" ? "Projected adjusted total" : "Adjusted invoice total", money(adjustedInvoiceTotal)],
  ];
  totals.forEach(([label, value], index) => {
    const yy = totalsY + index * 24;
    text(doc, label, 320, yy + 5, 9, true, "#111827", 140, "right");
    doc.fillColor(index === totals.length - 1 ? "#d1fae5" : "#f3f4f6").rect(468, yy, 92, 24).fill();
    text(doc, value, 472, yy + 5, 8, false, "#111827", 84, "right");
  });

  if (withSeal) {
    try { doc.image(SEAL_PATH, 196, totalsY + 6, { fit: [100, 100], align: "center", valign: "center" }); } catch {}
  }
  const footerY = totalsY + totals.length * 24 + 22;
  text(doc, `Status: ${note.status}`, 26, footerY, 9, true, note.status === "VOID" ? "#991b1b" : ACCENT);
  if (note.voidReason) text(doc, `Void reason: ${note.voidReason}`, 26, footerY + 18, 9, true, "#991b1b", 530);
  if (note.status === "DRAFT") text(doc, "DRAFT PREVIEW - NOT ISSUED", 26, footerY + 18, 10, true, "#92400e", 530);
  text(doc, `This credit note refers to original invoice ${note.sourceInvoiceNo} dated ${note.sourceInvoiceDate}.`, 26, footerY + 42, 9, false, "#475569", 530);

  const stream = streamPdf(doc);
  const fileName = `${safeName(note.creditNoteNo)}${withSeal ? "_sealed" : ""}.pdf`;
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

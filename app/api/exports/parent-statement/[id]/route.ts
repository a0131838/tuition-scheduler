import { requireAdmin } from "@/lib/auth";
import { listParentBillingForPackage } from "@/lib/student-parent-billing";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";

type PDFDoc = InstanceType<typeof PDFDocument>;

const BLUE = "#2563eb";
const SOFT_BLUE = "#eff6ff";
const SOFT_GREEN = "#ecfdf5";
const SOFT_ORANGE = "#fff7ed";
const SOFT_SLATE = "#f8fafc";
const BORDER = "#cbd5e1";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");

type StatementTxn = {
  date: string;
  type: "INVOICE" | "RECEIPT";
  refNo: string;
  description: string;
  charge: number;
  payment: number;
  runningBalance: number;
};

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function fmtDate(input: string | Date | null | undefined) {
  return normalizeDateOnly(input) ?? "-";
}

function moneyValue(n: number) {
  return Number(n || 0).toFixed(2);
}

function money(n: number) {
  return `SGD ${moneyValue(n)}`;
}

function drawText(
  doc: PDFDoc,
  str: string,
  x: number,
  y: number,
  opts?: {
    size?: number;
    bold?: boolean;
    color?: string;
    width?: number;
    align?: "left" | "center" | "right";
    lineBreak?: boolean;
  },
) {
  if (opts?.bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fillColor(opts?.color ?? "#0f172a").fontSize(opts?.size ?? 10);
  doc.text(str, x, y, {
    width: opts?.width,
    align: opts?.align ?? "left",
    lineBreak: opts?.lineBreak ?? false,
  });
}

function drawMetricCard(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string, value: string, bg: string) {
  doc.roundedRect(x, y, w, h, 10).fillAndStroke(bg, BORDER);
  drawText(doc, title, x + 10, y + 10, { size: 9, color: "#475569", bold: true });
  drawText(doc, value, x + 10, y + 28, { size: 15, bold: true });
}

function drawTableHeader(doc: PDFDoc, x: number, y: number, widths: number[]) {
  const labels = ["Date", "Type", "Ref No.", "Description", "Charge", "Paid", "Balance"];
  let cursor = x;
  doc.rect(x, y, widths.reduce((sum, w) => sum + w, 0), 20).fillAndStroke("#e2e8f0", BORDER);
  labels.forEach((label, index) => {
    drawText(doc, label, cursor + 4, y + 5, { size: 9, bold: true, width: widths[index] - 8 });
    cursor += widths[index];
  });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: packageId } = await params;

  const [pkg, billing, roleCfg] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: { student: true, course: true },
    }),
    listParentBillingForPackage(packageId),
    getApprovalRoleConfig(),
  ]);

  if (!pkg) return new Response("Package not found", { status: 404 });

  const approvalMap = await getParentReceiptApprovalMap(billing.receipts.map((x) => x.id));
  const approvedReceipts = billing.receipts.filter((receipt) => {
    const approval = approvalMap.get(receipt.id) ?? {
      managerApprovedBy: [],
      financeApprovedBy: [],
    };
    return (
      areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails) &&
      areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails)
    );
  });
  const unapprovedReceipts = billing.receipts.filter((receipt) => !approvedReceipts.some((x) => x.id === receipt.id));
  const invoiceById = new Map(billing.invoices.map((x) => [x.id, x]));

  const txns: StatementTxn[] = [
    ...billing.invoices.map((invoice) => ({
      date: fmtDate(invoice.issueDate),
      type: "INVOICE" as const,
      refNo: invoice.invoiceNo,
      description: invoice.description || `Invoice for ${pkg.student.name}`,
      charge: Number(invoice.totalAmount || 0),
      payment: 0,
      runningBalance: 0,
    })),
    ...approvedReceipts.map((receipt) => ({
      date: fmtDate(receipt.receiptDate),
      type: "RECEIPT" as const,
      refNo: receipt.receiptNo,
      description: receipt.invoiceId
        ? `Approved receipt for ${invoiceById.get(receipt.invoiceId)?.invoiceNo ?? "linked invoice"}`
        : "Approved receipt",
      charge: 0,
      payment: Number(receipt.amountReceived || 0),
      runningBalance: 0,
    })),
  ]
    .sort((a, b) => {
      const dateDiff = +new Date(a.date) - +new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      if (a.type === b.type) return a.refNo.localeCompare(b.refNo);
      return a.type === "INVOICE" ? -1 : 1;
    })
    .map((row) => row);

  let runningBalance = 0;
  for (const row of txns) {
    runningBalance += row.charge;
    runningBalance -= row.payment;
    row.runningBalance = runningBalance;
  }

  const totalInvoiced = billing.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const totalPaid = approvedReceipts.reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0);
  const pendingReceiptAmount = unapprovedReceipts.reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0);
  const balanceOwing = totalInvoiced - totalPaid;

  const doc = new PDFDocument({ size: "A4", margin: 32 });
  setPdfFont(doc);

  const pageWidth = doc.page.width;
  const printableWidth = pageWidth - 64;
  let y = 32;

  try {
    doc.image(LOGO_PATH, 32, y, { width: 120 });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, 32, y, { width: 120 });
    } catch {}
  }

  drawText(doc, "Statement of Account / 对账单", pageWidth - 250, y + 6, {
    width: 218,
    align: "right",
    size: 20,
    bold: true,
    color: BLUE,
  });
  drawText(doc, `Generated / 生成日期: ${formatDateOnly(new Date())}`, pageWidth - 250, y + 34, {
    width: 218,
    align: "right",
    size: 9,
    color: "#475569",
  });
  y += 72;

  doc.roundedRect(32, y, printableWidth, 68, 12).fillAndStroke(SOFT_BLUE, BORDER);
  drawText(doc, "Student / 学生", 44, y + 12, { size: 9, color: "#475569", bold: true });
  drawText(doc, pkg.student.name, 44, y + 30, { size: 14, bold: true });
  drawText(doc, "Course / 课程", 205, y + 12, { size: 9, color: "#475569", bold: true });
  drawText(doc, pkg.course.name, 205, y + 30, { size: 14, bold: true, width: 170 });
  drawText(doc, "Package / 课时包", 394, y + 12, { size: 9, color: "#475569", bold: true });
  drawText(doc, pkg.id, 394, y + 30, { size: 11, bold: true, width: 126 });
  y += 84;

  const metricGap = 10;
  const metricW = (printableWidth - metricGap * 3) / 4;
  drawMetricCard(doc, 32, y, metricW, 58, "Total invoiced / 已开票", money(totalInvoiced), SOFT_SLATE);
  drawMetricCard(doc, 32 + (metricW + metricGap), y, metricW, 58, "Approved paid / 已确认收款", money(totalPaid), SOFT_GREEN);
  drawMetricCard(doc, 32 + (metricW + metricGap) * 2, y, metricW, 58, "Pending receipts / 待确认收据", money(pendingReceiptAmount), SOFT_ORANGE);
  drawMetricCard(doc, 32 + (metricW + metricGap) * 3, y, metricW, 58, "Balance owing / 尚欠金额", money(balanceOwing), balanceOwing > 0.009 ? "#fef2f2" : SOFT_GREEN);
  y += 74;

  drawText(
    doc,
    "This statement shows invoice transactions and approved receipt payments only. Unapproved receipts stay listed below but are not counted as paid yet.",
    32,
    y,
    { size: 9, color: "#475569", width: printableWidth, lineBreak: true },
  );
  y = doc.y + 10;

  drawText(doc, "Transactions / 交易记录", 32, y, { size: 13, bold: true, color: BLUE });
  y += 22;

  const colWidths = [62, 45, 95, 146, 52, 52, 58];
  const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const baseX = 32;

  const ensureSpace = (required: number) => {
    if (y + required <= doc.page.height - 40) return;
    doc.addPage();
    setPdfFont(doc);
    y = 32;
    drawText(doc, "Statement of Account / 对账单", 32, y, { size: 14, bold: true, color: BLUE });
    y += 24;
    drawTableHeader(doc, baseX, y, colWidths);
    y += 20;
  };

  drawTableHeader(doc, baseX, y, colWidths);
  y += 20;

  if (txns.length === 0) {
    doc.rect(baseX, y, tableWidth, 28).stroke(BORDER);
    drawText(doc, "No invoice or approved receipt records yet.", baseX + 8, y + 8, { size: 10, color: "#64748b" });
    y += 36;
  } else {
    for (const row of txns) {
      const descHeight = Math.max(
        16,
        doc.heightOfString(row.description, {
          width: colWidths[3] - 8,
          align: "left",
        }) + 4,
      );
      const rowHeight = Math.max(22, descHeight);
      ensureSpace(rowHeight + 2);
      let x = baseX;
      const values = [
        row.date,
        row.type === "INVOICE" ? "Invoice" : "Receipt",
        row.refNo,
        row.description,
        row.charge > 0 ? moneyValue(row.charge) : "-",
        row.payment > 0 ? moneyValue(row.payment) : "-",
        moneyValue(row.runningBalance),
      ];
      values.forEach((value, index) => {
        doc.rect(x, y, colWidths[index], rowHeight).stroke(BORDER);
        const align = index >= 4 ? "right" : "left";
        drawText(doc, value, x + 4, y + 6, {
          size: 9,
          width: colWidths[index] - 8,
          align,
          lineBreak: true,
        });
        x += colWidths[index];
      });
      y += rowHeight;
    }
  }

  y += 16;
  ensureSpace(72);
  drawText(doc, "Outstanding summary / 欠款摘要", 32, y, { size: 13, bold: true, color: BLUE });
  y += 18;
  drawText(doc, `Total invoiced: ${money(totalInvoiced)}`, 32, y, { size: 10, bold: true });
  drawText(doc, `Approved paid: ${money(totalPaid)}`, 220, y, { size: 10, bold: true });
  drawText(doc, `Balance owing: ${money(balanceOwing)}`, 390, y, { size: 10, bold: true, color: balanceOwing > 0.009 ? "#b91c1c" : "#166534" });
  y += 22;

  if (unapprovedReceipts.length > 0) {
    ensureSpace(52);
    drawText(doc, "Pending receipts not counted yet / 尚未计入已付款的收据", 32, y, { size: 13, bold: true, color: "#b45309" });
    y += 18;
    for (const receipt of unapprovedReceipts) {
      ensureSpace(20);
      const approval = approvalMap.get(receipt.id);
      const status = approval?.managerRejectReason || approval?.financeRejectReason
        ? "Rejected / 已驳回"
        : "Pending approval / 等待审批";
      drawText(
        doc,
        `${fmtDate(receipt.receiptDate)}   ${receipt.receiptNo}   ${money(receipt.amountReceived)}   ${status}`,
        32,
        y,
        { size: 9, width: printableWidth, lineBreak: true, color: "#7c2d12" },
      );
      y = doc.y + 2;
    }
  }

  y += 12;
  ensureSpace(48);
  drawText(
    doc,
    "Internal note: this PDF is a read-only finance statement for one package. It does not change invoice, receipt approval, package balance, or deduction logic.",
    32,
    y,
    { size: 8, color: "#64748b", width: printableWidth, lineBreak: true },
  );

  const stream = streamPdf(doc);
  const fileName = `statement_of_account_${safeName(pkg.student.name)}_${safeName(pkg.id.slice(0, 8))}.pdf`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

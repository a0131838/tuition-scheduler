import { requireAdmin } from "@/lib/auth";
import { listParentBillingForPackage } from "@/lib/student-parent-billing";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getReceiptApprovalStatus } from "@/lib/receipt-approval-policy";

type PDFDoc = InstanceType<typeof PDFDocument>;

const BLUE = "#2563eb";
const SOFT_BLUE = "#eff6ff";
const SOFT_GREEN = "#ecfdf5";
const SOFT_ORANGE = "#fff7ed";
const SOFT_SLATE = "#f8fafc";
const BORDER = "#cbd5e1";
const DARK = "#0f172a";
const MUTED = "#475569";
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

function roundMoney(n: number) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
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
  drawText(doc, title, x + 10, y + 10, { size: 9, color: MUTED, bold: true });
  drawText(doc, value, x + 10, y + 28, { size: 15, bold: true });
}

function drawSectionTitle(doc: PDFDoc, x: number, y: number, width: number, title: string, subtitle?: string) {
  doc.roundedRect(x, y, width, 24, 8).fillAndStroke("#eef2ff", "#bfdbfe");
  drawText(doc, title, x + 10, y + 6, { size: 11, bold: true, color: BLUE });
  if (subtitle) {
    drawText(doc, subtitle, x + width - 180, y + 6, { size: 8, color: MUTED, width: 170, align: "right" });
  }
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
  const invoiceReceiptSummaryMap = new Map(
    billing.invoices.map((invoice) => {
      const linkedReceipts = billing.receipts.filter((receipt) => receipt.invoiceId === invoice.id);
      let approvedAmount = 0;
      let pendingAmount = 0;
      let rejectedAmount = 0;
      for (const receipt of linkedReceipts) {
        const approval = approvalMap.get(receipt.id) ?? {
          managerApprovedBy: [],
          financeApprovedBy: [],
          managerRejectReason: null,
          financeRejectReason: null,
        };
        const amount = roundMoney(receipt.amountReceived || 0);
        const status = getReceiptApprovalStatus(approval, roleCfg);
        if (status === "REJECTED") {
          rejectedAmount += amount;
          continue;
        }
        if (status === "COMPLETED") {
          approvedAmount += amount;
        } else {
          pendingAmount += amount;
        }
      }
      return [
        invoice.id,
        {
          receiptCount: linkedReceipts.length,
          approvedAmount: roundMoney(approvedAmount),
          pendingAmount: roundMoney(pendingAmount),
          rejectedAmount: roundMoney(rejectedAmount),
          remainingApprovedBalance: Math.max(0, roundMoney(invoice.totalAmount - approvedAmount)),
          remainingToCreate: Math.max(0, roundMoney(invoice.totalAmount - linkedReceipts.reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0))),
        },
      ] as const;
    })
  );
  const approvedReceipts = billing.receipts.filter((receipt) => {
    const approval = approvalMap.get(receipt.id) ?? {
      managerApprovedBy: [],
      financeApprovedBy: [],
    };
    return getReceiptApprovalStatus(approval, roleCfg) === "COMPLETED";
  });
  const unapprovedReceipts = billing.receipts.filter((receipt) => !approvedReceipts.some((x) => x.id === receipt.id));
  const invoiceById = new Map(billing.invoices.map((x) => [x.id, x]));
  const sortedInvoiceDates = billing.invoices
    .map((x) => fmtDate(x.issueDate))
    .filter((x) => x !== "-")
    .sort();
  const periodLabel = sortedInvoiceDates.length
    ? `${sortedInvoiceDates[0]} - ${sortedInvoiceDates[sortedInvoiceDates.length - 1]}`
    : "No invoice period";
  const statementNo = `SOA-${pkg.id.slice(0, 8).toUpperCase()}`;

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
  const headerRightX = pageWidth - 250;
  const headerRightW = 218;

  try {
    doc.image(LOGO_PATH, 32, y, { width: 120 });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, 32, y, { width: 120 });
    } catch {}
  }

  const headerTitle = "Statement of Account / 对账单";
  setPdfBoldFont(doc);
  doc.fontSize(21);
  const titleHeight = doc.heightOfString(headerTitle, {
    width: headerRightW,
    align: "right",
  });
  setPdfFont(doc);

  drawText(doc, headerTitle, headerRightX, y + 6, {
    width: headerRightW,
    align: "right",
    size: 21,
    bold: true,
    color: BLUE,
    lineBreak: true,
  });
  const companyY = y + 6 + titleHeight + 6;
  drawText(doc, "Reshape Great Thinkers Pte. Ltd.", headerRightX, companyY, {
    width: headerRightW,
    align: "right",
    size: 9,
    bold: true,
    color: DARK,
  });
  const generatedY = companyY + 14;
  drawText(doc, `Generated / 生成日期: ${formatDateOnly(new Date())}`, headerRightX, generatedY, {
    width: headerRightW,
    align: "right",
    size: 9,
    color: MUTED,
  });
  y = Math.max(y + 64, generatedY + 24);

  doc.roundedRect(32, y, printableWidth, 54, 12).fillAndStroke("#ffffff", BORDER);
  drawText(doc, "Statement No. / 对账单号", 44, y + 10, { size: 8, color: MUTED, bold: true });
  drawText(doc, statementNo, 44, y + 26, { size: 12, bold: true, color: DARK });
  drawText(doc, "Statement period / 对账区间", 210, y + 10, { size: 8, color: MUTED, bold: true });
  drawText(doc, periodLabel, 210, y + 26, { size: 11, bold: true, color: DARK, width: 150 });
  drawText(doc, "Package status / 课包状态", 394, y + 10, { size: 8, color: MUTED, bold: true });
  drawText(doc, String(pkg.status ?? "-"), 394, y + 26, { size: 11, bold: true, color: DARK, width: 126 });
  y += 68;

  doc.roundedRect(32, y, printableWidth, 68, 12).fillAndStroke(SOFT_BLUE, BORDER);
  drawText(doc, "Student / 学生", 44, y + 12, { size: 9, color: MUTED, bold: true });
  drawText(doc, pkg.student.name, 44, y + 30, { size: 14, bold: true });
  drawText(doc, "Course / 课程", 205, y + 12, { size: 9, color: MUTED, bold: true });
  drawText(doc, pkg.course.name, 205, y + 30, { size: 14, bold: true, width: 170 });
  drawText(doc, "Package / 课时包", 394, y + 12, { size: 9, color: MUTED, bold: true });
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
    "This statement shows invoice transactions and approved receipt payments only. Pending or rejected receipts are listed separately and do not count toward paid balance yet.",
    32,
    y,
    { size: 9, color: MUTED, width: printableWidth, lineBreak: true },
  );
  y = doc.y + 10;

  drawSectionTitle(doc, 32, y, printableWidth, "Transactions / 交易记录", "approved financial movement only / 仅计入正式已确认交易");
  y += 34;

  const colWidths = [62, 45, 95, 146, 52, 52, 58];
  const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const baseX = 32;

  const ensureSpace = (required: number) => {
    if (y + required <= doc.page.height - 40) return;
    doc.addPage();
    setPdfFont(doc);
    y = 32;
    drawSectionTitle(doc, 32, y, printableWidth, "Transactions / 交易记录", "continued / 续页");
    y += 34;
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
    txns.forEach((row, rowIndex) => {
      const descHeight = Math.max(
        16,
        doc.heightOfString(row.description, {
          width: colWidths[3] - 8,
          align: "left",
        }) + 4,
      );
      const rowHeight = Math.max(22, descHeight);
      ensureSpace(rowHeight + 2);
      if (rowIndex % 2 === 0) {
        doc.rect(baseX, y, tableWidth, rowHeight).fill("#fcfdff");
      }
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
        const color =
          index === 1
            ? row.type === "INVOICE"
              ? "#1d4ed8"
              : "#166534"
            : index === 6 && row.runningBalance > 0.009
              ? "#b91c1c"
              : DARK;
        drawText(doc, value, x + 4, y + 6, {
          size: 9,
          width: colWidths[index] - 8,
          align,
          lineBreak: true,
          color,
          bold: index === 1 || index === 6,
        });
        x += colWidths[index];
      });
      y += rowHeight;
    });
  }

  y += 16;
  ensureSpace(72);
  drawSectionTitle(doc, 32, y, printableWidth, "Outstanding summary / 欠款摘要");
  y += 34;
  doc.roundedRect(32, y, printableWidth, 38, 10).fillAndStroke("#ffffff", BORDER);
  drawText(doc, `Total invoiced: ${money(totalInvoiced)}`, 44, y + 12, { size: 10, bold: true });
  drawText(doc, `Approved paid: ${money(totalPaid)}`, 220, y + 12, { size: 10, bold: true });
  drawText(doc, `Balance owing: ${money(balanceOwing)}`, 390, y + 12, { size: 10, bold: true, color: balanceOwing > 0.009 ? "#b91c1c" : "#166534" });
  y += 50;

  if (billing.invoices.length > 0) {
    ensureSpace(70);
    drawSectionTitle(doc, 32, y, printableWidth, "Invoice receipt breakdown / 发票收据拆分");
    y += 34;
    for (const invoice of billing.invoices) {
      const summary = invoiceReceiptSummaryMap.get(invoice.id) ?? {
        receiptCount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
        remainingApprovedBalance: roundMoney(invoice.totalAmount),
        remainingToCreate: roundMoney(invoice.totalAmount),
      };
      ensureSpace(44);
      doc.roundedRect(32, y, printableWidth, 38, 8).fillAndStroke("#ffffff", BORDER);
      drawText(doc, `${invoice.invoiceNo}   Total ${money(invoice.totalAmount)}`, 42, y + 8, {
        size: 10,
        bold: true,
        width: 210,
        lineBreak: true,
      });
      drawText(
        doc,
        `Receipts ${summary.receiptCount} · Approved ${money(summary.approvedAmount)} · Pending ${money(summary.pendingAmount)}`,
        248,
        y + 8,
        { size: 9, width: 220, lineBreak: true, color: DARK }
      );
      const rightLine = summary.remainingApprovedBalance > 0.009
        ? `Balance ${money(summary.remainingApprovedBalance)}`
        : "Fully covered";
      drawText(doc, rightLine, 474, y + 8, {
        size: 9,
        bold: true,
        width: 92,
        align: "right",
        color: summary.remainingApprovedBalance > 0.009 ? "#b91c1c" : "#166534",
        lineBreak: true,
      });
      if (summary.rejectedAmount > 0.009 || summary.remainingToCreate > 0.009) {
        drawText(
          doc,
          `${summary.rejectedAmount > 0.009 ? `Rejected ${money(summary.rejectedAmount)} · ` : ""}Remaining to receipt ${money(summary.remainingToCreate)}`,
          248,
          y + 22,
          { size: 8, width: 318, lineBreak: true, color: summary.rejectedAmount > 0.009 ? "#92400e" : MUTED }
        );
      }
      y += 46;
    }
  }

  if (unapprovedReceipts.length > 0) {
    ensureSpace(52);
    drawSectionTitle(doc, 32, y, printableWidth, "Pending receipts not counted yet / 尚未计入已付款的收据");
    y += 34;
    for (const receipt of unapprovedReceipts) {
      ensureSpace(20);
      const approval = approvalMap.get(receipt.id);
      const status = getReceiptApprovalStatus(approval, roleCfg) === "REJECTED"
        ? "Rejected / 已驳回"
        : "Pending finance approval / 等待财务审批";
      doc.roundedRect(32, y - 2, printableWidth, 18, 6).fillAndStroke("#fffaf0", "#fed7aa");
      drawText(
        doc,
        `${fmtDate(receipt.receiptDate)}   ${receipt.receiptNo}   ${money(receipt.amountReceived)}   ${status}`,
        32,
        y,
        { size: 9, width: printableWidth - 12, lineBreak: true, color: "#7c2d12" },
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

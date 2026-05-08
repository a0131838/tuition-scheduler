import { requireAdmin } from "@/lib/auth";
import {
  financeDocumentGeneratedAt,
  listFilteredFinanceDocumentRows,
  type FinanceDocumentPaymentStatus,
} from "@/lib/finance-documents";
import ExcelJS from "exceljs";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function paymentStatusLabel(status: FinanceDocumentPaymentStatus) {
  if (status === "PAID") return "Paid";
  if (status === "PARTIAL") return "Partial";
  if (status === "PENDING_APPROVAL") return "Pending approval";
  if (status === "REJECTED") return "Rejected";
  return "Unpaid";
}

function applyHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function applyDataBorders(sheet: ExcelJS.Worksheet, startRow: number) {
  for (let rowIndex = startRow; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = { vertical: "middle", horizontal: typeof cell.value === "number" ? "right" : "left" };
    });
  }
}

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const rows = await listFilteredFinanceDocumentRows({
    channel: searchParams.get("channel"),
    type: searchParams.get("type"),
    paymentStatus: searchParams.get("paymentStatus"),
    packageId: searchParams.get("packageId"),
    q: searchParams.get("q"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  });

  const generatedAt = financeDocumentGeneratedAt();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SGT Manage";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Finance Documents");
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "Finance Documents - Invoices and Receipts";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A2").value = `Generated at: ${generatedAt}`;
  sheet.getCell("A3").value = `Rows: ${rows.length}`;
  sheet.columns = [
    { header: "Channel", key: "channel", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Document No", key: "docNo", width: 24 },
    { header: "Date", key: "issueDate", width: 14 },
    { header: "Party", key: "partyLabel", width: 24 },
    { header: "Context", key: "contextLabel", width: 36 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Document Amount", key: "amount", width: 16 },
    { header: "Approved Received", key: "receiptedAmount", width: 18 },
    { header: "Pending Receipt Amount", key: "pendingReceiptAmount", width: 22 },
    { header: "Rejected Receipt Amount", key: "rejectedReceiptAmount", width: 22 },
    { header: "Remaining Unpaid", key: "remainingAmount", width: 18 },
    { header: "Receipt Count", key: "receiptCount", width: 14 },
    { header: "Payment Status", key: "paymentStatus", width: 18 },
    { header: "PDF Link", key: "exportHref", width: 42 },
    { header: "Source Page", key: "openHref", width: 52 },
  ];

  const header = sheet.getRow(5);
  header.values = sheet.columns.map((column) => column.header as string);
  applyHeader(header);

  for (const row of rows) {
    sheet.addRow({
      channel: row.channel === "PARENT" ? "Parent" : "Partner",
      type: row.type === "INVOICE" ? "Invoice" : "Receipt",
      docNo: row.docNo,
      issueDate: row.issueDate,
      partyLabel: row.partyLabel,
      contextLabel: row.contextLabel,
      packageId: row.packageId,
      amount: row.amount,
      receiptedAmount: row.receiptedAmount,
      pendingReceiptAmount: row.pendingReceiptAmount,
      rejectedReceiptAmount: row.rejectedReceiptAmount,
      remainingAmount: row.remainingAmount,
      receiptCount: row.receiptCount,
      paymentStatus: paymentStatusLabel(row.paymentStatus),
      exportHref: row.exportHref ?? "",
      openHref: row.openHref,
    });
  }
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.autoFilter = { from: "A5", to: "P5" };
  applyDataBorders(sheet, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = safeFileName(`finance-documents-${new Date().toISOString().slice(0, 10)}.xlsx`);
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

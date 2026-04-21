import { requireAdmin } from "@/lib/auth";
import ExcelJS from "exceljs";
import {
  amountBasisSourceDisplay,
  listPackageFinanceReconciliationReport,
} from "@/lib/package-finance-reconciliation";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
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

function addMetaBlock(sheet: ExcelJS.Worksheet, title: string, generatedAt: string, rowCount: number) {
  sheet.mergeCells("A1:D1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getCell("A2").value = `Generated at: ${generatedAt}`;
  sheet.getCell("A3").value = `Rows: ${rowCount}`;
}

export async function GET() {
  await requireAdmin();
  const report = await listPackageFinanceReconciliationReport();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SGT Manage";
  workbook.created = new Date();
  workbook.modified = new Date();

  const master = workbook.addWorksheet("Package Master");
  addMetaBlock(master, "Package Finance Reconciliation - Master", report.generatedAt, report.masterRows.length);
  master.columns = [
    { header: "Package Created At", key: "packageCreatedAt", width: 20 },
    { header: "Package Updated At", key: "packageUpdatedAt", width: 20 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Student", key: "studentName", width: 20 },
    { header: "Course", key: "courseName", width: 18 },
    { header: "Type", key: "packageType", width: 12 },
    { header: "Status", key: "packageStatus", width: 12 },
    { header: "Settlement Mode", key: "settlementMode", width: 18 },
    { header: "Valid From", key: "validFrom", width: 14 },
    { header: "Valid To", key: "validTo", width: 14 },
    { header: "Purchased Hours", key: "purchasedHours", width: 14 },
    { header: "Remaining Hours", key: "remainingHours", width: 14 },
    { header: "Paid Flag", key: "paidFlag", width: 10 },
    { header: "Package Paid Amount", key: "packagePaidAmount", width: 18 },
    { header: "Paid At", key: "paidAt", width: 14 },
    { header: "Amount Basis", key: "amountBasis", width: 14 },
    { header: "Amount Basis Source", key: "amountBasisSource", width: 18 },
    { header: "Purchase Txn Count", key: "purchaseTxnCount", width: 14 },
    { header: "Top-up Count", key: "topUpPurchaseCount", width: 12 },
    { header: "Purchase Amount Total", key: "purchaseAmountTotal", width: 18 },
    { header: "Invoice Count", key: "invoiceCount", width: 12 },
    { header: "Invoiced Total", key: "invoicedTotal", width: 14 },
    { header: "Receipt Count", key: "receiptCount", width: 12 },
    { header: "Receipted Total", key: "receiptedTotal", width: 14 },
    { header: "Proof Count", key: "paymentProofCount", width: 12 },
    { header: "Proof Total", key: "paymentProofTotal", width: 14 },
    { header: "Package vs Invoice Gap", key: "packageVsInvoiceGap", width: 18 },
    { header: "Invoice vs Receipt Gap", key: "invoiceVsReceiptGap", width: 18 },
    { header: "Proof vs Receipt Gap", key: "proofVsReceiptGap", width: 18 },
    { header: "Note", key: "note", width: 28 },
  ];
  const masterHeader = master.getRow(5);
  masterHeader.values = master.columns.map((column) => column.header as string);
  applyHeader(masterHeader);
  for (const row of report.masterRows) {
    master.addRow({ ...row, amountBasisSource: amountBasisSourceDisplay(row.amountBasisSource) });
  }
  master.views = [{ state: "frozen", ySplit: 5 }];
  master.autoFilter = { from: "A5", to: "AD5" };
  applyDataBorders(master, 6);

  const invoices = workbook.addWorksheet("Invoice Detail");
  addMetaBlock(invoices, "Package Finance Reconciliation - Invoices", report.generatedAt, report.invoiceRows.length);
  invoices.columns = [
    { header: "Package Created At", key: "packageCreatedAt", width: 20 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Student", key: "studentName", width: 20 },
    { header: "Course", key: "courseName", width: 18 },
    { header: "Package Status", key: "packageStatus", width: 12 },
    { header: "Amount Basis", key: "amountBasis", width: 14 },
    { header: "Invoice No", key: "invoiceNo", width: 22 },
    { header: "Issue Date", key: "issueDate", width: 14 },
    { header: "Due Date", key: "dueDate", width: 14 },
    { header: "Bill To", key: "billTo", width: 20 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "GST", key: "gstAmount", width: 10 },
    { header: "Invoice Total", key: "totalAmount", width: 14 },
    { header: "Receipt Count", key: "receiptCount", width: 12 },
    { header: "Receipted Total", key: "receiptedTotal", width: 14 },
    { header: "Remaining To Receipt", key: "remainingToReceipt", width: 18 },
    { header: "Created By", key: "createdBy", width: 24 },
    { header: "Created At", key: "createdAt", width: 20 },
  ];
  const invoicesHeader = invoices.getRow(5);
  invoicesHeader.values = invoices.columns.map((column) => column.header as string);
  applyHeader(invoicesHeader);
  for (const row of report.invoiceRows) {
    invoices.addRow(row);
  }
  invoices.views = [{ state: "frozen", ySplit: 5 }];
  invoices.autoFilter = { from: "A5", to: "R5" };
  applyDataBorders(invoices, 6);

  const receipts = workbook.addWorksheet("Receipt Proof");
  addMetaBlock(receipts, "Package Finance Reconciliation - Receipt and Proof", report.generatedAt, report.receiptProofRows.length);
  receipts.columns = [
    { header: "Package Created At", key: "packageCreatedAt", width: 20 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Student", key: "studentName", width: 20 },
    { header: "Course", key: "courseName", width: 18 },
    { header: "Row Type", key: "rowType", width: 18 },
    { header: "Payment Record ID", key: "paymentRecordId", width: 38 },
    { header: "Payment Date", key: "paymentDate", width: 14 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Payment Amount", key: "paymentAmount", width: 14 },
    { header: "Reference No", key: "referenceNo", width: 18 },
    { header: "Uploaded By", key: "uploadedBy", width: 24 },
    { header: "Uploaded At", key: "uploadedAt", width: 20 },
    { header: "Invoice No", key: "invoiceNo", width: 22 },
    { header: "Receipt No", key: "receiptNo", width: 22 },
    { header: "Receipt Date", key: "receiptDate", width: 14 },
    { header: "Amount Received", key: "amountReceived", width: 14 },
    { header: "Receipt Total", key: "receiptTotal", width: 14 },
    { header: "Receipt Created By", key: "receiptCreatedBy", width: 24 },
    { header: "Receipt Created At", key: "receiptCreatedAt", width: 20 },
    { header: "Link Status", key: "linkStatus", width: 18 },
    { header: "Note", key: "note", width: 28 },
  ];
  const receiptsHeader = receipts.getRow(5);
  receiptsHeader.values = receipts.columns.map((column) => column.header as string);
  applyHeader(receiptsHeader);
  for (const row of report.receiptProofRows) {
    receipts.addRow(row);
  }
  receipts.views = [{ state: "frozen", ySplit: 5 }];
  receipts.autoFilter = { from: "A5", to: "U5" };
  applyDataBorders(receipts, 6);

  const exceptions = workbook.addWorksheet("Exceptions");
  addMetaBlock(exceptions, "Package Finance Reconciliation - Exceptions", report.generatedAt, report.exceptionRows.length);
  exceptions.columns = [
    { header: "Package Created At", key: "packageCreatedAt", width: 18 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Student", key: "studentName", width: 20 },
    { header: "Course", key: "courseName", width: 18 },
    { header: "Exception Type", key: "exceptionType", width: 28 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Detail", key: "detail", width: 48 },
    { header: "Amount Impact", key: "amountImpact", width: 14 },
    { header: "Next Step", key: "nextStep", width: 36 },
  ];
  const exceptionsHeader = exceptions.getRow(5);
  exceptionsHeader.values = exceptions.columns.map((column) => column.header as string);
  applyHeader(exceptionsHeader);
  for (const row of report.exceptionRows) {
    exceptions.addRow(row);
  }
  exceptions.views = [{ state: "frozen", ySplit: 5 }];
  exceptions.autoFilter = { from: "A5", to: "I5" };
  applyDataBorders(exceptions, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = safeFileName(`package-finance-reconciliation-${new Date().toISOString().slice(0, 10)}.xlsx`);
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

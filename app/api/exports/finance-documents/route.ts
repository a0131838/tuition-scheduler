import { getLang, t } from "@/lib/i18n";
import { exportDisplayLabel } from "@/lib/export-display-labels";
import { requireAdmin } from "@/lib/auth";
import {
  financeDocumentGeneratedAt,
  listFilteredFinanceDocumentRows,
} from "@/lib/finance-documents";
import ExcelJS from "exceljs";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function applyHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 44;
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
  const lang = await getLang();
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

  const sheet = workbook.addWorksheet(t(lang,"Finance Documents","财务单据").replace(/\//g, "·"));
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = t(lang,"Finance Documents - Invoices, Receipts and Credit Notes","财务单据：发票、收据及贷项通知单");
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A2").value = `${t(lang,"Generated at","生成时间")}: ${generatedAt}`;
  sheet.getCell("A3").value = `${t(lang,"Rows","记录数")}: ${rows.length}`;
  const columns = [
    { header: t(lang,"Channel","渠道"), key: "channel", width: 14 },
    { header: t(lang,"Type","类型"), key: "type", width: 12 },
    { header: t(lang,"Document No","单据编号"), key: "docNo", width: 24 },
    { header: t(lang,"Date","日期"), key: "issueDate", width: 14 },
    { header: t(lang,"Party","对象"), key: "partyLabel", width: 24 },
    { header: t(lang,"Context","关联业务"), key: "contextLabel", width: 36 },
    { header: t(lang,"Package ID","课包ID"), key: "packageId", width: 38 },
    { header: t(lang,"Original / Document Amount","原金额／单据金额"), key: "amount", width: 24 },
    { header: t(lang,"Issued Credit","已开贷项"), key: "creditAmount", width: 16 },
    { header: t(lang,"Adjusted Amount","调整后金额"), key: "adjustedAmount", width: 18 },
    { header: t(lang,"Approved Received","已批准收款"), key: "receiptedAmount", width: 18 },
    { header: t(lang,"Pending Receipt Amount","待审收款金额"), key: "pendingReceiptAmount", width: 22 },
    { header: t(lang,"Rejected Receipt Amount","已驳回收款金额"), key: "rejectedReceiptAmount", width: 22 },
    { header: t(lang,"Remaining Unpaid","未收余额"), key: "remainingAmount", width: 18 },
    { header: t(lang,"Receipt Count","收据数量"), key: "receiptCount", width: 14 },
    { header: t(lang,"Status","状态"), key: "status", width: 18 },
    { header: t(lang,"Related Document","关联单据"), key: "relatedDocumentNo", width: 24 },
    { header: t(lang,"PDF Link","PDF链接"), key: "exportHref", width: 42 },
    { header: t(lang,"PDF + Seal Link","盖章PDF链接"), key: "sealedExportHref", width: 42 },
    { header: t(lang,"Source Page","来源页面"), key: "openHref", width: 52 },
  ];

  // Column headers otherwise write into row 1 and overwrite the merged report title.
  sheet.columns = columns.map(({ header: _header, ...column }) => column);
  const header = sheet.getRow(5);
  header.values = columns.map((column) => column.header);
  applyHeader(header);

  for (const row of rows) {
    sheet.addRow({
      channel: exportDisplayLabel(row.channel, lang),
      type: exportDisplayLabel(row.type, lang),
      docNo: row.docNo,
      issueDate: row.issueDate,
      partyLabel: row.partyLabel,
      contextLabel: row.contextLabel,
      packageId: row.packageId,
      amount: row.type === "CREDIT_NOTE" ? -row.amount : row.amount,
      creditAmount: row.type === "INVOICE" ? row.creditAmount : null,
      adjustedAmount: row.type === "INVOICE" ? row.adjustedAmount : null,
      receiptedAmount: row.type === "CREDIT_NOTE" ? null : row.receiptedAmount,
      pendingReceiptAmount: row.type === "CREDIT_NOTE" ? null : row.pendingReceiptAmount,
      rejectedReceiptAmount: row.type === "CREDIT_NOTE" ? null : row.rejectedReceiptAmount,
      remainingAmount: row.type === "CREDIT_NOTE" ? null : row.remainingAmount,
      receiptCount: row.type === "CREDIT_NOTE" ? null : row.receiptCount,
      status: exportDisplayLabel(row.type === "CREDIT_NOTE" ? row.creditNoteStatus : row.paymentStatus, lang),
      relatedDocumentNo: row.relatedDocumentNo ?? "",
      exportHref: row.exportHref ?? "",
      sealedExportHref: row.sealedExportHref ?? "",
      openHref: row.openHref,
    });
  }
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.autoFilter = { from: "A5", to: "T5" };
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

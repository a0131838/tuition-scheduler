import type { FinanceDocumentRow } from "./finance-documents";
export function summarizeInvoiceRows(rows: FinanceDocumentRow[]) {
  const invoices = [...new Map(rows.filter(row => row.type === "INVOICE" && row.paymentStatus !== "VOID").map(row => [`${row.channel}:${row.id}`, row])).values()];
  const sum = (key: "adjustedAmount" | "receiptedAmount" | "remainingAmount" | "pendingReceiptAmount") => Math.round(invoices.reduce((n, row) => n + row[key], 0) * 100) / 100;
  return { invoiceCount: invoices.length, receivable: sum("adjustedAmount"), received: sum("receiptedAmount"), unpaid: sum("remainingAmount"), pending: sum("pendingReceiptAmount"), sharedPackageCount: invoices.filter(row => row.sharedPackage).length };
}

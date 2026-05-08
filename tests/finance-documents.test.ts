import assert from "node:assert/strict";
import test from "node:test";
import {
  filterFinanceDocumentRows,
  resolveInvoicePaymentStatus,
  type FinanceDocumentRow,
} from "../lib/finance-documents";

test("invoice payment status distinguishes paid, partial, pending, rejected, and unpaid", () => {
  assert.equal(resolveInvoicePaymentStatus({ invoiceTotal: 100, approvedReceiptTotal: 100 }), "PAID");
  assert.equal(resolveInvoicePaymentStatus({ invoiceTotal: 100, approvedReceiptTotal: 40 }), "PARTIAL");
  assert.equal(resolveInvoicePaymentStatus({ invoiceTotal: 100, approvedReceiptTotal: 0, pendingReceiptTotal: 100 }), "PENDING_APPROVAL");
  assert.equal(resolveInvoicePaymentStatus({ invoiceTotal: 100, approvedReceiptTotal: 0, rejectedReceiptTotal: 100 }), "REJECTED");
  assert.equal(resolveInvoicePaymentStatus({ invoiceTotal: 100, approvedReceiptTotal: 0 }), "UNPAID");
});

test("finance document filters combine payment status and period", () => {
  const rows: FinanceDocumentRow[] = [
    {
      id: "invoice-paid",
      channel: "PARENT",
      type: "INVOICE",
      docNo: "RGT-202605-0001",
      issueDate: "2026-05-02",
      packageId: "pkg-1",
      partyLabel: "Student A",
      contextLabel: "Student A · Math",
      amount: 100,
      receiptedAmount: 100,
      pendingReceiptAmount: 0,
      rejectedReceiptAmount: 0,
      remainingAmount: 0,
      receiptCount: 1,
      paymentStatus: "PAID",
      exportHref: "/api/exports/parent-invoice/invoice-paid",
      openHref: "/admin/packages/pkg-1/billing#invoices",
      exportReady: true,
    },
    {
      id: "invoice-unpaid",
      channel: "PARENT",
      type: "INVOICE",
      docNo: "RGT-202604-0002",
      issueDate: "2026-04-28",
      packageId: "pkg-2",
      partyLabel: "Student B",
      contextLabel: "Student B · English",
      amount: 200,
      receiptedAmount: 0,
      pendingReceiptAmount: 0,
      rejectedReceiptAmount: 0,
      remainingAmount: 200,
      receiptCount: 0,
      paymentStatus: "UNPAID",
      exportHref: "/api/exports/parent-invoice/invoice-unpaid",
      openHref: "/admin/packages/pkg-2/billing#invoices",
      exportReady: true,
    },
  ];

  assert.deepEqual(
    filterFinanceDocumentRows(rows, { paymentStatus: "UNPAID", dateFrom: "2026-04-01", dateTo: "2026-04-30" }).map(
      (row) => row.id,
    ),
    ["invoice-unpaid"],
  );
  assert.deepEqual(filterFinanceDocumentRows(rows, { paymentStatus: "PAID", dateFrom: "2026-04-01", dateTo: "2026-04-30" }), []);
});

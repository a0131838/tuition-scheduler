import assert from "node:assert/strict";
import test from "node:test";
import {
  filterFinanceDocumentRows,
  normalizeFinanceDocumentType,
  resolveInvoiceAmountsAfterCredit,
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

test("partner invoice amounts use issued credit without changing the original amount", () => {
  assert.deepEqual(
    resolveInvoiceAmountsAfterCredit({ invoiceTotal: 18540, issuedCreditTotal: 270, approvedReceiptTotal: 0 }),
    {
      originalAmount: 18540,
      creditAmount: 270,
      adjustedAmount: 18270,
      receiptedAmount: 0,
      remainingAmount: 18270,
    },
  );
  assert.deepEqual(
    resolveInvoiceAmountsAfterCredit({ invoiceTotal: 18540, issuedCreditTotal: 270, approvedReceiptTotal: 10000 }),
    {
      originalAmount: 18540,
      creditAmount: 270,
      adjustedAmount: 18270,
      receiptedAmount: 10000,
      remainingAmount: 8270,
    },
  );
});

test("finance document type accepts credit notes", () => {
  assert.equal(normalizeFinanceDocumentType("credit_note"), "CREDIT_NOTE");
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
      creditAmount: 0,
      adjustedAmount: 100,
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
      creditAmount: 0,
      adjustedAmount: 200,
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

test("credit notes are searchable by their related invoice but never enter payment-status queues", () => {
  const row: FinanceDocumentRow = {
    id: "credit-note-1",
    channel: "PARTNER",
    type: "CREDIT_NOTE",
    docNo: "RGT-CN-202607-0001",
    issueDate: "2026-07-15",
    packageId: "",
    partyLabel: "New Oriental",
    contextLabel: "Original invoice / 原发票 RGT-202606-0019",
    amount: 270,
    creditAmount: 270,
    adjustedAmount: 0,
    receiptedAmount: 0,
    pendingReceiptAmount: 0,
    rejectedReceiptAmount: 0,
    remainingAmount: 0,
    receiptCount: 0,
    paymentStatus: "UNPAID",
    creditNoteStatus: "ISSUED",
    relatedDocumentNo: "RGT-202606-0019",
    exportHref: "/api/exports/partner-credit-note/credit-note-1",
    openHref: "/admin/reports/partner-settlement/billing?tab=credits",
    exportReady: true,
  };

  assert.deepEqual(filterFinanceDocumentRows([row], { q: "RGT-202606-0019" }), [row]);
  assert.deepEqual(filterFinanceDocumentRows([row], { paymentStatus: "UNPAID" }), []);
});

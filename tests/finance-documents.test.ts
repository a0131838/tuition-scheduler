import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBusinessFinanceDocumentRows,
  filterFinanceDocumentRows,
  normalizeFinanceDocumentChannel,
  normalizeFinanceDocumentPaymentStatus,
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

test("finance document filters accept business accounts and void status", () => {
  assert.equal(normalizeFinanceDocumentChannel("business"), "BUSINESS");
  assert.equal(normalizeFinanceDocumentPaymentStatus("void"), "VOID");
});

test("business account documents produce formal invoice and receipt rows without exposing drafts", () => {
  const rows = buildBusinessFinanceDocumentRows({
    accounts: [
      {
        id: "shanghai-xin-zhuo-si",
        legalNameEn: "Shanghai Xinzhuo Si Education Technology Co. Ltd.",
        legalNameZh: "上海新卓思教育科技有限公司",
      },
    ],
    monthlyDocuments: [
      {
        id: "paid-document",
        accountId: "shanghai-xin-zhuo-si",
        monthKey: "2026-06",
        invoiceNo: "RGT-202607-0004",
        issueDate: "2026-07-13",
        totalAmount: 18440,
        status: "PAID",
        receiptNo: "RGT-202607-0004-RC",
        receivedFrom: "Shanghai Xinzhuo Si Education Technology Co. Ltd.",
        paidDate: "2026-07-20",
        paidAmount: 18440,
      },
      {
        id: "draft-document",
        accountId: "shanghai-xin-zhuo-si",
        monthKey: "2026-07",
        invoiceNo: "DRAFT-1",
        issueDate: "2026-07-31",
        totalAmount: 100,
        status: "DRAFT",
        receiptNo: null,
        receivedFrom: null,
        paidDate: null,
        paidAmount: null,
      },
    ],
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => ({
      type: row.type,
      channel: row.channel,
      docNo: row.docNo,
      issueDate: row.issueDate,
      amount: row.amount,
      received: row.receiptedAmount,
      remaining: row.remainingAmount,
      status: row.paymentStatus,
      related: row.relatedDocumentNo ?? null,
      pdf: row.exportHref,
    })),
    [
      {
        type: "INVOICE",
        channel: "BUSINESS",
        docNo: "RGT-202607-0004",
        issueDate: "2026-07-13",
        amount: 18440,
        received: 18440,
        remaining: 0,
        status: "PAID",
        related: null,
        pdf: "/api/exports/business-accounts/paid-document/invoice",
      },
      {
        type: "RECEIPT",
        channel: "BUSINESS",
        docNo: "RGT-202607-0004-RC",
        issueDate: "2026-07-20",
        amount: 18440,
        received: 18440,
        remaining: 0,
        status: "PAID",
        related: "RGT-202607-0004",
        pdf: "/api/exports/business-accounts/paid-document/receipt",
      },
    ],
  );
  assert.deepEqual(
    filterFinanceDocumentRows(rows, {
      channel: "BUSINESS",
      type: "INVOICE",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    }).map((row) => row.docNo),
    ["RGT-202607-0004"],
  );
});

test("issued, partial, and void business invoices keep truthful central statuses", () => {
  const rows = buildBusinessFinanceDocumentRows({
    accounts: [{ id: "business-1", legalNameEn: "Business One", legalNameZh: "" }],
    monthlyDocuments: [
      {
        id: "issued",
        accountId: "business-1",
        monthKey: "2026-07",
        invoiceNo: "INV-ISSUED",
        issueDate: "2026-07-10",
        totalAmount: 100,
        status: "ISSUED",
        receiptNo: null,
        receivedFrom: null,
        paidDate: null,
        paidAmount: null,
      },
      {
        id: "partial",
        accountId: "business-1",
        monthKey: "2026-07",
        invoiceNo: "INV-PARTIAL",
        issueDate: "2026-07-11",
        totalAmount: 100,
        status: "PAID",
        receiptNo: "INV-PARTIAL-RC",
        receivedFrom: "Business One",
        paidDate: "2026-07-12",
        paidAmount: 40,
      },
      {
        id: "void",
        accountId: "business-1",
        monthKey: "2026-07",
        invoiceNo: "INV-VOID",
        issueDate: "2026-07-13",
        totalAmount: 100,
        status: "VOID",
        receiptNo: null,
        receivedFrom: null,
        paidDate: null,
        paidAmount: null,
      },
    ],
  });

  const invoices = rows.filter((row) => row.type === "INVOICE");
  assert.equal(invoices.find((row) => row.docNo === "INV-ISSUED")?.paymentStatus, "UNPAID");
  assert.equal(invoices.find((row) => row.docNo === "INV-PARTIAL")?.paymentStatus, "PARTIAL");
  assert.equal(invoices.find((row) => row.docNo === "INV-VOID")?.paymentStatus, "VOID");
  assert.equal(invoices.find((row) => row.docNo === "INV-VOID")?.remainingAmount, 0);
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

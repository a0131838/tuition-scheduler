import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { listAllParentBilling, type ParentInvoiceItem, type ParentPaymentRecordItem, type ParentReceiptItem } from "@/lib/student-parent-billing";

type AmountBasisSource = "PURCHASE_TXNS" | "RECEIPTS" | "PACKAGE_PAID_AMOUNT" | "NONE";

export type PackageFinanceMasterRow = {
  packageCreatedAt: string;
  packageUpdatedAt: string;
  packageId: string;
  studentName: string;
  courseName: string;
  packageType: string;
  packageStatus: string;
  settlementMode: string;
  validFrom: string;
  validTo: string;
  purchasedHours: number;
  remainingHours: number;
  paidFlag: string;
  packagePaidAmount: number;
  paidAt: string;
  amountBasis: number;
  amountBasisSource: AmountBasisSource;
  purchaseTxnCount: number;
  topUpPurchaseCount: number;
  purchaseAmountTotal: number;
  invoiceCount: number;
  invoicedTotal: number;
  receiptCount: number;
  receiptedTotal: number;
  paymentProofCount: number;
  paymentProofTotal: number;
  packageVsInvoiceGap: number;
  invoiceVsReceiptGap: number;
  proofVsReceiptGap: number;
  note: string;
};

export type PackageFinanceInvoiceRow = {
  packageCreatedAt: string;
  packageId: string;
  studentName: string;
  courseName: string;
  packageStatus: string;
  amountBasis: number;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  billTo: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  receiptCount: number;
  receiptedTotal: number;
  remainingToReceipt: number;
  createdBy: string;
  createdAt: string;
};

export type PackageFinanceReceiptProofRow = {
  packageCreatedAt: string;
  packageId: string;
  studentName: string;
  courseName: string;
  rowType: "PAYMENT_PROOF" | "PAYMENT_PROOF_WITH_RECEIPT" | "RECEIPT_ONLY";
  paymentRecordId: string;
  paymentDate: string;
  paymentMethod: string;
  paymentAmount: number;
  referenceNo: string;
  uploadedBy: string;
  uploadedAt: string;
  invoiceNo: string;
  receiptNo: string;
  receiptDate: string;
  amountReceived: number;
  receiptTotal: number;
  receiptCreatedBy: string;
  receiptCreatedAt: string;
  linkStatus: "PROOF_ONLY" | "LINKED" | "PARTIAL_INVOICE" | "FULLY_MATCHED" | "RECEIPT_ONLY";
  note: string;
};

export type PackageFinanceExceptionRow = {
  packageCreatedAt: string;
  packageId: string;
  studentName: string;
  courseName: string;
  exceptionType:
    | "PACKAGE_NOT_FULLY_INVOICED"
    | "INVOICE_EXCEEDS_PACKAGE_BASIS"
    | "INVOICE_NOT_FULLY_RECEIPTED"
    | "RECEIPT_EXCEEDS_INVOICE"
    | "PROOF_WITHOUT_RECEIPT"
    | "PROOF_MISSING_AMOUNT"
    | "RECEIPT_WITHOUT_INVOICE"
    | "NON_ACTIVE_PACKAGE_OPEN_BALANCE";
  severity: "HIGH" | "MEDIUM";
  detail: string;
  amountImpact: number;
  nextStep: string;
};

export type PackageFinanceReconciliationReport = {
  generatedAt: string;
  packageCount: number;
  masterRows: PackageFinanceMasterRow[];
  invoiceRows: PackageFinanceInvoiceRow[];
  receiptProofRows: PackageFinanceReceiptProofRow[];
  exceptionRows: PackageFinanceExceptionRow[];
};

function normalizeAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function roundMoney(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function minutesToHours(minutes: number | null | undefined) {
  const safe = Number(minutes ?? 0);
  return Number((Math.max(0, safe) / 60).toFixed(2));
}

function safeDateOnly(value: Date | string | null | undefined) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(+parsed) ? "" : formatBusinessDateOnly(parsed);
}

function safeDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(+parsed) ? "" : formatBusinessDateTime(parsed);
}

function displayUser(
  raw: string | null | undefined,
  userMap: Map<string, { name: string; email: string }>
) {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!email) return "";
  const user = userMap.get(email);
  if (!user) return email;
  const name = String(user.name ?? "").trim();
  if (!name || name.toLowerCase() === user.email.toLowerCase()) return user.email;
  return `${name} (${user.email})`;
}

function amountBasisSourceLabel(source: AmountBasisSource) {
  if (source === "PURCHASE_TXNS") return "Purchase txns";
  if (source === "RECEIPTS") return "Receipts";
  if (source === "PACKAGE_PAID_AMOUNT") return "Package paid amount";
  return "None";
}

export async function listPackageFinanceReconciliationReport(): Promise<PackageFinanceReconciliationReport> {
  const [packages, parentBilling] = await Promise.all([
    prisma.coursePackage.findMany({
      include: {
        student: true,
        course: true,
        txns: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    listAllParentBilling(),
  ]);

  const creatorEmails = Array.from(
    new Set(
      [
        ...parentBilling.invoices.map((row) => String(row.createdBy ?? "").trim().toLowerCase()),
        ...parentBilling.paymentRecords.map((row) => String(row.uploadedBy ?? "").trim().toLowerCase()),
        ...parentBilling.receipts.map((row) => String(row.createdBy ?? "").trim().toLowerCase()),
      ].filter(Boolean)
    )
  );

  const userMap = creatorEmails.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { email: { in: creatorEmails } },
            select: { email: true, name: true },
          })
        ).map((user) => [user.email.trim().toLowerCase(), { name: user.name, email: user.email }] as const)
      )
    : new Map<string, { name: string; email: string }>();

  const invoicesByPackage = new Map<string, ParentInvoiceItem[]>();
  for (const invoice of parentBilling.invoices) {
    const bucket = invoicesByPackage.get(invoice.packageId) ?? [];
    bucket.push(invoice);
    invoicesByPackage.set(invoice.packageId, bucket);
  }

  const receiptsByPackage = new Map<string, ParentReceiptItem[]>();
  const receiptsByInvoice = new Map<string, ParentReceiptItem[]>();
  const receiptsByPaymentRecord = new Map<string, ParentReceiptItem[]>();
  for (const receipt of parentBilling.receipts) {
    const byPackage = receiptsByPackage.get(receipt.packageId) ?? [];
    byPackage.push(receipt);
    receiptsByPackage.set(receipt.packageId, byPackage);
    if (receipt.invoiceId) {
      const byInvoice = receiptsByInvoice.get(receipt.invoiceId) ?? [];
      byInvoice.push(receipt);
      receiptsByInvoice.set(receipt.invoiceId, byInvoice);
    }
    if (receipt.paymentRecordId) {
      const byPayment = receiptsByPaymentRecord.get(receipt.paymentRecordId) ?? [];
      byPayment.push(receipt);
      receiptsByPaymentRecord.set(receipt.paymentRecordId, byPayment);
    }
  }

  const paymentRecordsByPackage = new Map<string, ParentPaymentRecordItem[]>();
  for (const record of parentBilling.paymentRecords) {
    const bucket = paymentRecordsByPackage.get(record.packageId) ?? [];
    bucket.push(record);
    paymentRecordsByPackage.set(record.packageId, bucket);
  }

  const invoiceById = new Map(parentBilling.invoices.map((invoice) => [invoice.id, invoice] as const));

  const masterRows: PackageFinanceMasterRow[] = [];
  const invoiceRows: PackageFinanceInvoiceRow[] = [];
  const receiptProofRows: PackageFinanceReceiptProofRow[] = [];
  const exceptionRows: PackageFinanceExceptionRow[] = [];

  for (const pkg of packages) {
    const invoices = (invoicesByPackage.get(pkg.id) ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const receipts = (receiptsByPackage.get(pkg.id) ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const paymentRecords = (paymentRecordsByPackage.get(pkg.id) ?? []).slice().sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));

    let totalPurchasedMinutes = 0;
    let remainingMinutesLedger = 0;
    let purchaseTxnAmountTotal = 0;
    let purchaseTxnCount = 0;
    let purchaseTxnAmountComplete = true;
    for (const txn of pkg.txns) {
      const delta = Number(txn.deltaMinutes ?? 0);
      if (delta > 0) totalPurchasedMinutes += delta;
      remainingMinutesLedger += delta;
      if (txn.kind === "PURCHASE" && delta > 0) {
        purchaseTxnCount += 1;
        if (txn.deltaAmount == null || !Number.isFinite(Number(txn.deltaAmount))) {
          purchaseTxnAmountComplete = false;
        } else {
          purchaseTxnAmountTotal += normalizeAmount(txn.deltaAmount);
        }
      }
    }

    const receiptTotal = roundMoney(receipts.reduce((sum, row) => sum + normalizeAmount(row.amountReceived), 0));
    const invoiceTotal = roundMoney(invoices.reduce((sum, row) => sum + normalizeAmount(row.totalAmount), 0));
    const paymentProofTotal = roundMoney(paymentRecords.reduce((sum, row) => sum + normalizeAmount(row.paymentAmount), 0));
    const packagePaidAmount = roundMoney(normalizeAmount(pkg.paidAmount));
    const usePurchaseTxnBasis = purchaseTxnCount > 0 && purchaseTxnAmountComplete;
    const amountBasis = roundMoney(
      usePurchaseTxnBasis ? purchaseTxnAmountTotal : receiptTotal > 0 ? receiptTotal : packagePaidAmount
    );
    const amountBasisSource: AmountBasisSource = usePurchaseTxnBasis
      ? "PURCHASE_TXNS"
      : receiptTotal > 0
        ? "RECEIPTS"
        : packagePaidAmount > 0
          ? "PACKAGE_PAID_AMOUNT"
          : "NONE";

    const packageCreatedAt = safeDateTime(pkg.createdAt);
    const packageCreatedDate = safeDateOnly(pkg.createdAt);
    const studentName = pkg.student?.name ?? "-";
    const courseName = pkg.course?.name ?? "-";

    masterRows.push({
      packageCreatedAt,
      packageUpdatedAt: safeDateTime(pkg.updatedAt),
      packageId: pkg.id,
      studentName,
      courseName,
      packageType: pkg.type,
      packageStatus: pkg.status,
      settlementMode: pkg.settlementMode ?? "",
      validFrom: safeDateOnly(pkg.validFrom),
      validTo: safeDateOnly(pkg.validTo),
      purchasedHours: minutesToHours(totalPurchasedMinutes),
      remainingHours: minutesToHours(pkg.remainingMinutes ?? remainingMinutesLedger),
      paidFlag: pkg.paid ? "YES" : "NO",
      packagePaidAmount,
      paidAt: safeDateOnly(pkg.paidAt),
      amountBasis,
      amountBasisSource,
      purchaseTxnCount,
      topUpPurchaseCount: Math.max(0, purchaseTxnCount - 1),
      purchaseAmountTotal: roundMoney(purchaseTxnAmountTotal),
      invoiceCount: invoices.length,
      invoicedTotal: invoiceTotal,
      receiptCount: receipts.length,
      receiptedTotal: receiptTotal,
      paymentProofCount: paymentRecords.length,
      paymentProofTotal,
      packageVsInvoiceGap: roundMoney(amountBasis - invoiceTotal),
      invoiceVsReceiptGap: roundMoney(invoiceTotal - receiptTotal),
      proofVsReceiptGap: roundMoney(paymentProofTotal - receiptTotal),
      note: String(pkg.note ?? "").trim(),
    });

    for (const invoice of invoices) {
      const invoiceReceipts = (receiptsByInvoice.get(invoice.id) ?? []).slice();
      const invoiceReceiptedTotal = roundMoney(
        invoiceReceipts.reduce((sum, row) => sum + normalizeAmount(row.amountReceived), 0)
      );
      const invoiceTotalAmount = roundMoney(normalizeAmount(invoice.totalAmount));
      invoiceRows.push({
        packageCreatedAt,
        packageId: pkg.id,
        studentName,
        courseName,
        packageStatus: pkg.status,
        amountBasis,
        invoiceNo: invoice.invoiceNo,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        billTo: invoice.billTo,
        amount: roundMoney(normalizeAmount(invoice.amount)),
        gstAmount: roundMoney(normalizeAmount(invoice.gstAmount)),
        totalAmount: invoiceTotalAmount,
        receiptCount: invoiceReceipts.length,
        receiptedTotal: invoiceReceiptedTotal,
        remainingToReceipt: roundMoney(Math.max(0, invoiceTotalAmount - invoiceReceiptedTotal)),
        createdBy: displayUser(invoice.createdBy, userMap),
        createdAt: safeDateTime(invoice.createdAt),
      });
    }

    for (const record of paymentRecords) {
      const linkedReceipts = (receiptsByPaymentRecord.get(record.id) ?? []).slice();
      if (linkedReceipts.length === 0) {
        receiptProofRows.push({
          packageCreatedAt,
          packageId: pkg.id,
          studentName,
          courseName,
          rowType: "PAYMENT_PROOF",
          paymentRecordId: record.id,
          paymentDate: record.paymentDate ?? "",
          paymentMethod: record.paymentMethod ?? "",
          paymentAmount: roundMoney(normalizeAmount(record.paymentAmount)),
          referenceNo: record.referenceNo ?? "",
          uploadedBy: displayUser(record.uploadedBy, userMap),
          uploadedAt: safeDateTime(record.uploadedAt),
          invoiceNo: "",
          receiptNo: "",
          receiptDate: "",
          amountReceived: 0,
          receiptTotal: 0,
          receiptCreatedBy: "",
          receiptCreatedAt: "",
          linkStatus: "PROOF_ONLY",
          note: String(record.note ?? "").trim(),
        });
        continue;
      }
      for (const receipt of linkedReceipts) {
        const invoice = receipt.invoiceId ? invoiceById.get(receipt.invoiceId) ?? null : null;
        const invoiceReceipts = receipt.invoiceId ? receiptsByInvoice.get(receipt.invoiceId) ?? [] : [];
        const invoiceReceiptedTotal = roundMoney(
          invoiceReceipts.reduce((sum, row) => sum + normalizeAmount(row.amountReceived), 0)
        );
        const invoiceTotalAmount = roundMoney(normalizeAmount(invoice?.totalAmount));
        const isPartialInvoice = Boolean(invoice) && invoiceReceiptedTotal + 0.009 < invoiceTotalAmount;
        receiptProofRows.push({
          packageCreatedAt,
          packageId: pkg.id,
          studentName,
          courseName,
          rowType: "PAYMENT_PROOF_WITH_RECEIPT",
          paymentRecordId: record.id,
          paymentDate: record.paymentDate ?? "",
          paymentMethod: record.paymentMethod ?? "",
          paymentAmount: roundMoney(normalizeAmount(record.paymentAmount)),
          referenceNo: record.referenceNo ?? "",
          uploadedBy: displayUser(record.uploadedBy, userMap),
          uploadedAt: safeDateTime(record.uploadedAt),
          invoiceNo: invoice?.invoiceNo ?? "",
          receiptNo: receipt.receiptNo,
          receiptDate: receipt.receiptDate,
          amountReceived: roundMoney(normalizeAmount(receipt.amountReceived)),
          receiptTotal: roundMoney(normalizeAmount(receipt.totalAmount)),
          receiptCreatedBy: displayUser(receipt.createdBy, userMap),
          receiptCreatedAt: safeDateTime(receipt.createdAt),
          linkStatus: invoice ? (isPartialInvoice ? "PARTIAL_INVOICE" : "FULLY_MATCHED") : "LINKED",
          note: [String(record.note ?? "").trim(), String(receipt.note ?? "").trim()].filter(Boolean).join(" | "),
        });
      }
    }

    for (const receipt of receipts.filter((row) => !row.paymentRecordId)) {
      const invoice = receipt.invoiceId ? invoiceById.get(receipt.invoiceId) ?? null : null;
      receiptProofRows.push({
        packageCreatedAt,
        packageId: pkg.id,
        studentName,
        courseName,
        rowType: "RECEIPT_ONLY",
        paymentRecordId: "",
        paymentDate: "",
        paymentMethod: "",
        paymentAmount: 0,
        referenceNo: "",
        uploadedBy: "",
        uploadedAt: "",
        invoiceNo: invoice?.invoiceNo ?? "",
        receiptNo: receipt.receiptNo,
        receiptDate: receipt.receiptDate,
        amountReceived: roundMoney(normalizeAmount(receipt.amountReceived)),
        receiptTotal: roundMoney(normalizeAmount(receipt.totalAmount)),
        receiptCreatedBy: displayUser(receipt.createdBy, userMap),
        receiptCreatedAt: safeDateTime(receipt.createdAt),
        linkStatus: "RECEIPT_ONLY",
        note: String(receipt.note ?? "").trim(),
      });
    }

    const packageVsInvoiceGap = roundMoney(amountBasis - invoiceTotal);
    const invoiceVsReceiptGap = roundMoney(invoiceTotal - receiptTotal);
    const proofVsReceiptGap = roundMoney(paymentProofTotal - receiptTotal);
    const hasProofWithoutReceipt = paymentRecords.some((record) => (receiptsByPaymentRecord.get(record.id) ?? []).length === 0);
    const hasProofMissingAmount = paymentRecords.some((record) => record.paymentAmount == null || String(record.paymentAmount).trim() === "");
    const hasReceiptWithoutInvoice = receipts.some((receipt) => !receipt.invoiceId);
    const hasOpenBalanceOnInactivePackage =
      pkg.status !== "ACTIVE" && (Math.abs(packageVsInvoiceGap) > 0.009 || Math.abs(invoiceVsReceiptGap) > 0.009);

    if (amountBasis > 0.009 && packageVsInvoiceGap > 0.009) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "PACKAGE_NOT_FULLY_INVOICED",
        severity: "HIGH",
        detail: `Package amount basis ${amountBasis.toFixed(2)} exceeds invoiced total ${invoiceTotal.toFixed(2)}.`,
        amountImpact: packageVsInvoiceGap,
        nextStep: "Create the missing invoice or review top-up / paid amount basis.",
      });
    }
    if (packageVsInvoiceGap < -0.009) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "INVOICE_EXCEEDS_PACKAGE_BASIS",
        severity: "HIGH",
        detail: `Invoiced total ${invoiceTotal.toFixed(2)} exceeds package amount basis ${amountBasis.toFixed(2)}.`,
        amountImpact: roundMoney(Math.abs(packageVsInvoiceGap)),
        nextStep: "Review invoice amount, package paid amount, and purchase txns.",
      });
    }
    if (invoiceTotal > 0.009 && invoiceVsReceiptGap > 0.009) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "INVOICE_NOT_FULLY_RECEIPTED",
        severity: "HIGH",
        detail: `Invoice total ${invoiceTotal.toFixed(2)} exceeds receipted total ${receiptTotal.toFixed(2)}.`,
        amountImpact: invoiceVsReceiptGap,
        nextStep: "Create the missing receipt or continue the partial receipt sequence.",
      });
    }
    if (invoiceVsReceiptGap < -0.009) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "RECEIPT_EXCEEDS_INVOICE",
        severity: "HIGH",
        detail: `Receipted total ${receiptTotal.toFixed(2)} exceeds invoiced total ${invoiceTotal.toFixed(2)}.`,
        amountImpact: roundMoney(Math.abs(invoiceVsReceiptGap)),
        nextStep: "Review receipt amount received and the linked invoice totals.",
      });
    }
    if (hasProofWithoutReceipt) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "PROOF_WITHOUT_RECEIPT",
        severity: "MEDIUM",
        detail: "At least one payment proof is uploaded but not linked to any receipt.",
        amountImpact: roundMoney(
          paymentRecords
            .filter((record) => (receiptsByPaymentRecord.get(record.id) ?? []).length === 0)
            .reduce((sum, record) => sum + normalizeAmount(record.paymentAmount), 0)
        ),
        nextStep: "Open receipt approvals and create or link the missing receipt.",
      });
    }
    if (hasProofMissingAmount) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "PROOF_MISSING_AMOUNT",
        severity: "MEDIUM",
        detail: "At least one payment proof is missing a payment amount.",
        amountImpact: 0,
        nextStep: "Update the payment proof amount before matching it to receipts.",
      });
    }
    if (hasReceiptWithoutInvoice) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "RECEIPT_WITHOUT_INVOICE",
        severity: "MEDIUM",
        detail: "At least one receipt exists without a linked invoice.",
        amountImpact: roundMoney(
          receipts.filter((receipt) => !receipt.invoiceId).reduce((sum, receipt) => sum + normalizeAmount(receipt.amountReceived), 0)
        ),
        nextStep: "Link the receipt to the source invoice or verify whether the invoice is missing.",
      });
    }
    if (hasOpenBalanceOnInactivePackage) {
      exceptionRows.push({
        packageCreatedAt: packageCreatedDate,
        packageId: pkg.id,
        studentName,
        courseName,
        exceptionType: "NON_ACTIVE_PACKAGE_OPEN_BALANCE",
        severity: "MEDIUM",
        detail: `Package status is ${pkg.status} but invoice/receipt gaps are still open.`,
        amountImpact: roundMoney(Math.max(Math.abs(packageVsInvoiceGap), Math.abs(invoiceVsReceiptGap))),
        nextStep: "Review whether the package should still have outstanding invoice or receipt work.",
      });
    }
  }

  masterRows.sort((a, b) => a.packageCreatedAt.localeCompare(b.packageCreatedAt) || a.packageId.localeCompare(b.packageId));
  invoiceRows.sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.invoiceNo.localeCompare(b.invoiceNo));
  receiptProofRows.sort((a, b) => {
    if (a.packageCreatedAt !== b.packageCreatedAt) return a.packageCreatedAt.localeCompare(b.packageCreatedAt);
    if (a.packageId !== b.packageId) return a.packageId.localeCompare(b.packageId);
    if (a.uploadedAt !== b.uploadedAt) return a.uploadedAt.localeCompare(b.uploadedAt);
    return a.receiptCreatedAt.localeCompare(b.receiptCreatedAt);
  });
  exceptionRows.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "HIGH" ? -1 : 1;
    if (a.packageCreatedAt !== b.packageCreatedAt) return a.packageCreatedAt.localeCompare(b.packageCreatedAt);
    return a.packageId.localeCompare(b.packageId);
  });

  return {
    generatedAt: formatBusinessDateTime(new Date()),
    packageCount: masterRows.length,
    masterRows,
    invoiceRows,
    receiptProofRows,
    exceptionRows,
  };
}

export function amountBasisSourceDisplay(source: AmountBasisSource) {
  return amountBasisSourceLabel(source);
}

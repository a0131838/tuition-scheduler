import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadRenewalPaymentOverview } from "@/lib/renewal-payment-overview";
import { coerceSnapshot } from "@/lib/student-contract";
import { getStudentContractInvoiceChoice } from "@/lib/student-contract-invoice-choice";

type Evidence = Pick<Parameters<typeof loadRenewalPaymentOverview>[0], "billing" | "roles" | "approvals">;

export async function listPaidRenewalsAwaitingSignature(evidence: Evidence, db: Prisma.TransactionClient = prisma) {
  const { billing, roles, approvals } = evidence;
  const contracts = await db.studentContract.findMany({
    where: {
      flowType: "RENEWAL", contractMode: "TUITION_AGREEMENT", status: "READY_TO_SIGN", signedAt: null, voidedAt: null,
      renewalSignatureException: { is: null },
      OR: [{ renewalOrder: { is: null } }, { renewalOrder: { is: { cancelledAt: { not: null } } } }],
      package: { type: "HOURS", status: { in: ["ACTIVE", "EXPIRED"] }, settlementMode: null },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true, studentId: true, packageId: true, createdAt: true, flowType: true, contractMode: true, status: true,
      signedAt: true, signExpiresAt: true, signToken: true, invoiceId: true, contractSnapshotJson: true,
      student: { select: { name: true } },
      package: { select: { type: true, status: true, settlementMode: true, course: { select: { name: true } } } },
    },
  });
  if (!contracts.length) return [];

  // The linked billing section displays the latest non-void contract on that package.
  const latest = await db.studentContract.findMany({
    where: { packageId: { in: contracts.map(row => row.packageId) }, status: { not: "VOID" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    distinct: ["packageId"],
    select: { id: true },
  });
  const latestIds = new Set(latest.map(row => row.id));
  const now = Date.now();
  const rows = await Promise.all(contracts.filter(row => latestIds.has(row.id)).map(async row => {
    const contractSnapshot = coerceSnapshot(row.contractSnapshotJson);
    const choice = row.invoiceId ? null : await getStudentContractInvoiceChoice(row.id, db);
    const invoiceId = row.invoiceId ?? (choice?.mode === "LINK_EXISTING" && choice.packageId === row.packageId ? choice.invoiceId : null);
    if (!invoiceId || !contractSnapshot) return null;
    const invoice = billing.invoices.find(item =>
      item.id === invoiceId && item.packageId === row.packageId && item.studentId === row.studentId);
    if (!invoice || Math.round(invoice.totalAmount * 100) !== Math.round(Number(contractSnapshot.package?.feeAmount) * 100)) return null;
    const receipts = billing.receipts.filter(item =>
      item.invoiceId === invoice.id && item.packageId === row.packageId && item.studentId === row.studentId);
    if (!receipts.length) return null;

    const overview = await loadRenewalPaymentOverview({
      contract: { ...row, invoiceId, contractSnapshot },
      billing: {
        invoices: [invoice],
        receipts,
        paymentRecords: billing.paymentRecords.filter(item => item.packageId === row.packageId),
      },
      packageType: row.package.type, packageStatus: row.package.status, settlementMode: row.package.settlementMode,
      roles, approvals,
    }, db);
    const payment = overview?.current;
    if (!overview || !payment || overview.exception || overview.activeOrder || overview.postedMinutes !== 0 || overview.invoiceUsedElsewhere ||
        payment.totalCents <= 0 || payment.approvedCents < payment.totalCents ||
        !payment.approvedMethods.length || payment.approvedMethods.includes("Cash")) return null;

    return {
      contractId: row.id,
      packageId: row.packageId,
      studentName: row.student.name,
      courseName: row.package.course.name,
      invoiceNo: invoice.invoiceNo,
      amount: payment.totalCents / 100,
      methods: payment.approvedMethods,
      hours: overview.minutes / 60,
      invoiceApproval: overview.invoiceApproval,
      needsSigningLink: !row.signToken || Boolean(row.signExpiresAt && row.signExpiresAt.getTime() < now),
    };
  }));
  return rows.filter(row => row !== null);
}

export type PaidRenewalFollowUp = Awaited<ReturnType<typeof listPaidRenewalsAwaitingSignature>>[number];

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { listParentBillingForPackage } from "./student-parent-billing";
import { listPartnerBilling } from "./partner-billing";
import { getParentReceiptApprovalMap } from "./parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "./partner-receipt-approval";
import { getApprovalRoleConfig } from "./approval-flow";
import { getReceiptApprovalStatus } from "./receipt-approval-policy";
import { renewalPaymentSummary } from "./renewal-payment-policy";

export type RenewalPaymentCandidate = ReturnType<typeof renewalPaymentSummary> & {
  id: string; invoiceNo: string; issueDate: string; channel: "PARENT" | "PARTNER";
  originalAmount: number; issuedCredit: number; eligible: boolean; requiresReview: boolean;
};

type EvidenceTask = { id: string; studentId: string; packageId: string; createdAt: Date; contractId: string | null };

// Legacy billing readers fill missing dates for display. Evidence must not treat
// that display fallback as a newly issued invoice, or accept duplicate invoice IDs.
async function originalInvoiceDates(db: Prisma.TransactionClient, key: string) {
  const row = await db.appSetting.findUnique({ where: { key }, select: { value: true } });
  const dates = new Map<string, string | null>();
  try {
    const store = JSON.parse(row?.value || "{}");
    for (const invoice of Array.isArray(store.invoices) ? store.invoices : []) {
      if (!invoice || typeof invoice.id !== "string") continue;
      const id = invoice.id.trim();
      dates.set(id, dates.has(id) ? null : typeof invoice.createdAt === "string" && Number.isFinite(Date.parse(invoice.createdAt)) ? invoice.createdAt : null);
    }
  } catch { /* Missing or malformed history remains unverified. */ }
  return dates;
}

// Candidate discovery is read-only. No amount/name matching and no receipt approval here.
export async function getRenewalPaymentEvidence(task: EvidenceTask, input: {
  activatedPackageId?: string | null; contractId?: string | null;
} = {}, db: Prisma.TransactionClient = prisma) {
  const pkg = await db.coursePackage.findUniqueOrThrow({ where: { id: task.packageId } });
  const targetId = input.activatedPackageId || task.packageId;
  const target = targetId === pkg.id ? pkg : await db.coursePackage.findUnique({ where: { id: targetId } });
  if (!target || target.studentId !== task.studentId || pkg.studentId !== task.studentId || target.courseId !== pkg.courseId || target.settlementMode !== pkg.settlementMode) {
    throw new Error("Package ownership needs review. / 课包归属或结算方式不一致，请先核对。");
  }
  const postpaid = pkg.settlementMode === "ONLINE_PACKAGE_END" || pkg.settlementMode === "OFFLINE_MONTHLY";
  const contractId = input.contractId === undefined ? task.contractId : input.contractId;
  const contract = contractId ? await db.studentContract.findUnique({ where: { id: contractId } }) : null;
  if (contractId && (!contract || contract.studentId !== task.studentId || contract.packageId !== targetId || (contract.flowType !== "RENEWAL" && targetId === pkg.id) || ["VOID", "EXPIRED"].includes(contract.status))) {
    throw new Error("Renewal contract is unavailable or belongs to another package. / 续费合同不可用或不属于本课包。");
  }
  const roleCfg = await getApprovalRoleConfig(db);
  const candidates: RenewalPaymentCandidate[] = [];
  const dates = await originalInvoiceDates(db, postpaid ? "partner_billing_v1" : "parent_billing_v1");
  // Earlier invoices need explicit scope review. Exact current contract linkage is current evidence.
  const current = (id: string) => Boolean(dates.get(id)) && (new Date(dates.get(id)!).getTime() >= task.createdAt.getTime() ||
    Boolean(contract?.invoiceId === id && contract.createdAt >= task.createdAt));
  if (!postpaid) {
    const billing = await listParentBillingForPackage(targetId, db);
    const approvals = await getParentReceiptApprovalMap(billing.receipts.map(r => r.id), db);
    for (const invoice of billing.invoices) {
      if (invoice.studentId !== task.studentId || !dates.get(invoice.id)) continue;
      const receipts = billing.receipts.filter(r => r.invoiceId === invoice.id && r.studentId === task.studentId && r.packageId === targetId);
      const summary = renewalPaymentSummary(invoice.totalAmount, 0, receipts.map(r => ({ id: r.id, amount: r.amountReceived, approval: getReceiptApprovalStatus(approvals.get(r.id), roleCfg) })));
      candidates.push({ id: invoice.id, invoiceNo: invoice.invoiceNo, issueDate: invoice.issueDate, channel: "PARENT", originalAmount: invoice.totalAmount, issuedCredit: 0, ...summary, eligible: true, requiresReview: !current(invoice.id) });
    }
  } else {
    const settlements = await db.partnerSettlement.findMany({ where: { packageId: targetId, studentId: task.studentId, mode: pkg.settlementMode!, revertedAt: null } });
    const billing = await listPartnerBilling(undefined, db);
    const approvals = await getPartnerReceiptApprovalMap(billing.receipts.map(r => r.id), db);
    const credits = await db.creditNote.findMany({ where: { sourceType: "PARTNER_INVOICE", status: "ISSUED" }, select: { sourceInvoiceId: true, totalAmount: true } });
    for (const invoice of billing.invoices) {
      if (invoice.mode !== pkg.settlementMode || !dates.get(invoice.id)) continue;
      // Both header and line must identify a live settlement for this student/package.
      if (!settlements.some(s => s.partnerId === invoice.partnerId && invoice.settlementIds.includes(s.id) && invoice.lines.some(l => l.type === "SETTLEMENT" && l.settlementId === s.id))) continue;
      const issuedCredit = credits.filter(c => c.sourceInvoiceId === invoice.id).reduce((sum, c) => sum + Number(c.totalAmount), 0);
      const receipts = billing.receipts.filter(r => r.invoiceId === invoice.id && r.partnerId === invoice.partnerId && r.mode === invoice.mode);
      const summary = renewalPaymentSummary(invoice.totalAmount, issuedCredit, receipts.map(r => ({ id: r.id, amount: r.amountReceived, approval: getReceiptApprovalStatus(approvals.get(r.id), roleCfg) })));
      candidates.push({ id: invoice.id, invoiceNo: invoice.invoiceNo, issueDate: invoice.issueDate, channel: "PARTNER", originalAmount: invoice.totalAmount, issuedCredit, ...summary, eligible: true, requiresReview: !current(invoice.id) });
    }
  }
  // A consolidated partner invoice can cover different packages, but not another cycle of this package.
  const used = await db.renewalTask.findMany({ where: { id: { not: task.id }, ...(postpaid ? { packageId: task.packageId } : {}), invoiceId: { in: candidates.map(c => c.id) }, paymentConfirmedAt: { not: null } }, select: { invoiceId: true } });
  const usedIds = new Set(used.map(r => r.invoiceId));
  if (candidates.length) {
    const verifiedHistory = await db.auditLog.findMany({ where: {
      module: "RENEWAL", action: "UPDATE_RENEWAL_TASK", entityId: { not: task.id },
      AND: [
        { OR: candidates.map(c => ({ meta: { path: ["paymentEvidence", "id"], equals: c.id } })) },
        ...(postpaid ? [{ meta: { path: ["sourcePackageId"], equals: task.packageId } }] : []),
      ],
    }, select: { meta: true } });
    for (const audit of verifiedHistory) {
      const meta = audit.meta as { paymentEvidence?: { id?: string } } | null;
      if (meta?.paymentEvidence?.id) usedIds.add(meta.paymentEvidence.id);
    }
  }
  for (const candidate of candidates) candidate.eligible = !usedIds.has(candidate.id);
  return { postpaid, targetPackageId: targetId, contractInvoiceId: contract?.invoiceId || null, candidates };
}

export async function verifyRenewalPayment(task: EvidenceTask, input: {
  invoiceId?: string | null; contractId?: string | null; activatedPackageId?: string | null; paymentReviewNote?: string;
}, db: Prisma.TransactionClient) {
  const evidence = await getRenewalPaymentEvidence(task, input, db);
  // Only an explicit invoice or an exact contract link can be selected automatically.
  const invoiceId = input.invoiceId || evidence.contractInvoiceId;
  const candidate = evidence.candidates.find(c => c.id === invoiceId);
  if (!candidate || !candidate.eligible) throw new Error("Select a current invoice for this renewal; old, reused or unrelated evidence cannot confirm payment. / 请核对并选择本次续费发票；旧账单、重复使用或无关凭据不能确认付款。");
  if (candidate.state !== "PAID") throw new Error("Payment is not fully verified. Check the invoice and approved receipts in Finance. / 收款尚未核验足额，请到财务核对发票及已审批收据。");
  let reviewNote = String(input.paymentReviewNote || "").trim().slice(0, 1000);
  if (candidate.requiresReview && reviewNote.length < 10) {
    const prior = await db.auditLog.findFirst({ where: {
      module: "RENEWAL", action: "UPDATE_RENEWAL_TASK", entityId: task.id,
      meta: { path: ["paymentEvidence", "id"], equals: candidate.id },
    }, orderBy: { createdAt: "desc" }, select: { meta: true } });
    const meta = prior?.meta as { paymentEvidence?: { reviewNote?: string } } | null;
    reviewNote = meta?.paymentEvidence?.reviewNote || "";
  }
  if (candidate.requiresReview && reviewNote.length < 10) throw new Error("This invoice predates the task. In the web renewal desk, record why it belongs to this renewal before confirming payment. / 发票早于任务，请在网页续费台填写本次续费归属核对依据后再确认付款。");
  return { ...candidate, reviewNote: reviewNote || null };
}

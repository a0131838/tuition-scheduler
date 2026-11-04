import crypto from "node:crypto";
import {
  PackageInvoiceApprovalStatus,
  Prisma,
  RenewalSignatureExceptionStatus,
  StudentContractFlowType,
  StudentContractMode,
  StudentContractStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getReceiptApprovalStatus } from "@/lib/receipt-approval-policy";
import { listParentBillingForPackage } from "@/lib/student-parent-billing";
import { buildPackageFinanceGateReason } from "@/lib/package-finance-gate";
import { applyContractRenewalTopUp, coerceSnapshot } from "@/lib/student-contract";
import { saveStudentContractInvoiceChoiceInTransaction } from "@/lib/student-contract-invoice-choice";

type Actor = { id: string; email: string; name?: string | null; role: string };
type Db = Prisma.TransactionClient;
const normalize = (value: string) => value.trim().toLowerCase();
const cents = (value: number) => Math.round(value * 100);

export function renewalExceptionSnapshot(raw: unknown) {
  const snapshot = coerceSnapshot(raw);
  if (!snapshot?.package || typeof snapshot.package !== "object") throw new Error("Prepare the formal renewal sign link first / 请先生成正式续费签署链接");
  const feeCents = cents(Number(snapshot.package.feeAmount));
  const topUpMinutes = Math.round(Number(snapshot.package.totalMinutes));
  if (!Number.isSafeInteger(feeCents) || feeCents <= 0 || !Number.isSafeInteger(topUpMinutes) || topUpMinutes <= 0) {
    throw new Error("Contract fee or hours are invalid / 合同金额或课时无效");
  }
  return {
    snapshot,
    snapshotHash: crypto.createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
    feeCents,
    topUpMinutes,
  };
}

export function isCashReceipt(paidBy: string | null | undefined) {
  return String(paidBy ?? "").trim().toUpperCase() === "CASH";
}

export function hasDedicatedCashPaymentRecord(input: {
  receipt: { paymentRecordId: string | null; invoiceId: string | null; amountReceived: number };
  paymentRecords: Array<{ id: string; packageId: string; studentId: string; paymentDate: string | null; paymentMethod: string | null; paymentAmount: number | null; uploadedAt: string }>;
  allReceipts: Array<{ paymentRecordId: string | null; invoiceId: string | null; amountReceived: number }>;
  packageId: string; studentId: string; contractCreatedAt: Date;
}) {
  const payment = input.paymentRecords.find(item => item.id === input.receipt.paymentRecordId && item.packageId === input.packageId && item.studentId === input.studentId);
  if (!payment || !isCashReceipt(payment.paymentMethod)) return false;
  const uploadedAt = new Date(payment.uploadedAt).getTime();
  const paidAt = new Date(`${payment.paymentDate || ""}T00:00:00Z`).getTime();
  const earliest = input.contractCreatedAt.getTime() - 7 * 86400000;
  if (!Number.isFinite(uploadedAt) || uploadedAt < earliest || !Number.isFinite(paidAt) || paidAt < earliest) return false;
  const linked = input.allReceipts.filter(item => item.paymentRecordId === payment.id);
  if (linked.some(item => item.invoiceId !== input.receipt.invoiceId)) return false;
  const allocatedCents = linked.reduce((sum, item) => sum + cents(item.amountReceived), 0);
  return allocatedCents > 0 && Number.isSafeInteger(allocatedCents) && allocatedCents <= cents(Number(payment.paymentAmount));
}

function assertFinance(actor: Actor, emails: string[]) {
  if (actor.role !== "FINANCE" || !isRoleApprover(actor.email, emails)) {
    throw new Error("Only an authorised Finance approver can use this exception / 仅指定财务审批人可操作此例外");
  }
}

function assertManager(actor: Actor, emails: string[]) {
  if (!isRoleApprover(actor.email, emails)) {
    throw new Error("Only a configured manager approver can approve this exception / 仅指定管理审批人可批准此例外");
  }
}

async function lockedContract(tx: Db, contractId: string) {
  await tx.$queryRaw`SELECT id FROM "StudentContract" WHERE id=${contractId} FOR UPDATE`;
  const row = await tx.studentContract.findUnique({ where: { id: contractId }, include: { package: true } });
  if (!row || row.flowType !== StudentContractFlowType.RENEWAL || row.contractMode !== StudentContractMode.TUITION_AGREEMENT ||
      row.status !== StudentContractStatus.READY_TO_SIGN || row.signedAt || row.voidedAt ||
      row.package.type !== "HOURS" || row.package.status !== "ACTIVE" || row.package.settlementMode !== null) {
    throw new Error("This exception is limited to unsigned, direct-billed tuition-hour renewals / 此例外仅适用于未签署的普通课时续费");
  }
  if (row.signExpiresAt && row.signExpiresAt.getTime() < Date.now()) {
    throw new Error("The sign link has expired; renew it before requesting this exception / 签署链接已过期，请先重新发送");
  }
  const details = renewalExceptionSnapshot(row.contractSnapshotJson);
  return { row, ...details };
}

async function currentInvoiceEvidence(tx: Db, input: {
  contractId: string; packageId: string; studentId: string; contractCreatedAt: Date;
  invoiceId: string; feeCents: number; requireCash: boolean;
}) {
  const billing = await listParentBillingForPackage(input.packageId, tx);
  const invoice = billing.invoices.find(item => item.id === input.invoiceId && item.packageId === input.packageId && item.studentId === input.studentId);
  if (!invoice || cents(invoice.totalAmount) !== input.feeCents) {
    throw new Error("Select this renewal's invoice with the exact contract amount / 请选择本次续费且金额一致的发票");
  }
  const issuedAt = new Date(invoice.createdAt);
  if (!Number.isFinite(issuedAt.getTime()) || issuedAt.getTime() < input.contractCreatedAt.getTime() - 7 * 86400000) {
    throw new Error("This invoice predates the current renewal / 此发票早于本次续费，不能用于例外激活");
  }
  const [otherContract, otherException, usedTask] = await Promise.all([
    tx.studentContract.findFirst({ where: { invoiceId: invoice.id, id: { not: input.contractId }, status: { not: "VOID" } }, select: { id: true } }),
    tx.renewalSignatureException.findFirst({ where: { invoiceId: invoice.id, contractId: { not: input.contractId }, status: { not: "REJECTED" } }, select: { id: true } }),
    tx.renewalTask.findFirst({ where: { invoiceId: invoice.id, paymentConfirmedAt: { not: null }, contractId: { not: input.contractId } }, select: { id: true } }),
  ]);
  if (otherContract || otherException || usedTask) {
    throw new Error("Invoice already belongs to another contract or renewal cycle / 发票已用于其他合同或续费周期");
  }
  const receipts = billing.receipts.filter(item => item.invoiceId === invoice.id && item.packageId === input.packageId && item.studentId === input.studentId);
  const approvals = await getParentReceiptApprovalMap(receipts.map(item => item.id), tx);
  const roleConfig = await getApprovalRoleConfig(tx);
  const approved = receipts.filter(item => getReceiptApprovalStatus(approvals.get(item.id), roleConfig) === "COMPLETED");
  const approvedCash = approved.filter(item => isCashReceipt(item.paidBy));
  const verifiedAmountCents = approvedCash.reduce((sum, item) => sum + cents(item.amountReceived), 0);
  if (input.requireCash) {
    if (approved.length !== approvedCash.length || verifiedAmountCents !== input.feeCents || !approvedCash.length) {
      throw new Error("Full cash payment needs approved receipts for this invoice / 本次发票须有足额且已审批的现金收据");
    }
    for (const receipt of approvedCash) {
      if (!hasDedicatedCashPaymentRecord({ receipt, paymentRecords: billing.paymentRecords, allReceipts: billing.receipts, packageId: input.packageId, studentId: input.studentId, contractCreatedAt: input.contractCreatedAt })) {
        throw new Error("Cash receipt needs a matching cash payment record / 现金收据须关联金额足够的现金付款记录");
      }
    }
  }
  return { invoice, approvedCash, verifiedAmountCents };
}

function audit(tx: Db, actor: Actor, action: string, contractId: string, meta: Record<string, unknown>) {
  return tx.auditLog.create({ data: {
    actorEmail: normalize(actor.email), actorName: actor.name || null, actorRole: actor.role,
    module: "STUDENT_CONTRACT", action, entityType: "StudentContract", entityId: contractId,
    meta: meta as Prisma.InputJsonValue,
  } });
}

export async function requestRenewalSignatureException(input: { contractId: string; invoiceId: string; reason: string; actor: Actor }) {
  const reason = input.reason.trim();
  if (reason.length < 20 || reason.length > 2000) throw new Error("Explain the payment and unsigned agreement in 20–2000 characters / 请具体说明付款与待补签原因（20至2000字）");
  return prisma.$transaction(async tx => {
    const roles = await getApprovalRoleConfig(tx);
    assertFinance(input.actor, roles.financeApproverEmails);
    const { row, snapshotHash, feeCents, topUpMinutes } = await lockedContract(tx, input.contractId);
    await currentInvoiceEvidence(tx, { contractId: row.id, packageId: row.packageId, studentId: row.studentId, contractCreatedAt: row.createdAt, invoiceId: input.invoiceId, feeCents, requireCash: true });
    const existing = await tx.renewalSignatureException.findUnique({ where: { contractId: row.id } });
    if (existing?.status === RenewalSignatureExceptionStatus.ACTIVATED) throw new Error("Renewal already activated / 续费已经激活");
    const data = {
      invoiceId: input.invoiceId, status: RenewalSignatureExceptionStatus.REQUESTED,
      snapshotHash, feeCents, topUpMinutes, requestReason: reason,
      requestedBy: normalize(input.actor.email), requestedAt: new Date(),
      managerApprovedBy: null, managerApprovedAt: null, managerNote: null,
      managerRejectedBy: null, managerRejectedAt: null, managerRejectReason: null,
    };
    const exception = existing
      ? await tx.renewalSignatureException.update({ where: { id: existing.id }, data })
      : await tx.renewalSignatureException.create({ data: { ...data, contractId: row.id } });
    await saveStudentContractInvoiceChoiceInTransaction(tx, {
      contractId: row.id, packageId: row.packageId, mode: "LINK_EXISTING", invoiceId: input.invoiceId,
      confirmationNote: `Renewal signature exception ${exception.id}: ${reason}`,
      selectedBy: input.actor.email, actorRole: input.actor.role,
    });
    await audit(tx, input.actor, "REQUEST_RENEWAL_SIGNATURE_EXCEPTION", row.id, { exceptionId: exception.id, invoiceId: input.invoiceId, feeCents, topUpMinutes, reason });
    return exception;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function reviewRenewalSignatureException(input: { contractId: string; approve: boolean; note: string; actor: Actor }) {
  const note = input.note.trim();
  if (!input.approve && note.length < 10) throw new Error("Give a rejection reason of at least 10 characters / 请填写至少10字的拒绝原因");
  return prisma.$transaction(async tx => {
    const roles = await getApprovalRoleConfig(tx);
    assertManager(input.actor, roles.managerApproverEmails);
    const { row, snapshotHash, feeCents, topUpMinutes } = await lockedContract(tx, input.contractId);
    const exception = await tx.renewalSignatureException.findUnique({ where: { contractId: row.id } });
    if (!exception || exception.status !== RenewalSignatureExceptionStatus.REQUESTED) throw new Error("No pending exception request / 没有待审核的例外申请");
    if (normalize(input.actor.email) === exception.requestedBy) throw new Error("Manager and Finance must be different accounts / 管理审批与财务申请不能由同一账号完成");
    if (exception.snapshotHash !== snapshotHash || exception.feeCents !== feeCents || exception.topUpMinutes !== topUpMinutes) throw new Error("Contract changed; request again / 合同已变更，请重新申请");
    await currentInvoiceEvidence(tx, { contractId: row.id, packageId: row.packageId, studentId: row.studentId, contractCreatedAt: row.createdAt, invoiceId: exception.invoiceId, feeCents, requireCash: true });
    const now = new Date();
    const updated = await tx.renewalSignatureException.update({ where: { id: exception.id }, data: input.approve ? {
      status: RenewalSignatureExceptionStatus.APPROVED, managerApprovedBy: normalize(input.actor.email), managerApprovedAt: now, managerNote: note || null,
    } : { status: RenewalSignatureExceptionStatus.REJECTED, managerRejectedBy: normalize(input.actor.email), managerRejectedAt: now, managerRejectReason: note } });
    await audit(tx, input.actor, input.approve ? "APPROVE_RENEWAL_SIGNATURE_EXCEPTION" : "REJECT_RENEWAL_SIGNATURE_EXCEPTION", row.id, { exceptionId: exception.id, invoiceId: exception.invoiceId, feeCents, topUpMinutes, note });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function activateRenewalSignatureException(input: { contractId: string; reason: string; actor: Actor }) {
  const reason = input.reason.trim();
  if (reason.length < 20 || reason.length > 2000) throw new Error("Enter an activation reason of 20–2000 characters / 请填写20至2000字的激活原因");
  return prisma.$transaction(async tx => {
    const roles = await getApprovalRoleConfig(tx);
    assertFinance(input.actor, roles.financeApproverEmails);
    const { row, snapshot, snapshotHash, feeCents, topUpMinutes } = await lockedContract(tx, input.contractId);
    await tx.$queryRaw`SELECT id FROM "CoursePackage" WHERE id=${row.packageId} FOR UPDATE`;
    const exception = await tx.renewalSignatureException.findUnique({ where: { contractId: row.id } });
    if (!exception || exception.status !== RenewalSignatureExceptionStatus.APPROVED || !exception.managerApprovedAt || !exception.managerApprovedBy) throw new Error("Management approval for this renewal is required / 本次续费尚未取得管理审批");
    if (exception.snapshotHash !== snapshotHash || exception.feeCents !== feeCents || exception.topUpMinutes !== topUpMinutes) throw new Error("Contract changed after approval / 审批后合同已变更");
    if (normalize(input.actor.email) === exception.managerApprovedBy) throw new Error("Manager and Finance must be different accounts / 管理审批与财务激活不能由同一账号完成");
    const evidence = await currentInvoiceEvidence(tx, { contractId: row.id, packageId: row.packageId, studentId: row.studentId, contractCreatedAt: row.createdAt, invoiceId: exception.invoiceId, feeCents, requireCash: true });
    const now = new Date();
    const topUp = await applyContractRenewalTopUp({ row, snapshot, effectiveAt: now, basis: "FINANCE_EXCEPTION" }, tx);
    if (!topUp.applied || topUp.topUpMinutes !== topUpMinutes) throw new Error("Renewal hours already applied; review the ledger / 续费课时已入账，请核对流水");
    const approval = await tx.packageInvoiceApproval.findFirst({ where: { packageId: row.packageId, invoiceId: evidence.invoice.id }, orderBy: { submittedAt: "desc" } });
    if (approval?.status === PackageInvoiceApprovalStatus.REJECTED) throw new Error("Current invoice was rejected by management / 本次发票已被管理者拒绝");
    if (approval) {
      if (approval.status !== PackageInvoiceApprovalStatus.APPROVED) await tx.packageInvoiceApproval.update({ where: { id: approval.id }, data: { status: PackageInvoiceApprovalStatus.APPROVED, managerApprovedBy: exception.managerApprovedBy, managerApprovedAt: exception.managerApprovedAt } });
    } else {
      await tx.packageInvoiceApproval.create({ data: { packageId: row.packageId, invoiceId: evidence.invoice.id, status: PackageInvoiceApprovalStatus.APPROVED, submittedBy: exception.requestedBy, managerApprovedBy: exception.managerApprovedBy, managerApprovedAt: exception.managerApprovedAt } });
    }
    await tx.coursePackage.update({ where: { id: row.packageId }, data: {
      financeGateStatus: "SCHEDULABLE", financeGateReason: buildPackageFinanceGateReason({ status: "SCHEDULABLE", invoiceNo: evidence.invoice.invoiceNo }),
      financeGateUpdatedAt: now, financeGateUpdatedBy: normalize(input.actor.email),
    } });
    await tx.studentContract.update({ where: { id: row.id }, data: { invoiceId: evidence.invoice.id, invoiceNo: evidence.invoice.invoiceNo, invoiceCreatedAt: new Date(evidence.invoice.createdAt) } });
    const updated = await tx.renewalSignatureException.update({ where: { id: exception.id }, data: {
      status: RenewalSignatureExceptionStatus.ACTIVATED, activationReason: reason, activatedBy: normalize(input.actor.email), activatedAt: now,
      verifiedReceiptIds: evidence.approvedCash.map(item => item.id), verifiedAmountCents: evidence.verifiedAmountCents,
      signatureFollowUpDueAt: new Date(now.getTime() + 7 * 86400000),
    } });
    await audit(tx, input.actor, "ACTIVATE_RENEWAL_SIGNATURE_EXCEPTION", row.id, {
      exceptionId: exception.id, invoiceId: evidence.invoice.id, invoiceNo: evidence.invoice.invoiceNo,
      receiptIds: evidence.approvedCash.map(item => item.id), receiptNos: evidence.approvedCash.map(item => item.receiptNo),
      verifiedAmountCents: evidence.verifiedAmountCents, feeCents, topUpMinutes,
      managerApprovedBy: exception.managerApprovedBy, managerApprovedAt: exception.managerApprovedAt.toISOString(),
      activationReason: reason, activatedAt: now.toISOString(), signaturePending: true,
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

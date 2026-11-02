import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { calculatePartnerReceiptNet } from "./partner-receipt-net";
import { getApprovalRoleConfig } from "./approval-flow";
import {
  getReceiptApprovalStatus,
  type ReceiptApprovalLike,
} from "./receipt-approval-policy";

import {
  moneyCents,
  allocatePartnerReceipt,
  type ReceiptAmounts,
} from "./partner-receipt-calculation";
export * from "./partner-receipt-calculation";
export function partnerReceiptBalance(
  netTotal: number,
  receipts: ReceiptAmounts[],
  approvals: Map<string, ReceiptApprovalLike>,
  cfg: { financeApproverEmails: string[] },
) {
  let approved = 0,
    pending = 0,
    rejected = 0;
  for (const r of receipts) {
    const amount = Math.max(0, moneyCents(r.amountReceived));
    const status = getReceiptApprovalStatus(approvals.get(r.id), cfg);
    if (status === "COMPLETED") approved += amount;
    else if (status === "REJECTED") rejected += amount;
    else pending += amount;
  }
  const net = moneyCents(netTotal);
  return {
    approvedAmount: approved / 100,
    pendingAmount: pending / 100,
    rejectedAmount: rejected / 100,
    remainingAmount: Math.max(0, net - approved) / 100,
    availableAmount: Math.max(0, net - approved - pending) / 100,
    overAllocatedAmount: Math.max(0, approved + pending - net) / 100,
  };
}
export async function withPartnerReceiptLock<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('partner-receipt-balance-v1'))`;
      return work(tx);
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
// Read the JSON ledger and approvals in the same locked transaction as the write.
export async function loadPartnerReceiptBalance(
  db: Prisma.TransactionClient,
  invoiceId: string,
) {
  const [billingRow, approvalRow, cfg, notes] = await Promise.all([
    db.appSetting.findUnique({ where: { key: "partner_billing_v1" } }),
    db.appSetting.findUnique({ where: { key: "partner_receipt_approval_v1" } }),
    getApprovalRoleConfig(db),
    db.creditNote.findMany({
      where: {
        sourceType: "PARTNER_INVOICE",
        sourceInvoiceId: invoiceId,
        status: "ISSUED",
      },
    }),
  ]);
  const store = JSON.parse(billingRow?.value || "{}");
  const invoice = (store.invoices || []).find(
    (i: { id: string }) => i.id === invoiceId,
  );
  if (!invoice) throw new Error("Invoice not found");
  const receipts: ReceiptAmounts[] = (store.receipts || []).filter(
    (r: ReceiptAmounts) => r.invoiceId === invoiceId,
  );
  const raw = JSON.parse(approvalRow?.value || "[]");
  if (!Array.isArray(raw)) throw new Error("Receipt approvals need review");
  const approvals = new Map<string, ReceiptApprovalLike>(
    raw.map((r) => [r.receiptId, r]),
  );
  const net = calculatePartnerReceiptNet(invoice, notes);
  const activeReceipts = receipts.filter(
    (r) => getReceiptApprovalStatus(approvals.get(r.id), cfg) !== "REJECTED",
  );
  return {
    store,
    invoice,
    receipts,
    approvals,
    cfg,
    net,
    activeReceipts,
    ...partnerReceiptBalance(net.adjustedTotalAmount, receipts, approvals, cfg),
  };
}
export async function assertPartnerReceiptCanReactivate(
  db: Prisma.TransactionClient,
  receiptId: string,
) {
  const row = await db.appSetting.findUnique({
    where: { key: "partner_billing_v1" },
  });
  const receipt = (JSON.parse(row?.value || "{}").receipts || []).find(
    (r: ReceiptAmounts) => r.id === receiptId,
  );
  if (!receipt) throw new Error("Receipt not found");
  const current = await loadPartnerReceiptBalance(db, receipt.invoiceId);
  const other = current.activeReceipts.filter((r) => r.id !== receiptId);
  allocatePartnerReceipt(current.net, other, receipt.amountReceived);
}

export type RenewalPaymentState = "PAID" | "UNPAID" | "PARTIAL" | "APPROVAL_PENDING" | "REJECTED" | "INVALID";
export type RenewalPaymentReceipt = { id: string; amount: number; approval: "COMPLETED" | "PENDING" | "REJECTED" };

// Only approved, non-rejected receipts prove payment. Credit is not cash received.
export function renewalPaymentSummary(total: number, credit: number, receipts: RenewalPaymentReceipt[]) {
  const cents = (value: number) => Math.round(value * 100);
  const invalid = !Number.isFinite(total) || total <= 0 || !Number.isFinite(credit) || credit < 0 || credit > total ||
    new Set(receipts.map(r => r.id)).size !== receipts.length ||
    receipts.some(r => !r.id || !Number.isFinite(r.amount) || r.amount <= 0);
  const approved = receipts.filter(r => r.approval === "COMPLETED");
  const approvedCents = approved.reduce((sum, r) => sum + cents(r.amount), 0);
  const dueCents = Math.max(0, cents(total) - cents(credit));
  const state: RenewalPaymentState = invalid ? "INVALID"
    : approvedCents > 0 && approvedCents >= dueCents ? "PAID"
    : receipts.some(r => r.approval === "REJECTED") ? "REJECTED"
    : receipts.some(r => r.approval === "PENDING") ? "APPROVAL_PENDING"
    : approvedCents > 0 ? "PARTIAL" : "UNPAID";
  return { state, amountDue: dueCents / 100, approvedAmount: approvedCents / 100, approvedReceiptIds: approved.map(r => r.id) };
}

export function requiresRenewalPaymentVerification(input: {
  previousStatus: string; status: string; evidenceChanged: boolean; postpaid: boolean;
}) {
  if (input.previousStatus === input.status && !input.evidenceChanged) return false;
  return input.status === "PAYMENT_CONFIRMED" || (input.status === "PACKAGE_ACTIVE" && !input.postpaid);
}

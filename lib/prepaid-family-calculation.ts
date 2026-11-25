import { formatBusinessDateOnly, parseBusinessDateEnd } from "./date-only";
import { monthEndDateOnlyFromMonth } from "./student-package-month-end-balance";
import type { SettlementStatement } from "./prepaid-settlement-statements";

export type Movement = {
  id: string;
  createdAt: Date;
  kind: string;
  deltaMinutes: number;
  deltaAmount: number | null;
  note: string | null;
  sessionId: string | null;
};
export const reasons = {
  receipt: "学费收据、付款凭证或财务核准待核 / Verify tuition receipt, proof and approval",
  invoice: "购课批次与学费发票对应待核 / Match the purchase to a tuition invoice",
  duplicate: "发票关联多批或多份合同 / Review invoice used more than once",
  gift: "赠课计值口径待确认 / Confirm complimentary-hour allocation",
  adjustment: "退费、临时加课或调整待核 / Verify refund, provisional credit or adjustment",
  settlement: "家庭结算单实收及计值口径待核 / Verify settlement receipt and allocation",
  opening: "缺少该日适用的结算起点 / Settlement opening balance unavailable",
  excess: "有已收学费尚未对应到课时批次 / Tuition receipt awaiting allocation",
  unit: "按次课包，按小时价值待核 / Session-count package requires separate valuation",
  usage: "扣课与回退对应待核 / Reconcile deduction and reversal",
} as const;
export type Issue = keyof typeof reasons;

export function reportDate(
  date: string | undefined,
  month?: string,
  today = formatBusinessDateOnly(new Date()),
) {
  const value = date ?? (month ? monthEndDateOnlyFromMonth(month) : today);
  if (!value) return null;
  const end = parseBusinessDateEnd(value);
  return end && formatBusinessDateOnly(end) === value && value <= today ? value : null;
}

export function settledMinutes(movements: Movement[], statements: SettlementStatement[], date: string) {
  const s = statements.filter((x) => x.effectiveDate <= date).at(-1);
  const anchor = s ? movements.findIndex((t) => t.id === s.throughTxn) : -1;
  if (!s || anchor < 0) return { minutes: null, reference: "", issue: "opening" as Issue };
  let minutes = s.remainingMinutes;
  for (const t of movements.slice(anchor + 1)) {
    if (s.includedPostingIds.includes(t.id)) continue;
    if (t.deltaMinutes && !["DEDUCT", "ROLLBACK"].includes(t.kind)) {
      return { minutes: null, reference: s.reference, issue: "opening" as Issue };
    }
    minutes += t.deltaMinutes;
  }
  return { minutes, reference: s.reference, issue: "settlement" as Issue };
}

// FIFO is applied to net usage. A reversal cancels the original lesson's usage,
// never creating a paid purchase. Negative balances remain visible as arrears.
export function remainingLots(movements: Movement[]) {
  const minutes = movements.reduce((sum, t) => sum + t.deltaMinutes, 0);
  const issues = new Set<Issue>();
  const deductions = new Map<string, number>();
  const lots = [];
  let remaining = Math.max(0, minutes);
  for (const txn of [...movements].reverse()) {
    if (!txn.deltaMinutes) continue;
    if (txn.kind === "ROLLBACK" || txn.kind === "DEDUCT") {
      if (!txn.sessionId || (txn.kind === "ROLLBACK") !== txn.deltaMinutes > 0) issues.add("usage");
      if (txn.sessionId)
        deductions.set(txn.sessionId, (deductions.get(txn.sessionId) ?? 0) - txn.deltaMinutes);
      continue;
    }
    if (txn.kind === "GIFT" || /gift|complimentary|bonus hours?|free hours?|赠|赠送/i.test(txn.note || ""))
      issues.add("gift");
    if (
      !["PURCHASE", "GIFT"].includes(txn.kind) ||
      txn.deltaMinutes < 0 ||
      /未付款|先暂|先录入|unpaid|refund|退款/i.test(txn.note || "")
    )
      issues.add("adjustment");
    if (txn.deltaMinutes > 0) {
      const left = Math.min(remaining, txn.deltaMinutes);
      lots.push({ txn, left });
      remaining -= left;
    }
  }
  if (remaining || [...deductions.values()].some((v) => v < 0)) issues.add("usage");
  return { minutes, lots: lots.reverse(), issues };
}

export function unearnedCents(
  netCents: number,
  grossCents: number,
  receivedCents: number,
  minutes: number,
  left: number,
) {
  // Apply receipts to earned lessons first, then recognise only the unearned cash.
  const prepaid = Math.max(0, receivedCents * minutes - grossCents * (minutes - left));
  return Math.round((prepaid / (grossCents * minutes)) * netCents);
}

export const PARTNER_RECEIVING_ENTITY = "GT Educational Institute Pte. Ltd.";
export type ReceiptAmounts = {
  id: string;
  invoiceId: string;
  amountReceived: number;
  amount: number;
  gstAmount: number;
  receiptNo: string;
};
export function moneyCents(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
export function parseReceiptAmount(value: unknown) {
  const raw = String(value ?? "").trim();
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(raw) ||
    !Number.isSafeInteger(moneyCents(raw)) ||
    moneyCents(raw) <= 0
  )
    throw new Error(
      "Enter a positive received amount with at most 2 decimals / 请填写大于零、最多两位小数的实收金额",
    );
  return moneyCents(raw) / 100;
}
export function nextPartnerReceiptNumber(
  invoiceNo: string,
  receipts: { receiptNo: string }[],
  lastSequence = 0,
) {
  const prefix = invoiceNo.toLowerCase() + "-rc";
  let last = Math.max(0, lastSequence);
  for (const row of receipts) {
    const no = row.receiptNo.toLowerCase();
    if (no === prefix) last = Math.max(last, 1);
    else if (
      no.startsWith(prefix + "-") &&
      /^\d+$/.test(no.slice(prefix.length + 1))
    )
      last = Math.max(last, Number(no.slice(prefix.length + 1)));
  }
  return {
    receiptNo: `${invoiceNo}-RC-${String(last + 1).padStart(2, "0")}`,
    sequence: last + 1,
  };
}
export function allocatePartnerReceipt(
  net: {
    adjustedAmount: number;
    adjustedGstAmount: number;
    adjustedTotalAmount: number;
  },
  activeReceipts: ReceiptAmounts[],
  received: number,
) {
  const payment = moneyCents(parseReceiptAmount(received));
  const used = activeReceipts.reduce(
    (n, r) => n + moneyCents(r.amountReceived),
    0,
  );
  const remaining = moneyCents(net.adjustedTotalAmount) - used;
  if (payment > remaining)
    throw new Error(
      "Received amount exceeds the available invoice balance (approved and pending receipts included) / 实收金额超过可收余额，已收和待审收据均已占用余额",
    );
  const gstLeft = Math.max(
    0,
    moneyCents(net.adjustedGstAmount) -
      activeReceipts.reduce((n, r) => n + moneyCents(r.gstAmount), 0),
  );
  const baseLeft = Math.max(
    0,
    moneyCents(net.adjustedAmount) -
      activeReceipts.reduce((n, r) => n + moneyCents(r.amount), 0),
  );
  let gst =
    payment === remaining
      ? gstLeft
      : Math.min(
          gstLeft,
          Math.round(
            (payment * moneyCents(net.adjustedGstAmount)) /
              moneyCents(net.adjustedTotalAmount),
          ),
        );
  gst = Math.min(payment, Math.max(0, gst));
  let amount = payment - gst;
  if (amount > baseLeft) {
    amount = baseLeft;
    gst = payment - amount;
  }
  if (gst > gstLeft)
    throw new Error("Invoice allocation needs review / 发票金额分配需核对");
  return {
    amount: amount / 100,
    gstAmount: gst / 100,
    totalAmount: payment / 100,
    amountReceived: payment / 100,
  };
}

type MoneyLike = number | string | { toString(): string } | null | undefined;

export type PartnerReceiptInvoiceAmounts = {
  amount: MoneyLike;
  gstAmount: MoneyLike;
  totalAmount: MoneyLike;
};

export type PartnerReceiptCreditAmounts = {
  status: string;
  creditNoteNo?: string | null;
  amount: MoneyLike;
  gstAmount: MoneyLike;
  totalAmount: MoneyLike;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function moneyNumber(value: MoneyLike) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

export function calculatePartnerReceiptNet(
  invoice: PartnerReceiptInvoiceAmounts,
  creditNotes: PartnerReceiptCreditAmounts[],
) {
  const originalAmount = Math.max(0, moneyNumber(invoice.amount));
  const originalGstAmount = Math.max(0, moneyNumber(invoice.gstAmount));
  const originalTotalAmount = Math.max(0, moneyNumber(invoice.totalAmount));
  const issuedNotes = creditNotes.filter((note) => note.status === "ISSUED");

  const creditAmount = Math.min(
    originalAmount,
    roundMoney(issuedNotes.reduce((sum, note) => sum + Math.max(0, moneyNumber(note.amount)), 0)),
  );
  const creditGstAmount = Math.min(
    originalGstAmount,
    roundMoney(issuedNotes.reduce((sum, note) => sum + Math.max(0, moneyNumber(note.gstAmount)), 0)),
  );
  const creditTotalAmount = Math.min(
    originalTotalAmount,
    roundMoney(issuedNotes.reduce((sum, note) => sum + Math.max(0, moneyNumber(note.totalAmount)), 0)),
  );

  const adjustedGstAmount = roundMoney(Math.max(0, originalGstAmount - creditGstAmount));
  const adjustedTotalAmount = roundMoney(Math.max(0, originalTotalAmount - creditTotalAmount));
  const calculatedAdjustedAmount = roundMoney(Math.max(0, originalAmount - creditAmount));
  const adjustedAmount =
    Math.abs(calculatedAdjustedAmount + adjustedGstAmount - adjustedTotalAmount) <= 0.01
      ? calculatedAdjustedAmount
      : roundMoney(Math.max(0, adjustedTotalAmount - adjustedGstAmount));

  return {
    originalAmount,
    originalGstAmount,
    originalTotalAmount,
    creditAmount,
    creditGstAmount,
    creditTotalAmount,
    adjustedAmount,
    adjustedGstAmount,
    adjustedTotalAmount,
    creditNoteNos: issuedNotes
      .map((note) => String(note.creditNoteNo ?? "").trim())
      .filter(Boolean),
  };
}

export function buildPartnerReceiptAdjustmentNote(
  invoiceNo: string,
  calculated: ReturnType<typeof calculatePartnerReceiptNet>,
) {
  if (calculated.creditTotalAmount <= 0) return "";
  const creditReference = calculated.creditNoteNos.length
    ? calculated.creditNoteNos.join(", ")
    : "issued Credit Note";
  return [
    `Original invoice ${invoiceNo} SGD ${calculated.originalTotalAmount.toFixed(2)}`,
    `less ${creditReference} SGD ${calculated.creditTotalAmount.toFixed(2)}`,
    `net amount received SGD ${calculated.adjustedTotalAmount.toFixed(2)}.`,
  ].join("; ");
}

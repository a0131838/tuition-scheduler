export type PurchaseBatchInput = {
  minutes: number;
  note: string | null;
};

export function parsePurchaseBatches(raw: unknown) {
  if (!Array.isArray(raw)) return [] as PurchaseBatchInput[];

  return raw
    .map((row) => {
      const minutes = Number((row as any)?.minutes ?? 0);
      const note = String((row as any)?.note ?? "").trim();
      return {
        minutes: Math.round(minutes),
        note: note || null,
      };
    })
    .filter((row) => Number.isFinite(row.minutes) && row.minutes > 0);
}

export function sumPurchaseBatchMinutes(rows: PurchaseBatchInput[]) {
  return rows.reduce((sum, row) => sum + Math.max(0, Number(row.minutes ?? 0)), 0);
}

export function normalizePurchaseBatches(input: {
  batchesRaw: unknown;
  fallbackMinutes: number;
  fallbackNote?: string | null;
}) {
  const batches = parsePurchaseBatches(input.batchesRaw);
  if (!batches.length) {
    return [
      {
        minutes: Math.round(input.fallbackMinutes),
        note: input.fallbackNote?.trim() || null,
      },
    ] as PurchaseBatchInput[];
  }

  const total = sumPurchaseBatchMinutes(batches);
  if (total !== Math.round(input.fallbackMinutes)) {
    throw new Error("Purchase batches must add up to the same total minutes");
  }
  return batches;
}

export function splitAmountAcrossPurchaseBatches(totalAmount: number | null, batches: PurchaseBatchInput[]) {
  if (totalAmount == null || !Number.isFinite(totalAmount)) {
    return batches.map(() => null) as Array<number | null>;
  }
  if (batches.length <= 1) return [Number(totalAmount)];

  const totalMinutes = sumPurchaseBatchMinutes(batches);
  if (totalMinutes <= 0) return batches.map(() => null);

  let consumed = 0;
  return batches.map((batch, index) => {
    if (index === batches.length - 1) {
      return Number((Number(totalAmount) - consumed).toFixed(2));
    }
    const share = Number(((Number(totalAmount) * batch.minutes) / totalMinutes).toFixed(2));
    consumed = Number((consumed + share).toFixed(2));
    return share;
  });
}

export function buildPurchaseTxnCreates(input: {
  batches: PurchaseBatchInput[];
  totalAmount: number | null;
  defaultNote?: string | null;
  prefix?: string;
  baseCreatedAt?: Date;
}) {
  const amountShares = splitAmountAcrossPurchaseBatches(input.totalAmount, input.batches);
  const hasMultiple = input.batches.length > 1;
  const baseTime = input.baseCreatedAt ? input.baseCreatedAt.getTime() : Date.now();

  return input.batches.map((batch, index) => {
    const batchLabel = hasMultiple
      ? `${input.prefix ?? "Purchase"} batch ${index + 1}/${input.batches.length}`
      : input.prefix ?? "Purchase";
    const parts = [batchLabel, batch.note, input.defaultNote?.trim() || null].filter(Boolean);
    return {
      kind: "PURCHASE" as const,
      deltaMinutes: batch.minutes,
      deltaAmount: amountShares[index],
      note: parts.join(" | "),
      createdAt: new Date(baseTime + index),
    };
  });
}

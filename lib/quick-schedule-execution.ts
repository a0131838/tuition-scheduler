export async function runRejectQuickScheduleBatch<T>(opts: {
  total: number;
  makeRow(index: number): Promise<{ reason?: string | null; created: T }>;
}) {
  const createdRows: T[] = [];
  for (let index = 0; index < opts.total; index++) {
    const result = await opts.makeRow(index);
    if (result.reason) {
      return { ok: false as const, reason: result.reason };
    }
    createdRows.push(result.created);
  }
  return { ok: true as const, createdRows };
}

export async function runSkipQuickScheduleBatch<T>(opts: {
  total: number;
  makeRow(index: number): Promise<{ ok: true; created: T } | { ok: false; reason: string }>;
}) {
  const createdRows: T[] = [];
  const skippedReasons: string[] = [];
  for (let index = 0; index < opts.total; index++) {
    const result = await opts.makeRow(index);
    if (!result.ok) {
      skippedReasons.push(result.reason);
      continue;
    }
    createdRows.push(result.created);
  }
  return { createdRows, skippedReasons };
}

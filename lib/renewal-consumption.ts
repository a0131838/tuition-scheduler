/** Package-level consumption: pair the full ledger by exact lesson, then apply
 * the lesson-date window. A refund for an older lesson cannot offset this month. */
export function renewalRecentConsumption(input: {
  transactions: Array<{ kind: string; deltaMinutes: number; sessionId: string | null; createdAt: Date }>;
  sessionStarts: ReadonlyMap<string, Date>; from: Date; now: Date;
}) {
  const bySession = new Map<string, { net: number; invalid: boolean; corrected: boolean; latest: number }>();
  let needsReview = false;
  for (const row of input.transactions) {
    if (row.createdAt > input.now || row.deltaMinutes === 0) continue;
    if (!["DEDUCT", "ROLLBACK", "ADJUST"].includes(row.kind)) continue;
    if (!row.sessionId) {
      // Untied ADJUST changes purchased rights, not teaching consumption.
      if (row.kind !== "ADJUST" && row.createdAt >= input.from) needsReview = true;
      continue;
    }
    const entry = bySession.get(row.sessionId) || { net: 0, invalid: false, corrected: false, latest: 0 };
    entry.latest = Math.max(entry.latest, row.createdAt.getTime());
    if (row.kind === "ADJUST") entry.corrected = true;
    else {
      entry.net += row.deltaMinutes;
      entry.invalid ||= row.kind === "DEDUCT" ? row.deltaMinutes > 0 : row.deltaMinutes < 0;
    }
    bySession.set(row.sessionId, entry);
  }
  let totalUnits = 0;
  for (const [id, row] of bySession) {
    const start = input.sessionStarts.get(id);
    if (!start) {
      // A fully paired historical deletion has no net consumption. Otherwise
      // its lesson date cannot be inferred from a refund or record-creation date.
      if (row.net !== 0 || row.invalid || (row.corrected && row.latest >= input.from.getTime())) needsReview = true;
      continue;
    }
    if (start < input.from || start > input.now) continue;
    if (row.invalid || row.corrected || row.net > 0) { needsReview = true; continue; }
    totalUnits += -row.net;
  }
  return { totalUnits, weeklyUnits: Math.round(totalUnits / 4), needsReview };
}

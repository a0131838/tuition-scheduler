import { parseAbnormalLedgerNote } from "@/lib/package-ledger-guard";

function clean(v: string | null | undefined) {
  return String(v ?? "").trim();
}

function parseSemicolonKv(raw: string) {
  const map = new Map<string, string>();
  const parts = raw.split(";").map((x) => x.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    map.set(key, value);
  }
  return map;
}

function isLikelyLegacyManualReconcile(raw: string) {
  return raw.includes("manual_reconcile_") && raw.includes("reason=") && raw.includes("actual=") && raw.includes("expected=");
}

function formatLegacyManualReconcile(raw: string) {
  const [tagPart] = raw.split(";");
  const tag = clean(tagPart);
  const kv = parseSemicolonKv(raw);
  const reason = clean(kv.get("reason"));
  const actual = clean(kv.get("actual"));
  const expected = clean(kv.get("expected"));
  const diff = clean(kv.get("diff"));
  const reasonCN = reason === "rollback orphan deduct txn" ? "冲正历史误扣（对应课次不存在）" : reason || "手工对账冲正";
  return [
    `手工对账冲正：${reasonCN}`,
    actual || expected || diff
      ? `核对值：实际 ${actual || "-"} / 目标 ${expected || "-"} / 差额 ${diff || "-"}`
      : "",
    tag ? `追踪标签：${tag}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatLedgerNoteForDisplay(note: string | null | undefined) {
  const raw = clean(note);
  if (!raw) return "-";
  if (raw.startsWith("[ABNORMAL_TXN]")) {
    const parsed = parseAbnormalLedgerNote(raw);
    return [
      "异常流水备注",
      parsed.reasonCategory ? `原因分类：${parsed.reasonCategory}` : "",
      parsed.approver ? `审批人：${parsed.approver}` : "",
      parsed.evidenceNote ? `证据备注：${parsed.evidenceNote}` : "",
      parsed.detailNote ? `补充说明：${parsed.detailNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (isLikelyLegacyManualReconcile(raw)) {
    return formatLegacyManualReconcile(raw);
  }
  return raw;
}

export function buildReadableOrphanRollbackNote(input: {
  tag: string;
  reason?: string | null;
  actualDeltaMinutes: number;
  expectedDeltaMinutes?: number;
  diffMinutes?: number;
}) {
  const reason = clean(input.reason);
  const reasonCN = reason === "rollback orphan deduct txn" ? "冲正历史误扣（对应课次不存在）" : reason || "手工对账冲正";
  const expected = Number.isFinite(input.expectedDeltaMinutes) ? Number(input.expectedDeltaMinutes) : 0;
  const diff = Number.isFinite(input.diffMinutes)
    ? Number(input.diffMinutes)
    : input.actualDeltaMinutes - expected;

  return [
    `手工对账冲正：${reasonCN}`,
    `核对值：实际 ${input.actualDeltaMinutes} / 目标 ${expected} / 差额 ${diff}`,
    `追踪标签：${clean(input.tag) || "manual_reconcile"}`,
  ].join("\n");
}

import { packageModeFromNote } from "./package-mode";

export function renewalEntitlementUnit(pkg: { type: string; note: string | null }) {
  return pkg.type === "MONTHLY" ? "PERIOD" : packageModeFromNote(pkg.note) === "GROUP_COUNT" ? "COUNT" : "MINUTES";
}

export function renewalEvidenceReference(value: unknown, previous: string | null) {
  if (value === undefined) return previous;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 100) throw new Error("Invalid evidence reference / 凭据编号无效");
  return value.trim() || null;
}

export function contractIdFromPurchaseNote(note: string | null) {
  const markers = (note || "").split("|").map(s => s.trim()).filter(s => s.startsWith("student-contract-renewal-topup:"));
  if (!markers.length) return null;
  if (markers.length !== 1) return "INVALID";
  return markers[0].slice("student-contract-renewal-topup:".length) || "INVALID";
}

export function validMonthlyExtension(meta: unknown, target: { validFrom: Date; validTo: Date | null }) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const m = meta as Record<string, unknown>;
  const before = m.before as { validFrom?: string; validTo?: string } | undefined;
  const after = m.after as { validFrom?: string; validTo?: string } | undefined;
  if (!before?.validTo || !after?.validTo || !after.validFrom || !target.validTo) return false;
  return Number.isFinite(Date.parse(before.validTo)) && Date.parse(after.validTo) > Date.parse(before.validTo) &&
    after.validTo === target.validTo.toISOString() && after.validFrom === target.validFrom.toISOString();
}

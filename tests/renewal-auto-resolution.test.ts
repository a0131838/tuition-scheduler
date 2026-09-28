import assert from "node:assert/strict";
import test from "node:test";
import { automaticRenewalResolution, assertRiskResolutionTransition, canonicalRenewalStatus, renewalForLegacyMiniapp, renewalRiskResolutionLabel } from "../lib/renewal-auto-resolution";

test("a safe active package closes only an early risk reminder, never a verified renewal", () => {
  for (const status of ["PENDING_CONTACT", "PARENT_NOTIFIED", "PARENT_CONSIDERING"]) {
    const result = automaticRenewalResolution(status, "ACTIVE")!;
    assert.equal(result.status, "RISK_RESOLVED");
    assert.equal(result.snoozeDays, null); // A subsequent risk must be eligible immediately.
    assert.match(result.note, /尚未核验/);
  }
});

test("confirmed renewals and financial follow-ups stay open regardless of package status", () => {
  for (const status of ["RENEWAL_CONFIRMED", "CONTRACT_BILLING", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PACKAGE_ACTIVE", "RISK_RESOLVED", "UNKNOWN"]) {
    for (const packageStatus of ["ACTIVE", "EXPIRED", "PAUSED", undefined]) assert.equal(automaticRenewalResolution(status, packageStatus), null);
  }
  assert.equal(automaticRenewalResolution("PENDING_CONTACT", undefined), null);
  assert.equal(automaticRenewalResolution("PENDING_CONTACT", "ACTIVE", true), null);
  assert.equal(automaticRenewalResolution("PENDING_CONTACT", "EXPIRED")?.status, "PAUSED_SPECIAL");
});

test("risk resolution cannot be manually forged or reopened as a legacy picker default", () => {
  assert.throws(() => assertRiskResolutionTransition("PENDING_CONTACT", "RISK_RESOLVED"), /系统扫描/);
  assert.throws(() => assertRiskResolutionTransition("RISK_RESOLVED", "PENDING_CONTACT"), /保留历史/);
  assert.doesNotThrow(() => assertRiskResolutionTransition("RISK_RESOLVED", "RISK_RESOLVED"));
  assert.doesNotThrow(() => assertRiskResolutionTransition("PENDING_CONTACT", "PARENT_CONSIDERING"));
});

test("published miniapp clients retain a valid picker without changing canonical history", () => {
  const row = { status: "RISK_RESOLVED", statusLabel: renewalRiskResolutionLabel(), id: "risk" };
  const dto = renewalForLegacyMiniapp(row);
  assert.equal(dto.status, "PAUSED_SPECIAL");
  assert.equal(dto.statusLabel, row.statusLabel);
  assert.equal(row.status, "RISK_RESOLVED");
  assert.equal(canonicalRenewalStatus(row.status, dto.status, true), row.status);
  assert.equal(canonicalRenewalStatus("PENDING_CONTACT", dto.status, true), "PAUSED_SPECIAL");
  assert.equal(canonicalRenewalStatus(row.status, dto.status, false), "PAUSED_SPECIAL");
  const safeRisk = renewalForLegacyMiniapp({ ...row, riskLevel: "RESOLVED" });
  assert.equal(safeRisk.riskLevel, "Risk resolved / 风险已解除");
  assert.equal(renewalForLegacyMiniapp({ status: "PAYMENT_PENDING", riskLevel: "RED" }).riskLevel, "RED");
});

test("risk outcome label supports Chinese, English and bilingual preferences", () => {
  assert.equal(renewalRiskResolutionLabel("ZH"), "风险已解除（未核验续费）");
  assert.equal(renewalRiskResolutionLabel("EN"), "Risk resolved (renewal not verified)");
  assert.match(renewalRiskResolutionLabel("BILINGUAL"), /Risk resolved.*风险已解除/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { creditedMinutes, finalReportPeriodLabel, parseFinalReportPeriodTime } from "@/lib/final-report-periods";

test("the report boundary is a strict Singapore local time", () => {
  assert.equal(parseFinalReportPeriodTime("2026-11-10T10:30")?.toISOString(), "2026-11-10T02:30:00.000Z");
  for (const input of ["2026-02-30T10:00", "2026-11-10T24:00", "2026-11-10", "2026-11-10T10:30Z"]) {
    assert.equal(parseFinalReportPeriodTime(input), null);
  }
});

test("the displayed date excludes the next period's midnight", () => {
  const start = parseFinalReportPeriodTime("2026-11-08T00:00")!;
  const end = parseFinalReportPeriodTime("2026-11-10T00:00")!;
  assert.equal(finalReportPeriodLabel(start, end), "2026-11-08 – 2026-11-09");
});

test("a full entitlement correction removes the original credit from unconfirmed choices", () => {
  const purchase = { id: "purchase", createdAt: new Date(), deltaMinutes: 120, correctionSources: [] };
  assert.equal(creditedMinutes(purchase), 120);
  assert.equal(creditedMinutes({ ...purchase, correctionSources: [{ unit: "MINUTES", deltaUnits: -60 }] }), 60);
  assert.equal(creditedMinutes({ ...purchase, correctionSources: [{ unit: "MINUTES", deltaUnits: -120 }] }), 0);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { careRiskResponseDueAt, careRiskSlaMinutes, isCareRiskSlaBreached } from "../lib/care-operations";

test("care risk SLA is deterministic for every severity", () => {
  const detectedAt = new Date("2026-07-16T09:00:00+08:00");
  assert.equal(careRiskSlaMinutes("CRITICAL"), 30);
  assert.equal(careRiskSlaMinutes("HIGH"), 120);
  assert.equal(careRiskSlaMinutes("MEDIUM"), 1440);
  assert.equal(careRiskSlaMinutes("LOW"), 4320);
  assert.equal(careRiskResponseDueAt("CRITICAL", detectedAt).toISOString(), "2026-07-16T01:30:00.000Z");
  assert.equal(careRiskResponseDueAt("HIGH", detectedAt).toISOString(), "2026-07-16T03:00:00.000Z");
});

test("only an unacknowledged open risk can breach response SLA", () => {
  const now = new Date("2026-07-16T12:00:00Z");
  const responseDueAt = new Date("2026-07-16T11:00:00Z");
  assert.equal(isCareRiskSlaBreached({ status: "OPEN", responseDueAt, acknowledgedAt: null }, now), true);
  assert.equal(isCareRiskSlaBreached({ status: "ACKNOWLEDGED", responseDueAt, acknowledgedAt: new Date("2026-07-16T10:00:00Z") }, now), false);
  assert.equal(isCareRiskSlaBreached({ status: "OPEN", responseDueAt: new Date("2026-07-16T13:00:00Z"), acknowledgedAt: null }, now), false);
});

test("parent question API is report-scoped and does not expose internal notes", async () => {
  const route = await readFile(new URL("../app/api/miniapp/students/[studentId]/care-reports/[reportId]/questions/route.ts", import.meta.url), "utf8");
  assert.match(route, /requireMiniappStudentAccess\(req, studentId, "canViewReports"\)/);
  assert.match(route, /getParentCareReport\(reportId, studentId\)/);
  assert.doesNotMatch(route, /internalNote|internalCommercialNote|facts:/);
});

test("service progress fallback uses a real CareProgramType", async () => {
  const route = await readFile(new URL("../app/api/miniapp/students/[studentId]/service-progress/route.ts", import.meta.url), "utf8");
  assert.match(route, /PRE_U_ACADEMIC_CARE/);
  assert.doesNotMatch(route, /PRE_UNIVERSITY_CARE/);
});

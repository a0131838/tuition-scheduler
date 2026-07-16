import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../prisma/migrations/20260716150000_add_care_operating_controls/migration.sql", import.meta.url);

test("care operations migration is additive and does not mutate protected workflows", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of [
    "Student", "CoursePackage", "PackageTxn", "Session", "Attendance", "PartnerSettlement",
    "Partner", "Invoice", "Receipt", "CareEngagement", "CareActivity", "CareTask", "CareReport",
  ]) {
    assert.doesNotMatch(sql, new RegExp(`(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE\\s+FROM)\\s+TABLE?\\s*"${table}"`, "i"));
  }
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bUPDATE\s+"/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test("care operations migration creates the four isolated control tables", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of ["CareParentQuestion", "CareRiskCase", "CareCoveragePeriod", "CareServiceReview"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /CareParentQuestion_careTaskId_key/);
  assert.match(sql, /CareServiceReview_engagementId_periodStart_periodEnd_key/);
});

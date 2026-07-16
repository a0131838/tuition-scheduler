import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../prisma/migrations/20260716090000_add_care_formal_reports/migration.sql", import.meta.url);

test("formal report migration is additive and leaves protected workflows untouched", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of [
    "Student", "CoursePackage", "PackageTxn", "Session", "Attendance", "PartnerSettlement",
    "Partner", "Invoice", "Receipt", "CareEngagement", "CareActivity", "CareAttachment",
  ]) {
    assert.doesNotMatch(sql, new RegExp(`(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE\\s+FROM)\\s+TABLE?\\s*"${table}"`, "i"));
  }
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bUPDATE\s+"/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test("formal report migration creates isolated report, source and parent-view tables", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of ["CareReport", "CareReportActivity", "CareReportAttachment", "CareReportView"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /CareReport_engagementId_reportType_periodStart_periodEnd_key/);
  assert.match(sql, /CareReportView_reportId_parentId_key/);
});

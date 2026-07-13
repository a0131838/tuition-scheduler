import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../prisma/migrations/20260713160000_add_care_management_core/migration.sql", import.meta.url);

test("care migration does not mutate existing teaching or finance tables", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const protectedTables = [
    "Student",
    "CoursePackage",
    "PackageTxn",
    "Session",
    "Attendance",
    "PartnerSettlement",
    "Partner",
    "Invoice",
    "Receipt",
  ];

  for (const table of protectedTables) {
    assert.doesNotMatch(sql, new RegExp(`(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE\\s+FROM)\\s+TABLE?\\s*"${table}"`, "i"));
  }
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bUPDATE\s+"/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});
test("care migration creates the core isolated tables and active-project guard", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of ["CareEngagement", "CareEngagementMember", "CarePlan", "CareActivity", "CareTask"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /CareEngagement_one_active_program_per_student_idx/);
  assert.match(sql, /WHERE "status" = 'ACTIVE'/);
});

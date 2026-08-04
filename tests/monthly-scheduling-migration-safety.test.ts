import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(process.cwd(), "prisma/migrations/20260803193000_add_monthly_scheduling_campaign/migration.sql");

test("monthly scheduling migration is additive and keeps existing operational tables untouched", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /CREATE TABLE "MonthlySchedulingCampaign"/);
  assert.match(sql, /CREATE TABLE "MonthlySchedulingItem"/);
  assert.match(sql, /MonthlySchedulingItem_campaignId_studentId_courseId_key/);
  assert.match(sql, /REFERENCES "Student"\("id"\)/);
  assert.match(sql, /REFERENCES "CoursePackage"\("id"\) ON DELETE SET NULL/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE "(?:CoursePackage|Attendance|Session|Ticket)"/i);
});

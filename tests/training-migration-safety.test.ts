import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("staff training migration is additive and constrained", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260728150000_add_staff_training_progress/migration.sql"), "utf8");
  assert.match(sql, /CREATE TABLE "StaffTrainingProgress"/);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.match(sql, /ON DELETE SET NULL/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/);
});

test("staff training role migration is additive and does not grant system permissions", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260728190000_add_staff_training_roles/migration.sql"), "utf8");
  assert.match(sql, /CREATE TABLE "StaffTrainingRole"/);
  assert.match(sql, /"role" "UserRole"/);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.doesNotMatch(sql, /UserWorkspaceAccess|ALTER TABLE "User".*role|DROP TABLE|DROP COLUMN|TRUNCATE/s);
});

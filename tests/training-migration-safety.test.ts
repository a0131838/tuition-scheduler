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

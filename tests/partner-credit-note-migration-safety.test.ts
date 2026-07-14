import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../prisma/migrations/20260714180000_add_partner_credit_notes/migration.sql",
  import.meta.url,
);

test("partner credit-note migration is additive and does not mutate existing business tables", async () => {
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
    "AppSetting",
  ];

  for (const table of protectedTables) {
    assert.doesNotMatch(
      sql,
      new RegExp(`(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE\\s+FROM)\\s+TABLE?\\s*"${table}"`, "i"),
    );
  }
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bUPDATE\s+"/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test("partner credit-note migration creates only the isolated credit-note ledger", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /CREATE TABLE "CreditNote"/);
  assert.match(sql, /CREATE TABLE "CreditNoteLine"/);
  assert.match(sql, /CreditNote_creditNoteNo_key/);
  assert.match(sql, /CreditNoteLine_creditNoteId_fkey/);
});

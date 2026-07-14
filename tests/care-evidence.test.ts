import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CARE_ATTACHMENT_OPTIONS,
  CARE_ACTIVITY_SOURCE_OPTIONS,
  careActivitySource,
  careAttachmentCategory,
} from "../lib/care-validation";
import { CARE_EVIDENCE_MAX_BYTES, validateCareEvidenceFile } from "../lib/care-evidence-files";

const migrationUrl = new URL(
  "../prisma/migrations/20260714100000_add_care_evidence_attachments/migration.sql",
  import.meta.url,
);
const downloadRouteUrl = new URL("../app/api/admin/care/attachments/[id]/file/route.ts", import.meta.url);
const storageUrl = new URL("../lib/care-evidence-files.ts", import.meta.url);

test("care evidence categories and school communication sources reject unknown values", () => {
  assert.equal(careAttachmentCategory("SCHOOL_EMAIL"), "SCHOOL_EMAIL");
  assert.equal(careActivitySource("meeting"), "MEETING");
  assert.equal(careActivitySource(""), null);
  assert.throws(() => careAttachmentCategory("PAYROLL"), /Invalid attachment category/);
  assert.throws(() => careActivitySource("UNKNOWN_SOURCE"), /Invalid activity source/);
  assert.equal(CARE_ATTACHMENT_OPTIONS.length, 9);
  assert.equal(CARE_ACTIVITY_SOURCE_OPTIONS.some((item) => item.value === "SCHOOL_PORTAL"), true);
});

test("care evidence upload validates file size and type", () => {
  assert.doesNotThrow(() => validateCareEvidenceFile(new File(["email"], "school.eml", { type: "message/rfc822" })));
  assert.throws(
    () => validateCareEvidenceFile(new File(["script"], "unsafe.sh", { type: "application/x-sh" })),
    /Unsupported file type/,
  );
  const oversized = new File([new Uint8Array(CARE_EVIDENCE_MAX_BYTES + 1)], "large.pdf", { type: "application/pdf" });
  assert.throws(() => validateCareEvidenceFile(oversized), /File too large/);
});

test("care evidence migration is additive and does not mutate protected business tables", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /CREATE TABLE "CareAttachment"/);
  assert.match(sql, /CREATE TYPE "CareAttachmentCategory"/);
  assert.match(sql, /CareAttachment_engagementId_archivedAt_createdAt_idx/);
  assert.doesNotMatch(sql, /^\s*(?:UPDATE|DELETE\s+FROM|TRUNCATE|DROP)\b/im);
  for (const table of ["Student", "CoursePackage", "PackageTxn", "Session", "Attendance", "PartnerSettlement", "Invoice", "Receipt"]) {
    assert.doesNotMatch(sql, new RegExp(`ALTER TABLE "${table}"`, "i"));
  }
});

test("care evidence files remain private behind engagement access checks", async () => {
  const [route, storage] = await Promise.all([
    readFile(downloadRouteUrl, "utf8"),
    readFile(storageUrl, "utf8"),
  ]);
  assert.match(route, /getCurrentUser/);
  assert.match(route, /canAccessCareEngagement/);
  assert.match(route, /Forbidden/);
  assert.match(storage, /\.data", "care-evidence/);
  assert.doesNotMatch(storage, /"public".*care-evidence/);
  assert.match(storage, /objectKey: path\.posix\.join\("care-evidence"/);
});

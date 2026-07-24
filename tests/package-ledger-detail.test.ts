import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cleanPackageLedgerNote,
  parsePackageLedgerReferences,
  resolvePackageLedgerStudentId,
} from "@/lib/package-ledger-detail";

const studentId = "3763222a-0091-45bd-9301-3813e007b267";
const attendanceId = "fa9b6b0b-0a8f-478e-bd4b-59b7b765b071";

test("package ledger detail extracts and removes a direct student reference", () => {
  const note = `Auto deduct by attendance save (minutes). studentId=${studentId}`;

  assert.deepEqual(parsePackageLedgerReferences(note), {
    studentId,
    attendanceId: null,
  });
  assert.equal(cleanPackageLedgerNote(note), "Auto deduct by attendance save (minutes).");
  assert.equal(resolvePackageLedgerStudentId(note, new Map()), studentId);
});

test("package ledger detail resolves historical repair rows through attendance", () => {
  const note = `Auto repair from undeducted completed report. attendanceId=${attendanceId}`;
  const attendanceMap = new Map([[attendanceId, studentId]]);

  assert.deepEqual(parsePackageLedgerReferences(note), {
    studentId: null,
    attendanceId,
  });
  assert.equal(cleanPackageLedgerNote(note), "Auto repair from undeducted completed report.");
  assert.equal(resolvePackageLedgerStudentId(note, attendanceMap), studentId);
});

test("package ledger detail supports colon metadata and leaves ordinary notes intact", () => {
  assert.equal(
    cleanPackageLedgerNote(`Manual correction studentId: ${studentId}`),
    "Manual correction",
  );
  assert.equal(cleanPackageLedgerNote("Special top-up approved by finance"), "Special top-up approved by finance");
});

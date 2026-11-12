import assert from "node:assert/strict";
import { test } from "node:test";
import { isFinalReportPreparationDue, isFinalReportSubmissionDue, packageUsagePercent } from "@/lib/report-package-progress";
import { isMidtermFollowupDue } from "@/lib/midterm-report";

test("near-completion watchlist includes 8 hours or ten percent but excludes completed packages", () => {
  assert.equal(isFinalReportPreparationDue(140 * 60, 8 * 60), true);
  assert.equal(isFinalReportPreparationDue(140 * 60, 14 * 60), true);
  assert.equal(isFinalReportPreparationDue(140 * 60, 15 * 60), false);
  assert.equal(isFinalReportPreparationDue(140 * 60, 0), false);
  assert.equal(isFinalReportPreparationDue(0, 30), false);
  assert.equal(isFinalReportPreparationDue(140 * 60, null), false);
});

test("submission requires a known zero balance; package use is separate from assignment progress", () => {
  assert.equal(isFinalReportSubmissionDue(60), false);
  assert.equal(isFinalReportSubmissionDue(0), true);
  assert.equal(isFinalReportSubmissionDue(null), false);
  assert.equal(packageUsagePercent(140 * 60, 6 * 60), 96);
  assert.equal(packageUsagePercent(140 * 60, 51 * 60), 64);
});

test("midpoint follow-up stays due after crossing the ideal 45 to 70 percent window", () => {
  assert.equal(isMidtermFollowupDue(44), false);
  assert.equal(isMidtermFollowupDue(45), true);
  assert.equal(isMidtermFollowupDue(70), true);
  assert.equal(isMidtermFollowupDue(71), true);
});

test("a confirmed learning period is submittable independently of a top-up", () => {
  assert.equal(isFinalReportSubmissionDue(103.5 * 60, "closed-period"), true);
  assert.equal(isFinalReportSubmissionDue(103.5 * 60, null), false);
});

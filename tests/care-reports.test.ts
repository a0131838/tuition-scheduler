import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertCareReportReady,
  assertCareReportTransition,
  canEditCareReport,
  careReportSnapshotCount,
} from "../lib/care-report-validation";
import { careReportParentAccessAllowed } from "../lib/care-reports";

test("care report workflow permits only the reviewed publication path", () => {
  assert.doesNotThrow(() => assertCareReportTransition("DRAFT", "SUBMITTED"));
  assert.doesNotThrow(() => assertCareReportTransition("SUBMITTED", "APPROVED"));
  assert.doesNotThrow(() => assertCareReportTransition("APPROVED", "PUBLISHED"));
  assert.throws(() => assertCareReportTransition("DRAFT", "PUBLISHED"));
  assert.throws(() => assertCareReportTransition("SUBMITTED", "PUBLISHED"));
  assert.throws(() => assertCareReportTransition("PUBLISHED", "APPROVED"));
  assert.equal(canEditCareReport("DRAFT"), true);
  assert.equal(canEditCareReport("RETURNED"), true);
  assert.equal(canEditCareReport("APPROVED"), false);
  assert.equal(canEditCareReport("PUBLISHED"), false);
});

test("care report submission requires real evidence and completed human copy", () => {
  const complete = {
    title: "July report",
    overallSummary: "Progress is stable.",
    actionsCompleted: "Reviewed school feedback.",
    nextPlan: "Complete the next assessment by 31 July.",
    sourceSnapshotJson: { lessonCount: 2, feedbackCount: 1 },
    activityLinkCount: 0,
    attachmentLinkCount: 0,
  };
  assert.doesNotThrow(() => assertCareReportReady(complete));
  assert.equal(careReportSnapshotCount(complete.sourceSnapshotJson), 3);
  assert.throws(() => assertCareReportReady({ ...complete, sourceSnapshotJson: {}, activityLinkCount: 0 }));
  assert.throws(() => assertCareReportReady({ ...complete, nextPlan: "下一阶段计划请负责人补充。" }));
});

test("pre-university publication is visible while university reports require consent and section permission", () => {
  const base = {
    status: "PUBLISHED" as const,
    engagement: { programType: "PRE_UNIVERSITY_CARE", universityProfile: null },
  };
  assert.equal(careReportParentAccessAllowed(base), true);
  assert.equal(careReportParentAccessAllowed({ ...base, status: "APPROVED" }), false);
  assert.equal(careReportParentAccessAllowed({
    status: "PUBLISHED",
    engagement: {
      programType: "UNIVERSITY_GROWTH",
      universityProfile: { studentConsentStatus: "GRANTED", parentVisibilityJson: { sectionIds: ["formal_reports"] } },
    },
  }), true);
  assert.equal(careReportParentAccessAllowed({
    status: "PUBLISHED",
    engagement: {
      programType: "UNIVERSITY_GROWTH",
      universityProfile: { studentConsentStatus: "GRANTED", parentVisibilityJson: { sectionIds: ["academic_progress"] } },
    },
  }), false);
});

test("parent report routes never serialize the internal note", async () => {
  const detailRoute = await readFile(new URL("../app/api/miniapp/students/[studentId]/care-reports/[reportId]/route.ts", import.meta.url), "utf8");
  const pdf = await readFile(new URL("../lib/care-report-pdf.ts", import.meta.url), "utf8");
  assert.doesNotMatch(detailRoute, /internalNote:\s*report\.internalNote/);
  assert.doesNotMatch(pdf, /internalNote/);
  assert.match(detailRoute, /requireMiniappStudentAccess\(req, studentId, "canViewReports"\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  calculateMidtermSubjectProgress,
  MIDTERM_REPORT_MAX_PROGRESS,
  MIDTERM_REPORT_MIN_PROGRESS,
} from "@/lib/midterm-report";

test("single-student midpoint uses that student's subject attendance", () => {
  const result = calculateMidtermSubjectProgress({
    packageTotalMinutes: 50 * 60,
    participantCount: 1,
    attendedMinutes: 25 * 60,
  });

  assert.deepEqual(result, {
    attendedMinutes: 25 * 60,
    referenceMinutes: 50 * 60,
    progressPercent: 50,
    eligible: true,
  });
});

test("shared package gives each student an independent reference share", () => {
  const allieEnglish = calculateMidtermSubjectProgress({
    packageTotalMinutes: 100 * 60,
    participantCount: 2,
    attendedMinutes: 33.5 * 60,
  });
  const stevenEnglish = calculateMidtermSubjectProgress({
    packageTotalMinutes: 100 * 60,
    participantCount: 2,
    attendedMinutes: 26 * 60,
  });

  assert.equal(allieEnglish.referenceMinutes, 50 * 60);
  assert.equal(allieEnglish.progressPercent, 67);
  assert.equal(allieEnglish.eligible, true);
  assert.equal(stevenEnglish.referenceMinutes, 50 * 60);
  assert.equal(stevenEnglish.progressPercent, 52);
  assert.equal(stevenEnglish.eligible, true);
});

test("another subject or sibling cannot push an individual subject into the candidate window", () => {
  const mathOnly = calculateMidtermSubjectProgress({
    packageTotalMinutes: 100 * 60,
    participantCount: 2,
    attendedMinutes: 21 * 60,
  });

  assert.equal(mathOnly.progressPercent, 42);
  assert.equal(mathOnly.eligible, false);
});

test("candidate window keeps the existing 45 to 70 percent boundaries", () => {
  const below = calculateMidtermSubjectProgress({
    packageTotalMinutes: 1000,
    participantCount: 1,
    attendedMinutes: 444,
  });
  const minimum = calculateMidtermSubjectProgress({
    packageTotalMinutes: 1000,
    participantCount: 1,
    attendedMinutes: 450,
  });
  const maximum = calculateMidtermSubjectProgress({
    packageTotalMinutes: 1000,
    participantCount: 1,
    attendedMinutes: 700,
  });
  const above = calculateMidtermSubjectProgress({
    packageTotalMinutes: 1000,
    participantCount: 1,
    attendedMinutes: 705,
  });

  assert.equal(MIDTERM_REPORT_MIN_PROGRESS, 45);
  assert.equal(MIDTERM_REPORT_MAX_PROGRESS, 70);
  assert.equal(below.eligible, false);
  assert.equal(minimum.eligible, true);
  assert.equal(maximum.eligible, true);
  assert.equal(above.eligible, false);
});

test("candidate and assignment paths keep student and subject scope together", () => {
  const candidateSource = readFileSync("lib/midterm-report.ts", "utf8");
  const adminSource = readFileSync("app/admin/reports/midterm/page.tsx", "utf8");

  assert.match(candidateSource, /status: \{ in: \["PRESENT", "LATE"\] \}/);
  assert.match(candidateSource, /studentSubjectMap/);
  assert.match(candidateSource, /entry\.subjectId/);
  assert.match(adminSource, /name="subjectId" value=\{row\.subjectId \?\? ""\}/);
  assert.match(adminSource, /createLearningReportAttendanceSnapshot/);
  assert.match(adminSource, /latestForTeacher: exact \?\? legacy \?\? null/);
});

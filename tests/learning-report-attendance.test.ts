import assert from "node:assert/strict";
import { test } from "node:test";

import {
  learningReportPeriodLabel,
  finalReportStageProgressLabel,
  isLegacyPackageCompletionLabel,
  isLegacyLearningPeriodLabel,
  mergeLearningReportAttendanceSnapshot,
  parseLearningReportAttendanceSnapshot,
  summarizeLearningReportAttendance,
} from "@/lib/learning-report-attendance";

const throughAt = new Date("2026-08-17T06:39:41.659Z");
const subjectId = "math-subject";
const teacherId = "teacher-1";

function row(start: string, end: string, subject: string | null = subjectId, sessionTeacherId: string | null = null) {
  return {
    session: {
      startAt: new Date(start),
      endAt: new Date(end),
      teacherId: sessionTeacherId,
      class: { teacherId, subjectId: subject },
    },
  };
}

test("final report attendance is isolated by subject for a shared package student", () => {
  const snapshot = summarizeLearningReportAttendance(
    [
      row("2026-08-01T02:00:00.000Z", "2026-08-01T04:00:00.000Z"),
      row("2026-08-02T02:00:00.000Z", "2026-08-02T03:30:00.000Z"),
      row("2026-08-03T02:00:00.000Z", "2026-08-03T04:00:00.000Z", "english-subject"),
      row("2026-08-17T09:00:00.000Z", "2026-08-17T10:30:00.000Z"),
    ],
    { subjectId, teacherId, throughAt, capturedAt: throughAt },
  );

  assert.equal(snapshot.scope, "SUBJECT");
  assert.equal(snapshot.sessionCount, 2);
  assert.equal(snapshot.attendedMinutes, 210);
  assert.equal(snapshot.firstSessionAt, "2026-08-01T02:00:00.000Z");
  assert.equal(snapshot.lastSessionAt, "2026-08-02T02:00:00.000Z");
});

test("teacher fallback is used only when a report has no subject", () => {
  const snapshot = summarizeLearningReportAttendance(
    [
      row("2026-08-01T02:00:00.000Z", "2026-08-01T03:00:00.000Z"),
      row("2026-08-02T02:00:00.000Z", "2026-08-02T03:00:00.000Z", null, "other-teacher"),
    ],
    { subjectId: null, teacherId, throughAt, capturedAt: throughAt },
  );

  assert.equal(snapshot.scope, "TEACHER");
  assert.equal(snapshot.sessionCount, 1);
  assert.equal(snapshot.attendedMinutes, 60);
});

test("attendance snapshot survives later report edits and replaces legacy package labels", () => {
  const snapshot = summarizeLearningReportAttendance(
    [row("2026-07-01T02:00:00.000Z", "2026-07-01T04:00:00.000Z")],
    { subjectId, teacherId, throughAt, capturedAt: throughAt },
  );
  const first = mergeLearningReportAttendanceSnapshot({ finalSummary: "First" }, {}, snapshot);
  const second = mergeLearningReportAttendanceSnapshot({ finalSummary: "Edited" }, first, null);

  assert.deepEqual(parseLearningReportAttendanceSnapshot(second), snapshot);
  assert.equal(isLegacyPackageCompletionLabel("50h package completed"), true);
  assert.equal(isLegacyLearningPeriodLabel("26 sessions completed"), true);
  assert.equal(
    learningReportPeriodLabel(snapshot, "50h package completed", "EN"),
    "2026-07-01 · 2 attended hours",
  );
  assert.equal(finalReportStageProgressLabel(snapshot, "EN"), "Completed 2 attended hours in this subject");
});

test("custom learning-period notes are retained alongside calculated attendance", () => {
  const snapshot = summarizeLearningReportAttendance(
    [row("2026-07-01T02:00:00.000Z", "2026-07-01T03:30:00.000Z")],
    { subjectId, teacherId, throughAt, capturedAt: throughAt },
  );

  assert.equal(
    learningReportPeriodLabel(snapshot, "Term 2 review", "BILINGUAL"),
    "Term 2 review · 1.5 attended hours / 实际出勤 1.5 小时",
  );
});

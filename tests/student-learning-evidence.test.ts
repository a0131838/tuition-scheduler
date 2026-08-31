import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLearningEvidenceSnapshot, labelLearningEvidenceAttendance } from "../lib/student-learning-evidence";

const feedback = {
  sessionId: "session-1",
  feedbackId: "feedback-1",
  sessionStartAt: new Date("2026-08-10T02:00:00.000Z"),
  courseLabel: "IGCSE / English",
  teacherName: "Joy",
  feedbackContent: [
    "Lesson focus / 本节课重点:\nParagraph structure",
    "Current finding / 目前发现:\nIdeas are clear but links are weak.",
    "Class performance / 课堂表现:\nImproved two topic sentences.",
    "Next plan / 下一步计划:\nPractice linking words for two weeks.",
    "What parents should know / 家长需要知道:\nThis is a structure habit.",
  ].join("\n\n"),
  homework: "Rewrite one paragraph",
  previousHomeworkDone: true,
  attendanceStatus: "PRESENT",
};

test("learning evidence snapshot measures formal coverage and flags missing evidence without inventing progress", () => {
  const snapshot = buildLearningEvidenceSnapshot({
    sessions: [
      { id: "session-1", attendanceStatus: "PRESENT" },
      { id: "session-2", attendanceStatus: "UNMARKED" },
    ],
    feedbacks: [feedback],
    hasBaseline: false,
    hasLearningGoal: false,
  });

  assert.equal(snapshot.sessionCount, 2);
  assert.equal(snapshot.feedbackCount, 1);
  assert.equal(snapshot.feedbackCoveragePercent, 50);
  assert.equal(snapshot.homeworkTrackingCount, 1);
  assert.equal(snapshot.homeworkDoneCount, 1);
  assert.ok(snapshot.gaps.some((gap) => gap.key === "feedback"));
  assert.ok(snapshot.gaps.some((gap) => gap.key === "attendance"));
  assert.ok(snapshot.gaps.some((gap) => gap.key === "baseline"));
  assert.ok(snapshot.gaps.some((gap) => gap.key === "goal"));
  assert.deepEqual(snapshot.focusAreas, ["Ideas are clear but links are weak."]);
  assert.deepEqual(snapshot.nextSteps, ["Practice linking words for two weeks."]);
});

test("learning evidence uses clear bilingual attendance labels", () => {
  assert.equal(labelLearningEvidenceAttendance("PRESENT"), "Present / 出席");
  assert.equal(labelLearningEvidenceAttendance("EXCUSED"), "Excused / 请假");
  assert.equal(labelLearningEvidenceAttendance(null), "Unmarked / 未点名");
});

test("learning evidence routes require the academic-record access boundary and audit exports", () => {
  const pdfRoute = readFileSync(new URL("../app/api/admin/students/[id]/learning-evidence/pdf/route.ts", import.meta.url), "utf8");
  const planRoute = readFileSync(new URL("../app/api/admin/students/[id]/learning-plans/route.ts", import.meta.url), "utf8");
  const access = readFileSync(new URL("../lib/student-learning-evidence-access.ts", import.meta.url), "utf8");
  const loader = readFileSync(new URL("../lib/student-learning-evidence-data.ts", import.meta.url), "utf8");
  assert.match(pdfRoute, /requireLearningEvidenceUser/);
  assert.match(loader, /reviewStatus: "PUBLISHED"/);
  assert.match(loader, /isProxyDraft: false/);
  assert.match(pdfRoute, /EXPORT_PDF/);
  assert.match(planRoute, /CREATE_PLAN_DRAFT/);
  assert.match(planRoute, /APPROVE_PLAN/);
  assert.match(access, /user\.role === "FINANCE"/);
});

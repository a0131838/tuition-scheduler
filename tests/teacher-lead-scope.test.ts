import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { trainingTargetRoleAllowed } from "../lib/auth";
import {
  teacherTrainingMaterialState,
  teacherTrainingMaterialTransitionAllowed,
  TRAINING_MATERIAL_ACTION,
} from "../lib/teacher-training-materials";
import {
  getSessionTeachingState,
  getVisibleSessionStudentNames,
  isSessionFullyCancelled,
  isStudentCancelledForSession,
} from "../lib/session-students";
import { resolveTeacherQualityFeedbackState } from "../lib/teacher-quality-status";

test("teacher lead can review teacher training only", () => {
  assert.equal(trainingTargetRoleAllowed({ manager: false, teacherLead: true, targetRole: "TEACHER" }), true);
  for (const role of ["ADMIN", "FINANCE", "SALES", "CS", "STUDENT"] as const) {
    assert.equal(trainingTargetRoleAllowed({ manager: false, teacherLead: true, targetRole: role }), false);
  }
  assert.equal(trainingTargetRoleAllowed({ manager: true, teacherLead: false, targetRole: "FINANCE" }), true);
});

test("teacher material workflow keeps publication owner-only", () => {
  assert.equal(teacherTrainingMaterialState([TRAINING_MATERIAL_ACTION.DRAFT]), "DRAFT");
  assert.equal(teacherTrainingMaterialState([TRAINING_MATERIAL_ACTION.SUBMITTED, TRAINING_MATERIAL_ACTION.DRAFT]), "SUBMITTED");
  assert.equal(teacherTrainingMaterialTransitionAllowed({ state: "DRAFT", decision: "SUBMIT", owner: false }), true);
  assert.equal(teacherTrainingMaterialTransitionAllowed({ state: "SUBMITTED", decision: "PUBLISH", owner: false }), false);
  assert.equal(teacherTrainingMaterialTransitionAllowed({ state: "SUBMITTED", decision: "PUBLISH", owner: true }), true);
  assert.equal(teacherTrainingMaterialTransitionAllowed({ state: "PUBLISHED", decision: "ARCHIVE", owner: false }), false);
});

test("an updated teacher training draft returns to draft state", () => {
  assert.equal(
    teacherTrainingMaterialState([
      TRAINING_MATERIAL_ACTION.DRAFT_UPDATED,
      TRAINING_MATERIAL_ACTION.NEEDS_REVISION,
      TRAINING_MATERIAL_ACTION.SUBMITTED,
      TRAINING_MATERIAL_ACTION.DRAFT,
    ]),
    "DRAFT",
  );
});

test("teacher lead quality desk has no finance or payroll data dependency", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/teacher/lead/quality/page.tsx"), "utf8");
  assert.doesNotMatch(source, /teacher-payroll|partner-settlement|finance\/|payment-details|bankAccount|courseRates/);
  assert.match(source, /requireTeacherLead/);
  assert.match(source, /isSessionFullyCancelled/);
  assert.match(source, /Cancelled and excluded/);
});

test("teacher quality excludes fully cancelled sessions but retains partially active classes", () => {
  const oneToOne = {
    studentId: "student-1",
    student: { id: "student-1", name: "Student One" },
    attendances: [{ studentId: "student-1", status: "EXCUSED" }],
    class: { capacity: 1, oneOnOneStudentId: "student-1", enrollments: [] },
  };
  assert.equal(isSessionFullyCancelled(oneToOne), true);
  assert.equal(getSessionTeachingState(oneToOne), "FULLY_CANCELLED");
  assert.equal(isStudentCancelledForSession(oneToOne, "student-1"), true);

  const group = {
    attendances: [{ studentId: "student-1", status: "EXCUSED" }],
    class: {
      capacity: 2,
      enrollments: [
        { studentId: "student-1", student: { id: "student-1", name: "Student One" } },
        { studentId: "student-2", student: { id: "student-2", name: "Student Two" } },
      ],
    },
  };
  assert.equal(isSessionFullyCancelled(group), false);
  assert.equal(getSessionTeachingState(group), "PARTIALLY_CANCELLED");
  assert.deepEqual(getVisibleSessionStudentNames(group), ["Student Two"]);
});

test("teacher quality only accepts final feedback from the responsible teacher", () => {
  assert.equal(resolveTeacherQualityFeedbackState([], "teacher-1"), "MISSING");
  assert.equal(
    resolveTeacherQualityFeedbackState([{ teacherId: "teacher-2", isProxyDraft: false, status: "ON_TIME" }], "teacher-1"),
    "MISSING",
  );
  assert.equal(
    resolveTeacherQualityFeedbackState([{ teacherId: "teacher-1", isProxyDraft: true, status: "PROXY_DRAFT" }], "teacher-1"),
    "PROXY_DRAFT",
  );
  assert.equal(
    resolveTeacherQualityFeedbackState([{ teacherId: "teacher-1", isProxyDraft: false, status: "LATE" }], "teacher-1"),
    "SUBMITTED",
  );
});

test("training sign-off loads teacher rows for teacher leads and rechecks target role on save", () => {
  const manage = fs.readFileSync(path.join(process.cwd(), "app/training/manage/page.tsx"), "utf8");
  const actions = fs.readFileSync(path.join(process.cwd(), "app/training/actions.ts"), "utf8");
  assert.match(manage, /manager \? \{ role: \{ not: "STUDENT" \} \} : \{ role: "TEACHER" \}/);
  assert.match(actions, /canReviewTrainingTarget\(reviewer, progress\.user\.role\)/);
});

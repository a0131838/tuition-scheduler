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
});

test("training sign-off loads teacher rows for teacher leads and rechecks target role on save", () => {
  const manage = fs.readFileSync(path.join(process.cwd(), "app/training/manage/page.tsx"), "utf8");
  const actions = fs.readFileSync(path.join(process.cwd(), "app/training/actions.ts"), "utf8");
  assert.match(manage, /manager \? \{ role: \{ not: "STUDENT" \} \} : \{ role: "TEACHER" \}/);
  assert.match(actions, /canReviewTrainingTarget\(reviewer, progress\.user\.role\)/);
});

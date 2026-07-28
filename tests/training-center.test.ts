import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findTrainingModule, gradeTrainingQuiz, TRAINING_MODULES, trainingModulesForRole } from "../lib/training-center";

test("training module codes and versions are unique", () => {
  const keys = TRAINING_MODULES.map((item) => `${item.code}:${item.version}`);
  assert.equal(new Set(keys).size, keys.length);
});

test("every module has five questions and a PDF", () => {
  for (const item of TRAINING_MODULES) {
    assert.equal(item.questions.length, 5);
    assert.match(item.pdfFile, /\.pdf$/);
    assert.equal(fs.existsSync(path.join(process.cwd(), "output", "pdf", item.pdfFile)), true, item.pdfFile);
    assert.ok(item.practicalTask.length >= 10);
  }
});

test("role filtering keeps teacher and finance training isolated", () => {
  assert.ok(trainingModulesForRole("TEACHER").every((item) => item.roles.includes("TEACHER")));
  assert.ok(trainingModulesForRole("FINANCE").every((item) => item.roles.includes("FINANCE")));
  assert.equal(trainingModulesForRole("STUDENT").length, 0);
});

test("quiz grading requires every answer and passes correct answers", () => {
  const item = findTrainingModule("TEACHER_MINIAPP");
  assert.ok(item);
  assert.equal(gradeTrainingQuiz(item.code, item.questions.map((question) => question.answer)), 100);
  assert.equal(gradeTrainingQuiz(item.code, [0]), null);
});

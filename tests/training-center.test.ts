import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canAccessTrainingModule,
  findTrainingModule,
  gradeTrainingQuiz,
  TRAINING_RELEASE_VERSION,
  TRAINING_MODULES,
  trainingModulesForRole,
  trainingModulesForUser,
  trainingModuleProgressState,
  trainingRolesForUser,
} from "../lib/training-center";
import { operationAreaForRoute, OPERATION_AREAS } from "../lib/training-operation-coverage";

test("training module codes and versions are unique", () => {
  const keys = TRAINING_MODULES.map((item) => `${item.code}:${item.version}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(TRAINING_RELEASE_VERSION, "20260729");
  assert.ok(TRAINING_MODULES.every((item) => item.version === TRAINING_RELEASE_VERSION));
});

test("every module has complete Chinese and English training content and a PDF", () => {
  for (const item of TRAINING_MODULES) {
    assert.equal(item.questions.length, 5);
    assert.match(item.pdfFile, /\.pdf$/);
    assert.match(item.pdfFile, /中英文/);
    assert.equal(fs.existsSync(path.join(process.cwd(), "output", "pdf", item.pdfFile)), true, item.pdfFile);
    assert.ok(fs.statSync(path.join(process.cwd(), "output", "pdf", item.pdfFile)).size >= 500_000, item.pdfFile);
    assert.ok(item.practicalTask.length >= 10);
    assert.ok(item.practicalTaskEn.length >= 10);
    assert.ok(item.title.length >= 2);
    assert.ok(item.titleEn.length >= 2);
    assert.ok(item.category.length >= 2);
    assert.ok(item.categoryEn.length >= 2);
    for (const question of item.questions) {
      assert.ok(question.promptEn.length >= 10);
      assert.equal(question.optionsEn.length, question.options.length);
    }
  }
});

test("role filtering keeps teacher and finance training isolated", () => {
  assert.ok(trainingModulesForRole("TEACHER").every((item) => item.roles.includes("TEACHER")));
  assert.ok(trainingModulesForRole("FINANCE").every((item) => item.roles.includes("FINANCE")));
  assert.equal(trainingModulesForRole("STUDENT").length, 0);
});

test("additional training roles combine modules without changing the primary role", () => {
  assert.deepEqual(trainingRolesForUser("CS", ["FINANCE", "CS", "STUDENT"]), ["FINANCE", "CS"]);
  const combined = trainingModulesForUser("CS", ["FINANCE"]);
  assert.ok(combined.some((item) => item.code === "ACADEMIC_SCHEDULING_MASTER"));
  assert.ok(combined.some((item) => item.code === "FINANCE_MASTER"));
  assert.equal(canAccessTrainingModule("CS", ["FINANCE"], "FINANCE_MASTER"), true);
  assert.equal(canAccessTrainingModule("CS", [], "FINANCE_MASTER"), false);
  assert.deepEqual(trainingModulesForUser("STUDENT", ["ADMIN"]), []);
});

test("quiz grading requires every answer and passes correct answers", () => {
  const item = findTrainingModule("TEACHER_MINIAPP");
  assert.ok(item);
  assert.equal(gradeTrainingQuiz(item.code, item.questions.map((question) => question.answer)), 100);
  assert.equal(gradeTrainingQuiz(item.code, [0]), null);
});

test("manager overview distinguishes not started, active, pending review, and complete modules", () => {
  assert.equal(trainingModuleProgressState(null), "NOT_STARTED");
  assert.equal(trainingModuleProgressState({
    readAt: new Date(),
    quizPassedAt: null,
    practicalStatus: "NOT_STARTED",
  }), "IN_PROGRESS");
  assert.equal(trainingModuleProgressState({
    readAt: new Date(),
    quizPassedAt: new Date(),
    practicalStatus: "NEEDS_REWORK",
  }), "IN_PROGRESS");
  assert.equal(trainingModuleProgressState({
    readAt: new Date(),
    quizPassedAt: new Date(),
    practicalStatus: "SUBMITTED",
  }), "PENDING_REVIEW");
  assert.equal(trainingModuleProgressState({
    readAt: new Date(),
    quizPassedAt: new Date(),
    practicalStatus: "APPROVED",
  }), "COMPLETED");
});

test("every visible app page is assigned to an operation flow", () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  const webRoutes = walk(path.join(process.cwd(), "app"))
    .filter((file) => file.endsWith("page.tsx"))
    .map((file) => {
      const relative = path.relative(path.join(process.cwd(), "app"), file).replaceAll(path.sep, "/");
      const route = relative.replace(/\/?page\.tsx$/, "");
      return route ? `/${route}` : "/";
    });
  const miniapp = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "miniapp", "boss-academic-parent", "app.json"), "utf8")
  ) as { pages: string[] };
  const routes = [...webRoutes, ...miniapp.pages.map((page) => `/miniapp/${page}`)];
  assert.ok(webRoutes.length >= 140);
  assert.equal(miniapp.pages.length, 54);
  assert.ok(routes.length >= 198);
  assert.equal(routes.filter((route) => !operationAreaForRoute(route)).length, 0);
  assert.ok(OPERATION_AREAS.length >= 15);
});

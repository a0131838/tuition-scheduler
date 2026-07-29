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
  assert.equal(TRAINING_MODULES.length, 29);
  const keys = TRAINING_MODULES.map((item) => `${item.code}:${item.version}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(TRAINING_RELEASE_VERSION, "20260729B");
  assert.ok(TRAINING_MODULES.every((item) => item.version === TRAINING_RELEASE_VERSION));
  assert.equal(new Set(TRAINING_MODULES.map((item) => item.questions[0].prompt)).size, TRAINING_MODULES.length);
  assert.deepEqual(TRAINING_MODULES[0].questions.map((question) => question.answer), [1, 2, 0, 1, 2]);
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
    assert.equal(item.learningObjectives.length, 3);
    assert.equal(item.learningObjectivesEn.length, 3);
    assert.equal(item.managerRubric.length, 4);
    assert.equal(item.managerRubricEn.length, 4);
    assert.ok(item.estimatedMinutes >= 30);
    for (const question of item.questions) {
      assert.ok(question.promptEn.length >= 10);
      assert.equal(question.optionsEn.length, question.options.length);
    }
  }
});

test("every generated training HTML references screenshots that exist beside docs", () => {
  const htmlFiles = fs.readdirSync(path.join(process.cwd(), "docs"))
    .filter((name) => name.endsWith(".html") && name.includes("中英文培训版"));

  for (const name of htmlFiles) {
    const html = fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");
    for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      const src = match[1];
      if (src.startsWith("data:") || src.startsWith("http:") || src.startsWith("https:")) continue;
      assert.equal(
        fs.existsSync(path.resolve(process.cwd(), "docs", src)),
        true,
        `${name}: missing screenshot ${src}`
      );
    }
  }
});

test("new mini program guides use workflow-specific evidence and state unsupported boundaries", () => {
  const readGuide = (name: string) =>
    fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");

  const staffBinding = readGuide("SOP-小程序-全员工-登录绑定与账号切换-中英文培训版-20260729.html");
  assert.match(staffBinding, /sop-miniapp-binding-20260729\/annotated\/05-staff-account-row/);
  assert.match(staffBinding, /sop-miniapp-binding-20260729\/annotated\/04-staff-bind/);

  const parentBinding = readGuide("SOP-小程序-教务家长-邀请与绑定-中英文培训版-20260729.html");
  assert.match(parentBinding, /\/pages\/bind\/bind/);
  assert.match(parentBinding, /02-parent-bind/);
  assert.match(parentBinding, /08-parent-permissions/);

  const financeBoundary = readGuide("SOP-小程序-财务-审批工资报销与异常-中英文培训版-20260729.html");
  assert.match(financeBoundary, /no dedicated Finance approvals, payroll, or claims workspace/);
  assert.match(financeBoundary, /web Finance Workbench/);

  const fullCareBoundary = readGuide("SOP-小程序-全托管-学生进度风险与交接-中英文培训版-20260729.html");
  assert.match(fullCareBoundary, /native Full Care activity, task, risk-editing, and report-publishing pages are not currently available/);
  assert.match(fullCareBoundary, /web Full Care workspace/);
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
  assert.equal(canAccessTrainingModule("SALES", [], "SALES_MINIAPP"), true);
  assert.equal(canAccessTrainingModule("CS", [], "PARENT_MINIAPP_BINDING"), true);
  assert.equal(canAccessTrainingModule("TEACHER", [], "PARENT_MINIAPP_BINDING"), false);
  assert.equal(canAccessTrainingModule("FINANCE", [], "FINANCE_MINIAPP"), true);
  assert.equal(canAccessTrainingModule("TEACHER", [], "FINANCE_MINIAPP"), false);
});

test("practical submission and manager sign-off enforce structured HR evidence", () => {
  const actions = fs.readFileSync(path.join(process.cwd(), "app", "training", "actions.ts"), "utf8");
  assert.match(actions, /trainingData/);
  assert.match(actions, /finalResult/);
  assert.match(actions, /selfCheck/);
  assert.match(actions, /Complete reading and pass the quiz/);
  assert.match(actions, /rubricConfirmed/);
  assert.match(actions, /cannot sign off their own practical training/);
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

test("parent portal invites point to the registered mini program bind page", () => {
  const inviteRoute = fs.readFileSync(
    path.join(process.cwd(), "app", "api", "admin", "students", "[id]", "parent-portal", "invites", "route.ts"),
    "utf8"
  );
  const miniapp = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "miniapp", "boss-academic-parent", "app.json"), "utf8")
  ) as { pages: string[] };

  assert.ok(miniapp.pages.includes("pages/bind/bind"));
  assert.match(inviteRoute, /`\/pages\/bind\/bind\?token=/);
  assert.doesNotMatch(inviteRoute, /pages\/bind\/index/);
});

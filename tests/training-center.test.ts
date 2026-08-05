import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canAccessTrainingModule,
  ACADEMIC_SCHEDULING_TRAINING_VERSION,
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
  assert.equal(TRAINING_MODULES.length, 35);
  const keys = TRAINING_MODULES.map((item) => `${item.code}:${item.version}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(TRAINING_RELEASE_VERSION, "20260803A");
  assert.equal(ACADEMIC_SCHEDULING_TRAINING_VERSION, "20260803C");
  assert.equal(findTrainingModule("ACADEMIC_SCHEDULING_MASTER")?.version, ACADEMIC_SCHEDULING_TRAINING_VERSION);
  assert.ok(TRAINING_MODULES.filter((item) => item.code !== "ACADEMIC_SCHEDULING_MASTER").every((item) => item.version === TRAINING_RELEASE_VERSION));
  assert.equal(TRAINING_MODULES.filter((item) => item.platform === "WEB").length, 26);
  assert.equal(TRAINING_MODULES.filter((item) => item.platform === "MINIAPP").length, 9);
  assert.equal(new Set(TRAINING_MODULES.map((item) => item.questions[0].prompt)).size, TRAINING_MODULES.length);
  assert.deepEqual(TRAINING_MODULES[0].questions.map((question) => question.answer), [1, 2, 0, 1, 2]);
});

test("academic web scheduling guide covers every high-risk scheduling path with web evidence", () => {
  const module = findTrainingModule("ACADEMIC_SCHEDULING_MASTER");
  assert.equal(module?.platform, "WEB");
  assert.equal(module?.estimatedMinutes, 120);
  const html = fs.readFileSync(
    path.join(process.cwd(), "docs", "SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260803.html"),
    "utf8"
  );
  for (const expected of [
    "首次排课", "续排", "Reschedule Existing Session", "取消、请假或换老师", "Conflict Center", "Daily Handover",
    "ACADEMIC_SCHEDULING_MASTER · WEB", "20260803C", "Full List / 完整列表", "Apply / 应用",
  ]) assert.match(html, new RegExp(expected));
  assert.doesNotMatch(html, /sop-小程序员工工作台/);
  assert.match(html, /sop-academic-scheduling-20260803\/annotated\/06-quick-schedule/);
  assert.match(html, /sop-academic-scheduling-20260803\/annotated\/11-reschedule-modal/);
  assert.match(html, /sop-academic-scheduling-20260803\/annotated\/12-dashboard-click-students/);
  assert.match(html, /sop-academic-scheduling-20260803\/annotated\/14-student-search-click-path/);
  assert.match(html, /sop-academic-scheduling-20260803\/annotated\/15-student-click-quick-schedule/);
  assert.equal((html.match(/中文流程 · 第/g) ?? []).length, 22);
  assert.equal((html.match(/ENGLISH WORKFLOW · STEP/g) ?? []).length, 22);
  const webCatalogue = fs.readFileSync(path.join(process.cwd(), "docs", "SOP-网页端逐功能培训目录-中英文版-20260803.html"), "utf8");
  assert.match(webCatalogue, /教务网页端排课：首次排课、续排、调课与异常闭环/);
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

test("every current training HTML separates Chinese and English and references valid screenshots", () => {
  const htmlFiles = fs.readdirSync(path.join(process.cwd(), "docs"))
    .filter((name) => name.endsWith("20260803.html") && name.includes("中英文"));

  assert.equal(htmlFiles.length, 37);

  for (const name of htmlFiles) {
    const html = fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");
    assert.match(html, /中文版到此结束/);
    assert.match(html, /English (?:section|catalogue) starts on the next page/);
    assert.ok(html.indexOf("中文版到此结束") < html.lastIndexOf("ENGLISH"), name);
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

  const staffBinding = readGuide("SOP-小程序-全员工-登录绑定与账号切换-中英文培训版-20260803.html");
  assert.match(staffBinding, /sop-miniapp-binding-20260729\/annotated\/05-staff-account-row/);
  assert.match(staffBinding, /sop-miniapp-binding-20260729\/annotated\/04-staff-bind/);

  const parentBinding = readGuide("SOP-小程序-教务家长-邀请与绑定-中英文培训版-20260803.html");
  assert.match(parentBinding, /\/pages\/bind\/bind/);
  assert.match(parentBinding, /02-parent-bind/);
  assert.match(parentBinding, /08-parent-permissions/);

  const financeBoundary = readGuide("SOP-小程序-财务-审批工资报销与异常-中英文培训版-20260803.html");
  assert.match(financeBoundary, /no dedicated Finance approvals, payroll, or claims workspace/);
  assert.match(financeBoundary, /web Finance Workbench/);

  const fullCareBoundary = readGuide("SOP-小程序-全托管-学生进度风险与交接-中英文培训版-20260803.html");
  assert.match(fullCareBoundary, /native Full Care activity, task, risk-editing, and report-publishing pages are not currently available/);
  assert.match(fullCareBoundary, /web Full Care workspace/);
});

test("academic beginner guides use student-record and teacher-coordination evidence", () => {
  const readGuide = (name: string) =>
    fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");

  const studentRecords = readGuide("SOP-教务-每日开工学生建档与Student360-中英文培训版-20260803.html");
  assert.doesNotMatch(studentRecords, /sop-小程序员工工作台/);
  assert.match(studentRecords, /网页端 WEB/);
  assert.match(studentRecords, /Student 360/);
  assert.match(studentRecords, /duplicate/i);

  const teacherCoordination = readGuide("SOP-教务-老师协调可用时间例外与交接-中英文培训版-20260803.html");
  assert.match(teacherCoordination, /sop-teacher-complete-20260729\/annotated\/03-availability/);
  assert.match(teacherCoordination, /sop-teacher-complete-20260729\/annotated\/04-scheduling-exceptions/);
  assert.match(teacherCoordination, /teacher reply/i);
});

test("role filtering keeps teacher and finance training isolated", () => {
  assert.ok(trainingModulesForRole("TEACHER").every((item) => item.roles.includes("TEACHER")));
  assert.equal(trainingModulesForRole("TEACHER").length, 11);
  assert.ok(trainingModulesForRole("FINANCE").every((item) => item.roles.includes("FINANCE")));
  assert.equal(trainingModulesForRole("STUDENT").length, 0);
});

test("academic staff receive the complete 20-module curriculum without unrelated role access", () => {
  const modules = trainingModulesForRole("CS");
  const codes = new Set(modules.map((item) => item.code));
  assert.equal(modules.length, 20);
  for (const code of [
    "ACADEMIC_SCHEDULING_MASTER",
    "ACADEMIC_DAILY_STUDENT_RECORDS",
    "ACADEMIC_TEACHER_COORDINATION",
    "CONTRACT_PACKAGE_GATE_MASTER",
    "ATTENDANCE_EXCEPTION_MASTER",
    "SHARED_PACKAGE_COURSE",
    "XZS_PACKAGE",
    "XZS_SETTLEMENT",
    "SCHOOL_APPLICATION",
    "EDUTRUST_SSG",
  ]) {
    assert.equal(codes.has(code), true, code);
  }
  assert.equal(codes.has("FINANCE_MASTER"), false);
  assert.equal(codes.has("TEACHER_REPORTS_ASSESSMENTS"), false);
});

test("administrator has full training-library oversight, including teacher-only modules", () => {
  assert.equal(trainingModulesForRole("ADMIN").length, TRAINING_MODULES.length);
  assert.equal(trainingModulesForUser("ADMIN").length, TRAINING_MODULES.length);
  assert.equal(canAccessTrainingModule("ADMIN", [], "TEACHER_MINIAPP"), true);
  assert.equal(canAccessTrainingModule("ADMIN", [], "TEACHER_REPORTS_ASSESSMENTS"), true);
});

test("teacher curriculum covers the complete daily, scheduling, academic-record, and finance loops", () => {
  const codes = new Set(trainingModulesForRole("TEACHER").map((item) => item.code));
  for (const code of [
    "TEACHER_ONBOARDING_PROFILE",
    "TEACHER_AVAILABILITY_SCHEDULING",
    "TEACHER_REPORTS_ASSESSMENTS",
    "TEACHER_EXPENSES_PAYROLL",
  ]) {
    assert.equal(codes.has(code), true, code);
  }
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
  assert.equal(miniapp.pages.length, 61);
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

test("teacher portal blocks unlinked accounts without guessing a profile", () => {
  const authSource = fs.readFileSync(path.join(process.cwd(), "lib", "auth.ts"), "utf8");
  const profilePage = fs.readFileSync(
    path.join(process.cwd(), "app", "teacher", "profile-required", "page.tsx"),
    "utf8"
  );
  const createUserRoute = fs.readFileSync(
    path.join(process.cwd(), "app", "api", "admin", "manager", "users", "route.ts"),
    "utf8"
  );
  const updateUserRoute = fs.readFileSync(
    path.join(process.cwd(), "app", "api", "admin", "manager", "users", "[id]", "route.ts"),
    "utf8"
  );

  assert.match(authSource, /redirect\("\/teacher\/profile-required"\)/);
  assert.doesNotMatch(authSource, /teacherByName/);
  assert.doesNotMatch(authSource, /teacher:\s*null/);
  assert.match(profilePage, /Teacher profile not linked/);
  assert.match(profilePage, /尚未绑定教师档案/);
  assert.match(createUserRoute, /Teacher role requires a linked teacher profile/);
  assert.match(updateUserRoute, /Teacher role requires a linked teacher profile/);
});

test("training PDF delivery supports length and private revalidation", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app", "api", "training", "sops", "[code]", "route.ts"),
    "utf8"
  );

  assert.match(route, /"content-length": String\(file\.byteLength\)/);
  assert.match(route, /private, max-age=3600, must-revalidate/);
  assert.match(route, /if-none-match/);
  assert.match(route, /status: 304/);
  assert.match(route, /canAccessTrainingModule/);
});

test("training centre separates web and mini program libraries and serves both catalogues", () => {
  const trainingPage = fs.readFileSync(path.join(process.cwd(), "app", "training", "page.tsx"), "utf8");
  const libraryPage = fs.readFileSync(path.join(process.cwd(), "app", "training", "library", "page.tsx"), "utf8");
  const catalogueRoute = fs.readFileSync(
    path.join(process.cwd(), "app", "api", "training", "catalogs", "[platform]", "route.ts"),
    "utf8"
  );

  assert.match(trainingPage, /Web System Training/);
  assert.match(trainingPage, /WeChat Mini Program Training/);
  assert.match(libraryPage, /api\/training\/catalogs\/web/);
  assert.match(libraryPage, /api\/training\/catalogs\/miniapp/);
  assert.match(libraryPage, /item\.platform === platform/);
  assert.match(catalogueRoute, /00-SGT网页端逐功能培训目录/);
  assert.match(catalogueRoute, /00-SGT小程序逐功能培训目录/);
  assert.match(catalogueRoute, /user\.role === "STUDENT"/);
});

test("login and mobile language controls keep native and narrow-screen semantics", () => {
  const login = fs.readFileSync(
    path.join(process.cwd(), "app", "admin", "login", "_components", "AdminLoginClient.tsx"),
    "utf8"
  );
  const responsive = fs.readFileSync(path.join(process.cwd(), "app", "responsive-layout.css"), "utf8");
  const favicon = fs.readFileSync(path.join(process.cwd(), "app", "favicon.ico", "route.ts"), "utf8");

  assert.match(login, /<form/);
  assert.match(login, /type="submit"/);
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(responsive, /\.language-selector button/);
  assert.match(responsive, /white-space: nowrap !important/);
  assert.match(favicon, /image\/svg\+xml/);
});

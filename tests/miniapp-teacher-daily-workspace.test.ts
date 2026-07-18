import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("teacher miniapp payroll reuses the existing calculation and audited confirmation", () => {
  const route = read("app/api/miniapp/staff/teacher/payroll/route.ts");
  const page = read("miniapp/boss-academic-parent/pages/staff-teacher-payroll/staff-teacher-payroll.js");
  const markup = read("miniapp/boss-academic-parent/pages/staff-teacher-payroll/staff-teacher-payroll.wxml");

  assert.match(route, /loadTeacherPayrollDetail/);
  assert.match(route, /confirmTeacherPayroll/);
  assert.match(route, /teacherId: access\.teacherId/);
  assert.match(route, /acknowledged !== true/);
  assert.match(page, /确认后将进入管理审批/);
  assert.match(markup, /我已核对，确认工资单/);
});

test("teacher feedback history is limited to students linked through the teacher's sessions", () => {
  const route = read("app/api/miniapp/staff/teacher/student-feedbacks/route.ts");
  const markup = read("miniapp/boss-academic-parent/pages/staff-teacher-feedbacks/staff-teacher-feedbacks.wxml");

  assert.match(route, /OR: \[\{ teacherId \}, \{ teacherId: null, class: \{ teacherId \} \}\]/);
  assert.match(route, /if \(selectedStudentId && !studentMap\.has\(selectedStudentId\)\)/);
  assert.match(route, /teacherFeedbackRead\.createMany/);
  assert.match(route, /READ_TIMELINE_MINIAPP/);
  assert.match(markup, /历任老师正式课后反馈/);
  assert.match(markup, /本节课重点/);
});

test("teacher todo endpoint aggregates only the signed-in teacher's actionable work", () => {
  const route = read("app/api/miniapp/staff/teacher/todos/route.ts");
  const home = read("miniapp/boss-academic-parent/pages/staff-home/staff-home.js");
  const markup = read("miniapp/boss-academic-parent/pages/staff-teacher-todos/staff-teacher-todos.wxml");

  assert.match(route, /requireMiniappTeacher/);
  assert.match(route, /submitterUserId: access\.user\.id/);
  assert.match(route, /teacherId: access\.teacherId/);
  assert.match(route, /payrollPending/);
  assert.match(home, /priorityTarget: hasUrgent \? "teacher-todos"/);
  assert.match(markup, /工资、点名、反馈和报销集中处理/);
});

test("staff request attachments offer separate album and WeChat-file choices", () => {
  const page = read("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.js");
  const markup = read("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.wxml");

  assert.match(page, /wx\.chooseMedia/);
  assert.match(page, /sourceType: \["album"\]/);
  assert.match(page, /wx\.chooseMessageFile/);
  assert.match(page, /previewImage/);
  assert.match(page, /removeFile/);
  assert.match(markup, /从相册选择截图/);
  assert.match(markup, /从微信聊天选择文件/);
});

test("teacher workbench exposes payroll, student feedback and the unified todo entry", () => {
  const config = read("miniapp/boss-academic-parent/app.json");
  const home = read("miniapp/boss-academic-parent/pages/staff-home/staff-home.wxml");

  assert.match(config, /staff-teacher-payroll/);
  assert.match(config, /staff-teacher-feedbacks/);
  assert.match(config, /staff-teacher-todos/);
  assert.match(home, /我的待办/);
  assert.match(home, /我的工资单/);
  assert.match(home, /学生历史反馈/);
});

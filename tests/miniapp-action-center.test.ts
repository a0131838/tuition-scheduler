import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canUseMiniappAcademicDesk,
  canUseMiniappLeadDesk,
  operationLabel,
  summarizeAuditMeta,
} from "../lib/miniapp-staff-action-center";

const root = path.join(process.cwd(), "miniapp", "boss-academic-parent");
const readMiniapp = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readProject = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("mobile desks preserve academic, sales and teacher role boundaries", () => {
  const academic = { id: "1", email: "eva@example.com", name: "Eva", role: "CS", workspaceAccesses: [] };
  const sales = { id: "2", email: "sales@example.com", name: "Sales", role: "SALES", workspaceAccesses: [] };
  const teacher = { id: "3", email: "teacher@example.com", name: "Teacher", role: "TEACHER", teacherId: "t1", workspaceAccesses: [] };
  const jasmineTeacher = { ...teacher, workspaceAccesses: [{ workspace: "CS" }] };

  assert.equal(canUseMiniappAcademicDesk(academic), true);
  assert.equal(canUseMiniappAcademicDesk(teacher), false);
  assert.equal(canUseMiniappAcademicDesk(jasmineTeacher), true);
  assert.equal(canUseMiniappLeadDesk(sales), true);
  assert.equal(canUseMiniappLeadDesk(teacher), false);
});

test("operation summaries redact credentials and provide readable labels", () => {
  const summary = summarizeAuditMeta({ token: "secret", password: "secret", studentName: "Emily", count: 2 });
  assert.deepEqual(summary, [{ key: "studentName", value: "Emily" }, { key: "count", value: "2" }]);
  assert.equal(operationLabel("schedule", "replace-teacher"), "更换老师");
  assert.equal(operationLabel("TEACHER_PAYROLL", "MANAGER_APPROVE"), "审批老师工资");
});

test("miniapp registers all six mobile action center surfaces", () => {
  const config = readMiniapp("app.json");
  const home = readMiniapp("pages/staff-home/staff-home.wxml");
  for (const page of [
    "staff-action-center",
    "staff-student-workspace",
    "staff-operations",
    "staff-approvals",
    "staff-leads",
    "staff-teacher-reports",
  ]) {
    assert.match(config, new RegExp(`pages/${page}/${page}`));
  }
  for (const label of ["统一待办", "学生360°", "管理审批中心", "新咨询快速录入", "操作日志与纠正", "通知与教学报告"]) {
    assert.match(home, new RegExp(label));
  }
});

test("new staff workspaces avoid complex WXML expressions that can blank native pages", () => {
  for (const page of [
    "staff-action-center",
    "staff-student-workspace",
    "staff-operations",
    "staff-approvals",
    "staff-leads",
    "staff-teacher-reports",
  ]) {
    const wxml = readMiniapp(`pages/${page}/${page}.wxml`);
    assert.doesNotMatch(wxml, /\{\{[^}]*(?:&&|\|\||===|!==|>=|<=|\?|!)/, page);
  }
});

test("unified teacher action center includes existing payroll and lesson obligations", () => {
  const route = readProject("app/api/miniapp/staff/action-center/route.ts");
  assert.match(route, /getTeacherPayrollPublishForTeacher/);
  assert.match(route, /attendancePending/);
  assert.match(route, /lessonFeedbackPending/);
  assert.match(route, /unreadOtherFeedback/);
});

test("teacher student search and report writes are scoped by linked teacher", () => {
  const studentSearch = readProject("app/api/miniapp/staff/students/route.ts");
  const studentWorkspace = readProject("app/api/miniapp/staff/students/[studentId]/workspace/route.ts");
  const reports = readProject("app/api/miniapp/staff/teacher/reports/route.ts");

  assert.match(studentSearch, /auth\.user\.role === "TEACHER"/);
  assert.match(studentSearch, /auth\.user\.teacherId/);
  assert.match(studentWorkspace, /Student not assigned to this teacher/);
  assert.match(reports, /requireMiniappTeacher/);
  assert.match(reports, /teacherId: access\.teacherId/);
  assert.match(reports, /Report is read only/);
});

test("mobile approvals reuse existing guarded approval functions", () => {
  const route = readProject("app/api/miniapp/staff/approvals/route.ts");
  assert.match(route, /approvePackageInvoiceApproval/);
  assert.match(route, /approveExpenseClaim/);
  assert.match(route, /managerApproveTeacherPayroll/);
  assert.match(route, /canApproveExpense/);
  assert.match(route, /isRoleApprover/);
});

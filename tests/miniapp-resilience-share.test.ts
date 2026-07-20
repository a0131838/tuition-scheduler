import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("feedback attachment migration is additive and isolated", async () => {
  const sql = await source("prisma/migrations/20260720090000_add_session_feedback_attachments/migration.sql");
  assert.match(sql, /CREATE TABLE "SessionFeedbackAttachment"/);
  assert.match(sql, /REFERENCES "SessionFeedback"/);
  assert.doesNotMatch(sql, /`/);
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(sql, /(?:^|;)\s*(?:UPDATE|DELETE\s+FROM|TRUNCATE)\s+/im);
});

test("teacher feedback supports parent-visible and internal attachments", async () => {
  const markup = await source("miniapp/boss-academic-parent/pages/staff-session-detail/staff-session-detail.wxml");
  const route = await source("app/api/miniapp/staff/schedule/[sessionId]/feedback/attachments/route.ts");
  assert.match(markup, /作业与课堂附件/);
  assert.match(markup, /家长可见/);
  assert.match(markup, /仅员工可见/);
  assert.match(route, /toUpperCase\(\) === "INTERNAL" \? "INTERNAL" : "PARENT"/);
  assert.match(route, /canManageMiniappSchedulingCoordination/);
});

test("communication workbench can share an exact miniapp destination", async () => {
  const script = await source("miniapp/boss-academic-parent/pages/staff-communications/staff-communications.js");
  const markup = await source("miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxml");
  const service = await source("lib/parent-communication-center.ts");
  assert.match(markup, /open-type="share"/);
  assert.match(script, /onShareAppMessage/);
  assert.match(script, /feedbackId=/);
  assert.match(script, /action: "share_card"/);
  assert.match(service, /SHARE_MINIAPP_CARD/);
});

test("high-value staff forms retain drafts and avoid duplicate tickets on upload retry", async () => {
  const request = await source("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.js");
  const feedback = await source("miniapp/boss-academic-parent/pages/staff-session-detail/staff-session-detail.js");
  assert.match(request, /REQUEST_DRAFT_KEY/);
  assert.match(request, /createdRequestId/);
  assert.match(request, /Promise\.resolve\(\{ request:/);
  assert.match(feedback, /feedbackDraftKey/);
  assert.match(feedback, /pendingFeedbackAttachments/);
});

test("staff can report a problem with automatic client context", async () => {
  const page = await source("miniapp/boss-academic-parent/pages/staff-issue-report/staff-issue-report.js");
  const route = await source("app/api/miniapp/staff/issues/route.ts");
  assert.match(page, /recentOperations/);
  assert.match(page, /getSystemInfoSync/);
  assert.match(route, /REPORT_MINIAPP_ISSUE/);
  assert.match(route, /type: "系统问题"/);
});

test("management health page is role-gated and linked from manager home", async () => {
  const route = await source("app/api/miniapp/staff/health/route.ts");
  const home = await source("miniapp/boss-academic-parent/pages/staff-home/staff-home.wxml");
  assert.match(route, /canUseMiniappApprovalDesk/);
  assert.match(home, /wx:if="\{\{isManager\}\}" bindtap="goHealth"/);
  assert.match(home, /运营健康看板/);
});

test("sensitive student and payroll reads are audited", async () => {
  const workspace = await source("app/api/miniapp/staff/students/[studentId]/workspace/route.ts");
  const payroll = await source("app/api/miniapp/staff/teacher/payroll/route.ts");
  assert.match(workspace, /VIEW_STUDENT_360/);
  assert.match(workspace, /privacyNotice/);
  assert.match(payroll, /VIEW_MINIAPP_PAYROLL/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  createAiTicketExecutionToken,
  canExecuteAiTicketPackage,
  parseAiTicketExecutionRequest,
  verifyAiTicketExecutionToken,
} from "../lib/ai-ticket-execution";
import { validateTicketNewSessionBatchShape } from "../lib/miniapp-ticket-new-session";
import { readFileSync } from "node:fs";

const secret = "test-ai-ticket-execution-secret-32-characters";
const request = {
  version: "SGT_AI_TICKET_EXECUTION_V1",
  ticketId: "T-1",
  formalSourceVersion: "v1",
  formalUpdatedAt: "2026-08-11T00:00:00.000Z",
  workflowKey: "CANCEL_LESSON",
  idempotencyKey: "package-1",
  commands: [{ commandType: "CANCEL_SESSION", idempotencyKey: "command-1", sessionId: "S-1", studentId: "ST-1", charge: false, note: "家长提前请假" }],
};

test("AI ticket package is allowlisted and bound to the route ticket", () => {
  const parsed = parseAiTicketExecutionRequest(request, "T-1");
  assert.equal(parsed.commands[0].commandType, "CANCEL_SESSION");
  assert.throws(() => parseAiTicketExecutionRequest({ ...request, commands: [{ ...request.commands[0], commandType: "RAW_SQL" }] }, "T-1"), /not allowed/);
  assert.throws(() => parseAiTicketExecutionRequest(request, "T-2"), /does not match/);
  assert.throws(() => parseAiTicketExecutionRequest({ ...request, workflowKey: "ACADEMIC_CASE" }, "T-1"), /does not match workflow/);
});

test("remaining ticket workflows use typed commands instead of arbitrary writes", () => {
  const service = parseAiTicketExecutionRequest({
    ...request,
    workflowKey: "NON_ACADEMIC_SERVICE",
    commands: [{
      commandType: "SERVICE_CASE_HANDOFF", idempotencyKey: "service-1", studentId: "ST-1",
      nextAction: "核对接送记录并回访家长", parentPublicSummary: "已进入客服处理。",
    }],
  }, "T-1");
  assert.equal(service.commands[0].commandType, "SERVICE_CASE_HANDOFF");
  assert.throws(() => parseAiTicketExecutionRequest({
    ...request,
    workflowKey: "OPERATION_CORRECTION",
    commands: [{ commandType: "OPERATION_CORRECTION_REVIEW", idempotencyKey: "fix-1", correctionTarget: "FINANCE", beforeAfter: "原来为90，正确应为60", nextAction: "管理审批", parentPublicSummary: "已进入核对。" }],
  }, "T-1"), /evidence is required/);
});

test("formal confirmation token binds actor and every command field", () => {
  const parsed = parseAiTicketExecutionRequest(request, "T-1");
  const token = createAiTicketExecutionToken(parsed, "U-1", secret);
  assert.equal(verifyAiTicketExecutionToken(token, parsed, "U-1", secret), true);
  const changed = parseAiTicketExecutionRequest({ ...request, commands: [{ ...request.commands[0], charge: true }] }, "T-1");
  assert.equal(verifyAiTicketExecutionToken(token, changed, "U-1", secret), false);
  assert.equal(verifyAiTicketExecutionToken(token, parsed, "U-2", secret), false);
  const expired = createAiTicketExecutionToken(parsed, "U-1", secret, Date.now() - 11 * 60_000);
  assert.equal(verifyAiTicketExecutionToken(expired, parsed, "U-1", secret), false);
});

test("formal role matrix keeps scheduling admin-only and scopes every case workflow", () => {
  const parsed = parseAiTicketExecutionRequest(request, "T-1");
  assert.equal(canExecuteAiTicketPackage({ role: "ADMIN" }, parsed), true);
  assert.equal(canExecuteAiTicketPackage({ role: "CS" }, parsed), false);
  assert.equal(canExecuteAiTicketPackage({ role: "FINANCE" }, parsed), false);

  const packageReview = parseAiTicketExecutionRequest({
    ...request,
    workflowKey: "PACKAGE_SALES_ACTIVATION",
    commands: [{ commandType: "PACKAGE_ACTIVATION_REVIEW", idempotencyKey: "package-review-1", label: "家长资料", parentPublicSummary: "请补充资料。" }],
  }, "T-1");
  assert.equal(canExecuteAiTicketPackage({ role: "FINANCE" }, packageReview), true);
  assert.equal(canExecuteAiTicketPackage({ role: "CS" }, packageReview), false);

  const academic = parseAiTicketExecutionRequest({
    ...request,
    workflowKey: "ACADEMIC_CASE",
    commands: [{ commandType: "ACADEMIC_CASE_HANDOFF", idempotencyKey: "academic-1", studentId: "ST-1", nextAction: "核对老师反馈", parentPublicSummary: "教务处理中。" }],
  }, "T-1");
  assert.equal(canExecuteAiTicketPackage({ role: "CS" }, academic), true);
  assert.equal(canExecuteAiTicketPackage({ role: "SALES" }, academic), false);

  const correction = parseAiTicketExecutionRequest({
    ...request,
    workflowKey: "OPERATION_CORRECTION",
    commands: [{ commandType: "OPERATION_CORRECTION_REVIEW", idempotencyKey: "correction-1", correctionTarget: "ATTENDANCE", beforeAfter: "原记录待核，正确记录待审批", evidence: "正式截图", nextAction: "管理审批", parentPublicSummary: "记录复核中。" }],
  }, "T-1");
  assert.equal(canExecuteAiTicketPackage({ role: "ADMIN" }, correction), true);
  assert.equal(canExecuteAiTicketPackage({ role: "CS" }, correction), false);
});

test("whole-month scheduling rejects conflicts inside the proposed batch before database writes", () => {
  const base = {
    ticketId: "T-1", studentId: null, subjectId: "SUB-1", levelId: null, teacherId: "TEA-1", campusId: "C-1", roomId: null,
    startAt: new Date("2026-08-20T08:00:00Z"), durationMin: 60,
  };
  assert.throws(() => validateTicketNewSessionBatchShape({
    ...base,
    occurrences: [
      { ...base, startAt: new Date("2026-08-20T08:00:00Z") },
      { ...base, teacherId: "TEA-2", startAt: new Date("2026-08-20T08:30:00Z") },
    ],
  }), /new lessons conflict|new courses conflict|新课彼此冲突/);
});

test("AI package intake reuses a linked student and correction has no generic write command", () => {
  const intakeSource = readFileSync(new URL("../lib/student-parent-intake.ts", import.meta.url), "utf8");
  const gatewaySource = readFileSync(new URL("../lib/ai-ticket-case-execution.ts", import.meta.url), "utf8");
  assert.match(intakeSource, /current\.studentId\s*\?\s*await tx\.student\.update/);
  assert.doesNotMatch(gatewaySource, /RAW_SQL|UPDATE_ANY_FIELD|attendance\.update|coursePackage\.update/);
  assert.match(gatewaySource, /OPERATION_CORRECTION_REVIEW/);
});

test("staff miniapp keeps unavoidable cancellation and replacement decisions on the final card", () => {
  const pageSource = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.js", import.meta.url), "utf8");
  const pageView = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.wxml", import.meta.url), "utf8");
  const bridgeSource = readFileSync(new URL("../app/api/miniapp/staff/ai-work/route.ts", import.meta.url), "utf8");
  assert.match(pageSource, /resolve_target_session/);
  assert.match(pageSource, /replace-teacher/);
  assert.match(pageView, /不扣课时/);
  assert.match(pageView, /扣课时/);
  assert.match(pageView, /选择资质和时间均通过的替换老师/);
  assert.match(bridgeSource, /newTeacherId/);
  assert.match(bridgeSource, /typeof body\?\.charge === "boolean"/);
});

test("staff AI work shows a direct queue-to-detail flow, complete calendar review, and refreshes stale formal facts", () => {
  const pageSource = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.js", import.meta.url), "utf8");
  const pageView = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.wxml", import.meta.url), "utf8");
  const pageStyle = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.wxss", import.meta.url), "utf8");
  const bridgeSource = readFileSync(new URL("../app/api/miniapp/staff/ai-work/route.ts", import.meta.url), "utf8");
  const executeSource = readFileSync(new URL("../app/api/miniapp/staff/ai-tickets/[ticketId]/execute/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(pageView, /scroll-x/);
  assert.match(pageView, /确认前请核对完整方案/);
  assert.match(pageView, /month-grid/);
  assert.match(pageView, /学生其他课程/);
  assert.match(pageView, /原课程（将移走）/);
  assert.match(pageView, /调整后的课程/);
  assert.match(pageStyle, /flex-direction:column/);
  assert.match(pageView, /wx:if="\{\{!selected && items\.length\}\}"/);
  assert.match(pageView, /bindtap="backToQueue"/);
  assert.match(pageView, /bindtap="handleBack"/);
  assert.match(pageSource, /if \(!this\.data\.selected\) return wx\.navigateBack/);
  assert.match(pageSource, /wx\.pageScrollTo\(\{ scrollTop: 0/);
  assert.match(pageSource, /NEW_SCHEDULE:\s*"新学生排课"/);
  assert.match(pageStyle, /background:#ec5e0a!important/);
  assert.match(pageSource, /AI_TICKET_STALE/);
  assert.match(pageSource, /action:\s*"refresh"/);
  assert.match(bridgeSource, /miniapp-ai\/refresh-ticket/);
  assert.match(executeSource, /AI_TICKET_STALE/);
  assert.match(executeSource, /studentChangeCalendar/);
  assert.match(executeSource, /sessionBelongsToStudentWhere/);
  assert.match(executeSource, /calendarSessions/);
  assert.match(pageSource, /preview\.preview\.calendarSessions/);
  assert.match(pageStyle, /\.event\.removed/);
  assert.match(pageSource, /function singaporeDateTimeLabel/);
  assert.match(pageSource, /sessionLabel[\s\S]*singaporeDateTimeLabel\(item\.startAt\)/);
  assert.match(pageSource, /dueLabel:\s*singaporeDateTimeLabel/);
  assert.doesNotMatch(pageSource, /String\(item\.(?:startAt|operation\?\.dueAt)\)\.replace\("T"/);
});

test("new-student multi-subject miniapp keeps an independent three-teacher order per subject", () => {
  const pageSource = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.js", import.meta.url), "utf8");
  const pageView = readFileSync(new URL("../miniapp/boss-academic-parent/pages/staff-ai-work/staff-ai-work.wxml", import.meta.url), "utf8");
  const bridgeSource = readFileSync(new URL("../app/api/miniapp/staff/ai-work/route.ts", import.meta.url), "utf8");
  assert.match(pageView, /按科目确认老师顺序/);
  assert.match(pageView, /主选老师/);
  assert.match(pageView, /第一备选/);
  assert.match(pageView, /第二备选/);
  assert.match(pageSource, /subjectTeacherPreferences/);
  assert.match(pageSource, /同一科目不能重复选择老师/);
  assert.match(bridgeSource, /miniapp-ai\/subject-teacher-plan/);
});

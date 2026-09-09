import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  existingResultSessionIdForAction,
  isTicketSchedulingActionResolved,
  normalizeSchedulingActionInput,
  schedulingActionCanBeReady,
  schedulingActionDefinition,
  schedulingResolutionActionStatus,
  schedulingResolutionDefinition,
  schedulingResolutionTicketStatus,
  TICKET_SCHEDULING_ACTION_TYPES,
  TICKET_SCHEDULING_RESOLUTION_MODES,
  unresolvedTicketSchedulingActions,
} from "../lib/ticket-scheduling-actions";

test("source-session actions require exact lessons and action-specific execution details", () => {
  for (const actionType of ["RESCHEDULE_SESSION", "CANCEL_SESSION", "REPLACE_TEACHER"]) {
    const missing = normalizeSchedulingActionInput({ actionType });
    assert.equal(missing?.status, "NEED_INFO");
    assert.equal(schedulingActionDefinition(actionType)?.needsSource, true);
  }
  assert.equal(normalizeSchedulingActionInput({ actionType: "CANCEL_SESSION", sourceSessionId: "session-1" })?.status, "READY");
  assert.equal(normalizeSchedulingActionInput({ actionType: "RESCHEDULE_SESSION", sourceSessionId: "session-1" })?.status, "NEED_INFO");
  assert.equal(normalizeSchedulingActionInput({ actionType: "RESCHEDULE_SESSION", sourceSessionId: "session-1", requestedStartAt: "2026-08-01T10:00:00+08:00" })?.status, "READY");
  assert.equal(normalizeSchedulingActionInput({ actionType: "REPLACE_TEACHER", sourceSessionId: "session-1" })?.status, "NEED_INFO");
  assert.equal(normalizeSchedulingActionInput({ actionType: "REPLACE_TEACHER", sourceSessionId: "session-1", requestedTeacherId: "teacher-1" })?.status, "READY");
  assert.equal(schedulingActionCanBeReady({ actionType: "RESCHEDULE_SESSION", sourceSessionId: "session-1" }), false);
});

test("new scheduling and coordination remain separate action intents", () => {
  const create = normalizeSchedulingActionInput({ actionType: "CREATE_SESSION", requestedStartAt: "2026-08-01T10:00:00+08:00", courseLabel: "Math", durationMin: 60 });
  const coordinate = normalizeSchedulingActionInput({ actionType: "COORDINATE_ONLY" });
  assert.equal(create?.status, "READY");
  assert.equal(coordinate?.status, "NEED_INFO");
  assert.equal(TICKET_SCHEDULING_ACTION_TYPES.length, 5);
});

test("invalid or unsafe action input is rejected or bounded", () => {
  assert.equal(normalizeSchedulingActionInput({ actionType: "DELETE_SESSION" }), null);
  assert.equal(normalizeSchedulingActionInput({ actionType: "CREATE_SESSION", durationMin: 5 })?.durationMin, null);
  assert.equal(normalizeSchedulingActionInput({ actionType: "CREATE_SESSION", durationMin: 60 })?.durationMin, 60);
});

test("ticket completion paths guard unresolved scheduling actions", () => {
  const webDetail = readFileSync("app/admin/tickets/[id]/page.tsx", "utf8");
  const webList = readFileSync("app/admin/tickets/page.tsx", "utf8");
  const miniappRoute = readFileSync("app/api/miniapp/staff/parent-requests/[id]/route.ts", "utf8");
  assert.match(webDetail, /scheduling-actions-open/);
  assert.match(webList, /scheduling-actions-open/);
  assert.match(miniappRoute, /schedulingCompletionBlock/);
});

test("only applied or cancelled scheduling actions are resolved", () => {
  assert.equal(isTicketSchedulingActionResolved({ status: "APPLIED" }), true);
  assert.equal(isTicketSchedulingActionResolved({ status: "CANCELLED" }), true);
  assert.equal(isTicketSchedulingActionResolved({ status: "READY" }), false);
  assert.equal(isTicketSchedulingActionResolved({ status: "NEED_INFO" }), false);
  assert.deepEqual(
    unresolvedTicketSchedulingActions([
      { id: "a", status: "APPLIED" },
      { id: "b", status: "READY" },
      { id: "c", status: "NEED_INFO" },
      { id: "d", status: "CANCELLED" },
    ]).map((action) => action.id),
    ["b", "c"]
  );
});

test("ticket-level manual resolution separates completed work from genuinely unnecessary work", () => {
  assert.equal(TICKET_SCHEDULING_RESOLUTION_MODES.length, 3);
  assert.equal(schedulingResolutionDefinition("COMPLETED_EXTERNALLY")?.label, "已在正式系统或其他页面处理完成");
  assert.equal(schedulingResolutionDefinition("NOT_REQUIRED")?.label, "整张工单确实无需处理");
  assert.equal(schedulingResolutionDefinition("UNKNOWN"), null);
  assert.equal(schedulingResolutionActionStatus("COMPLETED_EXTERNALLY"), "APPLIED");
  assert.equal(schedulingResolutionActionStatus("PARTIALLY_COMPLETED_EXTERNALLY"), "APPLIED");
  assert.equal(schedulingResolutionActionStatus("NOT_REQUIRED"), "CANCELLED");
  assert.equal(schedulingResolutionTicketStatus("COMPLETED_EXTERNALLY", 0), "Completed");
  assert.equal(schedulingResolutionTicketStatus("NOT_REQUIRED", 0), "Cancelled");
  assert.equal(schedulingResolutionTicketStatus("PARTIALLY_COMPLETED_EXTERNALLY", 2), null);
});

test("existing-result links require an actual lesson result", () => {
  assert.equal(
    existingResultSessionIdForAction({
      actionType: "CREATE_SESSION",
      sourceSessionId: "source-session",
      resultSessionId: "result-session",
    }),
    "result-session"
  );
  assert.equal(
    existingResultSessionIdForAction({
      actionType: "CREATE_SESSION",
      sourceSessionId: "source-session",
    }),
    null
  );
  assert.equal(
    existingResultSessionIdForAction({
      actionType: "CANCEL_SESSION",
      sourceSessionId: "source-session",
      resultSessionId: "different-session",
    }),
    "source-session"
  );
  assert.equal(
    existingResultSessionIdForAction({
      actionType: "COORDINATE_ONLY",
      sourceSessionId: "source-session",
      resultSessionId: "result-session",
    }),
    null
  );
});

test("ticket workbench exposes blockers and audited existing-result recovery", () => {
  const webDetail = readFileSync("app/admin/tickets/[id]/page.tsx", "utf8");
  const webList = readFileSync("app/admin/tickets/page.tsx", "utf8");
  assert.match(webList, /个排课动作待执行/);
  assert.match(webList, /前往处理排课动作/);
  assert.match(webList, /blockedTicket/);
  assert.match(readFileSync("lib/ticket-existing-results.ts", "utf8"), /ADMIN_LINK_EXISTING_SCHEDULING_RESULT/);
  assert.match(webDetail, /existingResultVerified/);
  assert.match(readFileSync("app/admin/tickets/[id]/ResultSubmitButton.tsx", "utf8"), /核验并更新工单/);
  assert.match(webDetail, /ADMIN_RESOLVE_TICKET_SCHEDULING_ACTIONS/);
  assert.match(webDetail, /实际工作已经处理过：只核验一次/);
  assert.match(webDetail, /保存实际结果并自动更新工单/);
  assert.match(webDetail, /这张旧工单没有结构化动作/);
  assert.match(webDetail, /单项例外：补资料或修改等待状态/);
});

test("execution services write structured action results inside their existing transactions", () => {
  for (const file of [
    "lib/miniapp-session-scheduling.ts",
    "lib/miniapp-session-cancellation.ts",
    "lib/miniapp-session-teacher-replacement.ts",
    "lib/miniapp-ticket-new-session.ts",
  ]) {
    assert.match(readFileSync(file, "utf8"), /applyLinkedTicketSchedulingAction/);
  }
});

test("admin schedule execution carries exact ticket action context through every supported path", () => {
  const files = [
    "app/api/admin/students/[id]/quick-appointment/route.ts",
    "app/api/admin/classes/[id]/sessions/reschedule/route.ts",
    "app/api/admin/students/[id]/sessions/cancel/route.ts",
    "app/api/admin/students/[id]/sessions/replace-teacher/route.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /ticketActionId/);
    assert.match(source, /applyAdminLinkedTicketSchedulingAction/);
    assert.match(source, /TICKET_ACTION_CONTEXT/);
  }

  const writer = readFileSync("lib/ticket-scheduling-action-write.ts", "utf8");
  assert.match(writer, /actionId\?: string/);
  assert.match(writer, /matchedActionId !== input\.actionId/);
  assert.match(writer, /completedAt: actionState\.allResolved/);
  assert.match(writer, /auditLog\.create/);
});

test("simplified ticket desk keeps one execution path and moves legacy controls to advanced disclosure", () => {
  const detail = readFileSync("app/admin/tickets/[id]/page.tsx", "utf8");
  const list = readFileSync("app/admin/tickets/page.tsx", "utf8");
  assert.match(detail, /Request \/ 家长需求/);
  assert.match(detail, /当前主操作/);
  assert.match(detail, /完整资料与历史/);
  assert.match(detail, /ticketActionType/);
  assert.match(detail, /安排新课程 \/ Schedule lesson/);
  assert.match(detail, /处理取消或请假 \/ Process cancellation/);
  assert.match(detail, /历史、状态与高级修改/);
  assert.match(detail, /由系统继续正式执行/);
  assert.match(detail, /ticket-decision/);
  assert.doesNotMatch(detail, /href=\{`\/admin\/schedule\?sessionId=/);
  assert.match(list, /unresolvedActions\.length === 0 \? \(/);
  assert.match(list, /先处理现在能做的工单/);
  assert.match(list, /管理、录入链接与完整字段（高级）/);
});

test("student schedule clients return to the originating ticket after an atomic action update", () => {
  for (const file of [
    "app/admin/_components/QuickScheduleModal.tsx",
    "app/admin/students/[id]/_components/SessionCancelRestoreClient.tsx",
    "app/admin/students/[id]/_components/SessionReplaceTeacherClient.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /ticketExecutionContext/);
    assert.match(source, /ticketActionId/);
    assert.match(source, /returnHref/);
  }
  const studentPage = readFileSync("app/admin/students/[id]/page.tsx", "utf8");
  assert.match(studentPage, /ticketSessionId/);
  assert.match(studentPage, /Ticket target/);
});

test("public web intake defaults to the guided multi-action workflow", () => {
  const wrapper = readFileSync("app/tickets/intake/IntakeForm.tsx", "utf8");
  const guided = readFileSync("app/tickets/intake/GuidedIntakeForm.tsx", "utf8");
  const page = readFileSync("app/tickets/intake/[token]/page.tsx", "utf8");
  const route = readFileSync("app/api/tickets/intake/[token]/route.ts", "utf8");
  assert.match(wrapper, /GuidedIntakeForm/);
  assert.match(guided, /添加另一个动作/);
  assert.match(guided, /sourceSessionId/);
  assert.match(page, /sessionLookupPath/);
  assert.match(route, /CREATE_GUIDED_TICKET_SCHEDULING_ACTIONS/);
  assert.match(route, /sessionBelongsToStudentWhere/);
  assert.match(route, /ticketSchedulingAction\.createMany/);
});

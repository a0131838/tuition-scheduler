import assert from "node:assert/strict";
import {
  PackageFinanceGateStatus,
  PackageStatus,
  PackageType,
  UserRole,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { applyAiTicketCaseCommand, previewAiTicketCaseCommand } from "../lib/ai-ticket-case-execution";
import { parseAiTicketExecutionRequest, type AiTicketCommand } from "../lib/ai-ticket-execution";
import { applyTicketNewSession, previewTicketNewSession } from "../lib/miniapp-ticket-new-session";
import { applyMiniappSessionReschedulingBatch, previewMiniappSessionReschedulingBatch } from "../lib/miniapp-session-scheduling";
import { applyMiniappSessionCancellation, previewMiniappSessionCancellation } from "../lib/miniapp-session-cancellation";
import { applyMiniappTeacherReplacement, previewMiniappTeacherReplacement } from "../lib/miniapp-session-teacher-replacement";
import { POST as executeAiTicketRoute } from "../app/api/miniapp/staff/ai-tickets/[ticketId]/execute/route";

function assertIsolatedDatabase() {
  if (process.env.AI_TICKET_UAT_CONFIRM !== "LOCAL_ISOLATED_DB") {
    throw new Error("Refusing to run: set AI_TICKET_UAT_CONFIRM=LOCAL_ISOLATED_DB.");
  }
  const url = new URL(String(process.env.DATABASE_URL || ""));
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!localHosts.has(url.hostname) || url.port !== "5432" || url.pathname !== "/tuition_db") {
    throw new Error(`Refusing non-isolated database: ${url.hostname}:${url.port}${url.pathname}`);
  }
}

function atLocalDay(offsetDays: number, hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

async function main() {
  assertIsolatedDatabase();
  process.env.AI_TICKET_EXECUTION_SECRET = "local-isolated-uat-execution-secret-32-characters";
  const runId = `uat-${Date.now()}`;
  const actorUser = await prisma.user.create({
    data: {
      email: `${runId}@local.invalid`,
      name: "AI UAT Admin",
      role: UserRole.ADMIN,
      passwordHash: "not-a-login-account",
      passwordSalt: "local-uat-only",
    },
  });
  const actor = { userId: actorUser.id, email: actorUser.email, name: actorUser.name, role: actorUser.role };
  const student = await prisma.student.create({ data: { name: `AI UAT Student ${runId}` } });
  const course = await prisma.course.create({ data: { name: `AI UAT Course ${runId}` } });
  const subject = await prisma.subject.create({ data: { name: "Mathematics", courseId: course.id } });
  const level = await prisma.level.create({ data: { name: "G8", subjectId: subject.id } });
  const primary = await prisma.teacher.create({
    data: { name: `AI UAT Primary ${runId}`, subjects: { connect: { id: subject.id } }, offlineSingapore: true },
  });
  const replacement = await prisma.teacher.create({
    data: { name: `AI UAT Replacement ${runId}`, subjects: { connect: { id: subject.id } }, offlineSingapore: true },
  });
  const campus = await prisma.campus.create({
    data: { name: `AI UAT Online ${runId}`, isOnline: true, requiresRoom: false },
  });
  await prisma.coursePackage.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      financeGateStatus: PackageFinanceGateStatus.SCHEDULABLE,
      totalMinutes: 2400,
      remainingMinutes: 2400,
      validFrom: atLocalDay(-1, 0),
      validTo: atLocalDay(180, 23, 59),
    },
  });

  const scheduleDates = [21, 22, 23, 24, 25, 27].map((offset) => atLocalDay(offset, 10));
  for (const teacher of [primary, replacement]) {
    await prisma.teacherAvailabilityDate.createMany({
      data: scheduleDates.map((value) => ({ teacherId: teacher.id, date: dateOnly(value), startMin: 8 * 60, endMin: 21 * 60 })),
    });
  }

  let ticketSeq = 0;
  const createTicket = (type: string, status = "Need Info") => prisma.ticket.create({
    data: {
      ticketNo: `${runId}-${++ticketSeq}`,
      studentId: student.id,
      source: "LOCAL_ISOLATED_UAT",
      type,
      priority: "普通",
      studentName: student.name,
      course: `${course.name} / ${subject.name} / ${level.name}`,
      status,
      parentVisible: true,
    },
  });

  const scheduleTicket = await createTicket("新排课");
  const occurrences = scheduleDates.slice(0, 4).map((startAt) => ({
    subjectId: subject.id,
    levelId: level.id,
    teacherId: primary.id,
    campusId: campus.id,
    roomId: null,
    startAt,
    durationMin: 60,
  }));
  const batchInput = {
    ticketId: scheduleTicket.id,
    studentId: null,
    ...occurrences[0],
    occurrences,
  };
  const schedulePreview = await previewTicketNewSession(batchInput);
  assert.equal(schedulePreview.preview.weeks, 4);
  const scheduleResult = await applyTicketNewSession(batchInput, actor);
  assert.equal(scheduleResult.sessionIds.length, 4);
  const scheduleTicketAfter = await prisma.ticket.findUniqueOrThrow({ where: { id: scheduleTicket.id } });
  assert.equal(scheduleTicketAfter.status, "Completed");
  assert.match(scheduleTicketAfter.parentCompletionResult || "", /共 4 节/);

  const rescheduleTicket = await createTicket("改课程时间");
  const rescheduleInputs = [
    { action: "reschedule" as const, sessionId: scheduleResult.sessionIds[0], startAt: scheduleDates[5], durationMin: 60 },
    { action: "reschedule" as const, sessionId: scheduleResult.sessionIds[1], startAt: new Date(scheduleDates[5].getTime() + 2 * 60 * 60 * 1000), durationMin: 60 },
  ];
  await previewMiniappSessionReschedulingBatch(rescheduleInputs);
  const rescheduleResult = await applyMiniappSessionReschedulingBatch(rescheduleInputs, actor, [rescheduleTicket.id]);
  assert.equal(rescheduleResult.writtenSessionIds.length, 2);
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: rescheduleTicket.id } })).status, "Completed");

  const noChargeTicket = await createTicket("临时取消&请假课程");
  const noChargeInput = { sessionId: scheduleResult.sessionIds[1], studentId: student.id, charge: false, note: "UAT 提前请假，不扣课时" };
  await previewMiniappSessionCancellation(noChargeInput);
  const balanceBeforeNoCharge = (await prisma.coursePackage.findFirstOrThrow({ where: { studentId: student.id, courseId: course.id } })).remainingMinutes;
  await applyMiniappSessionCancellation(noChargeInput, actor, [noChargeTicket.id]);
  const balanceAfterNoCharge = (await prisma.coursePackage.findFirstOrThrow({ where: { studentId: student.id, courseId: course.id } })).remainingMinutes;
  assert.equal(balanceAfterNoCharge, balanceBeforeNoCharge);

  const chargeTicket = await createTicket("临时取消&请假课程");
  const chargeInput = { sessionId: scheduleResult.sessionIds[2], studentId: student.id, charge: true, note: "UAT 规则内取消，扣课时" };
  await previewMiniappSessionCancellation(chargeInput);
  const balanceBeforeCharge = (await prisma.coursePackage.findFirstOrThrow({ where: { studentId: student.id, courseId: course.id } })).remainingMinutes!;
  await applyMiniappSessionCancellation(chargeInput, actor, [chargeTicket.id]);
  const balanceAfterCharge = (await prisma.coursePackage.findFirstOrThrow({ where: { studentId: student.id, courseId: course.id } })).remainingMinutes!;
  assert.equal(balanceAfterCharge, balanceBeforeCharge - 60);

  const replacementTicket = await createTicket("改上课老师");
  const replacementInput = { sessionId: scheduleResult.sessionIds[3], newTeacherId: replacement.id, reason: "UAT 老师调整" };
  await previewMiniappTeacherReplacement(replacementInput);
  await applyMiniappTeacherReplacement(replacementInput, actor, [replacementTicket.id]);
  assert.equal((await prisma.session.findUniqueOrThrow({ where: { id: scheduleResult.sessionIds[3] } })).teacherId, replacement.id);

  const caseSpecs: Array<{ workflowKey: string; type: string; status?: string; command: AiTicketCommand; expected: string }> = [
    {
      workflowKey: "ASSESSMENT_TRIAL", type: "评估学生（已买课程）", expected: "Waiting Teacher",
      command: { commandType: "CREATE_ASSESSMENT_TASK", idempotencyKey: `${runId}-assessment`, nextAction: "安排老师评估并回收结果", parentPublicSummary: "已进入评估安排。" },
    },
    {
      workflowKey: "PACKAGE_SALES_ACTIVATION", type: "新学生购买课时包", expected: "Waiting Parent",
      command: { commandType: "PACKAGE_ACTIVATION_REVIEW", idempotencyKey: `${runId}-package`, label: "UAT 家长资料", parentPublicSummary: "请补充资料，完成后由财务核对。" },
    },
    {
      workflowKey: "ACADEMIC_CASE", type: "学术问题", expected: "Waiting Teacher",
      command: { commandType: "ACADEMIC_CASE_HANDOFF", idempotencyKey: `${runId}-academic`, studentId: student.id, nextAction: "收集老师反馈并形成方案", parentPublicSummary: "学术问题已交由教务与老师处理。" },
    },
    {
      workflowKey: "NON_ACADEMIC_SERVICE", type: "非学术问题", expected: "Waiting Parent",
      command: { commandType: "SERVICE_CASE_HANDOFF", idempotencyKey: `${runId}-service`, studentId: student.id, nextAction: "客服核对记录并回访", parentPublicSummary: "客服已开始处理并将回访。" },
    },
    {
      workflowKey: "OPERATION_CORRECTION", type: "操作纠正", status: "Waiting Teacher", expected: "Exception",
      command: { commandType: "OPERATION_CORRECTION_REVIEW", idempotencyKey: `${runId}-correction`, correctionTarget: "ATTENDANCE", beforeAfter: "原记录未核对，目标为受控复核", evidence: "UAT evidence", nextAction: "管理员审批后使用正式功能纠正", parentPublicSummary: "记录正在复核。" },
    },
  ];

  for (const spec of caseSpecs) {
    const ticket = await createTicket(spec.type, spec.status);
    const packageValue = parseAiTicketExecutionRequest({
      version: "SGT_AI_TICKET_EXECUTION_V1",
      ticketId: ticket.id,
      formalSourceVersion: "uat-v1",
      formalUpdatedAt: ticket.updatedAt.toISOString(),
      workflowKey: spec.workflowKey,
      idempotencyKey: `${runId}-${spec.workflowKey}`,
      commands: [spec.command],
    }, ticket.id);
    await previewAiTicketCaseCommand(ticket.id, packageValue.commands[0]);
    const first = await applyAiTicketCaseCommand(ticket.id, packageValue.commands[0], actor);
    const second = await applyAiTicketCaseCommand(ticket.id, packageValue.commands[0], actor);
    assert.equal(first.alreadyExecuted, false);
    assert.equal(second.alreadyExecuted, true);
    const after = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    assert.equal(after.status, spec.expected);
    assert.equal(after.parentVisible, true);
    assert.ok(after.parentPublicSummary);
    if (spec.workflowKey === "PACKAGE_SALES_ACTIVATION") {
      assert.ok(first.intake?.path);
      assert.equal(await prisma.studentParentIntake.count({ where: { studentId: student.id } }), 1);
    }
  }

  const csUser = await prisma.user.create({
    data: {
      email: `${runId}-cs@local.invalid`,
      name: "AI UAT Customer Service",
      role: UserRole.CS,
      passwordHash: "not-a-login-account",
      passwordSalt: "local-uat-only",
    },
  });
  const [adminSession, csSession] = await Promise.all([
    prisma.staffMiniappSession.create({ data: { userId: actorUser.id, token: `${runId}-admin-token`, expiresAt: atLocalDay(1, 23, 59) } }),
    prisma.staffMiniappSession.create({ data: { userId: csUser.id, token: `${runId}-cs-token`, expiresAt: atLocalDay(1, 23, 59) } }),
  ]);
  const callExecuteRoute = async (ticketId: string, token: string, body: unknown) => {
    const response = await executeAiTicketRoute(new Request(`http://local.invalid/api/miniapp/staff/ai-tickets/${ticketId}/execute`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }), { params: Promise.resolve({ ticketId }) });
    return { status: response.status, body: await response.json() };
  };

  const httpTicket = await createTicket("非学术问题");
  const httpPackage = parseAiTicketExecutionRequest({
    version: "SGT_AI_TICKET_EXECUTION_V1",
    ticketId: httpTicket.id,
    formalSourceVersion: "uat-http-v1",
    formalUpdatedAt: httpTicket.updatedAt.toISOString(),
    workflowKey: "NON_ACADEMIC_SERVICE",
    idempotencyKey: `${runId}-http-service-package`,
    commands: [{
      commandType: "SERVICE_CASE_HANDOFF",
      idempotencyKey: `${runId}-http-service-command`,
      studentId: student.id,
      nextAction: "客服核对记录并回访",
      parentPublicSummary: "客服已开始处理。",
    }],
  }, httpTicket.id);
  const httpPreview = await callExecuteRoute(httpTicket.id, adminSession.token, { mode: "preview", package: httpPackage });
  assert.equal(httpPreview.status, 200);
  assert.ok(httpPreview.body.previewToken);
  const httpApply = await callExecuteRoute(httpTicket.id, adminSession.token, { mode: "apply", package: httpPackage, previewToken: httpPreview.body.previewToken });
  assert.equal(httpApply.status, 200);
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: httpTicket.id } })).status, "Waiting Parent");
  const duplicateHttpApply = await callExecuteRoute(httpTicket.id, adminSession.token, { mode: "apply", package: httpPackage, previewToken: httpPreview.body.previewToken });
  assert.equal(duplicateHttpApply.status, 409);

  const unauthorizedTicket = await createTicket("新排课");
  const unauthorizedPackage = parseAiTicketExecutionRequest({
    version: "SGT_AI_TICKET_EXECUTION_V1",
    ticketId: unauthorizedTicket.id,
    formalSourceVersion: "uat-http-role-v1",
    formalUpdatedAt: unauthorizedTicket.updatedAt.toISOString(),
    workflowKey: "NEW_SCHEDULE",
    idempotencyKey: `${runId}-http-role-package`,
    commands: [{
      commandType: "CREATE_SESSION",
      idempotencyKey: `${runId}-http-role-command`,
      subjectId: subject.id,
      teacherId: primary.id,
      campusId: campus.id,
      roomId: null,
      startAt: scheduleDates[4].toISOString(),
      durationMin: 60,
    }],
  }, unauthorizedTicket.id);
  const unauthorized = await callExecuteRoute(unauthorizedTicket.id, csSession.token, { mode: "preview", package: unauthorizedPackage });
  assert.equal(unauthorized.status, 403);

  const staleTicket = await createTicket("非学术问题");
  const stalePackage = parseAiTicketExecutionRequest({
    version: "SGT_AI_TICKET_EXECUTION_V1",
    ticketId: staleTicket.id,
    formalSourceVersion: "uat-http-stale-v1",
    formalUpdatedAt: staleTicket.updatedAt.toISOString(),
    workflowKey: "NON_ACADEMIC_SERVICE",
    idempotencyKey: `${runId}-http-stale-package`,
    commands: [{
      commandType: "SERVICE_CASE_HANDOFF",
      idempotencyKey: `${runId}-http-stale-command`,
      studentId: student.id,
      nextAction: "客服回访",
      parentPublicSummary: "客服处理中。",
    }],
  }, staleTicket.id);
  await prisma.ticket.update({
    where: { id: staleTicket.id },
    data: { summary: "formal facts changed after AI preparation", updatedAt: new Date(staleTicket.updatedAt.getTime() + 1000) },
  });
  const stale = await callExecuteRoute(staleTicket.id, adminSession.token, { mode: "preview", package: stalePackage });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "AI_TICKET_STALE");

  const auditCount = await prisma.auditLog.count({ where: { actorEmail: actor.email } });
  assert.ok(auditCount >= 13);
  const executedSettings = await prisma.appSetting.count({ where: { key: { startsWith: `ai-ticket-command:${runId}` } } });
  assert.equal(executedSettings, caseSpecs.length + 1);

  console.log(JSON.stringify({
    result: "PASS",
    isolation: "LOCAL_DOCKER_POSTGRES",
    runId,
    assertions: {
      monthlyBatchSessions: scheduleResult.sessionIds.length,
      batchRescheduleSessions: rescheduleResult.writtenSessionIds.length,
      cancelWithoutChargePreservedBalance: true,
      cancelWithChargeDeductedMinutes: 60,
      replacementCompleted: true,
      caseWorkflows: caseSpecs.length,
      duplicateClicksIdempotent: true,
      parentVisibleResults: true,
      formalHttpPreviewApply: true,
      unauthorizedRoleRejected: true,
      stalePackageRejected: true,
      duplicateHttpApplyRejected: true,
      auditRecords: auditCount,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

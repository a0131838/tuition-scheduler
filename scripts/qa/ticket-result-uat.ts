import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { linkTicketResults, ticketResultCandidates } from "../../lib/ticket-existing-results";
import { createStaffMiniappSession } from "../../lib/miniapp-staff";

async function main() {
  const db = new URL(process.env.DATABASE_URL || "");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "55439");
  assert.equal(db.pathname, "/sgt_schedule_test");
  const base = "http://127.0.0.1:3149";
  const suffix = Date.now();
  const user = await prisma.user.upsert({ where: { email: "zhaohongwei0880@gmail.com" }, update: {}, create: {
    email: "zhaohongwei0880@gmail.com", name: "UAT Owner", role: "ADMIN", passwordHash: "not-a-login", passwordSalt: "uat",
  } });
  const token = "local-student-scheduling-uat-only";
  await prisma.authSession.upsert({ where: { token }, update: {}, create: { token, userId: user.id, expiresAt: new Date("2035-01-01") } });
  const campus = await prisma.campus.create({ data: { name: `Result UAT ${suffix}` } });
  const room = await prisma.room.create({ data: { name: "Test room", campusId: campus.id, capacity: 4 } });
  const course = await prisma.course.create({ data: { name: `Result course ${suffix}` } });
  const teacher = await prisma.teacher.create({ data: { name: "Result UAT Teacher" } });
  const student = await prisma.student.create({ data: { name: `Result UAT Student ${suffix}` } });
  const other = await prisma.student.create({ data: { name: `Result UAT Other ${suffix}` } });
  const cls = await prisma.class.create({ data: { courseId: course.id, teacherId: teacher.id, campusId: campus.id, roomId: room.id, capacity: 1 } });
  let serial = 0;
  async function lesson(cancelled = false, studentId = student.id, day = 1, offset = 0) {
    return prisma.session.create({ data: { classId: cls.id, studentId,
      startAt: new Date(new Date(`2026-06-${String(day).padStart(2, "0")}T10:00:00+08:00`).getTime() + offset * 60000),
      endAt: new Date(new Date(`2026-06-${String(day).padStart(2, "0")}T11:30:00+08:00`).getTime() + offset * 60000),
      attendances: { create: { studentId, status: cancelled ? "EXCUSED" : "PRESENT", excusedCharge: false } },
    } });
  }
  async function ticket(actionType: string, notes: string, sourceSessionId?: string, extra: any = {}) {
    return prisma.ticket.create({ data: { ticketNo: `UAT-RESULT-${suffix}-${serial++}`, source: "家长小程序", type: "新排课", priority: "Normal", status: "Confirmed",
      studentId: student.id, studentName: student.name,
      schedulingActions: { create: { sequence: 1, actionType, status: "READY", notes, sourceSessionId, ...extra } },
    }, include: { schedulingActions: true } });
  }
  const link = (row: Awaited<ReturnType<typeof ticket>>, ids: string[], extra: any = {}) => linkTicketResults({
    ticketId: row.id, actionId: row.schedulingActions[0].id, resultSessionIds: ids, user, verified: true, note: "", confirmedChange: false, ...extra,
  });
  const cancelled = await lesson(true);
  const first = await lesson(false, student.id, 2);
  const second = await lesson(false, student.id, 3);
  const foreign = await lesson(false, other.id, 4);
  const before = await prisma.attendance.findMany({ where: { sessionId: { in: [cancelled.id, first.id, second.id] } } });
  const cancelTicket = await ticket("CANCEL_SESSION", "取消本节，不需要补课", cancelled.id, { chargePolicy: "NO_CHARGE" });
  assert.equal((await link(cancelTicket, [])).allResolved, true);
  await assert.rejects(link(cancelTicket, []), /已结束/);
  assert.equal(await prisma.auditLog.count({ where: { entityId: cancelTicket.schedulingActions[0].id } }), 1);
  const activeCancellation = await ticket("CANCEL_SESSION", "取消", first.id);
  await assert.rejects(link(activeCancellation, [], { confirmedChange: true, note: "家长确认测试依据" }), /尚未取消/);
  const pair = await ticket("CREATE_SESSION", "安排2节课，共180分钟");
  await assert.rejects(link(pair, [foreign.id]), /不属于/);
  await assert.rejects(link(pair, [cancelled.id]), /已取消/);
  assert.equal((await link(pair, [first.id])).allResolved, false);
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: pair.id } })).status, "Confirmed");
  assert.equal((await link(pair, [first.id])).allResolved, false);
  assert.equal((await link(pair, [second.id])).allResolved, true);
  assert.equal((await prisma.ticketSchedulingAction.findUniqueOrThrow({ where: { id: pair.schedulingActions[0].id } })).resultSessionIds.length, 2);
  const mismatch = await ticket("CREATE_SESSION", "安排2节课，共90分钟");
  await assert.rejects(link(mismatch, [first.id, second.id]), /总时长/);
  await assert.rejects(link(mismatch, [first.id, second.id], { confirmedChange: true }), /确认依据/);
  assert.equal((await link(mismatch, [first.id, second.id], { confirmedChange: true, note: "家长确认实际总时长为180分钟" })).allResolved, true);
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: mismatch.schedulingActions[0].id } });
  assert.ok(JSON.stringify(audit.meta).includes("180分钟"));
  const makeup = await ticket("CANCEL_SESSION", "取消后需要补课", cancelled.id);
  await prisma.ticketSchedulingAction.create({ data: { ticketId: makeup.id, sequence: 2, actionType: "CREATE_SESSION", status: "APPLIED", resultSessionId: first.id, notes: "另一项已经完成的排课" } });
  assert.equal((await link(makeup, [])).allResolved, false);
  assert.equal(await prisma.ticketSchedulingAction.count({ where: { ticketId: makeup.id, status: "NEED_INFO" } }), 1);
  assert.ok((await prisma.ticketSchedulingAction.findFirstOrThrow({ where: { ticketId: makeup.id, status: "NEED_INFO" } })).notes?.includes(`[Follow-up:${makeup.schedulingActions[0].id}]`));
  const concurrent = await ticket("CREATE_SESSION", "安排1节课");
  const results = await Promise.allSettled([link(concurrent, [first.id]), link(concurrent, [first.id])]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(await prisma.auditLog.count({ where: { entityId: concurrent.schedulingActions[0].id } }), 1);
  const coordination = await ticket("COORDINATE_ONLY", "待确认");
  await assert.rejects(link(coordination, [first.id]), /不支持/);
  for (let i = 0; i < 51; i++) await lesson(false, student.id, 5, i);
  const page0 = await ticketResultCandidates(activeCancellation.id, activeCancellation.schedulingActions[0].id, "2026-06-01");
  const page1 = await ticketResultCandidates(activeCancellation.id, activeCancellation.schedulingActions[0].id, "2026-06-01", 1);
  assert.equal(page0.lessons.length, 50); assert.equal(page0.hasMore, true);
  assert.ok(page1.lessons.length > 0); assert.ok(page0.lessons.some((row) => row.cancelled));
  assert.equal(page0.lessons.some((row) => row.id === foreign.id), false);
  assert.deepEqual(await prisma.attendance.findMany({ where: { sessionId: { in: [cancelled.id, first.id, second.id] } } }), before);
  const uiTicket = await ticket("CREATE_SESSION", "安排2节课，共180分钟", undefined, { requestedStartAt: first.startAt, courseLabel: course.name });
  if (process.env.UAT_HTTP === "1") {
    const web = await fetch(`${base}/api/admin/tickets/${uiTicket.id}/results?date=2026-06-01`, { headers: { Cookie: `ts_admin_session=${token}` } });
    assert.equal(web.status, 200);
    const staff = await createStaffMiniappSession(user.id);
    const miniPath = `${base}/api/miniapp/staff/scheduling-coordination/${uiTicket.id}/results`;
    const mini = await fetch(miniPath + "?date=2026-06-01", { headers: { Authorization: `Bearer ${staff.token}` } });
    assert.equal(mini.status, 200);
    const observer = await prisma.user.create({ data: { email: `result-observer-${suffix}@uat.invalid`, name: "UAT observer", role: "ADMIN", isObserver: true, passwordHash: "not-a-login", passwordSalt: "uat" } });
    const obsSession = await createStaffMiniappSession(observer.id);
    assert.equal((await fetch(miniPath, { method: "POST", headers: { Authorization: `Bearer ${obsSession.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ actionId: uiTicket.schedulingActions[0].id, verified: true, resultSessionIds: [first.id] }) })).status, 403);
    const applied = await fetch(miniPath, { method: "POST", headers: { Authorization: `Bearer ${staff.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ actionId: uiTicket.schedulingActions[0].id, verified: true, resultSessionIds: [first.id] }) });
    assert.equal(applied.status, 200, await applied.text());
    assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: uiTicket.id } })).status, "Confirmed");
  }
  console.log(JSON.stringify({ passed: true, ticketId: uiTicket.id, firstId: first.id, secondId: second.id, studentId: student.id, course: course.name }));
}
main().finally(() => prisma.$disconnect());

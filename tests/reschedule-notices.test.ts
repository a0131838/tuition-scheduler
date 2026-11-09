import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { attachRescheduleEvidence, getRescheduleInbox, noticeTiming, RESCHEDULE_NOTICE_PREFIX, updateSessionTimeWithNotice } from "../lib/reschedule-notices";
import { updateParentCommunicationTask } from "../lib/parent-communication-center";

test("reminder thresholds, near-class telephone follow-up and an already-started class are distinct", () => {
  const createdAt = new Date("2026-11-09T04:00:00Z");
  const row = {
    taskKey: RESCHEDULE_NOTICE_PREFIX + "test",
    templateVariables: { beforeStart: "2026-11-09T09:00:00Z", beforeEnd: "2026-11-09T10:00:00Z", afterStart: "2026-11-09T09:30:00Z", afterEnd: "2026-11-09T10:30:00Z" },
    createdAt, manualSentAt: null, ownerUserId: "eva", status: "READY_TO_SEND", claimedAt: null,
  };
  const at = (time: string) => new Date(`2026-11-09T${time}Z`);
  assert.equal(noticeTiming(row, at("04:04:59"))?.overdue, false);
  assert.equal(noticeTiming(row, at("04:05:00"))?.overdue, true);
  assert.equal(noticeTiming(row, at("04:09:59"))?.handoffDue, false);
  assert.equal(noticeTiming(row, at("04:10:00"))?.handoffDue, true);
  assert.equal(noticeTiming({ ...row, claimedAt: at("04:10:00") }, at("04:10:01"))?.handoffDue, false);
  const sent = { ...row, status: "WAITING_PARENT", manualSentAt: at("04:02:00") };
  assert.equal(noticeTiming(sent, at("04:16:59"))?.callDue, false);
  assert.equal(noticeTiming(sent, at("04:17:00"))?.callDue, true);
  assert.equal(noticeTiming(row, at("09:12:00"))?.callDue, true);
  assert.equal(noticeTiming(row, at("09:30:00"))?.past, true);
  assert.equal(noticeTiming(row, at("09:30:00"))?.callDue, false);
  assert.equal(noticeTiming({ ...row, status: "SUPERSEDED" }, at("09:30:00"))?.overdue, false);
});

const database = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const isolated = database?.hostname === "127.0.0.1" && database.port === "55439" && database.pathname === "/sgt_reschedule_notice_test";

test("isolated schedule transaction creates one task per household, restricts handoff and invalidates old confirmation", { skip: !isolated }, async () => {
  try {
    const staff = (name: string) => prisma.user.create({ data: { name, email: `${name.toLowerCase()}@notice.test`, role: name === "Emily" ? "CS" : "ADMIN", passwordHash: "disabled", passwordSalt: "disabled" } });
    const [eva, emily, jasmine, teacher, course, campus, first, sibling, cancelled, parent] = await Promise.all([
      staff("Eva"), staff("Emily"), staff("Jasmine"),
      prisma.teacher.create({ data: { name: "Notice Test Teacher" } }),
      prisma.course.create({ data: { name: "Notice Test Course" } }),
      prisma.campus.create({ data: { name: "Notice Test Campus", requiresRoom: false } }),
      prisma.student.create({ data: { name: "Notice Test First" } }),
      prisma.student.create({ data: { name: "Notice Test Sibling" } }),
      prisma.student.create({ data: { name: "Notice Test Cancelled" } }),
      prisma.parentAccount.create({ data: { name: "Notice Test Parent" } }),
    ] as const);
    const cls = await prisma.class.create({ data: {
      capacity: 3, teacherId: teacher.id, courseId: course.id, campusId: campus.id,
      enrollments: { create: [first, sibling, cancelled].map(student => ({ studentId: student.id })) },
    } });
    await prisma.parentStudentLink.createMany({ data: [first, sibling].map(student => ({ studentId: student.id, parentId: parent.id, isPrimary: true, wechatGroupName: "TEST GROUP" })) });
    const future = Date.now() + 48 * 60 * 60_000;
    const interval = (offset: number) => ({ startAt: new Date(future + offset * 60_000), endAt: new Date(future + (offset + 90) * 60_000) });
    const session = await prisma.session.create({ data: { classId: cls.id, ...interval(0) } });
    await prisma.attendance.create({ data: { studentId: cancelled.id, sessionId: session.id, status: "EXCUSED" } });
    const change = (before: ReturnType<typeof interval>, after: ReturnType<typeof interval>) => prisma.$transaction(tx => updateSessionTimeWithNotice(tx, { sessionId: session.id, before, after, actor: eva }));
    const result = await change(interval(0), interval(60));
    assert.equal(result.noticeIds.length, 1);
    const id = result.noticeIds[0];
    const task = await prisma.parentCommunicationTask.findUniqueOrThrow({ where: { id } });
    assert.equal(task.ownerUserId, eva.id);
    assert.match(task.messageText, /Notice Test Sibling/);
    assert.doesNotMatch(task.messageText, /Notice Test Cancelled/);
    assert.deepEqual((await change(interval(60), interval(60))).noticeIds, []);
    const act = (who: typeof eva, action: string, data = {}, taskId = id) => updateParentCommunicationTask({ id: taskId, actor: who, action, data });
    await assert.rejects(act(jasmine, "claim"), /Eva 或 Emily/);
    await assert.rejects(act(emily, "claim"), /仍由另一位教务/);
    await assert.rejects(act(eva, "transfer", { ownerUserId: jasmine.id }), /另一位负责改课通知/);
    const late = new Date(Date.now() - 11 * 60_000);
    await prisma.parentCommunicationTask.update({ where: { id }, data: { createdAt: late, dueAt: new Date(+late + 5 * 60_000) } });
    assert.equal((await getRescheduleInbox(eva.id)).overdue, 1);
    assert.equal((await getRescheduleInbox(emily.id)).takeover, 1);
    assert.equal((await getRescheduleInbox(jasmine.id)).takeover, 0);
    await act(emily, "claim");
    await assert.rejects(act(eva, "claim"), /仍由另一位教务/);
    await assert.rejects(act(emily, "manual_sent"), /截图/);
    await assert.rejects(attachRescheduleEvidence(task, eva.id, "test/wrong.jpg"), /当前负责人/);
    await attachRescheduleEvidence(task, emily.id, "test/evidence.jpg");
    const sent = await act(emily, "manual_sent");
    assert.equal(sent.status, "WAITING_PARENT");
    assert.equal(sent.completedAt, null);
    assert.equal((await getRescheduleInbox(emily.id)).waiting, 1);
    await assert.rejects(act(emily, "parent_confirmed"), /渠道/);
    assert.equal((await act(emily, "parent_confirmed", { channel: "PHONE", note: "Test parent confirmed the new time" })).status, "COMPLETED");
    const latest = await change(interval(60), interval(120));
    assert.equal(latest.noticeIds.length, 1);
    assert.equal((await prisma.parentCommunicationTask.findUniqueOrThrow({ where: { id } })).status, "SUPERSEDED");
    await assert.rejects(act(emily, "copy"), /不是当前改课版本/);
    await assert.rejects(change(interval(60), interval(180)), /请刷新/);
    assert.equal(await prisma.parentCommunicationTask.count({ where: { sessionId: session.id } }), 2);
    await assert.rejects(prisma.$transaction(async tx => {
      await updateSessionTimeWithNotice(tx, { sessionId: session.id, before: interval(120), after: interval(180), actor: eva });
      throw new Error("simulate original write rollback");
    }), /simulate/);
    assert.equal((await prisma.session.findUniqueOrThrow({ where: { id: session.id } })).startAt.toISOString(), interval(120).startAt.toISOString());
    assert.equal(await prisma.parentCommunicationTask.count({ where: { sessionId: session.id } }), 2);
    assert.equal((await prisma.attendance.findUniqueOrThrow({ where: { sessionId_studentId: { sessionId: session.id, studentId: cancelled.id } } })).deductedMinutes, 0);
  } finally {
    await prisma.$disconnect();
  }
});

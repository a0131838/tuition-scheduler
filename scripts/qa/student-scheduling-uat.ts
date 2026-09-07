import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { studentSchedulingOverview } from "../../lib/student-scheduling-overview";
import { observerSessionToken } from "../../lib/observer-mode";
import { operationsAdminSessionToken } from "../../lib/operations-admin-mode";

async function main() {
  const db = new URL(process.env.DATABASE_URL || "");
  assert.equal(db.hostname, "127.0.0.1"); assert.equal(db.port, "55439"); assert.equal(db.pathname, "/sgt_schedule_test");
  const base = "http://127.0.0.1:3149";
  const token = "local-student-scheduling-uat-only";
  const user = await prisma.user.upsert({ where: { email: "zhaohongwei0880@gmail.com" }, update: {}, create: {
    email: "zhaohongwei0880@gmail.com", name: "zhao hongwei", role: "ADMIN", passwordHash: "not-a-login", passwordSalt: "uat",
  } });
  await prisma.authSession.upsert({ where: { token }, update: {}, create: { token, userId: user.id, expiresAt: new Date("2035-01-01") } });
  const campus = await prisma.campus.create({ data: { name: `UAT Campus ${Date.now()}` } });
  const room = await prisma.room.create({ data: { name: "UAT Room", campusId: campus.id, capacity: 4 } });
  const course = await prisma.course.create({ data: { name: `UAT Course ${Date.now()}` } });
  const math = await prisma.subject.create({ data: { name: "UAT Math", courseId: course.id } });
  const english = await prisma.subject.create({ data: { name: "UAT English", courseId: course.id } });
  const teacher = await prisma.teacher.create({ data: { name: "UAT Teacher", subjects: { connect: [{ id: math.id }, { id: english.id }] } } });
  const sister = await prisma.student.create({ data: { name: "UAT Sister" } });
  const brother = await prisma.student.create({ data: { name: "UAT Brother" } });
  const inactive = await prisma.student.create({ data: { name: "UAT Inactive" } });
  const cls = await prisma.class.create({ data: { courseId: course.id, subjectId: math.id, teacherId: teacher.id,
    campusId: campus.id, roomId: room.id, capacity: 1,
    enrollments: { create: [{ studentId: sister.id }, { studentId: brother.id }] } } });
  await prisma.class.create({ data: { courseId: course.id, subjectId: english.id, teacherId: teacher.id,
    campusId: campus.id, roomId: room.id, capacity: 1, enrollments: { create: { studentId: brother.id } } } });
  const start = new Date(Date.now() + 10 * 86400000); start.setHours(18, 30, 0, 0);
  const end = new Date(start.getTime() + 90 * 60000);
  const source = await prisma.session.create({ data: { classId: cls.id, studentId: sister.id, startAt: start, endAt: end,
    attendances: { create: { studentId: sister.id, status: "EXCUSED", note: "UAT requested cancellation" } } } });
  const pkg = await prisma.coursePackage.create({ data: { studentId: sister.id, courseId: course.id, type: "HOURS",
    totalMinutes: 6000, remainingMinutes: 6000, validFrom: new Date("2020-01-01"), status: "ACTIVE", financeGateStatus: "SCHEDULABLE",
    sharedStudents: { create: { studentId: brother.id } } } });
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  const body = { subjectId: math.id, teacherId: teacher.id, campusId: campus.id, roomId: room.id, startAt: fmt(start), durationMin: 90, repeatWeeks: 1, onConflict: "reject" };
  const post = async (path: string, body: unknown) => {
    const res = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `ts_admin_session=${token}` }, body: JSON.stringify(body), redirect: "manual" });
    const text = await res.text(); let data: any; try { data = JSON.parse(text); } catch { throw new Error(`${res.status}: ${text.slice(0, 200)}`); }
    return { status: res.status, data };
  };
  const path = `/api/admin/students/${brother.id}/quick-appointment`;
  assert.equal((await post(path, { ...body, transferSourceSessionId: source.id, durationMin: 60 })).status, 409);
  const created = await post(path, { ...body, transferSourceSessionId: source.id });
  assert.equal(created.status, 200, JSON.stringify(created)); assert.equal(created.data.created, 1);
  const targetId = created.data.rows[0].sessionId;
  const target = await prisma.session.findUniqueOrThrow({ where: { id: targetId } });
  assert.notEqual(target.classId, cls.id);
  assert.equal((await prisma.attendance.findFirstOrThrow({ where: { sessionId: source.id } })).status, "EXCUSED");
  assert.equal((await post(path, body)).status, 409);
  const skipped = await post(path, { ...body, onConflict: "skip" });
  assert.equal(skipped.data.created, 0); assert.equal(skipped.data.skipped, 1);
  assert.equal((await post(`/api/admin/students/${sister.id}/sessions/restore`, { sessionId: source.id })).status, 409);
  await prisma.attendance.create({ data: { sessionId: targetId, studentId: brother.id, status: "EXCUSED" } });
  const own = await post(path, body);
  assert.equal(own.data.code, "CANCELLED_SESSION"); assert.equal(own.data.sessionId, targetId);
  await prisma.session.update({ where: { id: targetId }, data: { studentId: null } });
  const legacyOwn = await post(path, body);
  assert.equal(legacyOwn.data.code, "CANCELLED_SESSION"); assert.equal(legacyOwn.data.sessionId, targetId);
  assert.equal((await post(`/api/admin/students/${brother.id}/sessions/restore`, { sessionId: targetId })).status, 200);
  assert.equal((await prisma.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } })).remainingMinutes, 6000);
  const summaries = await studentSchedulingOverview([sister.id, brother.id, inactive.id]);
  assert.deepEqual(summaries.get(brother.id)?.missingSubjects, ["UAT English"]);
  assert.equal(summaries.get(sister.id)?.nextLesson, null);
  assert.equal(summaries.get(inactive.id)?.needsScheduling, false);
  for (let i = 1; i <= 55; i++) await prisma.session.create({ data: { classId: cls.id, studentId: brother.id,
    startAt: new Date(Date.now() - i * 86400000), endAt: new Date(Date.now() - i * 86400000 + 3600000) } });
  const history = await fetch(`${base}/admin/students/${brother.id}?focus=attendance`, { headers: { Cookie: `ts_admin_session=${token}` } });
  assert.equal(history.status, 200); const html = await history.text();
  assert.ok(html.includes("Attendance pending") || html.includes("已过期未点名"));
  assert.ok(html.includes("historyPage=2"));
  const list = await fetch(`${base}/admin/students?view=all&clearDesk=1&scheduling=no_next`, { headers: { Cookie: `ts_admin_session=${token}` } });
  assert.equal(list.status, 200); const listHtml = await list.text(); assert.ok(listHtml.includes("UAT Brother"));
  const observer = await prisma.user.create({ data: { email: `observer-${Date.now()}@uat.invalid`, name: "UAT Observer", role: "ADMIN", isObserver: true, passwordHash: "not-a-login", passwordSalt: "uat" } });
  const observerToken = await observerSessionToken("local-scheduling-observer");
  await prisma.authSession.upsert({ where: { token: observerToken }, update: { userId: observer.id }, create: { token: observerToken, userId: observer.id, expiresAt: new Date("2035-01-01") } });
  assert.equal((await fetch(`${base}/admin/students?view=all`, { headers: { Cookie: `ts_admin_session=${observerToken}` } })).status, 200);
  assert.equal((await fetch(base + path, { method: "POST", headers: { Cookie: `ts_admin_session=${observerToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) })).status, 403);
  const ops = await prisma.user.create({ data: { email: `ops-${Date.now()}@uat.invalid`, name: "UAT Teaching Ops", role: "TEACHER", passwordHash: "not-a-login", passwordSalt: "uat" } });
  await prisma.operationsAdminAcl.create({ data: { email: ops.email } });
  const opsToken = await operationsAdminSessionToken("local-scheduling-ops");
  await prisma.authSession.upsert({ where: { token: opsToken }, update: { userId: ops.id }, create: { token: opsToken, userId: ops.id, expiresAt: new Date("2035-01-01") } });
  assert.equal((await fetch(`${base}/admin/students?view=all`, { headers: { Cookie: `ts_admin_session=${opsToken}` } })).status, 200);
  assert.equal((await fetch(`${base}/api/admin/students?q=UAT`, { headers: { Cookie: `ts_admin_session=${opsToken}` } })).status, 200);
  assert.equal((await fetch(`${base}/api/admin/students/${brother.id}/package-balance-preview`, { headers: { Cookie: `ts_admin_session=${opsToken}` } })).status, 403);
  const campaign = await prisma.monthlySchedulingCampaign.upsert({ where: { month: new Date(`${new Date(Date.now() + 8*3600000).toISOString().slice(0,7)}-01T00:00:00+08:00`) }, update: {}, create: { month: new Date(`${new Date(Date.now() + 8*3600000).toISOString().slice(0,7)}-01T00:00:00+08:00`) } });
  await prisma.monthlySchedulingItem.create({ data: { campaignId: campaign.id, courseId: course.id, studentId: sister.id, token: `uat-${Date.now()}`, status: "PAUSED" } });
  assert.equal((await studentSchedulingOverview([sister.id])).get(sister.id)?.needsScheduling, false);
  console.log(JSON.stringify({ passed: true, brotherId: brother.id, sisterId: sister.id, sourceId: source.id, targetId, subjectId: math.id, teacherId: teacher.id, campusId: campus.id, roomId: room.id, startAt: fmt(start) }));
}
main().finally(() => prisma.$disconnect());

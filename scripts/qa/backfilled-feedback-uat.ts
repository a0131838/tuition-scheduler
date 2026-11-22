import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../../lib/prisma";
import { formatBusinessDateOnly } from "../../lib/date-only";
import { getFeedbackDueAt } from "../../lib/feedback-timing";
import { syncSignInAlerts } from "../../lib/signin-alerts";
import { listCommunicationReminders } from "../../lib/communication-reminders";

async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
    const u = new URL(process.env[key] || "");
    assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "55439"); assert.equal(u.pathname, "/sgt_final_periods_uat");
  }
  const base = "http://127.0.0.1:3202", suffix = randomUUID().slice(0, 8), now = new Date();
  const teacher = await prisma.teacher.create({ data: { name: `Training Feedback Teacher ${suffix}` } });
  const course = await prisma.course.create({ data: { name: `Training Feedback English ${suffix}` } });
  const campus = await prisma.campus.create({ data: { name: `Training Feedback Campus ${suffix}` } });
  const tokens: Record<string, { cookie: string; mini: string; id: string }> = {};
  for (const role of ["ADMIN", "TEACHER", "FINANCE"] as const) {
    const user = await prisma.user.create({ data: { email: `backfill-${role}-${suffix}@example.invalid`, name: `Training ${role}`, role, passwordHash: randomUUID(), passwordSalt: randomUUID(), language: "BILINGUAL", ...(role === "TEACHER" ? { teacherId: teacher.id } : {}) } });
    const cookie = randomUUID(), mini = randomUUID(), expiresAt = new Date(+now + 86400000);
    await prisma.authSession.create({ data: { userId: user.id, token: cookie, expiresAt } });
    await prisma.staffMiniappSession.create({ data: { userId: user.id, token: mini, expiresAt } });
    tokens[role] = { cookie, mini, id: user.id };
  }
  const fixtures = [];
  for (let i = 0; i < 5; i++) {
    const student = await prisma.student.create({ data: { name: `Training Backfill ${i} ${suffix}` } });
    const klass = await prisma.class.create({ data: { teacherId: teacher.id, courseId: course.id, campusId: campus.id, capacity: 1, oneOnOneStudentId: student.id } });
    await prisma.enrollment.create({ data: { classId: klass.id, studentId: student.id } });
    const pkg = await prisma.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: "HOURS", paid: true, totalMinutes: 900, remainingMinutes: 900, validFrom: new Date(+now - 60 * 86400000) } });
    await prisma.packageTxn.create({ data: { packageId: pkg.id, kind: "PURCHASE", deltaMinutes: 900, deltaAmount: 1650, note: "Synthetic backfill training" } });
    const endAt = new Date(+now + (i === 3 ? 86400000 : -5 * 86400000) + i * 7200000);
    const session = await prisma.session.create({ data: { classId: klass.id, studentId: student.id, startAt: new Date(+endAt - 90 * 60000), endAt, ...(i === 2 || i === 4 ? { feedbackAvailableAt: null } : {}) } });
    fixtures.push({ student, klass, pkg, session });
  }
  const send = async (path: string, body?: unknown, mini = false, role = "TEACHER") => {
    const response = await fetch(base + path, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", ...(mini ? { Authorization: `Bearer ${tokens[role].mini}` } : { Cookie: `ts_admin_session=${tokens[role].cookie}` }) }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    return { status: response.status, data: await response.json().catch(() => null) };
  };
  for (const [i, fixture] of fixtures.entries()) {
    if (i === 3) continue;
    const saved = await send(`/api/admin/sessions/${fixture.session.id}/attendance`, { items: [{ studentId: fixture.student.id, status: "PRESENT", deductedMinutes: 90, note: "Synthetic attendance" }] }, false, "ADMIN");
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
  }
  const ids = fixtures.map(f => f.session.id), packageIds = fixtures.map(f => f.pkg.id);
  const snapshot = () => Promise.all([
    prisma.coursePackage.findMany({ where: { id: { in: packageIds } }, orderBy: { id: "asc" } }),
    prisma.attendance.findMany({ where: { sessionId: { in: ids } }, orderBy: { id: "asc" } }),
    prisma.packageTxn.findMany({ where: { packageId: { in: packageIds } }, orderBy: { id: "asc" } }),
  ]);
  const baseline = await snapshot();
  const workFor = async (id: string) => {
    const r = await send(`/api/miniapp/staff/schedule/${id}`, undefined, true);
    assert.equal(r.status, 200); return r.data.session.workStatus;
  };
  let work = await workFor(ids[0]);
  assert.equal(work.deductedMinutes, 90); assert.equal(work.deductionNeedsReview, false);
  assert.equal(work.feedbackPending, true); assert.equal(work.feedbackOverdue, false); assert.equal(work.backfilled, true);
  assert.equal(+new Date(work.feedbackDueAt), +getFeedbackDueAt(fixtures[0].session.endAt, fixtures[0].session.feedbackAvailableAt));
  const html = await (await fetch(base + "/teacher/sessions", { headers: { Cookie: `ts_admin_session=${tokens.TEACHER.cookie}` } })).text();
  assert.ok(html.includes("已扣课：90")); assert.ok(html.includes("补录课次")); assert.ok(html.includes("请勿重复扣课"));
  const overdueHtml = await (await fetch(base + `/admin/feedbacks?status=missing&studentId=${fixtures[0].student.id}`, { headers: { Cookie: `ts_admin_session=${tokens.ADMIN.cookie}` } })).text();
  assert.ok(!overdueHtml.includes(`focusSessionId=${ids[0]}`));
  const proxy = await send("/api/admin/feedbacks/proxy-draft", { sessionId: ids[0], teacherId: teacher.id }, false, "ADMIN");
  assert.equal(proxy.status, 409);
  // A provable legacy creation time is restored without assigning migration time to unknown history.
  const legacy = fixtures[4];
  const createdAt = new Date(+now - 2 * 3600000);
  await prisma.auditLog.create({ data: { actorEmail: "synthetic@example.invalid", actorRole: "ADMIN", module: "SCHEDULING", action: "SESSION_CREATED", entityType: "Session", entityId: legacy.session.id, createdAt } });
  const sql = readFileSync("prisma/migrations/20261122150000_backfilled_feedback_availability/migration.sql", "utf8");
  await prisma.$executeRawUnsafe(sql.slice(sql.indexOf("WITH created")));
  assert.equal(+(await prisma.session.findUniqueOrThrow({ where: { id: legacy.session.id } })).feedbackAvailableAt!, +createdAt);
  assert.equal((await prisma.session.findUniqueOrThrow({ where: { id: ids[2] } })).feedbackAvailableAt, null);
  assert.equal((await workFor(ids[2])).feedbackOverdue, true);
  assert.equal((await workFor(ids[3])).feedbackState, "NOT_DUE");
  const reminder = (await listCommunicationReminders(now, 10000)).find(r => r.key === `FEEDBACK_MISSING:${ids[0]}`);
  assert.ok(reminder); assert.equal(reminder.dueAt, work.feedbackDueAt); assert.notEqual(reminder.urgency, "OVERDUE");
  await prisma.appSetting.upsert({ where: { key: "signin_alert_sync_last_at" }, create: { key: "signin_alert_sync_last_at", value: "2000-01-01" }, update: { value: "2000-01-01" } });
  await syncSignInAlerts(now);
  assert.equal(await prisma.signInAlert.count({ where: { sessionId: ids[0], alertType: "TEACHER_FEEDBACK_OVERDUE", resolvedAt: null } }), 0);
  assert.ok(await prisma.signInAlert.count({ where: { sessionId: ids[2], alertType: "TEACHER_FEEDBACK_OVERDUE", resolvedAt: null } }));
  // Refreshes and saving the SAME attendance on either client must not charge again.
  for (let n = 0; n < 2; n++) {
    await workFor(ids[0]);
    assert.equal((await send(`/api/teacher/sessions/${ids[0]}/attendance`, { items: [{ studentId: fixtures[0].student.id, status: "PRESENT", note: "Synthetic attendance" }] })).status, 200);
    assert.equal((await send(`/api/miniapp/staff/schedule/${ids[0]}/attendance`, { items: [{ studentId: fixtures[0].student.id, status: "PRESENT", note: "Synthetic attendance" }] }, true)).status, 200);
  }
  // The balance and deduction identities/amounts stay fixed, even though attendance's saved timestamp legitimately changes.
  const afterResave = await snapshot();
  assert.deepEqual(afterResave[0], baseline[0]); assert.deepEqual(afterResave[2], baseline[2]);
  for (const a of afterResave[1]) { const old = baseline[1].find(x => x.id === a.id)!; assert.equal(a.deductedMinutes, old.deductedMinutes); assert.equal(a.packageId, old.packageId); }
  const beforeFeedback = await snapshot();
  const feedbackBody = { parentFeedbackSections: { lessonFocus: "Practised paragraph linking.", currentFinding: "Needs more linking vocabulary.", classPerformance: "Improved three sentences independently.", nextPlan: "Practise one paragraph next lesson.", parentNote: "Please encourage daily reading." }, homework: "Read one paragraph.", previousHomeworkDone: "not_assigned" };
  for (const [i, mini] of [[0, false], [1, true]] as const) {
    const path = mini ? `/api/miniapp/staff/schedule/${ids[i]}/feedback` : `/api/teacher/sessions/${ids[i]}/feedback`;
    const sent = await send(path, feedbackBody, mini); assert.equal(sent.status, 200, JSON.stringify(sent.data)); assert.equal(sent.data.status, "ON_TIME");
    const after = await workFor(ids[i]); assert.equal(after.feedbackPending, false); assert.equal(after.feedbackState, "SUBMITTED"); assert.equal(after.deductedMinutes, 90);
    const blocked = await send("/api/admin/feedbacks/proxy-draft", { sessionId: ids[i], teacherId: teacher.id }, false, "ADMIN"); assert.equal(blocked.status, 409);
  }
  assert.deepEqual(await snapshot(), beforeFeedback);
  const todos = await send("/api/miniapp/staff/teacher/todos", undefined, true);
  assert.ok(!todos.data.sessionTodos.some((r: any) => [ids[0], ids[1]].includes(r.id)));
  const day = formatBusinessDateOnly(fixtures[0].session.startAt);
  const calendar = await send(`/api/miniapp/staff/schedule/calendar?from=${day}&to=${day}`, undefined, true, "ADMIN");
  assert.equal(calendar.status, 200); assert.equal(calendar.data.sessions.find((r: any) => r.id === ids[0]).workStatus.feedbackState, "SUBMITTED");
  assert.equal((await send(`/api/miniapp/staff/schedule/${ids[0]}/feedback`, feedbackBody, true, "FINANCE")).status, 403);
  writeFileSync("/private/tmp/sgt-backfilled-feedback-fixtures.json", JSON.stringify({ ids, studentIds: fixtures.map(f => f.student.id), teacherId: teacher.id, tokens, day, suffix }), { mode: 0o600 });
  console.log(JSON.stringify({ passed: true, webMiniDeadlineParity: true, bothSubmitOnTime: true, proxyCannotOverrideSubmittedFeedback: true, legacyAuditEvidenceOnly: true, ordinaryDeadlineUnchanged: true, futureExcluded: true, reminderAlertParity: true, repeatedAttendanceNoDoubleCharge: true, feedbackWritesNoLedgerChange: true, submittedLeavesTeacherTodo: true, financeCannotSubmit: true }));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

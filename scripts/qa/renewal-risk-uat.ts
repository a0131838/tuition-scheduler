import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { syncRenewalTasks, updateRenewalTask, listRenewalTasks, renewalTaskDto } from "../../lib/renewal-management";
import { createStaffMiniappSession } from "../../lib/miniapp-staff";

async function main() {
  const db = new URL(process.env.DATABASE_URL || "");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "55439");
  assert.equal(db.pathname, "/sgt_workspace_completion_test");
  const suffix = Date.now();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "zhaohongwei0880@gmail.com" } });
  const student = await prisma.student.create({ data: { name: `Renewal risk UAT ${suffix}` } });
  const course = await prisma.course.create({ data: { name: `Renewal risk course ${suffix}` } });
  async function fixture(status: string, packageStatus: "ACTIVE" | "PAUSED" = "ACTIVE") {
    const pkg = await prisma.coursePackage.create({ data: {
      studentId: student.id, courseId: course.id, type: "HOURS", status: packageStatus,
      totalMinutes: 6000, remainingMinutes: 6000, validFrom: new Date("2026-01-01"),
    } });
    const task = await prisma.renewalTask.create({ data: { packageId: pkg.id, studentId: student.id,
      status, riskLevel: "YELLOW", remainingMinutes: 90, note: "Original staff note", nextFollowUpAt: new Date(),
    } });
    return { pkg, task };
  }
  const early = await fixture("PENDING_CONTACT");
  const paused = await fixture("PARENT_CONSIDERING", "PAUSED");
  const committed = await Promise.all(["RENEWAL_CONFIRMED", "CONTRACT_BILLING", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"].map(status => fixture(status)));
  const historical = await fixture("PACKAGE_ACTIVE");
  const signedDuringRisk = await fixture("PENDING_CONTACT");
  const template = await prisma.contractTemplate.create({ data: { name: "UAT only", slug: `renewal-risk-${suffix}`, version: 1, bodyHtml: "UAT only" } });
  await prisma.studentContract.create({ data: { studentId: student.id, packageId: signedDuringRisk.pkg.id, templateId: template.id,
    flowType: "RENEWAL", status: "SIGNED", signedAt: new Date(), intakeToken: `uat-renewal-${suffix}` } });
  await prisma.renewalTask.update({ where: { id: historical.task.id }, data: { completedAt: new Date("2026-08-01") } });
  const historicalBefore = await prisma.renewalTask.findUniqueOrThrow({ where: { id: historical.task.id } });
  const businessBefore = await prisma.coursePackage.findMany({ where: { studentId: student.id }, orderBy: { id: "asc" } });
  await Promise.all([syncRenewalTasks(user), syncRenewalTasks(user)]);
  const resolved = await prisma.renewalTask.findUniqueOrThrow({ where: { id: early.task.id } });
  assert.equal(resolved.status, "RISK_RESOLVED");
  assert.ok(resolved.completedAt);
  assert.equal(resolved.snoozedUntil, null);
  assert.equal(resolved.nextFollowUpAt, null);
  assert.ok(resolved.note?.startsWith("Original staff note"));
  assert.equal(resolved.paymentConfirmedAt, null);
  assert.equal(resolved.activatedPackageId, null);
  assert.equal(await prisma.auditLog.count({ where: { entityId: resolved.id, action: "AUTO_RESOLVE_RENEWAL_TASK" } }), 1);
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: resolved.id } });
  assert.equal((audit.meta as { renewalVerified: boolean }).renewalVerified, false);
  assert.equal((await prisma.renewalTask.findUniqueOrThrow({ where: { id: paused.task.id } })).status, "PAUSED_SPECIAL");
  const signedTask = await prisma.renewalTask.findUniqueOrThrow({ where: { id: signedDuringRisk.task.id } });
  assert.equal(signedTask.status, "PAYMENT_PENDING");
  assert.equal(signedTask.completedAt, null);
  assert.equal(signedTask.paymentConfirmedAt, null);
  for (const row of committed) {
    const after = await prisma.renewalTask.findUniqueOrThrow({ where: { id: row.task.id } });
    assert.equal(after.status, row.task.status);
    assert.equal(after.completedAt, null);
    assert.equal(after.remainingMinutes, 6000);
    assert.equal(after.riskLevel, "RESOLVED");
  }
  assert.deepEqual(await prisma.coursePackage.findMany({ where: { studentId: student.id }, orderBy: { id: "asc" } }), businessBefore);
  assert.deepEqual(await prisma.renewalTask.findUniqueOrThrow({ where: { id: historical.task.id } }), historicalBefore);
  await assert.rejects(updateRenewalTask({ id: resolved.id, actor: user, status: "PENDING_CONTACT" }), /保留历史/);
  await assert.rejects(updateRenewalTask({ id: committed[0].task.id, actor: user, status: "RISK_RESOLVED" }), /系统扫描/);
  const legacySaved = await updateRenewalTask({ id: resolved.id, actor: user, status: "PAUSED_SPECIAL", note: "Legacy client note" }, { legacyMiniapp: true });
  assert.equal(legacySaved.status, "RISK_RESOLVED");
  assert.equal(legacySaved.completedAt?.toISOString(), resolved.completedAt?.toISOString());
  assert.equal(legacySaved.snoozedUntil, null);
  const dto = renewalTaskDto((await listRenewalTasks({ status: "RISK_RESOLVED" })).find(row => row.id === resolved.id)!);
  assert.match(dto.statusLabel, /未核验续费/);
  // A later shortage creates a separate task immediately, preserving resolved history.
  await prisma.coursePackage.update({ where: { id: early.pkg.id }, data: { remainingMinutes: 60 } });
  await syncRenewalTasks(user);
  const newTask = await prisma.renewalTask.findFirstOrThrow({ where: { packageId: early.pkg.id, completedAt: null } });
  assert.notEqual(newTask.id, resolved.id);
  assert.equal(newTask.status, "PENDING_CONTACT");
  assert.equal(await prisma.renewalTask.count({ where: { packageId: early.pkg.id, completedAt: null } }), 1);

  if (process.env.UAT_HTTP === "1") {
    const base = "http://127.0.0.1:3149";
    const session = await createStaffMiniappSession(user.id);
    const headers = { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };
    const res = await fetch(`${base}/api/miniapp/staff/renewals?status=COMPLETED&limit=500`, { headers });
    assert.equal(res.status, 200);
    const body = await res.json();
    const rows = body.tasks ?? body.data?.tasks;
    const legacyRow = rows.find((row: { id: string }) => row.id === resolved.id);
    assert.equal(legacyRow.status, "PAUSED_SPECIAL");
    assert.equal(legacyRow.canonicalStatus, "RISK_RESOLVED");
    assert.match(legacyRow.statusLabel, /未核验续费/);
    const saved = await fetch(`${base}/api/miniapp/staff/renewals/${resolved.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: legacyRow.status, note: "Legacy HTTP edit" }) });
    assert.equal(saved.status, 200, await saved.text());
    assert.equal((await prisma.renewalTask.findUniqueOrThrow({ where: { id: resolved.id } })).status, "RISK_RESOLVED");
    const observer = await prisma.user.create({ data: { email: `renewal-observer-${suffix}@uat.invalid`, name: "UAT observer", role: "ADMIN", isObserver: true, passwordHash: "not-a-login", passwordSalt: "uat" } });
    const obsSession = await createStaffMiniappSession(observer.id);
    const denied = await fetch(`${base}/api/miniapp/staff/renewals/${resolved.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${obsSession.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAUSED_SPECIAL", note: "Must not be saved" }) });
    assert.ok(denied.status >= 400);
    assert.equal((await prisma.renewalTask.findUniqueOrThrow({ where: { id: resolved.id } })).note, "Legacy HTTP edit");
  }
  console.log(JSON.stringify({ passed: true, studentId: student.id, resolvedTaskId: resolved.id, newTaskId: newTask.id }));
}
main().finally(() => prisma.$disconnect());

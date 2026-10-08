import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
const base = "http://127.0.0.1:3149";
async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
    const url = new URL(process.env[key] || "");
    assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/sgt_workspace_completion_test");
  }
  const suffix = randomUUID();
  const user = await prisma.user.create({ data: { email: `${suffix}@uat.invalid`, name: "Ticket verification UAT", role: "ADMIN", passwordHash: "no-login", passwordSalt: "isolated" } });
  const token = randomUUID();
  await prisma.authSession.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) } });
  const cookie = `ts_admin_session=${token}`;
  const student = await prisma.student.create({ data: { name: `Ticket verification ${suffix}` } });
  const teacher = await prisma.teacher.create({ data: { name: "Verification teacher" } });
  const campus = await prisma.campus.create({ data: { name: `Verification campus ${suffix}` } });
  const room = await prisma.room.create({ data: { campusId: campus.id, name: "Verification room", capacity: 4 } });
  const course = await prisma.course.create({ data: { name: "Verification Math" } });
  const cls = await prisma.class.create({ data: { courseId: course.id, teacherId: teacher.id, campusId: campus.id, roomId: room.id, capacity: 1 } });
  const lesson = await prisma.session.create({ data: { classId: cls.id, studentId: student.id, startAt: new Date("2026-09-13T02:00Z"), endAt: new Date("2026-09-13T03:30Z"), attendances: { create: { studentId: student.id, status: "EXCUSED", excusedCharge: false } } } });
  async function ticket(type: string, actionType: string) {
    return prisma.ticket.create({ data: { ticketNo: `VERIFY-${randomUUID()}`, studentId: student.id, studentName: student.name, source: "家长小程序", type, priority: "Normal", status: "Confirmed", schedulingActions: { create: { sequence: 1, actionType, status: "READY", sourceSessionId: lesson.id, chargePolicy: "NO_CHARGE", notes: "不需要补课", ...(actionType === "RESCHEDULE_SESSION" ? { requestedStartAt: lesson.startAt } : {}) } } }, include: { schedulingActions: true } });
  }
  const cancel = await ticket("临时取消&请假课程", "CANCEL_SESSION");
  const reschedule = await ticket("改课程时间", "RESCHEDULE_SESSION");
  const snapshot = async () => ({ lesson: await prisma.session.findUnique({ where: { id: lesson.id } }), attendance: await prisma.attendance.findMany({ where: { sessionId: lesson.id } }), ledger: await prisma.packageTxn.findMany({ where: { sessionId: lesson.id } }) });
  const before = await snapshot();
  async function html(id: string) {
    const response = await fetch(`${base}/admin/tickets/${id}`, { headers: { Cookie: cookie } }); assert.equal(response.status, 200); return response.text();
  }
  let zhHtml = "";
  for (const language of ["EN", "ZH", "BILINGUAL"] as const) {
    await prisma.user.update({ where: { id: user.id }, data: { language } });
    const page = await html(cancel.id);
    assert(page.includes('id="ticket-existing-results"'));
    assert(page.includes(language === "EN" ? "Already updated the schedule? Verify and complete" : "已在课表处理？核验并完成"));
    assert(page.includes(language === "EN" ? "do not restore it first" : "无需先恢复课程"));
    const top = page.split('id="ticket-existing-results"')[1].split("</section>")[0];
    assert(!top.includes('value="NOT_REQUIRED"'));
    if (language === "ZH") zhHtml = page;
  }
  async function submit(id: string, page: string) {
    const form = [...page.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(match => match[1]).find(body => body.includes('name="existingResultVerified"'));
    assert(form, "result form missing");
    const data = new FormData();
    for (const input of form.matchAll(/<input\b[^>]*>/g)) {
      const name = input[0].match(/name="([^"]+)"/)?.[1], value = input[0].match(/value="([^"]*)"/)?.[1];
      if (name && input[0].includes('type="hidden"')) data.append(name, value ?? "");
    }
    data.set("existingResultVerified", "1");
    const response = await fetch(`${base}/admin/tickets/${id}`, { method: "POST", headers: { Cookie: cookie }, body: data, redirect: "manual" });
    assert.equal(response.status, 303); return response.headers.get("location") ?? "";
  }
  assert((await submit(cancel.id, zhHtml)).includes("existing-result-linked"));
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: cancel.id } })).status, "Completed");
  assert.equal((await prisma.ticketSchedulingAction.findUniqueOrThrow({ where: { id: cancel.schedulingActions[0].id } })).status, "APPLIED");
  assert((await submit(reschedule.id, await html(reschedule.id))).includes("result-evidence"));
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: reschedule.id } })).status, "Confirmed");
  assert.deepEqual(await snapshot(), before);
  console.log(JSON.stringify({ passed: true, cancelTicketId: cancel.id, rescheduleTicketId: reschedule.id, threeLanguages: true, completionSeparatedFromWithdrawal: true, cancelledLessonCannotProveReschedule: true, lessonAttendanceLedgerUnchanged: true }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

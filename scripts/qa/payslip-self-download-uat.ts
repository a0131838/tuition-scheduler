import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { operationsAdminSessionToken } from "../../lib/operations-admin-mode";
const base = "http://127.0.0.1:3153";
async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
    const url = new URL(process.env[key] || "");
    assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/sgt_workspace_completion_test");
  }
  const ids: string[] = [], payslipIds: string[] = [];
  let employeeId = "", entityId = "";
  try {
    async function account() {
      const user = await prisma.user.create({ data: { email: `${randomUUID()}@uat.invalid`, name: "Isolated payslip employee", role: "TEACHER", passwordHash: "no-login", passwordSalt: "isolated" } });
      ids.push(user.id);
      const token = await operationsAdminSessionToken(randomUUID());
      await prisma.authSession.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) } });
      return { user, cookie: `ts_admin_session=${token}` };
    }
    const own = await account(), other = await account();
    const entity = await prisma.hrLegalEntity.create({ data: { name: "Isolated payslip employer" } }); entityId = entity.id;
    const employee = await prisma.employeeProfile.create({ data: { userId: own.user.id, legalEntityId: entity.id, startDate: new Date("2050-01-01"), createdByUserId: own.user.id, updatedByUserId: own.user.id } }); employeeId = employee.id;
    const row = await prisma.hrPayslip.create({ data: { employeeId, legalEntityId: entityId, month: "2055-01", periodStart: new Date("2055-01-01"), periodEnd: new Date("2055-01-31"), preparedById: own.user.id, status: "DRAFT", basicSalaryCents: 10000, grossPayCents: 10000, netPayCents: 10000 } }); payslipIds.push(row.id);
    const path = `/api/hr/payslips/${row.id}/pdf`;
    const request = (cookie: string, target = path, method = "GET") => fetch(base + target, { method, headers: { Cookie: cookie }, redirect: "manual" });
    const unrelatedBefore = await Promise.all([prisma.packageTxn.count(), prisma.miniappNotificationOutbox.count()]);
    assert.equal((await request(own.cookie)).status, 403);
    assert.equal((await request(own.cookie, "/api/hr/payslips")).status, 403);
    assert.equal((await request(own.cookie, "/api/exports/teacher-payroll/example")).status, 403);
    for (const status of ["DIRECTOR_APPROVED", "PAID"] as const) {
      await prisma.hrPayslip.update({ where: { id: row.id }, data: { status } });
      const before = await prisma.hrPayslip.findUniqueOrThrow({ where: { id: row.id } });
      const response = await request(own.cookie);
      assert.equal(response.status, 200); assert.match(response.headers.get("content-type") || "", /application\/pdf/);
      const bytes = new Uint8Array(await response.arrayBuffer()); assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
      assert.equal((await request(other.cookie)).status, 403);
      assert.deepEqual(await prisma.hrPayslip.findUniqueOrThrow({ where: { id: row.id } }), before);
    }
    assert.equal((await request("")).status, 401);
    assert.equal((await request(own.cookie, path, "POST")).status, 405);
    await prisma.hrPayslip.update({ where: { id: row.id }, data: { status: "VOID" } });
    assert.equal((await request(own.cookie)).status, 403);
    assert.equal(await prisma.auditLog.count({ where: { entityId: row.id, action: "PAYSLIP_PDF_OPENED" } }), 2);
    assert.deepEqual(await Promise.all([prisma.packageTxn.count(), prisma.miniappNotificationOutbox.count()]), unrelatedBefore);
    console.log(JSON.stringify({ passed: true, signedOperationsSession: true, ownApprovedAndPaidPdf200: true, validPdfBytes: true, otherEmployee403: true, draftAndVoid403: true, anonymous401: true, post405: true, financeApisStill403: true, payrollRowsUnchangedByDownload: true, ledgerAndOutboxUnchanged: true }));
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: payslipIds } } });
    await prisma.hrPayslip.deleteMany({ where: { id: { in: payslipIds } } });
    if (employeeId) await prisma.employeeProfile.delete({ where: { id: employeeId } });
    if (entityId) await prisma.hrLegalEntity.delete({ where: { id: entityId } });
    await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

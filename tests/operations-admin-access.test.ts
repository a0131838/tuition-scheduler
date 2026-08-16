import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isOperationsAdminPathAllowed } from "../lib/operations-admin-access";
import { operationsAdminSessionToken, validOperationsAdminSessionToken } from "../lib/operations-admin-mode";
import {
  canUseMiniappAcademicDesk,
  canUseMiniappApprovalDesk,
  canUseMiniappLeadDesk,
  canUseMiniappRenewalDesk,
} from "../lib/miniapp-staff-action-center";
import {
  canAccessMiniappStaffSession,
  canManageMiniappSchedulingCoordination,
  canManageMiniappSchedulingWrites,
} from "../lib/miniapp-staff-session";
import { monthlySchedulingAccessFor } from "../lib/monthly-scheduling-access";
import { canOperationsAdminSetRenewalStatus } from "../lib/renewal-management";

const operationsUser = {
  id: "jessika",
  email: "sym.sweyeemon@gmail.com",
  name: "Jessika",
  role: "TEACHER",
  teacherId: "teacher-jessika",
  operationsAdmin: true,
  workspaceAccesses: [],
};

test("operations admin web session token is signed and tamper resistant", async () => {
  process.env.OPERATIONS_ADMIN_MODE_SECRET = "operations-admin-test-secret-long-enough";
  const token = await operationsAdminSessionToken("base-session-token");
  assert.equal(await validOperationsAdminSessionToken(token), true);
  assert.equal(await validOperationsAdminSessionToken(token.replace("base-session-token", "changed")), false);
  assert.equal(await validOperationsAdminSessionToken("base-session-token"), false);
});

test("operations route policy allows teaching operations and denies company finance", () => {
  for (const allowed of [
    "/admin",
    "/admin/students",
    "/admin/teachers/teacher-1/availability",
    "/admin/schedule",
    "/admin/tickets/abc",
    "/admin/communications/templates",
    "/admin/monthly-scheduling",
    "/admin/renewals",
    "/training/manage",
    "/api/admin/sessions/session-1/attendance",
    "/api/admin/teachers/teacher-1",
    "/api/admin/renewals/task-1",
  ]) assert.equal(isOperationsAdminPathAllowed(allowed), true, allowed);

  for (const blocked of [
    "/admin/finance/workbench",
    "/admin/approvals",
    "/admin/expense-claims",
    "/admin/packages",
    "/admin/reports/teacher-payroll",
    "/admin/reports/partner-settlement",
    "/admin/receipts-approvals/queue",
    "/admin/manager/users",
    "/admin/students/student-1/first-purchase",
    "/api/admin/packages/package-1/top-up",
    "/api/admin/parent-payment-records/payment-1/file",
    "/api/admin/students/student-1/package-balance-preview",
  ]) assert.equal(isOperationsAdminPathAllowed(blocked), false, blocked);
});

test("operations admin can manage academic and renewal reminders but never approvals", async () => {
  assert.equal(canUseMiniappAcademicDesk(operationsUser), true);
  assert.equal(canUseMiniappLeadDesk(operationsUser), true);
  assert.equal(await canUseMiniappApprovalDesk(operationsUser), false);
  assert.equal(canUseMiniappRenewalDesk(operationsUser), true);
  assert.equal(canManageMiniappSchedulingCoordination(operationsUser), true);
  assert.equal(canManageMiniappSchedulingWrites(operationsUser), true);
  assert.equal(canAccessMiniappStaffSession(operationsUser, { teacherId: "another-teacher", class: { teacherId: "another-teacher" } } as never), true);
});

test("operations admin renewal updates stop before contract and payment stages", () => {
  assert.equal(canOperationsAdminSetRenewalStatus("PENDING_CONTACT", "PARENT_NOTIFIED"), true);
  assert.equal(canOperationsAdminSetRenewalStatus("PARENT_CONSIDERING", "RENEWAL_CONFIRMED"), true);
  assert.equal(canOperationsAdminSetRenewalStatus("RENEWAL_CONFIRMED", "CONTRACT_BILLING"), false);
  assert.equal(canOperationsAdminSetRenewalStatus("PAYMENT_PENDING", "PARENT_CONSIDERING"), false);
  assert.equal(canOperationsAdminSetRenewalStatus("PAYMENT_PENDING", "PAYMENT_PENDING"), true);
});

test("renewal routes keep the authenticated actor authoritative", () => {
  for (const route of [
    "app/api/admin/renewals/[id]/route.ts",
    "app/api/miniapp/staff/renewals/[id]/route.ts",
  ]) {
    const source = fs.readFileSync(path.join(process.cwd(), route), "utf8");
    assert.match(source, /updateRenewalTask\(\{ \.\.\.\(body \?\? \{\}\), id, actor:/, route);
    assert.doesNotMatch(source, /actor:[^}]+\.\.\.\(body \?\? \{\}\)/, route);
  }
});

test("operations admin can manage next-month scheduling without finance access", () => {
  const access = monthlySchedulingAccessFor({ role: "TEACHER", workspaces: [], manager: false, operationsAdmin: true });
  assert.deepEqual(access, { canView: true, canManage: true, canViewStaffing: true });
});

test("release migration grants Jessika the restricted ACL and invalidates old web sessions", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "prisma/migrations/20260816173000_add_operations_admin_acl/migration.sql"),
    "utf8",
  );
  assert.match(migration, /sym\.sweyeemon@gmail\.com/);
  assert.match(migration, /DELETE FROM "AuthSession"/);
  assert.doesNotMatch(migration, /UPDATE "User" SET "role"/);
});

test("AI SSO maps operations administrators to academic rather than finance or manager", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/api/admin/ai-os/sso/route.ts"), "utf8");
  assert.match(source, /user\.operationsAdmin\) return "ACADEMIC"/);
  assert.doesNotMatch(source, /user\.operationsAdmin\) return "MANAGER_FINANCE"/);
});

test("operations administrators keep the standard admin home while finance widgets are omitted", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/admin/page.tsx"), "utf8");
  assert.match(source, /"Admin workbench", "管理工作台"/);
  assert.match(source, /!isOperationsAdmin \? <section/);
  assert.doesNotMatch(source, /"Operations workbench", "运营工作台"/);
});

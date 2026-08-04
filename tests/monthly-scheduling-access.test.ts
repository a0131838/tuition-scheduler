import assert from "node:assert/strict";
import test from "node:test";
import { monthlySchedulingAccessFor } from "../lib/monthly-scheduling-access";

test("academic and managers can operate monthly scheduling", () => {
  assert.deepEqual(monthlySchedulingAccessFor({ role: "CS", workspaces: [], manager: false }), {
    canView: true,
    canManage: true,
    canViewStaffing: true,
  });
  assert.equal(monthlySchedulingAccessFor({ role: "ADMIN", workspaces: [], manager: false }).canManage, true);
  assert.equal(monthlySchedulingAccessFor({ role: "TEACHER", workspaces: [], manager: true }).canManage, true);
});

test("finance is read-only and unrelated roles cannot open the desk", () => {
  const finance = monthlySchedulingAccessFor({ role: "FINANCE", workspaces: [], manager: false });
  assert.equal(finance.canView, true);
  assert.equal(finance.canManage, false);
  assert.equal(monthlySchedulingAccessFor({ role: "TEACHER", workspaces: [], manager: false }).canView, false);
});

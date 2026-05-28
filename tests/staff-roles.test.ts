import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessResourceWorkspaceRole,
  canManageResourceWorkspaceRole,
  canUseResourceOpsHandoffRole,
  isResourceOnlyRole,
  pickSystemUserRole,
  SYSTEM_USER_ROLES,
} from "../lib/staff-roles";

test("system roles include sales and cs", () => {
  assert.deepEqual(SYSTEM_USER_ROLES, ["ADMIN", "FINANCE", "SALES", "CS", "TEACHER", "STUDENT"]);
  assert.equal(pickSystemUserRole("SALES"), "SALES");
  assert.equal(pickSystemUserRole("CS"), "CS");
  assert.equal(pickSystemUserRole("UNKNOWN"), "ADMIN");
});

test("resource roles are scoped below admin", () => {
  assert.equal(isResourceOnlyRole("SALES"), true);
  assert.equal(isResourceOnlyRole("CS"), true);
  assert.equal(isResourceOnlyRole("ADMIN"), false);
  assert.equal(canAccessResourceWorkspaceRole("SALES"), true);
  assert.equal(canAccessResourceWorkspaceRole("CS"), true);
  assert.equal(canAccessResourceWorkspaceRole("FINANCE"), false);
  assert.equal(canManageResourceWorkspaceRole("SALES"), false);
  assert.equal(canManageResourceWorkspaceRole("ADMIN"), true);
  assert.equal(canUseResourceOpsHandoffRole("CS"), false);
  assert.equal(canUseResourceOpsHandoffRole("ADMIN"), true);
});

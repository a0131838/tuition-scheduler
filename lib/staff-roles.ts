export const SYSTEM_USER_ROLES = ["ADMIN", "FINANCE", "SALES", "CS", "TEACHER", "STUDENT"] as const;

export type SystemUserRole = (typeof SYSTEM_USER_ROLES)[number];

export function isSystemUserRole(value: string): value is SystemUserRole {
  return SYSTEM_USER_ROLES.includes(value as SystemUserRole);
}

export function pickSystemUserRole(value: string, fallback: SystemUserRole = "ADMIN"): SystemUserRole {
  return isSystemUserRole(value) ? value : fallback;
}

export function isResourceOnlyRole(role: string | null | undefined) {
  return role === "SALES" || role === "CS";
}

export function canAccessResourceWorkspaceRole(role: string | null | undefined) {
  return role === "ADMIN" || isResourceOnlyRole(role);
}

export function canManageResourceWorkspaceRole(role: string | null | undefined) {
  return role === "ADMIN";
}

export function canUseResourceOpsHandoffRole(role: string | null | undefined) {
  return role === "ADMIN";
}

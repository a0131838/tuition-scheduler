export const SYSTEM_USER_ROLES = ["ADMIN", "FINANCE", "SALES", "CS", "TEACHER", "STUDENT"] as const;
export const STAFF_WORKSPACES = ["SALES", "CS", "CARE"] as const;

export type SystemUserRole = (typeof SYSTEM_USER_ROLES)[number];
export type StaffWorkspace = (typeof STAFF_WORKSPACES)[number];

export function isSystemUserRole(value: string): value is SystemUserRole {
  return SYSTEM_USER_ROLES.includes(value as SystemUserRole);
}

export function pickSystemUserRole(value: string, fallback: SystemUserRole = "ADMIN"): SystemUserRole {
  return isSystemUserRole(value) ? value : fallback;
}

export function isStaffWorkspace(value: string): value is StaffWorkspace {
  return STAFF_WORKSPACES.includes(value as StaffWorkspace);
}

export function pickStaffWorkspaces(values: unknown): StaffWorkspace[] {
  const input = Array.isArray(values) ? values : [];
  const picked = new Set<StaffWorkspace>();
  for (const value of input) {
    const raw = String(value ?? "").trim().toUpperCase();
    if (isStaffWorkspace(raw)) picked.add(raw);
  }
  return STAFF_WORKSPACES.filter((workspace) => picked.has(workspace));
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

export function hasWorkspaceAccess(workspaces: readonly string[] | null | undefined, workspace: StaffWorkspace) {
  return Boolean(workspaces?.includes(workspace));
}

export function preferredResourceWorkspace(role: string | null | undefined, workspaces: readonly string[] | null | undefined): StaffWorkspace | null {
  if (role === "CS") return "CS";
  if (role === "SALES") return "SALES";
  if (hasWorkspaceAccess(workspaces, "CS")) return "CS";
  if (hasWorkspaceAccess(workspaces, "SALES")) return "SALES";
  return null;
}

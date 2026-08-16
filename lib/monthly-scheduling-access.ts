import { isManagerUser, requireAdminAreaUser } from "@/lib/auth";

export function monthlySchedulingAccessFor(input: { role: string; workspaces: string[]; manager: boolean; operationsAdmin?: boolean }) {
  const canManage = Boolean(input.operationsAdmin) || input.role === "ADMIN" || input.role === "CS" || input.workspaces.includes("CS") || input.manager;
  return {
    canView: canManage || input.role === "FINANCE",
    canManage,
    canViewStaffing: canManage || input.role === "FINANCE",
  };
}

export async function requireMonthlySchedulingUser() {
  const user = await requireAdminAreaUser();
  const manager = await isManagerUser(user);
  const access = monthlySchedulingAccessFor({ role: user.role, workspaces: user.workspaces, manager, operationsAdmin: user.operationsAdmin });
  if (!access.canView) throw new Error("Monthly scheduling permission required");
  return {
    user,
    canManage: access.canManage,
    canViewStaffing: access.canViewStaffing,
  };
}

import { redirect } from "next/navigation";
import { getCurrentUser, isManagerUser, isStrictSuperAdmin, requireAdminAreaUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SystemUserRole } from "@/lib/staff-roles";

export async function canManageHr(user: {
  role: SystemUserRole;
  email: string;
  name: string;
  workspaces?: readonly string[];
}) {
  if (isStrictSuperAdmin(user)) return true;
  if (user.role === "FINANCE" || user.role === "STUDENT") return false;
  if (user.workspaces?.includes("HR") && (user.role === "ADMIN" || user.role === "TEACHER")) return true;
  if (user.role !== "ADMIN" && user.role !== "TEACHER") return false;
  return isManagerUser(user);
}

export async function requireHrManager() {
  const user = await requireAdminAreaUser();
  if (!(await canManageHr(user))) redirect("/admin?err=HR+access+required");
  return user;
}

export function canOperateHrPayroll(user: { role: string }) {
  return user.role === "FINANCE" || user.role === "ADMIN";
}

export async function requireCurrentEmployee() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const employee = await prisma.employeeProfile.findUnique({
    where: { userId: user.id },
    include: { legalEntity: true, manager: { select: { id: true, name: true, email: true } } },
  });
  if (!employee) redirect(user.role === "TEACHER" ? "/teacher?err=Employee+profile+required" : "/admin?err=Employee+profile+required");
  return { user, employee };
}

export async function canViewEmployeeHrRecord(
  actor: { id: string; role: SystemUserRole; email: string; name: string; workspaces?: readonly string[] },
  employeeUserId: string,
) {
  if (actor.id === employeeUserId) return true;
  return canManageHr(actor);
}

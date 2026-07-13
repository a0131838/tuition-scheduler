import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type CareAccessUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaces: readonly string[];
};

export async function hasGeneralCareAccess(user: CareAccessUser | null | undefined) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (await isManagerUser(user as never)) return true;
  return user.role === "CS" && user.workspaces.includes("CARE");
}
export async function requireCareStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (await hasGeneralCareAccess(user)) return user;
  redirect("/admin");
}

export async function canAccessCareEngagement(user: CareAccessUser, engagementId: string) {
  if (!(await hasGeneralCareAccess(user))) return false;
  if (user.role === "ADMIN" || (await isManagerUser(user as never))) return true;
  const member = await prisma.careEngagementMember.findFirst({
    where: { engagementId, userId: user.id, isActive: true },
    select: { id: true },
  });
  return Boolean(member);
}

export async function requireCareEngagementAccess(engagementId: string) {
  const user = await requireCareStaff();
  if (!(await canAccessCareEngagement(user, engagementId))) redirect("/admin/care?err=No+access+to+this+care+record");
  return user;
}

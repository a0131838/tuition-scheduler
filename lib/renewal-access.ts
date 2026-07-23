import { isManagerUser, requireAdminAreaUser } from "@/lib/auth";

export async function requireRenewalCenterUser() {
  const user = await requireAdminAreaUser();
  const allowed =
    user.role === "ADMIN" ||
    user.role === "CS" ||
    user.role === "FINANCE" ||
    user.workspaces.includes("CS") ||
    (await isManagerUser(user));
  if (!allowed) throw new Error("Renewal center permission required");
  return user;
}

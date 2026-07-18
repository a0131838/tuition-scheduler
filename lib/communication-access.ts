import { isManagerUser, requireAdminAreaUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireCommunicationCenterUser() {
  const user = await requireAdminAreaUser();
  const allowed = user.role === "ADMIN" || user.role === "CS" || user.workspaces.includes("CS") || await isManagerUser(user);
  if (!allowed) redirect("/admin");
  return user;
}

export function communicationActor(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

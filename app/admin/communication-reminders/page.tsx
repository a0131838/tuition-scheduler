import { isManagerUser, requireAdminAreaUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CommunicationReminderClient from "./CommunicationReminderClient";

export default async function CommunicationRemindersPage() {
  const user = await requireAdminAreaUser();
  if (!(user.operationsAdmin || user.role === "ADMIN" || user.role === "CS" || user.workspaces.includes("CS") || await isManagerUser(user))) redirect("/admin");
  return <CommunicationReminderClient />;
}

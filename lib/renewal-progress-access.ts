import { isManagerUser } from "./auth";
import { requireRenewalCenterUser } from "./renewal-access";

export async function requireRenewalReportCoordinator() {
  const user = await requireRenewalCenterUser();
  if (!(user.role === "ADMIN" || user.role === "CS" || user.operationsAdmin || user.workspaces.includes("CS") || await isManagerUser(user))) {
    throw Error("Renewal report coordinator permission required");
  }
  return user;
}

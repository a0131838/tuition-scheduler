import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { schoolApplicationSignLinkCanRead } from "./school-application-document-policy";
import type { SchoolApplicationSummary } from "./school-application";

export async function canReadSchoolApplicationDocument(req: Request, app: SchoolApplicationSummary, staffOnly = false) {
  const user = await getCurrentUser();
  if (user && (user.role === "ADMIN" || user.role === "FINANCE" || await isManagerUser(user))) return true;
  if (staffOnly) return false;
  return schoolApplicationSignLinkCanRead(app, new URL(req.url).searchParams.get("token"));
}

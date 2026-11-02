import { getCurrentUser, isManagerUser } from "./auth";
import {
  loadParentReportSource,
  ParentReportError,
} from "./learning-report-parent-editions";
import type { ParentReportKind } from "./learning-report-parent-content";
export function parseParentReportKind(value: string): ParentReportKind {
  const k = value.toUpperCase();
  if (k !== "MIDTERM" && k !== "FINAL")
    throw new ParentReportError("NOT_FOUND", 404);
  return k;
}
export async function requireParentReportActor(
  kind: ParentReportKind,
  id: string,
  write = false,
) {
  const user = await getCurrentUser();
  if (!user) throw new ParentReportError("LOGIN_REQUIRED", 401);
  if (write && user.isObserver) throw new ParentReportError("READ_ONLY", 403);
  const current = await loadParentReportSource(kind, id);
  if (write && current.row.archivedAt)
    throw new ParentReportError("READ_ONLY", 403);
  const own =
    user.role === "TEACHER" &&
    !!user.teacherId &&
    user.teacherId === current.row.teacherId;
  const staff =
    user.role === "ADMIN" ||
    (await isManagerUser(user)) ||
    user.operationsAdmin;
  if (!own && !staff) throw new ParentReportError("NOT_ALLOWED", 403);
  return { user, ...current };
}

const ADMIN_PREFIX = "/admin";
const TEACHER_PREFIX = "/teacher";

export function isProtectedPath(pathname: string) {
  return pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(TEACHER_PREFIX);
}

export function isPublicAuthPath(pathname: string) {
  return pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/logout";
}

export function buildNextPath(pathname: string, search: string) {
  return `${pathname}${search || ""}`;
}

export function sanitizeNextPath(next: string) {
  const value = String(next ?? "").trim();
  if (!value) return "";
  if (!value.startsWith("/")) return "";
  if (value.startsWith("//")) return "";
  if (value.startsWith("/admin/login")) return "";
  return value;
}

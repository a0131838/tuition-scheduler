import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "ts_admin_session";
const ADMIN_PREFIX = "/admin";
const TEACHER_PREFIX = "/teacher";

function isProtectedPath(pathname: string) {
  return pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(TEACHER_PREFIX);
}

function isPublicAuthPath(pathname: string) {
  return pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/logout";
}

function buildNextPath(pathname: string, search: string) {
  return `${pathname}${search || ""}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) return NextResponse.next();
  if (isPublicAuthPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", buildNextPath(pathname, req.nextUrl.search));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"],
};

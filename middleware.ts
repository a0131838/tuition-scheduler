import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildNextPath, isProtectedPath, isPublicAuthPath } from "./lib/route-guards";

const SESSION_COOKIE = "ts_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const nextWithPath = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (!isProtectedPath(pathname)) return nextWithPath();
  if (isPublicAuthPath(pathname)) return nextWithPath();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", buildNextPath(pathname, req.nextUrl.search));
    return NextResponse.redirect(url);
  }

  return nextWithPath();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"],
};

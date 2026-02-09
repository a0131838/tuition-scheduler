import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Ensure server components can reliably infer the current pathname.
  // Some deployments don't provide Next internal headers; we set our own.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  headers.set("x-url", req.nextUrl.toString());
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"],
};


import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isMutationMethod, validObserverSessionToken } from "@/lib/observer-mode";
import { isOperationsAdminPathAllowed, operationsAdminLandingPath } from "@/lib/operations-admin-access";
import { validOperationsAdminSessionToken } from "@/lib/operations-admin-mode";

export async function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get("ts_admin_session")?.value;
  const observerMode = await validObserverSessionToken(sessionToken);
  const operationsAdminMode = await validOperationsAdminSessionToken(sessionToken);
  const pathname = req.nextUrl.pathname;
  const observerWriteAllowed = pathname === "/api/admin/auth/login" || pathname === "/api/miniapp/staff/auth/logout";
  if (observerMode && isMutationMethod(req.method) && !observerWriteAllowed) {
    return NextResponse.json(
      { ok: false, message: "Observer account is read-only / 观察者账号为只读，不能执行新增、修改、审批、发送或删除操作" },
      { status: 403 },
    );
  }
  if (operationsAdminMode && !isOperationsAdminPathAllowed(pathname)) {
    const landingPath = operationsAdminLandingPath(pathname);
    if (landingPath) return NextResponse.redirect(new URL(landingPath, req.url));
    return NextResponse.json(
      { ok: false, message: "Company finance access is not available for this account / 此账号不可访问公司财务功能" },
      { status: 403 },
    );
  }

  // Ensure server components can reliably infer the current pathname.
  // Some deployments don't provide Next internal headers; we set our own.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  headers.set("x-url", req.nextUrl.toString());
  headers.set("x-observer-mode", observerMode ? "1" : "0");
  headers.set("x-operations-admin-mode", operationsAdminMode ? "1" : "0");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/api/:path*"],
};

import { prisma } from "@/lib/prisma";
import { createSession, isManagerUser, verifyPassword } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/route-guards";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const next = String(body?.next ?? "").trim();
  const portal = String(body?.portal ?? "").trim().toLowerCase();

  if (!email || !password) return bad("Missing email or password", 409);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return bad("Invalid credentials", 401);

  const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) return bad("Invalid credentials", 401);

  const canEnterAdmin =
    user.role === "ADMIN" ||
    user.role === "FINANCE" ||
    (await isManagerUser({ role: user.role as any, email: user.email }));

  await createSession(user.id);

  const safeNext = sanitizeNextPath(next);
  if (safeNext) return Response.json({ ok: true, redirectTo: safeNext });

  if (portal === "teacher") {
    if (user.role === "TEACHER") return Response.json({ ok: true, redirectTo: "/teacher" });
    if (user.role === "ADMIN" && user.teacherId) return Response.json({ ok: true, redirectTo: "/teacher" });
    return bad("This account cannot enter Teacher Portal", 403);
  }

  if (portal === "admin") {
    if (canEnterAdmin) return Response.json({ ok: true, redirectTo: "/admin" });
    if (user.role === "TEACHER") return Response.json({ ok: true, redirectTo: "/teacher" });
    return bad("This account cannot enter Admin Portal", 403);
  }

  if (user.role === "TEACHER" && !canEnterAdmin) {
    return Response.json({ ok: true, redirectTo: "/teacher" });
  }

  return Response.json({ ok: true, redirectTo: "/admin" });
}

import { prisma } from "@/lib/prisma";
import { createPasswordHash, requireManager } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function pickRole(v: string) {
  return v === "ADMIN" || v === "TEACHER" || v === "STUDENT" ? v : "ADMIN";
}

function pickLang(v: string) {
  return v === "BILINGUAL" || v === "ZH" || v === "EN" ? v : "BILINGUAL";
}

export async function POST(req: Request) {
  await requireManager();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim();
  const role = pickRole(String(body?.role ?? ""));
  const language = pickLang(String(body?.language ?? ""));
  const teacherIdRaw = String(body?.teacherId ?? "").trim();
  const password = String(body?.password ?? "");

  if (!email || !name || !password) return bad("Email, name, and password are required", 409);
  if (password.length < 8) return bad("Password must be at least 8 characters", 409);

  const teacherId = role === "TEACHER" || role === "ADMIN" ? teacherIdRaw || null : null;
  if (teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
    if (!teacher) return bad("Teacher not found", 404);
    const linked = await prisma.user.findFirst({ where: { teacherId }, select: { email: true } });
    if (linked) return bad(`Teacher already linked to ${linked.email}`, 409);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return bad("Email already exists", 409);

  const { salt, hash } = createPasswordHash(password);
  await prisma.user.create({
    data: {
      email,
      name,
      role: role as any,
      language: language as any,
      teacherId,
      passwordSalt: salt,
      passwordHash: hash,
    },
  });

  return Response.json({ ok: true, message: "User created" }, { status: 201 });
}


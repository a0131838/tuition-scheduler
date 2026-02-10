import { prisma } from "@/lib/prisma";
import { requireAdmin, createPasswordHash } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await ctx.params;
  if (!teacherId) return bad("Missing teacherId", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim();
  const password = String(body?.password ?? "");

  if (!email || !name || !password) return bad("Email, name, and password are required", 409);
  if (password.length < 8) return bad("Password must be at least 8 characters", 409);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) return bad("Teacher not found", 404);

  const existingLinked = await prisma.user.findFirst({
    where: { teacherId },
    select: { id: true, email: true },
  });
  if (existingLinked) {
    return bad(`This teacher already has linked account: ${existingLinked.email}`, 409);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) return bad("Email already exists", 409);

  const { salt, hash } = createPasswordHash(password);
  await prisma.user.create({
    data: {
      email,
      name,
      role: "TEACHER",
      teacherId,
      passwordHash: hash,
      passwordSalt: salt,
    },
    select: { id: true },
  });

  return Response.json({ ok: true }, { status: 201 });
}


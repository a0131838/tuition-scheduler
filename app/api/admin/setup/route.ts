import { prisma } from "@/lib/prisma";
import { createPasswordHash, createSession } from "@/lib/auth";

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
  const name = String(body?.name ?? "").trim();
  const password = String(body?.password ?? "");

  if (!email || !name || !password) return bad("Missing fields", 409);

  const exists = await prisma.user.count();
  if (exists > 0) return bad("Setup already completed", 409, { redirectTo: "/admin/login" });

  const { salt, hash } = createPasswordHash(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "ADMIN",
      language: "BILINGUAL",
      passwordSalt: salt,
      passwordHash: hash,
    },
  });

  await createSession(user.id);
  return Response.json({ ok: true, redirectTo: "/admin" }, { status: 201 });
}


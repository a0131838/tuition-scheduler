import { prisma } from "@/lib/prisma";
import { requireOwnerManager } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireOwnerManager();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const note = String(body?.note ?? "").trim();

  if (!email || !email.includes("@")) return bad("Invalid manager email");

  await prisma.managerAcl.upsert({
    where: { email },
    update: { isActive: true, note: note || null },
    create: { email, isActive: true, note: note || null },
  });

  return Response.json({ ok: true, message: "Manager added" });
}


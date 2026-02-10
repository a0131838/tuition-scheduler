import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  const user = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const lang = String(body?.lang ?? "BILINGUAL");
  if (!["BILINGUAL", "ZH", "EN"].includes(lang)) return bad("Invalid lang", 409);

  await prisma.user.update({
    where: { id: user.id },
    data: { language: lang as any },
    select: { id: true },
  });

  return Response.json({ ok: true, lang });
}


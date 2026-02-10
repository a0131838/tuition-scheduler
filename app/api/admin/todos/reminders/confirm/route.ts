import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const kind = body?.kind === "teacher" || body?.kind === "student" ? (body.kind as "teacher" | "student") : null;
  const dateStr = typeof body?.date === "string" ? (body.date as string) : "";
  const targetIds = Array.isArray(body?.targetIds) ? (body.targetIds as unknown[]) : [];

  if (!kind) return bad("Missing kind");
  if (!dateStr) return bad("Missing date");

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return bad("Invalid date");

  const ids = targetIds.map((x) => String(x).trim()).filter(Boolean);
  if (ids.length === 0) {
    return Response.json({ ok: true, confirmedCount: 0 });
  }

  const type = kind === "teacher" ? "TEACHER_TOMORROW" : "STUDENT_TOMORROW";

  await prisma.todoReminderConfirm.createMany({
    data: ids.map((targetId) => ({ type, targetId, date })),
    skipDuplicates: true,
  });

  return Response.json({ ok: true, confirmedCount: ids.length });
}


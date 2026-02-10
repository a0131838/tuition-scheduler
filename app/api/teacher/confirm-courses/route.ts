import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

const TEACHER_SELF_CONFIRM_TODAY = "TEACHER_SELF_CONFIRM_TODAY";
const TEACHER_SELF_CONFIRM_TOMORROW = "TEACHER_SELF_CONFIRM_TOMORROW";

export async function POST(req: Request) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher) return bad("Teacher profile not linked", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const dayKind = String(body?.dayKind ?? "");
  const dateStr = String(body?.date ?? "");
  if (dayKind !== "today" && dayKind !== "tomorrow") return bad("Invalid dayKind", 409);
  if (!dateStr) return bad("Invalid date", 409);

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return bad("Invalid date", 409);

  const type = dayKind === "today" ? TEACHER_SELF_CONFIRM_TODAY : TEACHER_SELF_CONFIRM_TOMORROW;
  const row = await prisma.todoReminderConfirm.upsert({
    where: { type_targetId_date: { type, targetId: teacher.id, date: toDateOnly(date) } },
    create: { type, targetId: teacher.id, date: toDateOnly(date) },
    update: { createdAt: new Date() },
    select: { createdAt: true },
  });

  return Response.json({ ok: true, confirmedAt: row.createdAt.toISOString() });
}


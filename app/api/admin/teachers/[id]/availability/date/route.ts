import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { inAllowedWindow, toMin, AVAIL_MAX_TIME, AVAIL_MIN_TIME } from "@/app/api/teacher/availability/_lib";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

function parseYMD(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await params;
  if (!teacherId) return bad("Missing teacherId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const dateStr = String(body?.date ?? "");
  const start = String(body?.start ?? "");
  const end = String(body?.end ?? "");

  if (!dateStr || !start || !end) return bad("Missing input");
  const date = parseYMD(dateStr);
  if (Number.isNaN(date.getTime())) return bad("Invalid date");

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) return bad("End must be after start", 409);
  if (!inAllowedWindow(startMin, endMin)) {
    return bad(`Time must be between ${AVAIL_MIN_TIME} and ${AVAIL_MAX_TIME}`, 409);
  }

  const created = await prisma.teacherAvailabilityDate.create({
    data: { teacherId, date, startMin, endMin },
    select: { id: true, startMin: true, endMin: true },
  });

  return Response.json({ ok: true, slot: { id: created.id, date: dateStr, startMin: created.startMin, endMin: created.endMin } }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await params;
  if (!teacherId) return bad("Missing teacherId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const id = String(body?.id ?? "");
  if (!id) return bad("Missing id");

  await prisma.teacherAvailabilityDate.delete({ where: { id } });
  return Response.json({ ok: true });
}


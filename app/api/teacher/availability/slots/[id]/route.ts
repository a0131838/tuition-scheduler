import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { AVAIL_MAX_TIME, AVAIL_MIN_TIME, inAllowedWindow, toMin } from "../../_lib";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher?.id) return bad("Teacher profile not linked.", 403);

  const { id } = await params;
  if (!id) return bad("Missing id");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const start = String(body?.start ?? "");
  const end = String(body?.end ?? "");
  if (!start || !end) return bad("Missing input");

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (!(Number.isFinite(startMin) && Number.isFinite(endMin))) return bad("Invalid time");
  if (endMin <= startMin) return bad("End must be after start");
  if (!inAllowedWindow(startMin, endMin)) return bad(`Time must be between ${AVAIL_MIN_TIME} and ${AVAIL_MAX_TIME}`);

  const updated = await prisma.teacherAvailabilityDate.updateMany({
    where: { id, teacherId: teacher.id },
    data: { startMin, endMin },
  });
  if (updated.count <= 0) return bad("Slot not found", 404);

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher?.id) return bad("Teacher profile not linked.", 403);

  const { id } = await params;
  if (!id) return bad("Missing id");

  const deleted = await prisma.teacherAvailabilityDate.deleteMany({
    where: { id, teacherId: teacher.id },
  });
  if (deleted.count <= 0) return bad("Slot not found", 404);

  return Response.json({ ok: true });
}


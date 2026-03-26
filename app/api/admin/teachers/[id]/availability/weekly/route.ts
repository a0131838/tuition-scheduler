import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { inAllowedWindow, toMin, AVAIL_MAX_TIME, AVAIL_MIN_TIME } from "@/app/api/teacher/availability/_lib";
import { deleteTeacherAvailabilityWeeklySlot } from "@/lib/admin-teacher-availability";
import { findWeeklyAvailabilityOverlap, isAvailabilityDuplicateError } from "@/lib/availability-conflict";

function bad(message: string, status = 400) {
  return new Response(message, { status });
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

  const weekday = Number(body?.weekday);
  const start = String(body?.start ?? "");
  const end = String(body?.end ?? "");
  if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) return bad("Invalid weekday");
  if (!start || !end) return bad("Missing input");

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) return bad("End must be after start", 409);
  if (!inAllowedWindow(startMin, endMin)) {
    return bad(`Time must be between ${AVAIL_MIN_TIME} and ${AVAIL_MAX_TIME}`, 409);
  }

  const overlap = await findWeeklyAvailabilityOverlap(prisma, teacherId, weekday, startMin, endMin);
  if (overlap) return bad("Availability overlaps an existing weekly slot", 409);

  let created;
  try {
    created = await prisma.teacherAvailability.create({
      data: { teacherId, weekday, startMin, endMin },
      select: { id: true, weekday: true, startMin: true, endMin: true },
    });
  } catch (error) {
    if (isAvailabilityDuplicateError(error)) return bad("Availability slot already exists", 409);
    throw error;
  }

  return Response.json({ ok: true, slot: created }, { status: 201 });
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

  const deleted = await deleteTeacherAvailabilityWeeklySlot(prisma, teacherId, id);
  if (deleted.count === 0) return bad("Availability slot not found", 404);
  return Response.json({ ok: true });
}

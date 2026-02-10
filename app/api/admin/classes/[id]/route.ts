import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { NextRequest } from "next/server";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function canTeachSubject(
  teacher: { subjectCourseId?: string | null; subjects?: Array<{ id: string }> },
  subjectId?: string | null
) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  return Array.isArray(teacher?.subjects) ? teacher.subjects.some((s) => s.id === subjectId) : false;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const subjectId = String(body?.subjectId ?? "");
  const levelIdRaw = String(body?.levelId ?? "");
  const teacherId = String(body?.teacherId ?? "");
  const campusId = String(body?.campusId ?? "");
  const roomIdRaw = String(body?.roomId ?? "");
  const capacity = Number(body?.capacity ?? 0);

  if (!classId || !subjectId || !teacherId || !campusId || !Number.isFinite(capacity) || capacity <= 0) {
    return bad("Invalid input");
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { course: true },
  });
  if (!subject) return bad("Invalid subject", 404);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: { select: { id: true } } },
  });
  if (!teacher || !canTeachSubject(teacher as any, subjectId)) {
    return bad("Teacher cannot teach this subject", 409);
  }

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) return bad("Invalid subject or level", 409);
    levelId = levelIdRaw;
  }

  const roomId = roomIdRaw ? roomIdRaw : null;
  const courseId = subject.courseId;
  if (roomId) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { campusId: true, capacity: true },
    });
    if (!room || room.campusId !== campusId) return bad("Room does not match campus", 409);
    if (capacity > room.capacity) return bad("Class capacity exceeds room capacity", 409);
  }

  await prisma.class.update({
    where: { id: classId },
    data: { courseId, subjectId, levelId, teacherId, campusId, roomId, capacity },
  });

  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  await prisma.enrollment.deleteMany({ where: { classId } });
  await prisma.session.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });

  return Response.json({ ok: true });
}


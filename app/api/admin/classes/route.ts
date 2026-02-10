import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

function canTeachSubject(
  teacher: { subjectCourseId?: string | null; subjects?: Array<{ id: string }> },
  subjectId?: string | null
) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  return Array.isArray(teacher?.subjects) ? teacher.subjects.some((s) => s.id === subjectId) : false;
}

export async function POST(req: Request) {
  await requireAdmin();

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

  if (!subjectId || !teacherId || !campusId || !Number.isFinite(capacity) || capacity <= 0) {
    return bad("Missing required fields");
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { course: true },
  });
  if (!subject) return bad("Subject not found", 404);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: { select: { id: true } } },
  });
  if (!teacher) return bad("Teacher not found", 404);
  if (!canTeachSubject(teacher as any, subjectId)) return bad("Teacher cannot teach this subject", 409);

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) return bad("Invalid level", 409);
    levelId = levelIdRaw;
  }

  const courseId = subject.courseId;
  const roomId = roomIdRaw ? roomIdRaw : null;
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { campusId: true, capacity: true } });
    if (!room) return bad("Room not found", 404);
    if (room.campusId !== campusId) return bad("Room does not match campus", 409);
    if (capacity > room.capacity) return bad("Class capacity exceeds room capacity", 409);
  }

  const created = await prisma.class.create({
    data: {
      courseId,
      subjectId,
      levelId,
      teacherId,
      campusId,
      roomId,
      capacity,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, classId: created.id }, { status: 201 });
}


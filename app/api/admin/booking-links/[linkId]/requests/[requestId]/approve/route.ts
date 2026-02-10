import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ linkId: string; requestId: string }> }) {
  const admin = await requireAdmin();
  const { linkId, requestId } = await ctx.params;
  if (!linkId) return bad("Missing linkId", 409);
  if (!requestId) return bad("Missing requestId", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const note = String(body?.note ?? "").trim();
  const fmt = (d: Date) => new Date(d).toLocaleString();

  const reqRow = await prisma.studentBookingRequest.findUnique({
    where: { id: requestId },
    include: { link: true },
  });
  if (!reqRow || reqRow.linkId !== linkId) return bad("Request not found", 404);
  if (reqRow.status !== "PENDING") return bad("Request already processed", 409);

  const teacherSession = await prisma.session.findFirst({
    where: {
      startAt: { lt: reqRow.endAt },
      endAt: { gt: reqRow.startAt },
      OR: [{ teacherId: reqRow.teacherId }, { teacherId: null, class: { teacherId: reqRow.teacherId } }],
    },
    select: { id: true, classId: true, startAt: true, endAt: true },
  });
  if (teacherSession) {
    return bad(
      `Teacher conflict with session ${teacherSession.id} (class ${teacherSession.classId}) ${fmt(teacherSession.startAt)} - ${fmt(teacherSession.endAt)}`,
      409
    );
  }

  const teacherAppt = await prisma.appointment.findFirst({
    where: { teacherId: reqRow.teacherId, startAt: { lt: reqRow.endAt }, endAt: { gt: reqRow.startAt } },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherAppt) {
    return bad(`Teacher conflict with appointment ${fmt(teacherAppt.startAt)} - ${fmt(teacherAppt.endAt)}`, 409);
  }

  const studentAppt = await prisma.appointment.findFirst({
    where: { studentId: reqRow.studentId, startAt: { lt: reqRow.endAt }, endAt: { gt: reqRow.startAt } },
    select: { id: true, startAt: true, endAt: true },
  });
  if (studentAppt) {
    return bad(`Student conflict with appointment ${fmt(studentAppt.startAt)} - ${fmt(studentAppt.endAt)}`, 409);
  }

  const studentSessionConflict = await prisma.session.findFirst({
    where: {
      startAt: { lt: reqRow.endAt },
      endAt: { gt: reqRow.startAt },
      class: { enrollments: { some: { studentId: reqRow.studentId } } },
    },
    select: { id: true, classId: true },
  });
  if (studentSessionConflict) {
    return bad(`Student conflict with session ${studentSessionConflict.id} (class ${studentSessionConflict.classId})`, 409);
  }

  const candidateClasses = await prisma.class.findMany({
    where: {
      teacherId: reqRow.teacherId,
      enrollments: { some: { studentId: reqRow.studentId } },
    },
    include: { enrollments: { select: { studentId: true } } },
    take: 50,
  });
  let oneOnOneClass = candidateClasses.find((c) => c.enrollments.length === 1 && c.enrollments[0]?.studentId === reqRow.studentId);

  if (!oneOnOneClass) {
    const pkg = await prisma.coursePackage.findFirst({
      where: {
        studentId: reqRow.studentId,
        status: "ACTIVE",
        validFrom: { lte: reqRow.startAt },
        OR: [{ validTo: null }, { validTo: { gte: reqRow.startAt } }],
      },
      orderBy: { updatedAt: "desc" },
      select: { courseId: true },
    });
    const enrollmentRef = await prisma.enrollment.findFirst({
      where: { studentId: reqRow.studentId },
      orderBy: { id: "desc" },
      include: { class: { select: { courseId: true } } },
    });
    const teacherRef = await prisma.class.findFirst({
      where: { teacherId: reqRow.teacherId },
      orderBy: { id: "desc" },
      select: { courseId: true },
    });
    const fallbackCourse = await prisma.course.findFirst({
      orderBy: { name: "asc" },
      select: { id: true },
    });
    const courseId = pkg?.courseId ?? enrollmentRef?.class.courseId ?? teacherRef?.courseId ?? fallbackCourse?.id;
    if (!courseId) return bad("No course found for auto class creation", 409);

    const onlineCampus = await prisma.campus.findFirst({ where: { isOnline: true }, select: { id: true } });
    const anyCampus = onlineCampus ? null : await prisma.campus.findFirst({ select: { id: true } });
    const campusId = onlineCampus?.id ?? anyCampus?.id;
    if (!campusId) return bad("No campus found for auto class creation", 409);

    let created: { id: string } | null = null;
    try {
      created = await getOrCreateOneOnOneClassForStudent({
        teacherId: reqRow.teacherId,
        studentId: reqRow.studentId,
        courseId,
        campusId,
        roomId: null,
        ensureEnrollment: true,
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Failed to create 1-on-1 class";
      return bad(raw, 409);
    }
    if (!created) return bad("Failed to create 1-on-1 class", 409);

    oneOnOneClass =
      (await prisma.class.findUnique({
        where: { id: created.id },
        include: { enrollments: { select: { studentId: true } } },
      })) ?? undefined;
    if (!oneOnOneClass) return bad("Failed to load 1-on-1 class", 409);
  }

  await prisma.enrollment.upsert({
    where: { classId_studentId: { classId: oneOnOneClass.id, studentId: reqRow.studentId } },
    update: {},
    create: { classId: oneOnOneClass.id, studentId: reqRow.studentId },
  });

  const dupSession = await prisma.session.findFirst({
    where: { classId: oneOnOneClass.id, startAt: reqRow.startAt, endAt: reqRow.endAt },
    select: { id: true },
  });
  const sessionId =
    dupSession?.id ??
    (
      await prisma.session.create({
        data: {
          classId: oneOnOneClass.id,
          startAt: reqRow.startAt,
          endAt: reqRow.endAt,
          studentId: reqRow.studentId,
          teacherId: reqRow.teacherId === oneOnOneClass.teacherId ? null : reqRow.teacherId,
        },
        select: { id: true },
      })
    ).id;

  await prisma.studentBookingRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: admin.name,
      adminNote: note || `Approved by admin ${admin.name}: session created directly`,
      appointmentId: null,
      sessionId,
    },
  });

  return Response.json({ ok: true, sessionId }, { status: 201 });
}


import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { canUseMiniappAcademicDesk } from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";

function sessionStudentWhere(studentId: string) {
  return {
    OR: [
      { studentId },
      { class: { oneOnOneStudentId: studentId } },
      { attendances: { some: { studentId } } },
    ],
  };
}

function teacherSessionWhere(teacherId: string) {
  return { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] };
}

export async function GET(req: Request, context: { params: Promise<{ studentId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { studentId } = await context.params;
  const canAcademic = canUseMiniappAcademicDesk(auth.user);
  const teacherId = auth.user.role === "TEACHER" ? auth.user.teacherId : null;
  if (!canAcademic && !teacherId) return bad("Student workspace permission required", 403);

  if (teacherId) {
    const linked = await prisma.session.findFirst({
      where: { AND: [sessionStudentWhere(studentId), teacherSessionWhere(teacherId)] },
      select: { id: true },
    });
    if (!linked) return bad("Student not assigned to this teacher", 403);
  }

  const now = new Date();
  const sessionScope = teacherId ? { AND: [sessionStudentWhere(studentId), teacherSessionWhere(teacherId)] } : sessionStudentWhere(studentId);
  const [student, upcoming, recent, feedbacks] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        packages: { include: { course: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        tickets: { where: { isArchived: false }, orderBy: { updatedAt: "desc" }, take: 30 },
        parentLinks: canAcademic
          ? { include: { parent: { select: { name: true, phone: true, status: true } } }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }
          : false,
      },
    }),
    prisma.session.findMany({
      where: { AND: [sessionScope, { startAt: { gte: now } }] },
      include: {
        teacher: { select: { name: true } },
        class: { include: { teacher: { select: { name: true } }, course: { select: { name: true } }, subject: { select: { name: true } }, campus: { select: { name: true, isOnline: true } }, room: { select: { name: true } } } },
      },
      orderBy: { startAt: "asc" },
      take: 12,
    }),
    prisma.session.findMany({
      where: { AND: [sessionScope, { endAt: { lt: now } }] },
      include: {
        teacher: { select: { name: true } },
        class: { include: { teacher: { select: { name: true } }, course: { select: { name: true } }, subject: { select: { name: true } } } },
        attendances: { where: { studentId }, select: { status: true } },
      },
      orderBy: { startAt: "desc" },
      take: 12,
    }),
    prisma.sessionFeedback.findMany({
      where: {
        content: { not: "" },
        ...(teacherId ? {} : { reviewStatus: "PUBLISHED" }),
        session: sessionStudentWhere(studentId),
      },
      include: { teacher: { select: { name: true } }, session: { select: { startAt: true, class: { select: { course: { select: { name: true } } } } } } },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
  ]);
  if (!student) return bad("Student not found", 404);

  const packages = student.packages.map((pkg) => ({
    id: pkg.id,
    courseName: pkg.course.name,
    status: pkg.status,
    remainingMinutes: pkg.remainingMinutes,
    remainingHours: pkg.remainingMinutes == null ? null : Math.round((pkg.remainingMinutes / 60) * 10) / 10,
    validTo: pkg.validTo ? formatBusinessDateOnly(pkg.validTo) : null,
    lowBalance: pkg.status === "ACTIVE" && pkg.remainingMinutes != null && pkg.remainingMinutes <= 180,
  }));
  const openTickets = student.tickets
    .filter((row) => !["Completed", "Cancelled"].includes(row.status))
    .map((row) => ({ id: row.id, ticketNo: row.ticketNo, type: row.type, status: row.status, owner: row.owner, nextAction: row.nextAction, dueText: row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "" }));
  const sessionDto = (row: any) => ({
    id: row.id,
    startText: formatBusinessDateTime(row.startAt),
    courseLabel: [row.class.course?.name, row.class.subject?.name].filter(Boolean).join(" / "),
    teacherName: row.teacher?.name ?? row.class.teacher?.name ?? "-",
    locationText: row.class.campus ? (row.class.campus.isOnline ? "线上" : [row.class.campus.name, row.class.room?.name].filter(Boolean).join(" · ")) : "",
    attendanceStatus: row.attendances?.[0]?.status ?? null,
  });
  const riskFlags = [
    ...(packages.some((row) => row.lowBalance) ? ["课包余额偏低"] : []),
    ...(upcoming.length === 0 ? ["暂无未来课程"] : []),
    ...(openTickets.some((row) => row.dueText && new Date(student.tickets.find((ticket) => ticket.id === row.id)?.nextActionDue ?? 0) < now) ? ["存在逾期工单"] : []),
    ...(student.academicRiskLevel && student.academicRiskLevel !== "LOW" ? [`学术风险：${student.academicRiskLevel}`] : []),
  ];

  return ok({
    student: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      school: student.school,
      targetSchool: student.targetSchool,
      servicePlanType: student.servicePlanType,
      academicRiskLevel: student.academicRiskLevel,
      currentRiskSummary: student.currentRiskSummary,
      nextAction: student.nextAction,
      nextActionDue: student.nextActionDue ? formatBusinessDateTime(student.nextActionDue) : "",
      advisorOwner: student.advisorOwner,
    },
    capabilities: { canViewOperations: canAcademic, canViewParentContacts: canAcademic, canCreateRequest: canAcademic },
    parents: canAcademic
      ? (student.parentLinks as any[]).map((link) => ({ name: link.parent.name || "家长", phone: link.parent.phone || "", relationship: link.relationship || "", groupName: link.wechatGroupName || "", owner: link.communicationOwner || "", primary: link.isPrimary }))
      : [],
    packages,
    openTickets,
    upcoming: upcoming.map(sessionDto),
    recent: recent.map(sessionDto),
    feedbacks: feedbacks.map((row) => ({ id: row.id, teacherName: row.teacher.name, courseName: row.session.class.course.name, lessonDate: formatBusinessDateOnly(row.session.startAt), content: row.parentContent || row.content, homework: row.homework || "" })),
    riskFlags,
  });
}

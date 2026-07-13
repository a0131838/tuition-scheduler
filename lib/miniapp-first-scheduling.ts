import { PackageFinanceGateStatus, PackageType, Prisma } from "@prisma/client";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { NEW_SESSION_TICKET_TYPES } from "@/lib/miniapp-scheduling-coordination-board";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";

type FirstSchedulingActor = { id: string; email: string; name: string | null; role: string };

const OPEN_FINANCE_GATES = new Set<PackageFinanceGateStatus>([
  PackageFinanceGateStatus.EXEMPT,
  PackageFinanceGateStatus.SCHEDULABLE,
]);

type CandidatePackage = {
  id: string;
  type: PackageType;
  remainingMinutes: number | null;
  validFrom: Date;
  validTo: Date | null;
  financeGateStatus: PackageFinanceGateStatus;
  financeGateReason: string | null;
  course: { id: string; name: string; _count: { subjects: number } };
};

export function firstSchedulingPackageState(packages: CandidatePackage[]) {
  const withSubjects = packages.filter((row) => row.course._count.subjects > 0);
  const ready = withSubjects.filter((row) => OPEN_FINANCE_GATES.has(row.financeGateStatus));
  const reasons: string[] = [];
  if (!withSubjects.length) reasons.push("有效课包对应课程尚未配置科目");
  if (withSubjects.length && !ready.length) reasons.push("课包财务门禁尚未放行");
  return { ready: ready.length > 0, readyCount: ready.length, reasons };
}

function remainingText(pkg: CandidatePackage) {
  if (pkg.type === PackageType.MONTHLY) return "月度课包";
  const minutes = Math.max(0, pkg.remainingMinutes ?? 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
}

function collectSessionStudentIds(rows: Array<{
  studentId: string | null;
  class: { oneOnOneStudentId: string | null; enrollments: Array<{ studentId: string }> };
  attendances: Array<{ studentId: string }>;
}>) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.studentId) ids.add(row.studentId);
    if (row.class.oneOnOneStudentId) ids.add(row.class.oneOnOneStudentId);
    row.class.enrollments.forEach((item) => ids.add(item.studentId));
    row.attendances.forEach((item) => ids.add(item.studentId));
  }
  return ids;
}

export async function listMiniappFirstSchedulingCandidates(input?: { query?: string; limit?: number }) {
  const now = new Date();
  const query = String(input?.query ?? "").trim().slice(0, 80);
  const limit = Math.min(200, Math.max(1, input?.limit ?? 100));
  const packages = await prisma.coursePackage.findMany({
    where: {
      status: "ACTIVE",
      AND: [
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        { OR: [{ type: "MONTHLY" }, { remainingMinutes: { gt: 0 } }] },
      ],
      ...(query
        ? {
            student: {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { school: { contains: query, mode: "insensitive" as const } },
                { targetSchool: { contains: query, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      type: true,
      remainingMinutes: true,
      validFrom: true,
      validTo: true,
      financeGateStatus: true,
      financeGateReason: true,
      course: { select: { id: true, name: true, _count: { select: { subjects: true } } } },
      student: {
        select: {
          id: true,
          name: true,
          grade: true,
          school: true,
          targetSchool: true,
          servicePlanType: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ student: { createdAt: "desc" } }, { updatedAt: "desc" }],
    take: Math.max(limit * 8, 400),
  });
  const byStudent = new Map<string, { student: (typeof packages)[number]["student"]; packages: CandidatePackage[] }>();
  for (const pkg of packages) {
    const group = byStudent.get(pkg.student.id) ?? { student: pkg.student, packages: [] };
    group.packages.push(pkg);
    byStudent.set(pkg.student.id, group);
  }
  const studentIds = Array.from(byStudent.keys());
  if (!studentIds.length) {
    return { candidates: [], summary: { total: 0, ready: 0, blocked: 0, withOpenTicket: 0, first: 0, renewal: 0 } };
  }

  const [futureSessions, studentsWithAnySession, tickets] = await Promise.all([
    prisma.session.findMany({
      where: {
        startAt: { gte: now },
        OR: [
          { studentId: { in: studentIds } },
          { class: { oneOnOneStudentId: { in: studentIds } } },
          { class: { enrollments: { some: { studentId: { in: studentIds } } } } },
          { attendances: { some: { studentId: { in: studentIds } } } },
        ],
      },
      select: {
        studentId: true,
        class: { select: { oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
        attendances: { select: { studentId: true } },
      },
    }),
    prisma.student.findMany({
      where: {
        id: { in: studentIds },
        OR: [
          { sessions: { some: {} } },
          { oneOnOneClasses: { some: { sessions: { some: {} } } } },
          { enrollments: { some: { class: { sessions: { some: {} } } } } },
          { attendances: { some: {} } },
        ],
      },
      select: { id: true },
    }),
    prisma.ticket.findMany({
      where: {
        studentId: { in: studentIds },
        type: { in: [...NEW_SESSION_TICKET_TYPES] },
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled"] },
      },
      select: { id: true, ticketNo: true, studentId: true, type: true, status: true, owner: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const scheduledIds = collectSessionStudentIds(futureSessions);
  const historicalIds = new Set(studentsWithAnySession.map((row) => row.id));
  const ticketByStudent = new Map<string, (typeof tickets)[number]>();
  for (const ticket of tickets) if (ticket.studentId && !ticketByStudent.has(ticket.studentId)) ticketByStudent.set(ticket.studentId, ticket);

  const allCandidates = Array.from(byStudent.values())
    .filter((row) => !scheduledIds.has(row.student.id))
    .map((row) => {
      const state = firstSchedulingPackageState(row.packages);
      const openTicket = ticketByStudent.get(row.student.id) ?? null;
      const courseMap = new Map<string, { id: string; name: string; packages: CandidatePackage[] }>();
      for (const pkg of row.packages) {
        const course = courseMap.get(pkg.course.id) ?? { id: pkg.course.id, name: pkg.course.name, packages: [] };
        course.packages.push(pkg);
        courseMap.set(pkg.course.id, course);
      }
      return {
        id: row.student.id,
        name: row.student.name,
        grade: row.student.grade,
        school: row.student.school ?? row.student.targetSchool,
        servicePlanType: row.student.servicePlanType,
        createdAtText: formatBusinessDateOnly(row.student.createdAt),
        scheduleStage: historicalIds.has(row.student.id) ? "renewal" : "first",
        scheduleStageText: historicalIds.has(row.student.id) ? "待续排" : "首次排课",
        ready: state.ready,
        blockerText: state.reasons.join("；"),
        courses: Array.from(courseMap.values()).map((course) => ({
          id: course.id,
          name: course.name,
          packageText: course.packages.map(remainingText).join(" / "),
          financeReady: course.packages.some((pkg) => OPEN_FINANCE_GATES.has(pkg.financeGateStatus)),
        })),
        openTicket,
      };
    })
    .sort((a, b) => Number(b.ready) - Number(a.ready) || a.name.localeCompare(b.name, "zh-CN"));
  const candidates = allCandidates.slice(0, limit);
  return {
    candidates,
    summary: {
      total: allCandidates.length,
      ready: allCandidates.filter((row) => row.ready).length,
      blocked: allCandidates.filter((row) => !row.ready).length,
      withOpenTicket: allCandidates.filter((row) => Boolean(row.openTicket)).length,
      first: allCandidates.filter((row) => row.scheduleStage === "first").length,
      renewal: allCandidates.filter((row) => row.scheduleStage === "renewal").length,
    },
  };
}

export async function ensureMiniappFirstSchedulingTicket(studentId: string, actor: FirstSchedulingActor) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true },
    });
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    const futureSession = await tx.session.findFirst({
      where: {
        startAt: { gte: now },
        OR: [
          { studentId },
          { class: { oneOnOneStudentId: studentId } },
          { class: { enrollments: { some: { studentId } } } },
          { attendances: { some: { studentId } } },
        ],
      },
      select: { id: true },
    });
    if (futureSession) throw new Error("ALREADY_SCHEDULED");
    const activePackage = await tx.coursePackage.findFirst({
      where: {
        studentId,
        status: "ACTIVE",
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
          { OR: [{ type: "MONTHLY" }, { remainingMinutes: { gt: 0 } }] },
        ],
      },
      select: { id: true },
    });
    if (!activePackage) throw new Error("NO_ACTIVE_PACKAGE");
    const existing = await tx.ticket.findFirst({
      where: {
        studentId,
        type: { in: [...NEW_SESSION_TICKET_TYPES] },
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return { ticket: existing, created: false };

    const ticketNo = await allocateTicketNo(tx);
    const summary = composeTicketSituation({
      currentIssue: "新学生已有有效课包，尚未安排未来课程。",
      requiredAction: "请教务确认科目、老师、地点和时间，完成首次排课。",
      latestDeadlineText: "尽快完成首次排课",
    });
    const ticket = await tx.ticket.create({
      data: {
        ticketNo,
        studentId,
        source: "员工小程序",
        type: "新排课",
        priority: "普通",
        studentName: student.name,
        grade: student.grade,
        poc: actor.name || actor.email,
        status: "Need Info",
        owner: "Jasmine",
        version: "V1",
        systemUpdated: "N",
        summary,
        parentVisible: false,
        nextAction: "确认学生和老师可上课时间，完成首次排课。",
        nextActionDue: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        risksNotes: `由 ${actor.name || actor.email} 从员工小程序首次排课看板创建。`,
        createdByName: `员工小程序：${actor.name || actor.email}`,
        lastUpdateAt: now,
      },
    });
    await tx.auditLog.create({
      data: {
        actorEmail: actor.email.trim().toLowerCase(),
        actorName: actor.name?.trim() || null,
        actorRole: actor.role,
        module: "SCHEDULING",
        action: "MINIAPP_FIRST_SCHEDULING_TICKET_CREATE",
        entityType: "Ticket",
        entityId: ticket.id,
        meta: { studentId },
      },
    });
    return { ticket, created: true };
  }, { maxWait: 5000, timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

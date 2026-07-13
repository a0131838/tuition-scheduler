import { PackageFinanceGateStatus, PackageType, Prisma } from "@prisma/client";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { NEW_SESSION_TICKET_TYPES } from "@/lib/miniapp-scheduling-coordination-board";
import { prisma } from "@/lib/prisma";
import { getSessionStudentIds, sessionBelongsToStudentWhere, sessionBelongsToStudentsWhere } from "@/lib/session-students";
import { allocateTicketNo, composeTicketSituation } from "@/lib/tickets";

type FirstSchedulingActor = { id: string; email: string; name: string | null; role: string };

const OPEN_FINANCE_GATES = new Set<PackageFinanceGateStatus>([
  PackageFinanceGateStatus.EXEMPT,
  PackageFinanceGateStatus.SCHEDULABLE,
]);

const candidatePackageSelect = Prisma.validator<Prisma.CoursePackageSelect>()({
  id: true,
  type: true,
  remainingMinutes: true,
  validFrom: true,
  validTo: true,
  financeGateStatus: true,
  financeGateReason: true,
  student: { select: { id: true, name: true } },
  sharedStudents: { select: { student: { select: { id: true, name: true } } } },
  course: { select: { id: true, name: true, _count: { select: { subjects: true } } } },
});

export type CandidatePackage = Prisma.CoursePackageGetPayload<{ select: typeof candidatePackageSelect }>;

export function firstSchedulingPackageState(packages: CandidatePackage[]) {
  if (!packages.length) {
    return { ready: false, readyCount: 0, reasons: ["没有可用于排课的有效课包"] };
  }
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

export function mergeCandidatePackages(owned: CandidatePackage[], shared: CandidatePackage[]) {
  const packages = new Map<string, CandidatePackage>();
  for (const pkg of [...owned, ...shared]) packages.set(pkg.id, pkg);
  return Array.from(packages.values());
}

export function candidatePackageSharingText(pkg: CandidatePackage, studentId: string) {
  if (!pkg.sharedStudents.length) return "";
  if (pkg.student.id !== studentId) return `共享课包主学生：${pkg.student.name}`;
  const names = pkg.sharedStudents.map((row) => row.student.name).filter(Boolean);
  return names.length ? `与 ${names.join("、")} 共用` : "共享课包";
}

function collectSessionStudentIds(rows: Array<{
  studentId: string | null;
  class: { capacity: number; oneOnOneStudentId: string | null; enrollments: Array<{ studentId: string }> };
  attendances: Array<{ studentId: string }>;
}>) {
  const ids = new Set<string>();
  for (const row of rows) {
    getSessionStudentIds(row).forEach((studentId) => ids.add(studentId));
  }
  return ids;
}

type SchedulingScope = "all" | "attention" | "first" | "renewal" | "scheduled" | "blocked";

export function studentSchedulingTicketType(hasFutureSession: boolean) {
  return hasFutureSession ? "补课加课" : "新排课";
}

export async function listMiniappFirstSchedulingCandidates(input?: { query?: string; limit?: number; scope?: string }) {
  const now = new Date();
  const query = String(input?.query ?? "").trim().slice(0, 80);
  const limit = Math.min(200, Math.max(1, input?.limit ?? 100));
  const scope: SchedulingScope = ["attention", "first", "renewal", "scheduled", "blocked"].includes(String(input?.scope))
    ? input?.scope as SchedulingScope
    : "all";
  const activePackageWhere = {
    status: "ACTIVE" as const,
    AND: [
      { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      { OR: [{ type: "MONTHLY" as const }, { remainingMinutes: { gt: 0 } }] },
    ],
  } satisfies Prisma.CoursePackageWhereInput;
  const students = await prisma.student.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { school: { contains: query, mode: "insensitive" as const } },
              { targetSchool: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      grade: true,
      school: true,
      targetSchool: true,
      servicePlanType: true,
      createdAt: true,
      packages: {
        where: activePackageWhere,
        select: candidatePackageSelect,
        orderBy: { updatedAt: "desc" },
      },
      sharedPackageLinks: {
        where: { package: activePackageWhere },
        select: { package: { select: candidatePackageSelect } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });
  const studentIds = students.map((row) => row.id);
  if (!studentIds.length) {
    return { candidates: [], summary: { total: 0, attention: 0, ready: 0, blocked: 0, withOpenTicket: 0, first: 0, renewal: 0, scheduled: 0 } };
  }

  const [futureSessions, historicalSessions, tickets] = await Promise.all([
    prisma.session.findMany({
      where: {
        startAt: { gte: now },
        ...sessionBelongsToStudentsWhere(studentIds),
      },
      select: {
        studentId: true,
        class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
        attendances: { select: { studentId: true } },
      },
    }),
    prisma.session.findMany({
      where: {
        ...sessionBelongsToStudentsWhere(studentIds),
      },
      select: {
        studentId: true,
        class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
        attendances: { select: { studentId: true } },
      },
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
  const historicalIds = collectSessionStudentIds(historicalSessions);
  const ticketByStudent = new Map<string, (typeof tickets)[number]>();
  for (const ticket of tickets) if (ticket.studentId && !ticketByStudent.has(ticket.studentId)) ticketByStudent.set(ticket.studentId, ticket);

  const allCandidates = students
    .map((student) => {
      const packages = mergeCandidatePackages(
        student.packages,
        student.sharedPackageLinks.map((row) => row.package),
      );
      const row = { student, packages };
      const state = firstSchedulingPackageState(row.packages);
      const openTicket = ticketByStudent.get(row.student.id) ?? null;
      const hasFutureSession = scheduledIds.has(row.student.id);
      const scheduleStage = hasFutureSession ? "scheduled" : historicalIds.has(row.student.id) ? "renewal" : "first";
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
        scheduleStage,
        scheduleStageText: scheduleStage === "scheduled" ? "已有未来课程" : scheduleStage === "renewal" ? "待续排" : "首次排课",
        needsAttention: !hasFutureSession && row.packages.length > 0,
        ready: state.ready,
        blockerText: state.reasons.join("；"),
        courses: Array.from(courseMap.values()).map((course) => ({
          id: course.id,
          name: course.name,
          packageText: course.packages.map((pkg) => {
            const sharing = candidatePackageSharingText(pkg, row.student.id);
            return [remainingText(pkg), sharing].filter(Boolean).join(" · ");
          }).join(" / "),
          financeReady: course.packages.some((pkg) => OPEN_FINANCE_GATES.has(pkg.financeGateStatus)),
        })),
        openTicket,
      };
    })
    .sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention) || Number(b.ready) - Number(a.ready) || a.name.localeCompare(b.name, "zh-CN"));
  const scopedCandidates = allCandidates.filter((row) => {
    if (scope === "attention") return row.needsAttention;
    if (scope === "first" || scope === "renewal" || scope === "scheduled") return row.scheduleStage === scope;
    if (scope === "blocked") return !row.ready;
    return true;
  });
  const candidates = scopedCandidates.slice(0, limit);
  return {
    candidates,
    summary: {
      total: allCandidates.length,
      attention: allCandidates.filter((row) => row.needsAttention).length,
      ready: allCandidates.filter((row) => row.ready).length,
      blocked: allCandidates.filter((row) => !row.ready).length,
      withOpenTicket: allCandidates.filter((row) => Boolean(row.openTicket)).length,
      first: allCandidates.filter((row) => row.scheduleStage === "first").length,
      renewal: allCandidates.filter((row) => row.scheduleStage === "renewal").length,
      scheduled: allCandidates.filter((row) => row.scheduleStage === "scheduled").length,
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
        ...sessionBelongsToStudentWhere(studentId),
      },
      select: { id: true },
    });
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

    const ticketType = studentSchedulingTicketType(Boolean(futureSession));
    const ticketNo = await allocateTicketNo(tx);
    const summary = composeTicketSituation({
      currentIssue: futureSession ? "学生已有未来课程，需要继续安排新的课程。" : "学生目前没有未来课程，需要安排课程。",
      requiredAction: "请教务确认课包、科目、老师、地点和时间，完成正式排课。",
      latestDeadlineText: "尽快完成排课",
    });
    const ticket = await tx.ticket.create({
      data: {
        ticketNo,
        studentId,
        source: "员工小程序",
        type: ticketType,
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
        nextAction: "确认课包、学生和老师可上课时间，完成排课。",
        nextActionDue: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        risksNotes: `由 ${actor.name || actor.email} 从员工小程序学生排课页面创建。`,
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
        action: "MINIAPP_STUDENT_SCHEDULING_TICKET_CREATE",
        entityType: "Ticket",
        entityId: ticket.id,
        meta: { studentId, ticketType, hadFutureSession: Boolean(futureSession) },
      },
    });
    return { ticket, created: true };
  }, { maxWait: 5000, timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

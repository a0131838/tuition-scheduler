import { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { LEGACY_XDF_SOURCE_CHANNEL_NAME } from "@/lib/partners";
import { prisma } from "@/lib/prisma";

export const RENEWAL_OPEN_STATUSES = [
  "PENDING_CONTACT",
  "PARENT_NOTIFIED",
  "PARENT_CONSIDERING",
  "RENEWAL_CONFIRMED",
  "CONTRACT_BILLING",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
] as const;

export const RENEWAL_STATUS_LABELS: Record<string, string> = {
  PENDING_CONTACT: "待联系家长",
  PARENT_NOTIFIED: "已提醒家长",
  PARENT_CONSIDERING: "家长考虑中",
  RENEWAL_CONFIRMED: "已确认续费",
  CONTRACT_BILLING: "合同/账单处理中",
  PAYMENT_PENDING: "待确认付款",
  PAYMENT_CONFIRMED: "已付款·待开通课包",
  PACKAGE_ACTIVE: "新课包已生效",
  NOT_RENEWING: "暂不续费",
  PAUSED_SPECIAL: "停课/特殊处理",
};

export type RenewalRiskLevel = "YELLOW" | "ORANGE" | "RED" | "EXHAUSTED";
export type RenewalCohort = "BOSS_OTHER" | "XDF";

type RenewalActor = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  operationsAdmin?: boolean;
};

export const OPERATIONS_RENEWAL_STATUSES = [
  "PENDING_CONTACT",
  "PARENT_NOTIFIED",
  "PARENT_CONSIDERING",
  "RENEWAL_CONFIRMED",
  "NOT_RENEWING",
  "PAUSED_SPECIAL",
] as const;

export function canOperationsAdminSetRenewalStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;
  if (!["PENDING_CONTACT", "PARENT_NOTIFIED", "PARENT_CONSIDERING", "RENEWAL_CONFIRMED"].includes(currentStatus)) {
    return false;
  }
  return (OPERATIONS_RENEWAL_STATUSES as readonly string[]).includes(nextStatus);
}

function endOfDayFromNow(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(18, 0, 0, 0);
  return value;
}

function riskRank(level: RenewalRiskLevel) {
  return { YELLOW: 1, ORANGE: 2, RED: 3, EXHAUSTED: 4 }[level];
}

export function renewalCohortForSourceName(sourceName: string | null | undefined): RenewalCohort {
  return String(sourceName ?? "").trim() === LEGACY_XDF_SOURCE_CHANNEL_NAME ? "XDF" : "BOSS_OTHER";
}

function cohortStatusLabel(status: string, cohort: RenewalCohort) {
  if (cohort !== "XDF") return RENEWAL_STATUS_LABELS[status] ?? status;
  return {
    PENDING_CONTACT: "待联系新东方",
    PARENT_NOTIFIED: "已通知新东方",
    PARENT_CONSIDERING: "新东方确认中",
    RENEWAL_CONFIRMED: "已确认续课",
  }[status] ?? RENEWAL_STATUS_LABELS[status] ?? status;
}

function dateDiffDays(target: Date | null, now: Date) {
  if (!target) return null;
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function studentIdsForSession(row: {
  studentId: string | null;
  class: {
    oneOnOneStudentId: string | null;
    enrollments: Array<{ studentId: string }>;
  };
}) {
  const values = new Set<string>();
  if (row.studentId) values.add(row.studentId);
  if (row.class.oneOnOneStudentId) values.add(row.class.oneOnOneStudentId);
  for (const item of row.class.enrollments) values.add(item.studentId);
  return values;
}

function buildParentMessage(input: {
  studentName: string;
  courseName: string;
  riskLevel: RenewalRiskLevel;
  remainingMinutes: number | null;
  lessonsRemaining: number | null;
  expectedDepletionAt: Date | null;
  validTo: Date | null;
}) {
  const balance =
    input.remainingMinutes == null
      ? `当前课包有效期至 ${input.validTo ? formatBusinessDateOnly(input.validTo) : "待确认"}`
      : `当前剩余约 ${(input.remainingMinutes / 60).toFixed(input.remainingMinutes % 60 === 0 ? 0 : 1)} 小时${input.lessonsRemaining == null ? "" : `（约 ${input.lessonsRemaining} 节）`}`;
  const forecast = input.expectedDepletionAt
    ? `，按目前课程安排预计在 ${formatBusinessDateOnly(input.expectedDepletionAt)} 前后用完`
    : "";
  const urgency = input.riskLevel === "EXHAUSTED" || input.riskLevel === "RED" ? "为避免影响后续课程安排，" : "";
  return `${input.studentName}家长您好，${input.courseName}${balance}${forecast}。${urgency}请您方便时回复是否继续安排下一阶段课程，我们会根据您的计划准备续费合同与课时安排。谢谢。`;
}

function buildXdfMessage(input: {
  studentName: string;
  courseName: string;
  remainingMinutes: number | null;
  lessonsRemaining: number | null;
  expectedDepletionAt: Date | null;
  validTo: Date | null;
}) {
  const balance =
    input.remainingMinutes == null
      ? `当前课包有效期至 ${input.validTo ? formatBusinessDateOnly(input.validTo) : "待确认"}`
      : `当前剩余约 ${(input.remainingMinutes / 60).toFixed(input.remainingMinutes % 60 === 0 ? 0 : 1)} 小时${input.lessonsRemaining == null ? "" : `（约 ${input.lessonsRemaining} 节）`}`;
  const forecast = input.expectedDepletionAt
    ? `，按当前排课预计在 ${formatBusinessDateOnly(input.expectedDepletionAt)} 前后用完`
    : "";
  return `新东方项目负责人您好，${input.studentName}的${input.courseName}${balance}${forecast}。请协助确认后续是否继续安排及补充课时计划，我们会据此衔接后续课程。谢谢。`;
}

export function classifyRenewalRisk(input: {
  remainingMinutes: number | null;
  scheduledMinutes: number;
  daysToDepletion: number | null;
  lessonsRemaining: number | null;
  expiryDays: number | null;
}): RenewalRiskLevel | null {
  if (
    input.remainingMinutes != null &&
    (input.remainingMinutes <= 0 || input.scheduledMinutes > input.remainingMinutes)
  ) return "EXHAUSTED";
  if (
    (input.daysToDepletion != null && input.daysToDepletion <= 5) ||
    (input.lessonsRemaining != null && input.lessonsRemaining <= 1) ||
    (input.expiryDays != null && input.expiryDays <= 5)
  ) return "RED";
  if (
    (input.daysToDepletion != null && input.daysToDepletion <= 10) ||
    (input.lessonsRemaining != null && input.lessonsRemaining <= 2) ||
    (input.expiryDays != null && input.expiryDays <= 10)
  ) return "ORANGE";
  if (
    (input.daysToDepletion != null && input.daysToDepletion <= 21) ||
    (input.lessonsRemaining != null && input.lessonsRemaining <= 4) ||
    (input.expiryDays != null && input.expiryDays <= 21)
  ) return "YELLOW";
  return null;
}

export async function getRenewalForecasts(now = new Date()) {
  const lookback = new Date(now.getTime() - 28 * 86_400_000);
  const lookahead = new Date(now.getTime() + 60 * 86_400_000);
  const packages = await prisma.coursePackage.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ type: "HOURS" }, { validTo: { not: null } }],
    },
    include: {
      student: {
        include: {
          sourceChannel: { select: { name: true } },
          parentLinks: {
            include: { parent: { select: { name: true } } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      },
      course: { select: { id: true, name: true } },
      sharedStudents: { select: { studentId: true } },
      sharedCourses: { select: { courseId: true } },
      txns: {
        where: { createdAt: { gte: lookback }, deltaMinutes: { lt: 0 } },
        select: { deltaMinutes: true },
      },
      contracts: {
        where: { flowType: "RENEWAL" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, invoiceId: true, signedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!packages.length) return [];

  const studentIds = Array.from(
    new Set(packages.flatMap((row) => [row.studentId, ...row.sharedStudents.map((item) => item.studentId)]))
  );
  const courseIds = Array.from(
    new Set(packages.flatMap((row) => [row.courseId, ...row.sharedCourses.map((item) => item.courseId)]))
  );
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: now, lt: lookahead },
      class: { courseId: { in: courseIds } },
      OR: [
        { studentId: { in: studentIds } },
        { class: { oneOnOneStudentId: { in: studentIds } } },
        { class: { enrollments: { some: { studentId: { in: studentIds } } } } },
      ],
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      class: {
        select: {
          courseId: true,
          oneOnOneStudentId: true,
          enrollments: { select: { studentId: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 5000,
  });

  return packages
    .map((pkg) => {
      const eligibleStudents = new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)]);
      const eligibleCourses = new Set([pkg.courseId, ...pkg.sharedCourses.map((row) => row.courseId)]);
      const scheduled = sessions.filter((session) => {
        if (!eligibleCourses.has(session.class.courseId)) return false;
        const sessionStudents = studentIdsForSession(session);
        const matchingStudents = Array.from(eligibleStudents).filter((studentId) => sessionStudents.has(studentId));
        if (!matchingStudents.length) return false;
        return matchingStudents.some(
          (studentId) =>
            !session.attendances.some(
              (attendance) => attendance.studentId === studentId && attendance.status === "EXCUSED"
            )
        );
      });
      const durations = scheduled.map((row) => Math.max(0, Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60_000)));
      const scheduledMinutes = durations.reduce((sum, value) => sum + value, 0);
      const recentWeeklyMinutes = Math.round(
        pkg.txns.reduce((sum, row) => sum + Math.abs(row.deltaMinutes), 0) / 4
      );
      const defaultLessonMinutes = durations.length
        ? Math.max(30, Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length))
        : 90;
      const remainingMinutes = pkg.remainingMinutes;
      const lessonsRemaining =
        remainingMinutes == null ? null : Math.max(0, Math.floor(remainingMinutes / defaultLessonMinutes));
      const consumptionBasis = recentWeeklyMinutes > 0 ? recentWeeklyMinutes : scheduledMinutes > 0 ? Math.max(1, Math.round(scheduledMinutes / 8)) : 0;
      const daysToDepletion =
        remainingMinutes != null && consumptionBasis > 0 ? Math.max(0, Math.ceil((remainingMinutes / consumptionBasis) * 7)) : null;
      const expectedDepletionAt =
        daysToDepletion == null ? null : new Date(now.getTime() + daysToDepletion * 86_400_000);
      const expiryDays = dateDiffDays(pkg.validTo, now);
      const riskLevel = classifyRenewalRisk({
        remainingMinutes,
        scheduledMinutes,
        daysToDepletion,
        lessonsRemaining,
        expiryDays,
      });
      if (!riskLevel) return null;

      const primaryLink = pkg.student.parentLinks[0] ?? null;
      const cohort = renewalCohortForSourceName(pkg.student.sourceChannel?.name);
      const latestRenewalContract = pkg.contracts[0] ?? null;
      const workflowStatus =
        latestRenewalContract?.signedAt
          ? "PAYMENT_PENDING"
          : latestRenewalContract
            ? "CONTRACT_BILLING"
            : "PENDING_CONTACT";
      return {
        packageId: pkg.id,
        studentId: pkg.studentId,
        studentName: pkg.student.name,
        cohort,
        sourceLabel: pkg.student.sourceChannel?.name || "未设置来源",
        courseName: pkg.course.name,
        type: pkg.type,
        riskLevel,
        remainingMinutes: remainingMinutes ?? 0,
        scheduledMinutes,
        recentWeeklyMinutes,
        lessonsRemaining,
        expectedDepletionAt,
        validTo: pkg.validTo,
        nextLessonAt: scheduled[0]?.startAt ?? null,
        ownerName: primaryLink?.communicationOwner?.trim() || "Emily",
        parentWechatGroupName: primaryLink?.wechatGroupName?.trim() || null,
        parentName: cohort === "XDF" ? "新东方项目负责人" : primaryLink?.parent?.name || "家长",
        parentMessage:
          cohort === "XDF"
            ? buildXdfMessage({
                studentName: pkg.student.name,
                courseName: pkg.course.name,
                remainingMinutes,
                lessonsRemaining,
                expectedDepletionAt,
                validTo: pkg.validTo,
              })
            : buildParentMessage({
                studentName: pkg.student.name,
                courseName: pkg.course.name,
                riskLevel,
                remainingMinutes,
                lessonsRemaining,
                expectedDepletionAt,
                validTo: pkg.validTo,
              }),
        workflowStatus,
        contractId: latestRenewalContract?.id ?? null,
        invoiceId: latestRenewalContract?.invoiceId ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel));
}

export async function syncRenewalTasks(actor?: RenewalActor) {
  const now = new Date();
  const forecasts = await getRenewalForecasts(now);
  const forecastByPackage = new Map(forecasts.map((row) => [row.packageId, row]));
  const openTasks = await prisma.renewalTask.findMany({
    where: { completedAt: null },
    select: { id: true, packageId: true, status: true, remainingMinutes: true },
  });
  const recentCompletedTasks = await prisma.renewalTask.findMany({
    where: {
      completedAt: { not: null },
      status: { in: ["PACKAGE_ACTIVE", "NOT_RENEWING", "PAUSED_SPECIAL"] },
      snoozedUntil: { gt: now },
    },
    select: { packageId: true },
  });
  const suppressedPackageIds = new Set(recentCompletedTasks.map((row) => row.packageId));
  const openByPackage = new Map(openTasks.map((row) => [row.packageId, row]));
  const ownerNames = Array.from(new Set(forecasts.map((row) => row.ownerName.toLowerCase())));
  const owners = ownerNames.length
    ? await prisma.user.findMany({
        where: { OR: ownerNames.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })) },
        select: { id: true, name: true },
      })
    : [];
  const ownerByName = new Map(owners.map((row) => [row.name.toLowerCase(), row]));
  let created = 0;
  let updated = 0;
  let resolved = 0;

  for (const forecast of forecasts) {
    if (suppressedPackageIds.has(forecast.packageId)) continue;
    const owner = ownerByName.get(forecast.ownerName.toLowerCase()) ?? null;
    const current = openByPackage.get(forecast.packageId);
    const data = {
      riskLevel: forecast.riskLevel,
      remainingMinutes: forecast.remainingMinutes,
      scheduledMinutes: forecast.scheduledMinutes,
      recentWeeklyMinutes: forecast.recentWeeklyMinutes,
      lessonsRemaining: forecast.lessonsRemaining,
      expectedDepletionAt: forecast.expectedDepletionAt,
      packageValidTo: forecast.validTo,
      ownerUserId: current ? undefined : owner?.id ?? null,
      ownerName: current ? undefined : owner?.name ?? forecast.ownerName,
      parentWechatGroupName: forecast.parentWechatGroupName,
      parentMessage: forecast.parentMessage,
      contractId: forecast.contractId,
      invoiceId: forecast.invoiceId,
      nextFollowUpAt: current ? undefined : endOfDayFromNow(forecast.riskLevel === "YELLOW" ? 3 : forecast.riskLevel === "ORANGE" ? 2 : 1),
    };
    if (current) {
      const canAdvanceFromContract =
        forecast.workflowStatus === "CONTRACT_BILLING" &&
        ["PENDING_CONTACT", "PARENT_NOTIFIED", "PARENT_CONSIDERING", "RENEWAL_CONFIRMED"].includes(current.status);
      const canAdvanceFromSigned =
        forecast.workflowStatus === "PAYMENT_PENDING" &&
        !["PAYMENT_CONFIRMED", "PACKAGE_ACTIVE", "NOT_RENEWING", "PAUSED_SPECIAL"].includes(current.status);
      await prisma.renewalTask.update({
        where: { id: current.id },
        data: {
          ...data,
          status: canAdvanceFromSigned ? "PAYMENT_PENDING" : canAdvanceFromContract ? "CONTRACT_BILLING" : undefined,
        },
      });
      updated += 1;
      continue;
    }
    try {
      const task = await prisma.renewalTask.create({
        data: {
          packageId: forecast.packageId,
          studentId: forecast.studentId,
          status: forecast.workflowStatus,
          ...data,
        },
      });
      created += 1;
      await logAudit({
        actor: actor?.email ? actor : { email: "system@bosseducation.sg", name: "System renewal scan", role: "SYSTEM" },
        module: "RENEWAL",
        action: "CREATE_RENEWAL_TASK",
        entityType: "RenewalTask",
        entityId: task.id,
        meta: { packageId: forecast.packageId, studentId: forecast.studentId, riskLevel: forecast.riskLevel },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }

  const sourcePackages = openTasks.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: openTasks.map((task) => task.packageId) } },
        select: { id: true, status: true },
      })
    : [];
  const sourcePackageStatus = new Map(sourcePackages.map((row) => [row.id, row.status]));
  for (const task of openTasks) {
    if (forecastByPackage.has(task.packageId)) continue;
    const packageStillActive = sourcePackageStatus.get(task.packageId) === "ACTIVE";
    await prisma.renewalTask.update({
      where: { id: task.id },
      data: {
        status: packageStillActive ? "PACKAGE_ACTIVE" : "PAUSED_SPECIAL",
        completedAt: now,
        completedByUserId: actor?.id ?? null,
        completedByName: actor?.name || "System renewal scan",
        note: packageStillActive
          ? "系统检测到课包已补充或风险已解除，自动完成。"
          : "系统检测到原课包已暂停、过期或停用，结束本轮续费提醒。",
        snoozedUntil: packageStillActive ? endOfDayFromNow(30) : endOfDayFromNow(90),
      },
    });
    resolved += 1;
    await logAudit({
      actor: actor?.email ? actor : { email: "system@bosseducation.sg", name: "System renewal scan", role: "SYSTEM" },
      module: "RENEWAL",
      action: "AUTO_RESOLVE_RENEWAL_TASK",
      entityType: "RenewalTask",
      entityId: task.id,
      meta: { packageId: task.packageId, previousRemainingMinutes: task.remainingMinutes },
    });
  }
  return { forecasts, created, updated, resolved };
}

export async function listRenewalTasks(input?: {
  status?: string;
  ownerUserId?: string | null;
  limit?: number;
  cohort?: RenewalCohort;
}) {
  const status = String(input?.status ?? "OPEN");
  const where: Prisma.RenewalTaskWhereInput = {};
  if (status === "OPEN") where.completedAt = null;
  else if (status === "COMPLETED") where.completedAt = { not: null };
  else where.status = status;
  if (input?.ownerUserId) where.OR = [{ ownerUserId: input.ownerUserId }, { ownerUserId: null }];
  if (input?.cohort === "XDF") {
    where.student = { sourceChannel: { name: LEGACY_XDF_SOURCE_CHANNEL_NAME } };
  } else if (input?.cohort === "BOSS_OTHER") {
    where.NOT = { student: { sourceChannel: { name: LEGACY_XDF_SOURCE_CHANNEL_NAME } } };
  }
  const rows = await prisma.renewalTask.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, sourceChannel: { select: { name: true } } } },
      package: { include: { course: { select: { name: true } } } },
    },
    orderBy: [{ completedAt: "asc" }, { nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    take: Math.min(500, Math.max(1, input?.limit ?? 200)),
  });
  const ids = rows.map((row) => row.id);
  const history = ids.length
    ? await prisma.auditLog.findMany({
        where: { entityType: "RenewalTask", entityId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: 2000,
      })
    : [];
  const historyById = new Map<string, typeof history>();
  for (const entry of history) {
    if (!entry.entityId) continue;
    const values = historyById.get(entry.entityId) ?? [];
    values.push(entry);
    historyById.set(entry.entityId, values);
  }
  return rows.map((row) => ({
    ...row,
    statusLabel: RENEWAL_STATUS_LABELS[row.status] ?? row.status,
    history: (historyById.get(row.id) ?? []).slice(0, 20),
  }));
}

export async function getRenewalCohortCounts(status = "OPEN") {
  const statusWhere: Prisma.RenewalTaskWhereInput =
    status === "OPEN"
      ? { completedAt: null }
      : status === "COMPLETED"
        ? { completedAt: { not: null } }
        : { status };
  const [bossOther, xdf] = await Promise.all([
    prisma.renewalTask.count({
      where: {
        ...statusWhere,
        NOT: { student: { sourceChannel: { name: LEGACY_XDF_SOURCE_CHANNEL_NAME } } },
      },
    }),
    prisma.renewalTask.count({
      where: {
        ...statusWhere,
        student: { sourceChannel: { name: LEGACY_XDF_SOURCE_CHANNEL_NAME } },
      },
    }),
  ]);
  return { BOSS_OTHER: bossOther, XDF: xdf };
}

export async function updateRenewalTask(input: {
  id: string;
  actor: RenewalActor;
  status?: string;
  ownerName?: string;
  parentResponse?: string;
  nextFollowUpAt?: string | null;
  parentWechatGroupName?: string;
  note?: string;
  contractId?: string;
  invoiceId?: string;
  activatedPackageId?: string;
}) {
  const task = await prisma.renewalTask.findUnique({
    where: { id: input.id },
    include: { student: { select: { sourceChannel: { select: { name: true } } } } },
  });
  if (!task) throw new Error("Renewal task not found");
  const cohort = renewalCohortForSourceName(task.student.sourceChannel?.name);
  const status = String(input.status ?? task.status);
  if (!RENEWAL_STATUS_LABELS[status]) throw new Error("Invalid renewal status");
  if (input.actor.operationsAdmin && !canOperationsAdminSetRenewalStatus(task.status, status)) {
    throw new Error("财务续费阶段只能由财务或管理人员更新");
  }
  if (status === "PARENT_NOTIFIED" && !task.evidenceUrl) {
    throw new Error(cohort === "XDF" ? "请先上传对接群发送截图，再确认已通知新东方" : "请先上传微信群发送截图，再确认已提醒家长");
  }
  const completed = ["PACKAGE_ACTIVE", "NOT_RENEWING", "PAUSED_SPECIAL"].includes(status);
  const nextFollowUpAt = input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null;
  if (input.nextFollowUpAt && Number.isNaN(nextFollowUpAt?.getTime())) throw new Error("Invalid follow-up time");
  const ownerName = String(input.ownerName ?? task.ownerName ?? "").trim().slice(0, 100);
  const owner = ownerName
    ? await prisma.user.findFirst({ where: { name: { equals: ownerName, mode: "insensitive" } }, select: { id: true, name: true } })
    : null;
  const updated = await prisma.renewalTask.update({
    where: { id: task.id },
    data: {
      status,
      ownerUserId: owner?.id ?? task.ownerUserId,
      ownerName: owner?.name ?? (ownerName || task.ownerName),
      parentResponse: input.parentResponse == null ? task.parentResponse : input.parentResponse.trim().slice(0, 3000) || null,
      parentWechatGroupName: input.parentWechatGroupName == null ? task.parentWechatGroupName : input.parentWechatGroupName.trim().slice(0, 160) || null,
      note: input.note == null ? task.note : input.note.trim().slice(0, 3000) || null,
      nextFollowUpAt: completed ? null : nextFollowUpAt ?? task.nextFollowUpAt,
      contactAt: status === "PARENT_NOTIFIED" && !task.contactAt ? new Date() : task.contactAt,
      contractId: input.contractId?.trim().slice(0, 100) || task.contractId,
      invoiceId: input.invoiceId?.trim().slice(0, 100) || task.invoiceId,
      paymentConfirmedAt: status === "PAYMENT_CONFIRMED" && !task.paymentConfirmedAt ? new Date() : task.paymentConfirmedAt,
      activatedPackageId: input.activatedPackageId?.trim().slice(0, 100) || task.activatedPackageId,
      completedAt: completed ? new Date() : null,
      completedByUserId: completed ? input.actor.id ?? null : null,
      completedByName: completed ? input.actor.name || input.actor.email || null : null,
      snoozedUntil: completed
        ? task.packageValidTo && task.packageValidTo > new Date()
          ? task.packageValidTo
          : endOfDayFromNow(status === "PACKAGE_ACTIVE" ? 30 : 90)
        : null,
    },
  });
  await logAudit({
    actor: input.actor,
    module: "RENEWAL",
    action: "UPDATE_RENEWAL_TASK",
    entityType: "RenewalTask",
    entityId: task.id,
    meta: {
      previousStatus: task.status,
      status,
      ownerName: updated.ownerName,
      nextFollowUpAt: updated.nextFollowUpAt?.toISOString() ?? null,
      hasParentResponse: Boolean(updated.parentResponse),
      hasEvidence: Boolean(updated.evidenceUrl),
    },
  });
  return updated;
}

export function renewalTaskDto(row: Awaited<ReturnType<typeof listRenewalTasks>>[number]) {
  const cohort = renewalCohortForSourceName(row.student.sourceChannel?.name);
  return {
    id: row.id,
    packageId: row.packageId,
    packageType: row.package.type,
    studentId: row.studentId,
    studentName: row.student.name,
    cohort,
    sourceLabel: row.student.sourceChannel?.name || "未设置来源",
    communicationAudience: cohort === "XDF" ? "新东方项目负责人" : "家长",
    courseName: row.package.course.name,
    status: row.status,
    statusLabel: cohortStatusLabel(row.status, cohort),
    riskLevel: row.riskLevel,
    remainingMinutes: row.remainingMinutes,
    scheduledMinutes: row.scheduledMinutes,
    recentWeeklyMinutes: row.recentWeeklyMinutes,
    lessonsRemaining: row.lessonsRemaining,
    expectedDepletionAt: row.expectedDepletionAt?.toISOString() ?? null,
    packageValidTo: row.packageValidTo?.toISOString() ?? null,
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    parentWechatGroupName: row.parentWechatGroupName,
    parentMessage: row.parentMessage,
    parentResponse: row.parentResponse,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    contactAt: row.contactAt?.toISOString() ?? null,
    contractId: row.contractId,
    invoiceId: row.invoiceId,
    evidenceUrl: row.evidenceUrl,
    note: row.note,
    completedAt: row.completedAt?.toISOString() ?? null,
    history: row.history.map((entry) => ({
      action: entry.action,
      actorName: entry.actorName || entry.actorEmail,
      createdAt: entry.createdAt.toISOString(),
      meta: entry.meta,
    })),
  };
}

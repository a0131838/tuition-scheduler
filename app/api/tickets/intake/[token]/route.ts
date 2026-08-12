import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import {
  allocateTicketNo,
  SCHEDULING_COORDINATION_TICKET_TYPE,
  composeTicketSituation,
  normalizeTicketInt,
  normalizeTicketTypeValue,
  normalizeTicketString,
  parseDateLike,
  TICKET_CS_STATUS_OPTIONS,
  TICKET_MODE_OPTIONS,
  TICKET_OWNER_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_SOURCE_OPTIONS,
  TICKET_SYSTEM_UPDATED_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TICKET_VERSION_OPTIONS,
  ticketTypeAliases,
  ticketSourceFromStudentSourceName,
  validateTicketTypeRequirements,
} from "@/lib/tickets";
import {
  buildParentAvailabilityExpiresAt,
  buildParentAvailabilityPath,
  createParentAvailabilityToken,
} from "@/lib/parent-availability";
import {
  normalizeSchedulingCoordinationCourseKey,
  schedulingCoordinationCourseLabelsMatch,
} from "@/lib/scheduling-coordination";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import {
  normalizeSchedulingActionInput,
  schedulingActionDefinition,
} from "@/lib/ticket-scheduling-actions";
function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function validateByOptions(value: string | null, options: { value: string }[]) {
  if (!value) return null;
  return options.some((o) => o.value === value) ? value : null;
}

async function getValidToken(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true, label: true },
  });
  if (!row) return null;
  if (!row.isActive) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

async function resolveOriginFromRequest(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  if (envBase) return envBase;

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenRow = await getValidToken(token);
  if (!tokenRow) return bad("Intake link is invalid or expired", 403);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON body");
  }

  const rawSchedulingActions = Array.isArray(body.schedulingActions) ? body.schedulingActions.slice(0, 10) : [];
  const normalizedSchedulingActions = rawSchedulingActions
    .map((item) => normalizeSchedulingActionInput((item ?? {}) as any))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const schedulingActions = normalizedSchedulingActions.flatMap((action) => {
    if (action.actionType !== "CANCEL_SESSION" || !action.replacementRequired) return [action];
    const replacement = normalizeSchedulingActionInput({
      actionType: "CREATE_SESSION",
      courseLabel: action.courseLabel,
      notes: "原课程取消后需要安排补课；时间待教务继续协调。",
    });
    return replacement ? [action, replacement] : [action];
  });
  const guidedScheduling = body.guidedScheduling === true || String(body.guidedScheduling ?? "") === "1";
  if (rawSchedulingActions.length !== normalizedSchedulingActions.length) return bad("Invalid scheduling action / 排课动作无效", 409);
  if (guidedScheduling && schedulingActions.length === 0) return bad("At least one scheduling action is required / 至少需要一个排课动作", 409);

  const studentName = normalizeTicketString(body.studentName, 120);
  if (!studentName) return bad("Student name is required / 学生姓名必填");

  const requestedSource = validateByOptions(normalizeTicketString(body.source, 60), TICKET_SOURCE_OPTIONS);
  const type = validateByOptions(normalizeTicketString(body.type, 60), TICKET_TYPE_OPTIONS);
  const priority = validateByOptions(normalizeTicketString(body.priority, 60), TICKET_PRIORITY_OPTIONS);
  if (!type || !priority) {
    return bad("Invalid type/priority");
  }

  const status = validateByOptions(normalizeTicketString(body.status, 60), TICKET_CS_STATUS_OPTIONS);
  const owner = validateByOptions(normalizeTicketString(body.owner, 20), TICKET_OWNER_OPTIONS);
  if (!status || !owner) {
    return bad("Status and owner are required / 状态与负责人必填");
  }

  const normalizedType = normalizeTicketTypeValue(type);
  const grade = normalizeTicketString(body.grade, 40);
  const course = normalizeTicketString(body.course, 120);
  const teacher = normalizeTicketString(body.teacher, 120);
  const durationMin = normalizeTicketInt(body.durationMin);
  const mode = validateByOptions(normalizeTicketString(body.mode, 40), TICKET_MODE_OPTIONS);
  const wechat = normalizeTicketString(body.wechat, 120);
  const requirementCheck = validateTicketTypeRequirements({
    type: normalizedType,
    grade,
    course,
    teacher,
    durationMin,
    mode,
    wechat,
  });
  if (!guidedScheduling && requirementCheck.missingLabels.length > 0) {
    return bad(
      `Missing required fields for this ticket type / 该工单类型缺少必填字段: ${requirementCheck.missingLabels.join("、")}`
    );
  }

  const situationCurrent = normalizeTicketString(body.situationCurrent, 2000);
  const situationAction = normalizeTicketString(body.situationAction, 2000);
  const situationDeadlineRaw = normalizeTicketString(body.situationDeadline, 40);
  const situationDeadline = parseDateLike(body.situationDeadline);
  if (!situationCurrent || !situationAction || !situationDeadlineRaw || !situationDeadline) {
    return bad("S – Situation is incomplete / Situation三项必填");
  }
  const situationSummary = composeTicketSituation({
    currentIssue: situationCurrent,
    requiredAction: situationAction,
    latestDeadlineText: situationDeadlineRaw,
  });

  const version = validateByOptions(normalizeTicketString(body.version, 10), TICKET_VERSION_OPTIONS);
  const systemUpdated = validateByOptions(
    normalizeTicketString(body.systemUpdated, 5),
    TICKET_SYSTEM_UPDATED_OPTIONS
  );
  const studentId = normalizeTicketString(body.studentId, 80);
  const linkedStudent = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, sourceChannel: { select: { name: true } } },
      })
    : null;
  if (studentId && !linkedStudent) {
    return bad("Selected student could not be found / 选择的学生不存在");
  }
  if (normalizedType === SCHEDULING_COORDINATION_TICKET_TYPE && !linkedStudent) {
    return bad("Please confirm the student from the lookup before creating a scheduling coordination ticket / 请先从学生匹配列表确认学生后，再创建排课协调工单");
  }

  if (guidedScheduling && !linkedStudent) {
    return bad("Please confirm the student before creating a guided scheduling ticket / 请先确认学生", 409);
  }
  const linkedStudentSource = linkedStudent
    ? ticketSourceFromStudentSourceName(linkedStudent.sourceChannel?.name)
    : null;
  if (linkedStudent && !linkedStudentSource) {
    return bad(
      "Student source is not set. Update the student profile before creating this ticket. / 学生来源尚未设置，请先在学生档案补充来源后再创建工单。",
      409,
      { code: "STUDENT_SOURCE_MISSING", studentId: linkedStudent.id }
    );
  }
  const source = linkedStudentSource ?? requestedSource;
  if (!source) {
    return bad("Student source is required / 学生来源必填");
  }
  const missingRequiredSource = schedulingActions.find((action) => schedulingActionDefinition(action.actionType)?.needsSource && !action.sourceSessionId);
  if (missingRequiredSource) return bad("Please select the exact original lesson / 请选择具体原课程", 409);

  if (normalizedType === SCHEDULING_COORDINATION_TICKET_TYPE && linkedStudent && schedulingActions.length === 0) {
    const existingCoordinations = await prisma.ticket.findMany({
      where: {
        studentId: linkedStudent.id,
        type: SCHEDULING_COORDINATION_TICKET_TYPE,
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled"] },
      },
      orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        ticketNo: true,
        course: true,
        parentAvailabilityRequest: {
          select: {
            token: true,
            expiresAt: true,
            isActive: true,
            submittedAt: true,
            courseLabel: true,
          },
        },
      },
    });

    const desiredCourseKey = normalizeSchedulingCoordinationCourseKey(course);
    const existingCoordination =
      existingCoordinations.find((item) =>
        schedulingCoordinationCourseLabelsMatch(
          item.parentAvailabilityRequest?.courseLabel ?? item.course,
          course
        )
      ) ??
      (!desiredCourseKey ? existingCoordinations[0] ?? null : null);

    if (existingCoordination) {
      const origin = await resolveOriginFromRequest(req);
      const parentAvailabilityUrl =
        existingCoordination.parentAvailabilityRequest?.token &&
        existingCoordination.parentAvailabilityRequest.isActive &&
        !existingCoordination.parentAvailabilityRequest.submittedAt
          ? new URL(buildParentAvailabilityPath(existingCoordination.parentAvailabilityRequest.token), origin).toString()
          : null;
      return Response.json(
        {
          ok: true,
          id: existingCoordination.id,
          ticketNo: existingCoordination.ticketNo,
          reusedExisting: true,
          message: "Existing coordination ticket reused / 已沿用当前排课协调工单",
          parentAvailabilityUrl,
          parentAvailabilityExpiresAt: existingCoordination.parentAvailabilityRequest?.expiresAt?.toISOString() ?? null,
        },
        { status: 200 }
      );
    }
  }

  const force = String(body.forceDuplicate ?? "").trim() === "1";
  const dupeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const duplicates = await prisma.ticket.findMany({
    where: {
      studentName: { equals: studentName, mode: "insensitive" },
      type: { in: ticketTypeAliases(type) },
      createdAt: { gte: dupeSince },
      status: { not: "Cancelled" },
    },
    select: { ticketNo: true, status: true, createdAt: true, summary: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (!force && duplicates.length > 0) {
    return bad("Potential duplicate ticket detected", 409, {
      code: "DUPLICATE",
      duplicates: duplicates.map((d) => ({
        ticketNo: d.ticketNo,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        summary: d.summary ?? "",
      })),
    });
  }

  const shouldCreateParentAvailabilityLink =
    normalizedType === SCHEDULING_COORDINATION_TICKET_TYPE &&
    Boolean(linkedStudent) &&
    (schedulingActions.length === 0 || schedulingActions.some((action) => action.actionType === "COORDINATE_ONLY"));

  const parentAvailabilityToken = shouldCreateParentAvailabilityLink ? createParentAvailabilityToken() : null;
  const parentAvailabilityExpiresAt = shouldCreateParentAvailabilityLink ? buildParentAvailabilityExpiresAt() : null;
  const parentAvailabilityPlaceholder = shouldCreateParentAvailabilityLink
    ? `Parent availability form sent. Waiting for parent submission. / 已发送家长时间填写链接，等待家长提交。`
    : null;

  const created = await prisma.$transaction(async (tx) => {
    const sourceIds = Array.from(new Set(schedulingActions.map((action) => action.sourceSessionId).filter((value): value is string => Boolean(value))));
    const sourceDetails = sourceIds.length && linkedStudent
      ? await tx.session.findMany({
          where: { id: { in: sourceIds }, ...sessionBelongsToStudentWhere(linkedStudent.id) },
          select: {
            id: true,
            teacher: { select: { name: true } },
            class: {
              select: {
                course: { select: { name: true } },
                subject: { select: { name: true } },
                level: { select: { name: true } },
                teacher: { select: { name: true } },
              },
            },
          },
        })
      : [];
    if (sourceDetails.length !== sourceIds.length) throw new Error("SCHEDULING_SOURCE_MISMATCH");
    const sourceById = new Map(sourceDetails.map((session) => [session.id, {
      courseLabel: [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / "),
      teacherName: session.teacher?.name ?? session.class.teacher.name,
    }]));
    const actionRows = schedulingActions.map((action) => ({
      ...action,
      courseLabel: action.courseLabel || (action.sourceSessionId ? sourceById.get(action.sourceSessionId)?.courseLabel ?? null : null) || course,
    }));
    const resolvedCourse = actionRows.find((action) => action.courseLabel)?.courseLabel || course;
    const resolvedTeacher = sourceIds.map((id) => sourceById.get(id)?.teacherName).find(Boolean) || teacher;
    const ticketNo = await allocateTicketNo(tx);
    const ticket = await tx.ticket.create({
      data: {
        ticketNo,
        studentId: linkedStudent?.id ?? null,
        source,
        type,
        priority,
        studentName,
        grade,
        course: resolvedCourse,
        teacher: resolvedTeacher,
        poc: normalizeTicketString(body.poc, 120),
        wechat,
        phone: null,
        parentAvailability: parentAvailabilityPlaceholder,
        teacherAvailability: null,
        durationMin,
        mode,
        addressOrLink: normalizeTicketString(body.addressOrLink, 500),
        confirmDeadline: null,
        slaDue: parseDateLike(body.slaDue),
        status,
        owner,
        version,
        systemUpdated,
        finalSchedule: null,
        lastUpdateAt: parseDateLike(body.lastUpdateAt),
        summary: situationSummary,
        risksNotes: null,
        nextAction: situationAction,
        nextActionDue: situationDeadline,
        proof: normalizeTicketString(body.proof, 5000),
        createdByName: normalizeTicketString(tokenRow.label, 120) || normalizeTicketString(body.createdByName, 120),
      },
      select: { id: true, ticketNo: true },
    });

    if (actionRows.length > 0) {
      await tx.ticketSchedulingAction.createMany({
        data: actionRows.map((action, sequence) => ({ ticketId: ticket.id, sequence, ...action })),
      });
      await tx.auditLog.create({
        data: {
          actorEmail: "ticket-intake-link@sgtmanage.local",
          actorName: normalizeTicketString(tokenRow.label, 120),
          actorRole: "INTAKE_LINK",
          module: "TICKETS",
          action: "CREATE_GUIDED_TICKET_SCHEDULING_ACTIONS",
          entityType: "Ticket",
          entityId: ticket.id,
          meta: { actionCount: actionRows.length, actionTypes: actionRows.map((action) => action.actionType), sourceSessionIds: sourceIds },
        },
      });
    }

    if (shouldCreateParentAvailabilityLink && linkedStudent && parentAvailabilityToken && parentAvailabilityExpiresAt) {
      await tx.parentAvailabilityRequest.create({
        data: {
          ticketId: ticket.id,
          studentId: linkedStudent.id,
          courseLabel: resolvedCourse,
          token: parentAvailabilityToken,
          expiresAt: parentAvailabilityExpiresAt,
        },
      });
    }

    return { ...ticket, schedulingActionCount: actionRows.length };
  }).catch((error) => {
    if (error instanceof Error && error.message === "SCHEDULING_SOURCE_MISMATCH") return null;
    throw error;
  });
  if (!created) return bad("Selected lesson does not belong to this student / 所选课程不属于该学生", 409);

  const origin = await resolveOriginFromRequest(req);
  const parentAvailabilityUrl =
    shouldCreateParentAvailabilityLink && parentAvailabilityToken
      ? new URL(buildParentAvailabilityPath(parentAvailabilityToken), origin).toString()
      : null;

  return Response.json(
    {
      ok: true,
      id: created.id,
      ticketNo: created.ticketNo,
      schedulingActionCount: created.schedulingActionCount,
      parentAvailabilityUrl,
      parentAvailabilityExpiresAt: parentAvailabilityExpiresAt?.toISOString() ?? null,
    },
    { status: 201 }
  );
}

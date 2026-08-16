import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { miniappRequestConfig, miniappRequestDto, normalizeMiniappStaffRequestType } from "@/lib/miniapp-parent-requests";
import { prisma } from "@/lib/prisma";
import { allocateTicketNo, composeTicketSituation, normalizeTicketString, parseDateLike } from "@/lib/tickets";
import { normalizeSchedulingActionInput, schedulingActionDefinition } from "@/lib/ticket-scheduling-actions";
import { attendanceLocksCancellation, cancellationSourceStatus, isManualCancellationTarget } from "@/lib/ticket-cancellation-intake";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";

function toInt(v: string | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function cleanString(v: unknown, maxLen = 1000) {
  return normalizeTicketString(v, maxLen) ?? "";
}

function defaultStatusForType(type: string) {
  if (type === "给老师的话") return "Waiting Teacher";
  return "Need Info";
}

function deadlineFromPriority(priority: string) {
  const now = Date.now();
  if (priority === "1小时紧急") return new Date(now + 60 * 60 * 1000);
  if (priority === "6小时紧急") return new Date(now + 6 * 60 * 60 * 1000);
  if (priority === "24小时紧急") return new Date(now + 24 * 60 * 60 * 1000);
  return new Date(now + 2 * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const owner = String(url.searchParams.get("owner") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const type = String(url.searchParams.get("type") ?? "").trim();
  const includeDoneRaw = String(url.searchParams.get("includeDone") ?? "false").toLowerCase();
  const includeDone = includeDoneRaw === "1" || includeDoneRaw === "true";
  const includeAllSources = url.searchParams.get("scope") === "all";
  const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 50), 1), 200);

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(includeAllSources ? {} : { source: "家长小程序" }),
      isArchived: false,
      ...(owner ? { owner } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : includeDone ? {} : { status: { notIn: ["Completed", "Cancelled"] } }),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return ok({
    generatedAt: new Date().toISOString(),
    total: tickets.length,
    requests: tickets.map((ticket) => miniappRequestDto(ticket, { includeInternal: true, attachmentScopeAll: includeAllSources })),
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const studentId = cleanString((body as any).studentId, 80);
  const type = normalizeMiniappStaffRequestType((body as any).type);
  const communicationSource = cleanString((body as any).communicationSource, 80) || "微信群";
  const sourceDetail = cleanString((body as any).sourceDetail, 160);
  const originalContent = cleanString((body as any).originalContent, 2000);
  const publicSummary = cleanString((body as any).publicSummary, 1000);
  const requiredAction = cleanString((body as any).requiredAction, 1000);
  const latestDeadlineText = cleanString((body as any).latestDeadlineText, 120);
  const overrideOwner = cleanString((body as any).owner, 20);
  const nextActionDueRaw = cleanString((body as any).nextActionDue, 80);
  const rawSchedulingActions: unknown[] = Array.isArray((body as any).schedulingActions)
    ? ((body as any).schedulingActions as unknown[]).slice(0, 10)
    : [];
  const normalizedSchedulingActions = rawSchedulingActions
    .map((item: unknown) => normalizeSchedulingActionInput((item ?? {}) as any))
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

  if (!studentId) return bad("Student is required");
  if (!originalContent) return bad("Original content is required");
  if (!publicSummary) return bad("Parent visible summary is required");
  if (rawSchedulingActions.length !== normalizedSchedulingActions.length) return bad("Invalid scheduling action", 409);
  const missingRequiredSource = schedulingActions.find((action) =>
    schedulingActionDefinition(action.actionType)?.needsSource &&
    !action.sourceSessionId &&
    !isManualCancellationTarget(action)
  );
  if (missingRequiredSource) return bad("请选择具体原课程，或完整填写手动取消课程信息", 409);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true },
  });
  if (!student) return bad("Student not found", 404);

  const cfg = miniappRequestConfig(type);
  const owner = ["Jasmine", "Eva", "Emily"].includes(overrideOwner) ? overrideOwner : cfg.owner;
  const priority = cleanString((body as any).priority, 60) || cfg.priority;
  const deadline = parseDateLike(nextActionDueRaw) || deadlineFromPriority(priority);
  const actionText = requiredAction || "请工作人员根据微信群沟通内容跟进，并在处理后更新家长可见进度。";
  const externalSummary = `【对外摘要】${publicSummary}`;
  const internalOriginal = `【员工代录原始摘要】${originalContent}`;
  const sourceText = sourceDetail ? `${communicationSource}：${sourceDetail}` : communicationSource;

  const summary = composeTicketSituation({
    currentIssue: `${externalSummary}\n\n${internalOriginal}\n\n【沟通入口】${sourceText}`,
    requiredAction: actionText,
    latestDeadlineText: latestDeadlineText || (deadline ? deadline.toISOString() : "尽快跟进"),
  });

  const ticket = await prisma.$transaction(async (tx) => {
    const sourceIds: string[] = Array.from(new Set(schedulingActions.map((item) => item.sourceSessionId).filter((value): value is string => Boolean(value))));
    const sourceDetails = new Map<string, { courseLabel: string; cancellationState: ReturnType<typeof cancellationSourceStatus> }>();
    if (sourceIds.length) {
      const matched = await tx.session.findMany({
        where: { id: { in: sourceIds }, ...sessionBelongsToStudentWhere(student.id) },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          attendances: {
            where: { studentId: student.id },
            select: { status: true, deductedMinutes: true, deductedCount: true, packageId: true, excusedCharge: true },
          },
          class: { select: { course: { select: { name: true } }, subject: { select: { name: true } }, level: { select: { name: true } } } },
        },
      });
      if (matched.length !== sourceIds.length) throw new Error("SCHEDULING_SOURCE_MISMATCH");
      matched.forEach((session) => sourceDetails.set(session.id, {
        courseLabel: [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / "),
        cancellationState: cancellationSourceStatus({
          startAt: session.startAt,
          endAt: session.endAt,
          attendanceLocked: attendanceLocksCancellation(session.attendances[0]),
        }),
      }));
    }
    const sourceDefaultCourseLabel = sourceIds.map((id) => sourceDetails.get(id)?.courseLabel).find(Boolean) || null;
    const actionRows = schedulingActions.map((action) => {
      const source = action.sourceSessionId ? sourceDetails.get(action.sourceSessionId) : null;
      const reviewReason = action.actionType === "CANCEL_SESSION"
        ? isManualCancellationTarget(action)
          ? "手动记录课程，待教务匹配原课程，禁止自动执行"
          : source && !source.cancellationState.canAutoExecute
            ? source.cancellationState.label
            : null
        : null;
      return {
        ...action,
        status: reviewReason ? "NEED_INFO" : action.status,
        notes: reviewReason ? [action.notes, `系统状态：${reviewReason}`].filter(Boolean).join("\n") : action.notes,
        courseLabel: action.courseLabel || source?.courseLabel || (action.actionType === "CREATE_SESSION" ? sourceDefaultCourseLabel : null),
      };
    });
    const ticketNo = await allocateTicketNo(tx);
    const created = await tx.ticket.create({
      data: {
        ticketNo,
        studentId: student.id,
        source: "家长小程序",
        type,
        priority,
        studentName: student.name,
        grade: student.grade,
        course: actionRows.find((action) => action.courseLabel)?.courseLabel || null,
        wechat: sourceText,
        poc: auth.user.name || null,
        status: defaultStatusForType(type),
        owner,
        version: "V1",
        systemUpdated: "N",
        lastUpdateAt: new Date(),
        summary,
        parentVisible: true,
        parentPublicSummary: publicSummary,
        parentInternalNote: originalContent,
        parentCommunicationSource: sourceText,
        parentAssistedByUserId: auth.user.id,
        parentAssistedByName: auth.user.name || auth.user.email,
        risksNotes: `员工代家长录入。沟通入口：${sourceText}`,
        nextAction: actionText,
        nextActionDue: deadline,
        proof: null,
        createdByName: `员工代录：${auth.user.name || auth.user.email}`,
      },
    });
    if (schedulingActions.length) {
      await tx.ticketSchedulingAction.createMany({
        data: actionRows.map((action, sequence) => ({
          ticketId: created.id,
          sequence,
          ...action,
        })),
      });
      await tx.auditLog.create({
        data: {
          actorEmail: auth.user.email.trim().toLowerCase(),
          actorName: auth.user.name?.trim() || null,
          actorRole: auth.user.role,
          module: "TICKETS",
          action: "CREATE_TICKET_SCHEDULING_ACTIONS",
          entityType: "Ticket",
          entityId: created.id,
          meta: {
            actionCount: actionRows.length,
            actionTypes: actionRows.map((action) => action.actionType),
            sourceSessionIds: sourceIds,
          },
        },
      });
    }
    return created;
  }).catch((error) => {
    if (error instanceof Error && error.message === "SCHEDULING_SOURCE_MISMATCH") return null;
    throw error;
  });
  if (!ticket) return bad("Selected lesson does not belong to this student", 409);

  return ok({
    message: "已代家长创建工单。",
    request: miniappRequestDto(ticket, { includeInternal: true }),
  });
}

import type { TicketSchedulingAction } from "@prisma/client";

export const TICKET_SCHEDULING_ACTION_TYPES = [
  { value: "CREATE_SESSION", label: "新增课程 / 补课", ticketType: "补课加课", needsSource: false },
  { value: "RESCHEDULE_SESSION", label: "修改课程时间", ticketType: "改课程时间", needsSource: true },
  { value: "CANCEL_SESSION", label: "取消 / 请假", ticketType: "临时取消&请假课程", needsSource: true },
  { value: "REPLACE_TEACHER", label: "更换老师", ticketType: "改上课老师", needsSource: true },
  { value: "COORDINATE_ONLY", label: "只协调时间", ticketType: "排课协调", needsSource: false },
] as const;

export const TICKET_SCHEDULING_ACTION_STATUSES = [
  { value: "NEED_INFO", label: "待补信息" },
  { value: "WAITING_PARENT", label: "等待家长" },
  { value: "WAITING_TEACHER", label: "等待老师" },
  { value: "READY", label: "可执行" },
  { value: "CONFLICT", label: "预检有冲突" },
  { value: "APPLIED", label: "已执行" },
  { value: "CANCELLED", label: "单项无需处理" },
] as const;

export const TICKET_SCHEDULING_RESOLUTION_MODES = [
  {
    value: "COMPLETED_EXTERNALLY",
    label: "已在正式系统或其他页面处理完成",
    description: "实际排课、改课或取消已经完成，只补录核验结果并关闭工单。",
  },
  {
    value: "NOT_REQUIRED",
    label: "整张工单确实无需处理",
    description: "仅用于家长撤回、重复工单或需求已经失效；不会标记为已执行。",
  },
  {
    value: "PARTIALLY_COMPLETED_EXTERNALLY",
    label: "部分动作已经处理完成",
    description: "一次勾选已经完成的动作，其余动作继续保留在待办中。",
  },
] as const;

export type TicketSchedulingResolutionMode = typeof TICKET_SCHEDULING_RESOLUTION_MODES[number]["value"];

const RESOLVED_SCHEDULING_ACTION_STATUSES = new Set(["APPLIED", "CANCELLED"]);

export function isTicketSchedulingActionResolved(action: { status: string }) {
  return RESOLVED_SCHEDULING_ACTION_STATUSES.has(action.status);
}

export function unresolvedTicketSchedulingActions<T extends { status: string }>(actions: T[]) {
  return actions.filter((action) => !isTicketSchedulingActionResolved(action));
}

export function existingResultSessionIdForAction(input: {
  actionType: string;
  sourceSessionId?: string | null;
  resultSessionId?: string | null;
}) {
  if (input.actionType === "CREATE_SESSION") return input.resultSessionId || null;
  if (["RESCHEDULE_SESSION", "CANCEL_SESSION", "REPLACE_TEACHER"].includes(input.actionType)) {
    return input.sourceSessionId || null;
  }
  return null;
}

export type TicketSchedulingActionInput = {
  actionType: string;
  sourceSessionId?: string | null;
  requestedStartAt?: string | Date | null;
  requestedEndAt?: string | Date | null;
  requestedTeacherId?: string | null;
  courseLabel?: string | null;
  durationMin?: number | null;
  mode?: string | null;
  chargePolicy?: string | null;
  replacementRequired?: boolean;
  notes?: string | null;
};

function clean(value: unknown, max = 1000) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function dateOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function schedulingActionDefinition(actionType: string) {
  return TICKET_SCHEDULING_ACTION_TYPES.find((item) => item.value === actionType) ?? null;
}

export function schedulingActionStatusLabel(status: string) {
  return TICKET_SCHEDULING_ACTION_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function schedulingResolutionDefinition(mode: string) {
  return TICKET_SCHEDULING_RESOLUTION_MODES.find((item) => item.value === mode) ?? null;
}

export function schedulingResolutionActionStatus(mode: TicketSchedulingResolutionMode) {
  return mode === "NOT_REQUIRED" ? "CANCELLED" : "APPLIED";
}

export function schedulingResolutionTicketStatus(
  mode: TicketSchedulingResolutionMode,
  unresolvedAfter: number,
) {
  if (unresolvedAfter > 0) return null;
  return mode === "NOT_REQUIRED" ? "Cancelled" : "Completed";
}

export function normalizeSchedulingActionInput(input: TicketSchedulingActionInput) {
  const definition = schedulingActionDefinition(clean(input?.actionType, 40) ?? "");
  if (!definition) return null;
  const sourceSessionId = clean(input.sourceSessionId, 80);
  const requestedStartAt = dateOrNull(input.requestedStartAt);
  const requestedEndAt = dateOrNull(input.requestedEndAt);
  const duration = Number(input.durationMin);
  const durationMin = Number.isInteger(duration) && duration >= 15 && duration <= 360 ? duration : null;
  const requestedTeacherId = clean(input.requestedTeacherId, 80);
  const courseLabel = clean(input.courseLabel, 160);
  const ready =
    definition.value === "CANCEL_SESSION"
      ? Boolean(sourceSessionId)
      : definition.value === "RESCHEDULE_SESSION"
        ? Boolean(sourceSessionId && requestedStartAt)
        : definition.value === "REPLACE_TEACHER"
          ? Boolean(sourceSessionId && requestedTeacherId)
          : definition.value === "CREATE_SESSION"
            ? Boolean(requestedStartAt && courseLabel && durationMin)
            : false;
  return {
    actionType: definition.value,
    status: ready ? "READY" : "NEED_INFO",
    sourceSessionId,
    requestedStartAt,
    requestedEndAt,
    requestedTeacherId,
    courseLabel,
    durationMin,
    mode: clean(input.mode, 40),
    chargePolicy: clean(input.chargePolicy, 40),
    replacementRequired: Boolean(input.replacementRequired),
    notes: clean(input.notes, 2000),
  };
}

export function schedulingActionCanBeReady(input: TicketSchedulingActionInput) {
  return normalizeSchedulingActionInput(input)?.status === "READY";
}

export function schedulingActionDto(action: TicketSchedulingAction & {
  sourceSession?: { id: string; startAt: Date; endAt: Date; teacher?: { name: string } | null; class: { course: { name: string }; teacher: { name: string } } } | null;
  resultSession?: { id: string; startAt: Date; endAt: Date; teacher?: { name: string } | null; class: { course: { name: string }; teacher: { name: string } } } | null;
  requestedTeacher?: { id: string; name: string } | null;
}) {
  const definition = schedulingActionDefinition(action.actionType);
  const sessionDto = (session: typeof action.sourceSession) => session ? ({
    id: session.id,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    courseLabel: session.class.course.name,
    teacherName: session.teacher?.name ?? session.class.teacher.name,
  }) : null;
  return {
    id: action.id,
    sequence: action.sequence,
    actionType: action.actionType,
    actionLabel: definition?.label ?? action.actionType,
    needsSource: Boolean(definition?.needsSource),
    status: action.status,
    statusLabel: schedulingActionStatusLabel(action.status),
    sourceSession: sessionDto(action.sourceSession),
    resultSession: sessionDto(action.resultSession),
    requestedStartAt: action.requestedStartAt?.toISOString() ?? null,
    requestedEndAt: action.requestedEndAt?.toISOString() ?? null,
    requestedTeacher: action.requestedTeacher,
    courseLabel: action.courseLabel,
    durationMin: action.durationMin,
    mode: action.mode,
    chargePolicy: action.chargePolicy,
    replacementRequired: action.replacementRequired,
    notes: action.notes,
  };
}

export const schedulingActionInclude = {
  sourceSession: { include: { teacher: { select: { name: true } }, class: { include: { course: { select: { name: true } }, teacher: { select: { name: true } } } } } },
  resultSession: { include: { teacher: { select: { name: true } }, class: { include: { course: { select: { name: true } }, teacher: { select: { name: true } } } } } },
  requestedTeacher: { select: { id: true, name: true } },
} as const;

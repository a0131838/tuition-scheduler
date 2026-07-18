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
  { value: "CANCELLED", label: "无需执行" },
] as const;

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

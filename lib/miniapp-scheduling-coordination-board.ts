import { Prisma } from "@prisma/client";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";

export const COORDINATION_BOARD_STATUSES = [
  { value: "Waiting Parent", label: "等待家长" },
  { value: "Waiting Teacher", label: "等待老师" },
  { value: "Confirmed", label: "双方已确认" },
  { value: "Exception", label: "异常升级" },
] as const;

export const COORDINATION_COMMUNICATION_TARGETS = ["家长", "老师", "家长和老师", "内部协调"] as const;

export const coordinationBoardTicketInclude = Prisma.validator<Prisma.TicketInclude>()({
  parentAvailabilityRequest: true,
});

export type CoordinationBoardTicket = Prisma.TicketGetPayload<{
  include: typeof coordinationBoardTicketInclude;
}>;

function publicBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://sgtmanage.com").replace(/\/$/, "");
}

function availabilityUrl(ticket: CoordinationBoardTicket) {
  const request = ticket.parentAvailabilityRequest;
  if (!request || !request.isActive || (request.expiresAt && request.expiresAt < new Date())) return "";
  return `${publicBaseUrl()}/availability/${request.token}`;
}

export function coordinationStatusLabel(status: string) {
  return COORDINATION_BOARD_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function coordinationBoardTicketDto(ticket: CoordinationBoardTicket) {
  const now = new Date();
  const isOverdue = Boolean(ticket.nextActionDue && ticket.nextActionDue < now);
  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    studentId: ticket.studentId,
    studentName: ticket.studentName,
    course: ticket.parentAvailabilityRequest?.courseLabel || ticket.course || "-",
    teacher: ticket.teacher || "-",
    owner: ticket.owner || "-",
    status: ticket.status,
    statusLabel: coordinationStatusLabel(ticket.status),
    nextAction: ticket.nextAction || "-",
    nextActionDueDate: ticket.nextActionDue ? formatBusinessDateOnly(ticket.nextActionDue) : "",
    nextActionDueText: ticket.nextActionDue ? formatBusinessDateOnly(ticket.nextActionDue) : "未设置",
    isOverdue,
    dueStateText: isOverdue ? "已逾期" : "待跟进",
    communicationHistory: ticket.risksNotes || "",
    availabilityUrl: availabilityUrl(ticket),
    updatedAtText: formatBusinessDateTime(ticket.updatedAt),
  };
}

export function defaultCoordinationNextAction(status: string) {
  if (status === "Waiting Teacher") return "等待老师回复可排时间或确认特殊时间。";
  if (status === "Confirmed") return "进入移动排课完成正式安排并复核课程。";
  if (status === "Exception") return "由 Jasmine 跟进排课异常并确认下一步方案。";
  return "等待家长回复可上课时间或确认候选时段。";
}

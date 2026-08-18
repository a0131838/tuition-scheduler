import {
  isTicketSchedulingActionResolved,
  TICKET_SCHEDULING_ACTION_TYPES,
} from "@/lib/ticket-scheduling-actions";

export type TicketOperationLane = "DO_NOW" | "WAITING" | "DONE";

export type TicketOperationCardInput = {
  type: string;
  status: string;
  owner?: string | null;
  nextAction?: string | null;
  isArchived?: boolean;
  schedulingActions?: Array<{ status: string }>;
};

export type TicketOperationCard = {
  lane: TicketOperationLane;
  laneLabel: string;
  statusLabel: string;
  stepTitle: string;
  stepDescription: string;
  actionLabel: string;
  actionAnchor: "ticket-decision" | "ticket-request" | "ticket-advanced";
  unresolvedActionCount: number;
};

export function isSchedulingTicketType(type: string) {
  return TICKET_SCHEDULING_ACTION_TYPES.some((item) => item.ticketType === type) || type === "新排课";
}

export function buildTicketOperationCard(input: TicketOperationCardInput): TicketOperationCard {
  const actions = input.schedulingActions ?? [];
  const unresolvedActionCount = actions.filter((action) => !isTicketSchedulingActionResolved(action)).length;
  const closed = Boolean(input.isArchived) || ["Completed", "Cancelled"].includes(input.status);
  const waitingParent = input.status === "Waiting Parent" || actions.some((action) => action.status === "WAITING_PARENT");
  const waitingTeacher = input.status === "Waiting Teacher" || actions.some((action) => action.status === "WAITING_TEACHER");
  const scheduling = isSchedulingTicketType(input.type);

  if (closed) {
    const cancelled = input.status === "Cancelled";
    return {
      lane: "DONE",
      laneLabel: "已结束",
      statusLabel: input.isArchived ? "已归档" : cancelled ? "已取消" : "已完成",
      stepTitle: cancelled ? "工单已取消" : "工单已完成",
      stepDescription: "如需核对处理记录，可查看完整资料与审计历史。",
      actionLabel: "查看处理记录",
      actionAnchor: "ticket-advanced",
      unresolvedActionCount,
    };
  }

  if (waitingParent || waitingTeacher) {
    const target = waitingTeacher ? "老师" : "家长";
    return {
      lane: "WAITING",
      laneLabel: `等待${target}`,
      statusLabel: `等待${target}`,
      stepTitle: `跟进${target}回复`,
      stepDescription: input.nextAction?.trim() || `查看上次沟通并决定是否需要提醒${target}。`,
      actionLabel: "查看并跟进",
      actionAnchor: scheduling ? "ticket-decision" : "ticket-request",
      unresolvedActionCount,
    };
  }

  if (scheduling) {
    return {
      lane: "DO_NOW",
      laneLabel: "现在处理",
      statusLabel: unresolvedActionCount > 0 ? `${unresolvedActionCount} 个动作待处理` : "待核对结果",
      stepTitle: "确认这张工单的实际处理方式",
      stepDescription: unresolvedActionCount > 0
        ? "继续进入正式课表执行；如果已经在别处处理或确实无需执行，只核验一次。"
        : "这张旧工单没有结构化动作，可确认已处理、无需处理，或进入正式课表继续执行。",
      actionLabel: "处理这张工单",
      actionAnchor: "ticket-decision",
      unresolvedActionCount,
    };
  }

  return {
    lane: "DO_NOW",
    laneLabel: "现在处理",
    statusLabel: input.status === "Confirmed" ? "已确认" : "待处理",
    stepTitle: "确认家长需求与下一步",
    stepDescription: input.nextAction?.trim() || "核对工单内容，确认负责人、下一步和截止时间。",
    actionLabel: "打开并处理",
    actionAnchor: "ticket-request",
    unresolvedActionCount,
  };
}

import type { Ticket } from "@prisma/client";
import { parseTicketSituationSummary } from "@/lib/tickets";

export const MINIAPP_PARENT_REQUEST_TYPES = [
  "投诉",
  "普通反馈",
  "给老师的话",
  "排课要求",
  "请假/取消",
  "财务问题",
  "学校事务",
  "其他",
] as const;

type MiniappParentRequestType = (typeof MINIAPP_PARENT_REQUEST_TYPES)[number];

const TYPE_CONFIG: Record<MiniappParentRequestType, { owner: "Jasmine" | "Eva"; closer: "Jasmine" | "Eva"; priority: string }> = {
  投诉: { owner: "Jasmine", closer: "Jasmine", priority: "24小时紧急" },
  普通反馈: { owner: "Eva", closer: "Eva", priority: "普通" },
  给老师的话: { owner: "Jasmine", closer: "Jasmine", priority: "普通" },
  排课要求: { owner: "Jasmine", closer: "Jasmine", priority: "普通" },
  "请假/取消": { owner: "Jasmine", closer: "Jasmine", priority: "24小时紧急" },
  财务问题: { owner: "Jasmine", closer: "Jasmine", priority: "普通" },
  学校事务: { owner: "Jasmine", closer: "Jasmine", priority: "普通" },
  其他: { owner: "Jasmine", closer: "Jasmine", priority: "普通" },
};

export function normalizeMiniappRequestType(input: unknown): MiniappParentRequestType {
  const raw = String(input ?? "").trim();
  return MINIAPP_PARENT_REQUEST_TYPES.includes(raw as MiniappParentRequestType) ? (raw as MiniappParentRequestType) : "其他";
}

export function miniappRequestConfig(type: string) {
  return TYPE_CONFIG[normalizeMiniappRequestType(type)];
}

export function miniappRequestStatusLabel(status: string) {
  const map: Record<string, string> = {
    "Need Info": "已收到",
    "Waiting Teacher": "处理中",
    "Waiting Parent": "等待家长补充",
    Confirmed: "已确认",
    Completed: "已完成",
    Cancelled: "已取消",
    Exception: "已升级",
  };
  return map[status] ?? status;
}

export function miniappRequestDto(ticket: Pick<
  Ticket,
  | "id"
  | "ticketNo"
  | "studentId"
  | "studentName"
  | "type"
  | "priority"
  | "status"
  | "owner"
  | "summary"
  | "nextAction"
  | "finalSchedule"
  | "proof"
  | "createdByName"
  | "createdAt"
  | "updatedAt"
  | "completedAt"
>, options?: { includeInternal?: boolean }) {
  const parsed = parseTicketSituationSummary(ticket.summary);
  const cfg = miniappRequestConfig(ticket.type);
  const includeInternal = Boolean(options?.includeInternal);
  const assisted = isStaffAssistedRequest(ticket);
  const visibility = parseAssistedRequestVisibility(parsed.currentIssue);
  const attachmentUrls = String(ticket.proof ?? "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter((x) => x.startsWith("/"));
  const parentContent = visibility.publicSummary || parsed.currentIssue;
  const title = parentContent || ticket.nextAction || ticket.type;

  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    studentId: ticket.studentId,
    studentName: ticket.studentName,
    type: ticket.type,
    priority: ticket.priority,
    status: ticket.status,
    statusLabel: miniappRequestStatusLabel(ticket.status),
    owner: ticket.owner,
    mainOwner: "Jasmine",
    closeOwner: cfg.closer,
    title,
    content: parentContent,
    requestedAction: parsed.requiredAction,
    completionResult: ticket.finalSchedule,
    latestDeadlineText: parsed.latestDeadlineText,
    attachmentUrls: includeInternal || !assisted ? attachmentUrls : [],
    createdByName: includeInternal ? ticket.createdByName : null,
    isStaffAssisted: assisted,
    communicationSource: includeInternal ? visibility.communicationSource : null,
    internalContent: includeInternal ? visibility.internalOriginal : null,
    parentVisibleSummary: visibility.publicSummary || parentContent,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    completedAt: ticket.completedAt ? ticket.completedAt.toISOString() : null,
  };
}

function isStaffAssistedRequest(ticket: Pick<Ticket, "createdByName" | "summary">) {
  const createdBy = String(ticket.createdByName ?? "");
  const summary = String(ticket.summary ?? "");
  return createdBy.startsWith("员工代录：") || summary.includes("【员工代录原始摘要】");
}

function readBracketBlock(src: string, tag: string, nextTags: string[]) {
  const start = src.indexOf(tag);
  if (start < 0) return "";
  const contentStart = start + tag.length;
  const endCandidates = nextTags
    .map((nextTag) => src.indexOf(nextTag, contentStart))
    .filter((idx) => idx >= 0);
  const end = endCandidates.length ? Math.min(...endCandidates) : src.length;
  return src.slice(contentStart, end).trim();
}

function parseAssistedRequestVisibility(currentIssue: string) {
  const src = String(currentIssue ?? "");
  const publicSummary = readBracketBlock(src, "【对外摘要】", ["【员工代录原始摘要】", "【沟通入口】"]);
  const internalOriginal = readBracketBlock(src, "【员工代录原始摘要】", ["【沟通入口】"]);
  const communicationSource = readBracketBlock(src, "【沟通入口】", []);
  return {
    publicSummary,
    internalOriginal,
    communicationSource,
  };
}

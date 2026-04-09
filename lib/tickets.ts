import { Prisma } from "@prisma/client";

export type OptionItem = {
  value: string;
  zh: string;
  en: string;
};

export type TicketTemplateField =
  | "grade"
  | "course"
  | "teacher"
  | "durationMin"
  | "mode"
  | "wechat";

export type TicketTypeTemplate = {
  title: string;
  requiredFields: TicketTemplateField[];
  suggestedFields: TicketTemplateField[];
  currentPlaceholder: string;
  actionPlaceholder: string;
  checklist: string[];
  draftCurrentIssue: string;
  draftRequiredAction: string;
};

export const TICKET_SOURCE_OPTIONS: OptionItem[] = [
  { value: "新东方外包", zh: "新东方外包", en: "New Oriental Outsourced" },
  { value: "自营学生", zh: "自营学生", en: "In-house Student" },
];

export const TICKET_TYPE_OPTIONS: OptionItem[] = [
  { value: "改课程时间", zh: "改课程时间", en: "Reschedule Lesson Time" },
  { value: "改上课老师", zh: "改上课老师", en: "Change Teacher" },
  { value: "临时取消&请假课程", zh: "临时取消&请假课程", en: "Temporary Cancel / Leave" },
  { value: "补课加课", zh: "补课加课", en: "Extra Session" },
  { value: "新学生购买课时包", zh: "新学生购买课时包", en: "New Student Package Purchase" },
  { value: "新排课", zh: "新排课", en: "New Scheduling" },
  { value: "排课协调", zh: "排课协调", en: "Scheduling Coordination" },
  { value: "临时评估学生（没有买课程）", zh: "临时评估学生（没有买课程）", en: "Assessment Without Package" },
  { value: "评估学生（已买课程）", zh: "评估学生（已买课程）", en: "Assessment With Package" },
  { value: "学术问题", zh: "学术问题", en: "Academic Issue" },
  { value: "非学术问题", zh: "非学术问题", en: "Non-academic Issue" },
];

export const SCHEDULING_COORDINATION_TICKET_TYPE = "排课协调";

export const TICKET_PRIORITY_OPTIONS: OptionItem[] = [
  { value: "普通", zh: "普通", en: "Normal" },
  { value: "1小时紧急", zh: "1小时紧急", en: "Urgent in 1 Hour" },
  { value: "6小时紧急", zh: "6小时紧急", en: "Urgent in 6 Hours" },
  { value: "24小时紧急", zh: "24小时紧急", en: "Urgent in 24 Hours" },
];

export const TICKET_STATUS_OPTIONS: OptionItem[] = [
  { value: "Need Info", zh: "待补信息", en: "Need Info" },
  { value: "Waiting Teacher", zh: "等老师", en: "Waiting Teacher" },
  { value: "Waiting Parent", zh: "等家长/合作方", en: "Waiting Parent/Partner" },
  { value: "Confirmed", zh: "已确认", en: "Confirmed" },
  { value: "Completed", zh: "已完成", en: "Completed" },
  { value: "Cancelled", zh: "已取消", en: "Cancelled" },
  { value: "Exception", zh: "异常升级", en: "Exception" },
];

export const TICKET_CS_STATUS_OPTIONS: OptionItem[] = [
  { value: "Need Info", zh: "待补信息", en: "Need Info" },
  { value: "Waiting Teacher", zh: "等老师", en: "Waiting Teacher" },
  { value: "Waiting Parent", zh: "等家长/合作方", en: "Waiting Parent/Partner" },
  { value: "Confirmed", zh: "已确认", en: "Confirmed" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  "Need Info": ["Waiting Teacher", "Waiting Parent", "Cancelled"],
  "Waiting Teacher": ["Waiting Parent", "Confirmed", "Need Info", "Exception", "Cancelled"],
  "Waiting Parent": ["Waiting Teacher", "Confirmed", "Need Info", "Exception", "Cancelled"],
  Confirmed: ["Completed", "Exception", "Cancelled"],
  Completed: ["Confirmed"],
  Cancelled: [],
  Exception: ["Waiting Teacher", "Waiting Parent", "Confirmed", "Completed", "Cancelled"],
};

export function canTransitionTicketStatus(from: string, to: string) {
  if (from === to) return true;
  const allowed = STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export const TICKET_OWNER_OPTIONS: OptionItem[] = [
  { value: "Eva", zh: "Eva", en: "Eva" },
  { value: "Emily", zh: "Emily", en: "Emily" },
  { value: "Jasmine", zh: "Jasmine", en: "Jasmine" },
];

export const TICKET_MODE_OPTIONS: OptionItem[] = [
  { value: "Online", zh: "线上", en: "Online" },
  { value: "Onsite", zh: "线下", en: "Onsite" },
];

export const TICKET_SYSTEM_UPDATED_OPTIONS: OptionItem[] = [
  { value: "Y", zh: "是", en: "Yes" },
  { value: "N", zh: "否", en: "No" },
];

export const TICKET_VERSION_OPTIONS: OptionItem[] = [
  { value: "V1", zh: "V1", en: "V1" },
  { value: "V2", zh: "V2", en: "V2" },
  { value: "V3", zh: "V3", en: "V3" },
  { value: "V4", zh: "V4", en: "V4" },
  { value: "V5", zh: "V5", en: "V5" },
];

const LEGACY_TICKET_TYPE_MAP: Record<string, string> = {
  改课调课: "改课程时间",
  取消: "临时取消&请假课程",
  请假: "临时取消&请假课程",
};

const LEGACY_TICKET_PRIORITY_MAP: Record<string, string> = {
  "紧急(24h内要上课)": "24小时紧急",
};

const SITUATION_CURRENT_TAG = "[SITUATION_CURRENT]";
const SITUATION_ACTION_TAG = "[SITUATION_ACTION]";
const SITUATION_DEADLINE_TAG = "[SITUATION_DEADLINE]";

export function normalizeTicketTypeValue(value: string | null | undefined) {
  if (!value) return "";
  return LEGACY_TICKET_TYPE_MAP[value] ?? value;
}

export function ticketTypeAliases(value: string | null | undefined) {
  const normalized = normalizeTicketTypeValue(value);
  if (!normalized) return [];
  return Array.from(
    new Set(
      [normalized, ...Object.entries(LEGACY_TICKET_TYPE_MAP).filter(([, next]) => next === normalized).map(([legacy]) => legacy)].filter(
        Boolean
      )
    )
  );
}

export function normalizeTicketPriorityValue(value: string | null | undefined) {
  if (!value) return "";
  return LEGACY_TICKET_PRIORITY_MAP[value] ?? value;
}

export function composeTicketSituation(input: {
  currentIssue: string;
  requiredAction: string;
  latestDeadlineText: string;
}) {
  return [
    SITUATION_CURRENT_TAG,
    input.currentIssue.trim(),
    "",
    SITUATION_ACTION_TAG,
    input.requiredAction.trim(),
    "",
    SITUATION_DEADLINE_TAG,
    input.latestDeadlineText.trim(),
  ].join("\n");
}

export function parseTicketSituationSummary(raw: string | null | undefined) {
  const src = String(raw ?? "");
  const readBlock = (startTag: string, nextTag?: string) => {
    const start = src.indexOf(startTag);
    if (start < 0) return "";
    const contentStart = start + startTag.length;
    const completionNoteStart = src.indexOf("[Completed Note]", contentStart);
    const nextTagStart = nextTag ? src.indexOf(nextTag, contentStart) : -1;
    const endCandidates = [nextTagStart, completionNoteStart].filter((idx) => idx >= 0);
    const end = endCandidates.length > 0 ? Math.min(...endCandidates) : -1;
    const text = end >= 0 ? src.slice(contentStart, end) : src.slice(contentStart);
    return text.trim();
  };

  const currentIssue = readBlock(SITUATION_CURRENT_TAG, SITUATION_ACTION_TAG);
  const requiredAction = readBlock(SITUATION_ACTION_TAG, SITUATION_DEADLINE_TAG);
  const latestDeadlineText = readBlock(SITUATION_DEADLINE_TAG);
  if (!currentIssue && !requiredAction && !latestDeadlineText) {
    return {
      currentIssue: src.trim(),
      requiredAction: "",
      latestDeadlineText: "",
    };
  }
  return { currentIssue, requiredAction, latestDeadlineText };
}

export function normalizeTicketString(v: unknown, maxLen = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

export function normalizeTicketInt(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded <= 0) return null;
  return rounded;
}

export function parseDateLike(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00+08:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return new Date(`${s}:00+08:00`);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function ticketDayKey(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}${m}${day}`;
}

export async function allocateTicketNo(tx: Prisma.TransactionClient, now = new Date()) {
  const dayKey = ticketDayKey(now);
  const counter = await tx.ticketDailyCounter.upsert({
    where: { dayKey },
    create: { dayKey, nextSeq: 2 },
    update: { nextSeq: { increment: 1 } },
    select: { nextSeq: true },
  });
  const seq = Math.max(1, counter.nextSeq - 1);
  return `${dayKey}-${String(seq).padStart(3, "0")}`;
}

export function generateIntakeToken() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 24; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export const TICKET_UPLOAD_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const TICKET_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const DEFAULT_TICKET_TEMPLATE: TicketTypeTemplate = {
  title: "通用工单模板",
  requiredFields: [],
  suggestedFields: [],
  currentPlaceholder: "写清楚当前正在发生什么问题。",
  actionPlaceholder: "写清楚下一步需要谁做什么。",
  checklist: ["先写清当前问题", "再写需要怎么做", "最后写最晚截止时间"],
  draftCurrentIssue: "当前问题待补充。",
  draftRequiredAction: "请补充负责人下一步动作，并确认最晚截止时间。",
};

const TICKET_TYPE_TEMPLATE_MAP: Record<string, TicketTypeTemplate> = {
  改课程时间: {
    title: "改课程时间模板",
    requiredFields: ["course", "teacher"],
    suggestedFields: ["durationMin", "wechat"],
    currentPlaceholder: "例如：家长要求把原定周三19:00课程改到周五晚上，当前待确认老师和家长都可行的时间。",
    actionPlaceholder: "例如：先确认老师周五可排时段，再和家长确认最终时间并更新系统。",
    checklist: ["课程必填", "老师必填", "建议补充时长和微信群"],
    draftCurrentIssue: "家长提出改课程时间需求，当前待确认老师和家长都可接受的新时间。",
    draftRequiredAction: "请先确认老师可排时段，再与家长确认最终时间，并完成系统改期。",
  },
  改上课老师: {
    title: "改上课老师模板",
    requiredFields: ["course", "teacher"],
    suggestedFields: ["wechat"],
    currentPlaceholder: "例如：家长希望将现有英语课改由另一位老师接手，当前待确认交接安排。",
    actionPlaceholder: "例如：确认新老师可接手的时间，并同步家长和系统。",
    checklist: ["课程必填", "老师栏填写目标老师或当前待替换老师", "建议补充微信群"],
    draftCurrentIssue: "家长提出改上课老师需求，当前待确认目标老师和交接安排。",
    draftRequiredAction: "请确认目标老师是否可接手，并同步家长及系统内老师安排。",
  },
  "临时取消&请假课程": {
    title: "取消/请假模板",
    requiredFields: ["course"],
    suggestedFields: ["teacher", "wechat"],
    currentPlaceholder: "例如：家长通知本周课程需临时取消/请假，当前待确认是否补课。",
    actionPlaceholder: "例如：记录取消原因，通知老师，并确认是否需要补课或改期。",
    checklist: ["课程必填", "建议补充老师和微信群", "Situation 里写清是否需要后续补课"],
    draftCurrentIssue: "家长提出临时取消/请假需求，当前待确认本次课程是否取消以及是否补课。",
    draftRequiredAction: "请记录原因、通知老师，并确认是否需要安排补课或改期。",
  },
  补课加课: {
    title: "补课加课模板",
    requiredFields: ["course", "teacher", "durationMin"],
    suggestedFields: ["wechat", "mode"],
    currentPlaceholder: "例如：家长希望周日或周二增加一节课，当前倾向 Yunfeng 周日下午。",
    actionPlaceholder: "例如：确认老师可排时间，确认家长最终选择，并补录到系统。",
    checklist: ["课程必填", "老师必填", "时长必填", "建议补充授课形式和微信群"],
    draftCurrentIssue: "家长提出补课/加课需求，当前待确认老师可排时间和家长最终选择。",
    draftRequiredAction: "请先确认老师可排时段，再与家长确认最终时间，并补录系统安排。",
  },
  新学生购买课时包: {
    title: "新学生购买课时包模板",
    requiredFields: ["grade", "course"],
    suggestedFields: ["wechat"],
    currentPlaceholder: "例如：新学生已确认购买课时包，当前待录入和后续排课。",
    actionPlaceholder: "例如：完成课包登记，并推进后续排课准备。",
    checklist: ["年级必填", "课程必填", "建议补充微信群或后续沟通入口"],
    draftCurrentIssue: "新学生已确认购买课时包，当前待完成课包录入和后续排课准备。",
    draftRequiredAction: "请完成课包登记，确认后续排课需求，并推进下一步安排。",
  },
  新排课: {
    title: "新排课模板",
    requiredFields: ["grade", "course"],
    suggestedFields: ["teacher", "mode", "durationMin"],
    currentPlaceholder: "例如：学生需要新排一门英语课，当前待确认老师、时段和授课形式。",
    actionPlaceholder: "例如：先匹配老师和时间，再确认授课形式并排入系统。",
    checklist: ["年级必填", "课程必填", "建议补充老师、授课形式和时长"],
    draftCurrentIssue: "学生需要新排课，当前待确认老师、时间和授课形式。",
    draftRequiredAction: "请先匹配老师和可排时间，再确认授课形式并完成排课。",
  },
  排课协调: {
    title: "排课协调模板",
    requiredFields: ["course"],
    suggestedFields: ["teacher", "mode", "durationMin", "wechat"],
    currentPlaceholder: "例如：家长需要确认固定上课时间，默认先按老师 availability 生成候选时间；若家长提出特殊时间，再标记为例外确认。",
    actionPlaceholder: "例如：先发 availability 候选时间给家长，记录家长偏好；只有特殊时间不命中 availability 时，再回老师做例外确认。",
    checklist: ["课程必填", "建议补充老师、授课形式、时长和微信群", "Situation 里先写家长限制，再写下一步跟进时间"],
    draftCurrentIssue: "当前需要基于老师 availability 协调家长上课时间，并记录家长偏好或特殊时间要求。",
    draftRequiredAction: "请先发送 availability 候选时间给家长，记录回复；如家长提出特殊时间且不在 availability 内，再做老师例外确认。",
  },
  "临时评估学生（没有买课程）": {
    title: "临时评估模板",
    requiredFields: ["grade", "course"],
    suggestedFields: ["teacher", "mode", "durationMin"],
    currentPlaceholder: "例如：学生需安排一次未购课评估，当前待确认评估老师和时间。",
    actionPlaceholder: "例如：安排评估课，课后按评估课免扣流程处理。",
    checklist: ["年级必填", "课程必填", "建议补充老师、授课形式和时长"],
    draftCurrentIssue: "学生需要安排临时评估，当前待确认评估老师、时间和授课形式。",
    draftRequiredAction: "请安排评估课并完成记录，课后按评估课流程处理。",
  },
  "评估学生（已买课程）": {
    title: "已购课评估模板",
    requiredFields: ["grade", "course"],
    suggestedFields: ["teacher", "mode", "durationMin"],
    currentPlaceholder: "例如：已购课学生需要安排评估，当前待确认老师和评估时间。",
    actionPlaceholder: "例如：安排评估课并记录评估结论，再推进后续课程安排。",
    checklist: ["年级必填", "课程必填", "建议补充老师、授课形式和时长"],
    draftCurrentIssue: "已购课学生需要安排评估，当前待确认评估老师和时间。",
    draftRequiredAction: "请安排评估课，记录评估结果，并推进后续课程安排。",
  },
  学术问题: {
    title: "学术问题模板",
    requiredFields: [],
    suggestedFields: ["course", "teacher"],
    currentPlaceholder: "例如：学生在某门课程出现学术问题，当前待确认具体原因和影响范围。",
    actionPlaceholder: "例如：先收集老师反馈，再给出处理方案并回家长。",
    checklist: ["建议补充课程和老师", "Situation 里写清问题和处理动作"],
    draftCurrentIssue: "当前出现学术问题，待确认具体原因、影响范围和涉及课程。",
    draftRequiredAction: "请先收集老师反馈与证据，再给出处理方案并回复家长。",
  },
  "非学术问题": {
    title: "非学术问题模板",
    requiredFields: [],
    suggestedFields: ["course", "teacher"],
    currentPlaceholder: "例如：家长对服务流程或沟通安排有意见，当前待跟进处理。",
    actionPlaceholder: "例如：确认问题归属，安排负责人处理并回家长。",
    checklist: ["建议补充相关课程或老师", "Situation 里写清问题和处理动作"],
    draftCurrentIssue: "当前出现非学术问题，待确认具体场景、影响和责任归属。",
    draftRequiredAction: "请确认问题归属，安排负责人跟进，并在处理后回复家长。",
  },
};

export const TICKET_HIGH_FREQUENCY_TYPES = [
  "改课程时间",
  "补课加课",
  "新排课",
  "排课协调",
  "改上课老师",
  "临时取消&请假课程",
] as const;

const TICKET_FIELD_LABELS: Record<TicketTemplateField, string> = {
  grade: "年级",
  course: "课程",
  teacher: "老师",
  durationMin: "时长",
  mode: "授课形式",
  wechat: "当前微信群名称",
};

export function getTicketTypeTemplate(type: string | null | undefined): TicketTypeTemplate {
  const normalized = normalizeTicketTypeValue(type);
  return TICKET_TYPE_TEMPLATE_MAP[normalized] ?? DEFAULT_TICKET_TEMPLATE;
}

export function getTicketFieldLabel(field: TicketTemplateField) {
  return TICKET_FIELD_LABELS[field];
}

export function validateTicketTypeRequirements(input: {
  type: string | null | undefined;
  grade?: string | null;
  course?: string | null;
  teacher?: string | null;
  durationMin?: number | null;
  mode?: string | null;
  wechat?: string | null;
}) {
  const template = getTicketTypeTemplate(input.type);
  const missing: TicketTemplateField[] = [];
  for (const field of template.requiredFields) {
    if (field === "durationMin") {
      if (!input.durationMin || input.durationMin <= 0) missing.push(field);
      continue;
    }
    const value = (input[field] ?? "") as string | null;
    if (!String(value ?? "").trim()) missing.push(field);
  }
  return {
    missingFields: missing,
    missingLabels: missing.map((field) => getTicketFieldLabel(field)),
    template,
  };
}

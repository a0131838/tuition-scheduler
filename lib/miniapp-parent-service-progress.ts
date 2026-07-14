import {
  formatBusinessDateOnly,
  formatBusinessDateTime,
  parseBusinessDateStart,
} from "@/lib/date-only";
import { servicePlanCadence, servicePlanLabel } from "@/lib/academic-management";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ParentProgressTimelineItem = {
  id: string;
  kind: "LESSON" | "FEEDBACK" | "REQUEST" | "CARE";
  kindLabel: string;
  title: string;
  summary: string;
  occurredAt: string;
  occurredAtText: string;
};

export function parentServiceWeekRange(now = new Date()) {
  const today = formatBusinessDateOnly(now);
  const localNoon = new Date(`${today}T12:00:00.000Z`);
  const weekday = localNoon.getUTCDay() || 7;
  const mondayDate = new Date(localNoon.getTime() - (weekday - 1) * DAY_MS);
  const sundayDate = new Date(mondayDate.getTime() + 6 * DAY_MS);
  const start = parseBusinessDateStart(formatBusinessDateOnly(mondayDate))!;
  const end = new Date(parseBusinessDateStart(formatBusinessDateOnly(sundayDate))!.getTime() + DAY_MS - 1);
  return {
    start,
    end,
    label: `${formatBusinessDateOnly(start).slice(5).replace("-", "/")} - ${formatBusinessDateOnly(end).slice(5).replace("-", "/")}`,
  };
}

export function parentServicePlanCopy(servicePlanType?: string | null) {
  if (servicePlanType === "FULL_CARE") {
    return {
      label: servicePlanLabel(servicePlanType),
      headline: "课程、事务与下一步持续跟进",
      description: "汇总已完成服务、家长可见动态和接下来的安排。",
      cadence: servicePlanCadence(servicePlanType),
    };
  }
  if (servicePlanType === "ACADEMIC_MANAGEMENT") {
    return {
      label: servicePlanLabel(servicePlanType),
      headline: "学习进展与风险持续跟进",
      description: "把课程、反馈、风险和下一步集中在一起，方便随时核对。",
      cadence: servicePlanCadence(servicePlanType),
    };
  }
  return {
    label: servicePlanLabel(servicePlanType || "STANDARD_COURSE"),
    headline: "不只上课，也持续记录服务进展",
    description: "课程安排、课后反馈、服务请求和下一步均可在这里查看。",
    cadence: servicePlanCadence(servicePlanType || "STANDARD_COURSE"),
  };
}

export function compactParentProgressText(value: unknown, max = 120) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function parentProgressTimelineItem(input: {
  id: string;
  kind: ParentProgressTimelineItem["kind"];
  title: unknown;
  summary: unknown;
  occurredAt: Date;
}): ParentProgressTimelineItem | null {
  const labels: Record<ParentProgressTimelineItem["kind"], string> = {
    LESSON: "课程",
    FEEDBACK: "课后反馈",
    REQUEST: "服务请求",
    CARE: "服务动态",
  };
  const title = compactParentProgressText(input.title, 80);
  const summary = compactParentProgressText(input.summary, 180);
  if (!title || !summary) return null;
  return {
    id: input.id,
    kind: input.kind,
    kindLabel: labels[input.kind],
    title,
    summary,
    occurredAt: input.occurredAt.toISOString(),
    occurredAtText: formatBusinessDateTime(input.occurredAt),
  };
}

export function sortParentProgressTimeline(items: Array<ParentProgressTimelineItem | null>, limit = 12) {
  return items
    .filter((item): item is ParentProgressTimelineItem => Boolean(item))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

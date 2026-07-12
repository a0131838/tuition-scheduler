import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CourseTemplateKind = "course" | "class" | "start";

type CourseTemplate = { kind: CourseTemplateKind; templateId: string };

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max) || "-";
}

function singaporeParts(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return { dateTime: "-", time: "-" };
  const dateTime = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date);
  return { dateTime, time: dateTime.slice(11, 16) };
}

export function courseTemplates(): CourseTemplate[] {
  const templates: CourseTemplate[] = [
    { kind: "course", templateId: String(process.env.WECHAT_TEMPLATE_COURSE_REMINDER ?? "").trim() },
    { kind: "class", templateId: String(process.env.WECHAT_TEMPLATE_CLASS_REMINDER ?? "").trim() },
    { kind: "start", templateId: String(process.env.WECHAT_TEMPLATE_COURSE_START ?? "").trim() },
  ];
  return templates.filter((item) => Boolean(item.templateId));
}

export function countAcceptedTemplate(audits: Array<{ metaJson: unknown }>, templateId: string) {
  return audits.reduce((count, audit) => {
    const meta = audit.metaJson && typeof audit.metaJson === "object" ? (audit.metaJson as any) : null;
    return count + (Array.isArray(meta?.acceptedTemplateIds) && meta.acceptedTemplateIds.includes(templateId) ? 1 : 0);
  }, 0);
}

export function buildCourseReminderData(kind: CourseTemplateKind, payload: unknown) {
  const value = payload && typeof payload === "object" ? (payload as any) : {};
  const courseName = value.courseName || value.courseLabel;
  const subjectName = value.subjectName || String(value.courseLabel || "").split("/")[1]?.trim() || "课程";
  const time = singaporeParts(value.startAt);
  const durationMinutes = Math.max(1, Number(value.durationMinutes) || 60);
  if (kind === "class") {
    return {
      thing1: { value: clean(courseName, 20) }, time2: { value: time.time }, name3: { value: clean(value.teacherName, 10) },
      short_thing5: { value: clean(`${durationMinutes}分钟`, 5) }, thing6: { value: clean(value.studentName, 20) },
    };
  }
  if (kind === "start") {
    return {
      thing1: { value: clean(courseName, 20) }, time2: { value: time.time }, thing3: { value: clean(value.teacherName, 20) },
      character_string5: { value: clean(String(Math.round((durationMinutes / 60) * 10) / 10), 32) }, thing4: { value: clean(value.locationLabel || value.campusName, 20) },
    };
  }
  return {
    thing1: { value: clean(courseName, 20) }, name2: { value: clean(subjectName, 10) },
    name3: { value: clean(value.teacherName, 10) }, date4: { value: time.dateTime },
  };
}

export async function availableCourseTemplate(parentId: string) {
  const templates = courseTemplates();
  const audits = await prisma.parentPortalAudit.findMany({
    where: { parentId, action: "MINIAPP_SUBSCRIPTION_INTENT", targetId: "course" },
    select: { metaJson: true }, orderBy: { createdAt: "desc" }, take: 500,
  });
  const sentRows = await prisma.miniappNotificationOutbox.findMany({
    where: { parentId, status: "SENT", eventType: { in: ["COURSE_REMINDER", "COURSE_REMINDER_TEST"] } },
    select: { templateKey: true, payloadJson: true }, take: 500,
  });
  for (const template of templates) {
    const accepted = countAcceptedTemplate(audits, template.templateId);
    const consumed = sentRows.filter((row) => {
      const payload = row.payloadJson && typeof row.payloadJson === "object" ? (row.payloadJson as any) : null;
      if (payload?.deliveredTemplateId) return payload.deliveredTemplateId === template.templateId;
      return row.templateKey === "course_reminder_test" && template.kind === "course";
    }).length;
    if (accepted > consumed) return template;
  }
  return null;
}

async function accessToken() {
  const appid = String(process.env.WECHAT_MINIAPP_APPID ?? "").trim();
  const secret = String(process.env.WECHAT_MINIAPP_SECRET ?? "").trim();
  if (!appid || !secret) throw new Error("Wechat miniapp credentials are not configured");
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential"); url.searchParams.set("appid", appid); url.searchParams.set("secret", secret);
  const response = await fetch(url); const result = (await response.json()) as any;
  if (!response.ok || !result.access_token) throw new Error(`Wechat access token failed: ${result.errcode ?? response.status} ${result.errmsg ?? ""}`);
  return String(result.access_token);
}

export async function sendCourseReminder(input: { openId: string; payload: unknown; template: CourseTemplate }) {
  const token = await accessToken();
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ touser: input.openId, template_id: input.template.templateId, page: "pages/schedule/schedule", data: buildCourseReminderData(input.template.kind, input.payload) }),
  });
  const result = (await response.json()) as any;
  if (!response.ok || result.errcode !== 0) {
    const error = new Error(`Wechat subscribe send failed: ${result.errcode ?? response.status} ${result.errmsg ?? ""}`) as Error & { errcode?: number };
    error.errcode = Number(result.errcode ?? response.status); throw error;
  }
  return { errcode: 0, errmsg: String(result.errmsg ?? "ok") };
}

export function payloadWithDeliveredTemplate(payload: unknown, templateId: string): Prisma.InputJsonValue {
  const base = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  return { ...base, deliveredTemplateId: templateId } as Prisma.InputJsonValue;
}

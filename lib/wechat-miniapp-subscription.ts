import { prisma } from "@/lib/prisma";

const COURSE_TEMPLATE_KEYS = ["course_reminder_24h", "course_reminder_6h", "course_reminder_test"];

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max) || "-";
}

export function countAcceptedTemplate(audits: Array<{ metaJson: unknown }>, templateId: string) {
  return audits.reduce((count, audit) => {
    const meta = audit.metaJson && typeof audit.metaJson === "object" ? (audit.metaJson as any) : null;
    return count + (Array.isArray(meta?.acceptedTemplateIds) && meta.acceptedTemplateIds.includes(templateId) ? 1 : 0);
  }, 0);
}

export function buildCourseReminderData(payload: unknown) {
  const value = payload && typeof payload === "object" ? (payload as any) : {};
  const courseName = value.courseName || value.courseLabel;
  const subjectName = value.subjectName || String(value.courseLabel || "").split("/")[1]?.trim() || "课程";
  const startAt = new Date(value.startAt);
  const dateValue = Number.isNaN(startAt.getTime())
    ? "-"
    : new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(startAt);
  return {
    thing1: { value: clean(courseName, 20) },
    name2: { value: clean(subjectName, 10) },
    name3: { value: clean(value.teacherName, 10) },
    date4: { value: dateValue },
  };
}

export async function availableCourseConsent(parentId: string, templateId: string) {
  const audits = await prisma.parentPortalAudit.findMany({
    where: { parentId, action: "MINIAPP_SUBSCRIPTION_INTENT", targetId: "course" },
    select: { metaJson: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const accepted = countAcceptedTemplate(audits, templateId);
  const consumed = await prisma.miniappNotificationOutbox.count({
    where: { parentId, status: "SENT", templateKey: { in: COURSE_TEMPLATE_KEYS } },
  });
  return Math.max(accepted - consumed, 0);
}

async function accessToken() {
  const appid = String(process.env.WECHAT_MINIAPP_APPID ?? "").trim();
  const secret = String(process.env.WECHAT_MINIAPP_SECRET ?? "").trim();
  if (!appid || !secret) throw new Error("Wechat miniapp credentials are not configured");
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  const response = await fetch(url);
  const result = (await response.json()) as any;
  if (!response.ok || !result.access_token) throw new Error(`Wechat access token failed: ${result.errcode ?? response.status} ${result.errmsg ?? ""}`);
  return String(result.access_token);
}

export async function sendCourseReminder(input: { openId: string; payload: unknown }) {
  const templateId = String(process.env.WECHAT_TEMPLATE_COURSE_REMINDER ?? "").trim();
  if (!templateId) throw new Error("Course reminder template is not configured");
  const token = await accessToken();
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      touser: input.openId,
      template_id: templateId,
      page: "pages/schedule/schedule",
      data: buildCourseReminderData(input.payload),
    }),
  });
  const result = (await response.json()) as any;
  if (!response.ok || result.errcode !== 0) {
    const error = new Error(`Wechat subscribe send failed: ${result.errcode ?? response.status} ${result.errmsg ?? ""}`) as Error & { errcode?: number };
    error.errcode = Number(result.errcode ?? response.status);
    throw error;
  }
  return { errcode: 0, errmsg: String(result.errmsg ?? "ok") };
}

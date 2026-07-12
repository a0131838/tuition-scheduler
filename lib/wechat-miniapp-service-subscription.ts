import { Prisma } from "@prisma/client";
import { miniappRequestStatusLabel } from "@/lib/miniapp-parent-requests";
import { countAcceptedTemplate } from "@/lib/wechat-miniapp-subscription";
import { prisma } from "@/lib/prisma";

export type ServiceNotificationKind = "request" | "finance" | "invoice" | "receipt" | "feedback";

type ServiceTemplateDefinition = {
  kind: ServiceNotificationKind;
  templateKey: string;
  templateId: string;
  groupKey: "service" | "documents" | "learning";
  page: (payload: Record<string, unknown>) => string;
};

function clean(value: unknown, max: number, fallback = "-") {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max) || fallback;
}

function singaporeDateTime(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(valid);
}

function amount(value: unknown) {
  const n = Number(value);
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export function serviceTemplateDefinitions(): ServiceTemplateDefinition[] {
  const definitions: ServiceTemplateDefinition[] = [
    {
      kind: "request", templateKey: "request_status_changed", groupKey: "service",
      templateId: String(process.env.WECHAT_TEMPLATE_REQUEST_STATUS ?? "").trim(),
      page: (payload: Record<string, unknown>) => `/pages/request-detail/request-detail?id=${encodeURIComponent(String(payload.ticketId || ""))}`,
    },
    {
      kind: "finance", templateKey: "finance_unpaid", groupKey: "service",
      templateId: String(process.env.WECHAT_TEMPLATE_FINANCE_UNPAID ?? "").trim(),
      page: () => "/pages/finance/finance",
    },
    {
      kind: "invoice", templateKey: "invoice_issued", groupKey: "documents",
      templateId: String(process.env.WECHAT_TEMPLATE_INVOICE_ISSUED ?? "").trim(),
      page: () => "/pages/finance/finance",
    },
    {
      kind: "receipt", templateKey: "receipt_issued", groupKey: "documents",
      templateId: String(process.env.WECHAT_TEMPLATE_RECEIPT_ISSUED ?? "").trim(),
      page: () => "/pages/finance/finance",
    },
    {
      kind: "feedback", templateKey: "feedback_published", groupKey: "learning",
      templateId: String(process.env.WECHAT_TEMPLATE_FEEDBACK_PUBLISHED ?? "").trim(),
      page: () => "/pages/feedbacks/feedbacks",
    },
  ];
  return definitions.filter((item) => Boolean(item.templateId));
}

export function serviceConsentGroupKeys(templateKey: string) {
  const definitions = serviceTemplateDefinitions();
  const template = definitions.find((item) => item.templateKey === templateKey);
  if (!template) return [];
  return Array.from(new Set(
    definitions
      .filter((item) => item.templateId === template.templateId)
      .map((item) => item.groupKey)
  ));
}

export function buildServiceNotificationData(kind: ServiceNotificationKind, payload: unknown) {
  const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (kind === "request") {
    return {
      character_string1: { value: clean(value.ticketNo, 32) },
      thing2: { value: clean(value.studentName, 20, "学员家长") },
      thing4: { value: clean(value.statusLabel || miniappRequestStatusLabel(String(value.status || "")), 20) },
      date5: { value: singaporeDateTime(value.updatedAt) },
      thing6: { value: clean(value.type || "家长服务请求", 20) },
    };
  }
  if (kind === "finance") {
    return {
      character_string1: { value: clean(value.invoiceNo || value.orderNo, 32) },
      time2: { value: singaporeDateTime(value.dueAt || value.dueDate) },
    };
  }
  if (kind === "invoice") {
    return {
      thing1: { value: "发票开具" },
      time2: { value: singaporeDateTime(value.issuedAt || value.issueDate) },
      thing3: { value: clean(value.note || `发票号 ${value.invoiceNo || ""}`, 20) },
    };
  }
  if (kind === "feedback") {
    return {
      thing1: { value: "课后反馈" },
      time2: { value: singaporeDateTime(value.submittedAt) },
      thing3: { value: clean(`${value.studentName || "学员"}反馈已发布`, 20) },
    };
  }
  return {
    thing1: { value: clean(value.studentName, 20, "学员") },
    amount2: { value: amount(value.amountReceived) },
    thing3: { value: clean(value.receivingAccount || "博思教育", 20) },
    time5: { value: singaporeDateTime(value.receiptDate || value.paidAt) },
  };
}

export async function availableServiceTemplate(parentId: string, templateKey: string) {
  const template = serviceTemplateDefinitions().find((item) => item.templateKey === templateKey);
  if (!template) return null;
  const consentGroupKeys = serviceConsentGroupKeys(templateKey);
  const [audits, sentRows] = await Promise.all([
    prisma.parentPortalAudit.findMany({
      where: { parentId, action: "MINIAPP_SUBSCRIPTION_INTENT", targetId: { in: consentGroupKeys } },
      select: { metaJson: true }, orderBy: { createdAt: "desc" }, take: 500,
    }),
    prisma.miniappNotificationOutbox.findMany({
      where: { parentId, status: "SENT" }, select: { payloadJson: true }, take: 1000,
    }),
  ]);
  const accepted = countAcceptedTemplate(audits, template.templateId);
  const consumed = sentRows.filter((row) => {
    const payload = row.payloadJson && typeof row.payloadJson === "object" ? row.payloadJson as any : null;
    return payload?.deliveredTemplateId === template.templateId;
  }).length;
  return accepted > consumed ? template : null;
}

async function accessToken() {
  const appid = String(process.env.WECHAT_MINIAPP_APPID ?? "").trim();
  const secret = String(process.env.WECHAT_MINIAPP_SECRET ?? "").trim();
  if (!appid || !secret) throw new Error("Wechat miniapp credentials are not configured");
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  const result = await (await fetch(url)).json() as any;
  if (!result.access_token) throw new Error(`Wechat access token failed: ${result.errcode ?? ""} ${result.errmsg ?? ""}`);
  return String(result.access_token);
}

export async function sendServiceNotification(input: {
  openId: string;
  payload: unknown;
  template: ServiceTemplateDefinition;
}) {
  const token = await accessToken();
  const payload = input.payload && typeof input.payload === "object" ? input.payload as Record<string, unknown> : {};
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      touser: input.openId,
      template_id: input.template.templateId,
      page: input.template.page(payload),
      data: buildServiceNotificationData(input.template.kind, payload),
    }),
  });
  const result = await response.json() as any;
  if (!response.ok || result.errcode !== 0) {
    const error = new Error(`Wechat subscribe send failed: ${result.errcode ?? response.status} ${result.errmsg ?? ""}`) as Error & { errcode?: number };
    error.errcode = Number(result.errcode ?? response.status);
    throw error;
  }
  return { errcode: 0, errmsg: String(result.errmsg ?? "ok") };
}

export function servicePayloadWithDeliveredTemplate(payload: unknown, templateId: string): Prisma.InputJsonValue {
  const base = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  return { ...base, deliveredTemplateId: templateId } as Prisma.InputJsonValue;
}

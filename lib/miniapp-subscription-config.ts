export const MINIAPP_SUBSCRIPTION_ENV = {
  course: "WECHAT_TEMPLATE_COURSE_REMINDER",
  request: "WECHAT_TEMPLATE_REQUEST_STATUS",
  finance: "WECHAT_TEMPLATE_FINANCE_UNPAID",
  invoice: "WECHAT_TEMPLATE_INVOICE_ISSUED",
  receipt: "WECHAT_TEMPLATE_RECEIPT_ISSUED",
} as const;

export function miniappSubscriptionConfiguration() {
  const templates = Object.entries(MINIAPP_SUBSCRIPTION_ENV).map(([key, envKey]) => {
    const templateId = String(process.env[envKey] ?? "").trim();
    return { key, envKey, templateId, configured: Boolean(templateId) };
  });
  return {
    appIdConfigured: Boolean(String(process.env.WECHAT_MINIAPP_APPID ?? "").trim()),
    secretConfigured: Boolean(String(process.env.WECHAT_MINIAPP_SECRET ?? "").trim()),
    templates,
    configuredCount: templates.filter((item) => item.configured).length,
    requiredCount: templates.length,
  };
}

export function miniappSubscriptionGroups() {
  const config = miniappSubscriptionConfiguration();
  const byKey = new Map(config.templates.map((item) => [item.key, item]));
  const group = (key: string, label: string, keys: string[]) => ({
    key,
    label,
    templateIds: keys.map((item) => byKey.get(item)?.templateId ?? "").filter(Boolean),
  });
  return [
    group("course", "课程提醒", ["course"]),
    group("service", "请求与财务进度", ["request", "finance"]),
    group("documents", "发票与收据", ["invoice", "receipt"]),
  ].map((item) => ({ ...item, configured: item.templateIds.length > 0 }));
}

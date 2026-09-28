/** Presentation only: callers must supply the existing permission-filtered links. */
export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  secondary?: boolean;
};

export type AdminNavGroup = {
  title: string;
  summary?: string;
  items: AdminNavItem[];
};

type Lang = "ZH" | "EN" | "BILINGUAL";
const sections = [
  ["work", "My Work", "我的工作"],
  ["sales", "Sales & Relationships", "销售与关系"],
  ["teaching", "Students & Teaching", "学生与教学"],
  ["service", "Services & Tickets", "服务与工单"],
  ["finance", "Finance", "财务"],
  ["team", "Team & Training", "团队与培训"],
  ["tools", "Reports & Settings", "报表与设置"],
] as const;

function sectionFor(href: string) {
  const path = href.split("?")[0];
  if (href.includes("workspace=sales")) return "sales";
  if (href.includes("workspace=cs")) return "service";
  if (["/admin", "/admin/todos", "/admin/approvals", "/admin/alerts"].includes(path)) return "work";
  if (path.startsWith("/admin/leads") || path.startsWith("/admin/relationships")) return "sales";
  if (["/admin/schedule", "/admin/reports/monthly-schedule", "/admin/monthly-scheduling", "/admin/students", "/admin/teachers", "/admin/classes", "/admin/enrollments", "/admin/booking-links", "/admin/packages", "/admin/feedbacks", "/admin/manager/quality"].includes(path)) return "teaching";
  if (path === "/admin/tickets/sop") return "team";
  if (path.startsWith("/admin/tickets") || ["/admin/care", "/admin/school-applications", "/admin/communications", "/admin/communication-reminders", "/admin/renewals", "/admin/mobile", "/admin/miniapp-notifications"].includes(path)) return "service";
  if (path.startsWith("/admin/finance") || path.startsWith("/admin/receipts-approvals") || ["/admin/reports/teacher-payroll", "/admin/reports/partner-settlement", "/admin/expense-claims", "/admin/hr/payslips"].includes(path)) return "finance";
  if (path.startsWith("/admin/hr") || path.startsWith("/staff/hr") || path.startsWith("/training") || ["/admin/teacher-notices", "/admin/shared-docs"].includes(path)) return "team";
  return "tools";
}

const secondaryPaths = new Set([
  "/admin/alerts", "/admin/leads/new", "/admin/leads/dashboard", "/admin/leads/owners",
  "/admin/classes", "/admin/enrollments", "/admin/booking-links", "/admin/manager/quality",
  "/admin/tickets/handover", "/admin/tickets/sop", "/admin/mobile", "/admin/miniapp-notifications",
  "/admin/finance/deleted-invoices", "/admin/finance/student-package-balances",
  "/admin/finance/student-package-utilization", "/admin/finance/individual-student-utility",
  "/admin/finance/tutor-cost-export", "/admin/receipts-approvals/history", "/admin/receipts-approvals/repairs",
  "/admin/shared-docs",
]);

export function reorganizeAdminNavigation(groups: AdminNavGroup[], lang: Lang): AdminNavGroup[] {
  const buckets = new Map<string, AdminNavItem[]>();
  const seen = new Set<string>();
  for (const group of groups) {
    for (const item of group.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      const key = sectionFor(item.href);
      const items = buckets.get(key) ?? [];
      items.push({ ...item, secondary: secondaryPaths.has(item.href.split("?")[0]) });
      buckets.set(key, items);
    }
  }
  return sections.flatMap(([key, en, zh]) => {
    const items = buckets.get(key);
    return items?.length ? [{ title: lang === "ZH" ? zh : lang === "EN" ? en : `${en} / ${zh}`, items }] : [];
  });
}

export function activeAdminNavHref(groups: AdminNavGroup[], pathname: string) {
  return groups.flatMap((group) => group.items)
    .filter(({ href }) => {
      const path = href.split("?")[0];
      return pathname === path || (path !== "/admin" && pathname.startsWith(`${path}/`));
    })
    .sort((a, b) => b.href.split("?")[0].length - a.href.split("?")[0].length)[0]?.href;
}

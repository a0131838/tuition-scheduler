import { isManagerUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { parseLedgerIntegrityAlertState, LEDGER_INTEGRITY_ALERT_KEY } from "@/lib/ledger-integrity-alert";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatBusinessDateTime } from "@/lib/date-only";
import LanguageSelectorClient from "./_components/LanguageSelectorClient";
import AdminSidebarNavClient from "./AdminSidebarNavClient";
import WorkbenchStickyGuardClient from "./_components/WorkbenchStickyGuardClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
} from "./_components/workbenchStyles";

async function resolvePathnameFromHeaders() {
  const h = await headers();
  const candidates = [
    h.get("x-pathname"),
    h.get("x-invoke-path"),
    h.get("x-matched-path"),
    h.get("next-url"),
    h.get("x-url"),
    h.get("referer"),
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const raw = value.trim();
    if (!raw) continue;
    if (raw.startsWith("/")) {
      return raw.split("?")[0];
    }
    try {
      return new URL(raw).pathname;
    } catch {
      continue;
    }
  }
  return "";
}

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function workspaceTitle(pathname: string, lang: "BILINGUAL" | "ZH" | "EN") {
  if (matchesPath(pathname, "/admin/todos")) return t(lang, "Today Workbench", "今日工作台");
  if (matchesPath(pathname, "/admin/alerts")) return t(lang, "Risk & Alerts", "风险与告警");
  if (matchesPath(pathname, "/admin/schedule")) return t(lang, "Schedule Operations", "排课操作区");
  if (matchesPath(pathname, "/admin/reports/teacher-payroll")) return t(lang, "Payroll Review", "工资处理");
  if (matchesPath(pathname, "/admin/reports/partner-settlement")) return t(lang, "Partner Settlement", "合作方结算");
  if (matchesPath(pathname, "/admin/approvals")) return t(lang, "Approval Inbox", "审批提醒中心");
  if (matchesPath(pathname, "/admin/receipts-approvals/queue")) return t(lang, "Receipt Queue", "收据审批队列");
  if (matchesPath(pathname, "/admin/receipts-approvals/package")) return t(lang, "Package Finance Workspace", "课包财务工作区");
  if (matchesPath(pathname, "/admin/receipts-approvals/repairs")) return t(lang, "Proof Repair Desk", "凭证修复台");
  if (matchesPath(pathname, "/admin/receipts-approvals/history")) return t(lang, "Receipt History", "收据历史");
  if (matchesPath(pathname, "/admin/receipts-approvals")) return t(lang, "Receipt Workflow", "收据流程");
  if (matchesPath(pathname, "/admin/expense-claims")) return t(lang, "Expense Workflow", "报销流程");
  if (matchesPath(pathname, "/admin/finance/student-package-balances")) return t(lang, "Package Balance Reports", "课时包余额报表");
  if (matchesPath(pathname, "/admin/recovery/uploads")) return t(lang, "Attachment Health Desk", "附件异常工作台");
  return t(lang, "Admin Workspace", "管理工作台");
}

function workspaceHint(pathname: string, lang: "BILINGUAL" | "ZH" | "EN", isFinance: boolean) {
  if (isFinance) {
    return t(
      lang,
      "Keep queue work narrow: pick the next payable or blocked item, then clear the current row before scanning history.",
      "尽量缩窄财务处理视角：先处理下一条可付款或被阻塞的事项，再回头看历史。"
    );
  }
  if (matchesPath(pathname, "/admin/approvals")) {
    return t(
      lang,
      "Use this inbox as the single starting point for pending approvals, then jump into the matching workflow only after you pick the item.",
      "把这里当成统一审批起点，先选中项目，再跳进对应工作流。"
    );
  }
  if (matchesPath(pathname, "/admin/todos")) {
    return t(
      lang,
      "Start with today's attendance and overdue follow-ups, then open system checks only if something looks off.",
      "先处理今天点名和超时跟进，再在有异常时打开系统巡检。"
    );
  }
  if (matchesPath(pathname, "/admin/recovery/uploads")) {
    return t(
      lang,
      "Use this desk to spot missing files, then jump back into the right workflow without rebuilding context.",
      "先在这里定位缺失附件，再直接跳回对应工作流，不要重新拼上下文。"
    );
  }
  return t(
    lang,
    "Use the sidebar as a task map: today first, then active workflows, then setup and reports.",
    "把侧边栏当成任务地图来用：先看今天事项，再进流程页，最后再看配置和报表。"
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = await resolvePathnameFromHeaders();
  if (!pathname) {
    return <>{children}</>;
  }
  const isPublicAdminAuthPath =
    pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/logout";

  if (isPublicAdminAuthPath) {
    return <>{children}</>;
  }

  const user = await requireAdmin();
  const lang = await getLang();
  const showManagerConsole = await isManagerUser(user);
  const canSeeSharedDocs = showManagerConsole && user.role === "ADMIN";
  const isFinance = user.role === "FINANCE";
  const ledgerAlertRow = await prisma.appSetting.findUnique({
    where: { key: LEDGER_INTEGRITY_ALERT_KEY },
    select: { value: true },
  });
  const ledgerAlert = parseLedgerIntegrityAlertState(ledgerAlertRow?.value);
  const approvalInbox = await getApprovalInboxData(user.email, user.role);
  const approvalInboxLabel =
    approvalInbox.summary.total > 0
      ? `${t(lang, "Approval Inbox", "审批提醒")} (${approvalInbox.summary.total})`
      : t(lang, "Approval Inbox", "审批提醒");

  const financeAllowedPath =
    pathname === "/admin" ||
    pathname === "/admin/approvals" ||
    pathname === "/admin/finance/workbench" ||
    pathname === "/admin/finance/student-package-invoices" ||
    pathname === "/admin/finance/student-package-balances" ||
    pathname === "/admin/reports/teacher-payroll" ||
    pathname.startsWith("/admin/reports/teacher-payroll/") ||
    pathname.startsWith("/admin/reports/partner-settlement") ||
    pathname === "/admin/reports/audit-logs" ||
    pathname === "/admin/expense-claims" ||
    pathname.startsWith("/admin/receipts-approvals") ||
    pathname === "/admin/recovery/uploads" ||
    (pathname.startsWith("/admin/packages/") && pathname.endsWith("/billing"));

  if (isFinance && !financeAllowedPath) {
    redirect("/admin/reports/teacher-payroll");
  }

  const adminNavGroups = [
    {
      title: t(lang, "Today", "今天"),
      summary: t(lang, "Start with the next task that blocks operations.", "先处理会阻塞运营的下一件事。"),
      items: [
        {
          href: "/admin",
          label: t(lang, "Dashboard", "总览"),
          description: t(lang, "Open today's workbench and key shortcuts.", "打开今日工作台和关键快捷入口。"),
          tone: "accent" as const,
        },
        {
          href: "/admin/todos",
          label: t(lang, "Todo Center", "待办中心"),
          description: t(lang, "Attendance, follow-up, renewal, and repair queues.", "点名、跟进、续费和修复队列。"),
          tone: "warning" as const,
        },
        {
          href: "/admin/alerts",
          label: t(lang, "Sign-in Alerts", "签到警告"),
          description: t(lang, "Escalations and sign-in anomalies.", "签到异常和需要升级处理的事项。"),
          tone: "danger" as const,
        },
        {
          href: "/admin/schedule",
          label: t(lang, "Weekly Schedule", "周课表"),
          description: t(lang, "Open the live schedule and move quickly.", "打开当前课表并快速处理变更。"),
          tone: "neutral" as const,
        },
        {
          href: "/admin/reports/monthly-schedule",
          label: t(lang, "Monthly Schedule", "月课表总览"),
          description: t(lang, "Review the month view without leaving the day-first desk.", "在今天工作台附近直接查看整月课表。"),
          tone: "neutral" as const,
        },
      ],
    },
    {
      title: t(lang, "Core Workflows", "核心流程"),
      summary: t(lang, "Main student and teaching workflows.", "学生和教学的主流程入口。"),
      items: [
        { href: "/admin/students", label: t(lang, "Students", "学生"), tone: "accent" as const },
        { href: "/admin/enrollments", label: t(lang, "Enrollments", "报名"), tone: "success" as const },
        { href: "/admin/packages", label: t(lang, "Packages", "课时包"), tone: "success" as const },
        { href: "/admin/tickets", label: t(lang, "Ticket Center", "工单中心"), tone: "warning" as const },
        { href: "/admin/teachers", label: t(lang, "Teachers", "老师"), tone: "neutral" as const },
        { href: "/admin/classes", label: t(lang, "Classes", "班级"), tone: "neutral" as const },
        { href: "/admin/booking-links", label: t(lang, "Booking Links", "学生选课链接"), tone: "neutral" as const },
        { href: "/admin/feedbacks", label: t(lang, "Teacher Feedbacks", "老师课后反馈"), tone: "accent" as const },
        { href: "/admin/tickets/handover", label: t(lang, "Daily Handover", "每日交接"), tone: "warning" as const },
        { href: "/admin/tickets/sop", label: t(lang, "SOP One Pager", "SOP一页纸"), tone: "neutral" as const },
      ],
    },
    {
      title: t(lang, "Finance & Review", "财务与审核"),
      summary: t(lang, "Approval queues, settlement, and repair desks.", "审批队列、结算和修复工作台。"),
      items: [
        { href: "/admin/approvals", label: approvalInboxLabel, tone: "warning" as const },
        { href: "/admin/reports/teacher-payroll", label: t(lang, "Teacher Payroll", "老师工资单"), tone: "accent" as const },
        { href: "/admin/reports/partner-settlement", label: t(lang, "Partner Settlement", "合作方结算"), tone: "accent" as const },
        { href: "/admin/receipts-approvals/queue", label: t(lang, "Receipt Queue", "收据审批队列"), tone: "warning" as const },
        { href: "/admin/receipts-approvals/package", label: t(lang, "Package Workspace", "课包财务工作区"), tone: "success" as const },
        { href: "/admin/receipts-approvals/repairs", label: t(lang, "Proof Repair", "凭证修复"), tone: "warning" as const },
        { href: "/admin/receipts-approvals/history", label: t(lang, "Receipt History", "收据历史"), tone: "neutral" as const },
        { href: "/admin/expense-claims", label: t(lang, "Expense Claims", "报销审批"), tone: "warning" as const },
        { href: "/admin/recovery/uploads", label: t(lang, "Attachment Health", "附件异常总览"), tone: "warning" as const },
      ],
    },
    {
      title: t(lang, "Setup & Control", "配置与控制"),
      summary: t(lang, "Base data, system admin, and lower-frequency maintenance.", "基础数据、系统管理和低频维护入口。"),
      items: [
        { href: "/admin/campuses", label: t(lang, "Campuses", "校区"), tone: "neutral" as const },
        { href: "/admin/rooms", label: t(lang, "Rooms", "教室"), tone: "neutral" as const },
        { href: "/admin/courses", label: t(lang, "Courses", "课程"), tone: "neutral" as const },
        { href: "/admin/student-sources", label: t(lang, "Student Sources", "学生来源"), tone: "neutral" as const },
        { href: "/admin/student-types", label: t(lang, "Student Types", "学生类型"), tone: "neutral" as const },
        ...(showManagerConsole
          ? [{ href: "/admin/manager", label: t(lang, "Manager Console", "管理者驾驶舱"), tone: "accent" as const }]
          : []),
        ...(showManagerConsole
          ? [{ href: "/admin/manager/users", label: t(lang, "System User Admin", "系统使用者管理"), tone: "accent" as const }]
          : []),
        ...(canSeeSharedDocs
          ? [{ href: "/admin/shared-docs", label: t(lang, "Shared Docs", "共享文档库"), tone: "neutral" as const }]
          : []),
      ],
    },
    {
      title: t(lang, "Reports", "报表"),
      summary: t(lang, "Audit, archive, and context pages.", "审计、归档和辅助查看页。"),
      items: [
        { href: "/admin/reports/monthly-hours", label: t(lang, "Monthly Hours", "月度课时明细"), tone: "neutral" as const },
        { href: "/admin/reports/cancelled-sessions", label: t(lang, "Cancelled Sessions", "已取消课次"), tone: "neutral" as const },
        { href: "/admin/reports/package-sharing-audit", label: t(lang, "Package Sharing Audit", "共享课包审计"), tone: "neutral" as const },
        { href: "/admin/reports/midterm", label: t(lang, "Midterm Reports", "中期报告"), tone: "neutral" as const },
        { href: "/admin/reports/final", label: t(lang, "Final Reports", "结课报告"), tone: "neutral" as const },
        { href: "/admin/reports/undeducted-completed", label: t(lang, "Undeducted Completed", "已完成未减扣"), tone: "danger" as const },
      ],
    },
  ];

  const financeNavGroups = [
    {
      title: t(lang, "Today", "今天"),
      summary: t(lang, "Keep finance work focused on the current queue.", "把财务处理重心放在当前队列。"),
      items: [
        {
          href: "/admin",
          label: t(lang, "Finance Dashboard", "财务首页"),
          description: t(lang, "Open today's finance overview.", "打开今日财务总览。"),
          tone: "accent" as const,
        },
        {
          href: "/admin/finance/workbench",
          label: t(lang, "Finance Workbench", "财务工作台"),
          description: t(lang, "Track parent and partner billing exceptions.", "跟进家长和合作方账单异常。"),
          tone: "warning" as const,
        },
      ],
    },
    {
      title: t(lang, "Approval Queues", "审核队列"),
      summary: t(lang, "Process one approval stream at a time.", "一次处理一条审批流。"),
      items: [
        { href: "/admin/approvals", label: approvalInboxLabel, tone: "warning" as const },
        { href: "/admin/reports/teacher-payroll", label: t(lang, "Teacher Payroll", "老师工资单"), tone: "accent" as const },
        { href: "/admin/reports/partner-settlement", label: t(lang, "Partner Settlement", "合作方结算"), tone: "accent" as const },
        { href: "/admin/receipts-approvals/queue", label: t(lang, "Receipt Queue", "收据审批队列"), tone: "warning" as const },
        { href: "/admin/receipts-approvals/package", label: t(lang, "Package Workspace", "课包财务工作区"), tone: "success" as const },
        { href: "/admin/receipts-approvals/repairs", label: t(lang, "Proof Repair", "凭证修复"), tone: "warning" as const },
        { href: "/admin/receipts-approvals/history", label: t(lang, "Receipt History", "收据历史"), tone: "neutral" as const },
        { href: "/admin/expense-claims", label: t(lang, "Expense Claims", "报销审批"), tone: "warning" as const },
      ],
    },
    {
      title: t(lang, "Billing & Audit", "账单与审计"),
      summary: t(lang, "Invoice work and finance-only reference pages.", "发票处理和财务参考页。"),
      items: [
        { href: "/admin/finance/student-package-invoices", label: t(lang, "Student Package Invoices", "学生课时包发票"), tone: "success" as const },
        { href: "/admin/finance/student-package-balances", label: t(lang, "Student Package Balances", "学生课时包余额报表"), tone: "success" as const },
        { href: "/admin/reports/audit-logs", label: t(lang, "Audit Logs", "审计日志"), tone: "neutral" as const },
      ],
    },
  ];

  const sidebarNavContent = (
    <>
      <div
        style={{
          ...workbenchHeroStyle("indigo"),
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#312e81" }}>
            {isFinance ? t(lang, "Finance Workspace", "财务工作台") : t(lang, "Admin Workspace", "管理工作台")}
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "#475569" }}>{workspaceHint(pathname, lang, isFinance)}</div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              fontSize: 11,
              fontWeight: 700,
              color: "#334155",
            }}
          >
            {workspaceTitle(pathname, lang)}
          </span>
          {ledgerAlert && ledgerAlert.totalIssueCount > 0 ? (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: "#fff1f2",
                border: "1px solid #fda4af",
                fontSize: 11,
                fontWeight: 700,
                color: "#9f1239",
              }}
            >
              {t(lang, "Ledger alert active", "对账告警中")}
            </span>
          ) : null}
        </div>
      </div>

      <AdminSidebarNavClient groups={isFinance ? financeNavGroups : adminNavGroups} />

      <div
        style={{
          ...workbenchFilterPanelStyle,
          marginTop: 14,
          padding: 12,
          background: "#ffffff",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{t(lang, "Quick Tools", "快捷工具")}</div>
        <div style={{ display: "grid", gap: 8 }}>
          <Link
            scroll={false}
            href="/"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              textAlign: "center",
              textDecoration: "none",
              background: "#f8fafc",
              border: "1px solid #dbeafe",
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            {t(lang, "Back Home", "返回首页")}
          </Link>
          <a
            href="/admin/logout"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              textAlign: "center",
              textDecoration: "none",
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              fontWeight: 700,
            }}
          >
            {t(lang, "Logout", "退出登录")}
          </a>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ fontFamily: "system-ui", margin: 0, fontSize: 12.5 }}>
      <div className="app-shell">
        <aside className="app-sidebar">
          <div
            style={{
              ...workbenchFilterPanelStyle,
              padding: 12,
              background: "#ffffff",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
              {isFinance ? t(lang, "Finance", "财务") : t(lang, "Admin", "管理后台")}
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>Tuition Scheduler</div>
          </div>

          <div className="app-nav-desktop">{sidebarNavContent}</div>
          <details className="app-nav-mobile">
            <summary>{t(lang, "Menu", "菜单")}</summary>
            <div style={{ marginTop: 10 }}>{sidebarNavContent}</div>
          </details>
        </aside>

        <main className="app-main">
          <WorkbenchStickyGuardClient />
          <div
            className="app-main-head"
            style={{
              ...workbenchHeroStyle("indigo"),
              padding: 14,
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{workspaceTitle(pathname, lang)}</div>
              <div style={{ color: "#64748b", lineHeight: 1.45 }}>{workspaceHint(pathname, lang, isFinance)}</div>
              <div style={{ color: "#475569", fontSize: 12 }}>
                {t(lang, "Logged in", "已登录")}: <b>{user.name}</b> ({user.email})
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <LanguageSelectorClient initialLang={user.language} />
              <a href="/admin/logout">{t(lang, "Logout", "退出登录")}</a>
            </div>
          </div>

          {ledgerAlert && ledgerAlert.totalIssueCount > 0 ? (
            <div
              style={{
                ...workbenchMetricCardStyle("rose"),
                margin: "0 0 14px",
                background: "linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)",
                color: "#881337",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>
                {t(lang, "Ledger Integrity Alert", "课包对账告警")}:
                {" "}
                {ledgerAlert.totalIssueCount}
                {" "}
                {t(lang, "issues detected", "条异常")}
              </div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {t(lang, "Mismatch", "流水不匹配")}: {ledgerAlert.mismatchCount} ·{" "}
                {t(lang, "No package binding", "无课包绑定扣减")}: {ledgerAlert.noPackageDeductCount} ·{" "}
                {t(lang, "Updated", "更新时间")}: {formatBusinessDateTime(new Date(ledgerAlert.generatedAt))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link scroll={false} href="/admin/todos">
                  {t(lang, "Open Todo Center", "打开待办中心")}
                </Link>
                <Link scroll={false} href="/admin/reports/undeducted-completed">
                  {t(lang, "Open Repair Report", "打开减扣修复报表")}
                </Link>
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

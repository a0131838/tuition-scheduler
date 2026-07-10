import { isManagerUser, requireAdminAreaUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { parseLedgerIntegrityAlertState, LEDGER_INTEGRITY_ALERT_KEY } from "@/lib/ledger-integrity-alert";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { prisma } from "@/lib/prisma";
import { isResourceOnlyRole } from "@/lib/staff-roles";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatBusinessDateTime } from "@/lib/date-only";
import LanguageSelectorClient from "./_components/LanguageSelectorClient";
import AdminSidebarNavClient from "./AdminSidebarNavClient";
import SidebarScrollMemoryClient from "./_components/SidebarScrollMemoryClient";
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
  if (matchesPath(pathname, "/admin/mobile")) return t(lang, "Mobile Workbench", "员工移动端");
  if (matchesPath(pathname, "/admin/alerts")) return t(lang, "Risk & Alerts", "风险与告警");
  if (matchesPath(pathname, "/admin/schedule")) return t(lang, "Schedule Operations", "排课操作区");
  if (matchesPath(pathname, "/admin/leads")) return t(lang, "Resource Follow-up", "资源跟进");
  if (matchesPath(pathname, "/admin/school-applications")) return t(lang, "School Applications", "学校申请服务");
  if (matchesPath(pathname, "/admin/reports/teacher-payroll")) return t(lang, "Payroll Review", "工资处理");
  if (matchesPath(pathname, "/admin/reports/partner-settlement")) return t(lang, "Partner Settlement", "合作方结算");
  if (matchesPath(pathname, "/admin/approvals")) return t(lang, "Approval Inbox", "审批提醒中心");
  if (matchesPath(pathname, "/admin/miniapp-notifications")) return t(lang, "Miniapp Notifications", "小程序通知队列");
  if (matchesPath(pathname, "/admin/receipts-approvals/queue")) return t(lang, "Receipt Queue", "收据审批队列");
  if (matchesPath(pathname, "/admin/receipts-approvals/package")) return t(lang, "Package Finance Workspace", "课包财务工作区");
  if (matchesPath(pathname, "/admin/receipts-approvals/repairs")) return t(lang, "Proof Repair Desk", "凭证修复台");
  if (matchesPath(pathname, "/admin/receipts-approvals/history")) return t(lang, "Receipt History", "收据历史");
  if (matchesPath(pathname, "/admin/receipts-approvals")) return t(lang, "Receipt Workflow", "收据流程");
  if (matchesPath(pathname, "/admin/expense-claims")) return t(lang, "Expense Workflow", "报销流程");
  if (matchesPath(pathname, "/admin/teacher-notices")) return t(lang, "Teacher Notices", "老师通知管理");
  if (matchesPath(pathname, "/admin/edutrust/students")) return t(lang, "EduTrust Student Evidence", "EduTrust 学生证据");
  if (matchesPath(pathname, "/admin/edutrust")) return t(lang, "EduTrust Readiness", "EduTrust 合规整改");
  if (matchesPath(pathname, "/admin/finance/student-package-utilization")) return t(lang, "Student Package Utilization", "学生课包使用提取");
  if (matchesPath(pathname, "/admin/finance/individual-student-utility")) return t(lang, "Individual Student Utility", "个人学生课时使用");
  if (matchesPath(pathname, "/admin/finance/tutor-cost-export")) return t(lang, "Tutor Cost Export", "老师成本导出");
  if (matchesPath(pathname, "/admin/finance/student-package-balances")) return t(lang, "Package Balance Reports", "课时包余额报表");
  if (matchesPath(pathname, "/admin/finance/transport-billing")) return t(lang, "Transport Billing", "交通费月结");
  if (matchesPath(pathname, "/admin/finance/business-accounts")) return t(lang, "Business Accounts", "企业账户");
  if (matchesPath(pathname, "/admin/manager/quality")) return t(lang, "Manager Quality Desk", "管理者质量工作台");
  if (matchesPath(pathname, "/admin/reports/package-balance-audit")) return t(lang, "Package Balance Audit", "课包余额复核");
  if (matchesPath(pathname, "/admin/recovery/uploads")) return t(lang, "Attachment Health Desk", "附件异常工作台");
  return t(lang, "Admin Workspace", "管理工作台");
}

function workspaceHint(pathname: string, lang: "BILINGUAL" | "ZH" | "EN", isFinance: boolean, isResourceOnly: boolean) {
  if (isFinance) {
    return t(
      lang,
      "Keep queue work narrow: pick the next payable or blocked item, then clear the current row before scanning history.",
      "尽量缩窄财务处理视角：先处理下一条可付款或被阻塞的事项，再回头看历史。"
    );
  }
  if (isResourceOnly) {
    return t(
      lang,
      "Keep the workspace narrow: create resources, follow up, request assessments, and hand off to admin when conversion is ready.",
      "保持工作台聚焦：录入资源、持续跟进、派发评估；需要转学生时交给管理处理。"
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
  if (matchesPath(pathname, "/admin/mobile")) {
    return t(
      lang,
      "Use this compact view for mobile-first parent request handling and daily operations.",
      "用这个紧凑视图在手机上处理家长请求和日常运营。"
    );
  }
  if (matchesPath(pathname, "/admin/miniapp-notifications")) {
    return t(
      lang,
      "Review queued miniapp subscription messages before the WeChat sender is enabled.",
      "在微信订阅消息发送器启用前，先在这里检查小程序待发送提醒。"
    );
  }
  if (matchesPath(pathname, "/admin/miniapp-staff")) {
    return t(
      lang,
      "Generate staff miniapp binding codes and check which employees have connected WeChat.",
      "生成员工小程序绑定码，并检查哪些员工已经绑定微信。"
    );
  }
  if (matchesPath(pathname, "/admin/recovery/uploads")) {
    return t(
      lang,
      "Use this desk to spot missing files, then jump back into the right workflow without rebuilding context.",
      "先在这里定位缺失附件，再直接跳回对应工作流，不要重新拼上下文。"
    );
  }
  if (matchesPath(pathname, "/admin/edutrust/students")) {
    return t(
      lang,
      "Track delivery evidence, PEI contract readiness, and C7 outcomes without changing scheduling or billing.",
      "记录课程交付证据、PEI 合同准备度和 C7 成果，不改变排课或财务。"
    );
  }
  if (matchesPath(pathname, "/admin/edutrust")) {
    return t(
      lang,
      "Keep operations stable while mapping current courses into EduTrust-ready course files and evidence.",
      "保持现有运营稳定，同时把当前课程映射成 EduTrust 所需的课程文件和证据。"
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

  const user = await requireAdminAreaUser();
  const lang = await getLang();
  const showManagerConsole = await isManagerUser(user);
  const canSeeSharedDocs = showManagerConsole && user.role === "ADMIN";
  const isFinance = user.role === "FINANCE";
  const isResourceOnly = isResourceOnlyRole(user.role);
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
    pathname === "/admin/finance/student-package-utilization" ||
    pathname === "/admin/finance/individual-student-utility" ||
    pathname === "/admin/finance/tutor-cost-export" ||
    pathname === "/admin/finance/documents" ||
    pathname === "/admin/finance/deleted-invoices" ||
    pathname === "/admin/finance/student-package-invoices" ||
    pathname === "/admin/finance/student-package-balances" ||
    pathname === "/admin/finance/transport-billing" ||
    pathname === "/admin/finance/business-accounts" ||
    pathname === "/admin/reports/teacher-payroll" ||
    pathname.startsWith("/admin/reports/teacher-payroll/") ||
    pathname.startsWith("/admin/reports/partner-settlement") ||
    pathname === "/admin/reports/audit-logs" ||
    pathname === "/admin/reports/package-balance-audit" ||
    pathname === "/admin/expense-claims" ||
    pathname === "/admin/teacher-notices" ||
    pathname.startsWith("/admin/receipts-approvals") ||
    pathname === "/admin/recovery/uploads" ||
    (pathname.startsWith("/admin/packages/") && pathname.endsWith("/billing"));

  if (isFinance && !financeAllowedPath) {
    redirect("/admin/reports/teacher-payroll");
  }

  const resourceAllowedPath =
    pathname === "/admin" ||
    pathname === "/admin/leads" ||
    pathname === "/admin/leads/new" ||
    pathname === "/admin/leads/dashboard" ||
    pathname === "/admin/leads/export" ||
    (pathname.startsWith("/admin/leads/") && !pathname.startsWith("/admin/leads/owners"));

  if (isResourceOnly && !resourceAllowedPath) {
    redirect("/admin/leads");
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
          href: "/admin/teacher-notices",
          label: t(lang, "Teacher Notices", "老师通知"),
          description: t(lang, "Publish and track teacher announcements.", "发布并追踪老师通知。"),
          tone: "accent" as const,
        },
        {
          href: "/admin/todos",
          label: t(lang, "Todo Center", "待办中心"),
          description: t(lang, "Attendance, follow-up, renewal, and repair queues.", "点名、跟进、续费和修复队列。"),
          tone: "warning" as const,
        },
        {
          href: "/admin/mobile",
          label: t(lang, "Mobile Workbench", "员工移动端"),
          description: t(lang, "Compact phone-first operations entry.", "手机优先的紧凑运营入口。"),
          tone: "accent" as const,
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
        ...(showManagerConsole
          ? [
              {
                href: "/admin/manager/quality",
                label: t(lang, "Manager Quality Desk", "管理者质量工作台"),
                description: t(lang, "Print Lead Desk and complete the daily manager reflection.", "打印 Lead Desk，并完成每日管理复盘。"),
                tone: "accent" as const,
              },
            ]
          : []),
      ],
    },
    ...(user.workspaces.length > 0
      ? [
          {
            title: t(lang, "Extra Workspaces", "兼职工作台"),
            summary: t(lang, "Use a focused view without changing admin permissions.", "用精简视角处理兼职工作，不改变管理员权限。"),
            items: [
              ...(user.workspaces.includes("CS")
                ? [
                    {
                      href: "/admin?workspace=cs",
                      label: t(lang, "CS Workspace", "客服工作台"),
                      description: t(lang, "Focused resource intake and follow-up view.", "聚焦资源录入和客服跟进。"),
                      tone: "accent" as const,
                    },
                  ]
                : []),
              ...(user.workspaces.includes("SALES")
                ? [
                    {
                      href: "/admin?workspace=sales",
                      label: t(lang, "Sales Workspace", "销售工作台"),
                      description: t(lang, "Focused sales resource pipeline view.", "聚焦销售资源管道。"),
                      tone: "success" as const,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    {
      title: t(lang, "Core Workflows", "核心流程"),
      summary: t(lang, "Main student and teaching workflows.", "学生和教学的主流程入口。"),
      items: [
        { href: "/admin/students", label: t(lang, "Students", "学生"), tone: "accent" as const },
        { href: "/admin/leads", label: t(lang, "Resource Follow-up", "资源跟进"), tone: "accent" as const },
        { href: "/admin/school-applications", label: t(lang, "School Applications", "学校申请服务"), tone: "accent" as const },
        { href: "/admin/enrollments", label: t(lang, "Enrollments", "报名"), tone: "success" as const },
        { href: "/admin/packages", label: t(lang, "Packages", "课时包"), tone: "success" as const },
        { href: "/admin/tickets", label: t(lang, "Ticket Center", "工单中心"), tone: "warning" as const },
        { href: "/admin/teachers", label: t(lang, "Teachers", "老师"), tone: "neutral" as const },
        { href: "/admin/classes", label: t(lang, "Classes", "班级"), tone: "neutral" as const },
        { href: "/admin/booking-links", label: t(lang, "Booking Links", "学生选课链接"), tone: "neutral" as const },
        { href: "/admin/feedbacks", label: t(lang, "Teacher Feedbacks", "老师课后反馈"), tone: "accent" as const },
        { href: "/admin/miniapp-staff", label: t(lang, "Miniapp Staff", "员工小程序"), tone: "accent" as const },
        { href: "/admin/miniapp-notifications", label: t(lang, "Miniapp Notifications", "小程序通知"), tone: "accent" as const },
        { href: "/admin/tickets/handover", label: t(lang, "Daily Handover", "每日交接"), tone: "warning" as const },
        { href: "/admin/tickets/sop", label: t(lang, "SOP One Pager", "SOP一页纸"), tone: "neutral" as const },
      ],
    },
    {
      title: t(lang, "Finance & Review", "财务与审核"),
      summary: t(lang, "Approval queues, settlement, and repair desks.", "审批队列、结算和修复工作台。"),
      items: [
        { href: "/admin/approvals", label: approvalInboxLabel, tone: "warning" as const },
        { href: "/admin/finance/workbench", label: t(lang, "Finance Workbench", "财务工作台"), tone: "warning" as const },
        { href: "/admin/finance/transport-billing", label: t(lang, "Transport Billing", "交通费月结"), tone: "warning" as const },
        { href: "/admin/finance/business-accounts", label: t(lang, "Business Accounts", "企业账户"), tone: "accent" as const },
        { href: "/admin/finance/documents", label: t(lang, "Invoices & Receipts", "完整发票与收据"), tone: "success" as const },
        { href: "/admin/reports/teacher-payroll", label: t(lang, "Teacher Payroll", "老师工资单"), tone: "accent" as const },
        { href: "/admin/finance/student-package-utilization", label: t(lang, "Student Package Utilization", "学生课包使用提取"), tone: "success" as const },
        { href: "/admin/finance/individual-student-utility", label: t(lang, "Individual Student Utility", "个人学生课时使用"), tone: "success" as const },
        { href: "/admin/finance/tutor-cost-export", label: t(lang, "Tutor Cost Export", "老师成本导出"), tone: "success" as const },
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
        { href: "/admin/edutrust", label: t(lang, "EduTrust Readiness", "EduTrust 合规整改"), tone: "accent" as const },
        { href: "/admin/edutrust/students", label: t(lang, "EduTrust Student Evidence", "EduTrust 学生证据"), tone: "accent" as const },
        { href: "/admin/partners", label: t(lang, "Partners", "合作方配置"), tone: "accent" as const },
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
        { href: "/admin/reports/academic-management", label: t(lang, "Academic Management", "学业管理月报"), tone: "accent" as const },
        { href: "/admin/reports/cancelled-sessions", label: t(lang, "Cancelled Sessions", "已取消课次"), tone: "neutral" as const },
        { href: "/admin/reports/package-sharing-audit", label: t(lang, "Package Sharing Audit", "共享课包审计"), tone: "neutral" as const },
        { href: "/admin/reports/package-balance-audit", label: t(lang, "Package Balance Audit", "课包余额复核"), tone: "danger" as const },
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
          href: "/admin/teacher-notices",
          label: t(lang, "Teacher Notices", "老师通知"),
          description: t(lang, "Publish and track teacher announcements.", "发布并追踪老师通知。"),
          tone: "accent" as const,
        },
        {
          href: "/admin/finance/workbench",
          label: t(lang, "Finance Workbench", "财务工作台"),
          description: t(lang, "Track parent and partner billing exceptions.", "跟进家长和合作方账单异常。"),
          tone: "warning" as const,
        },
        {
          href: "/admin/finance/tutor-cost-export",
          label: t(lang, "Tutor Cost Export", "老师成本导出"),
          description: t(lang, "Download completed tutor cost from the 15th to month-end.", "下载 15 号到月底已完成老师成本。"),
          tone: "success" as const,
        },
        {
          href: "/admin/finance/individual-student-utility",
          label: t(lang, "Individual Student Utility", "个人学生课时使用"),
          description: t(lang, "Download weekly or monthly usage for individual students.", "下载个人学生每周或每月课时使用。"),
          tone: "success" as const,
        },
        {
          href: "/admin/finance/student-package-utilization",
          label: t(lang, "Student Package Utilization", "学生课包使用提取"),
          description: t(lang, "Split one student's usage from a shared package.", "从共享课包中拆出单个学生使用量。"),
          tone: "success" as const,
        },
        {
          href: "/admin/finance/documents",
          label: t(lang, "Invoices & Receipts", "完整发票与收据"),
          description: t(lang, "Open the cross-workspace document center.", "打开跨工作台的单据总览。"),
          tone: "success" as const,
        },
        {
          href: "/admin/finance/deleted-invoices",
          label: t(lang, "Deleted Draft History", "已删除草稿历史"),
          description: t(lang, "Review deleted draft invoice numbers and who removed them.", "查看已删除草稿号及删除人。"),
          tone: "neutral" as const,
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
        { href: "/admin/finance/documents", label: t(lang, "Invoices & Receipts", "完整发票与收据"), tone: "success" as const },
        { href: "/admin/finance/deleted-invoices", label: t(lang, "Deleted Draft History", "已删除草稿历史"), tone: "neutral" as const },
        { href: "/admin/finance/student-package-invoices", label: t(lang, "Student Package Invoices", "学生课时包发票"), tone: "success" as const },
        { href: "/admin/finance/business-accounts", label: t(lang, "Business Accounts", "企业账户"), tone: "accent" as const },
        { href: "/admin/finance/transport-billing", label: t(lang, "Transport Billing", "交通费月结"), tone: "warning" as const },
        { href: "/admin/finance/student-package-balances", label: t(lang, "Student Package Balances", "学生课时包余额报表"), tone: "success" as const },
        { href: "/admin/finance/student-package-utilization", label: t(lang, "Student Package Utilization", "学生课包使用提取"), tone: "success" as const },
        { href: "/admin/reports/package-balance-audit", label: t(lang, "Package Balance Audit", "课包余额复核"), tone: "warning" as const },
        { href: "/admin/finance/individual-student-utility", label: t(lang, "Individual Student Utility", "个人学生课时使用"), tone: "success" as const },
        { href: "/admin/finance/tutor-cost-export", label: t(lang, "Tutor Cost Export", "老师成本导出"), tone: "success" as const },
        { href: "/admin/reports/audit-logs", label: t(lang, "Audit Logs", "审计日志"), tone: "neutral" as const },
      ],
    },
  ];

  const resourceNavGroups = [
    {
      title: user.role === "CS" ? t(lang, "CS Queue", "客服队列") : t(lang, "Sales Queue", "销售队列"),
      summary: t(lang, "Resource follow-up only.", "只处理资源跟进相关工作。"),
      items: [
        {
          href: "/admin",
          label: user.role === "CS" ? t(lang, "CS Dashboard", "客服首页") : t(lang, "Sales Dashboard", "销售首页"),
          description: t(lang, "Open the resource workspace shortcuts.", "打开资源工作台快捷入口。"),
          tone: "accent" as const,
        },
        {
          href: "/admin/leads",
          label: t(lang, "Resource Follow-up", "资源跟进"),
          description: t(lang, "Track inquiries, follow-ups, assessments, and outcomes.", "跟进咨询、评估和结果。"),
          tone: "accent" as const,
        },
        {
          href: "/admin/leads/new",
          label: t(lang, "New Resource", "新增资源"),
          description: t(lang, "Create a parent inquiry as soon as it arrives.", "家长咨询后立即录入。"),
          tone: "success" as const,
        },
        {
          href: "/admin/leads/dashboard",
          label: t(lang, "Resource Dashboard", "资源看板"),
          description: t(lang, "Review pipeline health and completion rates.", "查看资源管道和完成情况。"),
          tone: "neutral" as const,
        },
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
            {isFinance
              ? t(lang, "Finance Workspace", "财务工作台")
              : isResourceOnly
                ? user.role === "CS"
                  ? t(lang, "CS Workspace", "客服工作台")
                  : t(lang, "Sales Workspace", "销售工作台")
                : t(lang, "Admin Workspace", "管理工作台")}
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "#475569" }}>{workspaceHint(pathname, lang, isFinance, isResourceOnly)}</div>
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

      <AdminSidebarNavClient groups={isFinance ? financeNavGroups : isResourceOnly ? resourceNavGroups : adminNavGroups} />

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
        <SidebarScrollMemoryClient />
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
              {isFinance
                ? t(lang, "Finance", "财务")
                : isResourceOnly
                  ? user.role === "CS"
                    ? t(lang, "CS", "客服")
                    : t(lang, "Sales", "销售")
                  : t(lang, "Admin", "管理后台")}
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
              <div style={{ color: "#64748b", lineHeight: 1.45 }}>{workspaceHint(pathname, lang, isFinance, isResourceOnly)}</div>
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

export type WorkspaceLang = "BILINGUAL" | "ZH" | "EN";

function translate(lang: WorkspaceLang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function workspaceTitleForPath(pathname: string, lang: WorkspaceLang) {
  if (matchesPath(pathname, "/admin/todos")) return translate(lang, "Today Workbench", "今日工作台");
  if (matchesPath(pathname, "/admin/mobile")) return translate(lang, "Mobile Workbench", "员工移动端");
  if (matchesPath(pathname, "/admin/alerts")) return translate(lang, "Risk & Alerts", "风险与告警");
  if (matchesPath(pathname, "/admin/schedule")) return translate(lang, "Schedule Operations", "排课操作区");
  if (matchesPath(pathname, "/admin/leads")) return translate(lang, "Resource Follow-up", "资源跟进");
  if (matchesPath(pathname, "/admin/school-applications")) return translate(lang, "School Applications", "学校申请服务");
  if (matchesPath(pathname, "/admin/care")) return translate(lang, "Full Care", "全托管");
  if (matchesPath(pathname, "/admin/reports/teacher-payroll")) return translate(lang, "Payroll Review", "工资处理");
  if (matchesPath(pathname, "/admin/reports/partner-settlement")) return translate(lang, "Partner Settlement", "合作方结算");
  if (matchesPath(pathname, "/admin/approvals")) return translate(lang, "Approval Inbox", "审批提醒中心");
  if (matchesPath(pathname, "/admin/miniapp-notifications")) return translate(lang, "Miniapp Notifications", "小程序通知队列");
  if (matchesPath(pathname, "/admin/receipts-approvals/queue")) return translate(lang, "Receipt Queue", "收据审批队列");
  if (matchesPath(pathname, "/admin/receipts-approvals/package")) return translate(lang, "Package Finance Workspace", "课包财务工作区");
  if (matchesPath(pathname, "/admin/receipts-approvals/repairs")) return translate(lang, "Proof Repair Desk", "凭证修复台");
  if (matchesPath(pathname, "/admin/receipts-approvals/history")) return translate(lang, "Receipt History", "收据历史");
  if (matchesPath(pathname, "/admin/receipts-approvals")) return translate(lang, "Receipt Workflow", "收据流程");
  if (matchesPath(pathname, "/admin/expense-claims")) return translate(lang, "Expense Workflow", "报销流程");
  if (matchesPath(pathname, "/admin/teacher-notices")) return translate(lang, "Teacher Notices", "老师通知管理");
  if (matchesPath(pathname, "/admin/edutrust/students")) return translate(lang, "EduTrust Student Evidence", "EduTrust 学生证据");
  if (matchesPath(pathname, "/admin/edutrust")) return translate(lang, "EduTrust Readiness", "EduTrust 合规整改");
  if (matchesPath(pathname, "/admin/finance/student-package-utilization")) return translate(lang, "Student Package Utilization", "学生课包使用提取");
  if (matchesPath(pathname, "/admin/finance/individual-student-utility")) return translate(lang, "Individual Student Utility", "个人学生课时使用");
  if (matchesPath(pathname, "/admin/finance/tutor-cost-export")) return translate(lang, "Tutor Cost Export", "老师成本导出");
  if (matchesPath(pathname, "/admin/finance/student-package-balances")) return translate(lang, "Package Balance Reports", "课时包余额报表");
  if (matchesPath(pathname, "/admin/finance/transport-billing")) return translate(lang, "Transport Billing", "交通费月结");
  if (matchesPath(pathname, "/admin/finance/business-accounts")) return translate(lang, "Business Accounts", "企业账户");
  if (matchesPath(pathname, "/admin/manager/quality")) return translate(lang, "Manager Quality Desk", "管理者质量工作台");
  if (matchesPath(pathname, "/admin/reports/package-balance-audit")) return translate(lang, "Package Balance Audit", "课包余额复核");
  if (matchesPath(pathname, "/admin/recovery/uploads")) return translate(lang, "Attachment Health Desk", "附件异常工作台");
  return translate(lang, "Admin Workspace", "管理工作台");
}

export function workspaceHintForPath(
  pathname: string,
  lang: WorkspaceLang,
  isFinance: boolean,
  isResourceOnly: boolean
) {
  if (isFinance) {
    return translate(
      lang,
      "Keep queue work narrow: pick the next payable or blocked item, then clear the current row before scanning history.",
      "尽量缩窄财务处理视角：先处理下一条可付款或被阻塞的事项，再回头看历史。"
    );
  }
  if (isResourceOnly) {
    return translate(
      lang,
      "Keep the workspace narrow: create resources, follow up, request assessments, and hand off to admin when conversion is ready.",
      "保持工作台聚焦：录入资源、持续跟进、派发评估；需要转学生时交给管理处理。"
    );
  }
  if (matchesPath(pathname, "/admin/approvals")) {
    return translate(
      lang,
      "Use this inbox as the single starting point for pending approvals, then jump into the matching workflow only after you pick the item.",
      "把这里当成统一审批起点，先选中项目，再跳进对应工作流。"
    );
  }
  if (matchesPath(pathname, "/admin/todos")) {
    return translate(
      lang,
      "Start with today's attendance and overdue follow-ups, then open system checks only if something looks off.",
      "先处理今天点名和超时跟进，再在有异常时打开系统巡检。"
    );
  }
  if (matchesPath(pathname, "/admin/mobile")) {
    return translate(
      lang,
      "Use this compact view for mobile-first parent request handling and daily operations.",
      "用这个紧凑视图在手机上处理家长请求和日常运营。"
    );
  }
  if (matchesPath(pathname, "/admin/miniapp-notifications")) {
    return translate(
      lang,
      "Review queued miniapp subscription messages before the WeChat sender is enabled.",
      "在微信订阅消息发送器启用前，先在这里检查小程序待发送提醒。"
    );
  }
  if (matchesPath(pathname, "/admin/miniapp-staff")) {
    return translate(
      lang,
      "Generate staff miniapp binding codes and check which employees have connected WeChat.",
      "生成员工小程序绑定码，并检查哪些员工已经绑定微信。"
    );
  }
  if (matchesPath(pathname, "/admin/recovery/uploads")) {
    return translate(
      lang,
      "Use this desk to spot missing files, then jump back into the right workflow without rebuilding context.",
      "先在这里定位缺失附件，再直接跳回对应工作流，不要重新拼上下文。"
    );
  }
  if (matchesPath(pathname, "/admin/edutrust/students")) {
    return translate(
      lang,
      "Track delivery evidence, PEI contract readiness, and C7 outcomes without changing scheduling or billing.",
      "记录课程交付证据、PEI 合同准备度和 C7 成果，不改变排课或财务。"
    );
  }
  if (matchesPath(pathname, "/admin/edutrust")) {
    return translate(
      lang,
      "Keep operations stable while mapping current courses into EduTrust-ready course files and evidence.",
      "保持现有运营稳定，同时把当前课程映射成 EduTrust 所需的课程文件和证据。"
    );
  }
  if (matchesPath(pathname, "/admin/care")) {
    return translate(
      lang,
      "Manage service scope, evidence, actions and ownership without changing lessons or billing.",
      "管理服务范围、跟进证据、下一步和负责人，不改变课时与财务。"
    );
  }
  return translate(
    lang,
    "Use the sidebar as a task map: today first, then active workflows, then setup and reports.",
    "把侧边栏当成任务地图来用：先看今天事项，再进流程页，最后再看配置和报表。"
  );
}

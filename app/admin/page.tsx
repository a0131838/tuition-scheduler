import { getCurrentUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { workbenchHeroStyle } from "./_components/workbenchStyles";

export default async function AdminHome() {
  const lang = await getLang();
  const user = await getCurrentUser();
  const isFinance = user?.role === "FINANCE";
  const approvalInbox = await getApprovalInboxData(user?.email, user?.role);
  const cardStyle = {
    padding: "16px 18px",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  } as const;
  const tileStyle = {
    display: "grid",
    gap: 6,
    padding: "14px 16px",
    borderRadius: 14,
    textDecoration: "none",
    color: "#0f172a",
    border: "1px solid #dbeafe",
    background: "#f8fafc",
  } as const;
  const compactMetricStyle = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  } as const;

  if (isFinance) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <section
          style={{
            ...workbenchHeroStyle("amber"),
            marginBottom: 0,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412", letterSpacing: 0.4 }}>
            {t(lang, "Today First", "今天先处理")}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>
            {t(lang, "Finance workbench", "财务工作台")}
          </div>
          <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.45, maxWidth: 760 }}>
            {t(
              lang,
              "Open the next blocked approval first, then use the lower links only when you need deeper finance follow-up.",
              "先打开下一条被阻塞的审批；只有需要更深的财务跟进时，再进入下方次级入口。"
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div style={compactMetricStyle}>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Approvals", "待审批")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{approvalInbox.summary.total}</div>
            </div>
            <div style={compactMetricStyle}>
              <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Overdue", "超时")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#92400e" }}>{approvalInbox.summary.overdue}</div>
            </div>
            <div style={compactMetricStyle}>
              <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Finance lane", "财务审批")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#9a3412" }}>{approvalInbox.summary.finance}</div>
            </div>
          </div>
        </section>

      <section style={{ ...cardStyle, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
              {t(lang, "Immediate queues", "优先队列")}
            </div>
            <a href="/admin/approvals" style={{ fontWeight: 800, color: "#1d4ed8" }}>
              {t(lang, "Open approval inbox", "打开审批提醒中心")}
            </a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
            <a href="/admin/approvals?focus=finance" style={{ ...tileStyle, background: "#fff7ed", borderColor: "#fdba74" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Finance approvals", "财务审批")}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#9a3412" }}>{approvalInbox.summary.finance}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Direct entry into items waiting on finance.", "直接进入当前等待财务处理的项目。")}</div>
            </a>
            <a href="/admin/finance/workbench" style={{ ...tileStyle, background: "#eff6ff", borderColor: "#93c5fd" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Finance Workbench", "财务工作台")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Parent and partner billing exceptions.", "家长和合作方账单异常。")}</div>
            </a>
            <a href="/admin/receipts-approvals/queue" style={{ ...tileStyle, background: "#fffbeb", borderColor: "#fde68a" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Receipt Queue", "收据审批队列")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Create, review, and repair receipt items.", "创建、审核和修复收据项。")}</div>
            </a>
            <a href="/admin/reports/partner-settlement" style={{ ...tileStyle, background: "#eef2ff", borderColor: "#c7d2fe" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Partner Settlement", "合作方结算")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Review settlement totals and close outstanding partner items.", "核对结算总额并关闭合作方待处理项。")}</div>
            </a>
          </div>
        </section>

        <section style={{ ...cardStyle, background: "#f8fbff", borderColor: "#bfdbfe" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.3 }}>
            {t(lang, "Pending approvals", "待审批提醒")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
            <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: 12 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Needs action", "待处理")}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{approvalInbox.summary.total}</div>
            </div>
            <div style={{ border: "1px solid #fde68a", borderRadius: 12, background: "#fff", padding: 12 }}>
              <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Overdue", "超时")}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>{approvalInbox.summary.overdue}</div>
            </div>
            <div style={{ border: "1px solid #c7d2fe", borderRadius: 12, background: "#fff", padding: 12 }}>
              <div style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Manager", "管理")}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#3730a3" }}>{approvalInbox.summary.manager}</div>
            </div>
            <div style={{ border: "1px solid #fdba74", borderRadius: 12, background: "#fff", padding: 12 }}>
              <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Finance", "财务")}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#9a3412" }}>{approvalInbox.summary.finance}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/admin/approvals" style={{ fontWeight: 800 }}>
              {t(lang, "Open Approval Inbox", "打开审批提醒中心")}
            </a>
          </div>
        </section>

        <section style={{ ...cardStyle, background: "#fafafa" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
            {t(lang, "Secondary tools", "次级入口")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a href="/admin/finance/student-package-invoices">{t(lang, "Student Package Invoices", "学生课时包发票")}</a>
            <a href="/admin/finance/student-package-balances">{t(lang, "Student Package Balances", "学生课时包余额报表")}</a>
            <a href="/admin/expense-claims">{t(lang, "Expense Claims", "报销审批")}</a>
            <a href="/admin/reports/audit-logs">{t(lang, "Audit Logs", "审计日志")}</a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          ...workbenchHeroStyle("indigo"),
          marginBottom: 0,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#3730a3", letterSpacing: 0.4 }}>
          {t(lang, "Today First", "今天先处理")}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>
          {t(lang, "Admin workbench", "管理工作台")}
        </div>
        <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.45, maxWidth: 760 }}>
          {t(
            lang,
            "Use this page as a daily router: clear today’s blockers first, then move into student, schedule, and finance workflows only when needed.",
            "把这里当成日常路由页：先清掉今天的阻塞项，再进入学生、排课和财务流程。"
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <div style={compactMetricStyle}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Approvals", "待审批")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{approvalInbox.summary.total}</div>
          </div>
          <div style={compactMetricStyle}>
            <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Overdue", "超时")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#92400e" }}>{approvalInbox.summary.overdue}</div>
          </div>
          <div style={compactMetricStyle}>
            <div style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Finance", "财务审批")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#9a3412" }}>{approvalInbox.summary.finance}</div>
          </div>
          <div style={compactMetricStyle}>
            <div style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Expense", "报销审批")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#166534" }}>{approvalInbox.summary.expense}</div>
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle, background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
            {t(lang, "Immediate work", "优先工作")}
          </div>
          <a href="/admin/approvals" style={{ fontWeight: 800, color: "#1d4ed8" }}>
            {t(lang, "Open approval inbox", "打开审批提醒中心")}
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
          <a href="/admin/todos" style={{ ...tileStyle, background: "#fff7ed", borderColor: "#fdba74" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Todo Center", "待办中心")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Attendance, follow-up, renewal, and repair work.", "点名、跟进、续费和修复事项。")}</div>
          </a>
          <a href="/admin/approvals" style={{ ...tileStyle, background: "#f8fbff", borderColor: "#bfdbfe" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Approval Inbox", "审批提醒中心")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{approvalInbox.summary.total}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Start here when a manager or finance decision is blocking work.", "当管理或财务审批阻塞工作时，先从这里开始。")}</div>
          </a>
          <a href="/admin/schedule" style={{ ...tileStyle, background: "#eff6ff", borderColor: "#93c5fd" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Weekly Schedule", "周课表")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Live schedule changes and daily classroom coordination.", "实时排课调整和日常教室协调。")}</div>
          </a>
          <a href="/admin/alerts" style={{ ...tileStyle, background: "#fff1f2", borderColor: "#fda4af" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Sign-in Alerts", "签到警告")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "High-risk items that need attention now.", "需要立刻关注的高风险事项。")}</div>
          </a>
        </div>
      </section>

      <section style={{ ...cardStyle, background: "#f8fbff", borderColor: "#bfdbfe" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.3 }}>
          {t(lang, "Pending approvals", "待审批提醒")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
          <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Needs action", "待处理")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{approvalInbox.summary.total}</div>
          </div>
          <div style={{ border: "1px solid #fde68a", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Overdue", "超时")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>{approvalInbox.summary.overdue}</div>
          </div>
          <div style={{ border: "1px solid #c7d2fe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Manager", "管理")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#3730a3" }}>{approvalInbox.summary.manager}</div>
          </div>
          <div style={{ border: "1px solid #fdba74", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Finance", "财务")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#9a3412" }}>{approvalInbox.summary.finance}</div>
          </div>
          <div style={{ border: "1px solid #86efac", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Expense", "报销")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}>{approvalInbox.summary.expense}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <a href="/admin/approvals" style={{ fontWeight: 800 }}>
            {t(lang, "Open Approval Inbox", "打开审批提醒中心")}
          </a>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
          {t(lang, "Core workflows", "核心流程")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
          <a href="/admin/students" style={tileStyle}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Students", "学生")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Student detail, packages, and quick scheduling.", "学生详情、课时包和快速排课。")}</div>
          </a>
          <a href="/admin/teachers" style={tileStyle}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Teachers", "老师")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Availability, cards, and teacher context.", "可上课时间、老师名片和教师信息。")}</div>
          </a>
          <a href="/admin/classes" style={tileStyle}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Classes", "班级")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Class detail, sessions, and attendance access.", "班级详情、课次和点名入口。")}</div>
          </a>
          <a href="/admin/tickets" style={tileStyle}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Ticket Center", "工单中心")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Follow-up and handover work.", "跟进和交接工作。")}</div>
          </a>
        </div>
      </section>

      <section style={{ ...cardStyle, background: "#fafafa" }}>
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>
            {t(lang, "Lower-frequency setup guide", "低频配置与搭建指南")}
          </summary>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {[
              { n: 1, href: "/admin/campuses", label: t(lang, "Create campus", "创建校区") },
              { n: 2, href: "/admin/rooms", label: t(lang, "Create room", "创建教室") },
              { n: 3, href: "/admin/teachers", label: t(lang, "Create teacher + set availability", "创建老师 + 设置可用时间") },
              { n: 4, href: "/admin/courses", label: t(lang, "Create course", "创建课程") },
              { n: 5, href: "/admin/classes", label: t(lang, "Create class", "创建班级") },
              { n: 6, label: t(lang, "Open class detail to generate sessions", "进入班级详情生成课次") },
              { n: 7, href: "/admin/booking-links", label: t(lang, "Create student booking links", "创建学生选课链接") },
            ].map((item) => (
              <div key={item.n} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: "#e2e8f0",
                    textAlign: "center",
                    fontSize: 11,
                    lineHeight: "22px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {item.n}
                </div>
                {item.href ? <a href={item.href}>{item.label}</a> : <div style={{ fontWeight: 600 }}>{item.label}</div>}
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}

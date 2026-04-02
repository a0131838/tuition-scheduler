import { getCurrentUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { workbenchHeroStyle } from "./_components/workbenchStyles";

export default async function AdminHome() {
  const lang = await getLang();
  const user = await getCurrentUser();
  const isFinance = user?.role === "FINANCE";
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
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.5, maxWidth: 760 }}>
            {t(
              lang,
              "Use this page like a queue router: open the next blocked approval, clear the current payout step, then move to invoice and audit follow-up.",
              "把这里当成队列路由页来用：先打开下一条被阻塞的审批，再清掉当前发薪/结算动作，最后再处理发票和审计跟进。"
            )}
          </div>
        </section>

        <section style={{ ...cardStyle, background: "#f8fafc" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
            {t(lang, "Main Queues", "主队列")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
            <a href="/admin/finance/workbench" style={{ ...tileStyle, background: "#fff7ed", borderColor: "#fdba74" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Finance Workbench", "财务工作台")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Parent and partner billing exceptions.", "家长和合作方账单异常。")}</div>
            </a>
            <a href="/admin/reports/teacher-payroll" style={{ ...tileStyle, background: "#eff6ff", borderColor: "#93c5fd" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Teacher Payroll", "老师工资单")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Queue-first payroll approvals and payout.", "队列优先的工资审批和发薪。")}</div>
            </a>
            <a href="/admin/reports/partner-settlement" style={{ ...tileStyle, background: "#eef2ff", borderColor: "#c7d2fe" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Partner Settlement", "合作方结算")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Review settlement totals and close outstanding partner items.", "核对结算总额并关闭合作方待处理项。")}</div>
            </a>
            <a href="/admin/receipts-approvals" style={{ ...tileStyle, background: "#fffbeb", borderColor: "#fde68a" }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Receipt Approvals", "收据审批")}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Create, review, and repair receipt items.", "创建、审核和修复收据项。")}</div>
            </a>
          </div>
        </section>

        <section style={{ ...cardStyle, background: "#fafafa" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
            {t(lang, "Reference Tools", "辅助入口")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a href="/admin/finance/student-package-invoices">{t(lang, "Student Package Invoices", "学生课时包发票")}</a>
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
        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.5, maxWidth: 760 }}>
          {t(
            lang,
            "Use the admin home as a daily router: start from the todo queue, jump into schedule or alerts when something is blocked, and keep lower-frequency setup work out of the first screen.",
            "把管理首页当成日常路由页来用：先从待办队列开始，有阻塞就跳到课表或告警页，把低频配置工作留在首屏之后。"
          )}
        </div>
      </section>

      <section style={{ ...cardStyle, background: "#f8fafc" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
          {t(lang, "Run The Day", "日常主线")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
          <a href="/admin/todos" style={{ ...tileStyle, background: "#fff7ed", borderColor: "#fdba74" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Todo Center", "待办中心")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Attendance, follow-up, renewal, and repair work.", "点名、跟进、续费和修复事项。")}</div>
          </a>
          <a href="/admin/schedule" style={{ ...tileStyle, background: "#eff6ff", borderColor: "#93c5fd" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Weekly Schedule", "周课表")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Live schedule changes and daily classroom coordination.", "实时排课调整和日常教室协调。")}</div>
          </a>
          <a href="/admin/alerts" style={{ ...tileStyle, background: "#fff1f2", borderColor: "#fda4af" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Sign-in Alerts", "签到警告")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "High-risk items that need attention now.", "需要立刻关注的高风险事项。")}</div>
          </a>
          <a href="/admin/reports/teacher-payroll" style={{ ...tileStyle, background: "#eef2ff", borderColor: "#c7d2fe" }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "Teacher Payroll", "老师工资单")}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Queue-first salary review and payout flow.", "队列优先的工资审核和发薪流程。")}</div>
          </a>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.3 }}>
          {t(lang, "Common Workflows", "常用流程")}
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
            {t(lang, "Setup Guide (Lower Frequency)", "基础搭建指南（低频使用）")}
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

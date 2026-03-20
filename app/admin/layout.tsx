import { isManagerUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LanguageSelectorClient from "./_components/LanguageSelectorClient";
import Link from "next/link";

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = await resolvePathnameFromHeaders();
  if (!pathname) {
    return <>{children}</>;
  }
  const isPublicAdminAuthPath =
    pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/logout";

  // Avoid redirect loops for auth pages that live under /admin.
  if (isPublicAdminAuthPath) {
    return <>{children}</>;
  }

  const user = await requireAdmin();
  const lang = await getLang();
  const showManagerConsole = await isManagerUser(user);
  const canSeeSharedDocs = showManagerConsole && user.role === "ADMIN";
  const isFinance = user.role === "FINANCE";

  const financeAllowedPath =
    pathname === "/admin" ||
    pathname === "/admin/reports/teacher-payroll" ||
    pathname.startsWith("/admin/reports/teacher-payroll/") ||
    pathname.startsWith("/admin/reports/partner-settlement") ||
    pathname === "/admin/reports/audit-logs" ||
    pathname === "/admin/expense-claims" ||
    pathname === "/admin/receipts-approvals" ||
    (pathname.startsWith("/admin/packages/") && pathname.endsWith("/billing"));

  if (isFinance && !financeAllowedPath) {
    redirect("/admin/reports/teacher-payroll");
  }
  const sidebarNavContent = (
    <>
      <nav style={{ display: "grid", gap: 10 }}>
        {isFinance ? (
          <>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5 }}>
              {t(lang, "Finance", "财务")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f7f5ff", border: "1px solid #e4ddf7" }}>
              <Link scroll={false} href="/admin" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Finance Dashboard", "财务首页")}
              </Link>
              <Link scroll={false} href="/admin/reports/teacher-payroll" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Teacher Payroll", "老师工资单")}
              </Link>
              <Link scroll={false} href="/admin/reports/partner-settlement" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Partner Settlement", "合作方结算")}
              </Link>
              <Link scroll={false} href="/admin/expense-claims" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Expense Claims", "报销审批")}
              </Link>
              <Link scroll={false} href="/admin/receipts-approvals" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Receipt Approvals", "收据审批")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5 }}>
              {t(lang, "Overview", "概览")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 6, borderRadius: 10, background: "#eef2ff", border: "1px solid #a5b4fc" }}>
              <Link scroll={false} href="/admin" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                {t(lang, "Dashboard", "总览")}
              </Link>
              <Link scroll={false} href="/admin/todos" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                {t(lang, "Todo Center", "待办中心")}
              </Link>
              <Link scroll={false} href="/admin/alerts" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fee2e2", border: "1px solid #ef4444", borderLeft: "4px solid #b91c1c", color: "#7f1d1d" }}>
                {t(lang, "Sign-in Alerts", "签到警告")}
              </Link>
              {showManagerConsole ? (
                <Link scroll={false} href="/admin/manager" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                  {t(lang, "Manager Console", "管理者驾驶舱")}
                </Link>
              ) : null}
              {showManagerConsole ? (
                <Link scroll={false} href="/admin/manager/users" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                  {t(lang, "System User Admin", "系统使用者管理")}
                </Link>
              ) : null}
              {canSeeSharedDocs ? (
                <Link scroll={false} href="/admin/shared-docs" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                  {t(lang, "Shared Docs", "共享文档库")}
                </Link>
              ) : null}
              <Link scroll={false} href="/admin/schedule" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                {t(lang, "Schedule", "周课表")}
              </Link>
            </div>
          </>
        )}

        {showManagerConsole && !isFinance ? (
          <>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
              {t(lang, "Data Setup", "基础数据录入")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 6, borderRadius: 10, background: "#ecfeff", border: "1px solid #67e8f9" }}>
              <Link scroll={false} href="/admin/campuses" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                {t(lang, "Campuses", "校区")}
              </Link>
              <Link scroll={false} href="/admin/rooms" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                {t(lang, "Rooms", "教室")}
              </Link>
              <Link scroll={false} href="/admin/student-sources" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                {t(lang, "Student Sources", "学生来源")}
              </Link>
              <Link scroll={false} href="/admin/student-types" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                {t(lang, "Student Types", "学生类型")}
              </Link>
              <Link scroll={false} href="/admin/courses" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                {t(lang, "Courses", "课程")}
              </Link>
            </div>
          </>
        ) : null}

        {!isFinance ? (
          <>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
              {t(lang, "Operations", "日常运营")}
            </div>
            <div style={{ display: "grid", gap: 8, padding: 6, borderRadius: 10, background: "#fff8f1", border: "1px solid #f4e1cf" }}>
              <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                <div style={{ fontSize: 10.5, color: "#9a3412", fontWeight: 700 }}>
                  {t(lang, "People", "人员")}
                </div>
                <Link scroll={false} href="/admin/teachers" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff3e1", border: "1px solid #f59e0b", borderLeft: "4px solid #d97706" }}>
                  {t(lang, "Teachers", "老师")}
                </Link>
                <Link scroll={false} href="/admin/students" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff3e1", border: "1px solid #f59e0b", borderLeft: "4px solid #d97706" }}>
                  {t(lang, "Students", "学生")}
                </Link>
              </div>

              <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 700 }}>
                  {t(lang, "Scheduling & Attendance", "排课与出勤")}
                </div>
                <Link scroll={false} href="/admin/classes" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#eaf3ff", border: "1px solid #60a5fa", borderLeft: "4px solid #2563eb" }}>
                  {t(lang, "Classes", "班级")}
                </Link>
                <Link scroll={false} href="/admin/conflicts" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#eaf3ff", border: "1px solid #60a5fa", borderLeft: "4px solid #2563eb" }}>
                  {t(lang, "Conflicts", "冲突处理")}
                </Link>
              </div>

              <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 10.5, color: "#166534", fontWeight: 700 }}>
                  {t(lang, "Enrollment & Packages", "报名与课时包")}
                </div>
                <Link scroll={false} href="/admin/booking-links" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edfff1", border: "1px solid #4ade80", borderLeft: "4px solid #16a34a" }}>
                  {t(lang, "Booking Links", "学生选课链接")}
                </Link>
                <Link scroll={false} href="/admin/enrollments" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edfff1", border: "1px solid #4ade80", borderLeft: "4px solid #16a34a" }}>
                  {t(lang, "Enrollments", "报名")}
                </Link>
                <Link scroll={false} href="/admin/packages" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edfff1", border: "1px solid #4ade80", borderLeft: "4px solid #16a34a" }}>
                  {t(lang, "Packages", "课时包")}
                </Link>
              </div>

              <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#fdf2f8", border: "1px solid #fbcfe8" }}>
                <div style={{ fontSize: 10.5, color: "#9d174d", fontWeight: 700 }}>
                  {t(lang, "Feedback Workflow", "反馈流程")}
                </div>
                <Link scroll={false} href="/admin/feedbacks" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#ffeff9", border: "1px solid #f472b6", borderLeft: "4px solid #db2777" }}>
                  {t(lang, "Teacher Feedbacks", "老师课后反馈")}
                </Link>
              </div>

              <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#fefce8", border: "1px solid #fde68a" }}>
                <div style={{ fontSize: 10.5, color: "#854d0e", fontWeight: 700 }}>
                  {t(lang, "Ticket Workflow", "工单流程")}
                </div>
                <Link scroll={false} href="/admin/tickets" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fffbeb", border: "1px solid #facc15", borderLeft: "4px solid #ca8a04" }}>
                  {t(lang, "Ticket Center", "工单中心")}
                </Link>
                <Link scroll={false} href="/admin/tickets/handover" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fffbeb", border: "1px solid #facc15", borderLeft: "4px solid #ca8a04" }}>
                  {t(lang, "Daily Handover", "每日交接")}
                </Link>
                <Link scroll={false} href="/admin/tickets/sop" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fffbeb", border: "1px solid #facc15", borderLeft: "4px solid #ca8a04" }}>
                  {t(lang, "SOP One Pager", "SOP一页纸")}
                </Link>
              </div>
            </div>
          </>
        ) : null}

        {showManagerConsole && !isFinance ? (
          <>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
              {t(lang, "Reports", "报表")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f7f5ff", border: "1px solid #e4ddf7" }}>
              <Link scroll={false} href="/admin/reports/monthly-hours" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Monthly Hours Report", "月度课时明细")}
              </Link>
              <Link scroll={false} href="/admin/reports/cancelled-sessions" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Cancelled Sessions", "已取消课次")}
              </Link>
              <Link scroll={false} href="/admin/reports/undeducted-completed" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Undeducted Completed", "已完成未减扣")}
              </Link>
              <Link scroll={false} href="/admin/reports/package-sharing-audit" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Package Sharing Audit", "共享课包审计")}
              </Link>
              <Link scroll={false} href="/admin/reports/teacher-payroll" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Teacher Payroll", "老师工资单")}
              </Link>
              <Link scroll={false} href="/admin/reports/partner-settlement" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Partner Settlement", "合作方结算")}
              </Link>
              <Link scroll={false} href="/admin/receipts-approvals" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Receipt Approvals", "收据审批")}
              </Link>
              <Link scroll={false} href="/admin/expense-claims" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Expense Claims", "报销审批")}
              </Link>
              <Link scroll={false} href="/admin/reports/midterm" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                {t(lang, "Midterm Reports", "中期报告")}
              </Link>
            </div>
          </>
        ) : null}
      </nav>

      <hr style={{ margin: "16px 0" }} />
      <Link
        scroll={false}
        href="/"
        className="nav-button"
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          textAlign: "center",
        }}
      >
        {t(lang, "Back Home", "返回首页")}
      </Link>
    </>
  );

  return (
    <div style={{ fontFamily: "system-ui", margin: 0, fontSize: 12.5 }}>
      <style>{`
        .nav-button {
          display: block;
          text-decoration: none;
          color: #0b1220;
          font-weight: 700;
          font-size: 12.5px;
          line-height: 1.25;
          background: #ffffff;
          border: 1px solid #94a3b8;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        }
        .nav-button:hover {
          background: #e2e8f0;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
          transform: translateY(-1px);
        }
        .nav-button:active {
          transform: translateY(0);
        }
      `}</style>
      <div className="app-shell">
        <aside className="app-sidebar">
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Admin", "管理后台")}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Tuition Scheduler</div>
          </div>

          <div className="app-nav-desktop">{sidebarNavContent}</div>
          <details className="app-nav-mobile">
            <summary>{t(lang, "Menu", "菜单")}</summary>
            <div style={{ marginTop: 10 }}>{sidebarNavContent}</div>
          </details>
        </aside>

        <main className="app-main">
          <div className="app-main-head">
            <div style={{ color: "#666" }}>
              {t(lang, "Logged in", "已登录")}: <b>{user.name}</b> ({user.email})
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <LanguageSelectorClient initialLang={user.language} />
              <a href="/admin/logout">Logout</a>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

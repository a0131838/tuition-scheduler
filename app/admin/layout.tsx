import { isManagerUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LanguageSelectorClient from "./_components/LanguageSelectorClient";

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
  const isFinance = user.role === "FINANCE";

  const financeAllowedPath =
    pathname === "/admin" ||
    pathname === "/admin/reports/teacher-payroll" ||
    pathname.startsWith("/admin/reports/teacher-payroll/") ||
    pathname === "/admin/reports/partner-settlement" ||
    pathname === "/admin/reports/audit-logs";

  if (isFinance && !financeAllowedPath) {
    redirect("/admin/reports/teacher-payroll");
  }

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
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: 240,
            padding: 16,
            borderRight: "1px solid #eee",
            background: "#fafafa",
          }}
        >
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
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Admin", "绠＄悊鍚庡彴")}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Tuition Scheduler</div>
          </div>

          <nav style={{ display: "grid", gap: 10 }}>
            {isFinance ? (
              <>
                <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5 }}>
                  {t(lang, "Finance", "璐㈠姟")}
                </div>
                <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f7f5ff", border: "1px solid #e4ddf7" }}>
                  <a href="/admin" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Finance Dashboard", "璐㈠姟棣栭〉")}
                  </a>
                  <a href="/admin/reports/teacher-payroll" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Teacher Payroll", "老师工资单")}
                  </a>
                  <a href="/admin/reports/partner-settlement" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Partner Settlement", "合作方结算")}
                  </a>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5 }}>
                  {t(lang, "Overview", "姒傝")}
                </div>
                <div style={{ display: "grid", gap: 5, padding: 6, borderRadius: 10, background: "#eef2ff", border: "1px solid #a5b4fc" }}>
                  <a href="/admin" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                    {t(lang, "Dashboard", "鎬昏")}
                  </a>
                  <a href="/admin/todos" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                    {t(lang, "Todo Center", "寰呭姙涓績")}
                  </a>
                  <a href="/admin/alerts" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fee2e2", border: "1px solid #ef4444", borderLeft: "4px solid #b91c1c", color: "#7f1d1d" }}>
                    {t(lang, "Sign-in Alerts", "绛惧埌璀﹀憡")}
                  </a>
                  {showManagerConsole ? (
                    <a href="/admin/manager" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                      {t(lang, "Manager Console", "绠＄悊鑰呴┚椹惰埍")}
                    </a>
                  ) : null}
                  {showManagerConsole ? (
                    <a href="/admin/manager/users" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                      {t(lang, "System User Admin", "系统使用者管理")}
                    </a>
                  ) : null}
                  <a href="/admin/schedule" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #818cf8", borderLeft: "4px solid #4338ca" }}>
                    {t(lang, "Schedule", "周课表")}
                  </a>
                </div>
              </>
            )}

            {showManagerConsole && !isFinance ? (
              <>
                <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
                  {t(lang, "Data Setup", "鍩虹鏁版嵁褰曞叆")}
                </div>
                <div style={{ display: "grid", gap: 5, padding: 6, borderRadius: 10, background: "#ecfeff", border: "1px solid #67e8f9" }}>
                  <a href="/admin/campuses" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                    {t(lang, "Campuses", "鏍″尯")}
                  </a>
                  <a href="/admin/rooms" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                    {t(lang, "Rooms", "鏁欏")}
                  </a>
                  <a href="/admin/student-sources" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                    {t(lang, "Student Sources", "瀛︾敓鏉ユ簮")}
                  </a>
                  <a href="/admin/student-types" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                    {t(lang, "Student Types", "瀛︾敓绫诲瀷")}
                  </a>
                  <a href="/admin/courses" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f2feff", border: "1px solid #22d3ee", borderLeft: "4px solid #0891b2" }}>
                    {t(lang, "Courses", "璇剧▼")}
                  </a>
                </div>
              </>
            ) : null}

            {!isFinance ? (
              <>
                <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
                  {t(lang, "Operations", "鏃ュ父杩愯惀")}
                </div>
                <div style={{ display: "grid", gap: 8, padding: 6, borderRadius: 10, background: "#fff8f1", border: "1px solid #f4e1cf" }}>
                  <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                    <div style={{ fontSize: 10.5, color: "#9a3412", fontWeight: 700 }}>
                      {t(lang, "People", "浜哄憳")}
                    </div>
                    <a href="/admin/teachers" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff3e1", border: "1px solid #f59e0b", borderLeft: "4px solid #d97706" }}>
                      {t(lang, "Teachers", "鑰佸笀")}
                    </a>
                    <a href="/admin/students" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff3e1", border: "1px solid #f59e0b", borderLeft: "4px solid #d97706" }}>
                      {t(lang, "Students", "瀛︾敓")}
                    </a>
                  </div>

                  <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 700 }}>
                      {t(lang, "Scheduling & Attendance", "排课与出勤")}
                    </div>
                    <a href="/admin/classes" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#eaf3ff", border: "1px solid #60a5fa", borderLeft: "4px solid #2563eb" }}>
                      {t(lang, "Classes", "鐝骇")}
                    </a>
                    <a href="/admin/conflicts" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#eaf3ff", border: "1px solid #60a5fa", borderLeft: "4px solid #2563eb" }}>
                      {t(lang, "Conflicts", "鍐茬獊澶勭悊")}
                    </a>
                  </div>

                  <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 10.5, color: "#166534", fontWeight: 700 }}>
                      {t(lang, "Enrollment & Packages", "鎶ュ悕涓庤鏃跺寘")}
                    </div>
                    <a href="/admin/booking-links" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edfff1", border: "1px solid #4ade80", borderLeft: "4px solid #16a34a" }}>
                      {t(lang, "Booking Links", "瀛︾敓閫夎閾炬帴")}
                    </a>
                    <a href="/admin/enrollments" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edfff1", border: "1px solid #4ade80", borderLeft: "4px solid #16a34a" }}>
                      {t(lang, "Enrollments", "鎶ュ悕")}
                    </a>
                    <a href="/admin/packages" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edfff1", border: "1px solid #4ade80", borderLeft: "4px solid #16a34a" }}>
                      {t(lang, "Packages", "课时包")}
                    </a>
                  </div>

                  <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 8, background: "#fdf2f8", border: "1px solid #fbcfe8" }}>
                    <div style={{ fontSize: 10.5, color: "#9d174d", fontWeight: 700 }}>
                      {t(lang, "Feedback Workflow", "鍙嶉娴佺▼")}
                    </div>
                    <a href="/admin/feedbacks" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#ffeff9", border: "1px solid #f472b6", borderLeft: "4px solid #db2777" }}>
                      {t(lang, "Teacher Feedbacks", "鑰佸笀璇惧悗鍙嶉")}
                    </a>
                  </div>
                </div>
              </>
            ) : null}

            {showManagerConsole && !isFinance ? (
              <>
                <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
                  {t(lang, "Reports", "鎶ヨ〃")}
                </div>
                <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f7f5ff", border: "1px solid #e4ddf7" }}>
                  <a href="/admin/reports/monthly-hours" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Monthly Hours Report", "鏈堝害璇炬椂鏄庣粏")}
                  </a>
                  <a href="/admin/reports/teacher-payroll" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Teacher Payroll", "老师工资单")}
                  </a>
                  <a href="/admin/reports/partner-settlement" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Partner Settlement", "合作方结算")}
                  </a>
                  <a href="/admin/reports/midterm" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {t(lang, "Midterm Reports", "中期报告")}
                  </a>
                </div>
              </>
            ) : null}
          </nav>

          <hr style={{ margin: "16px 0" }} />
          <a
            href="/"
            className="nav-button"
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            {t(lang, "Back Home", "杩斿洖棣栭〉")}
          </a>
        </aside>

        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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




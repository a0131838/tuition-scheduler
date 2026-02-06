import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

async function updateLanguage(formData: FormData) {
  "use server";
  const lang = String(formData.get("lang") ?? "BILINGUAL");
  const user = await requireAdmin();
  await prisma.user.update({
    where: { id: user.id },
    data: { language: lang as any },
  });
  redirect("/admin");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isPublicAdminAuthPath =
    pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/logout";

  // Avoid redirect loops for auth pages that live under /admin.
  if (isPublicAdminAuthPath) {
    return <>{children}</>;
  }

  const user = await requireAdmin();
  const lang = await getLang();

  return (
    <div style={{ fontFamily: "system-ui", margin: 0, fontSize: 12.5 }}>
      <style>{`
        .nav-button {
          display: block;
          text-decoration: none;
          color: #0f172a;
          font-weight: 600;
          font-size: 12.5px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
          border: 1px solid #e2e8f0;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .nav-button:hover {
          background: #f8fafc;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
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
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Admin", "管理后台")}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Tuition Scheduler</div>
          </div>

          <nav style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5 }}>
              {t(lang, "Overview", "概览")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <a href="/admin" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f5f7ff", border: "1px solid #dfe3f4" }}>
                {t(lang, "Dashboard", "总览")}
              </a>
              <a href="/admin/todos" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f3f7ff", border: "1px solid #d7e4f7" }}>
                {t(lang, "Todo Center", "待办中心")}
              </a>
              <a href="/admin/schedule" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f0f7fb", border: "1px solid #d7e7f0" }}>
                {t(lang, "Schedule", "周课表")}
              </a>
            </div>

            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
              {t(lang, "Data Setup", "基础数据录入")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f4fbf6", border: "1px solid #d9efe1" }}>
              <a href="/admin/campuses" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f3faf5", border: "1px solid #d5efe0" }}>
                {t(lang, "Campuses", "校区")}
              </a>
              <a href="/admin/rooms" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edf7f1", border: "1px solid #d0ebe0" }}>
                {t(lang, "Rooms", "教室")}
              </a>
              <a href="/admin/student-sources" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#eef8f3", border: "1px solid #d5efe2" }}>
                {t(lang, "Student Sources", "学生来源")}
              </a>
              <a href="/admin/student-types" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f1f9f5", border: "1px solid #d7efe3" }}>
                {t(lang, "Student Types", "学生类型")}
              </a>
              <a href="/admin/courses" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#edf7f2", border: "1px solid #d5efe2" }}>
                {t(lang, "Courses", "课程")}
              </a>
            </div>

            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
              {t(lang, "Operations", "日常运营")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#fff8f1", border: "1px solid #f4e1cf" }}>
              <a href="/admin/teachers" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff3e6", border: "1px solid #f2dac6" }}>
                {t(lang, "Teachers", "老师")}
              </a>
              <a href="/admin/students" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff1e1", border: "1px solid #f0d5bd" }}>
                {t(lang, "Students", "学生")}
              </a>
              <a href="/admin/classes" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff4da", border: "1px solid #efd9b0" }}>
                {t(lang, "Classes", "班级")}
              </a>
              <a href="/admin/packages" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff3de", border: "1px solid #eed7b8" }}>
                {t(lang, "Packages", "课时包")}
              </a>
              <a href="/admin/conflicts" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff0f6", border: "1px solid #fbcfe8" }}>
                {t(lang, "Conflicts", "冲突处理")}
              </a>
              <a href="/admin/booking-links" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff2e8", border: "1px solid #f1d7c4" }}>
                {t(lang, "Booking Links", "学生选课链接")}
              </a>
              <a href="/admin/enrollments" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fff0f0", border: "1px solid #efd1d1" }}>
                {t(lang, "Enrollments", "报名")}
              </a>
              <a href="/admin/feedbacks" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#fdeeee", border: "1px solid #efd4d4" }}>
                {t(lang, "Teacher Feedbacks", "老师课后反馈")}
              </a>
            </div>

            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>
              {t(lang, "Reports", "报表")}
            </div>
            <div style={{ display: "grid", gap: 5, padding: 5, borderRadius: 10, background: "#f7f5ff", border: "1px solid #e4ddf7" }}>
              <a href="/admin/reports/monthly-hours" className="nav-button" style={{ padding: "6px 8px", borderRadius: 8, background: "#f3f0ff", border: "1px solid #ded7f4" }}>
                {t(lang, "Monthly Hours Report", "月度课时明细")}
              </a>
            </div>
          </nav>

          <hr style={{ margin: "16px 0" }} />
          <a
            href="/"
            className="nav-button"
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "#f8fafc",
              border: "1px solid #d1d5db",
              textAlign: "center",
            }}
          >
            {t(lang, "Back Home", "返回首页")}
          </a>
        </aside>

        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#666" }}>
              {t(lang, "Logged in", "已登录")}: <b>{user.name}</b> ({user.email})
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <form action={updateLanguage}>
                <select
                  name="lang"
                  defaultValue={user.language}
                  style={{ minWidth: 140, padding: "4px 6px", borderRadius: 6, fontSize: 12 }}
                >
                  <option value="BILINGUAL">Bilingual / 双语</option>
                  <option value="ZH">中文</option>
                  <option value="EN">English</option>
                </select>
                <button type="submit" style={{ marginLeft: 6 }}>
                  Apply
                </button>
              </form>
              <a href="/admin/logout">Logout</a>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

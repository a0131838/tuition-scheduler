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
    <div style={{ fontFamily: "system-ui", margin: 0 }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: 240,
            padding: 16,
            borderRight: "1px solid #eee",
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>{t(lang, "Admin", "管理后台")}</h3>

          <nav style={{ display: "grid", gap: 8 }}>
            <a href="/admin">{t(lang, "Dashboard", "总览")}</a>
            <a href="/admin/todos">{t(lang, "Todo Center", "待办中心")}</a>
            <a href="/admin/schedule">{t(lang, "Schedule", "周课表")}</a>

            <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #eee" }} />

            <a href="/admin/campuses">{t(lang, "Campuses", "校区")}</a>
            <a href="/admin/rooms">{t(lang, "Rooms", "教室")}</a>

            <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #eee" }} />

            <a href="/admin/teachers">{t(lang, "Teachers", "老师")}</a>
            <a href="/admin/students">{t(lang, "Students", "学生")}</a>
            <a href="/admin/student-sources">{t(lang, "Student Sources", "学生来源")}</a>
            <a href="/admin/student-types">{t(lang, "Student Types", "学生类型")}</a>
            <a href="/admin/courses">{t(lang, "Courses", "课程")}</a>
            <a href="/admin/classes">{t(lang, "Classes", "班级")}</a>
            <a href="/admin/packages">{t(lang, "Packages", "课时包")}</a>
            <a href="/admin/booking-links">{t(lang, "Booking Links", "学生选课链接")}</a>
            <a href="/admin/feedbacks">{t(lang, "Teacher Feedbacks", "老师课后反馈")}</a>
            <a href="/admin/enrollments">{t(lang, "Enrollments", "报名")}</a>

            <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #eee" }} />
            <a href="/admin/reports/monthly-hours">{t(lang, "Monthly Hours Report", "月度课时明细")}</a>
          </nav>

          <hr style={{ margin: "16px 0" }} />
          <a href="/">← {t(lang, "Back Home", "返回首页")}</a>
        </aside>

        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#666" }}>
              {t(lang, "Logged in", "已登录")}: <b>{user.name}</b> ({user.email})
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <form action={updateLanguage}>
                <select name="lang" defaultValue={user.language} style={{ minWidth: 160 }}>
                  <option value="BILINGUAL">Bilingual / 双语</option>
                  <option value="ZH">中文</option>
                  <option value="EN">English</option>
                </select>
                <button type="submit" style={{ marginLeft: 8 }}>
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

import { getCurrentUser, requireTeacher } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import Link from "next/link";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  await requireTeacher();
  const user = await getCurrentUser();
  const navContent = (
    <>
      <nav style={{ display: "grid", gap: 8 }}>
        <Link scroll={false} href="/teacher">{t(lang, "Dashboard", "总览")}</Link>
        <Link scroll={false} href="/teacher/alerts">{t(lang, "Sign-in Alerts", "签到告警")}</Link>
        <Link scroll={false} href="/teacher/availability">{t(lang, "My Availability", "我的可上课时间")}</Link>
        <Link scroll={false} href="/teacher/sessions">{t(lang, "My Sessions", "我的课次")}</Link>
        <Link scroll={false} href="/teacher/student-feedbacks">{t(lang, "Student Feedbacks", "学生课后反馈")}</Link>
        <Link scroll={false} href="/teacher/midterm-reports">{t(lang, "Midterm Reports", "中期报告")}</Link>
        <Link scroll={false} href="/teacher/payroll">{t(lang, "My Payroll", "我的工资单")}</Link>
        <Link scroll={false} href="/teacher/card">{t(lang, "My Teacher Card", "我的老师名片")}</Link>
      </nav>
      <hr style={{ margin: "16px 0" }} />
      <Link scroll={false} href="/teacher/logout">
        <button type="button">{t(lang, "Logout", "退出登录")}</button>
      </Link>
    </>
  );

  return (
    <div style={{ fontFamily: "system-ui", margin: 0 }}>
      <div className="app-shell">
        <aside className="app-sidebar">
          <h3 style={{ marginTop: 0 }}>{t(lang, "Teacher Portal", "老师端")}</h3>
          <div className="app-nav-desktop">{navContent}</div>
          <details className="app-nav-mobile">
            <summary>{t(lang, "Menu", "菜单")}</summary>
            <div style={{ marginTop: 10 }}>{navContent}</div>
          </details>
        </aside>
        <main className="app-main">
          <div style={{ color: "#666", marginBottom: 16 }}>
            {user ? (
              <>
                {t(lang, "Logged in", "已登录")}: <b>{user.name}</b> ({user.email})
              </>
            ) : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}




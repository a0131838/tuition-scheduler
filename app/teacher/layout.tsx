import { getCurrentUser, requireTeacher } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  await requireTeacher();
  const user = await getCurrentUser();

  return (
    <div style={{ fontFamily: "system-ui", margin: 0 }}>
      <style>{`
        .teacher-shell {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        .teacher-sidebar {
          width: 240px;
          padding: 16px;
          border-right: 1px solid #eee;
          background: #fafafa;
          overflow-y: auto;
        }
        .teacher-main {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          min-width: 0;
        }
        @media (max-width: 900px) {
          .teacher-shell {
            display: block;
            height: auto;
            overflow: visible;
          }
          .teacher-sidebar {
            width: auto;
            border-right: 0;
            border-bottom: 1px solid #eee;
            overflow: visible;
            padding: 12px;
          }
          .teacher-main {
            width: 100%;
            overflow: visible;
            padding: 12px;
          }
        }
      `}</style>
      <div className="teacher-shell">
        <aside
          className="teacher-sidebar"
        >
          <h3 style={{ marginTop: 0 }}>{t(lang, "Teacher Portal", "老师端")}</h3>
          <nav style={{ display: "grid", gap: 8 }}>
            <a href="/teacher">{t(lang, "Dashboard", "总览")}</a>
            <a href="/teacher/alerts">{t(lang, "Sign-in Alerts", "签到告警")}</a>
            <a href="/teacher/availability">{t(lang, "My Availability", "我的可上课时间")}</a>
            <a href="/teacher/sessions">{t(lang, "My Sessions", "我的课次")}</a>
            <a href="/teacher/student-feedbacks">{t(lang, "Student Feedbacks", "学生课后反馈")}</a>
            <a href="/teacher/midterm-reports">{t(lang, "Midterm Reports", "中期报告")}</a>
            <a href="/teacher/payroll">{t(lang, "My Payroll", "我的工资单")}</a>
            <a href="/teacher/card">{t(lang, "My Teacher Card", "我的老师名片")}</a>
          </nav>
          <hr style={{ margin: "16px 0" }} />
          <a href="/teacher/logout">
            <button type="button">{t(lang, "Logout", "退出登录")}</button>
          </a>
        </aside>
        <main className="teacher-main">
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

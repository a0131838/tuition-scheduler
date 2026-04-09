import { getCurrentUser, isTeacherLeadUser, requireTeacher } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import TeacherLanguageSelectorClient from "./TeacherLanguageSelectorClient";
import TeacherSidebarNavClient from "./TeacherSidebarNavClient";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  await requireTeacher();
  const user = await getCurrentUser();
  const isLead = await isTeacherLeadUser(user);
  const navGroups = [
    {
      title: t(lang, "Today", "今天"),
      items: [
        { href: "/teacher", label: t(lang, "Dashboard", "总览") },
        { href: "/teacher/alerts", label: t(lang, "Sign-in Alerts", "签到告警") },
        ...(isLead ? [{ href: "/teacher/lead", label: t(lang, "Lead Desk", "主管工作台") }] : []),
      ],
    },
    {
      title: t(lang, "My Work", "我的任务"),
      items: [
        { href: "/teacher/sessions", label: t(lang, "My Sessions", "我的课次") },
        { href: "/teacher/student-feedbacks", label: t(lang, "Student Feedbacks", "学生课后反馈") },
        { href: "/teacher/tickets", label: t(lang, "Ticket Board", "工单看板") },
        { href: "/teacher/scheduling-exceptions", label: t(lang, "Scheduling Exceptions", "排课例外确认") },
      ],
    },
    {
      title: t(lang, "Schedule", "课表安排"),
      items: [
        { href: "/teacher/availability", label: t(lang, "My Availability", "我的可上课时间") },
        { href: "/teacher/midterm-reports", label: t(lang, "Midterm Reports", "中期报告") },
        { href: "/teacher/final-reports", label: t(lang, "Final Reports", "结课报告") },
      ],
    },
    {
      title: t(lang, "Finance", "财务"),
      items: [
        { href: "/teacher/payroll", label: t(lang, "My Payroll", "我的工资单") },
        { href: "/teacher/expense-claims", label: t(lang, "My Expense Claims", "我的报销") },
        { href: "/teacher/card", label: t(lang, "My Teacher Card", "我的老师名片") },
      ],
    },
  ];
  const navContent = (
    <>
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: 12,
          borderRadius: 14,
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
          border: "1px solid #e2e8f0",
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 700 }}>{t(lang, "Language", "语言")}</div>
        <TeacherLanguageSelectorClient initialLang={user?.language || lang} />
      </div>
      <TeacherSidebarNavClient groups={navGroups} />
      <hr style={{ margin: "16px 0" }} />
      <a href="/teacher/logout">
        <button type="button">{t(lang, "Logout", "退出登录")}</button>
      </a>
    </>
  );

  return (
    <div style={{ fontFamily: "system-ui", margin: 0 }}>
      <div className="app-shell">
        <aside className="app-sidebar">
          <div
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 16,
              background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
              border: "1px solid #c7d2fe",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>{t(lang, "Teacher Portal", "老师端")}</h3>
            <div style={{ color: "#475569", fontSize: 12 }}>
              {t(lang, "Today-first workspace for teaching, schedule, and finance.", "以今天任务为先的老师工作台，集中处理教学、排课和财务。")}
            </div>
          </div>
          <div className="app-nav-desktop">{navContent}</div>
          <details className="app-nav-mobile">
            <summary>{t(lang, "Menu", "菜单")}</summary>
            <div style={{ marginTop: 10 }}>{navContent}</div>
          </details>
        </aside>
        <main className="app-main">
          <div
            style={{
              color: "#475569",
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
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

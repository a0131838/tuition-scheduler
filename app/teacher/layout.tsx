import { getCurrentUser, requireTeacher } from "@/lib/auth";
import { clearSession } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

async function logoutAction() {
  "use server";
  await clearSession();
}

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  await requireTeacher();
  const user = await getCurrentUser();

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
          <h3 style={{ marginTop: 0 }}>{t(lang, "Teacher Portal", "老师端")}</h3>
          <nav style={{ display: "grid", gap: 8 }}>
            <a href="/teacher">{t(lang, "Dashboard", "总览")}</a>
            <a href="/teacher/availability">{t(lang, "My Availability", "我的可上课时间")}</a>
            <a href="/teacher/sessions">{t(lang, "My Sessions", "我的课次")}</a>
            <a href="/teacher/card">{t(lang, "My Teacher Card", "我的老师名片")}</a>
          </nav>
          <hr style={{ margin: "16px 0" }} />
          <form action={logoutAction}>
            <button type="submit">{t(lang, "Logout", "退出登录")}</button>
          </form>
        </aside>
        <main style={{ flex: 1, padding: 24 }}>
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

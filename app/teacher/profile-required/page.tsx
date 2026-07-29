import { getCurrentUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

export default async function TeacherProfileRequiredPage() {
  const user = await getCurrentUser();
  const lang = await getLang();

  return (
    <section
      style={{
        maxWidth: 760,
        padding: 24,
        borderRadius: 18,
        border: "1px solid #f59e0b",
        background: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)",
        boxShadow: "0 12px 30px rgba(146, 64, 14, 0.08)",
      }}
    >
      <div style={{ color: "#b45309", fontWeight: 800, fontSize: 12, letterSpacing: "0.04em" }}>
        {t(lang, "ACCOUNT SETUP REQUIRED", "账号设置待完成")}
      </div>
      <h1 style={{ margin: "10px 0 8px", color: "#0f172a" }}>
        {t(lang, "Teacher profile not linked", "尚未绑定教师档案")}
      </h1>
      <p style={{ color: "#475569", lineHeight: 1.7 }}>
        {t(
          lang,
          "Your login is active, but a manager has not yet linked it to the correct teacher profile. Teaching, schedule, reports, payroll, and student records stay locked to prevent another teacher's data from being shown.",
          "你的登录账号已经启用，但管理员尚未把它绑定到正确的教师档案。为防止看到其他老师的数据，教学、课表、报告、工资和学生记录会暂时锁定。"
        )}
      </p>
      <div
        style={{
          margin: "16px 0",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #fde68a",
          background: "#fff",
          color: "#78350f",
          lineHeight: 1.7,
        }}
      >
        <b>{t(lang, "What to send your manager", "请把以下信息发给主管")}</b>
        <div>{t(lang, "Account", "账号")}: {user?.name || "-"} ({user?.email || "-"})</div>
        <div>
          {t(
            lang,
            "Request: confirm and link my exact teacher profile in System User Admin.",
            "请求：请在“系统使用者管理”中确认并绑定我的准确教师档案。"
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/training">{t(lang, "Open Training Centre", "打开培训中心")}</a>
        <a href="/teacher/logout">{t(lang, "Log out", "退出登录")}</a>
      </div>
    </section>
  );
}

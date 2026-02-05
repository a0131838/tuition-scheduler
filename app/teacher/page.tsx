import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

export default async function TeacherHomePage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();

  if (!teacher) {
    return (
      <div>
        <h2>{t(lang, "Teacher Profile Not Linked", "老师资料未关联")}</h2>
        <p style={{ color: "#b00" }}>
          {t(
            lang,
            "Cannot find a linked Teacher profile for this account. Ask admin to link your teacher account.",
            "未找到与当前账号绑定的老师档案，请联系教务在老师详情页完成账号绑定。"
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2>{t(lang, "Teacher Dashboard", "老师工作台")}</h2>
      <p>
        {t(lang, "Welcome", "欢迎")} {teacher.name}
      </p>

      <div
        style={{
          margin: "12px 0 16px",
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t(lang, "Teacher Intro", "老师介绍")}</div>
        <div style={{ color: "#444", whiteSpace: "pre-wrap" }}>
          {teacher.intro || t(lang, "No intro yet. Please ask admin to update your intro.", "暂无介绍，请联系管理员完善老师介绍。")}
        </div>
      </div>

      <ol>
        <li>
          <a href="/teacher/availability">{t(lang, "Fill your availability", "填写可上课时间")}</a>
        </li>
        <li>
          <a href="/teacher/sessions">{t(lang, "Take attendance for your sessions", "对自己的课次进行点名")}</a>
        </li>
        <li>{t(lang, "Upload session feedback within 12 hours after class", "课后12小时内上传课后反馈")}</li>
      </ol>
    </div>
  );
}

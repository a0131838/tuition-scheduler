import { getLang, t } from "@/lib/i18n";

export default async function AdminHome() {
  const lang = await getLang();
  return (
    <div>
      <h1>{t(lang, "Tuition Scheduler Admin", "教务管理后台")}</h1>
      <p>
        {t(
          lang,
          "Start from Campuses → Rooms → Teachers → Courses → Classes → Sessions to build base data.",
          "先从 校区 → 教室 → 老师 → 课程 → 班级 → 课次 建基础数据。"
        )}
      </p>
      <ol>
        <li><a href="/admin/campuses">{t(lang, "Create campus", "创建校区")}</a></li>
        <li><a href="/admin/rooms">{t(lang, "Create room", "创建教室")}</a></li>
        <li><a href="/admin/teachers">{t(lang, "Create teacher + set availability", "创建老师 + 设置可用时间")}</a></li>
        <li><a href="/admin/courses">{t(lang, "Create course", "创建课程")}</a></li>
        <li><a href="/admin/classes">{t(lang, "Create class", "创建班级")}</a></li>
        <li>{t(lang, "Open class detail to generate sessions", "进入班级详情生成课次")}</li>
      </ol>
    </div>
  );
}

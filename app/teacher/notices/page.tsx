import { requireTeacher } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { getTeacherNoticeState } from "@/lib/teacher-notices";

function cardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 8,
  } as const;
}

export default async function TeacherNoticesPage() {
  const lang = await getLang();
  const user = await requireTeacher();
  const { notices, readMap } = await getTeacherNoticeState(user.id);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle("linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)", "#bfdbfe")}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{t(lang, "Teacher Notices", "老师通知")}</div>
        <div style={{ color: "#475569" }}>
          {t(lang, "Review company announcements and teacher-facing reminders here.", "在这里查看公司公告和面向老师的提醒。")}
        </div>
        <div>
          <a href="/teacher">{t(lang, "Back to dashboard", "返回工作台")}</a>
        </div>
      </section>

      {notices.length === 0 ? (
        <section style={cardStyle("#f8fafc", "#e2e8f0")}>{t(lang, "No notices right now.", "目前没有通知。")}</section>
      ) : (
        notices.map((notice) => {
          const isRead = Boolean(readMap[notice.id]);
          return (
            <section key={notice.id} style={cardStyle(notice.important ? "#fffbeb" : "#ffffff", notice.important ? "#f59e0b" : "#e2e8f0")}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>
                  {t(lang, notice.titleEn, notice.titleZh)}
                </div>
                <div style={{ color: isRead ? "#166534" : "#b45309", fontSize: 12, fontWeight: 700 }}>
                  {isRead ? t(lang, "Read", "已读") : t(lang, "Unread", "未读")}
                </div>
              </div>
              <div style={{ color: "#334155", lineHeight: 1.45 }}>{t(lang, notice.bodyEn, notice.bodyZh)}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {t(lang, "Published", "发布时间")}: {notice.publishedAt}
                {isRead ? ` · ${t(lang, "Read at", "已读时间")}: ${readMap[notice.id]}` : ""}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

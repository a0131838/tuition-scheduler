import { getLang, t } from "@/lib/i18n";

export default async function AdminHome() {
  const lang = await getLang();
  const cardStyle = {
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
  } as const;
  const sectionTitleStyle = { fontSize: 12, fontWeight: 700, color: "#334155" } as const;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          ...cardStyle,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderColor: "#e2e8f0",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>{t(lang, "Tuition Scheduler Admin", "教务管理后台")}</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          {t(
            lang,
            "Start from Campuses → Rooms → Teachers → Courses → Classes → Sessions to build base data.",
            "先从 校区 → 教室 → 老师 → 课程 → 班级 → 课次 建基础数据。"
          )}
        </div>
      </section>

      <section style={{ ...cardStyle, background: "#f8fafc" }}>
        <div style={sectionTitleStyle}>{t(lang, "Quick Actions", "快捷入口")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <a href="/admin/todos">{t(lang, "Todo Center", "待办中心")}</a>
          <a href="/admin/schedule">{t(lang, "Weekly Schedule", "周课表")}</a>
          <a href="/admin/reports/monthly-schedule">{t(lang, "Monthly Schedule Calendar", "月课表总览")}</a>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionTitleStyle}>{t(lang, "Setup Guide", "基础数据搭建步骤")}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {[
            { n: 1, href: "/admin/campuses", label: t(lang, "Create campus", "创建校区") },
            { n: 2, href: "/admin/rooms", label: t(lang, "Create room", "创建教室") },
            { n: 3, href: "/admin/teachers", label: t(lang, "Create teacher + set availability", "创建老师 + 设置可用时间") },
            { n: 4, href: "/admin/courses", label: t(lang, "Create course", "创建课程") },
            { n: 5, href: "/admin/classes", label: t(lang, "Create class", "创建班级") },
            { n: 6, label: t(lang, "Open class detail to generate sessions", "进入班级详情生成课次") },
            { n: 7, href: "/admin/booking-links", label: t(lang, "Create student booking links", "创建学生选课链接") },
          ].map((item) => (
            <div key={item.n} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: "#e2e8f0",
                  textAlign: "center",
                  fontSize: 11,
                  lineHeight: "20px",
                  fontWeight: 700,
                }}
              >
                {item.n}
              </div>
              {item.href ? <a href={item.href}>{item.label}</a> : <div style={{ fontWeight: 600 }}>{item.label}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

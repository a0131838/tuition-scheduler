import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { formatBusinessDateOnly, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../_components/workbenchStyles";

function scheduleAllSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function fmtTime(d: Date) {
  return formatBusinessTimeOnly(d);
}

function fmtDate(d: Date) {
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] ?? "";
  return `${weekday} ${formatBusinessDateOnly(d)}`;
}

export default async function ScheduleAllPage({
  searchParams,
}: {
  searchParams?: Promise<{ weekStart?: string }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const base = sp?.weekStart ? parseYMD(sp.weekStart) : startOfWeekMonday(new Date());
  const weekStart = startOfWeekMonday(base);
  const weekEnd = addDays(weekStart, 7);

  const sessions = await prisma.session.findMany({
    where: { startAt: { lt: weekEnd }, endAt: { gt: weekStart } },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const grouped = days.map((d) => {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);
    const items = sessions.filter((s) => s.startAt < dayEnd && s.endAt > dayStart);
    return { day: d, items };
  });

  const prevWeek = ymd(addDays(weekStart, -7));
  const nextWeek = ymd(addDays(weekStart, 7));
  const thisWeek = ymd(startOfWeekMonday(new Date()));

  return (
    <div>
      <section style={workbenchHeroStyle("indigo")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{t(lang, "Weekly overview", "全周总览")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "All Schedule (Week)", "全周总览")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Use this page when you want a fast read-only scan across the whole week before jumping back into the interactive weekly schedule.",
              "当你需要快速只读扫一遍整周情况时，用这个页面先看全局，再回到可操作的周课表。"
            )}
          </div>
          <div>
            <a href={`/admin/schedule?weekStart=${ymd(weekStart)}`}>{t(lang, "Back to Week View", "返回周课表")}</a>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Week start", "周开始")}</div>
            <div style={{ ...workbenchMetricValueStyle("indigo"), fontSize: 18 }}>{ymd(weekStart)}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("blue"), background: "#eff6ff" }}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Total sessions", "总课次")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{sessions.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Days in view", "展示天数")}</div>
            <div style={workbenchMetricValueStyle("slate")}>{grouped.length}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Overview map", "总览地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Switch week first, then scroll day by day. Use this as a scan page, and go back to week view when you need actions.", "先切周，再按天往下看。这一页适合快速巡检，需要操作时再回到周课表。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#schedule-all-nav" style={scheduleAllSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Week switch", "切周入口")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Jump between previous, current, and next week", "切到上一周、本周或下一周")}</span>
          </a>
          <a href="#schedule-all-days" style={scheduleAllSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Daily overview", "每日概览")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Scroll through each day’s sessions", "逐天查看课次")}</span>
          </a>
        </div>
      </section>

      <div id="schedule-all-nav" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <a href={`/admin/schedule/all?weekStart=${prevWeek}`}>← {t(lang, "Prev", "上一周")}</a>
        <a href={`/admin/schedule/all?weekStart=${thisWeek}`}>{t(lang, "Today", "本周")}</a>
        <a href={`/admin/schedule/all?weekStart=${nextWeek}`}>{t(lang, "Next", "下一周")} →</a>
      </div>

      <div id="schedule-all-days">
      {grouped.map(({ day, items }) => (
        <div key={day.toISOString()} style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 8 }}>{fmtDate(day)}</h3>
          {items.length === 0 ? (
            <div style={{ color: "#999" }}>{t(lang, "No events.", "暂无事件")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {items.map((s) => {
                const teacherName = s.teacher?.name ?? s.class.teacher.name;
                const title = `${s.class.course.name}${s.class.subject ? ` / ${s.class.subject.name}` : ""}${
                  s.class.level ? ` / ${s.class.level.name}` : ""
                }`;
                const place = `${s.class.campus.name}${s.class.room ? ` / ${s.class.room.name}` : ""}`;
                return (
                  <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                    <div style={{ fontWeight: 700 }}>
                      {fmtTime(s.startAt)} - {fmtTime(s.endAt)}
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><ClassTypeBadge capacity={s.class.capacity} compact /><span>{title}</span></div>
                    <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                      {t(lang, "Teacher", "老师")}: {teacherName}
                    </div>
                    <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                      {t(lang, "Campus", "校区")}: {place}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <a href={`/admin/classes/${s.classId}/sessions`}>{t(lang, "Sessions", "课次")}</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

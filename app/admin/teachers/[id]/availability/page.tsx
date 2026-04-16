import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import AdminTeacherAvailabilityClient from "./AdminTeacherAvailabilityClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
} from "@/app/admin/_components/workbenchStyles";

function parseMonth(s?: string) {
  if (!s) return null;
  const [y, m] = s.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  const lang = await getLang();
  const { id: teacherId } = await params;
  const sp = await searchParams;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, name: true },
  });
  if (!teacher) return <div>{t(lang, "Teacher not found.", "未找到老师。")}</div>;

  const now = new Date();
  const parsed = parseMonth(sp?.month) ?? { year: now.getFullYear(), monthIndex: now.getMonth() };
  const { year, monthIndex } = parsed;
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  const first = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const last = new Date(year, monthIndex + 1, 0, 0, 0, 0, 0);

  const [dateAvails, weeklyAvails] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      where: { teacherId, date: { gte: first, lte: last } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      select: { id: true, date: true, startMin: true, endMin: true },
    }),
    prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      select: { id: true, weekday: true, startMin: true, endMin: true },
    }),
  ]);
  const currentMonthDateCount = dateAvails.length;
  const currentMonthDayCount = new Set(dateAvails.map((a) => `${a.date.getFullYear()}-${a.date.getMonth()}-${a.date.getDate()}`)).size;
  const weeklyTemplateCount = weeklyAvails.length;
  const availabilitySummaryCards = [
    {
      title: t(lang, "Current month", "当前月份"),
      value: month,
      detail: t(lang, `${currentMonthDateCount} date slot(s) across ${currentMonthDayCount} day(s).`, `当前有 ${currentMonthDateCount} 条按日期时段，覆盖 ${currentMonthDayCount} 天。`),
      background: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      title: t(lang, "Weekly template", "每周模板"),
      value: t(lang, `${weeklyTemplateCount} template row(s)`, `${weeklyTemplateCount} 条模板`),
      detail: t(lang, "Templates help generate this month's date slots, but direct scheduling still uses date rows.", "每周模板只是帮助生成本月日期时段，真实排课仍看按日期时段。"),
      background: weeklyTemplateCount > 0 ? "#f0fdf4" : "#fff7ed",
      border: weeklyTemplateCount > 0 ? "#86efac" : "#fdba74",
    },
  ];
  const availabilitySectionLinks = [
    {
      href: "#teacher-availability-controls",
      label: t(lang, "Month controls", "月份控制"),
      detail: t(lang, "Move between months before editing slots", "先切月份，再编辑时段"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#teacher-availability-monthly",
      label: t(lang, "Date slots", "按日期时段"),
      detail: t(lang, `${currentMonthDateCount} row(s) this month`, `本月 ${currentMonthDateCount} 条时段`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#teacher-availability-weekly",
      label: t(lang, "Weekly template", "每周模板"),
      detail: t(lang, `${weeklyTemplateCount} template row(s)`, `${weeklyTemplateCount} 条模板`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.4 }}>
            {t(lang, "Teacher Availability", "老师可用时间")}
          </div>
          <h2 style={{ margin: 0 }}>{teacher.name}</h2>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(lang, "Use this page to maintain monthly date slots and the weekly helper template. Real scheduling uses the date slots in the selected month.", "这个页面用来维护按月份的日期时段和每周辅助模板；真实排课只使用当前月份的按日期时段。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <a href={`/admin/teachers/${teacher.id}`}>{t(lang, "Back to teacher detail", "返回老师详情")}</a>
          <a href={`/admin/teachers/${teacher.id}/calendar`}>{t(lang, "Open month calendar", "打开月表")}</a>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {availabilitySummaryCards.map((card) => (
          <div
            key={card.title}
            style={{ border: `1px solid ${card.border}`, borderRadius: 14, padding: 14, background: card.background, display: "grid", gap: 6 }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{card.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{card.value}</div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{card.detail}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 12,
          zIndex: 5,
          display: "grid",
          gap: 12,
          background: "#ffffffee",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Availability work map", "可用时间工作地图")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(lang, "Use this strip to jump between month controls, date-slot edits, and weekly template updates without rescanning the whole page.", "通过这条导航在月份控制、按日期编辑和每周模板之间快速切换，不用重新扫整页。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {availabilitySectionLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{ display: "grid", gap: 4, minWidth: 170, padding: "10px 12px", borderRadius: 12, border: `1px solid ${item.border}`, background: item.background, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ fontWeight: 700 }}>{item.label}</div>
              <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{item.detail}</div>
            </a>
          ))}
        </div>
      </section>

      <AdminTeacherAvailabilityClient
        teacherId={teacher.id}
        teacherName={teacher.name}
        initialMonth={month}
        initialDateAvails={dateAvails.map((a) => ({
          id: a.id,
          date: `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, "0")}-${String(
            a.date.getDate(),
          ).padStart(2, "0")}`,
          startMin: a.startMin,
          endMin: a.endMin,
        }))}
        initialWeeklyAvails={weeklyAvails}
        labels={{
          title: t(lang, "Availability", "可用时间"),
          prev: t(lang, "Prev", "上个月"),
          next: t(lang, "Next", "下个月"),
          monthlyTitle: t(lang, "Monthly Availability (by date)", "月度可用时间（按日期）"),
          monthlyHelp: t(
            lang,
            "Only the date slots in this month are used for real scheduling. The weekly template below is only a helper for generating this month's date slots.",
            "真实排课只认本月这里的按日期时段；下方每周模板只用于生成本月按日期时段。"
          ),
          weeklyTitle: t(lang, "Weekly Generation Template", "每周生成模板"),
          weeklyAutoSyncNote: t(
            lang,
            "Saving this template updates this month's date slots. The template itself is not used as direct scheduling availability.",
            "保存这个模板后，会同步更新本月按日期时段。模板本身不会直接作为排课依据。",
          ),
          add: t(lang, "Add", "添加"),
          delete: t(lang, "Delete", "删除"),
          addWeekly: t(lang, "Save Weekly Template Row", "保存每周模板行"),
          generate: t(lang, "Generate This Month Date Slots From Template", "按模板生成本月日期时段"),
          noSlots: t(lang, "No slots", "无时段"),
          noWeekly: t(lang, "No weekly template yet.", "暂无每周模板。"),
        }}
      />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t, type Lang } from "@/lib/i18n";
import { formatBusinessDateOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import TeacherAvailabilityClient from "./TeacherAvailabilityClient";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

function undoKey(teacherId: string) {
  return `teacher_availability_last_undo:${teacherId}`;
}

type AvailabilityUndoPayload = {
  type: "CLEAR_DAY";
  teacherId: string;
  date: string;
  createdAt: string;
  slots: Array<{ date: string; startMin: number; endMin: number }>;
};

function parseUndoPayload(raw: string | null | undefined): AvailabilityUndoPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as AvailabilityUndoPayload;
    if (!obj || obj.type !== "CLEAR_DAY" || !Array.isArray(obj.slots)) return null;
    return obj;
  } catch {
    return null;
  }
}

function statCard(bg: string, border: string) {
  return {
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: bg,
  } as const;
}

export default async function TeacherAvailabilityPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const today = new Date();
  const startKey = formatBusinessDateOnly(today);
  const endCursor = new Date(today);
  endCursor.setDate(endCursor.getDate() + 30);
  const endKey = formatBusinessDateOnly(endCursor);
  const start = parseBusinessDateStart(startKey) ?? today;
  const end = parseBusinessDateEnd(endKey) ?? endCursor;

  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  const undoRow = await prisma.appSetting.findUnique({
    where: { key: undoKey(teacher.id) },
    select: { value: true },
  });
  const undoPayload = parseUndoPayload(undoRow?.value);
  const daysWithSlots = new Set(slots.map((s) => formatBusinessDateOnly(s.date))).size;
  const totalRanges = slots.length;
  const next7 = new Date(today);
  next7.setDate(next7.getDate() + 7);
  const next7Key = formatBusinessDateOnly(next7);
  const next7DaysWithSlots = new Set(
    slots.filter((s) => formatBusinessDateOnly(s.date) <= next7Key).map((s) => formatBusinessDateOnly(s.date)),
  ).size;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "My Availability", "我的可上课时间")}
        subtitle={t(lang, "Plan the next 30 days of bookable time here. Use clear-day and quick-add tools to keep your calendar accurate before new classes are arranged.", "在这里安排未来30天的可预约时间。用清空当天和快速添加工具保持日历准确，方便后续排课。")}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/sessions", label: t(lang, "Open sessions", "打开我的课次") },
        ]}
      />
      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div style={statCard("#eff6ff", "#bfdbfe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Covered days", "已覆盖天数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1d4ed8", marginTop: 8 }}>{daysWithSlots}</div>
          <div style={{ color: "#1e40af", marginTop: 4 }}>{t(lang, "Days with at least one slot in the next 30 days.", "未来30天里至少有一个时段的日期数。")}</div>
        </div>
        <div style={statCard("#f0fdf4", "#bbf7d0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Total ranges", "总时段数")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#166534", marginTop: 8 }}>{totalRanges}</div>
          <div style={{ color: "#166534", marginTop: 4 }}>{t(lang, "Saved date-based availability ranges.", "已保存的按日期可上课时段。")}</div>
        </div>
        <div style={statCard("#fffbeb", "#fde68a")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}>{t(lang, "Next 7 days", "未来7天")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#92400e", marginTop: 8 }}>{next7DaysWithSlots}</div>
          <div style={{ color: "#92400e", marginTop: 4 }}>{t(lang, "Days already opened in the next week.", "接下来一周里已经开放的日期数。")}</div>
        </div>
        <div style={statCard(undoPayload ? "#fef2f2" : "#f8fafc", undoPayload ? "#fecaca" : "#e2e8f0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: undoPayload ? "#b91c1c" : "#475569" }}>{t(lang, "Undo status", "撤销状态")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: undoPayload ? "#b91c1c" : "#334155", marginTop: 8 }}>
            {undoPayload ? t(lang, "1 clear-day action available", "有 1 条可撤销清空记录") : t(lang, "Nothing pending", "暂无待撤销操作")}
          </div>
          <div style={{ color: undoPayload ? "#991b1b" : "#475569", marginTop: 4 }}>
            {undoPayload
              ? t(lang, "You can undo the latest clear-day action from this page.", "你可以在本页撤销最近一次清空当天操作。")
              : t(lang, "No recent clear-day action is waiting to be restored.", "最近没有等待恢复的清空当天操作。")}
          </div>
        </div>
      </section>

      <TeacherAvailabilityClient
        lang={lang as Lang}
        teacherId={teacher.id}
        initialSlots={slots.map((s) => ({ id: s.id, date: formatBusinessDateOnly(s.date), startMin: s.startMin, endMin: s.endMin }))}
        initialUndoPayload={undoPayload}
      />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import AdminTeacherAvailabilityClient from "./AdminTeacherAvailabilityClient";

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

  return (
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
  );
}

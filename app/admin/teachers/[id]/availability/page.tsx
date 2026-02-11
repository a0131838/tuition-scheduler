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
        weeklyTitle: t(lang, "Weekly Template (for bulk month generation)", "每周模板（用于批量生成整月）"),
        weeklyAutoSyncNote: t(
          lang,
          "Saving weekly template will auto-sync this month date slots.",
          "保存每周模板后，会自动同步本月按日期可用时段。",
        ),
        add: t(lang, "Add", "添加"),
        delete: t(lang, "Delete", "删除"),
        addWeekly: t(lang, "Add Weekly", "添加每周模板"),
        generate: t(lang, "Generate This Month From Weekly Template", "按每周模板生成本月"),
        noSlots: t(lang, "No slots", "无时段"),
        noWeekly: t(lang, "No weekly template yet.", "暂无每周模板。"),
      }}
    />
  );
}

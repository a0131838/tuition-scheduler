import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

const ATTENDED_STATUSES = ["PRESENT", "LATE"] as const;

function parseMonth(s?: string) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toDateRange(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const start = new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(parsed.year, parsed.month, 1, 0, 0, 0, 0);
  return { start, end };
}

export default async function MonthlyHoursReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; sourceChannelId?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const now = new Date();
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(now);
  const sourceChannelId = sp?.sourceChannelId ?? "";

  const range = toDateRange(month);
  if (!range) {
    return (
      <div>
        <h2>{t(lang, "Monthly Hours Report", "月度课时明细")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const [sources, rows] = await Promise.all([
    prisma.studentSourceChannel.findMany({ orderBy: { name: "asc" } }),
    prisma.attendance.findMany({
      where: {
        updatedAt: { gte: range.start, lt: range.end },
        status: { in: ATTENDED_STATUSES as any },
        ...(sourceChannelId ? { student: { sourceChannelId } } : {}),
      },
      include: {
        student: { include: { sourceChannel: true, studentType: true } },
        session: {
          include: {
            class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
  ]);

  const csvHref = `/admin/reports/monthly-hours/export?month=${encodeURIComponent(month)}${
    sourceChannelId ? `&sourceChannelId=${encodeURIComponent(sourceChannelId)}` : ""
  }`;

  return (
    <div>
      <h2>{t(lang, "Monthly Hours Report", "月度课时明细")}</h2>

      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "Month", "月份")}:
          <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "Source", "来源")}:
          <select name="sourceChannelId" defaultValue={sourceChannelId} style={{ marginLeft: 6 }}>
            <option value="">{t(lang, "All", "全部")}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
        <a href={csvHref}>{t(lang, "Export CSV", "导出CSV")}</a>
      </form>

      <div style={{ marginBottom: 12, color: "#666" }}>
        {t(
          lang,
          "Rule: only PRESENT/LATE attendances, grouped by attendance save time (Attendance.updatedAt).",
          "统计口径：仅统计 PRESENT/LATE 点名，按点名保存时间（Attendance.updatedAt）归属月份。"
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No data for this month.", "本月暂无数据")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Updated At", "更新时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Source", "来源")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Session Time", "课次时间")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Campus", "校区")}</th>
              <th align="left">{t(lang, "Room", "教室")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Deduct Count", "扣次数")}</th>
              <th align="left">{t(lang, "Deduct Minutes", "扣分钟")}</th>
              <th align="left">{t(lang, "Excused Charge", "请假扣费")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(r.updatedAt).toLocaleString()}</td>
                <td>
                  {r.student?.name ?? "-"}
                  <div style={{ color: "#999", fontSize: 12 }}>{r.studentId}</div>
                </td>
                <td>{r.student?.sourceChannel?.name ?? "-"}</td>
                <td>{r.student?.studentType?.name ?? "-"}</td>
                <td>
                  {new Date(r.session.startAt).toLocaleString()} -{" "}
                  {new Date(r.session.endAt).toLocaleTimeString()}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><ClassTypeBadge capacity={r.session.class.capacity} compact /><span>{r.session.class.course.name} / {r.session.class.subject?.name ?? "-"} / {r.session.class.level?.name ?? "-"}</span></div>
                </td>
                <td>{r.session.class.teacher.name}</td>
                <td>{r.session.class.campus.name}</td>
                <td>{r.session.class.room?.name ?? "(none)"}</td>
                <td>{r.status}</td>
                <td>{r.deductedCount}</td>
                <td>{r.deductedMinutes}</td>
                <td>{r.excusedCharge ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


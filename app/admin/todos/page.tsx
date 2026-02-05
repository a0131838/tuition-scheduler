import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";

const FORECAST_WINDOW_DAYS = 30;
const DEFAULT_WARN_DAYS = 14;
const DEFAULT_WARN_MINUTES = 120;

function fmtMinutes(m?: number | null) {
  if (m == null) return "-";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  if (mm === 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

function toInt(v: string | undefined, def: number) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : def;
}

export default async function AdminTodosPage({
  searchParams,
}: {
  searchParams?: { warnDays?: string; warnMinutes?: string };
}) {
  await requireAdmin();
  const lang = await getLang();
  const warnDays = Math.max(1, toInt(searchParams?.warnDays, DEFAULT_WARN_DAYS));
  const warnMinutes = Math.max(1, toInt(searchParams?.warnMinutes, DEFAULT_WARN_MINUTES));

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const unmarkedGrouped = await prisma.attendance.groupBy({
    by: ["sessionId"],
    where: {
      status: "UNMARKED",
      session: {
        startAt: { gte: dayStart, lte: dayEnd },
      },
    },
    _count: { _all: true },
  });
  const todaySessionIds = unmarkedGrouped.map((x) => x.sessionId);
  const sessionsToday = todaySessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: todaySessionIds } },
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
        orderBy: { startAt: "asc" },
      })
    : [];
  const unmarkedMap = new Map(unmarkedGrouped.map((x) => [x.sessionId, x._count._all]));

  const usageSince = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const packages = await prisma.coursePackage.findMany({
    where: {
      type: "HOURS",
      status: "ACTIVE",
      remainingMinutes: { gt: 0 },
    },
    include: { student: true, course: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  const packageIds = packages.map((p) => p.id);
  const deductedRows = packageIds.length
    ? await prisma.packageTxn.groupBy({
        by: ["packageId"],
        where: {
          packageId: { in: packageIds },
          kind: "DEDUCT",
          createdAt: { gte: usageSince },
        },
        _sum: { deltaMinutes: true },
      })
    : [];
  const deducted30Map = new Map(deductedRows.map((r) => [r.packageId, Math.abs(Math.min(0, r._sum.deltaMinutes ?? 0))]));

  const renewAlerts = packages
    .map((p) => {
      const remaining = p.remainingMinutes ?? 0;
      const deducted30 = deducted30Map.get(p.id) ?? 0;
      const avgPerDay = deducted30 / FORECAST_WINDOW_DAYS;
      const estDays = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;
      const lowMinutes = remaining <= warnMinutes;
      const lowDays = estDays != null && estDays <= warnDays;
      const isAlert = lowMinutes || lowDays;
      return { p, remaining, deducted30, estDays, lowMinutes, lowDays, isAlert };
    })
    .filter((x) => x.isAlert)
    .sort((a, b) => {
      const da = a.estDays ?? Number.MAX_SAFE_INTEGER;
      const db = b.estDays ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return a.remaining - b.remaining;
    });

  return (
    <div>
      <h2>{t(lang, "Todo Center", "待办中心")}</h2>
      <p style={{ color: "#666" }}>
        {t(
          lang,
          "Focus on today's attendance tasks and package renewal alerts.",
          "聚焦今日点名任务和课包续费预警。"
        )}
      </p>

      <h3>{t(lang, "Today's Attendance Tasks", "今日点名任务")}</h3>
      {sessionsToday.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No unmarked sessions today.", "今天没有未点名课次。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Session Time", "课次时间")}</th>
              <th align="left">{t(lang, "Class", "班级")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Campus", "校区")}</th>
              <th align="left">{t(lang, "Unmarked", "未点名")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {sessionsToday.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
                </td>
                <td>
                  {s.class.course.name}
                  {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                  {s.class.level ? ` / ${s.class.level.name}` : ""}
                </td>
                <td>{s.class.teacher.name}</td>
                <td>
                  {s.class.campus.name}
                  {s.class.room ? ` / ${s.class.room.name}` : ""}
                </td>
                <td>
                  <span style={{ color: "#b00", fontWeight: 700 }}>{unmarkedMap.get(s.id) ?? 0}</span>
                </td>
                <td>
                  <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Go Attendance", "去点名")}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Renewal Alerts", "续费预警")}</h3>
      <form method="GET" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <label>
          {t(lang, "Warn Days", "预警天数")}:
          <input name="warnDays" type="number" min={1} defaultValue={String(warnDays)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <label>
          {t(lang, "Warn Minutes", "预警分钟")}:
          <input
            name="warnMinutes"
            type="number"
            min={1}
            defaultValue={String(warnMinutes)}
            style={{ marginLeft: 6, width: 100 }}
          />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      {renewAlerts.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No renewal alerts.", "暂无续费预警。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Remaining", "剩余")}</th>
              <th align="left">{t(lang, "Usage 30d", "近30天消耗")}</th>
              <th align="left">{t(lang, "Forecast", "预计用完")}</th>
              <th align="left">{t(lang, "Alert", "预警")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {renewAlerts.map((x) => (
              <tr key={x.p.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{x.p.student?.name ?? "-"}</td>
                <td>{x.p.course?.name ?? "-"}</td>
                <td style={{ color: x.lowMinutes ? "#b00" : undefined, fontWeight: x.lowMinutes ? 700 : 400 }}>
                  {fmtMinutes(x.remaining)}
                </td>
                <td>{fmtMinutes(x.deducted30)} / {FORECAST_WINDOW_DAYS}d</td>
                <td>{x.estDays == null ? t(lang, "No usage (30d)", "近30天无消耗") : `${x.estDays} ${t(lang, "days", "天")}`}</td>
                <td style={{ color: "#b00", fontWeight: 700 }}>
                  {x.lowMinutes && x.lowDays
                    ? `${t(lang, "Low balance", "余额低")} + ${t(lang, "Likely to run out soon", "即将用完")}`
                    : x.lowMinutes
                    ? t(lang, "Low balance", "余额低")
                    : t(lang, "Likely to run out soon", "即将用完")}
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/admin/students/${x.p.studentId}`}>{t(lang, "Student Detail", "学生详情")}</a>
                  <a href={`/admin/packages/${x.p.id}/ledger`}>{t(lang, "Ledger", "对账单")}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

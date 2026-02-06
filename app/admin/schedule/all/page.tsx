import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";

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
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function ScheduleAllPage({
  searchParams,
}: {
  searchParams?: { weekStart?: string };
}) {
  const lang = await getLang();
  const base = searchParams?.weekStart ? parseYMD(searchParams.weekStart) : startOfWeekMonday(new Date());
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2>{t(lang, "All Schedule (Week)", "全周总览")}</h2>
        <a
          href={`/admin/schedule?weekStart=${ymd(weekStart)}`}
          style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}
        >
          {t(lang, "Back to Week View", "返回周课表")}
        </a>
      </div>
      <p style={{ color: "#666" }}>
        {t(lang, "Week", "周")}: <b>{ymd(weekStart)}</b> ~ <b>{ymd(addDays(weekStart, 6))}</b>
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <a href={`/admin/schedule/all?weekStart=${prevWeek}`}>← {t(lang, "Prev", "上一周")}</a>
        <a href={`/admin/schedule/all?weekStart=${thisWeek}`}>{t(lang, "Today", "本周")}</a>
        <a href={`/admin/schedule/all?weekStart=${nextWeek}`}>{t(lang, "Next", "下一周")} →</a>
      </div>

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
                    <div style={{ marginTop: 4, fontWeight: 700 }}>{title}</div>
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
  );
}

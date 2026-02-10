import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NoticeBanner from "../../../_components/NoticeBanner";
import BlurTimeInput from "@/app/_components/BlurTimeInput";
import { getLang, t } from "@/lib/i18n";

const WEEKDAYS = [
  { en: "Sun", zh: "周日" },
  { en: "Mon", zh: "周一" },
  { en: "Tue", zh: "周二" },
  { en: "Wed", zh: "周三" },
  { en: "Thu", zh: "周四" },
  { en: "Fri", zh: "周五" },
  { en: "Sat", zh: "周六" },
];
const AVAIL_MIN_TIME = "08:00";
const AVAIL_MAX_TIME = "22:50";
const AVAIL_MIN_MIN = 8 * 60;
const AVAIL_MAX_MIN = 22 * 60 + 50;

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseMonth(s?: string) {
  if (!s) return null;
  const [y, m] = s.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function inAllowedWindow(startMin: number, endMin: number) {
  return startMin >= AVAIL_MIN_MIN && endMin <= AVAIL_MAX_MIN;
}

function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();

  const startPad = first.getDay(); // 0=Sun
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const cells: Array<Date | null> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push(new Date(year, monthIndex, dayNum));
    }
  }

  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { first, last, weeks };
}

async function addDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const dateStr = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const month = String(formData.get("month") ?? "");

  if (!dateStr || !start || !end) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=Missing+input`);
  }

  const [Y, M, D] = dateStr.split("-").map(Number);
  const date = new Date(Y, M - 1, D, 0, 0, 0, 0);
  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=End+must+be+after+start`);
  }
  if (!inAllowedWindow(startMin, endMin)) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=Time+must+be+between+${AVAIL_MIN_TIME}+and+${AVAIL_MAX_TIME}`);
  }

  await prisma.teacherAvailabilityDate.create({
    data: { teacherId, date, startMin, endMin },
  });

  redirect(`/admin/teachers/${teacherId}/availability?month=${month}`);
}

async function deleteDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!id) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=Missing+id`);
  }

  await prisma.teacherAvailabilityDate.delete({ where: { id } });
  redirect(`/admin/teachers/${teacherId}/availability?month=${month}`);
}

async function addWeeklyAvailability(teacherId: string, formData: FormData) {
  "use server";
  const weekday = Number(formData.get("weekday"));
  const start = String(formData.get("start") ?? "18:00");
  const end = String(formData.get("end") ?? "20:00");
  const month = String(formData.get("month") ?? "");

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=End+must+be+after+start`);
  }
  if (!inAllowedWindow(startMin, endMin)) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=Time+must+be+between+${AVAIL_MIN_TIME}+and+${AVAIL_MAX_TIME}`);
  }

  await prisma.teacherAvailability.create({
    data: { teacherId, weekday, startMin, endMin },
  });

  redirect(`/admin/teachers/${teacherId}/availability?month=${month}`);
}

async function deleteWeeklyAvailability(teacherId: string, formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const month = String(formData.get("month") ?? "");

  await prisma.teacherAvailability.delete({ where: { id } });
  redirect(`/admin/teachers/${teacherId}/availability?month=${month}`);
}

async function generateMonthFromWeekly(teacherId: string, formData: FormData) {
  "use server";
  const month = String(formData.get("month") ?? "");
  const parsed = parseMonth(month);
  if (!parsed) {
    redirect(`/admin/teachers/${teacherId}/availability?err=Invalid+month`);
  }

  const { year, monthIndex } = parsed;
  const { first, last } = buildMonthGrid(year, monthIndex);

  const weekly = await prisma.teacherAvailability.findMany({
    where: { teacherId },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
  });

  if (weekly.length === 0) {
    redirect(`/admin/teachers/${teacherId}/availability?month=${month}&err=No+weekly+template`);
  }

  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: first, lte: last } },
    select: { date: true, startMin: true, endMin: true },
  });

  const exists = new Set(
    existing.map((e) => `${ymd(e.date)}|${e.startMin}|${e.endMin}`)
  );

  const creates: { date: Date; startMin: number; endMin: number }[] = [];

  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    const slots = weekly.filter((w) => w.weekday === weekday);
    if (slots.length === 0) continue;

    for (const s of slots) {
      const key = `${ymd(d)}|${s.startMin}|${s.endMin}`;
      if (exists.has(key)) continue;
      creates.push({ date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0), startMin: s.startMin, endMin: s.endMin });
    }
  }

  if (creates.length > 0) {
    await prisma.teacherAvailabilityDate.createMany({
      data: creates.map((c) => ({ teacherId, date: c.date, startMin: c.startMin, endMin: c.endMin })),
    });
  }

  redirect(`/admin/teachers/${teacherId}/availability?month=${month}&msg=Generated+${creates.length}`);
}

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ month?: string; err?: string; msg?: string }>;
}) {
  const lang = await getLang();
  const { id: teacherId } = await params;
  const sp = await searchParams;
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return <div>{t(lang, "Teacher not found.", "未找到老师。")}</div>;

  const now = new Date();
  const parsed = parseMonth(sp?.month) ?? { year: now.getFullYear(), monthIndex: now.getMonth() };
  const { year, monthIndex } = parsed;
  const { first, last, weeks } = buildMonthGrid(year, monthIndex);
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  const [dateAvails, weeklyAvails] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      where: { teacherId, date: { gte: first, lte: last } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
    }),
    prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    }),
  ]);

  const dateMap = new Map<string, typeof dateAvails>();
  for (const a of dateAvails) {
    const key = ymd(a.date);
    const arr = dateMap.get(key) ?? [];
    arr.push(a);
    dateMap.set(key, arr);
  }

  const prevMonth = monthKey(new Date(year, monthIndex - 1, 1));
  const nextMonth = monthKey(new Date(year, monthIndex + 1, 1));

  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";

  return (
    <div>
      <h2>{t(lang, "Availability", "可用时间")} - {teacher.name}</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href={`/admin/teachers/${teacherId}/availability?month=${prevMonth}`}>{t(lang, "Prev", "上个月")}</a>
        <div style={{ fontWeight: 700 }}>{month}</div>
        <a href={`/admin/teachers/${teacherId}/availability?month=${nextMonth}`}>{t(lang, "Next", "下个月")}</a>
      </div>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <h3 style={{ marginTop: 18 }}>{t(lang, "Monthly Availability (by date)", "月度可用时间（按日期）")}</h3>

      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {WEEKDAYS.map((d, i) => (
              <th key={i} align="left">{t(lang, d.en, d.zh)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                if (!day) return <td key={j} style={{ border: "1px solid #eee", height: 120 }} />;
                const key = ymd(day);
                const list = dateMap.get(key) ?? [];

                return (
                  <td key={j} style={{ border: "1px solid #eee", verticalAlign: "top", padding: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{day.getDate()}</div>

                    {list.length === 0 ? (
                      <div style={{ color: "#999", fontSize: 12 }}>{t(lang, "No slots", "无时段")}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 4, marginBottom: 6 }}>
                        {list.map((a) => (
                          <form key={a.id} action={deleteDateAvailability.bind(null, teacherId)} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontFamily: "monospace" }}>{fromMin(a.startMin)}-{fromMin(a.endMin)}</span>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="month" value={month} />
                            <button type="submit">{t(lang, "Delete", "删除")}</button>
                          </form>
                        ))}
                      </div>
                    )}

                    <form action={addDateAvailability.bind(null, teacherId)} style={{ display: "grid", gap: 4 }}>
                      <input type="hidden" name="date" value={key} />
                      <input type="hidden" name="month" value={month} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="18:00" />
                        <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="20:00" />
                      </div>
                      <button type="submit">{t(lang, "Add", "添加")}</button>
                    </form>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>{t(lang, "Weekly Template (for bulk month generation)", "每周模板（用于批量生成整月）")}</h3>
      <form action={addWeeklyAvailability.bind(null, teacherId)} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="hidden" name="month" value={month} />
        <select name="weekday" defaultValue="1">
          {WEEKDAYS.map((w, i) => (
            <option key={i} value={i}>{t(lang, w.en, w.zh)}({i})</option>
          ))}
        </select>
        <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="18:00" />
        <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="20:00" />
        <button type="submit">{t(lang, "Add Weekly", "添加每周模板")}</button>
      </form>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Weekday", "星期")}</th>
            <th align="left">{t(lang, "Start", "开始")}</th>
            <th align="left">{t(lang, "End", "结束")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {weeklyAvails.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{WEEKDAYS[a.weekday] ? t(lang, WEEKDAYS[a.weekday].en, WEEKDAYS[a.weekday].zh) : a.weekday}</td>
              <td>{fromMin(a.startMin)}</td>
              <td>{fromMin(a.endMin)}</td>
              <td>
                <form action={deleteWeeklyAvailability.bind(null, teacherId)}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="month" value={month} />
                  <button type="submit">{t(lang, "Delete", "删除")}</button>
                </form>
              </td>
            </tr>
          ))}
          {weeklyAvails.length === 0 && (
            <tr>
              <td colSpan={4}>{t(lang, "No weekly template yet.", "暂无每周模板。")}</td>
            </tr>
          )}
        </tbody>
      </table>

      <form action={generateMonthFromWeekly.bind(null, teacherId)}>
        <input type="hidden" name="month" value={month} />
        <button type="submit">{t(lang, "Generate This Month From Weekly Template", "按每周模板生成本月")}</button>
      </form>
    </div>
  );
}



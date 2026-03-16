import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { getVisibleSessionStudents } from "@/lib/session-students";

function parseMonth(s?: string) {
  if (!s) return null;
  const [y, m] = s.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMin(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startPad = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const cells: Array<Date | null> = [];
  for (let i = 0; i < totalCells; i += 1) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > daysInMonth) cells.push(null);
    else cells.push(new Date(year, monthIndex, dayNum));
  }
  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks };
}

type Interval = { startMin: number; endMin: number };

function mergeIntervals(list: Interval[]) {
  if (list.length <= 1) return list.slice();
  const sorted = [...list].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out: Interval[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (!last || cur.startMin > last.endMin) {
      out.push({ ...cur });
    } else if (cur.endMin > last.endMin) {
      last.endMin = cur.endMin;
    }
  }
  return out;
}

function subtractOne(base: Interval, busy: Interval) {
  const s = Math.max(base.startMin, busy.startMin);
  const e = Math.min(base.endMin, busy.endMin);
  if (s >= e) return [base];
  const out: Interval[] = [];
  if (base.startMin < s) out.push({ startMin: base.startMin, endMin: s });
  if (e < base.endMin) out.push({ startMin: e, endMin: base.endMin });
  return out;
}

function subtractIntervals(avails: Interval[], busy: Interval[]) {
  let free = avails.slice();
  for (const b of busy) {
    const next: Interval[] = [];
    for (const f of free) next.push(...subtractOne(f, b));
    free = next;
    if (free.length === 0) break;
  }
  return free.filter((x) => x.endMin > x.startMin);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function TeacherCalendarPage({
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
  const month = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, "0")}`;
  const first = new Date(parsed.year, parsed.monthIndex, 1, 0, 0, 0, 0);
  const last = new Date(parsed.year, parsed.monthIndex + 1, 0, 23, 59, 59, 999);
  const grid = buildMonthGrid(parsed.year, parsed.monthIndex);
  const prevMonth = monthKey(new Date(parsed.year, parsed.monthIndex - 1, 1));
  const nextMonth = monthKey(new Date(parsed.year, parsed.monthIndex + 1, 1));

  const [dateAvails, sessions] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      where: { teacherId, date: { gte: first, lte: last } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      select: { id: true, date: true, startMin: true, endMin: true },
    }),
    prisma.session.findMany({
      where: {
        startAt: { lte: last },
        endAt: { gte: first },
        OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      },
      orderBy: [{ startAt: "asc" }],
      include: {
        student: { select: { id: true, name: true } },
        attendances: { select: { studentId: true, status: true } },
        class: {
          select: {
            capacity: true,
            oneOnOneStudentId: true,
            course: { select: { name: true } },
            subject: { select: { name: true } },
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: { select: { studentId: true, student: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const availMap = new Map<string, Interval[]>();
  for (const a of dateAvails) {
    const key = ymd(a.date);
    const arr = availMap.get(key) ?? [];
    arr.push({ startMin: a.startMin, endMin: a.endMin });
    availMap.set(key, arr);
  }
  for (const [k, arr] of availMap.entries()) availMap.set(k, mergeIntervals(arr));

  const sessionMap = new Map<
    string,
    Array<{
      id: string;
      startMin: number;
      endMin: number;
      label: string;
      studentLabel: string;
    }>
  >();
  for (const s of sessions) {
    const visibleStudents = getVisibleSessionStudents(s);
    if (visibleStudents.length === 0) continue;
    const key = ymd(new Date(s.startAt));
    const arr = sessionMap.get(key) ?? [];
    const studentLabel =
      visibleStudents.length === 1
        ? visibleStudents[0]?.name ?? t(lang, "Group", "班课")
        : `${visibleStudents.length} ${t(lang, "students", "名学生")}`;
    arr.push({
      id: s.id,
      startMin: toMin(new Date(s.startAt)),
      endMin: toMin(new Date(s.endAt)),
      label: s.class.subject?.name ?? s.class.course.name,
      studentLabel,
    });
    sessionMap.set(key, arr);
  }
  for (const [k, arr] of sessionMap.entries()) {
    arr.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    sessionMap.set(k, arr);
  }

  return (
    <div>
      <h2>
        {t(lang, "Teacher Month Calendar", "老师月历")} - {teacher.name}
      </h2>
      <div style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <a href={`/admin/teachers/${teacherId}`}>{"<-"} {t(lang, "Back to Teacher Detail", "返回老师详情")}</a>
        <a href={`/admin/teachers/${teacherId}/availability`}>{t(lang, "Edit Availability", "编辑可排时间")}</a>
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href={`/admin/teachers/${teacherId}/calendar?month=${encodeURIComponent(prevMonth)}`}>{t(lang, "Prev", "上个月")}</a>
        <div style={{ fontWeight: 700 }}>{month}</div>
        <a href={`/admin/teachers/${teacherId}/calendar?month=${encodeURIComponent(nextMonth)}`}>{t(lang, "Next", "下个月")}</a>
      </div>

      <div style={{ marginBottom: 12, color: "#555", fontSize: 12 }}>
        {t(lang, "Each day shows scheduled sessions and remaining available slots.", "每天同格展示已排课次和剩余可排时段。")}
      </div>

      <table cellPadding={6} style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {WEEKDAYS.map((w) => (
              <th key={w} align="left">{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (!day) return <td key={di} style={{ border: "1px solid #eee", height: 180, background: "#f8fafc" }} />;
                const key = ymd(day);
                const daySessions = sessionMap.get(key) ?? [];
                const dayBusy = mergeIntervals(daySessions.map((s) => ({ startMin: s.startMin, endMin: s.endMin })));
                const dayAvail = availMap.get(key) ?? [];
                const dayFree = subtractIntervals(dayAvail, dayBusy);
                const hasScheduled = daySessions.length > 0;
                const hasFree = dayFree.length > 0;
                const dayBorderColor = hasScheduled && hasFree ? "#d97706" : hasScheduled ? "#2563eb" : hasFree ? "#16a34a" : "#cbd5e1";
                const dayBg = hasScheduled && hasFree ? "#fff7ed" : hasScheduled ? "#eff6ff" : hasFree ? "#f0fdf4" : "#f8fafc";

                return (
                  <td
                    key={di}
                    style={{
                      border: `2px solid ${dayBorderColor}`,
                      background: dayBg,
                      verticalAlign: "top",
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{day.getDate()}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "#dbeafe",
                            color: "#1d4ed8",
                            fontWeight: 700,
                          }}
                        >
                          {t(lang, "Scheduled", "已排")} {daySessions.length}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "#dcfce7",
                            color: "#166534",
                            fontWeight: 700,
                          }}
                        >
                          {t(lang, "Free", "可排")} {dayFree.length}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginBottom: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
                        {t(lang, "Scheduled", "已排")}
                      </div>
                      {daySessions.length === 0 ? (
                        <div style={{ color: "#999", fontSize: 12 }}>-</div>
                      ) : (
                        <div style={{ display: "grid", gap: 4 }}>
                          {daySessions.map((s) => (
                            <div
                              key={s.id}
                              style={{
                                fontSize: 12,
                                background: "white",
                                border: "1px solid #dbeafe",
                                borderRadius: 6,
                                padding: "3px 6px",
                              }}
                            >
                              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fromMin(s.startMin)}-{fromMin(s.endMin)}</span>{" "}
                              <span style={{ fontWeight: 700 }}>{s.studentLabel}</span>{" "}
                              <span style={{ color: "#666" }}>| {s.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>
                        {t(lang, "Free to Schedule", "可排")}
                      </div>
                      {dayFree.length === 0 ? (
                        <div style={{ color: "#999", fontSize: 12 }}>-</div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {dayFree.map((f, idx) => (
                            <div
                              key={`${key}-${idx}`}
                              style={{
                                fontFamily: "monospace",
                                fontSize: 12,
                                color: "#166534",
                                border: "1px solid #86efac",
                                borderRadius: 999,
                                padding: "2px 8px",
                                background: "white",
                              }}
                            >
                              {fromMin(f.startMin)}-{fromMin(f.endMin)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

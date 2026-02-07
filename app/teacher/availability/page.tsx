import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import ConfirmSubmitButton from "@/app/admin/_components/ConfirmSubmitButton";
import BlurTimeInput from "@/app/_components/BlurTimeInput";

const WEEKDAYS = [
  { value: 0, en: "Sun", zh: "周日" },
  { value: 1, en: "Mon", zh: "周一" },
  { value: 2, en: "Tue", zh: "周二" },
  { value: 3, en: "Wed", zh: "周三" },
  { value: 4, en: "Thu", zh: "周四" },
  { value: 5, en: "Fri", zh: "周五" },
  { value: 6, en: "Sat", zh: "周六" },
];
const AVAILABILITY_UNDO_KEY_PREFIX = "teacher_availability_last_undo:";
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

function mergeSlots(slots: Array<{ startMin: number; endMin: number }>) {
  if (slots.length === 0) return [] as Array<{ startMin: number; endMin: number }>;
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const merged: Array<{ startMin: number; endMin: number }> = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (!last || s.startMin > last.endMin) {
      merged.push({ startMin: s.startMin, endMin: s.endMin });
    } else if (s.endMin > last.endMin) {
      last.endMin = s.endMin;
    }
  }
  return merged;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseYMD(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function inAllowedWindow(startMin: number, endMin: number) {
  return startMin >= AVAIL_MIN_MIN && endMin <= AVAIL_MAX_MIN;
}

function dayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function undoKey(teacherId: string) {
  return `${AVAILABILITY_UNDO_KEY_PREFIX}${teacherId}`;
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

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCalendarDays(start: Date, end: Date) {
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

  const days: Date[] = [];
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

async function createRangeSlots(params: {
  teacherId: string;
  from: Date;
  to: Date;
  weekdays: number[];
  startMin: number;
  endMin: number;
}) {
  const { teacherId, from, to, weekdays, startMin, endMin } = params;
  const weekdaySet = new Set(weekdays.filter((x) => x >= 0 && x <= 6));
  if (weekdaySet.size === 0) return 0;

  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: from, lte: to } },
    select: { date: true, startMin: true, endMin: true },
  });
  const existSet = new Set(existing.map((e) => `${ymd(new Date(e.date))}|${e.startMin}|${e.endMin}`));

  const creates: { teacherId: string; date: Date; startMin: number; endMin: number }[] = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (!weekdaySet.has(d.getDay())) continue;
    const key = `${ymd(d)}|${startMin}|${endMin}`;
    if (existSet.has(key)) continue;
    creates.push({
      teacherId,
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
      startMin,
      endMin,
    });
  }

  if (creates.length > 0) {
    await prisma.teacherAvailabilityDate.createMany({ data: creates });
  }
  return creates.length;
}

async function addDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const dateStr = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  if (!dateStr || !start || !end) redirect("/teacher/availability?err=Missing+input");

  const date = parseYMD(dateStr);
  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) redirect("/teacher/availability?err=End+must+be+after+start");
  if (!inAllowedWindow(startMin, endMin)) {
    redirect(`/teacher/availability?err=Time+must+be+between+${AVAIL_MIN_TIME}+and+${AVAIL_MAX_TIME}`);
  }

  await prisma.teacherAvailabilityDate.create({ data: { teacherId, date, startMin, endMin } });
  redirect("/teacher/availability?msg=Added+1");
}

async function addBulkDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const weekdayVals = formData.getAll("weekday").map((v) => Number(String(v)));

  if (!from || !to || !start || !end || weekdayVals.length === 0) {
    redirect("/teacher/availability?err=Missing+input+for+bulk+add");
  }

  const startDate = parseYMD(from);
  const endDate = parseYMD(to);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    redirect("/teacher/availability?err=Invalid+date+range");
  }

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) redirect("/teacher/availability?err=End+must+be+after+start");
  if (!inAllowedWindow(startMin, endMin)) {
    redirect(`/teacher/availability?err=Time+must+be+between+${AVAIL_MIN_TIME}+and+${AVAIL_MAX_TIME}`);
  }

  const added = await createRangeSlots({
    teacherId,
    from: startDate,
    to: endDate,
    weekdays: weekdayVals,
    startMin,
    endMin,
  });

  redirect(`/teacher/availability?msg=Bulk+added+${added}`);
}

async function deleteDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/teacher/availability?err=Missing+id");
  await prisma.teacherAvailabilityDate.delete({ where: { id } });
  redirect("/teacher/availability?msg=Deleted+1");
}

async function updateDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  if (!id || !start || !end) redirect("/teacher/availability?err=Missing+input");
  const startMin = toMin(start);
  const endMin = toMin(end);
  if (endMin <= startMin) redirect("/teacher/availability?err=End+must+be+after+start");
  if (!inAllowedWindow(startMin, endMin)) {
    redirect(`/teacher/availability?err=Time+must+be+between+${AVAIL_MIN_TIME}+and+${AVAIL_MAX_TIME}`);
  }

  await prisma.teacherAvailabilityDate.update({
    where: { id, teacherId },
    data: { startMin, endMin },
  });
  redirect("/teacher/availability?msg=Updated+1");
}

async function deleteWholeDayAvailability(teacherId: string, formData: FormData) {
  "use server";
  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) redirect("/teacher/availability?err=Missing+date");
  const date = parseYMD(dateStr);
  const { start, end } = dayRange(date);

  const [sessionCount, apptCount] = await Promise.all([
    prisma.session.count({
      where: {
        startAt: { lte: end },
        endAt: { gte: start },
        OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      },
    }),
    prisma.appointment.count({
      where: {
        teacherId,
        startAt: { lte: end },
        endAt: { gte: start },
      },
    }),
  ]);

  if (sessionCount > 0 || apptCount > 0) {
    redirect(
      `/teacher/availability?err=Cannot+clear+${dateStr}%3A+${sessionCount}+sessions+and+${apptCount}+appointments+exist`
    );
  }

  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date },
    select: { date: true, startMin: true, endMin: true },
  });
  if (slots.length === 0) redirect(`/teacher/availability?err=No+slots+to+clear+on+${dateStr}`);

  const payload: AvailabilityUndoPayload = {
    type: "CLEAR_DAY",
    teacherId,
    date: dateStr,
    createdAt: new Date().toISOString(),
    slots: slots.map((s) => ({
      date: ymd(new Date(s.date)),
      startMin: s.startMin,
      endMin: s.endMin,
    })),
  };

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: undoKey(teacherId) },
      create: { key: undoKey(teacherId), value: JSON.stringify(payload) },
      update: { value: JSON.stringify(payload) },
    }),
    prisma.teacherAvailabilityDate.deleteMany({ where: { teacherId, date } }),
  ]);

  redirect(`/teacher/availability?msg=Deleted+all+on+${dateStr}.+You+can+undo+this+action`);
}

async function undoLastClearDayAvailability(teacherId: string) {
  "use server";
  const row = await prisma.appSetting.findUnique({
    where: { key: undoKey(teacherId) },
    select: { value: true },
  });
  const payload = parseUndoPayload(row?.value);
  if (!payload || payload.teacherId !== teacherId || payload.slots.length === 0) {
    redirect("/teacher/availability?err=No+undo+snapshot+available");
  }

  const dates = Array.from(new Set(payload.slots.map((s) => s.date))).map((d) => parseYMD(d));
  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { in: dates } },
    select: { date: true, startMin: true, endMin: true },
  });
  const existSet = new Set(existing.map((e) => `${ymd(new Date(e.date))}|${e.startMin}|${e.endMin}`));

  const creates = payload.slots
    .filter((s) => !existSet.has(`${s.date}|${s.startMin}|${s.endMin}`))
    .map((s) => ({
      teacherId,
      date: parseYMD(s.date),
      startMin: s.startMin,
      endMin: s.endMin,
    }));

  await prisma.$transaction([
    ...(creates.length > 0 ? [prisma.teacherAvailabilityDate.createMany({ data: creates })] : []),
    prisma.appSetting.update({
      where: { key: undoKey(teacherId) },
      data: { value: "" },
    }),
  ]);

  redirect(`/teacher/availability?msg=Undo+done,+restored+${creates.length}+slots`);
}

export default async function TeacherAvailabilityPage({
  searchParams,
}: {
  searchParams?: { err?: string; msg?: string };
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  const slotMap = new Map<string, typeof slots>();
  for (const s of slots) {
    const key = ymd(new Date(s.date));
    const arr = slotMap.get(key) ?? [];
    arr.push(s);
    slotMap.set(key, arr);
  }

  const undoRow = await prisma.appSetting.findUnique({
    where: { key: undoKey(teacher.id) },
    select: { value: true },
  });
  const undoPayload = parseUndoPayload(undoRow?.value);

  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const todayYMD = ymd(today);
  const in4Weeks = new Date(today);
  in4Weeks.setDate(in4Weeks.getDate() + 28);
  const in4WeeksYMD = ymd(in4Weeks);

  const days = buildCalendarDays(start, end);
  const header = [
    t(lang, "Sun", "周日"),
    t(lang, "Mon", "周一"),
    t(lang, "Tue", "周二"),
    t(lang, "Wed", "周三"),
    t(lang, "Thu", "周四"),
    t(lang, "Fri", "周五"),
    t(lang, "Sat", "周六"),
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>{t(lang, "My Availability", "我的可上课时间")}</h2>
      {err && <div style={{ color: "#b00", marginBottom: 2 }}>{err}</div>}
      {msg && <div style={{ color: "#087", marginBottom: 2 }}>{msg}</div>}

      {undoPayload ? (
        <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8, padding: 10 }}>
          <div style={{ marginBottom: 6 }}>
            {t(lang, "Undo available for last clear-day action", "有可撤回的最近清空操作")} ({undoPayload.date})
          </div>
          <form action={undoLastClearDayAvailability.bind(null, teacher.id)}>
            <button type="submit">{t(lang, "Undo last clear-day", "撤回上次清空当天")}</button>
          </form>
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "Quick Add (Single Day)", "快速添加（单日）")}</div>
        <form action={addDateAvailability.bind(null, teacher.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="date" type="date" required defaultValue={todayYMD} />
          <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="16:00" />
          <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="20:00" />
          <button type="submit">{t(lang, "Add", "添加")}</button>
        </form>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "Bulk Add by Date Range", "批量添加（日期区间）")}</div>
        <form action={addBulkDateAvailability.bind(null, teacher.id)} style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              {t(lang, "From", "从")}
              <input name="from" type="date" required defaultValue={todayYMD} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {t(lang, "To", "到")}
              <input name="to" type="date" required defaultValue={in4WeeksYMD} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {t(lang, "Start", "开始")}
              <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="16:00" style={{ marginLeft: 6 }} />
            </label>
            <label>
              {t(lang, "End", "结束")}
              <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="20:00" style={{ marginLeft: 6 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {WEEKDAYS.map((d) => (
              <label key={d.value} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" name="weekday" value={String(d.value)} defaultChecked={d.value >= 1 && d.value <= 5} />
                {t(lang, d.en, d.zh)}
              </label>
            ))}
          </div>
          <div>
            <button type="submit">{t(lang, "Bulk Add", "批量添加")}</button>
          </div>
        </form>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "Availability Calendar (Next 30 days)", "未来30天可上课日历")}</div>
        <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {header.map((h) => (
                <th key={h} align="left" style={{ border: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, row) => (
              <tr key={row}>
                {days.slice(row * 7, row * 7 + 7).map((d) => {
                  const key = ymd(d);
                  const inRange = d >= start && d <= end;
                  const daySlots = slotMap.get(key) ?? [];
                  const mergedDaySlots = mergeSlots(daySlots);
                  return (
                    <td
                      key={key}
                      style={{
                        border: "1px solid #e5e7eb",
                        verticalAlign: "top",
                        width: `${100 / 7}%`,
                        minHeight: 130,
                        background: inRange ? "#fff" : "#f8fafc",
                        opacity: inRange ? 1 : 0.55,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 4, alignItems: "center" }}>
                        <b>{d.getDate()}</b>
                        {inRange && daySlots.length > 0 ? (
                          <form action={deleteWholeDayAvailability.bind(null, teacher.id)}>
                            <input type="hidden" name="date" value={key} />
                            <ConfirmSubmitButton message={`${t(lang, "Clear all availability slots on", "确定清空当天全部时段")} ${key}?`}>
                              <span style={{ color: "#b91c1c", fontSize: 11 }}>{t(lang, "Clear day", "清空当天")}</span>
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>

                      <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                        {inRange ? (
                          daySlots.length > 0 ? (
                            mergedDaySlots.map((s, idx) => (
                              <div
                                key={`${key}-merged-${idx}-${s.startMin}-${s.endMin}`}
                                style={{
                                  border: "1px solid #dbeafe",
                                  borderRadius: 6,
                                  background: "#f8fbff",
                                  padding: "4px 6px",
                                  fontSize: 12,
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ fontWeight: 700 }}>{fromMin(s.startMin)} - {fromMin(s.endMin)}</span>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: 12 }}>{t(lang, "No slots", "无时段")}</div>
                          )
                        ) : (
                          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{t(lang, "Out of range", "范围外")}</div>
                        )}

                        {inRange ? (
                          daySlots.length > 0 ? (
                            <details style={{ marginTop: 2 }}>
                              <summary style={{ cursor: "pointer", fontSize: 11 }}>{t(lang, "Manage raw slots", "管理原始时段")}</summary>
                              <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                                {daySlots.map((s) => (
                                  <div
                                    key={s.id}
                                    style={{
                                      border: "1px solid #dbeafe",
                                      borderRadius: 6,
                                      background: "#f8fbff",
                                      padding: "4px 6px",
                                      fontSize: 12,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 4,
                                      alignItems: "center",
                                    }}
                                  >
                                    <span style={{ fontWeight: 700 }}>{fromMin(s.startMin)} - {fromMin(s.endMin)}</span>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <details>
                                        <summary style={{ cursor: "pointer", fontSize: 11 }}>{t(lang, "Edit", "编辑")}</summary>
                                        <form
                                          action={updateDateAvailability.bind(null, teacher.id)}
                                          style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}
                                        >
                                          <input type="hidden" name="id" value={s.id} />
                                          <BlurTimeInput
                                            name="start"
                                            min={AVAIL_MIN_TIME}
                                            max={AVAIL_MAX_TIME}
                                            step={600}
                                            defaultValue={fromMin(s.startMin)}
                                            style={{ fontSize: 11, width: 82 }}
                                          />
                                          <span style={{ fontSize: 11 }}>-</span>
                                          <BlurTimeInput
                                            name="end"
                                            min={AVAIL_MIN_TIME}
                                            max={AVAIL_MAX_TIME}
                                            step={600}
                                            defaultValue={fromMin(s.endMin)}
                                            style={{ fontSize: 11, width: 82 }}
                                          />
                                          <button type="submit" style={{ fontSize: 11 }}>{t(lang, "Save", "保存")}</button>
                                        </form>
                                      </details>
                                      <form action={deleteDateAvailability.bind(null, teacher.id)}>
                                        <input type="hidden" name="id" value={s.id} />
                                        <button type="submit" style={{ fontSize: 11 }}>{t(lang, "Del", "删")}</button>
                                      </form>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null
                        ) : null}

                        {inRange ? (
                          <details style={{ marginTop: 2, paddingTop: 4, borderTop: "1px dashed #e5e7eb" }}>
                            <summary style={{ cursor: "pointer", fontSize: 11 }}>{t(lang, "Add slot", "添加时段")}</summary>
                            <form
                              action={addDateAvailability.bind(null, teacher.id)}
                              style={{
                                marginTop: 6,
                                display: "flex",
                                gap: 4,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <input type="hidden" name="date" value={key} />
                              <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} defaultValue="16:00" style={{ fontSize: 11, width: 82 }} />
                              <span style={{ fontSize: 11 }}>-</span>
                              <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} defaultValue="18:00" style={{ fontSize: 11, width: 82 }} />
                              <button type="submit" style={{ fontSize: 11 }}>{t(lang, "Add", "添加")}</button>
                            </form>
                          </details>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

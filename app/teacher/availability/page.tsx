import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";

const WEEKDAYS = [
  { value: 0, en: "Sun", zh: "\u5468\u65e5" },
  { value: 1, en: "Mon", zh: "\u5468\u4e00" },
  { value: 2, en: "Tue", zh: "\u5468\u4e8c" },
  { value: 3, en: "Wed", zh: "\u5468\u4e09" },
  { value: 4, en: "Thu", zh: "\u5468\u56db" },
  { value: 5, en: "Fri", zh: "\u5468\u4e94" },
  { value: 6, en: "Sat", zh: "\u5468\u516d" },
];

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

function parseYMD(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
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

  const weekdaySet = new Set(weekdayVals.filter((x) => x >= 0 && x <= 6));
  if (weekdaySet.size === 0) redirect("/teacher/availability?err=No+weekday+selected");

  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: startDate, lte: endDate } },
    select: { date: true, startMin: true, endMin: true },
  });
  const existSet = new Set(existing.map((e) => `${ymd(new Date(e.date))}|${e.startMin}|${e.endMin}`));

  const creates: { teacherId: string; date: Date; startMin: number; endMin: number }[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    if (!weekdaySet.has(weekday)) continue;
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

  redirect(`/teacher/availability?msg=Bulk+added+${creates.length}`);
}

async function deleteDateAvailability(teacherId: string, formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/teacher/availability?err=Missing+id");
  await prisma.teacherAvailabilityDate.delete({ where: { id } });
  redirect("/teacher/availability");
}

export default async function TeacherAvailabilityPage({
  searchParams,
}: {
  searchParams?: { err?: string; msg?: string };
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "\u8001\u5e08\u8d44\u6599\u672a\u5173\u8054\u3002")}</div>;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 60);
  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const todayYMD = ymd(today);
  const in4Weeks = new Date(today);
  in4Weeks.setDate(in4Weeks.getDate() + 28);
  const in4WeeksYMD = ymd(in4Weeks);

  return (
    <div>
      <h2>{t(lang, "My Availability", "\u6211\u7684\u53ef\u4e0a\u8bfe\u65f6\u95f4")}</h2>
      {err && <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div>}

      <h3>{t(lang, "Quick Add (Single Day)", "\u5feb\u901f\u6dfb\u52a0\uff08\u5355\u65e5\uff09")}</h3>
      <form action={addDateAvailability.bind(null, teacher.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input name="date" type="date" required defaultValue={todayYMD} />
        <input name="start" type="time" required defaultValue="16:00" />
        <input name="end" type="time" required defaultValue="20:00" />
        <button type="submit">{t(lang, "Add", "\u6dfb\u52a0")}</button>
      </form>

      <h3>{t(lang, "Bulk Add by Date Range", "\u6279\u91cf\u6dfb\u52a0\uff08\u65e5\u671f\u533a\u95f4\uff09")}</h3>
      <form action={addBulkDateAvailability.bind(null, teacher.id)} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            {t(lang, "From", "\u4ece")}:
            <input name="from" type="date" required defaultValue={todayYMD} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {t(lang, "To", "\u5230")}:
            <input name="to" type="date" required defaultValue={in4WeeksYMD} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {t(lang, "Start", "\u5f00\u59cb")}:
            <input name="start" type="time" required defaultValue="16:00" style={{ marginLeft: 6 }} />
          </label>
          <label>
            {t(lang, "End", "\u7ed3\u675f")}:
            <input name="end" type="time" required defaultValue="20:00" style={{ marginLeft: 6 }} />
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
          <button type="submit">{t(lang, "Bulk Add", "\u6279\u91cf\u6dfb\u52a0")}</button>
        </div>
      </form>

      {slots.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No availability in next 60 days.", "\u672a\u676560\u5929\u6682\u65e0\u53ef\u4e0a\u8bfe\u65f6\u95f4\u3002")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Date", "\u65e5\u671f")}</th>
              <th align="left">{t(lang, "Time", "\u65f6\u95f4")}</th>
              <th align="left">{t(lang, "Action", "\u64cd\u4f5c")}</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{ymd(new Date(s.date))}</td>
                <td>{fromMin(s.startMin)} - {fromMin(s.endMin)}</td>
                <td>
                  <form action={deleteDateAvailability.bind(null, teacher.id)}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit">{t(lang, "Delete", "\u5220\u9664")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

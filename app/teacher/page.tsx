import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

const TEACHER_SELF_CONFIRM_TODAY = "TEACHER_SELF_CONFIRM_TODAY";
const TEACHER_SELF_CONFIRM_TOMORROW = "TEACHER_SELF_CONFIRM_TOMORROW";

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function confirmTeacherCourses(dayKind: "today" | "tomorrow", formData: FormData) {
  "use server";
  const { teacher } = await requireTeacherProfile();
  if (!teacher) redirect("/teacher?err=Teacher+profile+not+linked");

  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) redirect("/teacher?err=Invalid+date");
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) redirect("/teacher?err=Invalid+date");

  const type = dayKind === "today" ? TEACHER_SELF_CONFIRM_TODAY : TEACHER_SELF_CONFIRM_TOMORROW;
  await prisma.todoReminderConfirm.upsert({
    where: { type_targetId_date: { type, targetId: teacher.id, date } },
    create: { type, targetId: teacher.id, date },
    update: { createdAt: new Date() },
  });

  redirect(`/teacher?msg=${dayKind === "today" ? "Today+courses+confirmed" : "Tomorrow+courses+confirmed"}`);
}

export default async function TeacherHomePage({
  searchParams,
}: {
  searchParams?: { msg?: string; err?: string };
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();

  if (!teacher) {
    return (
      <div>
        <h2>{t(lang, "Teacher Profile Not Linked", "老师资料未关联")}</h2>
        <p style={{ color: "#b00" }}>
          {t(
            lang,
            "Cannot find a linked Teacher profile for this account. Ask admin to link your teacher account.",
            "未找到与当前账号绑定的老师档案，请联系教务在老师详情页完成账号绑定。"
          )}
        </p>
      </div>
    );
  }

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(todayEnd.getDate() + 1);

  const [todaySessions, tomorrowSessions, todayConfirmed, tomorrowConfirmed] = await Promise.all([
    prisma.session.findMany({
      where: {
        startAt: { gte: todayStart, lte: todayEnd },
        OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      },
      include: { class: { include: { course: true, subject: true, level: true, campus: true, room: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: {
        startAt: { gte: tomorrowStart, lte: tomorrowEnd },
        OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      },
      include: { class: { include: { course: true, subject: true, level: true, campus: true, room: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.todoReminderConfirm.findUnique({
      where: {
        type_targetId_date: {
          type: TEACHER_SELF_CONFIRM_TODAY,
          targetId: teacher.id,
          date: toDateOnly(todayStart),
        },
      },
    }),
    prisma.todoReminderConfirm.findUnique({
      where: {
        type_targetId_date: {
          type: TEACHER_SELF_CONFIRM_TOMORROW,
          targetId: teacher.id,
          date: toDateOnly(tomorrowStart),
        },
      },
    }),
  ]);

  return (
    <div>
      <h2>{t(lang, "Teacher Dashboard", "老师工作台")}</h2>
      <p>
        {t(lang, "Welcome", "欢迎")} {teacher.name}
      </p>
      {err ? <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 8 }}>{msg}</div> : null}

      <div
        style={{
          margin: "12px 0 16px",
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontWeight: 600 }}>{t(lang, "Teacher Intro", "老师介绍")}</div>
          <a href="/teacher/card" style={{ fontSize: 12 }}>
            {t(lang, "Edit Intro", "编辑介绍")}
          </a>
        </div>
        <div style={{ color: "#444", whiteSpace: "pre-wrap" }}>
          {teacher.intro || t(lang, "No intro yet. You can update it in My Teacher Card.", "暂无介绍，可在我的老师名片中自行完善。")}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: 12, background: "#fffbeb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Today's Courses", "今日课程")} ({todaySessions.length})</h3>
            {todayConfirmed ? (
              <span style={{ color: "#166534", fontWeight: 700 }}>
                {t(lang, "Confirmed", "已确认")}: {todayConfirmed.createdAt.toLocaleTimeString()}
              </span>
            ) : (
              <form action={confirmTeacherCourses.bind(null, "today")}>
                <input type="hidden" name="date" value={toDateInputValue(todayStart)} />
                <button type="submit">{t(lang, "Confirm Today's Courses", "确认今日课程")}</button>
              </form>
            )}
          </div>
          {todaySessions.length === 0 ? (
            <div style={{ color: "#666", marginTop: 8 }}>{t(lang, "No courses today.", "今天没有课程。")}</div>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {todaySessions.map((s) => (
                <div key={s.id} style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 8, background: "#fff" }}>
                  <div>
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={s.class.capacity} compact />
                    <span>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                      {s.class.level ? ` / ${s.class.level.name}` : ""}
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, padding: 12, background: "#eff6ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Tomorrow's Courses", "明日课程")} ({tomorrowSessions.length})</h3>
            {tomorrowConfirmed ? (
              <span style={{ color: "#166534", fontWeight: 700 }}>
                {t(lang, "Confirmed", "已确认")}: {tomorrowConfirmed.createdAt.toLocaleTimeString()}
              </span>
            ) : (
              <form action={confirmTeacherCourses.bind(null, "tomorrow")}>
                <input type="hidden" name="date" value={toDateInputValue(tomorrowStart)} />
                <button type="submit">{t(lang, "Confirm Tomorrow's Courses", "确认明日课程")}</button>
              </form>
            )}
          </div>
          {tomorrowSessions.length === 0 ? (
            <div style={{ color: "#666", marginTop: 8 }}>{t(lang, "No courses tomorrow.", "明天没有课程。")}</div>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {tomorrowSessions.map((s) => (
                <div key={s.id} style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 8, background: "#fff" }}>
                  <div>
                    {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={s.class.capacity} compact />
                    <span>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                      {s.class.level ? ` / ${s.class.level.name}` : ""}
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ol>
        <li>
          <a href="/teacher/availability">{t(lang, "Fill your availability", "填写可上课时间")}</a>
        </li>
        <li>
          <a href="/teacher/sessions">{t(lang, "Take attendance for your sessions", "对自己的课次进行点名")}</a>
        </li>
        <li>{t(lang, "Upload session feedback within 12 hours after class", "课后12小时内上传课后反馈")}</li>
      </ol>
    </div>
  );
}

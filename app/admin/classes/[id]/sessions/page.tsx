import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDateOnly(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function parseTimeHHMM(s: string) {
  const [hh, mm] = s.split(":").map(Number);
  return { hh, mm };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinFromDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtSlotRange(startMin: number, endMin: number) {
  const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
  const sm = String(startMin % 60).padStart(2, "0");
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${sh}:${sm}-${eh}:${em}`;
}

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  if (startAt.toDateString() !== endAt.toDateString()) {
    return "Session spans multiple days";
  }

  const startMin = toMinFromDate(startAt);
  const endMin = toMinFromDate(endAt);

  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 23, 59, 59, 999);

  let slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
    orderBy: { startMin: "asc" },
  });

  if (slots.length === 0) {
    const weekday = startAt.getDay();
    slots = await prisma.teacherAvailability.findMany({
      where: { teacherId, weekday },
      orderBy: { startMin: "asc" },
    });

    if (slots.length === 0) {
      return `No availability on ${WEEKDAYS[weekday] ?? weekday} (no slots)`;
    }
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const weekday = startAt.getDay();
    return `Outside availability ${WEEKDAYS[weekday] ?? weekday} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}. Available: ${ranges}`;
  }

  return null;
}

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

function buildRedirect(classId: string, params: Record<string, string>) {
  const p = new URLSearchParams(params);
  return `/admin/classes/${classId}/sessions?${p.toString()}`;
}

async function findConflictForSession(opts: {
  classId: string;
  teacherId: string;
  roomId: string | null;
  startAt: Date;
  endAt: Date;
}) {
  const { classId, teacherId, roomId, startAt, endAt } = opts;

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) return availErr;

  const dup = await prisma.session.findFirst({
    where: { classId, startAt, endAt },
    select: { id: true },
  });
  if (dup) return `Duplicate session exists: ${dup.id}`;

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      class: { teacherId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, classId: true },
  });
  if (teacherSessionConflict) {
    return `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`;
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  if (teacherApptConflict) return `Teacher conflict with appointment ${teacherApptConflict.id}`;

  if (roomId) {
    const roomSessionConflict = await prisma.session.findFirst({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, classId: true },
    });
    if (roomSessionConflict) {
      return `Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`;
    }
  }

  return null;
}

async function findTeacherConflict(opts: {
  teacherId: string;
  startAt: Date;
  endAt: Date;
  excludeSessionIds: string[];
}) {
  const { teacherId, startAt, endAt, excludeSessionIds } = opts;

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
    },
    select: { id: true, classId: true },
  });
  if (teacherSessionConflict) {
    return `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`;
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  if (teacherApptConflict) return `Teacher conflict with appointment ${teacherApptConflict.id}`;

  return null;
}

async function createOneSession(classId: string, formData: FormData) {
  "use server";

  const startAtStr = String(formData.get("startAt") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 60);

  if (!startAtStr || !Number.isFinite(durationMin) || durationMin <= 0) {
    redirect(buildRedirect(classId, { err: "Invalid input" }));
  }

  const [date, time] = startAtStr.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  const startAt = new Date(Y, M - 1, D, hh, mm, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, room: true, course: true, subject: true, level: true },
  });
  if (!cls) redirect(buildRedirect(classId, { err: "Class not found" }));

  const conflict = await findConflictForSession({
    classId,
    teacherId: cls.teacherId,
    roomId: cls.roomId ?? null,
    startAt,
    endAt,
  });

  if (conflict) redirect(buildRedirect(classId, { err: conflict }));

  await prisma.session.create({ data: { classId, startAt, endAt } });
  redirect(buildRedirect(classId, { msg: "Created 1 session" }));
}

async function generateWeeklySessions(classId: string, formData: FormData) {
  "use server";

  const startDateStr = String(formData.get("startDate") ?? "");
  const weekday = Number(formData.get("weekday") ?? 1);
  const timeStr = String(formData.get("time") ?? "19:00");
  const weeks = Number(formData.get("weeks") ?? 8);
  const durationMin = Number(formData.get("durationMin") ?? 60);
  const onConflict = String(formData.get("onConflict") ?? "reject");

  if (
    !startDateStr ||
    !Number.isFinite(weekday) ||
    weekday < 1 ||
    weekday > 7 ||
    !timeStr ||
    !Number.isFinite(weeks) ||
    weeks <= 0 ||
    weeks > 52 ||
    !Number.isFinite(durationMin) ||
    durationMin <= 0
  ) {
    redirect(buildRedirect(classId, { err: "Invalid input" }));
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, room: true, course: true, subject: true, level: true },
  });
  if (!cls) redirect(buildRedirect(classId, { err: "Class not found" }));

  const startDate = parseDateOnly(startDateStr);
  const { hh, mm } = parseTimeHHMM(timeStr);

  const ourToJs = (our: number) => (our === 7 ? 0 : our);

  const first = new Date(startDate);
  const targetJs = ourToJs(weekday);
  while (first.getDay() !== targetJs) first.setDate(first.getDate() + 1);

  let created = 0;
  let skipped = 0;
  const skippedSamples: string[] = [];

  for (let i = 0; i < weeks; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);

    const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

    const conflict = await findConflictForSession({
      classId,
      teacherId: cls.teacherId,
      roomId: cls.roomId ?? null,
      startAt,
      endAt,
    });

    if (conflict) {
      if (onConflict === "reject") {
        redirect(buildRedirect(classId, { err: `Conflict on ${ymd(startAt)} ${timeStr}: ${conflict}` }));
      }
      skipped++;
      if (skippedSamples.length < 5) skippedSamples.push(`${ymd(startAt)} ${timeStr} - ${conflict}`);
      continue;
    }

    await prisma.session.create({ data: { classId, startAt, endAt } });
    created++;
  }

  const msg =
    onConflict === "skip"
      ? `Generated done: created=${created}, skipped=${skipped}.` +
        (skippedSamples.length ? ` Samples: ${skippedSamples.join(" | ")}` : "")
      : `Generated done: created=${created}.`;

  redirect(buildRedirect(classId, { msg }));
}

async function deleteSession(classId: string, formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) redirect(buildRedirect(classId, { err: "Missing sessionId" }));

  await prisma.session.delete({ where: { id: sessionId } });
  redirect(buildRedirect(classId, { msg: "Deleted" }));
}

async function replaceSessionTeacher(classId: string, formData: FormData) {
  "use server";

  const sessionId = String(formData.get("sessionId") ?? "");
  const newTeacherId = String(formData.get("newTeacherId") ?? "");
  const scope = String(formData.get("scope") ?? "single");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!sessionId || !newTeacherId) {
    redirect(buildRedirect(classId, { err: "Missing sessionId or newTeacherId" }));
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });
  if (!session || session.classId !== classId) {
    redirect(buildRedirect(classId, { err: "Session not found" }));
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: newTeacherId },
    include: { subjects: true },
  });
  if (!teacher) {
    redirect(buildRedirect(classId, { err: "Teacher not found" }));
  }
  if (!canTeachSubject(teacher, session.class.subjectId)) {
    redirect(buildRedirect(classId, { err: "Teacher cannot teach this course" }));
  }

  const targetSessions =
    scope === "future"
      ? await prisma.session.findMany({
          where: { classId, startAt: { gte: session.startAt } },
          include: { class: true },
          orderBy: { startAt: "asc" },
        })
      : [session];

  const targetIds = targetSessions.map((s) => s.id);

  for (const s of targetSessions) {
    const availErr = await checkTeacherAvailability(newTeacherId, s.startAt, s.endAt);
    if (availErr) {
      redirect(
        buildRedirect(classId, {
          err: `Availability conflict on ${ymd(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}: ${availErr}`,
        })
      );
    }

    const conflict = await findTeacherConflict({
      teacherId: newTeacherId,
      startAt: s.startAt,
      endAt: s.endAt,
      excludeSessionIds: targetIds,
    });
    if (conflict) {
      redirect(
        buildRedirect(classId, {
          err: `Time conflict on ${ymd(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}: ${conflict}`,
        })
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const s of targetSessions) {
      const fromTeacherId = s.teacherId ?? s.class.teacherId;
      const toTeacherId = newTeacherId;

      if (fromTeacherId === toTeacherId) continue;

      await tx.session.update({
        where: { id: s.id },
        data: { teacherId: toTeacherId === s.class.teacherId ? null : toTeacherId },
      });

      await tx.sessionTeacherChange.create({
        data: {
          sessionId: s.id,
          fromTeacherId,
          toTeacherId,
          reason,
        },
      });
    }
  });

  const msg =
    scope === "future"
      ? `Replaced teacher for ${targetSessions.length} sessions`
      : "Replaced teacher for 1 session";
  redirect(buildRedirect(classId, { msg }));
}

export default async function ClassSessionsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { msg?: string; err?: string };
}) {
  const lang = await getLang();
  const classId = params.id;
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
  });

  if (!cls) {
    return (
      <div>
        <h2>{t(lang, "Class Not Found", "班级不存在")}</h2>
        <a href="/admin/classes">← {t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const teachers = await prisma.teacher.findMany({
    include: { subjects: true },
    orderBy: { name: "asc" },
  });
  const eligibleTeachers = teachers.filter((tch) => canTeachSubject(tch, cls.subjectId));

  const sessions = await prisma.session.findMany({
    where: { classId },
    include: { teacher: true },
    orderBy: { startAt: "desc" },
  });

  const today = new Date();
  const defaultStartDate = ymd(today);
  const jsDay = today.getDay();
  const weekdayDefault = jsDay === 0 ? 7 : jsDay;

  return (
    <div>
      <h2>{t(lang, "Sessions", "课次")}</h2>

      <p style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a href="/admin/classes">← {t(lang, "Back to Classes", "返回班级列表")}</a>
        <a href={`/admin/classes/${classId}`}>← {t(lang, "Back to Class Detail", "返回班级详情")}</a>
        <a href={`/admin/schedule/new?tab=session&classId=${classId}`}>
          + {t(lang, "New Session (Schedule/New)", "新建课次")}
        </a>
        <span style={{ color: "#999" }}>(classId {cls.id})</span>
      </p>

      {err && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>{t(lang, "Rejected", "已拒绝")}:</b> {err}
        </div>
      )}
      {msg && (
        <div style={{ padding: 12, border: "1px solid #b9e6c3", background: "#f2fff5", marginBottom: 12 }}>
          <b>{t(lang, "OK", "成功")}:</b> {msg}
        </div>
      )}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div>
          <b>{t(lang, "Course", "课程")}:</b> {cls.course.name}
          {cls.subject ? ` / ${cls.subject.name}` : ""} {cls.level ? ` / ${cls.level.name}` : ""}
        </div>
        <div>
          <b>{t(lang, "Teacher", "老师")}:</b> {cls.teacher.name}
        </div>
        <div>
          <b>{t(lang, "Campus", "校区")}:</b> {cls.campus.name}
        </div>
        <div>
          <b>{t(lang, "Room", "教室")}:</b> {cls.room?.name ?? "(none)"}
        </div>
        <div style={{ marginTop: 8 }}>
          <b>{t(lang, "Total Sessions", "课次数")}:</b> {sessions.length}
        </div>
      </div>

      <h3>{t(lang, "Create One Session", "单次建课")}</h3>
      <form action={createOneSession.bind(null, classId)} style={{ display: "grid", gap: 10, maxWidth: 520, marginBottom: 22 }}>
        <label>
          {t(lang, "Start", "开始")}:
          <input name="startAt" type="datetime-local" required style={{ marginLeft: 8 }} />
        </label>
        <label>
          {t(lang, "Duration (minutes)", "时长(分钟)")}:
          <input name="durationMin" type="number" min={30} step={30} defaultValue={60} style={{ marginLeft: 8 }} />
        </label>
        <button type="submit">{t(lang, "Create (reject on conflict)", "创建(冲突则拒绝)")}</button>
      </form>

      <h3>{t(lang, "Generate Weekly Sessions", "批量生成")}</h3>
      <form action={generateWeeklySessions.bind(null, classId)} style={{ display: "grid", gap: 10, maxWidth: 720, marginBottom: 18 }}>
        <label>
          {t(lang, "Start date (from)", "开始日期")}:
          <input name="startDate" type="date" defaultValue={defaultStartDate} style={{ marginLeft: 8 }} />
        </label>

        <label>
          {t(lang, "Weekday", "星期")}:
          <select name="weekday" defaultValue={weekdayDefault} style={{ marginLeft: 8, minWidth: 200 }}>
            <option value={1}>Mon</option>
            <option value={2}>Tue</option>
            <option value={3}>Wed</option>
            <option value={4}>Thu</option>
            <option value={5}>Fri</option>
            <option value={6}>Sat</option>
            <option value={7}>Sun</option>
          </select>
        </label>

        <label>
          {t(lang, "Time", "时间")}:
          <input name="time" type="time" defaultValue="19:00" style={{ marginLeft: 8 }} />
        </label>

        <label>
          {t(lang, "Duration (minutes)", "时长(分钟)")}:
          <input name="durationMin" type="number" min={30} step={30} defaultValue={60} style={{ marginLeft: 8 }} />
        </label>

        <label>
          {t(lang, "Weeks", "周数")}:
          <input name="weeks" type="number" min={1} max={52} defaultValue={8} style={{ marginLeft: 8 }} />
        </label>

        <label>
          {t(lang, "On conflict", "冲突处理")}:
          <select name="onConflict" defaultValue="reject" style={{ marginLeft: 8, minWidth: 220 }}>
            <option value="reject">{t(lang, "Reject immediately", "立即拒绝")}</option>
            <option value="skip">{t(lang, "Skip conflicts", "跳过冲突继续")}</option>
          </select>
        </label>

        <button type="submit">{t(lang, "Generate", "生成")}</button>

        <div style={{ color: "#666" }}>
          {t(lang, "Conflict rule: same teacher (session/appointment overlap) or same room (session overlap).", "冲突规则：同老师（课次/预约重叠）或同教室（课次重叠）。")}
        </div>
      </form>

      <h3>{t(lang, "Existing Sessions", "已有课次")}</h3>
      {sessions.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No sessions yet.", "暂无课次")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Start", "开始")}</th>
              <th align="left">{t(lang, "End", "结束")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(s.startAt).toLocaleString()}</td>
                <td>{new Date(s.endAt).toLocaleString()}</td>
                <td>
                  {s.teacher?.name ?? cls.teacher.name}
                  {s.teacherId && s.teacherId !== cls.teacherId && (
                    <div style={{ color: "#b00", fontSize: 12 }}>{t(lang, "Replaced", "替换老师")}</div>
                  )}
                </td>

                <td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Attendance", "点名")}</a>

                    <form action={deleteSession.bind(null, classId)}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <button type="submit">{t(lang, "Delete", "删除")}</button>
                    </form>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <form action={replaceSessionTeacher.bind(null, classId)} style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <label>
                          {t(lang, "Replace teacher", "换老师")}:
                          <select
                            name="newTeacherId"
                            defaultValue={s.teacherId ?? cls.teacherId}
                            style={{ marginLeft: 6, minWidth: 200 }}
                          >
                            {eligibleTeachers.map((tch) => (
                              <option key={tch.id} value={tch.id}>
                                {tch.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t(lang, "Scope", "范围")}:
                          <select name="scope" defaultValue="single" style={{ marginLeft: 6 }}>
                            <option value="single">{t(lang, "This session only", "仅本节课")}</option>
                            <option value="future">{t(lang, "Future sessions", "本班级未来所有课次")}</option>
                          </select>
                        </label>
                        <input name="reason" type="text" placeholder={t(lang, "Reason (optional)", "原因(可选)")} style={{ minWidth: 200 }} />
                        <button type="submit">{t(lang, "Confirm", "确认")}</button>
                      </div>
                    </form>
                    {eligibleTeachers.length === 0 && (
                      <div style={{ color: "#b00", fontSize: 12 }}>{t(lang, "No eligible teachers for this course.", "没有可教授该课程的老师")}</div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

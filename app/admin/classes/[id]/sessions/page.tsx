import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../../../_components/NoticeBanner";
import SimpleModal from "../../../_components/SimpleModal";
import BlurTimeInput from "@/app/_components/BlurTimeInput";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

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

function fmtRange(startAt: Date, endAt: Date) {
  return `${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;
}

function formatCourseLabel(cls: any) {
  if (!cls?.course) return "-";
  const parts = [cls.course?.name, cls.subject?.name, cls.level?.name].filter(Boolean);
  return parts.join(" / ");
}

function formatSessionConflictLabel(session: any) {
  const teacherName = session?.teacher?.name ?? session?.class?.teacher?.name ?? "-";
  const campusName = session?.class?.campus?.name ?? "-";
  const roomName = session?.class?.room?.name ?? "(none)";
  const courseLabel = formatCourseLabel(session?.class);
  return `课程 Course: ${courseLabel} | 老师 Teacher: ${teacherName} | 校区 Campus: ${campusName} | 教室 Room: ${roomName} | 时间 Time: ${fmtRange(
    session.startAt,
    session.endAt
  )}`;
}

function formatAppointmentConflictLabel(appt: any) {
  const studentName = appt?.student?.name ?? "-";
  return `老师预约 Teacher appointment: ${studentName} | 时间 Time: ${fmtRange(appt.startAt, appt.endAt)}`;
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
    select: { startMin: true, endMin: true },
    orderBy: { startMin: "asc" },
  });

  if (slots.length === 0) {
    const weekday = startAt.getDay();
    slots = await prisma.teacherAvailability.findMany({
      where: { teacherId, weekday },
      select: { startMin: true, endMin: true },
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
  if (dup) return `Session already exists at ${fmtRange(startAt, endAt)}`;

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      class: { teacherId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
  });
  if (teacherSessionConflict) {
    return `Teacher conflict / 老师冲突: ${formatSessionConflictLabel(teacherSessionConflict)}`;
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: { student: true },
  });
  if (teacherApptConflict) return `Teacher conflict / 老师冲突: ${formatAppointmentConflictLabel(teacherApptConflict)}`;

  if (roomId) {
    const roomSessionConflict = await prisma.session.findFirst({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        teacher: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
    });
    if (roomSessionConflict) {
      return `Room conflict / 教室冲突: ${formatSessionConflictLabel(roomSessionConflict)}`;
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
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
  });
  if (teacherSessionConflict) {
    return `Teacher conflict / 老师冲突: ${formatSessionConflictLabel(teacherSessionConflict)}`;
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: { student: true },
  });
  if (teacherApptConflict) return `Teacher conflict / 老师冲突: ${formatAppointmentConflictLabel(teacherApptConflict)}`;

  return null;
}

async function createOneSession(classId: string, formData: FormData) {
  "use server";

  const startAtStr = String(formData.get("startAt") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 60);
  const studentId = String(formData.get("studentId") ?? "");

  if (!startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
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

  if (cls.capacity === 1) {
    if (!studentId) {
      redirect(buildRedirect(classId, { err: "Please select a student" }));
    }
    const enrolled = await prisma.enrollment.findFirst({
      where: { classId, studentId },
      select: { id: true },
    });
    if (!enrolled) {
      redirect(buildRedirect(classId, { err: "Student not enrolled in this class" }));
    }
  }

  const conflict = await findConflictForSession({
    classId,
    teacherId: cls.teacherId,
    roomId: cls.roomId ?? null,
    startAt,
    endAt,
  });

  if (conflict) redirect(buildRedirect(classId, { err: conflict }));

  await prisma.session.create({ data: { classId, startAt, endAt, studentId: cls.capacity === 1 ? studentId : null } });
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
  const studentId = String(formData.get("studentId") ?? "");

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
    durationMin < 15
  ) {
    redirect(buildRedirect(classId, { err: "Invalid input" }));
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, room: true, course: true, subject: true, level: true },
  });
  if (!cls) redirect(buildRedirect(classId, { err: "Class not found" }));

  if (cls.capacity === 1) {
    if (!studentId) {
      redirect(buildRedirect(classId, { err: "Please select a student" }));
    }
    const enrolled = await prisma.enrollment.findFirst({
      where: { classId, studentId },
      select: { id: true },
    });
    if (!enrolled) {
      redirect(buildRedirect(classId, { err: "Student not enrolled in this class" }));
    }
  }

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

    await prisma.session.create({
      data: {
        classId,
        startAt,
        endAt,
        studentId: cls.capacity === 1 ? studentId : null,
      },
    });
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

async function assignSessionStudent(classId: string, formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!sessionId || !studentId) redirect(buildRedirect(classId, { err: "Missing sessionId or studentId" }));

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });
  if (!session || session.classId !== classId) {
    redirect(buildRedirect(classId, { err: "Session not found" }));
  }
  if (session.class.capacity !== 1) {
    redirect(buildRedirect(classId, { err: "Not a 1-on-1 class" }));
  }
  const enrolled = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });
  if (!enrolled) {
    redirect(buildRedirect(classId, { err: "Student not enrolled in this class" }));
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { studentId },
  });
  redirect(buildRedirect(classId, { msg: "Student assigned" }));
}

export default async function ClassSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { id: classId } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

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

  const [teachers, enrollments] = await Promise.all([
    prisma.teacher.findMany({
    include: { subjects: true },
    orderBy: { name: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { classId },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    }),
  ]);
  const eligibleTeachers = teachers.filter((tch) => canTeachSubject(tch, cls.subjectId));

  const sessions = await prisma.session.findMany({
    where: { classId },
    include: { teacher: true, student: true },
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
        <span style={{ color: "#999" }}>(CLS-{cls.id.slice(0, 4)}…{cls.id.slice(-4)})</span>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Rejected", "已拒绝")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <b>{t(lang, "Course", "课程")}:</b>
          <ClassTypeBadge capacity={cls.capacity} compact />
          <span>
            {cls.course.name}
            {cls.subject ? ` / ${cls.subject.name}` : ""} {cls.level ? ` / ${cls.level.name}` : ""}
          </span>
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

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <SimpleModal buttonLabel={t(lang, "Create One Session", "单次建课")} title={t(lang, "Create One Session", "单次建课")} closeOnSubmit>
          <form action={createOneSession.bind(null, classId)} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            {cls.capacity === 1 && (
              <label>
                {t(lang, "Student", "学生")}:
                <select name="studentId" defaultValue="" style={{ marginLeft: 8, minWidth: 240 }}>
                  <option value="">{t(lang, "Select student", "选择学生")}</option>
                  {enrollments.map((e) => (
                    <option key={e.studentId} value={e.studentId}>
                      {e.student.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {t(lang, "Start", "开始")}:
              <input name="startAt" type="datetime-local" required style={{ marginLeft: 8 }} />
            </label>
            <label>
              {t(lang, "Duration (minutes)", "时长(分钟)")}:
              <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} />
            </label>
            <button type="submit">{t(lang, "Create (reject on conflict)", "创建(冲突则拒绝)")}</button>
          </form>
        </SimpleModal>

        <SimpleModal buttonLabel={t(lang, "Generate Weekly Sessions", "批量生成")} title={t(lang, "Generate Weekly Sessions", "批量生成")} closeOnSubmit>
          <form action={generateWeeklySessions.bind(null, classId)} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
            {cls.capacity === 1 && (
              <label>
                {t(lang, "Student", "学生")}:
                <select name="studentId" defaultValue="" style={{ marginLeft: 8, minWidth: 240 }}>
                  <option value="">{t(lang, "Select student", "选择学生")}</option>
                  {enrollments.map((e) => (
                    <option key={e.studentId} value={e.studentId}>
                      {e.student.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
              <BlurTimeInput name="time" defaultValue="19:00" style={{ marginLeft: 8 }} />
            </label>

            <label>
              {t(lang, "Duration (minutes)", "时长(分钟)")}:
              <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} />
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
        </SimpleModal>
      </div>

      <h3>{t(lang, "Existing Sessions", "已有课次")}</h3>
      {sessions.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No sessions yet.", "暂无课次")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>
                {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
              </div>
              <div style={{ marginTop: 4 }}>
                <ClassTypeBadge capacity={cls.capacity} compact />
              </div>
              {cls.capacity === 1 && (
                <div style={{ marginTop: 4, color: s.student ? "#0f172a" : "#b91c1c", fontSize: 12 }}>
                  {t(lang, "Student", "学生")}: {s.student?.name ?? t(lang, "Not assigned", "未选择学生")}
                </div>
              )}
              <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                {t(lang, "Teacher", "老师")}: {s.teacher?.name ?? cls.teacher.name}
              </div>
              {s.teacherId && s.teacherId !== cls.teacherId ? (
                <div style={{ color: "#b00", fontSize: 12, marginTop: 4 }}>{t(lang, "Replaced", "替换老师")}</div>
              ) : null}

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Attendance", "点名")}</a>
                <form action={deleteSession.bind(null, classId)}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <button type="submit">{t(lang, "Delete", "删除")}</button>
                </form>
              </div>

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>{t(lang, "Replace teacher", "换老师")}</summary>
                <form action={replaceSessionTeacher.bind(null, classId)} style={{ display: "grid", gap: 6, marginTop: 6 }}>
                  <input type="hidden" name="sessionId" value={s.id} />
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
                </form>
                {eligibleTeachers.length === 0 && (
                  <div style={{ color: "#b00", fontSize: 12, marginTop: 4 }}>{t(lang, "No eligible teachers for this course.", "没有可教授该课程的老师")}</div>
                )}
              </details>

              {cls.capacity === 1 && !s.studentId && enrollments.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer" }}>{t(lang, "Assign student", "选择学生")}</summary>
                  <form action={assignSessionStudent.bind(null, classId)} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <select name="studentId" defaultValue="">
                      <option value="">{t(lang, "Select student", "选择学生")}</option>
                      {enrollments.map((e) => (
                        <option key={e.studentId} value={e.studentId}>
                          {e.student.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit">{t(lang, "Confirm", "确认")}</button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





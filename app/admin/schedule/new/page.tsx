﻿import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import StudentSearchSelect from "../../_components/StudentSearchSelect";
import NoticeBanner from "../../_components/NoticeBanner";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDatetimeLocal(s: string) {
  const [date, time] = s.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
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

function buildRedirectToTeacherWeek(teacherId: string, startAt: Date) {
  const weekStart = startOfWeekMonday(startAt);
  const p = new URLSearchParams({
    view: "teacher",
    teacherId,
    weekStart: ymd(weekStart),
  });
  return `/admin/schedule?${p.toString()}`;
}

async function createSingleSession(formData: FormData) {
  "use server";

  const classId = String(formData.get("classId") ?? "");
  const startAtStr = String(formData.get("startAt") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 60);
  const studentId = String(formData.get("studentId") ?? "");

  if (!classId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    const p = new URLSearchParams({ tab: "session", err: "Invalid input" });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const startAt = parseDatetimeLocal(startAtStr);
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, campus: true, room: true, course: true },
  });

  if (!cls) {
    const p = new URLSearchParams({ tab: "session", err: "Class not found" });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  if (cls.capacity === 1) {
    if (!studentId) {
      const p = new URLSearchParams({ tab: "session", err: "Please select a student for 1-on-1 class" });
      redirect(`/admin/schedule/new?${p.toString()}`);
    }
    const enrolled = await prisma.enrollment.findFirst({
      where: { classId, studentId },
      select: { id: true },
    });
    if (!enrolled) {
      const p = new URLSearchParams({ tab: "session", err: "Student not enrolled in this class" });
      redirect(`/admin/schedule/new?${p.toString()}`);
    }
  }

  const availErr = await checkTeacherAvailability(cls.teacherId, startAt, endAt);
  if (availErr) {
    const p = new URLSearchParams({ tab: "session", err: availErr });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const dup = await prisma.session.findFirst({
    where: { classId, startAt, endAt },
    select: { id: true },
  });
  if (dup) {
    const p = new URLSearchParams({
      tab: "session",
      err: `Duplicate session exists: ${dup.id}`,
    });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      class: { teacherId: cls.teacherId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: { class: true },
  });
  if (teacherSessionConflict) {
    const p = new URLSearchParams({
      tab: "session",
      err: `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`,
    });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId: cls.teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) {
    const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
      teacherApptConflict.endAt
    )}`;
    const p = new URLSearchParams({
      tab: "session",
      err: `Teacher conflict with appointment ${timeLabel}`,
    });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  if (cls.roomId) {
    const roomSessionConflict = await prisma.session.findFirst({
      where: {
        class: { roomId: cls.roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: { class: true },
    });

    if (roomSessionConflict) {
      const p = new URLSearchParams({
        tab: "session",
        err: `Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`,
      });
      redirect(`/admin/schedule/new?${p.toString()}`);
    }
  }

  await prisma.session.create({
    data: { classId, startAt, endAt, studentId: cls.capacity === 1 ? studentId : null },
  });

  redirect(buildRedirectToTeacherWeek(cls.teacherId, startAt));
}

async function createSingleAppointment(formData: FormData) {
  "use server";

  const teacherId = String(formData.get("teacherId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const startAtStr = String(formData.get("startAt") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 60);

  if (!teacherId || !studentId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    const p = new URLSearchParams({ tab: "appt", err: "Invalid input" });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const startAt = parseDatetimeLocal(startAtStr);
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) {
    const p = new URLSearchParams({ tab: "appt", err: availErr });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      class: { teacherId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, classId: true },
  });
  if (teacherSessionConflict) {
    const p = new URLSearchParams({
      tab: "appt",
      err: `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`,
    });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) {
    const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
      teacherApptConflict.endAt
    )}`;
    const p = new URLSearchParams({
      tab: "appt",
      err: `Teacher conflict with appointment ${timeLabel}`,
    });
    redirect(`/admin/schedule/new?${p.toString()}`);
  }

  await prisma.appointment.create({
    data: { teacherId, studentId, startAt, endAt, mode: "OFFLINE" },
  });

  redirect(buildRedirectToTeacherWeek(teacherId, startAt));
}

export default async function NewSinglePage({
  searchParams,
}: {
  searchParams?: { tab?: string; err?: string; classId?: string };
}) {
  const lang = await getLang();
  const tab = searchParams?.tab ?? "session";
  const err = searchParams?.err ?? "";
  const preferredClassId = searchParams?.classId ?? "";

  const [classes, teachers, students] = await Promise.all([
    prisma.class.findMany({
      include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
      orderBy: { id: "asc" },
    }),
    prisma.teacher.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ orderBy: { name: "asc" } }),
  ]);

  const defaultClassId =
    preferredClassId && classes.some((c) => c.id === preferredClassId)
      ? preferredClassId
      : classes[0]?.id ?? "";

  const tabSessionHref = preferredClassId
    ? `/admin/schedule/new?tab=session&classId=${encodeURIComponent(preferredClassId)}`
    : `/admin/schedule/new?tab=session`;

  const tabApptHref = preferredClassId
    ? `/admin/schedule/new?tab=appt&classId=${encodeURIComponent(preferredClassId)}`
    : `/admin/schedule/new?tab=appt`;

  return (
    <div>
      <h2>{t(lang, "New (Single)", "新建(单次)")}</h2>
      <p>
        <a href="/admin/schedule">→ {t(lang, "Back to Schedule", "返回课表")}</a>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Rejected", "已拒绝创建")} message={err} /> : null}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href={tabSessionHref}>{t(lang, "Create Session", "新建班课")}</a>
        <a href={tabApptHref}>{t(lang, "Create Appointment", "新建1对1")}</a>
      </div>

      {tab === "session" ? (
        <>
          <h3>{t(lang, "Create Session (Class Lesson)", "新建班课")}</h3>

          {classes.length === 0 ? (
            <div style={{ color: "#999", marginBottom: 16 }}>
              {t(lang, "No classes yet. Please create a class first in /admin/classes.", "暂无班级，请先到 /admin/classes 创建班级。")}
            </div>
          ) : (
            <form action={createSingleSession} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
                <ClassTypeBadge capacity={2} compact />
                <ClassTypeBadge capacity={1} compact />
              </div>
              <label>
                {t(lang, "Class", "班级")}:
                <select name="classId" defaultValue={defaultClassId} style={{ marginLeft: 8, minWidth: 520 }}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.capacity === 1 ? "1-on-1/一对一" : "Group/班课"}] {c.course.name} / {c.subject?.name ?? "-"} / {c.level?.name ?? "-"} | {t(lang, "Teacher", "老师")}:{" "}
                      {c.teacher.name} | {t(lang, "Campus", "校区")}: {c.campus.name} | {t(lang, "Room", "教室")}:{" "}
                      {c.room?.name ?? "(none)"} | CLS-{c.id.slice(0, 4)}…{c.id.slice(-4)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t(lang, "Student (for 1-on-1 only)", "学生（仅一对一）")}:
                <select name="studentId" defaultValue="" style={{ marginLeft: 8, minWidth: 260 }}>
                  <option value="">{t(lang, "Select student", "选择学生")}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t(lang, "Start", "开始")}:
                <input name="startAt" type="datetime-local" required style={{ marginLeft: 8 }} />
              </label>

              <label>
                {t(lang, "Duration (minutes)", "时长(分钟)")}:
                <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} />
              </label>

              <button type="submit">{t(lang, "Create (reject on conflict)", "创建(冲突则拒绝)")}</button>

              <p style={{ color: "#666", margin: 0 }}>
                {t(lang, "Conflict rule: same teacher (session/appointment overlap) or same room (session overlap).", "冲突规则：同老师（课次/预约重叠）或同教室（课次重叠）。")}
              </p>
            </form>
          )}
        </>
      ) : (
        <>
          <h3>{t(lang, "Create Appointment (1-1)", "新建1对1预约")}</h3>
          <form action={createSingleAppointment} style={{ display: "grid", gap: 10, maxWidth: 720 }}>
            <label>
              {t(lang, "Teacher", "老师")}:
              <select name="teacherId" defaultValue={teachers[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 320 }}>
                {teachers.map((tch) => (
                  <option key={tch.id} value={tch.id}>
                    {tch.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t(lang, "Student", "学生")}:
              <div style={{ marginLeft: 8 }}>
                <StudentSearchSelect
                  name="studentId"
                  placeholder={t(lang, "Search student name", "搜索学生姓名")}
                  students={students.map((s) => ({ id: s.id, name: s.name }))}
                />
              </div>
            </label>

            <label>
              {t(lang, "Start", "开始")}:
              <input name="startAt" type="datetime-local" required style={{ marginLeft: 8 }} />
            </label>

            <label>
              {t(lang, "Duration (minutes)", "时长(分钟)")}:
              <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} />
            </label>

            <button type="submit">{t(lang, "Create (reject on conflict)", "创建(冲突则拒绝)")}</button>

            <p style={{ color: "#666", margin: 0 }}>
              {t(lang, "Conflict rule: same teacher (session/appointment overlap).", "冲突规则：同老师（课次/预约重叠）会冲突。")}
            </p>
          </form>
        </>
      )}
    </div>
  );
}





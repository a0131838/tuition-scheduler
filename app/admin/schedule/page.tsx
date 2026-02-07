import React from "react";
import { prisma } from "@/lib/prisma";
import { PackageStatus, PackageType } from "@prisma/client";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import NoticeBanner from "../_components/NoticeBanner";
import ScheduleCourseFilter from "../_components/ScheduleCourseFilter";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

type ViewMode = "teacher" | "room" | "campus";

const LOW_MINUTES = 120;

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

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

type EventItem = {
  id: string;
  kind: "session" | "appointment";
  startAt: Date;
  endAt: Date;
  title: string;
  classCapacity?: number | null;

  teacherName?: string;
  campusName?: string;
  roomName?: string;

  classId?: string;
  courseId?: string;
  subjectId?: string;

  roomKey?: string; // campus view conflicts by room only

  href?: string;
  goLabel?: string; // Sessions / Availability
};

function addConflict(map: Map<string, EventItem[]>, id: string, other: EventItem) {
  if (!map.has(id)) map.set(id, []);
  const arr = map.get(id)!;
  if (!arr.some((x) => x.id === other.id)) arr.push(other);
}

function buildConflictMapSingleTrack(sortedEvents: EventItem[]) {
  const map = new Map<string, EventItem[]>();

  for (let i = 0; i < sortedEvents.length; i++) {
    const a = sortedEvents[i];
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const b = sortedEvents[j];
      if (b.startAt >= a.endAt) break;
      if (overlap(a.startAt, a.endAt, b.startAt, b.endAt)) {
        addConflict(map, a.id, b);
        addConflict(map, b.id, a);
      }
    }
  }

  return map;
}

function buildConflictMapByRoom(all: EventItem[]) {
  const map = new Map<string, EventItem[]>();
  const groups = new Map<string, EventItem[]>();

  for (const e of all) {
    const key = e.roomKey ?? "no-room";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  for (const [, list] of groups) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const sub = buildConflictMapSingleTrack(list);
    for (const [k, arr] of sub) {
      for (const other of arr) addConflict(map, k, other);
    }
  }

  return map;
}

function conflictReasonLabel(view: ViewMode) {
  if (view === "teacher") return "Teacher time overlap / 老师时间冲突";
  if (view === "room") return "Room time overlap / 教室时间冲突";
  return "Same-room overlap / 同教室冲突（Campus 视图按 Room 分组）";
}

function metaLine(e: EventItem) {
  const t = e.teacherName ?? "-";
  const c = e.campusName ?? "-";
  const r = e.roomName ?? "-";
  return `Teacher: ${t} | Campus: ${c} | Room: ${r}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: {
    view?: string;
    teacherId?: string;
    roomId?: string;
    campusId?: string;
    courseId?: string;
    subjectId?: string;
    weekStart?: string;
    msg?: string;
    err?: string;
  };
}) {
  const lang = await getLang();
  const view = (searchParams?.view as ViewMode) || "teacher";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const base = searchParams?.weekStart
    ? parseYMD(searchParams.weekStart)
    : startOfWeekMonday(new Date());
  const weekStart = startOfWeekMonday(base);
  const weekEnd = addDays(weekStart, 7);

  const [teachers, rooms, campuses, courses, subjects] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { name: "asc" }, include: { subjects: true } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
  ]);

  const teacherBySubject = new Map<string, typeof teachers>();
  for (const t of teachers) {
    const subjectIds: string[] = [];
    if ((t as any).subjectCourseId) subjectIds.push((t as any).subjectCourseId);
    if (Array.isArray((t as any).subjects)) {
      for (const s of (t as any).subjects) subjectIds.push(s.id);
    }
    for (const sid of subjectIds) {
      const arr = teacherBySubject.get(sid) ?? [];
      arr.push(t);
      teacherBySubject.set(sid, arr);
    }
  }

  const teacherId = searchParams?.teacherId || teachers[0]?.id || "";
  const roomId = searchParams?.roomId || rooms[0]?.id || "";
  const campusId = searchParams?.campusId || campuses[0]?.id || "";
  const filterCourseId = (searchParams?.courseId ?? "").trim();
  const filterSubjectId = (searchParams?.subjectId ?? "").trim();

  let events: EventItem[] = [];

  // --- teacher view: sessions + appointments
  if (view === "teacher" && teacherId) {
    const [sessions, appts] = await Promise.all([
      prisma.session.findMany({
        where: {
          OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
          startAt: { lt: weekEnd },
          endAt: { gt: weekStart },
        },
        include: {
          teacher: true,
          student: true,
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: { teacherId, startAt: { lt: weekEnd }, endAt: { gt: weekStart } },
        orderBy: { startAt: "asc" },
      }),
    ]);

    const teacherName = teachers.find((t) => t.id === teacherId)?.name ?? "Teacher";

    events = [
      ...sessions.map((s) => ({
        id: s.id,
        kind: "session" as const,
        startAt: s.startAt,
        endAt: s.endAt,
        title: `Class: ${s.class.course.name}${s.class.subject ? ` / ${s.class.subject.name}` : ""}${s.class.level ? ` / ${s.class.level.name}` : ""}${s.class.capacity === 1 && s.student ? ` | ${s.student.name}` : ""}`,
        classCapacity: s.class.capacity,
        teacherName: s.teacher?.name ?? s.class.teacher.name,
        campusName: s.class.campus.name,
        roomName: s.class.room?.name ?? "(no room)",
        classId: s.classId,
        courseId: s.class.course.id,
        subjectId: s.class.subjectId ?? undefined,
        href: `/admin/classes/${s.classId}/sessions`,
        goLabel: "Sessions",
      })),
      ...appts.map((a) => ({
        id: a.id,
        kind: "appointment" as const,
        startAt: a.startAt,
        endAt: a.endAt,
        title: `1-1 Appointment (STU-${a.studentId.slice(0, 4)}…${a.studentId.slice(-4)})`,
        teacherName,
        campusName: "(n/a)",
        roomName: "(n/a)",
        href: `/admin/teachers/${teacherId}/availability`,
        goLabel: "Availability",
      })),
    ];
  }

  // --- room view: sessions in this room
  if (view === "room" && roomId) {
    const sessions = await prisma.session.findMany({
      where: {
        class: { roomId },
        startAt: { lt: weekEnd },
        endAt: { gt: weekStart },
      },
      include: { teacher: true, student: true, class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
      orderBy: { startAt: "asc" },
    });

    events = sessions.map((s) => ({
      id: s.id,
      kind: "session" as const,
      startAt: s.startAt,
      endAt: s.endAt,
      title: `Class: ${s.class.course.name}${s.class.subject ? ` / ${s.class.subject.name}` : ""}${s.class.level ? ` / ${s.class.level.name}` : ""}${s.class.capacity === 1 && s.student ? ` | ${s.student.name}` : ""}`,
      classCapacity: s.class.capacity,
      teacherName: s.teacher?.name ?? s.class.teacher.name,
      campusName: s.class.campus.name,
      roomName: s.class.room?.name ?? "(no room)",
      classId: s.classId,
      courseId: s.class.course.id,
      subjectId: s.class.subjectId ?? undefined,
      href: `/admin/classes/${s.classId}/sessions`,
      goLabel: "Sessions",
    }));
  }

  // --- campus view: sessions in campus, but conflicts ONLY within same roomKey
  if (view === "campus" && campusId) {
    const sessions = await prisma.session.findMany({
      where: {
        class: { campusId },
        startAt: { lt: weekEnd },
        endAt: { gt: weekStart },
      },
      include: { teacher: true, student: true, class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
      orderBy: { startAt: "asc" },
    });

    events = sessions.map((s) => ({
      id: s.id,
      kind: "session" as const,
      startAt: s.startAt,
      endAt: s.endAt,
      title: `Class: ${s.class.course.name}${s.class.subject ? ` / ${s.class.subject.name}` : ""}${s.class.level ? ` / ${s.class.level.name}` : ""}${s.class.capacity === 1 && s.student ? ` | ${s.student.name}` : ""}`,
      classCapacity: s.class.capacity,
      teacherName: s.teacher?.name ?? s.class.teacher.name,
      campusName: s.class.campus.name,
      roomName: s.class.room?.name ?? "(no room)",
      classId: s.classId,
      courseId: s.class.course.id,
      subjectId: s.class.subjectId ?? undefined,
      roomKey: s.class.roomId ?? "no-room",
      href: `/admin/classes/${s.classId}/sessions`,
      goLabel: "Sessions",
    }));
  }

  const filteredEvents = events.filter((e) => {
    if (!filterCourseId && !filterSubjectId) return true;
    if (e.kind === "appointment") return true;
    if (filterCourseId && e.courseId !== filterCourseId) return false;
    if (filterSubjectId && e.subjectId !== filterSubjectId) return false;
    return true;
  });

  filteredEvents.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const sessionEvents = filteredEvents.filter((e) => e.kind === "session" && e.classId && e.courseId);
  const classIds = Array.from(new Set(sessionEvents.map((e) => e.classId!)));
  const courseIds = Array.from(new Set(sessionEvents.map((e) => e.courseId!)));

  const lowBalanceMap = new Map<string, number>();

  if (classIds.length > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: { in: classIds } },
      select: { classId: true, studentId: true },
    });

    const classStudents = new Map<string, string[]>();
    for (const e of enrollments) {
      const arr = classStudents.get(e.classId) ?? [];
      arr.push(e.studentId);
      classStudents.set(e.classId, arr);
    }

    const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId)));

    const packages = studentIds.length
      ? await prisma.coursePackage.findMany({
          where: {
            studentId: { in: studentIds },
            courseId: { in: courseIds },
            type: PackageType.HOURS,
            status: PackageStatus.ACTIVE,
          },
          select: { studentId: true, courseId: true, remainingMinutes: true, validFrom: true, validTo: true },
        })
      : [];

    const pkgMap = new Map<string, typeof packages>();
    for (const p of packages) {
      const key = `${p.studentId}|${p.courseId}`;
      const arr = pkgMap.get(key) ?? [];
      arr.push(p);
      pkgMap.set(key, arr);
    }

    for (const e of sessionEvents) {
      const students = classStudents.get(e.classId!) ?? [];
      let lowCount = 0;

      for (const studentId of students) {
        const key = `${studentId}|${e.courseId}`;
        const list = pkgMap.get(key) ?? [];
        if (list.length === 0) continue;

        const valid = list.filter((p) => p.validFrom <= e.startAt && (!p.validTo || p.validTo >= e.startAt));
        if (valid.length === 0) continue;

        const minRemaining = Math.min(
          ...valid.map((p) => (p.remainingMinutes == null ? Number.POSITIVE_INFINITY : p.remainingMinutes))
        );

        if (Number.isFinite(minRemaining) && minRemaining <= LOW_MINUTES) {
          lowCount++;
        }
      }

      if (lowCount > 0) lowBalanceMap.set(e.id, lowCount);
    }
  }

  const conflictMap =
    view === "campus"
      ? buildConflictMapByRoom(filteredEvents)
      : buildConflictMapSingleTrack(filteredEvents);

  const conflictSet = new Set<string>(Array.from(conflictMap.keys()));
  const reasonLabel = conflictReasonLabel(view);

  // group by day
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const grouped = days.map((d) => {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);
    const items = filteredEvents.filter((e) => e.startAt < dayEnd && e.endAt > dayStart);
    return { day: d, items };
  });

  const prevWeek = ymd(addDays(weekStart, -7));
  const nextWeek = ymd(addDays(weekStart, 7));
  const thisWeek = ymd(startOfWeekMonday(new Date()));

  const paramsBase: Record<string, string> = { view, weekStart: ymd(weekStart) };
  if (view === "teacher") paramsBase.teacherId = teacherId;
  if (view === "room") paramsBase.roomId = roomId;
  if (view === "campus") paramsBase.campusId = campusId;
  if (filterCourseId) paramsBase.courseId = filterCourseId;
  if (filterSubjectId) paramsBase.subjectId = filterSubjectId;

  function buildHref(extra: Record<string, string>) {
    const p = new URLSearchParams({ ...paramsBase, ...extra });
    return `/admin/schedule?${p.toString()}`;
  }

  async function replaceSessionTeacher(formData: FormData) {
    "use server";

    const sessionId = String(formData.get("sessionId") ?? "");
    const newTeacherId = String(formData.get("newTeacherId") ?? "");
    const scope = String(formData.get("scope") ?? "single"); // single | future
    const reason = String(formData.get("reason") ?? "").trim() || null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/schedule");

    if (!sessionId || !newTeacherId) {
      redirect(`${returnTo}&err=Missing+sessionId+or+newTeacherId`);
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });
    if (!session) {
      redirect(`${returnTo}&err=Session+not+found`);
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: newTeacherId },
      include: { subjects: true },
    });
    if (!teacher) {
      redirect(`${returnTo}&err=Teacher+not+found`);
    }
    if (!canTeachSubject(teacher, session.class.subjectId)) {
      redirect(`${returnTo}&err=Teacher+cannot+teach+this+course`);
    }

    const targetSessions =
      scope === "future"
        ? await prisma.session.findMany({
            where: { classId: session.classId, startAt: { gte: session.startAt } },
            include: { class: true },
            orderBy: { startAt: "asc" },
          })
        : [session];

    const targetIds = targetSessions.map((s) => s.id);

    for (const s of targetSessions) {
      const availErr = await checkTeacherAvailability(newTeacherId, s.startAt, s.endAt);
      if (availErr) {
        redirect(
          `${returnTo}&err=${encodeURIComponent(
            `Availability conflict on ${ymd(s.startAt)} ${fmtTime(s.startAt)}-${fmtTime(
              s.endAt
            )}: ${availErr}`
          )}`
        );
      }

      const teacherSessionConflict = await prisma.session.findFirst({
        where: {
          id: targetIds.length ? { notIn: targetIds } : undefined,
          startAt: { lt: s.endAt },
          endAt: { gt: s.startAt },
          OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
        },
        select: { id: true, classId: true },
      });
      if (teacherSessionConflict) {
        redirect(
          `${returnTo}&err=${encodeURIComponent(
            `Time conflict on ${ymd(s.startAt)} ${fmtTime(s.startAt)}-${fmtTime(
              s.endAt
            )}: Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`
          )}`
        );
      }

      const teacherApptConflict = await prisma.appointment.findFirst({
        where: { teacherId: newTeacherId, startAt: { lt: s.endAt }, endAt: { gt: s.startAt } },
        select: { id: true, startAt: true, endAt: true },
      });
      if (teacherApptConflict) {
        const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtTime(teacherApptConflict.startAt)}-${fmtTime(
          teacherApptConflict.endAt
        )}`;
        redirect(
          `${returnTo}&err=${encodeURIComponent(
            `Time conflict on ${ymd(s.startAt)} ${fmtTime(s.startAt)}-${fmtTime(
              s.endAt
            )}: Teacher conflict with appointment ${timeLabel}`
          )}`
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
    redirect(`${returnTo}&msg=${encodeURIComponent(msg)}`);
  }

  async function deleteAppointment(formData: FormData) {
    "use server";
    const appointmentId = String(formData.get("appointmentId") ?? "");
    const returnTo = String(formData.get("returnTo") ?? "/admin/schedule");

    if (!appointmentId) {
      redirect(`${returnTo}&err=Missing+appointmentId`);
    }

    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) {
      redirect(`${returnTo}&err=Appointment+not+found`);
    }

    const sessionMatch = await prisma.session.findFirst({
      where: {
        startAt: appt.startAt,
        endAt: appt.endAt,
        OR: [{ teacherId: appt.teacherId }, { teacherId: null, class: { teacherId: appt.teacherId } }],
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id: appt.id } });
      if (sessionMatch) {
        await tx.session.delete({ where: { id: sessionMatch.id } });
      }
    });

    redirect(`${returnTo}&msg=Deleted`);
  }

  async function deleteSession(formData: FormData) {
    "use server";
    const sessionId = String(formData.get("sessionId") ?? "");
    const returnTo = String(formData.get("returnTo") ?? "/admin/schedule");

    if (!sessionId) {
      redirect(`${returnTo}&err=Missing+sessionId`);
    }

    await prisma.session.delete({ where: { id: sessionId } });
    redirect(`${returnTo}&msg=Deleted`);
  }

  async function replaceAppointmentTeacher(formData: FormData) {
    "use server";
    const appointmentId = String(formData.get("appointmentId") ?? "");
    const newTeacherId = String(formData.get("newTeacherId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim() || null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/schedule");

    if (!appointmentId || !newTeacherId) {
      redirect(`${returnTo}&err=Missing+appointmentId+or+newTeacherId`);
    }

    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) {
      redirect(`${returnTo}&err=Appointment+not+found`);
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: newTeacherId },
      include: { subjects: true },
    });
    if (!teacher) {
      redirect(`${returnTo}&err=Teacher+not+found`);
    }

    const sessionMatch = await prisma.session.findFirst({
      where: {
        startAt: appt.startAt,
        endAt: appt.endAt,
        OR: [{ teacherId: appt.teacherId }, { teacherId: null, class: { teacherId: appt.teacherId } }],
      },
      include: { class: true },
    });

    if (sessionMatch && !canTeachSubject(teacher, sessionMatch.class.subjectId)) {
      redirect(`${returnTo}&err=Teacher+cannot+teach+this+course`);
    }

    const availErr = await checkTeacherAvailability(newTeacherId, appt.startAt, appt.endAt);
    if (availErr) {
      redirect(`${returnTo}&err=${encodeURIComponent(availErr)}`);
    }

    const teacherSessionConflict = await prisma.session.findFirst({
      where: {
        id: sessionMatch ? { not: sessionMatch.id } : undefined,
        startAt: { lt: appt.endAt },
        endAt: { gt: appt.startAt },
        OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
      },
      select: { id: true, classId: true },
    });
    if (teacherSessionConflict) {
      redirect(
        `${returnTo}&err=${encodeURIComponent(
          `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`
        )}`
      );
    }

    const teacherApptConflict = await prisma.appointment.findFirst({
      where: {
        id: { not: appt.id },
        teacherId: newTeacherId,
        startAt: { lt: appt.endAt },
        endAt: { gt: appt.startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });
    if (teacherApptConflict) {
      const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtTime(teacherApptConflict.startAt)}-${fmtTime(
        teacherApptConflict.endAt
      )}`;
      redirect(`${returnTo}&err=${encodeURIComponent(`Teacher conflict with appointment ${timeLabel}`)}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id: appt.id }, data: { teacherId: newTeacherId } });
      if (sessionMatch) {
        const fromTeacherId = sessionMatch.teacherId ?? sessionMatch.class.teacherId;
        const toTeacherId = newTeacherId;

        await tx.session.update({
          where: { id: sessionMatch.id },
          data: { teacherId: toTeacherId === sessionMatch.class.teacherId ? null : toTeacherId },
        });

        if (fromTeacherId !== toTeacherId) {
          await tx.sessionTeacherChange.create({
            data: {
              sessionId: sessionMatch.id,
              fromTeacherId,
              toTeacherId,
              reason,
            },
          });
        }
      }
    });

    redirect(`${returnTo}&msg=Replaced`);
  }

  return (
    <div>
      <h2>{t(lang, "Schedule (Week View)", "周课表")}</h2>
      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ color: "#666" }}>
            {t(lang, "Week", "周")}: <b>{ymd(weekStart)}</b> ~ <b>{ymd(addDays(weekStart, 6))}</b>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <a
              href={buildHref({ weekStart: prevWeek })}
              title={t(lang, "Prev", "上一周")}
              aria-label={t(lang, "Prev", "上一周")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid #ddd", borderRadius: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href={buildHref({ weekStart: thisWeek })}
              title={t(lang, "Today", "本周")}
              aria-label={t(lang, "Today", "本周")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid #ddd", borderRadius: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="14" r="2.5" fill="currentColor" />
              </svg>
            </a>
            <a
              href={buildHref({ weekStart: nextWeek })}
              title={t(lang, "Next", "下一周")}
              aria-label={t(lang, "Next", "下一周")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid #ddd", borderRadius: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="/admin/schedule/new"
              title={t(lang, "New (Single)", "新建单次")}
              aria-label={t(lang, "New (Single)", "新建单次")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid #ddd", borderRadius: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </a>
            <a
              href={`/admin/schedule/all?weekStart=${ymd(weekStart)}`}
              title={t(lang, "All Schedule (Week)", "全周总览")}
              aria-label={t(lang, "All Schedule (Week)", "全周总览")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid #ddd", borderRadius: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="4" y="4" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="4" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="14" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </a>
            <a
              href={`/admin/schedule/all?weekStart=${ymd(weekStart)}`}
              style={{
                padding: "6px 10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t(lang, "All Week", "全周总览")}
            </a>
          </div>
        </div>

        <form method="GET" style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#666" }}>{t(lang, "View", "视图")}</span>
              <select name="view" defaultValue={view}>
                <option value="teacher">{t(lang, "Teacher", "老师")}</option>
                <option value="room">{t(lang, "Room", "教室")}</option>
                <option value="campus">{t(lang, "Campus", "校区")}</option>
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#666" }}>{t(lang, "Week start (Mon)", "周开始(周一)")}</span>
              <input type="date" name="weekStart" defaultValue={ymd(weekStart)} />
            </label>

            {view === "teacher" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#666" }}>{t(lang, "Teacher", "老师")}</span>
                <select name="teacherId" defaultValue={teacherId} style={{ minWidth: 220 }}>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {view === "room" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#666" }}>{t(lang, "Room", "教室")}</span>
                <select name="roomId" defaultValue={roomId} style={{ minWidth: 260 }}>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.campus.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {view === "campus" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#666" }}>{t(lang, "Campus", "校区")}</span>
                <select name="campusId" defaultValue={campusId} style={{ minWidth: 200 }}>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <ScheduleCourseFilter
              courses={courses.map((c) => ({ id: c.id, name: c.name }))}
              subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
              initialCourseId={filterCourseId}
              initialSubjectId={filterSubjectId}
              labels={{
                course: t(lang, "Course", "课程"),
                subject: t(lang, "Subject", "科目"),
                courseAll: t(lang, "Course (all)", "课程（全部）"),
                subjectAll: t(lang, "Subject (all)", "科目（全部）"),
              }}
            />

            <button type="submit">{t(lang, "Apply", "应用")}</button>
          </div>

          <div style={{ color: "#777", fontSize: 12 }}>
            {t(lang, "Conflict rows show details", "冲突行会显示详情")} · {t(lang, "Type", "类型")}：
            {reasonLabel} · {t(lang, "Go", "跳转")}：Class → Sessions，Appointment → Availability。
          </div>
        </form>
      </div>

      <div style={{ marginBottom: 12 }}>
        <b>{t(lang, "Total events", "总事件")}:</b> {filteredEvents.length}{" "}
        <span style={{ marginLeft: 12 }}>
          <b>{t(lang, "Conflict events", "冲突事件")}:</b> {conflictSet.size}
        </span>
        <span style={{ marginLeft: 12 }}>
          <b>{t(lang, "Low balance events", "低余额事件")}:</b> {lowBalanceMap.size}
        </span>
      </div>

      {grouped.map(({ day, items }) => (
        <div key={day.toISOString()} style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 8 }}>{fmtDate(day)}</h3>

          {items.length === 0 ? (
            <div style={{ color: "#999" }}>{t(lang, "No events.", "暂无事件")}</div>
          ) : (
            <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th align="left">{t(lang, "Time", "时间")}</th>
                  <th align="left">{t(lang, "Type", "类型")}</th>
                  <th align="left">{t(lang, "Title", "标题")}</th>
                  <th align="left">{t(lang, "Go", "跳转")}</th>
                  <th align="left">{t(lang, "Teacher", "老师")}</th>
                  <th align="left">{t(lang, "Campus", "校区")}</th>
                  <th align="left">{t(lang, "Room", "教室")}</th>
                  <th align="left">{t(lang, "Low Balance", "低余额")}</th>
                  <th align="left">{t(lang, "Conflict", "冲突")}</th>
                  <th align="left">{t(lang, "Replace", "换老师")}</th>
                  <th align="left">{t(lang, "Delete", "删除")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => {
                  const isConflict = conflictSet.has(e.id);
                  const reasons = conflictMap.get(e.id) ?? [];
                  const lowCount = lowBalanceMap.get(e.id) ?? 0;
                  const eligibleTeachers = e.subjectId ? teacherBySubject.get(e.subjectId) ?? [] : [];

                  return (
                    <React.Fragment key={e.id}>
                      <tr
                        style={{
                          borderTop: "1px solid #eee",
                          background: isConflict ? "#fff5f5" : e.kind === "appointment" ? "#f7fbff" : undefined,
                        }}
                      >
                        <td>
                          <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                            {fmtTime(e.startAt)} - {fmtTime(e.endAt)}
                          </span>
                        </td>
                        <td>
                          {e.kind === "session" ? (
                            <ClassTypeBadge capacity={e.classCapacity} compact />
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                background: "#fff3e5",
                                color: "#a25900",
                              }}
                            >
                              {t(lang, "1-1", "一对一")}
                            </span>
                          )}
                        </td>

                        <td>
                          {e.href ? (
                            <a href={e.href} target="_blank" rel="noreferrer">
                              <span style={{ fontWeight: 700 }}>{e.title}</span>
                            </a>
                          ) : (
                            <span style={{ fontWeight: 700 }}>{e.title}</span>
                          )}
                        </td>

                        <td>
                          {e.href ? (
                            <a href={e.href} target="_blank" rel="noreferrer">
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  border: "1px solid #ddd",
                                  borderRadius: 6,
                                }}
                              >
                                {e.goLabel ?? "Open"}
                              </span>
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>{e.teacherName ?? "-"}</td>
                        <td>{e.campusName ?? "-"}</td>
                        <td>{e.roomName ?? "-"}</td>
                        <td>
                          {e.kind === "session" ? (
                            lowCount > 0 ? (
                              <span style={{ color: "#b00", fontWeight: 700 }}>
                                {t(lang, "Low", "低")}:{lowCount}
                              </span>
                            ) : (
                              "-"
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{isConflict ? t(lang, "overlap", "重叠") : ""}</td>
                        <td>
                          {e.kind === "session" ? (
                            <form action={replaceSessionTeacher} style={{ display: "grid", gap: 6 }}>
                              <input type="hidden" name="sessionId" value={e.id} />
                              <input type="hidden" name="returnTo" value={buildHref({})} />
                              <select name="newTeacherId" defaultValue="" style={{ minWidth: 180 }}>
                                <option value="" disabled>
                                  {t(lang, "Select teacher", "选择老师")}
                                </option>
                                {eligibleTeachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <select name="scope" defaultValue="single">
                                <option value="single">{t(lang, "This session only", "仅本节课")}</option>
                                <option value="future">{t(lang, "Future sessions", "本班级未来所有课次")}</option>
                              </select>
                              <input name="reason" type="text" placeholder={t(lang, "Reason (optional)", "原因(可选)")} />
                              <button type="submit">{t(lang, "Replace", "替换")}</button>
                            </form>
                          ) : (
                            <form action={replaceAppointmentTeacher} style={{ display: "grid", gap: 6 }}>
                              <input type="hidden" name="appointmentId" value={e.id} />
                              <input type="hidden" name="returnTo" value={buildHref({})} />
                              <select name="newTeacherId" defaultValue="" style={{ minWidth: 180 }}>
                                <option value="" disabled>
                                  {t(lang, "Select teacher", "选择老师")}
                                </option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <input name="reason" type="text" placeholder={t(lang, "Reason (optional)", "原因(可选)")} />
                              <button type="submit">{t(lang, "Replace", "替换")}</button>
                            </form>
                          )}
                        </td>
                        <td>
                          {e.kind === "appointment" ? (
                            <form action={deleteAppointment}>
                              <input type="hidden" name="appointmentId" value={e.id} />
                              <input type="hidden" name="returnTo" value={buildHref({})} />
                              <ConfirmSubmitButton message={t(lang, "Delete appointment?", "删除预约？")}>
                                {t(lang, "Delete", "删除")}
                              </ConfirmSubmitButton>
                            </form>
                          ) : e.kind === "session" ? (
                            <form action={deleteSession}>
                              <input type="hidden" name="sessionId" value={e.id} />
                              <input type="hidden" name="returnTo" value={buildHref({})} />
                              <ConfirmSubmitButton message={t(lang, "Delete session?", "删除课次？")}>
                                {t(lang, "Delete", "删除")}
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>

                      {isConflict && reasons.length > 0 && (
                        <tr style={{ background: "#fff5f5" }}>
                          <td colSpan={11} style={{ borderTop: "1px dashed #f1c0c0" }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>
                              {t(lang, "Conflict Details", "冲突详情")}：{" "}
                              <span style={{ fontWeight: 500 }}>{reasonLabel}</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {reasons.slice(0, 10).map((r) => (
                                <li key={r.id}>
                                  Overlaps with{" "}
                                  <b>{r.kind === "session" ? "Class" : "1-1"}</b>{" "}
                                  ({fmtTime(r.startAt)} - {fmtTime(r.endAt)}) — {metaLine(r)}{" "}
                                  {r.href ? (
                                    <>
                                      |{" "}
                                      <a href={r.href} target="_blank" rel="noreferrer">
                                        {r.title} ({r.goLabel ?? "Open"})
                                      </a>
                                    </>
                                  ) : (
                                    <>| {r.title}</>
                                  )}
                                </li>
                              ))}
                              {reasons.length > 10 && (
                                <li>...and {reasons.length - 10} more</li>
                              )}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

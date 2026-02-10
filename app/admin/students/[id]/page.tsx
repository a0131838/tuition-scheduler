﻿import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";
import { getLang, t } from "@/lib/i18n";
import ConfirmSubmitButton from "../../_components/ConfirmSubmitButton";
import QuickScheduleModal from "../../_components/QuickScheduleModal";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";
import StudentAttendanceFilterForm from "../../_components/StudentAttendanceFilterForm";
import NoticeBanner from "../../_components/NoticeBanner";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { courseEnrollmentConflictMessage } from "@/lib/enrollment-conflict";
const zhMap: Record<string, string> = {
  "Action": "\u64cd\u4f5c",
  "Actions": "\u64cd\u4f5c",
  "All": "\u5168\u90e8",
  "Amount": "\u91d1\u989d",
  "Apply": "\u5e94\u7528",
  "Appt": "\u9884\u7ea6",
  "Attendance": "\u70b9\u540d",
  "Available": "\u53ef\u6392",
  "Back": "\u8fd4\u56de",
  "Back to Students": "\u8fd4\u56de\u5b66\u751f\u5217\u8868",
  "Campus": "\u6821\u533a",
  "Cancel": "\u53d6\u6d88",
  "Cancelled": "\u5df2\u53d6\u6d88",
  "Charge": "\u6263\u8d39",
  "Charged": "\u6263\u8d39",
  "Choose subject, campus, room and time to match teachers.": "\u9009\u62e9\u79d1\u76ee\u3001\u6821\u533a\u3001\u6559\u5ba4\u548c\u65f6\u95f4\u540e\u5339\u914d\u8001\u5e08",
  "Change Teacher": "\u6362\u8001\u5e08",
  "Change Course": "\u6362\u8bfe\u7a0b",
  "Replace Teacher": "\u66ff\u6362\u8001\u5e08",
  "Reason (optional)": "\u539f\u56e0(\u53ef\u9009)",
  "Select teacher": "\u9009\u62e9\u8001\u5e08",
  "Class": "\u73ed\u7ea7",
  "Clear": "\u6e05\u9664",
  "Close": "\u5173\u95ed",
  "Course": "\u8bfe\u7a0b",
  "Deduct": "\u6263\u51cf",
  "Delete Student": "\u5220\u9664\u5b66\u751f",
  "Delete student? This also deletes enrollments/appointments/packages.": "\u5220\u9664\u5b66\u751f\uff1f\u5c06\u540c\u65f6\u5220\u9664\u62a5\u540d/\u9884\u7ea6/\u8bfe\u5305\u3002",
  "Detail": "\u8be6\u60c5",
  "Download PDF": "\u5bfc\u51faPDF",
  "Export Student Report": "\u5bfc\u51fa\u5b66\u751f\u62a5\u544a",
  "Duration (minutes)": "\u65f6\u957f(\u5206\u949f)",
  "Edit Student": "\u7f16\u8f91\u5b66\u751f",
  "Enrollments": "\u62a5\u540d",
  "Error": "\u9519\u8bef",
  "Excused Count": "\u7d2f\u8ba1\u8bf7\u5047",
  "Find Available Teachers": "\u67e5\u627e\u53ef\u7528\u8001\u5e08",
  "Grade": "\u5e74\u7ea7",
  "Invalid subject/level selected.": "\u79d1\u76ee/\u7ea7\u522b\u4e0d\u5339\u914d",
  "Level": "\u7ea7\u522b",
  "Level (optional)": "\u7ea7\u522b(\u53ef\u9009)",
  "Limit": "\u6761\u6570",
  "Name": "\u59d3\u540d",
  "Next Month": "\u4e0b\u6708",
  "No": "\u5426",
  "No attendance records.": "\u6682\u65e0\u70b9\u540d\u8bb0\u5f55",
  "No eligible teachers found.": "\u672a\u627e\u5230\u53ef\u6388\u8bfe\u8001\u5e08",
  "No enrollments.": "\u6682\u65e0\u62a5\u540d",
  "No packages.": "\u6682\u65e0\u8bfe\u5305",
  "No upcoming sessions.": "\u6682\u65e0\u5373\u5c06\u4e0a\u8bfe",
  "Note": "\u5907\u6ce8",
  "Notes": "\u6ce8\u610f\u4e8b\u9879",
  "OK": "\u6210\u529f",
  "Open Modal": "\u5f39\u7a97\u6392\u8bfe",
  "optional": "\u53ef\u9009",
  "Packages": "\u8bfe\u5305",
  "Paid": "\u5df2\u4ed8\u6b3e",
  "Paid At": "\u4ed8\u6b3e\u65f6\u95f4",
  "Prev Month": "\u4e0a\u6708",
  "Quick Schedule": "\u5feb\u901f\u6392\u8bfe",
  "Quick Schedule (by Student Time)": "\u5feb\u901f\u6392\u8bfe\uff08\u6309\u5b66\u751f\u65f6\u95f4\uff09",
  "Quick Schedule Calendar": "\u5feb\u901f\u6392\u8bfe\u65e5\u5386",
  "Recent Attendance": "\u8fd1\u671f\u70b9\u540d",
  "Recent days": "\u6700\u8fd1\u5929\u6570",
  "Remaining": "\u5269\u4f59",
  "Restore": "\u6062\u590d",
  "Restore this session?": "\u786e\u8ba4\u6062\u590d\u8be5\u8bfe\u6b21\uff1f",
  "Room": "\u6559\u5ba4",
  "Save": "\u4fdd\u5b58",
  "Schedule": "\u6392\u8bfe",
  "Scheduled": "\u5df2\u6392\u8bfe",
  "School": "\u5b66\u6821",
  "Session": "\u8bfe\u6b21",
  "Sessions": "\u8bfe\u6b21",
  "Download Schedule PDF": "\u4e0b\u8f7d\u6708\u8bfe\u8868PDF",
  "Date Range": "\u65e5\u671f\u8303\u56f4",
  "From": "\u5f00\u59cb",
  "To": "\u7ed3\u675f",
  "Download by Date Range": "\u6309\u65e5\u671f\u8303\u56f4\u4e0b\u8f7d",
  "Download": "\u4e0b\u8f7d",
  "Source": "\u6765\u6e90",
  "Start": "\u5f00\u59cb",
  "Status": "\u72b6\u6001",
  "Student Detail": "\u5b66\u751f\u8be6\u60c5",
  "Student Not Found": "\u5b66\u751f\u4e0d\u5b58\u5728",
  "Subject": "\u79d1\u76ee",
  "Teacher": "\u8001\u5e08",
  "Type": "\u7c7b\u578b",
  "Unpaid packages": "\u672a\u4ed8\u6b3e\u8bfe\u5305",
  "Usage 30d": "\u8fd130\u5929\u6d88\u8017",
  "Forecast": "\u9884\u8ba1\u7528\u5b8c",
  "Alert": "\u9884\u8b66",
  "No usage (30d)": "\u8fd130\u5929\u65e0\u6d88\u8017",
  "Depleted": "\u5df2\u7528\u5b8c",
  "Low balance": "\u4f59\u989d\u4f4e",
  "Likely to run out soon": "\u5373\u5c06\u7528\u5b8c",
  "Normal": "\u6b63\u5e38",
  "Inactive": "\u672a\u751f\u6548",
  "Urgent": "\u7d27\u6025",
  "days": "\u5929",
  "Upcoming Sessions": "\u5373\u5c06\u4e0a\u8bfe",
  "Valid": "\u6709\u6548\u671f",
  "Yes": "\u662f"
};

function tl(lang: Lang, en: string) {
  return t(lang, en, zhMap[en] ?? en);
}

const GRADE_OPTIONS = [
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "G13",
  "UG1",
  "UG2",
  "UG3",
  "UG4",
  "大一",
  "大二",
  "大三",
  "大四",
];

const ATTENDANCE_DEFAULT_LIMIT = 200;
const LOW_MINUTES = 120;
const FORECAST_WINDOW_DAYS = 30;
const LOW_DAYS = 7;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDateInput(d: Date | null) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtMinutes(min?: number | null) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function toInt(v: string | undefined, def: number) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : def;
}

function parseDatetimeLocal(s: string) {
  const [date, time] = s.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

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

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function formatSessionConflictLabel(s: any) {
  const cls = s.class;
  const classLabel = `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
  const roomLabel = cls.room?.name ?? "(none)";
  const timeLabel = `${fmtDateInput(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}`;
  return `${classLabel} | ${cls.teacher.name} | ${cls.campus.name} / ${roomLabel} | ${timeLabel}`;
}

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtDatetimeLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${dd}T${hh}:${mm}`;
}

function parseMonth(s?: string) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthLabel(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfCalendar(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  return start;
}

function buildCalendarDays(monthDate: Date) {
  const start = startOfCalendar(monthDate);
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      date: d,
      inMonth: d.getMonth() === monthDate.getMonth(),
    });
  }
  return days;
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
      return `No availability on ${WEEKDAYS[(weekday + 6) % 7] ?? weekday} (no slots)`;
    }
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const weekday = startAt.getDay();
    return `Outside availability ${WEEKDAYS[(weekday + 6) % 7] ?? weekday} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}. Available: ${ranges}`;
  }

  return null;
}

function buildRedirectToTeacherWeek(teacherId: string, startAt: Date) {
  const x = new Date(startAt);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  const weekStart = fmtYMD(x);
  const p = new URLSearchParams({
    view: "teacher",
    teacherId,
    weekStart,
  });
  return `/admin/schedule?${p.toString()}`;
}

async function updateStudent(studentId: string, formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const birthDateStr = String(formData.get("birthDate") ?? "").trim();
  const sourceChannelId = String(formData.get("sourceChannelId") ?? "").trim() || null;
  const studentTypeId = String(formData.get("studentTypeId") ?? "").trim() || null;

  if (!name) {
    redirect(`/admin/students/${studentId}?err=Name+is+required`);
  }

  let birthDate: Date | null = null;
  if (birthDateStr) {
    const [Y, M, D] = birthDateStr.split("-").map(Number);
    if (Number.isFinite(Y) && Number.isFinite(M) && Number.isFinite(D)) {
      birthDate = new Date(Y, M - 1, D, 0, 0, 0, 0);
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      name,
      school: school || null,
      grade: grade || null,
      note: note || null,
      birthDate,
      sourceChannelId,
      studentTypeId,
    },
  });

  redirect(`/admin/students/${studentId}?msg=Saved`);
}

async function deleteStudent(studentId: string) {
  "use server";
  await prisma.enrollment.deleteMany({ where: { studentId } });
  await prisma.appointment.deleteMany({ where: { studentId } });
  await prisma.attendance.deleteMany({ where: { studentId } });

  const packages = await prisma.coursePackage.findMany({
    where: { studentId },
    select: { id: true },
  });
  const packageIds = packages.map((p) => p.id);
  if (packageIds.length > 0) {
    await prisma.packageTxn.deleteMany({ where: { packageId: { in: packageIds } } });
  }
  await prisma.coursePackage.deleteMany({ where: { studentId } });

  await prisma.student.delete({ where: { id: studentId } });
  redirect("/admin/students");
}

async function createQuickAppointment(studentId: string, formData: FormData) {
  "use server";
  const teacherId = String(formData.get("teacherId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const levelIdRaw = String(formData.get("levelId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const startAtStr = String(formData.get("startAt") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 60);
  const month = String(formData.get("month") ?? "").trim();

  const backWithQuickParams = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    params.set("quickOpen", "1");
    if (subjectId) params.set("quickSubjectId", subjectId);
    if (levelIdRaw) params.set("quickLevelId", levelIdRaw);
    if (campusId) params.set("quickCampusId", campusId);
    if (roomIdRaw) params.set("quickRoomId", roomIdRaw);
    if (startAtStr) params.set("quickStartAt", startAtStr);
    if (Number.isFinite(durationMin) && durationMin > 0) params.set("quickDurationMin", String(durationMin));
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, v);
    }
    return `/admin/students/${studentId}?${params.toString()}`;
  };

  try {
    if (
      !teacherId ||
      !subjectId ||
      !campusId ||
      !startAtStr ||
      !Number.isFinite(durationMin) ||
      durationMin < 15
    ) {
      redirect(backWithQuickParams({ err: "Invalid input" }));
    }

    const roomId = roomIdRaw || null;
    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus) {
      redirect(backWithQuickParams({ err: "Campus not found" }));
    }
    if (!roomId && !campus.isOnline) {
      redirect(backWithQuickParams({ err: "Room is required" }));
    }
    if (roomId) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.campusId !== campusId) {
        redirect(backWithQuickParams({ err: "Invalid room" }));
      }
    }
    const startAt = parseDatetimeLocal(startAtStr);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { subjects: true },
    });
    if (!teacher) {
      redirect(backWithQuickParams({ err: "Teacher not found" }));
    }
    const canTeach =
      teacher.subjectCourseId === subjectId || teacher.subjects.some((s) => s.id === subjectId);
    if (!canTeach) {
      redirect(backWithQuickParams({ err: "Teacher cannot teach this course" }));
    }

    const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
    if (availErr) {
      redirect(backWithQuickParams({ err: availErr }));
    }

    const teacherSessionConflict = await prisma.session.findFirst({
      where: {
        class: { teacherId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
    });
    if (teacherSessionConflict) {
      const cls = teacherSessionConflict.class;
      const classLabel = `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
      const roomLabel = cls.room?.name ?? "(none)";
      const timeLabel = `${fmtDateInput(teacherSessionConflict.startAt)} ${fmtHHMM(teacherSessionConflict.startAt)}-${fmtHHMM(teacherSessionConflict.endAt)}`;
      redirect(
        backWithQuickParams({
          err: `Teacher conflict: ${cls.teacher.name} | ${classLabel} | ${cls.campus.name} / ${roomLabel} | ${timeLabel}`,
        })
      );
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
      const timeLabel = `${fmtDateInput(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
        teacherApptConflict.endAt
      )}`;
      redirect(backWithQuickParams({ err: `Teacher conflict with appointment ${timeLabel}` }));
    }

    if (roomId) {
      const roomConflict = await prisma.session.findFirst({
        where: {
          class: { roomId },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
      });
      if (roomConflict) {
        const cls = roomConflict.class;
        const classLabel = `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
        const roomLabel = cls.room?.name ?? "(none)";
        const timeLabel = `${fmtDateInput(roomConflict.startAt)} ${fmtHHMM(roomConflict.startAt)}-${fmtHHMM(roomConflict.endAt)}`;
        redirect(
          backWithQuickParams({
            err: `Room conflict: ${roomLabel} | ${classLabel} | ${cls.teacher.name} | ${timeLabel}`,
          })
        );
      }
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, courseId: true },
    });
    if (!subject) {
      redirect(backWithQuickParams({ err: "Invalid subject" }));
    }
    let levelId: string | null = null;
    if (levelIdRaw) {
      const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
      if (!level || level.subjectId !== subjectId) {
        redirect(backWithQuickParams({ err: "Invalid subject or level" }));
      }
      levelId = levelIdRaw;
    }

    const courseId = subject.courseId;
    const activePkg = await prisma.coursePackage.findFirst({
      where: {
        studentId,
        courseId,
        status: "ACTIVE",
        validFrom: { lte: startAt },
        OR: [{ validTo: null }, { validTo: { gte: startAt } }],
        AND: [{ OR: [{ type: "MONTHLY" }, { type: "HOURS", remainingMinutes: { gt: 0 } }] }],
      },
      select: { id: true },
    });
    if (!activePkg) {
      redirect(backWithQuickParams({ err: "No active package for this course" }));
    }

    const cls = await getOrCreateOneOnOneClassForStudent({
      teacherId,
      studentId,
      courseId,
      subjectId,
      levelId,
      campusId,
      roomId,
      ensureEnrollment: true,
    });
    if (!cls) {
      redirect(backWithQuickParams({ err: "Invalid subject or level" }));
    }

    const dupSession = await prisma.session.findFirst({
      where: { classId: cls.id, startAt, endAt },
      select: { id: true },
    });
    if (!dupSession) {
      await prisma.session.create({
        data: { classId: cls.id, startAt, endAt, studentId },
      });
    }

    // enrollment ensured by helper
    const params = new URLSearchParams({
      msg: "Scheduled",
    });
    if (month) params.set("month", month);
    redirect(`/admin/students/${studentId}?${params.toString()}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("Quick schedule failed", {
      studentId,
      teacherId,
      subjectId,
      levelIdRaw,
      campusId,
      roomIdRaw,
      startAtStr,
      durationMin,
      error,
    });
    const raw = error instanceof Error ? error.message : "Quick schedule failed";
    const message =
      raw === "COURSE_ENROLLMENT_CONFLICT"
        ? courseEnrollmentConflictMessage(await getLang())
        : raw;
    redirect(backWithQuickParams({ err: message }));
  }
}

async function replaceSessionTeacherForStudent(studentId: string, formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const newTeacherId = String(formData.get("newTeacherId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? `/admin/students/${studentId}`);

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

  const availErr = await checkTeacherAvailability(newTeacherId, session.startAt, session.endAt);
  if (availErr) {
    redirect(`${returnTo}&err=${encodeURIComponent(availErr)}`);
  }

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      id: { not: session.id },
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
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
      teacherId: newTeacherId,
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) {
    const timeLabel = `${fmtDateInput(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
      teacherApptConflict.endAt
    )}`;
    redirect(`${returnTo}&err=${encodeURIComponent(`Teacher conflict with appointment ${timeLabel}`)}`);
  }

  await prisma.$transaction(async (tx) => {
    const fromTeacherId = session.teacherId ?? session.class.teacherId;
    const toTeacherId = newTeacherId;
    if (fromTeacherId !== toTeacherId) {
      await tx.session.update({
        where: { id: session.id },
        data: { teacherId: toTeacherId === session.class.teacherId ? null : toTeacherId },
      });
      await tx.sessionTeacherChange.create({
        data: {
          sessionId: session.id,
          fromTeacherId,
          toTeacherId,
          reason,
        },
      });
    }
  });

  redirect(`${returnTo}&msg=Replaced`);
}

async function cancelStudentSession(studentId: string, formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const month = String(formData.get("month") ?? "").trim();
  const charge = String(formData.get("charge") ?? "") === "on";
  const note = String(formData.get("note") ?? "").trim();

  if (!sessionId) {
    redirect(`/admin/students/${studentId}?err=Missing+sessionId`);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true } } },
  });
  if (!session) {
    redirect(`/admin/students/${studentId}?err=Session+not+found`);
  }

  const durationMin = Math.max(0, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000));
  const desiredDeductedMinutes = charge ? durationMin : 0;

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
    select: { deductedMinutes: true, packageId: true, deductedCount: true },
  });
  const prevDeductedMinutes = existing?.deductedMinutes ?? 0;
  const delta = desiredDeductedMinutes - prevDeductedMinutes;

  let packageId: string | null = existing?.packageId ?? null;

  if (delta !== 0) {
    if (!packageId && delta > 0) {
      const pkg = await prisma.coursePackage.findFirst({
        where: {
          studentId,
          courseId: session.class.courseId,
          type: "HOURS",
          status: "ACTIVE",
          validFrom: { lte: session.startAt },
          OR: [{ validTo: null }, { validTo: { gte: session.startAt } }],
        },
        orderBy: [{ createdAt: "asc" }],
        select: { id: true },
      });
      packageId = pkg?.id ?? null;
    }

    if (!packageId) {
      redirect(`/admin/students/${studentId}?err=No+active+HOURS+package`);
    }

    const pkg = await prisma.coursePackage.findFirst({
      where: {
        id: packageId,
        studentId,
        courseId: session.class.courseId,
        status: "ACTIVE",
        validFrom: { lte: session.startAt },
        OR: [{ validTo: null }, { validTo: { gte: session.startAt } }],
      },
      select: { id: true, type: true, status: true, remainingMinutes: true },
    });

    if (!pkg) {
      redirect(`/admin/students/${studentId}?err=Package+not+found`);
    }
    if (pkg.type !== "HOURS") {
      redirect(`/admin/students/${studentId}?err=Package+not+HOURS`);
    }
    if (pkg.remainingMinutes == null) {
      redirect(`/admin/students/${studentId}?err=Package+remaining+minutes+is+null`);
    }

    if (delta > 0) {
      if (pkg.remainingMinutes < delta) {
        redirect(`/admin/students/${studentId}?err=Not+enough+remaining+minutes`);
      }
      await prisma.coursePackage.update({
        where: { id: packageId },
        data: { remainingMinutes: { decrement: delta } },
      });
      await prisma.packageTxn.create({
        data: {
          packageId,
          kind: "DEDUCT",
          deltaMinutes: -delta,
          sessionId,
          note: `Cancel charge. studentId=${studentId}`,
        },
      });
    } else {
      const refund = -delta;
      await prisma.coursePackage.update({
        where: { id: packageId },
        data: { remainingMinutes: { increment: refund } },
      });
      await prisma.packageTxn.create({
        data: {
          packageId,
          kind: "ROLLBACK",
          deltaMinutes: refund,
          sessionId,
          note: `Cancel rollback. studentId=${studentId}`,
        },
      });
    }
  }

  await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    create: {
      sessionId,
      studentId,
      status: "EXCUSED",
      deductedCount: existing?.deductedCount ?? 0,
      deductedMinutes: desiredDeductedMinutes,
      packageId: desiredDeductedMinutes > 0 ? packageId : null,
      note: note || "Canceled",
      excusedCharge: charge,
    },
    update: {
      status: "EXCUSED",
      deductedMinutes: desiredDeductedMinutes,
      packageId: desiredDeductedMinutes > 0 ? packageId : null,
      note: note || "Canceled",
      excusedCharge: charge,
    },
  });

  const params = new URLSearchParams({ msg: "Session cancelled" });
  if (month) params.set("month", month);
  redirect(`/admin/students/${studentId}?${params.toString()}`);
}

async function restoreStudentSession(studentId: string, formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const month = String(formData.get("month") ?? "").trim();

  if (!sessionId) {
    redirect(`/admin/students/${studentId}?err=Missing+sessionId`);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true } } },
  });
  if (!session) {
    redirect(`/admin/students/${studentId}?err=Session+not+found`);
  }

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
    select: { status: true, deductedMinutes: true, packageId: true },
  });

  if (!existing || existing.status !== "EXCUSED") {
    const params = new URLSearchParams({ msg: "Session restored" });
    if (month) params.set("month", month);
    redirect(`/admin/students/${studentId}?${params.toString()}`);
  }

  const refundMinutes = existing.deductedMinutes ?? 0;
  const packageId = existing.packageId ?? null;

  if (refundMinutes > 0 && packageId) {
    await prisma.coursePackage.update({
      where: { id: packageId },
      data: { remainingMinutes: { increment: refundMinutes } },
    });
    await prisma.packageTxn.create({
      data: {
        packageId,
        kind: "ROLLBACK",
        deltaMinutes: refundMinutes,
        sessionId,
        note: `Restore cancel. studentId=${studentId}`,
      },
    });
  }

  await prisma.attendance.update({
    where: { sessionId_studentId: { sessionId, studentId } },
    data: {
      status: "UNMARKED",
      excusedCharge: false,
      deductedMinutes: 0,
      note: null,
    },
  });

  const params = new URLSearchParams({ msg: "Session restored" });
  if (month) params.set("month", month);
  redirect(`/admin/students/${studentId}?${params.toString()}`);
}
export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string; [key: string]: string | undefined }>;
}) {
  const lang = await getLang();
  const { id: studentId } = await params;
  const sp = await searchParams;

  const courseId = sp?.courseId ?? "";
  const subjectId = sp?.subjectId ?? "";
  const levelIdFilter = sp?.levelId ?? "";
  const teacherId = sp?.teacherId ?? "";
  const status = sp?.status ?? "";
  const days = toInt(sp?.days, 0);
  const limitRaw = toInt(sp?.limit, ATTENDANCE_DEFAULT_LIMIT);
  const limit = Math.min(Math.max(limitRaw, 1), 500);
  const quickSubjectId = sp?.quickSubjectId ?? "";
  const quickLevelId = sp?.quickLevelId ?? "";
  const quickStartAt = sp?.quickStartAt ?? "";
  const quickDurationMin = Math.max(15, toInt(sp?.quickDurationMin, 60));
  const quickCampusId = sp?.quickCampusId ?? "";
  const quickRoomId = sp?.quickRoomId ?? "";
  const monthParam = sp?.month ?? "";
  const quickOpen = sp?.quickOpen === "1";

  const now = new Date();
  const monthParsed = parseMonth(monthParam);
  const monthDate = monthParsed ? new Date(monthParsed.year, monthParsed.month - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1, 0, 0, 0, 0);

  const sessionWhere: any = {};
  if (days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    sessionWhere.startAt = { gte: since };
  }
  const classWhere: any = {};
  if (courseId) classWhere.courseId = courseId;
  if (subjectId) classWhere.subjectId = subjectId;
  if (levelIdFilter) classWhere.levelId = levelIdFilter;
  if (teacherId) classWhere.teacherId = teacherId;
  if (Object.keys(classWhere).length > 0) {
    sessionWhere.class = classWhere;
  }

  const attendanceWhere: any = { studentId };
  if (status) attendanceWhere.status = status;
  if (Object.keys(sessionWhere).length > 0) {
    attendanceWhere.session = sessionWhere;
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { sourceChannel: true, studentType: true },
  });
  if (!student) {
    return (
      <div>
        <h2>{tl(lang, "Student Not Found")}</h2>
        <a href="/admin/students">&lt;&lt; {tl(lang, "Back")}</a>
      </div>
    );
  }

  const [
    enrollCount,
    packageCount,
    unpaidPackageCount,
    excusedCount,
    enrollments,
    packages,
    attendances,
    courses,
    subjects,
    levels,
    teachers,
    sources,
    types,
    monthAppointments,
    campuses,
    rooms,
  ] = await Promise.all([
    prisma.enrollment.count({ where: { studentId } }),
    prisma.coursePackage.count({ where: { studentId } }),
    prisma.coursePackage.count({ where: { studentId, paid: false } }),
    prisma.attendance.count({ where: { studentId, status: "EXCUSED" } }),
    prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.coursePackage.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        session: {
          include: { class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ include: { subject: { include: { course: true } } }, orderBy: [{ subjectId: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ include: { subjects: true }, orderBy: { name: "asc" } }),
    prisma.studentSourceChannel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.studentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.appointment.findMany({
      where: { studentId, startAt: { gte: monthStart, lt: monthEnd } },
      include: { teacher: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  const classIds = enrollments.map((e) => e.classId);
  const upcomingRangeEnd = new Date();
  upcomingRangeEnd.setDate(upcomingRangeEnd.getDate() + 60);
  const upcomingSessions = classIds.length
    ? await prisma.session.findMany({
        where: {
          classId: { in: classIds },
          startAt: { gte: new Date(), lt: upcomingRangeEnd },
          OR: [{ studentId: null }, { studentId }],
        },
        include: { class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
        orderBy: { startAt: "asc" },
      })
    : [];
  const upcomingSessionIds = upcomingSessions.map((s) => s.id);
  const upcomingAttendance = upcomingSessionIds.length
    ? await prisma.attendance.findMany({
        where: { studentId, sessionId: { in: upcomingSessionIds } },
        select: { sessionId: true, status: true, excusedCharge: true, deductedMinutes: true },
      })
    : [];
  const upcomingAttendanceMap = new Map(upcomingAttendance.map((a) => [a.sessionId, a]));

  const teacherSessions = classIds.length
    ? await prisma.session.findMany({
        where: {
          classId: { in: classIds },
          startAt: { gte: monthStart, lt: monthEnd },
          OR: [{ studentId: null }, { studentId }],
        },
        include: { class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
        orderBy: { startAt: "asc" },
      })
    : [];
  const monthSessionIds = teacherSessions.map((s) => s.id);
  const monthAttendance = monthSessionIds.length
    ? await prisma.attendance.findMany({
        where: { studentId, sessionId: { in: monthSessionIds } },
        select: { sessionId: true, status: true, excusedCharge: true },
      })
    : [];
  const monthAttendanceMap = new Map(monthAttendance.map((a) => [a.sessionId, a]));

  const usageSince = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const packageIds = packages.map((p) => p.id);
  const deductedRows = packageIds.length
    ? await prisma.packageTxn.groupBy({
        by: ["packageId"],
        where: {
          packageId: { in: packageIds },
          kind: "DEDUCT",
          createdAt: { gte: usageSince },
        },
        _sum: { deltaMinutes: true },
      })
    : [];
  const deducted30Map = new Map(
    deductedRows.map((r) => [r.packageId, Math.abs(Math.min(0, r._sum.deltaMinutes ?? 0))])
  );
  const purchasedCourseIds = new Set(
    packages
      .map((p) => p.courseId)
      .filter((id): id is string => Boolean(id))
  );
  const quickSubjects = subjects.filter((s) => purchasedCourseIds.has(s.courseId));
  const quickSubjectIds = new Set(quickSubjects.map((s) => s.id));
  const quickLevels = levels.filter((l) => quickSubjectIds.has(l.subjectId));

  const appointmentsByDay = new Map<string, typeof monthAppointments>();
  for (const appt of monthAppointments) {
    const key = fmtYMD(new Date(appt.startAt));
    const arr = appointmentsByDay.get(key) ?? [];
    arr.push(appt);
    appointmentsByDay.set(key, arr);
  }

  const sessionsByDay = new Map<string, typeof teacherSessions>();
  for (const sess of teacherSessions) {
    const key = fmtYMD(new Date(sess.startAt));
    const arr = sessionsByDay.get(key) ?? [];
    arr.push(sess);
    sessionsByDay.set(key, arr);
  }
  const sessionKeyMap = new Map<string, (typeof teacherSessions)[number]>();
  for (const sess of teacherSessions) {
    const key = `${sess.class.teacherId}|${new Date(sess.startAt).toISOString()}|${new Date(
      sess.endAt
    ).toISOString()}`;
    sessionKeyMap.set(key, sess);
  }

  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const returnTo = `/admin/students/${studentId}?month=${monthLabel(monthDate)}`;

  const quickCandidates: {
    id: string;
    name: string;
    ok: boolean;
    reason?: string;
  }[] = [];
  let quickPackageWarn = "";
  const quickCampusIsOnline = campuses.some((c) => c.id === quickCampusId && c.isOnline);
  if (quickSubjectId && quickStartAt && quickCampusId && (quickRoomId || quickCampusIsOnline)) {
    const startAt = parseDatetimeLocal(quickStartAt);
    const endAt = new Date(startAt.getTime() + quickDurationMin * 60 * 1000);
    const quickSubject = await prisma.subject.findUnique({
      where: { id: quickSubjectId },
      select: { id: true, courseId: true },
    });
    if (!quickSubject) {
      quickPackageWarn = tl(lang, "Invalid subject/level selected.");
    } else {
      if (quickLevelId) {
        const quickLevel = await prisma.level.findUnique({
          where: { id: quickLevelId },
          select: { id: true, subjectId: true },
        });
        if (!quickLevel || quickLevel.subjectId !== quickSubjectId) {
          quickPackageWarn = tl(lang, "Invalid subject/level selected.");
        }
      }
    }
    if (!quickPackageWarn) {
      const pkg = await prisma.coursePackage.findFirst({
        where: {
          studentId,
          courseId: quickSubject?.courseId ?? "",
          status: "ACTIVE",
          validFrom: { lte: startAt },
          OR: [{ validTo: null }, { validTo: { gte: startAt } }],
          AND: [{ OR: [{ type: "MONTHLY" }, { type: "HOURS", remainingMinutes: { gt: 0 } }] }],
        },
        select: { id: true },
      });
      if (!pkg) {
        quickPackageWarn = t(
          lang,
          "No active package for this course. Please create a package before scheduling.",
          "该课程没有可用的有效课包，请先创建课包后再排课。"
        );
      }
    }
    if (!quickPackageWarn) {
      const roomConflict = quickRoomId
        ? await prisma.session.findFirst({
            where: {
              class: { roomId: quickRoomId },
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
            include: {
              class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
            },
          })
        : null;
      const eligible = teachers.filter(
        (tch) => tch.subjectCourseId === quickSubjectId || tch.subjects.some((s) => s.id === quickSubjectId)
      );
      for (const tch of eligible) {
        if (roomConflict) {
          quickCandidates.push({
            id: tch.id,
            name: tch.name,
            ok: false,
            reason: `Room conflict: ${formatSessionConflictLabel(roomConflict)}`,
          });
          continue;
        }
        const availErr = await checkTeacherAvailability(tch.id, startAt, endAt);
        if (availErr) {
          quickCandidates.push({ id: tch.id, name: tch.name, ok: false, reason: availErr });
          continue;
        }
        const sessionConflict = await prisma.session.findFirst({
          where: {
            class: { teacherId: tch.id },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          include: {
            class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
          },
        });
        if (sessionConflict) {
          quickCandidates.push({
            id: tch.id,
            name: tch.name,
            ok: false,
            reason: `Teacher conflict: ${formatSessionConflictLabel(sessionConflict)}`,
          });
          continue;
        }
        const apptConflict = await prisma.appointment.findFirst({
          where: {
            teacherId: tch.id,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true, startAt: true, endAt: true },
        });
        if (apptConflict) {
          const timeLabel = `${fmtDateInput(apptConflict.startAt)} ${fmtHHMM(apptConflict.startAt)}-${fmtHHMM(apptConflict.endAt)}`;
          quickCandidates.push({
            id: tch.id,
            name: tch.name,
            ok: false,
            reason: `Teacher conflict: appointment ${timeLabel}`,
          });
          continue;
        }
        quickCandidates.push({ id: tch.id, name: tch.name, ok: true });
      }
    }
  }

  const calendarDays = buildCalendarDays(monthDate);
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const baseParams = new URLSearchParams();
  if (quickSubjectId) baseParams.set("quickSubjectId", quickSubjectId);
  if (quickLevelId) baseParams.set("quickLevelId", quickLevelId);
  if (quickDurationMin) baseParams.set("quickDurationMin", String(quickDurationMin));
  if (quickStartAt) baseParams.set("quickStartAt", quickStartAt);
  if (quickCampusId) baseParams.set("quickCampusId", quickCampusId);
  if (quickRoomId) baseParams.set("quickRoomId", quickRoomId);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>{tl(lang, "Student Detail")}</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#666" }}>
            <a href="/admin/students" style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
              &lt;&lt; {tl(lang, "Back to Students")}
            </a>
            <span style={{ fontSize: 11, color: "#64748b" }} title={student.id}>
              ID: STU-{student.id.length > 10 ? `${student.id.slice(0, 4)}…${student.id.slice(-4)}` : student.id}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={`/api/exports/student-detail/${studentId}`}
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#f9fafb" }}
          >
            {tl(lang, "Export Student Report")}
          </a>
          <a
            href={`/api/exports/student-schedule/${studentId}?month=${monthLabel(monthDate)}`}
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#f9fafb" }}
          >
            {tl(lang, "Download Schedule PDF")}
          </a>
        </div>
      </div>

      {err ? <NoticeBanner type="error" title={tl(lang, "Error")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={tl(lang, "OK")} message={msg} /> : null}

      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Name")}</div>
              <div style={{ fontWeight: 700 }}>{student.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "School")}</div>
              <div style={{ fontWeight: 700 }}>{student.school ?? "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Grade")}</div>
              <div style={{ fontWeight: 700 }}>{student.grade ?? "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Source")}</div>
              <div style={{ fontWeight: 700 }}>{student.sourceChannel?.name ?? "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Type")}</div>
              <div style={{ fontWeight: 700 }}>{student.studentType?.name ?? "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Enrollments")}</div>
              <div style={{ fontWeight: 700 }}>{enrollCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Packages")}</div>
              <div style={{ fontWeight: 700 }}>{packageCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Unpaid packages")}</div>
              <div style={{ fontWeight: 700, color: unpaidPackageCount > 0 ? "#b00" : undefined }}>
                {unpaidPackageCount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Excused Count")}</div>
              <div style={{ fontWeight: 700 }}>{excusedCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Recent Attendance")}</div>
              <div style={{ fontWeight: 700 }}>{attendances.length}</div>
            </div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 12,
            background: "#fafafa",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 700 }}>{tl(lang, "Actions")}</div>
          <a
            href="#quick-schedule"
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff" }}
          >
            {tl(lang, "Quick Schedule")}
          </a>
          <a
            href="#edit-student"
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff" }}
          >
            {tl(lang, "Edit Student")}
          </a>
          {unpaidPackageCount > 0 ? (
            <div style={{ color: "#b00", fontWeight: 700 }}>
              {tl(lang, "Unpaid packages")}: {unpaidPackageCount}
            </div>
          ) : null}
        </div>

        <details open style={{ marginBottom: 14 }}>
            <summary style={{ fontWeight: 700 }}>{tl(lang, "Quick Schedule Calendar")}</summary>
            <div
              style={{
                margin: "6px 0 10px",
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 10,
                background: "#fafafa",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 700 }}>{tl(lang, "Download Schedule PDF")}</div>
              <form
                method="GET"
                action={`/api/exports/student-schedule/${studentId}`}
                style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
              >
                <span style={{ fontWeight: 700 }}>{tl(lang, "Date Range")}:</span>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {tl(lang, "From")}
                  <input name="start" type="date" defaultValue={fmtDateInput(monthStart)} />
                </label>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {tl(lang, "To")}
                  <input name="end" type="date" defaultValue={fmtDateInput(new Date(monthEnd.getTime() - 1))} />
                </label>
                <button type="submit">{tl(lang, "Download by Date Range")}</button>
              </form>
            </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <a href={`/admin/students/${studentId}?month=${monthLabel(prevMonth)}`}>
          &lt;&lt; {tl(lang, "Prev Month")}
        </a>
        <b>{monthLabel(monthDate)}</b>
        <a href={`/admin/students/${studentId}?month=${monthLabel(nextMonth)}`}>
          {tl(lang, "Next Month")} &gt;&gt;
        </a>
      </div>
      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {WEEKDAYS.map((wd) => (
              <th key={wd} align="left">
                {wd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <tr key={`row-${rowIdx}`}>
              {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((d) => {
                const key = fmtYMD(d.date);
                const dayAppts = appointmentsByDay.get(key) ?? [];
                const daySessions = sessionsByDay.get(key) ?? [];
                const params = new URLSearchParams(baseParams);
                params.set("month", monthLabel(monthDate));
                params.set("quickStartAt", `${key}T16:00`);
                params.set("quickOpen", "1");
                const link = `/admin/students/${studentId}?${params.toString()}`;
                return (
                  <td
                    key={key}
                    style={{
                      border: "1px solid #eee",
                      verticalAlign: "top",
                      height: 110,
                      background: d.inMonth ? "#fff" : "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ color: d.inMonth ? "#222" : "#aaa" }}>{d.date.getDate()}</b>
                      <a href={link} style={{ fontSize: 12 }}>
                        {tl(lang, "Schedule")}
                      </a>
                    </div>
                    {dayAppts.slice(0, 2).map((a) => {
                      const keyMatch = `${a.teacherId}|${new Date(a.startAt).toISOString()}|${new Date(
                        a.endAt
                      ).toISOString()}`;
                      const sess = sessionKeyMap.get(keyMatch);
                      const courseText = sess
                        ? `${sess.class.course.name}${sess.class.subject ? ` / ${sess.class.subject.name}` : ""}${
                            sess.class.level ? ` / ${sess.class.level.name}` : ""
                          }`
                        : "";
                      const placeText = sess
                        ? `${sess.class.campus.name}${sess.class.room ? ` / ${sess.class.room.name}` : ""}`
                        : "";
                      return (
                        <div key={a.id} style={{ fontSize: 12, lineHeight: 1.3, marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, color: "#1d4ed8" }}>
                            {tl(lang, "Appt")} {fmtHHMM(new Date(a.startAt))}-{fmtHHMM(new Date(a.endAt))}{" "}
                            {courseText}
                          </div>
                          <div style={{ color: "#2563eb" }}>
                            {a.teacher?.name ?? ""} {placeText}
                          </div>
                        </div>
                      );
                    })}
                    {daySessions.map((s) => {
                      const att = monthAttendanceMap.get(s.id);
                      const cancelled = att?.status === "EXCUSED";
                      return (
                        <div
                          key={s.id}
                          style={{
                            fontSize: 12,
                            color: cancelled ? "#888" : "#555",
                            lineHeight: 1.3,
                            marginBottom: 6,
                            opacity: cancelled ? 0.7 : 1,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              color: cancelled ? "#888" : "#d97706",
                              textDecoration: cancelled ? "line-through" : "none",
                            }}
                          >
                            {tl(lang, "Class")} {fmtHHMM(new Date(s.startAt))}-{fmtHHMM(new Date(s.endAt))}{" "}
                            <ClassTypeBadge capacity={s.class.capacity} compact />{" "}
                            {s.class.course.name}
                            {s.class.subject ? ` / ${s.class.subject.name}` : ""}{" "}
                            {s.class.level ? ` / ${s.class.level.name}` : ""}
                            {cancelled ? ` (${tl(lang, "Cancelled")})` : ""}
                            {att?.excusedCharge ? ` (${tl(lang, "Charged")})` : ""}
                          </div>
                          <div
                            style={{
                              color: cancelled ? "#888" : "#666",
                              textDecoration: cancelled ? "line-through" : "none",
                            }}
                          >
                            {s.class.teacher.name} {s.class.campus.name}
                            {s.class.room ? ` / ${s.class.room.name}` : ""}
                          </div>
                          {cancelled ? (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: 4,
                                padding: "1px 6px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#fff",
                                background: "#999",
                              }}
                            >
                              {tl(lang, "Cancelled")}
                            </span>
                          ) : null}
                          {cancelled ? (
                            <form
                              action={restoreStudentSession.bind(null, studentId)}
                              style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}
                            >
                              <input type="hidden" name="sessionId" value={s.id} />
                              <input type="hidden" name="month" value={monthLabel(monthDate)} />
                              <ConfirmSubmitButton message={tl(lang, "Restore this session?")}>
                                {tl(lang, "Restore")}
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <form
                              action={cancelStudentSession.bind(null, studentId)}
                              style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}
                            >
                              <input type="hidden" name="sessionId" value={s.id} />
                              <input type="hidden" name="month" value={monthLabel(monthDate)} />
                              <button
                                type="submit"
                                title={tl(lang, "Cancel")}
                                style={{
                                  border: "1px solid #f0b266",
                                  background: "#fff7ed",
                                  color: "#b45309",
                                  borderRadius: 6,
                                  padding: "2px 6px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                x
                              </button>
                              <label style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 11 }}>
                                <input type="checkbox" name="charge" />
                                {tl(lang, "Charge")}
                              </label>
                              <input name="note" placeholder={tl(lang, "Note")} style={{ fontSize: 11, padding: "2px 4px", width: 90 }} />
                            </form>
                          )}
                        </div>
                      );
                    })}
                    {dayAppts.length + daySessions.length > 4 ? (
                      <div style={{ fontSize: 12, color: "#999" }}>...</div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
            </details>

      <details style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Enrollments")}</summary>
      {enrollments.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No enrollments.")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginTop: 8 }}>
          {enrollments.map((e) => (
            <div key={e.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
              <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <ClassTypeBadge capacity={e.class.capacity} compact />
                <span>
                  {e.class.course.name}
                  {e.class.subject ? ` / ${e.class.subject.name}` : ""} {e.class.level ? ` / ${e.class.level.name}` : ""}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#eef2ff",
                    color: "#1d4ed8",
                  }}
                >
                  {tl(lang, "Enrollments")}
                </span>
              </div>
              <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                {tl(lang, "Teacher")}: {e.class.teacher.name} | {tl(lang, "Campus")}: {e.class.campus.name} | {tl(lang, "Room")}: {e.class.room?.name ?? "(none)"}
              </div>
              <div style={{ color: "#999", fontSize: 12, marginTop: 4 }}>CLS-{e.classId.slice(0, 4)}…{e.classId.slice(-4)}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                <a href={`/admin/classes/${e.classId}`}>{tl(lang, "Detail")}</a>
                <a href={`/admin/classes/${e.classId}/sessions`}>{tl(lang, "Sessions")}</a>
              </div>
            </div>
          ))}
        </div>
      )}
      </details>

      <details style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Packages")}</summary>
      {packages.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No packages.")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginTop: 8 }}>
          {packages.map((p) => {
            const remaining = p.remainingMinutes ?? 0;
            const deducted30 = deducted30Map.get(p.id) ?? 0;
            const avgPerDay = deducted30 / FORECAST_WINDOW_DAYS;
            const estDays =
              p.type === "HOURS" && p.status === "ACTIVE" && remaining > 0 && avgPerDay > 0
                ? Math.ceil(remaining / avgPerDay)
                : null;
            const lowMinutes = p.type === "HOURS" && p.status === "ACTIVE" && remaining <= LOW_MINUTES;
            const lowDays = p.type === "HOURS" && p.status === "ACTIVE" && estDays != null && estDays <= LOW_DAYS;
            const alertText =
              p.type !== "HOURS" || p.status !== "ACTIVE"
                ? "-"
                : remaining <= 0
                ? tl(lang, "Urgent")
                : lowMinutes || lowDays
                ? lowMinutes && lowDays
                  ? `${tl(lang, "Low balance")} + ${tl(lang, "Likely to run out soon")}`
                  : lowMinutes
                  ? tl(lang, "Low balance")
                  : tl(lang, "Likely to run out soon")
                : tl(lang, "Normal");
            return (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700 }}>{p.course?.name ?? "-"}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: p.status === "ACTIVE" ? "#ecfdf3" : "#fef2f2",
                      color: p.status === "ACTIVE" ? "#027a48" : "#b42318",
                    }}
                  >
                    {p.status}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: p.paid ? "#ecfdf3" : "#fff7ed",
                      color: p.paid ? "#027a48" : "#b45309",
                    }}
                  >
                    {p.paid ? tl(lang, "Paid") : tl(lang, "Unpaid packages")}
                  </span>
                  {alertText !== "-" ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: alertText === tl(lang, "Normal") ? "#ecfdf3" : "#fef2f2",
                        color: alertText === tl(lang, "Normal") ? "#027a48" : "#b42318",
                      }}
                    >
                      {alertText}
                    </span>
                  ) : null}
                </div>
                <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  {tl(lang, "Type")}: {p.type} | {tl(lang, "Status")}: {p.status}
                </div>
                <div style={{ marginTop: 6 }}>
                  {tl(lang, "Remaining")}:{" "}
                  <span style={{ fontWeight: (p.remainingMinutes ?? 0) <= LOW_MINUTES ? 700 : 400, color: (p.remainingMinutes ?? 0) <= LOW_MINUTES ? "#b00" : undefined }}>
                    {p.type === "HOURS" ? fmtMinutes(p.remainingMinutes) : "-"}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Usage 30d")}: {p.type === "HOURS" ? `${fmtMinutes(deducted30)} / ${FORECAST_WINDOW_DAYS}d` : "-"}
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Forecast")}:{" "}
                  {p.type !== "HOURS"
                    ? "-"
                    : p.status !== "ACTIVE"
                    ? tl(lang, "Inactive")
                    : remaining <= 0
                    ? tl(lang, "Depleted")
                    : estDays == null
                    ? tl(lang, "No usage (30d)")
                    : `${estDays} ${tl(lang, "days")}`}
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Alert")}:{" "}
                  <span style={{ color: alertText === tl(lang, "Normal") ? "#0a7" : alertText === "-" ? "#666" : "#b00", fontWeight: alertText === tl(lang, "Normal") ? 400 : 700 }}>
                    {alertText}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Valid")}: {new Date(p.validFrom).toLocaleDateString()} ~ {p.validTo ? new Date(p.validTo).toLocaleDateString() : "(open)"}
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Paid")}: {p.paid ? tl(lang, "Yes") : tl(lang, "No")} | {tl(lang, "Paid At")}: {p.paidAt ? new Date(p.paidAt).toLocaleString() : "-"}
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Amount")}: {p.paidAmount ?? "-"}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </details>

      <details style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Attendance")}</summary>
      <StudentAttendanceFilterForm
        studentId={studentId}
        courses={courses.map((c) => ({ id: c.id, name: c.name }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
        levels={levels.map((l) => ({
          id: l.id,
          name: l.name,
          subjectId: l.subjectId,
          subjectName: l.subject.name,
          courseName: l.subject.course.name,
        }))}
        teachers={teachers.map((t) => ({ id: t.id, name: t.name }))}
        initial={{
          courseId,
          subjectId,
          levelId: levelIdFilter,
          teacherId,
          status,
          days: days ? String(days) : "",
          limit: String(limit),
        }}
        labels={{
          course: tl(lang, "Course"),
          subject: tl(lang, "Subject"),
          level: tl(lang, "Level (optional)"),
          courseAll: tl(lang, "All"),
          subjectAll: tl(lang, "All"),
          levelAll: tl(lang, "All"),
          teacher: tl(lang, "Teacher"),
          teacherAll: tl(lang, "All"),
          status: tl(lang, "Status"),
          statusAll: tl(lang, "All"),
          recentDays: tl(lang, "Recent days"),
          limit: tl(lang, "Limit"),
          apply: tl(lang, "Apply"),
          clear: tl(lang, "Clear"),
        }}
      />

      {attendances.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No attendance records.")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginTop: 8 }}>
          {attendances.map((a) => (
            <div key={a.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>
                <a href={`/admin/sessions/${a.sessionId}/attendance`}>
                  {new Date(a.session.startAt).toLocaleString()} - {new Date(a.session.endAt).toLocaleTimeString()}
                </a>
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      a.status === "PRESENT"
                        ? "#ecfdf3"
                        : a.status === "ABSENT"
                        ? "#fef2f2"
                        : a.status === "LATE"
                        ? "#fff7ed"
                        : a.status === "EXCUSED"
                        ? "#f3f4f6"
                        : "#eef2ff",
                    color:
                      a.status === "PRESENT"
                        ? "#027a48"
                        : a.status === "ABSENT"
                        ? "#b42318"
                        : a.status === "LATE"
                        ? "#b45309"
                        : a.status === "EXCUSED"
                        ? "#6b7280"
                        : "#1d4ed8",
                  }}
                >
                  {a.status}
                </span>
              </div>
              <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <ClassTypeBadge capacity={a.session.class.capacity} compact />
                  <span>
                    {a.session.class.course.name}
                    {a.session.class.subject ? ` / ${a.session.class.subject.name}` : ""}{" "}
                    {a.session.class.level ? ` / ${a.session.class.level.name}` : ""} | {a.session.class.teacher.name}
                  </span>
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                {tl(lang, "Status")}: {a.status}
              </div>
              <div style={{ marginTop: 4 }}>
                {tl(lang, "Deduct")}: {a.deductedCount} / {a.deductedMinutes} min
              </div>
              <div style={{ marginTop: 4 }}>
                {tl(lang, "Note")}: {a.note ?? "-"}
              </div>
            </div>
          ))}
        </div>
      )}
      </details>

      <details open style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Upcoming Sessions")}</summary>
      {upcomingSessions.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No upcoming sessions.")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginTop: 8 }}>
          {upcomingSessions.map((s) => {
            const att = upcomingAttendanceMap.get(s.id);
            const cancelled = att?.status === "EXCUSED";
            return (
              <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700 }}>
                  {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: cancelled ? "#fef2f2" : "#ecfdf3",
                      color: cancelled ? "#b42318" : "#027a48",
                    }}
                  >
                    {cancelled ? tl(lang, "Cancelled") : tl(lang, "Scheduled")}
                  </span>
                </div>
                <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={s.class.capacity} compact />
                    <span>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}{" "}
                      {s.class.level ? ` / ${s.class.level.name}` : ""} | {s.class.teacher.name} |{" "}
                      {s.class.campus.name}
                      {s.class.room ? ` / ${s.class.room.name}` : ""}
                    </span>
                  </span>
                </div>
                <div style={{ marginTop: 6, color: cancelled ? "#b00" : "#555", fontWeight: cancelled ? 700 : 400 }}>
                  {cancelled ? tl(lang, "Cancelled") : tl(lang, "Scheduled")}
                  {att?.excusedCharge ? ` (${tl(lang, "Charged")})` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <details>
                    <summary style={{ cursor: "pointer" }}>{tl(lang, "Change Teacher")}</summary>
                    <form action={replaceSessionTeacherForStudent.bind(null, studentId)} style={{ display: "grid", gap: 6, marginTop: 6 }}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <select name="newTeacherId" defaultValue="" style={{ minWidth: 200 }}>
                        <option value="" disabled>
                          {tl(lang, "Select teacher")}
                        </option>
                        {teachers.filter((tch) => canTeachSubject(tch, s.class.subjectId)).map((tch) => (
                          <option key={tch.id} value={tch.id}>
                            {tch.name}
                          </option>
                        ))}
                      </select>
                      <input name="reason" type="text" placeholder={tl(lang, "Reason (optional)")} />
                      <button type="submit">{tl(lang, "Replace Teacher")}</button>
                    </form>
                  </details>
                  <a
                    href={`/admin/students/${studentId}?month=${monthLabel(monthDate)}&quickOpen=1&quickStartAt=${encodeURIComponent(
                      fmtDatetimeLocal(new Date(s.startAt))
                    )}&quickDurationMin=${Math.max(15, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000))}&quickCampusId=${encodeURIComponent(
                      s.class.campusId
                    )}&quickRoomId=${encodeURIComponent(s.class.roomId ?? "")}&quickSubjectId=${encodeURIComponent(
                      s.class.subjectId ?? ""
                    )}&quickLevelId=${encodeURIComponent(s.class.levelId ?? "")}`}
                  >
                    {tl(lang, "Change Course")}
                  </a>
                </div>
                <div style={{ marginTop: 6 }}>
                  {cancelled ? (
                    <form action={restoreStudentSession.bind(null, studentId)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="month" value={monthLabel(monthDate)} />
                      <ConfirmSubmitButton message={tl(lang, "Restore this session?")}>
                        {tl(lang, "Restore")}
                      </ConfirmSubmitButton>
                    </form>
                  ) : (
                    <form action={cancelStudentSession.bind(null, studentId)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="month" value={monthLabel(monthDate)} />
                      <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <input type="checkbox" name="charge" defaultChecked={false} />
                        {tl(lang, "Charge")}
                      </label>
                      <input name="note" placeholder={tl(lang, "Note")} style={{ minWidth: 160 }} />
                      <button type="submit">{tl(lang, "Cancel")}</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </details>

      <details open id="quick-schedule" style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Quick Schedule (by Student Time)")}</summary>
        <QuickScheduleModal
          studentId={studentId}
          month={monthLabel(monthDate)}
          quickSubjectId={quickSubjectId}
          quickLevelId={quickLevelId}
          quickStartAt={quickStartAt}
          quickDurationMin={quickDurationMin}
          quickCampusId={quickCampusId}
          quickRoomId={quickRoomId}
          openOnLoad={quickOpen}
          subjects={quickSubjects.map((s) => ({
            id: s.id,
            name: s.name,
            courseName: s.course.name,
            courseId: s.courseId,
          }))}
          levels={quickLevels.map((l) => ({
            id: l.id,
            name: l.name,
            subjectId: l.subjectId,
            subjectName: l.subject.name,
            courseName: l.subject.course.name,
          }))}
          campuses={campuses.map((c) => ({ id: c.id, name: c.name, isOnline: c.isOnline }))}
          rooms={rooms.map((r) => ({ id: r.id, name: `${r.name} (${r.campus.name})`, campusId: r.campusId }))}
          candidates={quickCandidates}
          onSchedule={createQuickAppointment.bind(null, studentId)}
          warning={quickPackageWarn}
          labels={{
            title: tl(lang, "Quick Schedule"),
            open: tl(lang, "Open Modal"),
            course: tl(lang, "Course"),
            subject: tl(lang, "Subject"),
            level: tl(lang, "Level (optional)"),
            campus: tl(lang, "Campus"),
            room: tl(lang, "Room"),
            roomOptional: tl(lang, "optional"),
            start: tl(lang, "Start"),
            duration: tl(lang, "Duration (minutes)"),
            find: tl(lang, "Find Available Teachers"),
            close: tl(lang, "Close"),
            teacher: tl(lang, "Teacher"),
            status: tl(lang, "Status"),
            action: tl(lang, "Action"),
            available: tl(lang, "Available"),
            noTeachers: tl(lang, "No eligible teachers found."),
            chooseHint: tl(lang, "Choose subject, campus, room and time to match teachers."),
            schedule: tl(lang, "Schedule"),
          }}
        />
      </details>

      <details id="edit-student" style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Edit Student")}</summary>
        <form action={updateStudent.bind(null, studentId)} style={{ display: "grid", gap: 8, maxWidth: 720, marginTop: 8 }}>
          <input name="name" defaultValue={student.name} placeholder={tl(lang, "Name")} />
          <input name="school" defaultValue={student.school ?? ""} placeholder={tl(lang, "School")} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input name="birthDate" type="date" defaultValue={fmtDateInput(student.birthDate)} />
            <select name="grade" defaultValue={student.grade ?? ""}>
              <option value="">{tl(lang, "Grade")}</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select name="sourceChannelId" defaultValue={student.sourceChannelId ?? ""}>
              <option value="">{tl(lang, "Source")}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select name="studentTypeId" defaultValue={student.studentTypeId ?? ""}>
              <option value="">{tl(lang, "Type")}</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <textarea name="note" defaultValue={student.note ?? ""} placeholder={tl(lang, "Notes")} rows={4} />
          <button type="submit">{tl(lang, "Save")}</button>
        </form>

        <div style={{ marginTop: 12 }}>
          <form action={deleteStudent.bind(null, studentId)}>
            <ConfirmSubmitButton message={tl(lang, "Delete student? This also deletes enrollments/appointments/packages.")}>
              {tl(lang, "Delete Student")}
            </ConfirmSubmitButton>
          </form>
        </div>
      </details>
      </div>
    </div>
  );
}



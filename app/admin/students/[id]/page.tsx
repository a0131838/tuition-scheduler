﻿import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";
import { getLang, t } from "@/lib/i18n";
import ConfirmSubmitButton from "../../_components/ConfirmSubmitButton";
import QuickScheduleModal from "../../_components/QuickScheduleModal";
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
  "Choose subject, level, campus, room and time to match teachers.": "\u9009\u62e9\u79d1\u76ee\u3001\u7ea7\u522b\u3001\u6821\u533a\u3001\u6559\u5ba4\u548c\u65f6\u95f4\u540e\u5339\u914d\u8001\u5e08",
  "Class": "\u73ed\u7ea7",
  "Clear": "\u6e05\u9664",
  "Close": "\u5173\u95ed",
  "Course": "\u8bfe\u7a0b",
  "Deduct": "\u6263\u51cf",
  "Delete Student": "\u5220\u9664\u5b66\u751f",
  "Delete student? This also deletes enrollments/appointments/packages.": "\u5220\u9664\u5b66\u751f\uff1f\u5c06\u540c\u65f6\u5220\u9664\u62a5\u540d/\u9884\u7ea6/\u8bfe\u5305\u3002",
  "Detail": "\u8be6\u60c5",
  "Download PDF": "\u5bfc\u51faPDF",
  "Duration (minutes)": "\u65f6\u957f(\u5206\u949f)",
  "Edit Student": "\u7f16\u8f91\u5b66\u751f",
  "Enrollments": "\u62a5\u540d",
  "Error": "\u9519\u8bef",
  "Excused Count": "\u7d2f\u8ba1\u8bf7\u5047",
  "Find Available Teachers": "\u67e5\u627e\u53ef\u7528\u8001\u5e08",
  "Grade": "\u5e74\u7ea7",
  "Invalid subject/level selected.": "\u79d1\u76ee/\u7ea7\u522b\u4e0d\u5339\u914d",
  "Level": "\u7ea7\u522b",
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

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
  const levelId = String(formData.get("levelId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const startAtStr = String(formData.get("startAt") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 60);
  const month = String(formData.get("month") ?? "").trim();

  if (
    !teacherId ||
    !subjectId ||
    !levelId ||
    !campusId ||
    !startAtStr ||
    !Number.isFinite(durationMin) ||
    durationMin < 15
  ) {
    redirect(`/admin/students/${studentId}?err=Invalid+input`);
  }

  const roomId = roomIdRaw || null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) {
    redirect(`/admin/students/${studentId}?err=Campus+not+found`);
  }
  if (!roomId && !campus.isOnline) {
    redirect(`/admin/students/${studentId}?err=Room+is+required`);
  }
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.campusId !== campusId) {
      redirect(`/admin/students/${studentId}?err=Invalid+room`);
    }
  }
  const startAt = parseDatetimeLocal(startAtStr);
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: true },
  });
  if (!teacher) {
    redirect(`/admin/students/${studentId}?err=Teacher+not+found`);
  }
  const canTeach =
    teacher.subjectCourseId === subjectId || teacher.subjects.some((s) => s.id === subjectId);
  if (!canTeach) {
    redirect(`/admin/students/${studentId}?err=Teacher+cannot+teach+this+course`);
  }

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) {
    redirect(`/admin/students/${studentId}?err=${encodeURIComponent(availErr)}`);
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
    redirect(
      `/admin/students/${studentId}?err=${encodeURIComponent(
        `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`
      )}`
    );
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  if (teacherApptConflict) {
    redirect(
      `/admin/students/${studentId}?err=${encodeURIComponent(
        `Teacher conflict with appointment ${teacherApptConflict.id}`
      )}`
    );
  }

  if (roomId) {
    const roomConflict = await prisma.session.findFirst({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, classId: true },
    });
    if (roomConflict) {
      redirect(
        `/admin/students/${studentId}?err=${encodeURIComponent(
          `Room conflict with session ${roomConflict.id} (class ${roomConflict.classId})`
        )}`
      );
    }
  }

  const level = await prisma.level.findUnique({
    where: { id: levelId },
    include: { subject: true },
  });
  if (!level || level.subjectId !== subjectId) {
    redirect(`/admin/students/${studentId}?err=Invalid+subject+or+level`);
  }

  const courseId = level.subject.courseId;
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
    redirect(`/admin/students/${studentId}?err=No+active+package+for+this+course`);
  }

  let cls = await prisma.class.findFirst({
    where: {
      teacherId,
      courseId,
      subjectId,
      levelId,
      campusId,
      roomId,
      capacity: 1,
    },
  });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        teacherId,
        courseId,
        subjectId,
        levelId,
        campusId,
        roomId,
        capacity: 1,
      },
    });
  }

  const dupSession = await prisma.session.findFirst({
    where: { classId: cls.id, startAt, endAt },
    select: { id: true },
  });
  if (!dupSession) {
    await prisma.session.create({
      data: { classId: cls.id, startAt, endAt },
    });
  }

  const existingEnroll = await prisma.enrollment.findFirst({
    where: { studentId, classId: cls.id },
    select: { id: true },
  });
  if (!existingEnroll) {
    await prisma.enrollment.create({
      data: { studentId, classId: cls.id },
    });
  }

  const params = new URLSearchParams({
    msg: "Scheduled",
    quickSubjectId: subjectId,
    quickLevelId: levelId,
    quickStartAt: startAtStr,
    quickDurationMin: String(durationMin),
  });
  if (month) params.set("month", month);
  redirect(`/admin/students/${studentId}?${params.toString()}`);
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
  params: { id: string };
  searchParams?: { msg?: string; err?: string; [key: string]: string | undefined };
}) {
  const lang = await getLang();
  const studentId = params.id;

  const courseId = searchParams?.courseId ?? "";
  const teacherId = searchParams?.teacherId ?? "";
  const status = searchParams?.status ?? "";
  const days = toInt(searchParams?.days, 0);
  const limitRaw = toInt(searchParams?.limit, ATTENDANCE_DEFAULT_LIMIT);
  const limit = Math.min(Math.max(limitRaw, 1), 500);
  const quickSubjectId = searchParams?.quickSubjectId ?? "";
  const quickLevelId = searchParams?.quickLevelId ?? "";
  const quickStartAt = searchParams?.quickStartAt ?? "";
  const quickDurationMin = Math.max(15, toInt(searchParams?.quickDurationMin, 60));
  const quickCampusId = searchParams?.quickCampusId ?? "";
  const quickRoomId = searchParams?.quickRoomId ?? "";
  const monthParam = searchParams?.month ?? "";
  const quickOpen = searchParams?.quickOpen === "1";

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
        where: { classId: { in: classIds }, startAt: { gte: new Date(), lt: upcomingRangeEnd } },
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

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const quickCandidates: {
    id: string;
    name: string;
    ok: boolean;
    reason?: string;
  }[] = [];
  let quickPackageWarn = "";
  const quickCampusIsOnline = campuses.some((c) => c.id === quickCampusId && c.isOnline);
  if (quickSubjectId && quickLevelId && quickStartAt && quickCampusId && (quickRoomId || quickCampusIsOnline)) {
    const startAt = parseDatetimeLocal(quickStartAt);
    const endAt = new Date(startAt.getTime() + quickDurationMin * 60 * 1000);
    const quickLevel = await prisma.level.findUnique({
      where: { id: quickLevelId },
      include: { subject: true },
    });
    if (!quickLevel || quickLevel.subjectId !== quickSubjectId) {
      quickPackageWarn = tl(lang, "Invalid subject/level selected.");
    } else {
      const quickCourseId = quickLevel.subject.courseId;
      const pkg = await prisma.coursePackage.findFirst({
        where: {
          studentId,
          courseId: quickCourseId,
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
            select: { id: true, classId: true },
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
          reason: `Room conflict with session ${roomConflict.id} (class ${roomConflict.classId})`,
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
        select: { id: true, classId: true },
      });
      if (sessionConflict) {
        quickCandidates.push({
          id: tch.id,
          name: tch.name,
          ok: false,
          reason: `Teacher conflict with session ${sessionConflict.id} (class ${sessionConflict.classId})`,
        });
        continue;
      }
      const apptConflict = await prisma.appointment.findFirst({
        where: {
          teacherId: tch.id,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (apptConflict) {
        quickCandidates.push({
          id: tch.id,
          name: tch.name,
          ok: false,
          reason: `Teacher conflict with appointment ${apptConflict.id}`,
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
      <h2>{tl(lang, "Student Detail")}</h2>
      <p style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a href="/admin/students">&lt;&lt; {tl(lang, "Back to Students")}</a>
        <span style={{ color: "#999" }}>(studentId {student.id})</span>
      </p>
      <p>
        <a href={`/api/exports/student-detail/${studentId}`}>{tl(lang, "Download PDF")}</a>
      </p>

      {err && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>{tl(lang, "Error")}:</b> {err}
        </div>
      )}
      {msg && (
        <div style={{ padding: 12, border: "1px solid #b9e6c3", background: "#f2fff5", marginBottom: 12 }}>
          <b>{tl(lang, "OK")}:</b> {msg}
        </div>
      )}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div>
          <b>{tl(lang, "Enrollments")}:</b> {enrollCount}
        </div>
        <div>
          <b>{tl(lang, "Packages")}:</b> {packageCount}
        </div>
        {unpaidPackageCount > 0 && (
          <div style={{ color: "#b00", fontWeight: 700 }}>
            {tl(lang, "Unpaid packages")}: {unpaidPackageCount}
          </div>
        )}
        <div>
          <b>{tl(lang, "Excused Count")}:</b> {excusedCount}
        </div>
        <div>
          <b>{tl(lang, "Source")}:</b> {student.sourceChannel?.name ?? "-"}
        </div>
        <div>
          <b>{tl(lang, "Type")}:</b> {student.studentType?.name ?? "-"}
        </div>
        <div>
          <b>{tl(lang, "Recent Attendance")}:</b> {attendances.length}
        </div>
      </div>

      <h3>{tl(lang, "Quick Schedule Calendar")}</h3>
      <div style={{ margin: "6px 0 10px", display: "grid", gap: 6 }}>
        <a href={`/api/exports/student-schedule/${studentId}?month=${monthLabel(monthDate)}`}>
          {tl(lang, "Download Schedule PDF")}
        </a>
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

      <h3>{tl(lang, "Enrollments")}</h3>
      {enrollments.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No enrollments.")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{tl(lang, "Class")}</th>
              <th align="left">{tl(lang, "Teacher")}</th>
              <th align="left">{tl(lang, "Campus")}</th>
              <th align="left">{tl(lang, "Room")}</th>
              <th align="left">{tl(lang, "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  {e.class.course.name}
                  {e.class.subject ? ` / ${e.class.subject.name}` : ""} {e.class.level ? ` / ${e.class.level.name}` : ""}
                  <div style={{ color: "#999", fontSize: 12 }}>classId {e.classId.slice(0, 8)}...</div>
                </td>
                <td>{e.class.teacher.name}</td>
                <td>{e.class.campus.name}</td>
                <td>{e.class.room?.name ?? "(none)"}</td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/admin/classes/${e.classId}`}>{tl(lang, "Detail")}</a>
                  <a href={`/admin/classes/${e.classId}/sessions`}>{tl(lang, "Sessions")}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{tl(lang, "Packages")}</h3>
      {packages.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No packages.")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{tl(lang, "Course")}</th>
              <th align="left">{tl(lang, "Type")}</th>
              <th align="left">{tl(lang, "Remaining")}</th>
              <th align="left">{tl(lang, "Usage 30d")}</th>
              <th align="left">{tl(lang, "Forecast")}</th>
              <th align="left">{tl(lang, "Alert")}</th>
              <th align="left">{tl(lang, "Valid")}</th>
              <th align="left">{tl(lang, "Status")}</th>
              <th align="left">{tl(lang, "Paid")}</th>
              <th align="left">{tl(lang, "Paid At")}</th>
              <th align="left">{tl(lang, "Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                {(() => {
                  const remaining = p.remainingMinutes ?? 0;
                  const deducted30 = deducted30Map.get(p.id) ?? 0;
                  const avgPerDay = deducted30 / FORECAST_WINDOW_DAYS;
                  const estDays =
                    p.type === "HOURS" && p.status === "ACTIVE" && remaining > 0 && avgPerDay > 0
                      ? Math.ceil(remaining / avgPerDay)
                      : null;
                  const lowMinutes = p.type === "HOURS" && p.status === "ACTIVE" && remaining <= LOW_MINUTES;
                  const lowDays = p.type === "HOURS" && p.status === "ACTIVE" && estDays != null && estDays <= LOW_DAYS;
                  return (
                    <>
                <td>
                  {p.course?.name ?? "-"}
                </td>
                <td>{p.type}</td>
                <td>
                  {p.type === "HOURS" ? (
                    <span
                      style={{
                        fontWeight: (p.remainingMinutes ?? 0) <= LOW_MINUTES ? 700 : 400,
                        color: (p.remainingMinutes ?? 0) <= LOW_MINUTES ? "#b00" : undefined,
                      }}
                    >
                      {fmtMinutes(p.remainingMinutes)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{p.type === "HOURS" ? `${fmtMinutes(deducted30)} / ${FORECAST_WINDOW_DAYS}d` : "-"}</td>
                <td>
                  {p.type !== "HOURS"
                    ? "-"
                    : p.status !== "ACTIVE"
                    ? tl(lang, "Inactive")
                    : remaining <= 0
                    ? tl(lang, "Depleted")
                    : estDays == null
                    ? tl(lang, "No usage (30d)")
                    : `${estDays} ${tl(lang, "days")}`}
                </td>
                <td>
                  {p.type !== "HOURS" || p.status !== "ACTIVE" ? (
                    "-"
                  ) : remaining <= 0 ? (
                    <span style={{ color: "#b00", fontWeight: 700 }}>{tl(lang, "Urgent")}</span>
                  ) : lowMinutes || lowDays ? (
                    <span style={{ color: "#b00", fontWeight: 700 }}>
                      {lowMinutes && lowDays
                        ? `${tl(lang, "Low balance")} + ${tl(lang, "Likely to run out soon")}`
                        : lowMinutes
                        ? tl(lang, "Low balance")
                        : tl(lang, "Likely to run out soon")}
                    </span>
                  ) : (
                    <span style={{ color: "#0a7" }}>{tl(lang, "Normal")}</span>
                  )}
                </td>
                <td>
                  {new Date(p.validFrom).toLocaleDateString()} ~{" "}
                  {p.validTo ? new Date(p.validTo).toLocaleDateString() : "(open)"}
                </td>
                <td
                  style={{
                    fontWeight: p.status !== "ACTIVE" ? 700 : 400,
                    color: p.status !== "ACTIVE" ? "#b00" : undefined,
                  }}
                >
                  {p.status}
                </td>
                <td>{p.paid ? tl(lang, "Yes") : tl(lang, "No")}</td>
                <td>{p.paidAt ? new Date(p.paidAt).toLocaleString() : "-"}</td>
                <td>{p.paidAmount ?? "-"}</td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{tl(lang, "Attendance")}</h3>
      <form method="GET" style={{ display: "grid", gap: 8, maxWidth: 720, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>
            {tl(lang, "Course")}:
            <select name="courseId" defaultValue={courseId} style={{ marginLeft: 6, minWidth: 220 }}>
              <option value="">{tl(lang, "All")}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {tl(lang, "Teacher")}:
            <select name="teacherId" defaultValue={teacherId} style={{ marginLeft: 6, minWidth: 200 }}>
              <option value="">{tl(lang, "All")}</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {tl(lang, "Status")}:
            <select name="status" defaultValue={status} style={{ marginLeft: 6 }}>
              <option value="">{tl(lang, "All")}</option>
              <option value="UNMARKED">UNMARKED</option>
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="LATE">LATE</option>
              <option value="EXCUSED">EXCUSED</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>
            {tl(lang, "Recent days")}:
            <input
              name="days"
              type="number"
              min={0}
              defaultValue={days ? String(days) : ""}
              placeholder="e.g. 30"
              style={{ marginLeft: 6, width: 120 }}
            />
          </label>
          <label>
            {tl(lang, "Limit")}:
            <input
              name="limit"
              type="number"
              min={1}
              max={500}
              defaultValue={String(limit)}
              style={{ marginLeft: 6, width: 120 }}
            />
          </label>
          <button type="submit">{tl(lang, "Apply")}</button>
          <a href={`/admin/students/${studentId}`}>{tl(lang, "Clear")}</a>
        </div>
      </form>

      {attendances.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No attendance records.")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{tl(lang, "Session")}</th>
              <th align="left">{tl(lang, "Status")}</th>
              <th align="left">{tl(lang, "Deduct")}</th>
              <th align="left">{tl(lang, "Note")}</th>
            </tr>
          </thead>
          <tbody>
            {attendances.map((a) => (
              <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <a href={`/admin/sessions/${a.sessionId}/attendance`}>
                    {new Date(a.session.startAt).toLocaleString()} -{" "}
                    {new Date(a.session.endAt).toLocaleTimeString()}
                  </a>
                  <div style={{ color: "#999", fontSize: 12 }}>
                    {a.session.class.course.name}
                    {a.session.class.subject ? ` / ${a.session.class.subject.name}` : ""}{" "}
                    {a.session.class.level ? ` / ${a.session.class.level.name}` : ""} |{" "}
                    {a.session.class.teacher.name}
                  </div>
                </td>
                <td>{a.status}</td>
                <td>
                  {a.deductedCount} / {a.deductedMinutes} min
                </td>
                <td>{a.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{tl(lang, "Upcoming Sessions")}</h3>
      {upcomingSessions.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No upcoming sessions.")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{tl(lang, "Session")}</th>
              <th align="left">{tl(lang, "Status")}</th>
              <th align="left">{tl(lang, "Cancel")}</th>
            </tr>
          </thead>
          <tbody>
            {upcomingSessions.map((s) => {
              const att = upcomingAttendanceMap.get(s.id);
              const cancelled = att?.status === "EXCUSED";
              return (
                <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>
                    <div>
                      {new Date(s.startAt).toLocaleString()} - {new Date(s.endAt).toLocaleTimeString()}
                    </div>
                    <div style={{ color: "#999", fontSize: 12 }}>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}{" "}
                      {s.class.level ? ` / ${s.class.level.name}` : ""} | {s.class.teacher.name} |{" "}
                      {s.class.campus.name}
                      {s.class.room ? ` / ${s.class.room.name}` : ""}
                    </div>
                  </td>
                  <td style={{ color: cancelled ? "#b00" : "#555", fontWeight: cancelled ? 700 : 400 }}>
                    {cancelled ? tl(lang, "Cancelled") : tl(lang, "Scheduled")}
                    {att?.excusedCharge ? ` (${tl(lang, "Charged")})` : ""}
                  </td>
                  <td>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div id="quick-schedule">
        <h3>{tl(lang, "Quick Schedule (by Student Time)")}</h3>
      </div>
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
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          courseName: s.course.name,
          courseId: s.courseId,
        }))}
        levels={levels.map((l) => ({
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
          subject: tl(lang, "Subject"),
          level: tl(lang, "Level"),
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
          chooseHint: tl(lang, "Choose subject, level, campus, room and time to match teachers."),
          schedule: tl(lang, "Schedule"),
        }}
      />

      

      <h3>{tl(lang, "Edit Student")}</h3>
      <form action={updateStudent.bind(null, studentId)} style={{ display: "grid", gap: 8, maxWidth: 720 }}>
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

      <div style={{ marginTop: 16 }}>
        <form action={deleteStudent.bind(null, studentId)}>
          <ConfirmSubmitButton message={tl(lang, "Delete student? This also deletes enrollments/appointments/packages.")}>
            {tl(lang, "Delete Student")}
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}

﻿import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Lang } from "@/lib/i18n";
import { getLang, t } from "@/lib/i18n";
import { getCurrentUser, isStrictSuperAdmin } from "@/lib/auth";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import QuickScheduleModal from "../../_components/QuickScheduleModal";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";
import StudentAttendanceFilterForm from "../../_components/StudentAttendanceFilterForm";
import NoticeBanner from "../../_components/NoticeBanner";
import WorkflowSourceBanner from "../../_components/WorkflowSourceBanner";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { courseEnrollmentConflictMessage } from "@/lib/enrollment-conflict";
import SessionCancelRestoreClient from "./_components/SessionCancelRestoreClient";
import StudentEditClient from "./_components/StudentEditClient";
import SessionReplaceTeacherClient from "./_components/SessionReplaceTeacherClient";
import StudentDetailHashStateClient from "./_components/StudentDetailHashStateClient";
import {
  isExactSessionTimeslot,
  pickStudentSessionConflict,
  pickTeacherSessionConflict,
  shouldIgnoreTeacherConflictSession,
} from "@/lib/session-conflict";
import { campusRequiresRoom } from "@/lib/campus";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  allocateTicketNo,
  composeTicketSituation,
  parseTicketSituationSummary,
  SCHEDULING_COORDINATION_TICKET_TYPE,
} from "@/lib/tickets";
import {
  buildSchedulingCoordinationSlotShareText,
  buildSchedulingCoordinationTeacherOptions,
  deriveSchedulingCoordinationPhase,
  evaluateSchedulingSpecialRequest,
  formatSchedulingCoordinationSystemText,
  inferSchedulingCoordinationDurationMin,
  listSchedulingCoordinationParentMatchedSlots,
  normalizeSchedulingCoordinationCourseKey,
  schedulingCoordinationCurrentIssueText,
  schedulingCoordinationCourseLabelsMatch,
  schedulingCoordinationInitialRequiredActionText,
  schedulingCoordinationParentChoiceLoggedText,
  schedulingCoordinationTeacherExceptionAction,
  schedulingCoordinationTeacherExceptionLoggedText,
  schedulingCoordinationWaitingParentAction,
  schedulingCoordinationWaitingParentChoiceAction,
  schedulingCoordinationWaitingParentSummary,
} from "@/lib/scheduling-coordination";
import {
  buildParentAvailabilityExpiresAt,
  buildParentAvailabilityPath,
  buildParentAvailabilityShareText,
  createParentAvailabilityToken,
  coerceParentAvailabilityPayload,
  formatParentAvailabilityFieldRows,
} from "@/lib/parent-availability";
import CopyTextButton from "../../_components/CopyTextButton";
import {
  workbenchHeroStyle,
  workbenchInfoBarStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
} from "../../_components/workbenchStyles";
import {
  checkTeacherSchedulingAvailability,
  inspectTeacherSchedulingAvailability,
} from "@/lib/teacher-scheduling-availability";
import { packageFinanceGateLabelZh } from "@/lib/package-finance-gate";
import { studentContractStatusLabelZh } from "@/lib/student-contract";
const zhMap: Record<string, string> = {
  "Action": "\u64cd\u4f5c",
  "Actions": "\u64cd\u4f5c",
  "All": "\u5168\u90e8",
  "Amount": "\u91d1\u989d",
  "Apply": "\u5e94\u7528",
  "Feedback": "\u53cd\u9988",
  "Submitted": "\u5df2\u63d0\u4ea4",
  "Missing": "\u672a\u63d0\u4ea4",
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
  "Delete Session": "\u5220\u9664\u8bfe\u6b21",
  "Delete student? This also deletes enrollments/appointments/packages.": "\u5220\u9664\u5b66\u751f\uff1f\u5c06\u540c\u65f6\u5220\u9664\u62a5\u540d/\u9884\u7ea6/\u8bfe\u5305\u3002",
  "Delete this session? This cannot be undone.": "\u5220\u9664\u8be5\u8bfe\u6b21\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002",
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
  "Mode": "\u6a21\u5f0f",
  "Create New Sessions": "\u65b0\u5efa\u8bfe\u6b21",
  "Reschedule Existing Session": "\u8c03\u6574\u5df2\u6709\u8bfe\u6b21",
  "Preview": "\u9884\u89c8",
  "Preview Result": "\u9884\u89c8\u7ed3\u679c",
  "Repeat Weeks": "\u91cd\u590d\u5468\u6570",
  "On Conflict": "\u51b2\u7a81\u5904\u7406",
  "Reject Immediately": "\u9047\u5230\u51b2\u7a81\u7acb\u5373\u62d2\u7edd",
  "Skip Conflicts": "\u8df3\u8fc7\u51b2\u7a81\u8bfe\u6b21",
  "Target Session": "\u76ee\u6807\u8bfe\u6b21",
  "Reschedule Scope": "\u8c03\u6574\u8303\u56f4",
  "New Start": "\u65b0\u5f00\u59cb\u65f6\u95f4",
  "New Duration (minutes)": "\u65b0\u65f6\u957f(\u5206\u949f)",
  "This Session Only": "\u4ec5\u672c\u6b21\u8bfe",
  "This + Future Sessions": "\u672c\u6b21+\u540e\u7eed\u8bfe\u6b21",
  "Recent Attendance": "\u8fd1\u671f\u70b9\u540d",
  "Recent days": "\u6700\u8fd1\u5929\u6570",
  "Remaining": "\u5269\u4f59",
  "Restore": "\u6062\u590d",
  "Restore this session?": "\u786e\u8ba4\u6062\u590d\u8be5\u8bfe\u6b21\uff1f",
  "Room": "\u6559\u5ba4",
  "Room is required for this campus.": "\u5f53\u524d\u6821\u533a\u5fc5\u987b\u9009\u62e9\u6559\u5ba4",
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

function humanizeSchedulingGateMessage(lang: Lang, message: string) {
  if (message.startsWith("Invoice approval is pending.")) {
    return t(lang, "Invoice approval is pending. Open package billing before scheduling.", "该课包发票待审批，请先打开课包账单处理后再排课。");
  }
  if (message.startsWith("Invoice approval is blocked.")) {
    return t(lang, "Invoice approval is blocked. Open package billing to fix it.", "该课包发票审批被阻塞，请先打开课包账单修正后再排课。");
  }
  if (message === "No active package for this course") {
    return t(lang, "No active package for this course. Please create a package before scheduling.", "该课程没有可用的有效课包，请先创建课包后再排课。");
  }
  return message;
}

function sectionReturnBar(
  lang: Lang,
  options: {
    hint: string;
    links: { href: string; label: string }[];
  }
) {
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 8,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div style={{ color: "#475569", fontSize: 13 }}>{options.hint}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="#student-workbench-bar">{t(lang, "Back to action bar", "返回主操作条")}</a>
        {options.links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function studentSummaryCardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 6,
    alignContent: "start",
  } as const;
}

function studentPrimaryActionStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 8,
    alignContent: "start",
    minWidth: 0,
    padding: "14px 16px",
    borderRadius: 16,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  } as const;
}

function studentRecommendedActionStyle(background: string, border: string) {
  return {
    ...studentPrimaryActionStyle(background, border),
    gap: 10,
    padding: "16px 18px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  } as const;
}

function studentSecondaryActionStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    textDecoration: "none",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  } as const;
}

function studentSectionGroupStyle(background: string) {
  return {
    display: "grid",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background,
  } as const;
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

function parseDateInput(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null;
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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

function formatStudentSessionConflictReason(s: any, startAt: Date, endAt: Date) {
  const label = formatSessionConflictLabel(s);
  if (isExactSessionTimeslot(s, startAt, endAt)) {
    return `Session already exists at this time: ${label}`;
  }
  return `Student already has another session at this time: ${label}`;
}

async function humanizeQuickScheduleError(raw: string) {
  const teacherSessionConflict = raw.match(/^Teacher conflict with session ([a-zA-Z0-9-]+) \(class ([a-zA-Z0-9-]+)\)$/);
  if (teacherSessionConflict) {
    const sessionId = teacherSessionConflict[1];
    const s = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
    });
    if (s) return `Teacher conflict: ${formatSessionConflictLabel(s)}`;
    return "Teacher conflict: another class is already scheduled in this time slot.";
  }

  const roomSessionConflict = raw.match(/^Room conflict with session ([a-zA-Z0-9-]+) \(class ([a-zA-Z0-9-]+)\)$/);
  if (roomSessionConflict) {
    const sessionId = roomSessionConflict[1];
    const s = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
    });
    if (s) {
      const room = s.class.room?.name ?? "(none)";
      return `Room conflict: ${room} | ${formatSessionConflictLabel(s)}`;
    }
    return "Room conflict: selected room is already occupied in this time slot.";
  }

  const teacherAppointmentConflict = raw.match(/^Teacher conflict with appointment ([a-zA-Z0-9-]+)$/);
  if (teacherAppointmentConflict) {
    const apptId = teacherAppointmentConflict[1];
    const appt = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: { teacher: { select: { name: true } } },
    });
    if (appt) {
      const timeLabel = `${fmtDateInput(appt.startAt)} ${fmtHHMM(appt.startAt)}-${fmtHHMM(appt.endAt)}`;
      return `Teacher conflict: appointment | ${appt.teacher.name} | ${timeLabel}`;
    }
    return "Teacher conflict: another appointment is already scheduled in this time slot.";
  }

  return raw;
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

function uniqueDefined(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
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

function normalizeStudentDetailHash(hash?: string | null, fallback = "#student-workbench-bar") {
  const raw = String(hash ?? "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("#") && raw.length > 1) return raw;
  return `#${raw.replace(/^#+/, "")}`;
}

function buildStudentDetailHref(studentId: string, params?: URLSearchParams | null, hash?: string | null, fallbackHash = "#student-workbench-bar") {
  const query = params?.toString() ?? "";
  return `/admin/students/${studentId}${query ? `?${query}` : ""}${normalizeStudentDetailHash(hash, fallbackHash)}`;
}

function buildStudentCoordinationHref(
  studentId: string,
  params?: URLSearchParams | null,
  hash?: string | null,
  fallbackHash = "#scheduling-coordination"
) {
  const nextParams = new URLSearchParams(params?.toString() ?? "");
  return `/admin/students/${studentId}/coordination${nextParams.toString() ? `?${nextParams.toString()}` : ""}${normalizeStudentDetailHash(hash, fallbackHash)}`;
}

function sanitizeStudentDetailBack(studentId: string, raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith(`/admin/students/${studentId}`)) {
    return buildStudentCoordinationHref(studentId);
  }
  return value.slice(0, 2000);
}

function sanitizeStudentsBack(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/admin/students")) return "/admin/students";
  return value.slice(0, 2000);
}

function appendStudentDetailQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, "https://local.invalid");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
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

function resolveTicketSourceFromStudent(student: { sourceChannel?: { name?: string | null } | null }) {
  const raw = String(student.sourceChannel?.name ?? "").trim();
  if (raw.includes("新东方")) return "新东方外包";
  return "自营学生";
}

function pickSchedulingTicketOwner(user: { name?: string | null; email?: string | null }) {
  const source = `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase();
  if (source.includes("eva")) return "Eva";
  if (source.includes("emily")) return "Emily";
  if (source.includes("jasmine")) return "Jasmine";
  return null;
}

function buildCourseLabelFromEnrollment(enrollment: {
  class?: {
    course?: { name?: string | null } | null;
    subject?: { name?: string | null } | null;
    level?: { name?: string | null } | null;
  } | null;
}) {
  const parts = [
    enrollment.class?.course?.name,
    enrollment.class?.subject?.name,
    enrollment.class?.level?.name,
  ].filter(Boolean);
  return parts.join(" / ");
}
async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  return checkTeacherSchedulingAvailability(prisma, teacherId, startAt, endAt);
}

async function inspectTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  return inspectTeacherSchedulingAvailability(prisma, teacherId, startAt, endAt);
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
  const returnHash = String(formData.get("returnHash") ?? "").trim();

  if (!name) {
    const params = new URLSearchParams({ err: "Name is required" });
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#edit-student"));
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

  const params = new URLSearchParams({ msg: "Saved" });
  redirect(buildStudentDetailHref(studentId, params, returnHash, "#edit-student"));
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
  const returnHash = String(formData.get("returnHash") ?? "").trim();
  const bypassAvailabilityCheck = isStrictSuperAdmin(await getCurrentUser());

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
    return buildStudentDetailHref(studentId, params, returnHash, "#quick-schedule");
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
    if (!roomId && campusRequiresRoom(campus)) {
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

    if (!bypassAvailabilityCheck) {
      const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
      if (availErr) {
        redirect(backWithQuickParams({ err: availErr }));
      }
    }

    const teacherSessionConflicts = await prisma.session.findMany({
      where: {
        OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        attendances: {
          select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
        },
      },
      orderBy: { startAt: "asc" },
    });
    const teacherSessionConflict = teacherSessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
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
      const roomConflicts = await prisma.session.findMany({
        where: {
          class: { roomId },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        include: {
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              teacher: true,
              campus: true,
              room: true,
              enrollments: { select: { studentId: true } },
            },
          },
          attendances: {
            select: {
              studentId: true,
              status: true,
              excusedCharge: true,
              deductedMinutes: true,
              deductedCount: true,
            },
          },
        },
      });
      const roomConflict = pickTeacherSessionConflict(roomConflicts);
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
    const packageCheckAt = startAt.getTime() < Date.now() ? new Date() : startAt;
    const packageDecision = await getSchedulablePackageDecision(prisma, {
      studentId,
      courseId,
      at: packageCheckAt,
      requiredHoursMinutes: durationMin,
    });
    if (!packageDecision.ok) {
      redirect(backWithQuickParams({ err: packageDecision.message }));
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
      preferTeacherClass: true,
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
        data: { classId: cls.id, startAt, endAt, studentId, teacherId: teacherId === cls.teacherId ? null : teacherId },
      });
    }

    // enrollment ensured by helper
    const params = new URLSearchParams({
      msg: "Scheduled",
    });
    if (month) params.set("month", month);
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#quick-schedule"));
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
        : await humanizeQuickScheduleError(raw);
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

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      id: { not: session.id },
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
      OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
    },
    include: {
      class: { select: { id: true, capacity: true, oneOnOneStudentId: true } },
      attendances: {
        select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
  const teacherSessionConflict = teacherSessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
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
  const returnHash = String(formData.get("returnHash") ?? "").trim();

  if (!sessionId) {
    const params = new URLSearchParams({ err: "Missing sessionId" });
    if (month) params.set("month", month);
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true } } },
  });
  if (!session) {
    const params = new URLSearchParams({ err: "Session not found" });
    if (month) params.set("month", month);
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
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
          AND: [
            coursePackageAccessibleByStudent(studentId),
            coursePackageMatchesCourse(session.class.courseId),
            { type: "HOURS" },
            { status: "ACTIVE" },
            { remainingMinutes: { gte: delta } },
            { validFrom: { lte: session.startAt } },
            { OR: [{ validTo: null }, { validTo: { gte: session.startAt } }] },
          ],
        },
        orderBy: [{ createdAt: "asc" }],
        select: { id: true },
      });
      packageId = pkg?.id ?? null;
    }

    if (!packageId) {
      const params = new URLSearchParams({ err: "No active HOURS package" });
      if (month) params.set("month", month);
      redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
    }

    const pkg = await prisma.coursePackage.findFirst({
      where: {
        id: packageId,
        AND: [
          coursePackageAccessibleByStudent(studentId),
          coursePackageMatchesCourse(session.class.courseId),
          { status: "ACTIVE" },
          { validFrom: { lte: session.startAt } },
          { OR: [{ validTo: null }, { validTo: { gte: session.startAt } }] },
        ],
      },
      select: { id: true, type: true, status: true, remainingMinutes: true },
    });

    if (!pkg) {
      const params = new URLSearchParams({ err: "Package not found" });
      if (month) params.set("month", month);
      redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
    }
    if (pkg.type !== "HOURS") {
      const params = new URLSearchParams({ err: "Package not HOURS" });
      if (month) params.set("month", month);
      redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
    }
    if (pkg.remainingMinutes == null) {
      const params = new URLSearchParams({ err: "Package remaining minutes is null" });
      if (month) params.set("month", month);
      redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
    }

    if (delta > 0) {
      if (pkg.remainingMinutes < delta) {
        const params = new URLSearchParams({ err: "Not enough remaining minutes" });
        if (month) params.set("month", month);
        redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
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
  redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
}

async function restoreStudentSession(studentId: string, formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const month = String(formData.get("month") ?? "").trim();
  const returnHash = String(formData.get("returnHash") ?? "").trim();

  if (!sessionId) {
    const params = new URLSearchParams({ err: "Missing sessionId" });
    if (month) params.set("month", month);
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, startAt: true, endAt: true, classId: true, class: { select: { courseId: true } } },
  });
  if (!session) {
    const params = new URLSearchParams({ err: "Session not found" });
    if (month) params.set("month", month);
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
  }

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
    select: { status: true, deductedMinutes: true, packageId: true },
  });

  if (!existing || existing.status !== "EXCUSED") {
    const params = new URLSearchParams({ msg: "Session restored" });
    if (month) params.set("month", month);
    redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
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
  redirect(buildStudentDetailHref(studentId, params, returnHash, "#upcoming-sessions"));
}

async function createSchedulingCoordinationTicket(studentId: string, formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) {
    const params = new URLSearchParams({ err: "Login required" });
    redirect(buildStudentCoordinationHref(studentId, params));
  }
  const enrollmentId = String(formData.get("enrollmentId") ?? "").trim();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      sourceChannel: true,
      enrollments: {
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!student) {
    const params = new URLSearchParams({ err: "Student not found" });
    redirect(buildStudentCoordinationHref(studentId, params));
  }

  const targetEnrollment =
    (enrollmentId ? student.enrollments.find((item) => item.id === enrollmentId) ?? null : null) ||
    student.enrollments[0] ||
    null;
  const courseLabel = targetEnrollment ? buildCourseLabelFromEnrollment(targetEnrollment) : null;
  const teacherName = targetEnrollment?.class?.teacher?.name ?? null;

  const existingTickets = await prisma.ticket.findMany({
    where: {
      studentId,
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      course: true,
      parentAvailabilityRequest: { select: { courseLabel: true } },
    },
  });
  const existingMatch =
    existingTickets.find((item) =>
      schedulingCoordinationCourseLabelsMatch(
        item.parentAvailabilityRequest?.courseLabel ?? item.course,
        courseLabel
      )
    ) ??
    (!normalizeSchedulingCoordinationCourseKey(courseLabel) ? existingTickets[0] ?? null : null);
  if (existingMatch) {
    const params = new URLSearchParams({
      msg: "Existing coordination ticket reused / 已沿用当前排课协调工单",
      coordTicketId: existingMatch.id,
    });
    redirect(buildStudentCoordinationHref(studentId, params));
  }

  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const currentIssue = schedulingCoordinationCurrentIssueText();
  const requiredAction = schedulingCoordinationInitialRequiredActionText();

  const created = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx);
    const ticket = await tx.ticket.create({
      data: {
        ticketNo,
        studentId: student.id,
        studentName: student.name,
        source: resolveTicketSourceFromStudent(student),
        type: SCHEDULING_COORDINATION_TICKET_TYPE,
        priority: "普通",
        grade: student.grade ?? null,
        course: courseLabel || null,
        teacher: teacherName || null,
        status: "Waiting Parent",
        owner: pickSchedulingTicketOwner(user),
        summary: composeTicketSituation({
          currentIssue,
          requiredAction,
          latestDeadlineText: formatBusinessDateTime(dueAt),
        }),
        nextAction: requiredAction,
        nextActionDue: dueAt,
        createdByName: user.name ?? user.email ?? "Admin",
      },
      select: { id: true },
    });

    await tx.parentAvailabilityRequest.create({
      data: {
        ticketId: ticket.id,
        studentId: student.id,
        courseLabel: courseLabel || null,
        token: createParentAvailabilityToken(),
        expiresAt: buildParentAvailabilityExpiresAt(),
      },
    });

    return ticket;
  });

  redirect(
    `/admin/tickets/${created.id}?back=${encodeURIComponent(
      buildStudentCoordinationHref(studentId)
    )}`
  );
}

async function regenerateSchedulingCoordinationParentLink(studentId: string, ticketId: string) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect(`/login?next=${encodeURIComponent(`/admin/students/${studentId}`)}`);
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      studentId,
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    select: {
      id: true,
      parentAvailabilityRequest: { select: { ticketId: true } },
    },
  });

  if (!ticket?.parentAvailabilityRequest) {
    const params = new URLSearchParams({ err: "No active coordination ticket" });
    redirect(buildStudentCoordinationHref(studentId, params));
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.parentAvailabilityRequest.update({
      where: { ticketId: ticket.id },
      data: {
        token: createParentAvailabilityToken(),
        isActive: true,
        expiresAt: buildParentAvailabilityExpiresAt(),
        submittedAt: null,
        payloadJson: Prisma.JsonNull,
      },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "Waiting Parent",
        parentAvailability: schedulingCoordinationWaitingParentSummary(),
        nextAction: schedulingCoordinationWaitingParentAction(),
        nextActionDue: now,
        lastUpdateAt: now,
      },
    }),
  ]);

  const params = new URLSearchParams({ msg: "Parent availability link regenerated" });
  redirect(buildStudentCoordinationHref(studentId, params));
}
async function markSchedulingCoordinationParentChoice(studentId: string, formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect(`/login?next=${encodeURIComponent(`/admin/students/${studentId}`)}`);
  }

  const back = sanitizeStudentDetailBack(studentId, String(formData.get("back") ?? ""));
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      studentId,
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    select: { id: true, summary: true },
  });

  if (!ticket) {
    const params = new URLSearchParams({ err: "No active coordination ticket" });
    redirect(buildStudentCoordinationHref(studentId, params));
  }

  const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextAction = schedulingCoordinationWaitingParentChoiceAction();
  const previousSummary = parseTicketSituationSummary(ticket.summary);
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "Waiting Parent",
      nextAction,
      nextActionDue: nextDue,
      lastUpdateAt: new Date(),
      summary: composeTicketSituation({
        currentIssue: formatSchedulingCoordinationSystemText(previousSummary.currentIssue || ticket.summary || "Scheduling coordination follow-up"),
        requiredAction: [
          formatSchedulingCoordinationSystemText(previousSummary.requiredAction),
          schedulingCoordinationParentChoiceLoggedText(),
          nextAction,
        ]
          .filter(Boolean)
          .join("\n\n"),
        latestDeadlineText: formatBusinessDateTime(nextDue),
      }),
    },
  });

  redirect(appendStudentDetailQuery(back, { msg: "Coordination moved to waiting for parent choice" }));
}

async function markSchedulingCoordinationTeacherException(studentId: string, formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect(`/login?next=${encodeURIComponent(`/admin/students/${studentId}`)}`);
  }

  const back = sanitizeStudentDetailBack(studentId, String(formData.get("back") ?? ""));
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      studentId,
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    select: { id: true, summary: true },
  });

  if (!ticket) {
    const params = new URLSearchParams({ err: "No active coordination ticket" });
    redirect(buildStudentCoordinationHref(studentId, params));
  }

  const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextAction = schedulingCoordinationTeacherExceptionAction();
  const previousSummary = parseTicketSituationSummary(ticket.summary);
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "Waiting Teacher",
      nextAction,
      nextActionDue: nextDue,
      lastUpdateAt: new Date(),
      summary: composeTicketSituation({
        currentIssue: formatSchedulingCoordinationSystemText(previousSummary.currentIssue || ticket.summary || "Scheduling coordination follow-up"),
        requiredAction: [
          formatSchedulingCoordinationSystemText(previousSummary.requiredAction),
          schedulingCoordinationTeacherExceptionLoggedText(),
          nextAction,
        ]
          .filter(Boolean)
          .join("\n\n"),
        latestDeadlineText: formatBusinessDateTime(nextDue),
      }),
    },
  });

  redirect(appendStudentDetailQuery(back, { msg: "Coordination moved to waiting for teacher exception" }));
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
  const quickTeacherId = sp?.quickTeacherId ?? "";
  const monthParam = sp?.month ?? "";
  const attendanceMonthParam = sp?.attendanceMonth ?? "";
  const quickOpen = sp?.quickOpen === "1";
  const focus = sp?.focus ?? "";
  const source = String(sp?.source ?? "").trim().toLowerCase();
  const studentsBack = sanitizeStudentsBack(sp?.studentsBack);
  const coordDate = sp?.coordDate ?? fmtDateInput(new Date());
  const coordTeacherId = sp?.coordTeacherId ?? "";
  const coordTicketId = sp?.coordTicketId ?? "";
  const coordGenerate = sp?.coordGenerate === "1";
  const coordSpecialStartAt = sp?.coordSpecialStartAt ?? "";
  const coordSpecialDurationMinRaw = Math.max(15, toInt(sp?.coordSpecialDurationMin, 45));
  const coordCheckSpecial = sp?.coordCheckSpecial === "1";
  const coordinationOnly = focus === "scheduling-coordination";
  const sourceWorkflow = source === "students" ? "students" : "";
  const calendarOpen = sp?.calendarOpen === "1" || focus === "calendar-tools";
  const attendanceOpen = focus === "attendance";
  const enrollmentsOpen = focus === "enrollments";
  const packagesOpen = focus === "packages";
  const editStudentOpen = focus === "edit-student";

  const now = new Date();
  const bypassAvailabilityCheck = isStrictSuperAdmin(await getCurrentUser());
  const monthParsed = parseMonth(monthParam);
  const monthDate = monthParsed ? new Date(monthParsed.year, monthParsed.month - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1, 0, 0, 0, 0);

  const sessionWhere: any = {};
  if (days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    sessionWhere.startAt = { gte: since };
  }
  const attendanceMonthParsed = parseMonth(attendanceMonthParam);
  if (attendanceMonthParsed) {
    const monthStartForAttendance = new Date(Date.UTC(attendanceMonthParsed.year, attendanceMonthParsed.month - 1, 1, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
    const monthEndForAttendance = new Date(Date.UTC(attendanceMonthParsed.year, attendanceMonthParsed.month, 1, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
    const prevStart = sessionWhere.startAt ?? {};
    sessionWhere.startAt = { ...prevStart, gte: monthStartForAttendance, lt: monthEndForAttendance };
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
    openSchedulingTickets,
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
    prisma.coursePackage.count({ where: { ...coursePackageAccessibleByStudent(studentId) } }),
    prisma.coursePackage.count({ where: { ...coursePackageAccessibleByStudent(studentId), paid: false } }),
    prisma.attendance.count({ where: { studentId, status: "EXCUSED" } }),
    prisma.ticket.findMany({
      where: {
        studentId,
        type: SCHEDULING_COORDINATION_TICKET_TYPE,
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled"] },
      },
      orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        ticketNo: true,
        status: true,
        course: true,
        durationMin: true,
        teacher: true,
        owner: true,
        nextAction: true,
        nextActionDue: true,
        summary: true,
        parentAvailability: true,
        createdAt: true,
        parentAvailabilityRequest: {
          select: {
            token: true,
            expiresAt: true,
            submittedAt: true,
            createdAt: true,
            courseLabel: true,
            payloadJson: true,
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.coursePackage.findMany({
      where: { ...coursePackageAccessibleByStudent(studentId) },
      include: {
        course: true,
        sharedCourses: { select: { courseId: true } },
        contracts: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            status: true,
            signedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        session: {
          include: {
            teacher: true,
            feedbacks: { where: { content: { not: "" } }, select: { id: true }, take: 1 },
            class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
          },
        },
      },
      orderBy: { session: { startAt: "desc" } },
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

  const activeSchedulingTicket =
    openSchedulingTickets.find((ticket) => ticket.id === coordTicketId) ??
    openSchedulingTickets[0] ??
    null;
  const additionalOpenSchedulingTickets = activeSchedulingTicket
    ? openSchedulingTickets.filter((ticket) => ticket.id !== activeSchedulingTicket.id)
    : [];
  const schedulingSummary = activeSchedulingTicket ? parseTicketSituationSummary(activeSchedulingTicket.summary) : null;
  const schedulingSummaryCurrentDisplay = activeSchedulingTicket
    ? formatSchedulingCoordinationSystemText(schedulingSummary?.currentIssue || activeSchedulingTicket.nextAction || "-")
    : "-";
  const schedulingSummaryActionDisplay = activeSchedulingTicket
    ? formatSchedulingCoordinationSystemText(activeSchedulingTicket.nextAction || schedulingSummary?.requiredAction || "-")
    : "-";
  const parentAvailabilityRequest = activeSchedulingTicket?.parentAvailabilityRequest ?? null;
  const parentAvailabilityHref = parentAvailabilityRequest
    ? buildParentAvailabilityPath(parentAvailabilityRequest.token)
    : null;
  const parentAvailabilityPayload = parentAvailabilityRequest?.submittedAt
    ? coerceParentAvailabilityPayload(parentAvailabilityRequest.payloadJson)
    : null;
  const parentAvailabilityRows = parentAvailabilityPayload
    ? formatParentAvailabilityFieldRows(parentAvailabilityPayload)
    : [];
  const parentAvailabilityShareText = parentAvailabilityHref
    ? buildParentAvailabilityShareText({
        studentName: student.name,
        courseLabel: parentAvailabilityRequest?.courseLabel ?? null,
        url: `https://sgtmanage.com${parentAvailabilityHref}`,
      })
    : "";
  const studentWorkflowParams = new URLSearchParams();
  if (sourceWorkflow === "students") {
    studentWorkflowParams.set("source", "students");
    studentWorkflowParams.set("studentsBack", studentsBack);
  }
  const studentCoordinationHref = buildStudentCoordinationHref(
    studentId,
    studentWorkflowParams.size > 0 ? studentWorkflowParams : null
  );
  const studentDetailHomeHref = buildStudentDetailHref(
    studentId,
    studentWorkflowParams.size > 0 ? studentWorkflowParams : null
  );
  const studentsReturnHref = sourceWorkflow === "students" ? studentsBack : "/admin/students";
  const schedulingTicketHref = activeSchedulingTicket
    ? `/admin/tickets/${activeSchedulingTicket.id}?back=${encodeURIComponent(
        studentCoordinationHref
      )}`
    : null;
  const openSchedulingCourseKeySet = new Set(
    openSchedulingTickets
      .map((ticket) =>
        normalizeSchedulingCoordinationCourseKey(ticket.parentAvailabilityRequest?.courseLabel ?? ticket.course)
      )
      .filter(Boolean)
  );
  const coordinationCreationOptions = enrollments
    .map((enrollment) => {
      const courseLabel = buildCourseLabelFromEnrollment(enrollment);
      return {
        enrollmentId: enrollment.id,
        courseLabel,
        teacherName: enrollment.class.teacher?.name ?? null,
        hasOpenTicket: openSchedulingCourseKeySet.has(normalizeSchedulingCoordinationCourseKey(courseLabel)),
      };
    })
    .filter(
      (option, index, array) =>
        option.courseLabel &&
        array.findIndex((candidate) => candidate.courseLabel === option.courseLabel) === index
    );
  const coordinationTeacherOptions = buildSchedulingCoordinationTeacherOptions({ enrollments, teachers });
  const coordinationDefaultSubjectId = uniqueDefined(
    enrollments.map((enrollment) => enrollment.class.subjectId)
  );
  const coordinationDefaultCampusIds = uniqueDefined(
    enrollments.map((enrollment) => enrollment.class.campusId)
  );
  const coordinationDefaultCampusId = coordinationDefaultCampusIds.length === 1 ? coordinationDefaultCampusIds[0]! : "";
  const coordinationDefaultCampus = coordinationDefaultCampusId
    ? campuses.find((campus) => campus.id === coordinationDefaultCampusId) ?? null
    : null;
  const coordinationDefaultRoomIds = coordinationDefaultCampusId
    ? uniqueDefined(
        enrollments
          .filter((enrollment) => enrollment.class.campusId === coordinationDefaultCampusId)
          .map((enrollment) => enrollment.class.roomId)
      )
    : [];
  const coordinationDefaultRoomId =
    coordinationDefaultCampus && campusRequiresRoom(coordinationDefaultCampus) && coordinationDefaultRoomIds.length === 1
      ? coordinationDefaultRoomIds[0]!
      : "";
  const coordinationSlotDefaultsByTeacher = new Map<
    string,
    { subjectId: string; campusId: string; roomId: string }
  >();
  for (const option of coordinationTeacherOptions) {
    const teacherMatchedEnrollments = enrollments.filter((enrollment) => {
      if (option.subjectId && enrollment.class.subjectId !== option.subjectId) return false;
      return enrollment.class.teacherId === option.teacherId;
    });
    const matchingEnrollments = teacherMatchedEnrollments.length > 0
      ? teacherMatchedEnrollments
      : enrollments.filter((enrollment) => (option.subjectId ? enrollment.class.subjectId === option.subjectId : true));
    const campusIds = uniqueDefined(matchingEnrollments.map((enrollment) => enrollment.class.campusId));
    const campusId =
      campusIds.length === 1
        ? campusIds[0]!
        : coordinationDefaultCampusId;
    const campus = campusId ? campuses.find((item) => item.id === campusId) ?? null : null;
    const roomIds = campusId
      ? uniqueDefined(
          matchingEnrollments
            .filter((enrollment) => enrollment.class.campusId === campusId)
            .map((enrollment) => enrollment.class.roomId)
        )
      : [];
    const roomId = campus && campusRequiresRoom(campus) && roomIds.length === 1 ? roomIds[0]! : "";
    coordinationSlotDefaultsByTeacher.set(option.teacherId, {
      subjectId: option.subjectId ?? (coordinationDefaultSubjectId.length === 1 ? coordinationDefaultSubjectId[0]! : ""),
      campusId,
      roomId,
    });
  }
  const coordinationPreservedEntries = Object.entries(sp ?? {}).filter(
    ([key, value]) =>
      Boolean(value) &&
      ![
        "msg",
        "err",
        "coordDate",
        "coordTeacherId",
        "coordGenerate",
        "coordSpecialStartAt",
        "coordSpecialDurationMin",
        "coordCheckSpecial",
        "quickTeacherId",
      ].includes(key)
  ) as Array<[string, string]>;
  const coordinationClearParams = new URLSearchParams();
  for (const [key, value] of coordinationPreservedEntries) coordinationClearParams.set(key, value);
  const coordinationWorkspaceClearHref = buildStudentCoordinationHref(studentId, coordinationClearParams);
  const coordinationActionBackParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp ?? {})) {
    if (!value || key === "msg" || key === "err") continue;
    coordinationActionBackParams.set(key, value);
  }
  const coordinationActionBackHref = buildStudentCoordinationHref(studentId, coordinationActionBackParams);
  const buildCoordinationTicketPanelHref = (ticketId: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp ?? {})) {
      if (!value || key === "msg" || key === "err") continue;
      params.set(key, value);
    }
    params.set("coordTicketId", ticketId);
    return buildStudentCoordinationHref(studentId, params);
  };

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
        include: {
          teacher: true,
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
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
  const quickRescheduleSessionOptions = upcomingSessions
    .filter((s) => {
      const att = upcomingAttendanceMap.get(s.id);
      return att?.status !== "EXCUSED";
    })
    .map((s) => {
      const teacherName = s.teacher?.name ?? s.class.teacher.name;
      const label = `${formatBusinessDateTime(new Date(s.startAt))} | ${s.class.course.name}${
        s.class.subject ? ` / ${s.class.subject.name}` : ""
      }${s.class.level ? ` / ${s.class.level.name}` : ""} | ${teacherName}`;
      return {
        id: s.id,
        classId: s.classId,
        label,
        startAt: s.startAt.toISOString(),
        durationMin: Math.max(15, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000)),
      };
    });

  const teacherSessions = classIds.length
    ? await prisma.session.findMany({
        where: {
          classId: { in: classIds },
          startAt: { gte: monthStart, lt: monthEnd },
          OR: [{ studentId: null }, { studentId }],
        },
        include: {
          teacher: true,
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
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
  const teacherChangeSessionIds = Array.from(new Set([...upcomingSessionIds, ...monthSessionIds]));
  const teacherChanges = teacherChangeSessionIds.length
    ? await prisma.sessionTeacherChange.findMany({
        where: { sessionId: { in: teacherChangeSessionIds } },
        include: { fromTeacher: true, toTeacher: true },
        orderBy: { changedAt: "desc" },
      })
    : [];
  const latestTeacherChangeMap = new Map<string, (typeof teacherChanges)[number]>();
  for (const c of teacherChanges) {
    if (!latestTeacherChangeMap.has(c.sessionId)) latestTeacherChangeMap.set(c.sessionId, c);
  }
  const coordinationDurationMin = inferSchedulingCoordinationDurationMin({
    ticketDurationMin: activeSchedulingTicket?.durationMin ?? null,
    upcomingSessions,
    monthlySessions: teacherSessions,
  });
  const effectiveCoordTeacherId =
    coordTeacherId && coordinationTeacherOptions.some((option) => option.teacherId === coordTeacherId) ? coordTeacherId : "";
  const effectiveCoordDate = parseDateInput(coordDate) ?? new Date();
  const effectiveSpecialDurationMin = Math.max(15, coordSpecialDurationMinRaw || coordinationDurationMin);
  const effectiveSpecialStartAt =
    coordSpecialStartAt && coordSpecialStartAt.includes("T") ? parseDatetimeLocal(coordSpecialStartAt) : null;
  const coordinationPhasePreviewSlots =
    activeSchedulingTicket && parentAvailabilityPayload && coordinationTeacherOptions.length > 0
      ? await listSchedulingCoordinationParentMatchedSlots({
          studentId,
          teacherOptions: coordinationTeacherOptions,
          teacherId: effectiveCoordTeacherId || undefined,
          payload: parentAvailabilityPayload,
          startAt: new Date(),
          durationMin: coordinationDurationMin,
          maxSlots: 5,
        })
      : [];
  const generatedCoordinationSlots =
    coordGenerate && coordinationTeacherOptions.length > 0
      ? await listSchedulingCoordinationParentMatchedSlots({
          studentId,
          teacherOptions: coordinationTeacherOptions,
          teacherId: effectiveCoordTeacherId || undefined,
          payload: parentAvailabilityPayload,
          startAt: effectiveCoordDate,
          durationMin: coordinationDurationMin,
          maxSlots: 5,
        })
      : [];
  const schedulingCoordinationPhase = activeSchedulingTicket
    ? deriveSchedulingCoordinationPhase({
        ticketStatus: activeSchedulingTicket.status,
        hasParentForm: Boolean(parentAvailabilityRequest),
        parentSubmittedAt: parentAvailabilityRequest?.submittedAt ?? null,
        matchedSlotCount: coordinationPhasePreviewSlots.length,
        parentAvailabilitySummary: activeSchedulingTicket.parentAvailability ?? null,
      })
    : null;
  const specialRequestCheck =
    coordCheckSpecial && effectiveSpecialStartAt && coordinationTeacherOptions.length > 0
      ? await evaluateSchedulingSpecialRequest({
          studentId,
          teacherOptions: coordinationTeacherOptions,
          teacherId: effectiveCoordTeacherId || undefined,
          requestedStartAt: effectiveSpecialStartAt,
          durationMin: effectiveSpecialDurationMin,
        })
      : null;
  const buildQuickScheduleHrefForCoordinationSlot = (slot: {
    teacherId: string;
    startAt: Date;
    endAt: Date;
  }) => {
    const params = new URLSearchParams();
    if (monthParam) params.set("month", monthParam);
    params.set("quickOpen", "1");
    params.set("focus", "quick-schedule");
    params.set("quickTeacherId", slot.teacherId);
    params.set("quickStartAt", fmtDatetimeLocal(slot.startAt));
    params.set("quickDurationMin", String(Math.max(15, Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60000))));
    const defaults = coordinationSlotDefaultsByTeacher.get(slot.teacherId);
    if (defaults?.subjectId) params.set("quickSubjectId", defaults.subjectId);
    if (defaults?.campusId) params.set("quickCampusId", defaults.campusId);
    if (defaults?.roomId) params.set("quickRoomId", defaults.roomId);
    return buildStudentDetailHref(studentId, params, "#quick-schedule", "#quick-schedule");
  };
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
    packages.flatMap((p) =>
      [p.courseId, ...p.sharedCourses.map((c) => c.courseId)].filter((id): id is string => Boolean(id))
    )
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
    const key = `${sess.teacherId ?? sess.class.teacherId}|${new Date(sess.startAt).toISOString()}|${new Date(
      sess.endAt
    ).toISOString()}`;
    sessionKeyMap.set(key, sess);
  }

  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const returnTo = buildStudentDetailHref(
    studentId,
    new URLSearchParams({ month: monthLabel(monthDate) }),
    "#upcoming-sessions",
    "#upcoming-sessions"
  );

  const quickCandidates: {
    id: string;
    name: string;
    ok: boolean;
    reason?: string;
    statusLabel?: string;
  }[] = [];
  let quickPackageWarn = "";
  const quickCampus = campuses.find((c) => c.id === quickCampusId) ?? null;
  const quickCampusNeedsRoom = campusRequiresRoom(quickCampus);
  if (quickSubjectId && quickStartAt && quickCampusId && (quickRoomId || !quickCampusNeedsRoom)) {
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
      const packageDecision = await getSchedulablePackageDecision(prisma, {
        studentId,
        courseId: quickSubject?.courseId ?? "",
        at: startAt,
        requiredHoursMinutes: quickDurationMin,
      });
      if (!packageDecision.ok) {
        quickPackageWarn = humanizeSchedulingGateMessage(lang, packageDecision.message);
      }
    }
    if (!quickPackageWarn) {
      const studentSessionConflicts = await prisma.session.findMany({
        where: {
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          OR: [
            { studentId },
            { class: { oneOnOneStudentId: studentId } },
            { class: { enrollments: { some: { studentId } } } },
            { attendances: { some: { studentId } } },
          ],
        },
        include: {
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              teacher: true,
              campus: true,
              room: true,
              enrollments: { select: { studentId: true } },
            },
          },
          attendances: {
            select: {
              studentId: true,
              status: true,
              excusedCharge: true,
              deductedMinutes: true,
              deductedCount: true,
            },
          },
        },
        orderBy: { startAt: "asc" },
      });
      const studentSessionConflict = pickStudentSessionConflict(studentSessionConflicts, studentId);
      const roomConflict = quickRoomId
        ? pickTeacherSessionConflict(
            await prisma.session.findMany({
              where: {
                class: { roomId: quickRoomId },
                startAt: { lt: endAt },
                endAt: { gt: startAt },
              },
              include: {
                class: {
                  include: {
                    course: true,
                    subject: true,
                    level: true,
                    teacher: true,
                    campus: true,
                    room: true,
                    enrollments: { select: { studentId: true } },
                  },
                },
                attendances: {
                  select: {
                    studentId: true,
                    status: true,
                    excusedCharge: true,
                    deductedMinutes: true,
                    deductedCount: true,
                  },
                },
              },
            })
          )
        : null;
      const eligible = teachers.filter(
        (tch) => tch.subjectCourseId === quickSubjectId || tch.subjects.some((s) => s.id === quickSubjectId)
      );
      for (const tch of eligible) {
        if (studentSessionConflict) {
          quickCandidates.push({
            id: tch.id,
            name: tch.name,
            ok: false,
            reason: formatStudentSessionConflictReason(studentSessionConflict, startAt, endAt),
          });
          continue;
        }
        if (roomConflict) {
          quickCandidates.push({
            id: tch.id,
            name: tch.name,
            ok: false,
            reason: `Room conflict: ${formatSessionConflictLabel(roomConflict)}`,
          });
          continue;
        }
        let availabilitySource: "date" | null = null;
        if (!bypassAvailabilityCheck) {
          const availabilityCheck = await inspectTeacherAvailability(tch.id, startAt, endAt);
          availabilitySource = availabilityCheck.source;
          if (availabilityCheck.error) {
            quickCandidates.push({ id: tch.id, name: tch.name, ok: false, reason: availabilityCheck.error });
            continue;
          }
        }
        const sessionConflicts = await prisma.session.findMany({
          where: {
            OR: [{ teacherId: tch.id }, { teacherId: null, class: { teacherId: tch.id } }],
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          include: {
            class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
            attendances: {
              select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
            },
          },
          orderBy: { startAt: "asc" },
        });
        const sessionConflict = sessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
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
        quickCandidates.push({
          id: tch.id,
          name: tch.name,
          ok: true,
          statusLabel:
            availabilitySource === "date" ? t(lang, "Available via date availability", "按日期时段可排") : undefined,
        });
      }
      if (quickTeacherId) {
        quickCandidates.sort((a, b) => {
          const aPriority = a.id === quickTeacherId ? 0 : 1;
          const bPriority = b.id === quickTeacherId ? 0 : 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          if (a.ok !== b.ok) return a.ok ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        quickCandidates.sort((a, b) => {
          if (a.ok !== b.ok) return a.ok ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
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
  const activePackageCount = packages.filter((p) => p.status === "ACTIVE").length;
  const activeHourPackageCount = packages.filter((p) => p.status === "ACTIVE" && p.type === "HOURS").length;
  const pendingInvoiceGateCount = packages.filter((p) => p.financeGateStatus === "INVOICE_PENDING_MANAGER").length;
  const blockedInvoiceGateCount = packages.filter((p) => p.financeGateStatus === "BLOCKED").length;
  const totalRemainingMinutes = packages.reduce((sum, pkg) => {
    if (pkg.status !== "ACTIVE" || pkg.type !== "HOURS") return sum;
    return sum + Math.max(0, pkg.remainingMinutes ?? 0);
  }, 0);
  const packageRiskCount = packages.filter((p) => {
    if (p.type !== "HOURS" || p.status !== "ACTIVE") return false;
    const remaining = p.remainingMinutes ?? 0;
    const deducted30 = deducted30Map.get(p.id) ?? 0;
    const avgPerDay = deducted30 / FORECAST_WINDOW_DAYS;
    const estDays = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;
    return remaining <= LOW_MINUTES || (estDays != null && estDays <= LOW_DAYS);
  }).length;
  const nextUpcomingSession =
    upcomingSessions.find((s) => upcomingAttendanceMap.get(s.id)?.status !== "EXCUSED") ??
    upcomingSessions[0] ??
    null;
  const nextUpcomingAttendance = nextUpcomingSession ? upcomingAttendanceMap.get(nextUpcomingSession.id) ?? null : null;
  const nextUpcomingCancelled = nextUpcomingAttendance?.status === "EXCUSED";
  const currentFocusTitle =
    pendingInvoiceGateCount > 0 || blockedInvoiceGateCount > 0
      ? t(lang, "Invoice gate follow-up first", "先处理发票闸门")
      : packageRiskCount > 0
      ? t(lang, "Start with packages", "先看课包")
      : unpaidPackageCount > 0
      ? t(lang, "Billing follow-up first", "先处理账务")
      : nextUpcomingSession
      ? t(lang, "Next real lesson is ready", "先看下一节课")
      : t(lang, "Planning tools are clear", "可以直接排课");
  const currentFocusDetail =
    pendingInvoiceGateCount > 0 || blockedInvoiceGateCount > 0
      ? t(lang, "At least one direct-billing package is still waiting for manager approval or correction, so package billing should come before more lesson changes.", "至少有一个直客课包仍在等待管理审批或修正，建议先看课包账单，再继续改课。")
      : packageRiskCount > 0
      ? t(lang, "Low-balance package risk is active, so package review should come before schedule changes.", "当前有低余额课包风险，建议先确认课包，再改排课。")
      : unpaidPackageCount > 0
      ? t(lang, "There are unpaid packages on this profile. Confirm billing state before more lesson changes.", "这个学生还有未付款课包，建议先确认账务状态再继续改课。")
      : nextUpcomingSession
      ? t(lang, "No urgent billing blocker is active. You can move straight into the next lesson or schedule tools.", "当前没有紧急账务阻塞，可以直接处理下一节课或排课工具。")
      : t(lang, "No next lesson is locked yet, so use quick schedule or coordination to move this profile forward.", "当前还没有明确的下一节课，可直接用快速排课或排课协调推进。");
  const nextLessonLabel = nextUpcomingSession
    ? `${formatBusinessDateOnly(new Date(nextUpcomingSession.startAt))} ${fmtHHMM(new Date(nextUpcomingSession.startAt))}${
        nextUpcomingCancelled ? ` · ${tl(lang, "Cancelled")}` : ""
      }`
    : tl(lang, "No upcoming sessions.");
  const coordinationLaneLabel = activeSchedulingTicket
    ? `${activeSchedulingTicket.ticketNo} · ${schedulingCoordinationPhase?.title ?? activeSchedulingTicket.status}`
    : t(lang, "No open coordination lane", "当前没有打开中的协调分道");
  const studentSummaryCards = [
    {
      title: t(lang, "Current focus", "当前建议起点"),
      value: currentFocusTitle,
      detail: currentFocusDetail,
      background: packageRiskCount > 0 ? "#fff7ed" : unpaidPackageCount > 0 ? "#fff1f2" : "#eff6ff",
      border: packageRiskCount > 0 ? "#fdba74" : unpaidPackageCount > 0 ? "#fda4af" : "#bfdbfe",
    },
    {
      title: t(lang, "Next lesson", "下一节课"),
      value: nextLessonLabel,
      detail: nextUpcomingSession
        ? `${nextUpcomingSession.class.course.name}${nextUpcomingSession.class.subject ? ` / ${nextUpcomingSession.class.subject.name}` : ""}`
        : t(lang, "Use quick schedule or coordination to create the next concrete lesson.", "可从快速排课或排课协调开始安排下一节课。"),
      background: "#f8fafc",
      border: "#dbe4f0",
    },
    {
      title: t(lang, "Billing snapshot", "账务概览"),
      value:
        activeHourPackageCount > 0
          ? t(lang, `${fmtMinutes(totalRemainingMinutes)} remaining`, `剩余 ${fmtMinutes(totalRemainingMinutes)}`)
          : t(
              lang,
              `${unpaidPackageCount} unpaid · ${packageRiskCount} alerts · ${pendingInvoiceGateCount} pending invoice gate`,
              `${unpaidPackageCount} 个未付款 · ${packageRiskCount} 个预警 · ${pendingInvoiceGateCount} 个待审批发票闸门`
            ),
      detail:
        activeHourPackageCount > 0
          ? t(
              lang,
              `${unpaidPackageCount} unpaid · ${packageRiskCount} alerts · ${pendingInvoiceGateCount} pending invoice gate · ${activeHourPackageCount} active hour packages`,
              `${unpaidPackageCount} 个未付款 · ${packageRiskCount} 个预警 · ${pendingInvoiceGateCount} 个待审批发票闸门 · ${activeHourPackageCount} 个有效课时包`
            )
          : t(lang, `${activePackageCount} active packages on this profile. ${blockedInvoiceGateCount} are blocked.`, `当前共有 ${activePackageCount} 个有效课包，其中 ${blockedInvoiceGateCount} 个处于阻塞状态。`),
      background: "#fffaf0",
      border: "#fde68a",
    },
    {
      title: t(lang, "Coordination lane", "协调分道"),
      value: coordinationLaneLabel,
      detail: activeSchedulingTicket
        ? t(lang, "Open the coordination workspace when parent timing or exception handling is driving the next step.", "如果当前下一步取决于家长时间或特殊时间检查，就进入排课协调工作台。")
        : t(lang, "No active coordination ticket is blocking this profile right now.", "当前没有活跃的排课协调工单阻塞这个学生。"),
      background: activeSchedulingTicket ? "#fffaf0" : "#f8fafc",
      border: activeSchedulingTicket ? "#fdba74" : "#dbe4f0",
    },
  ];
  const studentSectionLinks = [
    {
      key: "coordination",
      href: studentCoordinationHref,
      label: t(lang, "Scheduling coordination", "排课协调"),
      detail: activeSchedulingTicket
        ? `${activeSchedulingTicket.ticketNo} · ${schedulingCoordinationPhase?.title ?? activeSchedulingTicket.status}`
        : t(lang, "Open when parent timing drives the next step", "当家长时间决定下一步时进入"),
      shortDetail: activeSchedulingTicket
        ? t(lang, "Parent timing or exceptions still need follow-up", "家长时间或特殊情况仍需跟进")
        : t(lang, "Open only when family timing drives the next step", "只在家长时间决定下一步时进入"),
      background: activeSchedulingTicket ? "#fff7ed" : "#ffffff",
      border: activeSchedulingTicket ? "#fdba74" : "#dbe4f0",
    },
    {
      key: "quickSchedule",
      href: "#quick-schedule",
      label: tl(lang, "Quick Schedule"),
      detail: quickRescheduleSessionOptions.length > 0
        ? t(lang, `${quickRescheduleSessionOptions.length} session targets ready`, `${quickRescheduleSessionOptions.length} 个课次可直接调整`)
        : t(lang, "Use for new or replacement lesson planning", "用于新排课或替换课次"),
      shortDetail: quickRescheduleSessionOptions.length > 0
        ? t(lang, "Ready for direct reschedule work", "可直接进入调课")
        : t(lang, "Best for new or replacement lessons", "用于新排课或替换课次"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      key: "calendarTools",
      href: "#calendar-tools",
      label: tl(lang, "Quick Schedule Calendar"),
      detail: t(lang, "Open the visual planner to compare times before creating or changing lessons.", "用日历视图先比对时间，再安排或调整课次。"),
      shortDetail: t(lang, "Best for visual planning and slot comparison", "适合可视化排课和比对时间"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      key: "upcomingSessions",
      href: "#upcoming-sessions",
      label: tl(lang, "Upcoming Sessions"),
      detail: nextUpcomingSession
        ? nextLessonLabel
        : t(lang, "No concrete lesson yet", "还没有明确下一节课"),
      shortDetail: nextUpcomingSession
        ? t(lang, "Open the next concrete lesson", "直接处理下一节课")
        : t(lang, "No next lesson is locked yet", "当前还没有明确下一节课"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      key: "packages",
      href: "#packages",
      label: tl(lang, "Packages"),
      detail: t(lang, `${unpaidPackageCount} unpaid · ${packageRiskCount} alerts · ${pendingInvoiceGateCount} pending invoice gate`, `${unpaidPackageCount} 个未付款 · ${packageRiskCount} 个预警 · ${pendingInvoiceGateCount} 个待审批发票闸门`),
      shortDetail:
        unpaidPackageCount > 0 || packageRiskCount > 0 || pendingInvoiceGateCount > 0 || blockedInvoiceGateCount > 0
          ? t(
              lang,
              `${fmtMinutes(totalRemainingMinutes)} remaining; billing, package risk, or invoice gate needs review`,
              `剩余 ${fmtMinutes(totalRemainingMinutes)}；当前有账务、课包风险或发票闸门需要处理`
            )
          : activeHourPackageCount > 0
          ? t(lang, `${fmtMinutes(totalRemainingMinutes)} remaining across active hour packages`, `当前有效课时包合计剩余 ${fmtMinutes(totalRemainingMinutes)}`)
          : t(lang, "Billing is clear right now", "当前账务状态正常"),
      background: unpaidPackageCount > 0 || packageRiskCount > 0 || pendingInvoiceGateCount > 0 || blockedInvoiceGateCount > 0 ? "#fffaf0" : "#ffffff",
      border: unpaidPackageCount > 0 || packageRiskCount > 0 || pendingInvoiceGateCount > 0 || blockedInvoiceGateCount > 0 ? "#fde68a" : "#dbe4f0",
    },
    {
      key: "attendance",
      href: "#attendance",
      label: tl(lang, "Attendance"),
      detail: t(lang, `${attendances.length} recent records`, `${attendances.length} 条近期记录`),
      shortDetail: t(lang, "Check recent sign-in and leave records", "查看近期点名和请假记录"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      key: "enrollments",
      href: "#enrollments",
      label: tl(lang, "Enrollments"),
      detail: t(lang, `${enrollments.length} active teaching containers`, `${enrollments.length} 个当前报名容器`),
      shortDetail: t(lang, "Review active course containers", "查看当前报名容器"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      key: "editStudent",
      href: "#edit-student",
      label: tl(lang, "Edit Student"),
      detail: t(lang, "Use after queue-style work is settled", "更适合在队列型工作完成后进入"),
      shortDetail: t(lang, "Profile, notes, and binding changes", "修改档案、备注和绑定"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
  ];
  const studentExportLink = {
    key: "exportStudentReport",
    href: `/api/exports/student-detail/${studentId}`,
    label: tl(lang, "Export Student Report"),
    detail: t(lang, "Open the outward-facing summary without leaving this page.", "不离开当前页面也可以直接导出学生报告。"),
    shortDetail: t(lang, "Export the outward-facing student summary", "导出对外学生报告"),
    background: "#ffffff",
    border: "#dbe4f0",
  };
  const studentSectionLinkMap = new Map(studentSectionLinks.map((link) => [link.key, link]));
  const recommendedPrimaryKey =
    activeSchedulingTicket
      ? "coordination"
      : packageRiskCount > 0 || unpaidPackageCount > 0 || pendingInvoiceGateCount > 0 || blockedInvoiceGateCount > 0
      ? "packages"
      : "quickSchedule";
  const recommendedPrimaryLink = studentSectionLinkMap.get(recommendedPrimaryKey) ?? studentSectionLinks[0];
  const studentPrimaryActionOrder =
    recommendedPrimaryKey === "coordination"
      ? ["coordination", "quickSchedule", "calendarTools"]
      : recommendedPrimaryKey === "packages"
      ? ["packages", "quickSchedule", "calendarTools"]
      : ["quickSchedule", "calendarTools", "coordination"];
  const studentPrimaryLinks = studentPrimaryActionOrder
    .map((key) => studentSectionLinkMap.get(key))
    .filter((link): link is NonNullable<typeof studentSectionLinks[number]> => Boolean(link));
  const studentSupportingPrimaryLinks = studentPrimaryLinks.filter((link) => link.key !== recommendedPrimaryKey).slice(0, 2);
  const learningSecondaryLinks = ["upcomingSessions", "attendance", "enrollments"]
    .filter((key) => !studentPrimaryActionOrder.includes(key))
    .map((key) => studentSectionLinkMap.get(key))
    .filter((link): link is NonNullable<typeof studentSectionLinks[number]> => Boolean(link));
  const profileSecondaryLinks = [studentSectionLinkMap.get("editStudent"), studentExportLink].filter(
    (link): link is typeof studentExportLink => Boolean(link)
  );
  const recommendedPrimaryTitle =
    recommendedPrimaryKey === "coordination"
      ? t(lang, "Recommended now: coordination", "当前推荐：排课协调")
      : recommendedPrimaryKey === "packages"
      ? t(lang, "Recommended now: packages", "当前推荐：课包")
      : t(lang, "Recommended now: quick schedule", "当前推荐：快速排课");
  const recommendedPrimaryReason =
    recommendedPrimaryKey === "coordination"
      ? t(lang, "There is an active coordination lane, so this should stay as the first stop.", "当前已有活跃协调分道，建议先从这里继续。")
      : recommendedPrimaryKey === "packages"
      ? t(lang, "Billing or package follow-up is active, so clear this before more lesson changes.", "当前有账务或课包跟进，建议先处理这里，再继续改课。")
      : t(lang, "Scheduling tools are the most common teaching-ops entry point, so quick schedule stays first when nothing else is blocking the profile.", "排课工具是教务最常用入口，所以当前没有阻塞项时，快速排课保持第一优先级。");
  return (
    <div>
      <StudentDetailHashStateClient />
      <div style={{ ...workbenchHeroStyle("indigo"), gap: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#3730a3", letterSpacing: 0.4 }}>
              {tl(lang, "Student Detail")}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{student.name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#475569", fontSize: 13 }}>
                <span>{student.school ?? "-"}</span>
                <span>{student.grade ?? "-"}</span>
                <span>{student.sourceChannel?.name ?? "-"}</span>
                <span>{student.studentType?.name ?? "-"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#64748b", flexWrap: "wrap" }}>
              <a href={studentsReturnHref} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 999, background: "#fff", textDecoration: "none" }}>
                &lt;&lt; {tl(lang, "Back to Students")}
              </a>
              <span style={{ fontSize: 11 }} title={student.id}>
                ID: STU-{student.id.length > 10 ? `${student.id.slice(0, 4)}…${student.id.slice(-4)}` : student.id}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={`/api/exports/student-detail/${studentId}`}
              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
            >
              {tl(lang, "Export Student Report")}
            </a>
            <a
              href="#calendar-tools"
              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
            >
              {tl(lang, "Quick Schedule Calendar")}
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Remaining", "剩余课时")}</div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{activeHourPackageCount > 0 ? fmtMinutes(totalRemainingMinutes) : "-"}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {activeHourPackageCount > 0
                ? t(lang, `${activeHourPackageCount} active hour packages`, `${activeHourPackageCount} 个有效课时包`)
                : t(lang, "No active hour package", "当前没有有效课时包")}
            </div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{tl(lang, "Alert")}</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: packageRiskCount > 0 ? "#c2410c" : "#166534" }}>{packageRiskCount}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Packages near low balance", "接近低余额的课包")}</div>
          </div>
          <div style={workbenchMetricCardStyle("rose")}>
            <div style={workbenchMetricLabelStyle("rose")}>{tl(lang, "Unpaid packages")}</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: unpaidPackageCount > 0 ? "#be123c" : "#166534" }}>{unpaidPackageCount}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Needs billing follow-up", "需要账单跟进")}</div>
          </div>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{tl(lang, "Upcoming Sessions")}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
              {nextUpcomingSession
                ? `${formatBusinessDateOnly(new Date(nextUpcomingSession.startAt))} ${fmtHHMM(new Date(nextUpcomingSession.startAt))}`
                : "-"}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {nextUpcomingSession
                ? `${nextUpcomingSession.class.course.name}${nextUpcomingCancelled ? ` (${tl(lang, "Cancelled")})` : ""}`
                : tl(lang, "No upcoming sessions.")}
            </div>
          </div>
        </div>
      </div>

      {sourceWorkflow === "students" ? (
        <WorkflowSourceBanner
          tone="blue"
          title={t(lang, "From Student List", "来自学生列表")}
          description={
            coordinationOnly
              ? t(
                  lang,
                  "You opened the coordination workspace from a student-list flow. Finish the current scheduling work here, then jump back to the same filtered list when you are ready for the next student.",
                  "你是从学生列表流程进入排课协调工作台的。先在这里完成当前排课处理，处理完后可直接回到原来的筛选列表继续下一位学生。"
                )
              : t(
                  lang,
                  "You opened this profile from a filtered student list. Keep using the quick workbench here, then jump back to the same list when you want the next profile.",
                  "你是从一个筛选后的学生列表进入当前档案的。可以先在这里继续工作，处理完再回到同一个列表继续下一位学生。"
                )
          }
          primaryHref={studentsReturnHref}
          primaryLabel={t(lang, "Back to Student List", "返回学生列表")}
          secondaryActions={
            !coordinationOnly ? (
              <a href={studentCoordinationHref} style={{ fontWeight: 700 }}>
                {t(lang, "Open Coordination Workspace", "打开排课协调工作台")}
              </a>
            ) : (
              <a href={studentDetailHomeHref} style={{ fontWeight: 700 }}>
                {t(lang, "Open Full Student Detail", "打开完整学生详情")}
              </a>
            )
          }
        />
      ) : null}

      {err ? <NoticeBanner type="error" title={tl(lang, "Error")} message={humanizeSchedulingGateMessage(lang, err)} /> : null}
      {msg ? <NoticeBanner type="success" title={tl(lang, "OK")} message={msg} /> : null}

      <div style={{ display: "grid", gap: 16 }}>
        {!coordinationOnly ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {studentSummaryCards.map((card) => (
                <div key={card.title} style={studentSummaryCardStyle(card.background, card.border)}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.2 }}>{card.title}</div>
                  <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{card.detail}</div>
                </div>
              ))}
            </div>

            <div
              id="student-workbench-bar"
              style={{
                ...workbenchInfoBarStyle,
                position: "sticky",
                top: 12,
                zIndex: 5,
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{t(lang, "Student workbench", "学生工作台")}</div>
                    <div style={{ color: "#475569", fontSize: 13, maxWidth: 920 }}>
                      {t(lang, "Use the sticky shortcut row above to jump. Use the actions below to decide the next step.", "上方固定快捷条负责跳转；下面这块负责决定下一步先做什么。")}
                    </div>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 12, fontWeight: 700, flexWrap: "wrap" }}>
                    <span>{t(lang, "Sticky row = jump", "上面负责跳转")}</span>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <span>{t(lang, "This block = start here", "这里负责决定先做什么")}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <a
                    href={recommendedPrimaryLink.href}
                    style={studentRecommendedActionStyle(
                      recommendedPrimaryLink.background === "#ffffff" ? "#eff6ff" : recommendedPrimaryLink.background,
                      recommendedPrimaryLink.border === "#dbe4f0" ? "#93c5fd" : recommendedPrimaryLink.border
                    )}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: "#1d4ed8" }}>{recommendedPrimaryTitle}</span>
                        <span style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{recommendedPrimaryLink.label}</span>
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          minHeight: 24,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#ffffff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          fontSize: 11,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t(lang, "Start here", "从这里开始")}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.45 }}>{recommendedPrimaryReason}</span>
                    <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{recommendedPrimaryLink.shortDetail}</span>
                  </a>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    {studentSupportingPrimaryLinks.map((link) => (
                      <a key={link.href} href={link.href} style={studentPrimaryActionStyle(link.background, link.border)}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{link.label}</span>
                        <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>{link.shortDetail}</span>
                      </a>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div style={studentSectionGroupStyle("#f8fafc")}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: 0.2 }}>
                      {t(lang, "Learning follow-up", "学习跟进")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {learningSecondaryLinks.map((link) => (
                        <a key={link.href} href={link.href} style={studentSecondaryActionStyle()}>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div style={studentSectionGroupStyle("#ffffff")}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: 0.2 }}>
                      {t(lang, "Profile and exports", "档案与导出")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {profileSecondaryLinks.map((link) => (
                        <a key={link.href} href={link.href} style={studentSecondaryActionStyle()}>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, alignItems: "start" }}>
              <details
                style={{
                  order: 2,
                  display: "grid",
                  gap: 12,
                  padding: 14,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: "#ffffff",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>{t(lang, "Profile snapshot", "档案概览")}</summary>
                <div style={{ display: "grid", gap: 4, marginTop: 12 }}>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {t(lang, "Open this only when you need background details. The next-action panel stays first for daily work.", "只有需要背景资料时再展开这里；日常处理先看右侧下一步操作。")}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
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
                    <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Excused Count")}</div>
                    <div style={{ fontWeight: 700 }}>{excusedCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>{tl(lang, "Recent Attendance")}</div>
                    <div style={{ fontWeight: 700 }}>{attendances.length}</div>
                  </div>
                </div>
              </details>

              <div
                style={{
                  order: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 14,
                  background: "#f8fafc",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800 }}>{t(lang, "Next actions", "下一步操作")}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {packageRiskCount > 0
                      ? t(lang, "This profile has package risk. Check packages first, then schedule changes.", "这个学生当前有课包风险，建议先看课包，再处理排课。")
                      : unpaidPackageCount > 0
                        ? t(lang, "This profile has unpaid packages. Confirm billing follow-up before making more changes.", "这个学生当前有未付款课包，建议先确认账务跟进。")
                        : t(lang, "No urgent package issue detected. Start from the next lesson or the planning tools below.", "当前未发现紧急课包问题，可先从下一节课或下方排课工具开始。")}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{tl(lang, "Unpaid packages")}</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: unpaidPackageCount > 0 ? "#be123c" : "#166534" }}>{unpaidPackageCount}</div>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{tl(lang, "Alert")}</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: packageRiskCount > 0 ? "#c2410c" : "#166534" }}>{packageRiskCount}</div>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{tl(lang, "Upcoming Sessions")}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {nextUpcomingSession ? fmtHHMM(new Date(nextUpcomingSession.startAt)) : "-"}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {nextUpcomingSession ? formatBusinessDateOnly(new Date(nextUpcomingSession.startAt)) : tl(lang, "No upcoming sessions.")}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <a
                    href={studentCoordinationHref}
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                  >
                    {t(lang, "Scheduling coordination", "排课协调")}
                  </a>
                  <a
                    href="#quick-schedule"
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                  >
                    {tl(lang, "Quick Schedule")}
                  </a>
                  <a
                    href="#upcoming-sessions"
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                  >
                    {tl(lang, "Upcoming Sessions")}
                  </a>
                  <a
                    href="#packages"
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                  >
                    {tl(lang, "Packages")}
                  </a>
                  <a
                    href="#attendance"
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                  >
                    {tl(lang, "Attendance")}
                  </a>
                  <a
                    href="#edit-student"
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                  >
                    {tl(lang, "Edit Student")}
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            id="student-workbench-bar"
            style={{
              ...workbenchInfoBarStyle,
              border: "1px solid #fcd34d",
              background: "#fffbeb",
              boxShadow: "0 8px 20px rgba(146, 64, 14, 0.06)",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Coordination workspace", "排课协调工作台")}</div>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {t(lang, "This page now hides the long student detail sections so you can stay on parent timing, candidate slots, special requests, and follow-up only.", "当前页面已收起学生长页的其余区块，只保留家长时间、候选时间、特殊时间检查和跟进动作。")}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569" }}>
                  {student.school ?? "-"} | {student.grade ?? "-"}
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    background: openSchedulingTickets.length > 0 ? "#fff7ed" : "#ffffff",
                    border: openSchedulingTickets.length > 0 ? "1px solid #fdba74" : "1px solid #cbd5e1",
                    color: openSchedulingTickets.length > 0 ? "#9a3412" : "#475569",
                  }}
                >
                  {t(lang, "Open lanes", "打开中的协调分道")}: {openSchedulingTickets.length}
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    background: activeSchedulingTicket ? "#f0fdf4" : "#ffffff",
                    border: activeSchedulingTicket ? "1px solid #86efac" : "1px solid #cbd5e1",
                    color: activeSchedulingTicket ? "#166534" : "#475569",
                  }}
                >
                  {t(lang, "Current phase", "当前阶段")}: {schedulingCoordinationPhase?.title ?? t(lang, "No active ticket", "暂无活跃工单")}
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    background: parentAvailabilityRequest?.submittedAt ? "#f0fdf4" : "#ffffff",
                    border: parentAvailabilityRequest?.submittedAt ? "1px solid #86efac" : "1px solid #cbd5e1",
                    color: parentAvailabilityRequest?.submittedAt ? "#166534" : "#475569",
                  }}
                >
                  {t(lang, "Latest parent submission", "最近家长提交")}: {parentAvailabilityRequest?.submittedAt ? formatBusinessDateTime(parentAvailabilityRequest.submittedAt) : t(lang, "None yet", "暂无")}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={studentDetailHomeHref}>{t(lang, "Close coordination workspace", "关闭排课协调工作台")}</a>
              <a href={studentDetailHomeHref}>{t(lang, "Open full student detail", "打开完整学生详情")}</a>
              {activeSchedulingTicket && schedulingTicketHref ? <a href={schedulingTicketHref}>{t(lang, "Open active ticket", "打开当前工单")}</a> : null}
              <a href={`/api/exports/student-detail/${studentId}`}>{tl(lang, "Export Student Report")}</a>
            </div>
          </div>
        )}

        {coordinationOnly ? (
        <div
          id="scheduling-coordination"
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 14,
            background: activeSchedulingTicket ? "#fffaf0" : "#f8fafc",
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ color: "#475569", fontSize: 13 }}>
              {t(lang, "This workspace isolates scheduling coordination so you can focus on parent timing, candidate slots, special-time checks, and follow-up without the rest of the student profile in the way.", "这个工作台把排课协调单独拆出来，方便只专注处理家长时间、候选时间、特殊时间检查和跟进动作，不再被学生详情其他内容打断。")}
            </div>
            <a
              href={studentDetailHomeHref}
              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none", color: "inherit" }}
            >
              {t(lang, "Close coordination workspace", "关闭排课协调工作台")}
            </a>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Scheduling coordination", "排课协调")}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {t(
                  lang,
                  "Use one coordination ticket per course to track parent preferences, special time requests, and the next follow-up. Teacher availability remains the default scheduling source.",
                  "每门课程各用一张排课协调工单记录家长偏好、特殊时间要求和下次跟进时间。老师 availability 仍然是默认排课依据。"
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {activeSchedulingTicket && schedulingTicketHref ? (
                <a
                  href={schedulingTicketHref}
                  style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                >
                  {t(lang, "Open active ticket", "打开当前工单")}
                </a>
              ) : null}
              {!activeSchedulingTicket && coordinationCreationOptions.length === 0 ? (
                <form action={createSchedulingCoordinationTicket.bind(null, studentId)}>
                  <button type="submit">{t(lang, "Create scheduling ticket", "新建排课协调工单")}</button>
                </form>
              ) : null}
            </div>
          </div>
          {activeSchedulingTicket ? (
            <div style={{ fontSize: 12, color: "#92400e" }}>
              {t(
                lang,
                "Reuse the matching course ticket first. Only create another coordination ticket when a different course still needs its own follow-up.",
                "请优先沿用对应课程的未关闭排课协调工单。只有另一门课程也需要单独跟进时，才再新建。"
              )}
            </div>
          ) : null}
          {coordinationCreationOptions.length > 0 ? (
            <div style={{ border: "1px solid #dbeafe", borderRadius: 10, padding: 10, background: "#f8fbff", display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Course coordination lanes", "课程协调分道")}</div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                {t(
                  lang,
                  "Each course can keep its own coordination ticket and parent form. Create a new lane only for courses that are not already being tracked.",
                  "每门课程都可以保留独立的协调工单和家长时间表单。只有还没被跟进的课程，才需要新建新的协调分道。"
                )}
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {coordinationCreationOptions.map((option) => (
                  <div key={option.enrollmentId} style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: 10, display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 700 }}>{option.courseLabel}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {option.teacherName ? `${t(lang, "Teacher", "老师")}: ${option.teacherName}` : t(lang, "Teacher pending", "老师待确认")}
                    </div>
                    {option.hasOpenTicket ? (
                      <div style={{ fontSize: 12, color: "#166534" }}>
                        {t(lang, "An open coordination ticket already exists for this course.", "这门课程已经有未关闭的排课协调工单。")}
                      </div>
                    ) : (
                      <form action={createSchedulingCoordinationTicket.bind(null, studentId)}>
                        <input type="hidden" name="enrollmentId" value={option.enrollmentId} />
                        <button type="submit">{t(lang, "Create course ticket", "为这门课新建工单")}</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {openSchedulingTickets.length > 0 ? (
            <div style={{ border: "1px solid #fdba74", borderRadius: 10, padding: 10, background: "#fff7ed", color: "#9a3412", display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>
                {t(lang, "Open coordination tickets", "未关闭排课协调工单")}
              </div>
              <div style={{ fontSize: 13 }}>
                {t(
                  lang,
                  "Select the course ticket you want to work on below. The helper panels further down will follow that selected ticket.",
                  "请在下面选择当前要处理的课程工单；下方的辅助面板会跟随你选中的这张工单。"
                )}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {openSchedulingTickets.map((ticket) => {
                  const ticketHref = `/admin/tickets/${ticket.id}?back=${encodeURIComponent(buildStudentCoordinationHref(studentId))}`;
                  const ticketCourseLabel = ticket.parentAvailabilityRequest?.courseLabel ?? ticket.course ?? "-";
                  const ticketParentHref = ticket.parentAvailabilityRequest
                    ? buildParentAvailabilityPath(ticket.parentAvailabilityRequest.token)
                    : "";
                  const ticketShareText = ticketParentHref
                    ? buildParentAvailabilityShareText({
                        studentName: student.name,
                        courseLabel: ticketCourseLabel,
                        url: `https://sgtmanage.com${ticketParentHref}`,
                      })
                    : "";
                  const ticketRows = ticket.parentAvailabilityRequest?.submittedAt
                    ? formatParentAvailabilityFieldRows(
                        coerceParentAvailabilityPayload(ticket.parentAvailabilityRequest.payloadJson)
                      )
                    : [];
                  return (
                    <div
                      key={ticket.id}
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: ticket.id === activeSchedulingTicket?.id ? "1px solid #f59e0b" : "1px solid #fed7aa",
                        background: ticket.id === activeSchedulingTicket?.id ? "#fff" : "#fffbeb",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ fontWeight: 800 }}>
                            {ticketCourseLabel}
                            {ticket.id === activeSchedulingTicket?.id ? ` | ${t(lang, "Current ticket", "当前工单")}` : ""}
                          </div>
                          <div style={{ fontSize: 13 }}>
                            <strong>{ticket.ticketNo}</strong>
                            {` | ${ticket.status}`}
                            {ticket.owner ? ` | ${ticket.owner}` : ""}
                          </div>
                          <div style={{ fontSize: 12, color: "#7c2d12" }}>
                            {ticket.parentAvailabilityRequest?.submittedAt
                              ? `${t(lang, "Latest submission", "最近提交")}: ${formatBusinessDateTime(ticket.parentAvailabilityRequest.submittedAt)}`
                              : ticket.parentAvailabilityRequest?.expiresAt
                                ? `${t(lang, "Link expires", "链接有效期")}: ${formatBusinessDateTime(ticket.parentAvailabilityRequest.expiresAt)}`
                                : `${t(lang, "Created", "创建于")}: ${formatBusinessDateTime(ticket.createdAt)}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {ticket.id !== activeSchedulingTicket?.id ? (
                            <a
                              href={buildCoordinationTicketPanelHref(ticket.id)}
                              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none", color: "inherit" }}
                            >
                              {t(lang, "Use in helper", "切换到这张工单")}
                            </a>
                          ) : null}
                          <a
                            href={ticketHref}
                            style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none", color: "inherit" }}
                          >
                            {t(lang, "Open ticket", "打开工单")}
                          </a>
                          {ticketParentHref ? (
                            <a
                              href={ticketParentHref}
                              target="_blank"
                              rel="noreferrer"
                              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none", color: "inherit" }}
                            >
                              {t(lang, "Open parent form", "打开家长表单")}
                            </a>
                          ) : null}
                          {ticketParentHref ? (
                            <CopyTextButton
                              text={`https://sgtmanage.com${ticketParentHref}`}
                              label={t(lang, "Copy link", "复制链接")}
                              copiedLabel={t(lang, "Copied", "已复制")}
                            />
                          ) : null}
                          {ticketShareText ? (
                            <CopyTextButton
                              text={ticketShareText}
                              label={t(lang, "Copy message", "复制发送文案")}
                              copiedLabel={t(lang, "Copied", "已复制")}
                            />
                          ) : null}
                          {ticket.parentAvailabilityRequest ? (
                            <form action={regenerateSchedulingCoordinationParentLink.bind(null, studentId, ticket.id)}>
                              <button type="submit">{t(lang, "Regenerate link", "重生链接")}</button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      {ticketRows.length > 0 ? (
                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                          {ticketRows.map((item) => (
                            <div key={`${ticket.id}:${item.label}:${item.value}`} style={{ border: "1px solid #fed7aa", borderRadius: 10, background: "#fff", padding: 10 }}>
                              <div style={{ fontSize: 12, color: "#9a3412" }}>{item.label}</div>
                              <div style={{ fontWeight: 700, marginTop: 4, whiteSpace: "pre-wrap" }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {activeSchedulingTicket ? (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Current status", "当前状态")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{activeSchedulingTicket.status}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {activeSchedulingTicket.ticketNo}
                </div>
              </div>
              <div style={{ border: "1px solid #dbeafe", borderRadius: 10, padding: 10, background: "#eff6ff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Coordination phase", "协调阶段")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{schedulingCoordinationPhase?.title ?? "-"}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {schedulingCoordinationPhase?.nextStep ?? "-"}
                </div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Owner", "负责人")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{activeSchedulingTicket.owner || t(lang, "Unassigned", "未分配")}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {t(lang, "Created", "创建于")}: {formatBusinessDateTime(activeSchedulingTicket.createdAt)}
                </div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Next follow-up", "下次跟进")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>
                  {activeSchedulingTicket.nextActionDue ? formatBusinessDateTime(activeSchedulingTicket.nextActionDue) : "-"}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {t(lang, "Default rule", "默认规则")}: {t(lang, "Use availability first", "先用老师 availability")}
                </div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Parent time form", "家长时间表单")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>
                  {parentAvailabilityRequest
                    ? parentAvailabilityRequest.submittedAt
                      ? t(lang, "Submitted", "已提交")
                      : t(lang, "Sent, waiting for parent", "已发送，等待家长")
                    : t(lang, "Not sent yet", "尚未发送")}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {parentAvailabilityRequest?.submittedAt
                    ? `${t(lang, "Latest submission", "最近提交")}: ${formatBusinessDateTime(parentAvailabilityRequest.submittedAt)}`
                    : parentAvailabilityRequest?.expiresAt
                      ? `${t(lang, "Link expires", "链接有效期")}: ${formatBusinessDateTime(parentAvailabilityRequest.expiresAt)}`
                      : "-"}
                </div>
                {parentAvailabilityHref ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <a href={parentAvailabilityHref} target="_blank" rel="noreferrer">
                      {t(lang, "Open parent form", "打开家长表单")}
                    </a>
                    <CopyTextButton
                      text={`https://sgtmanage.com${parentAvailabilityHref}`}
                      label={t(lang, "Copy link", "复制链接")}
                      copiedLabel={t(lang, "Copied", "已复制")}
                    />
                    <CopyTextButton
                      text={parentAvailabilityShareText}
                      label={t(lang, "Copy message", "复制发送文案")}
                      copiedLabel={t(lang, "Copied", "已复制")}
                    />
                    <form action={regenerateSchedulingCoordinationParentLink.bind(null, studentId, activeSchedulingTicket.id)}>
                      <button type="submit">{t(lang, "Regenerate link", "重生链接")}</button>
                    </form>
                  </div>
                ) : null}
              </div>
              {parentAvailabilityRows.length > 0 ? (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff", gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Latest parent submission", "家长最近提交")}</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 8 }}>
                    {parentAvailabilityRows.map((item) => (
                      <div key={`${item.label}:${item.value}`} style={{ border: "1px solid #dbeafe", borderRadius: 10, background: "#f8fbff", padding: 10 }}>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.label}</div>
                        <div style={{ fontWeight: 700, marginTop: 4, whiteSpace: "pre-wrap" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Latest summary", "最新摘要")}</div>
                <div style={{ fontWeight: 700, marginTop: 4, whiteSpace: "pre-wrap" }}>
                  {schedulingSummaryCurrentDisplay}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {schedulingSummaryActionDisplay}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 10,
                padding: 12,
                background: "#fff",
                color: "#475569",
              }}
            >
              {t(
                lang,
                "No active coordination ticket yet. Create one when parent timing still needs follow-up or a special time request needs tracking.",
                "当前还没有活跃的排课协调工单。如果家长时间还需要继续跟进，或需要记录特殊时间请求，可以先新建一张。"
              )}
            </div>
          )}
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 12, background: "#eff6ff", display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 800 }}>{t(lang, "Generate candidate slots", "生成候选时间")}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  {t(
                    lang,
                    "Use submitted teacher availability as the default source and send 3-5 concrete options to the parent without re-checking the teacher.",
                    "直接用老师已提交的 availability 生成 3-5 个可发给家长的时间，不需要再重复问老师。"
                  )}
                </div>
              </div>
              {coordinationTeacherOptions.length > 0 ? (
                <form method="get" action={studentCoordinationHref} style={{ display: "grid", gap: 10 }}>
                  {coordinationPreservedEntries.map(([key, value]) => (
                    <input key={`${key}:${value}`} type="hidden" name={key} value={value} />
                  ))}
                  <input type="hidden" name="coordGenerate" value="1" />
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Start from date", "从哪天开始")}</label>
                    <input type="date" name="coordDate" defaultValue={coordDate} />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Teacher scope", "老师范围")}</label>
                    <select name="coordTeacherId" defaultValue={effectiveCoordTeacherId}>
                      <option value="">{t(lang, "All matched teachers", "全部匹配老师")}</option>
                      {coordinationTeacherOptions.map((option) => (
                        <option key={option.teacherId} value={option.teacherId}>
                          {option.teacherName}
                          {option.subjectLabel ? ` | ${option.subjectLabel}` : ""}
                          {option.assigned ? ` | ${t(lang, "Assigned", "当前老师")}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit">{t(lang, "Generate slots", "生成时间")}</button>
                    <a
                      href={coordinationWorkspaceClearHref}
                      style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                    >
                      {t(lang, "Clear helper", "清除辅助")}
                    </a>
                  </div>
                </form>
              ) : (
                <div style={{ border: "1px dashed #bfdbfe", borderRadius: 10, padding: 10, background: "#fff", color: "#475569" }}>
                  {t(
                    lang,
                    "No matched teaching context yet. Add or confirm the student's enrollment first, then the system can generate availability-based slot options.",
                    "当前还没有匹配到可教学的老师上下文。请先确认学生的报名信息，系统才能基于 availability 生成候选时间。"
                  )}
                </div>
              )}
              {coordGenerate ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {t(lang, "Suggested duration", "当前建议课时")}: <strong>{coordinationDurationMin} mins</strong>
                  </div>
                  {generatedCoordinationSlots.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {generatedCoordinationSlots.map((slot) => (
                        (() => {
                          const slotDefaults = coordinationSlotDefaultsByTeacher.get(slot.teacherId);
                          const quickScheduleReady = Boolean(slotDefaults?.subjectId && slotDefaults?.campusId);
                          return (
                        <div
                          key={slot.slotKey}
                          style={{ border: "1px solid #bfdbfe", borderRadius: 12, padding: 12, background: "#fff", display: "grid", gap: 8 }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontWeight: 800 }}>
                                {formatBusinessDateOnly(slot.startAt)} {formatBusinessTimeOnly(slot.startAt)}-{formatBusinessTimeOnly(slot.endAt)}
                              </div>
                              <div style={{ color: "#334155", fontSize: 13 }}>
                                {slot.teacherName}
                                {slot.teacherSubjectLabel ? ` | ${slot.teacherSubjectLabel}` : ""}
                              </div>
                            </div>
                            <div
                              style={{
                                padding: "4px 8px",
                                borderRadius: 999,
                                background: "#dbeafe",
                                color: "#1d4ed8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {t(lang, "Availability-ready", "老师 availability 可直接用")}
                            </div>
                          </div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>
                            {t(lang, "Use this option directly with the parent, then open Quick Schedule with the same time.", "这就是可直接发给家长的时间，确认后可直接带着同一时间进入排课。")}
                          </div>
                          {!quickScheduleReady ? (
                            <div style={{ color: "#b45309", fontSize: 12 }}>
                              {t(lang, "Quick Schedule will still open, but campus or subject needs one more selection before finding teachers.", "可以直接打开排课弹窗，但校区或科目还需要补选一次，系统才能继续匹配老师。")}
                            </div>
                          ) : null}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a
                              href={buildQuickScheduleHrefForCoordinationSlot(slot)}
                              style={{ padding: "8px 12px", borderRadius: 10, background: "#2563eb", color: "#fff", textDecoration: "none", fontWeight: 700 }}
                            >
                              {t(lang, "Use in Quick Schedule", "用这个时间去排课")}
                            </a>
                            <CopyTextButton
                              text={buildSchedulingCoordinationSlotShareText(slot, "default")}
                              label={t(lang, "Copy message", "复制发送文案")}
                              copiedLabel={t(lang, "Copied", "已复制")}
                            />
                            {activeSchedulingTicket && activeSchedulingTicket.status !== "Waiting Parent" ? (
                              <form action={markSchedulingCoordinationParentChoice.bind(null, studentId)}>
                                <input type="hidden" name="ticketId" value={activeSchedulingTicket.id} />
                                <input type="hidden" name="back" value={coordinationActionBackHref} />
                                <button type="submit">{t(lang, "Mark options sent", "标记已发候选时间")}</button>
                              </form>
                            ) : null}
                            {schedulingTicketHref ? (
                              <a
                                href={schedulingTicketHref}
                                style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                              >
                                {t(lang, "Update coordination ticket", "更新排课协调工单")}
                              </a>
                            ) : null}
                          </div>
                        </div>
                          );
                        })()
                      ))}
                    </div>
                  ) : (
                    <div style={{ border: "1px dashed #bfdbfe", borderRadius: 10, padding: 10, background: "#fff", color: "#475569" }}>
                      {t(
                        lang,
                        "No open slots were found in the next two weeks for the selected scope. Keep the coordination ticket open and switch to a special-time request only if the parent insists on a time outside availability.",
                        "接下来两周内没有找到可直接用的 availability 时间。先继续保持排课协调工单打开，只有家长坚持特殊时间时再走例外请求。"
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div style={{ border: "1px solid #fde68a", borderRadius: 12, padding: 12, background: "#fffbeb", display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 800 }}>{t(lang, "Check special time request", "检查家长特殊时间")}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  {t(
                    lang,
                    "Only if the parent's requested time falls outside submitted availability should this go back to the teacher as an exception.",
                    "只有当家长要求的时间不在老师已提交的 availability 里时，才需要回到老师做例外确认。"
                  )}
                </div>
              </div>
              {coordinationTeacherOptions.length > 0 ? (
                <form method="get" action={studentCoordinationHref} style={{ display: "grid", gap: 10 }}>
                  {coordinationPreservedEntries.map(([key, value]) => (
                    <input key={`special:${key}:${value}`} type="hidden" name={key} value={value} />
                  ))}
                  <input type="hidden" name="coordCheckSpecial" value="1" />
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Requested time", "家长想要的时间")}</label>
                    <input
                      type="datetime-local"
                      name="coordSpecialStartAt"
                      defaultValue={coordSpecialStartAt || `${coordDate}T18:00`}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Duration", "时长")}</label>
                    <input type="number" min={15} step={15} name="coordSpecialDurationMin" defaultValue={effectiveSpecialDurationMin} />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Teacher scope", "老师范围")}</label>
                    <select name="coordTeacherId" defaultValue={effectiveCoordTeacherId}>
                      <option value="">{t(lang, "All matched teachers", "全部匹配老师")}</option>
                      {coordinationTeacherOptions.map((option) => (
                        <option key={`special-${option.teacherId}`} value={option.teacherId}>
                          {option.teacherName}
                          {option.subjectLabel ? ` | ${option.subjectLabel}` : ""}
                          {option.assigned ? ` | ${t(lang, "Assigned", "当前老师")}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit">{t(lang, "Check request", "检查请求")}</button>
                    <a
                      href={coordinationWorkspaceClearHref}
                      style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                    >
                      {t(lang, "Clear helper", "清除辅助")}
                    </a>
                  </div>
                </form>
              ) : null}
              {coordCheckSpecial && effectiveSpecialStartAt ? (
                specialRequestCheck?.matches?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ border: "1px solid #bbf7d0", borderRadius: 10, padding: 10, background: "#fff" }}>
                      <div style={{ fontWeight: 800, color: "#166534" }}>
                        {t(lang, "This request matches submitted availability", "这个时间命中了老师已提交的 availability")}
                      </div>
                    </div>
                    {specialRequestCheck.matches.map((slot) => {
                      const slotDefaults = coordinationSlotDefaultsByTeacher.get(slot.teacherId);
                      const quickScheduleReady = Boolean(slotDefaults?.subjectId && slotDefaults?.campusId);
                      return (
                        <div key={`match-${slot.slotKey}`} style={{ border: "1px solid #bbf7d0", borderRadius: 12, padding: 12, background: "#fff", display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontWeight: 800 }}>
                                {formatBusinessDateOnly(slot.startAt)} {formatBusinessTimeOnly(slot.startAt)}-{formatBusinessTimeOnly(slot.endAt)}
                              </div>
                              <div style={{ color: "#475569" }}>
                                {slot.teacherName}
                                {slot.teacherSubjectLabel ? ` | ${slot.teacherSubjectLabel}` : ""}
                              </div>
                            </div>
                            <div
                              style={{
                                padding: "4px 8px",
                                borderRadius: 999,
                                background: "#dcfce7",
                                color: "#166534",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {t(lang, "Ready to schedule", "可以直接排课")}
                            </div>
                          </div>
                          {!quickScheduleReady ? (
                            <div style={{ color: "#b45309", fontSize: 12 }}>
                              {t(lang, "This match is real, but campus or subject still needs one more confirmation in Quick Schedule.", "这个匹配时间真实可用，但校区或科目还需要在排课弹窗里再确认一次。")}
                            </div>
                          ) : null}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <a
                              href={buildQuickScheduleHrefForCoordinationSlot(slot)}
                              style={{ padding: "8px 12px", borderRadius: 10, background: "#16a34a", color: "#fff", textDecoration: "none", fontWeight: 700 }}
                            >
                              {t(lang, "Schedule this requested time", "用这个家长要求时间去排课")}
                            </a>
                            <CopyTextButton
                              text={buildSchedulingCoordinationSlotShareText(slot, "match")}
                              label={t(lang, "Copy message", "复制发送文案")}
                              copiedLabel={t(lang, "Copied", "已复制")}
                            />
                            {activeSchedulingTicket && activeSchedulingTicket.status !== "Waiting Parent" ? (
                              <form action={markSchedulingCoordinationParentChoice.bind(null, studentId)}>
                                <input type="hidden" name="ticketId" value={activeSchedulingTicket.id} />
                                <input type="hidden" name="back" value={coordinationActionBackHref} />
                                <button type="submit">{t(lang, "Mark options sent", "标记已发候选时间")}</button>
                              </form>
                            ) : null}
                            {schedulingTicketHref ? (
                              <a
                                href={schedulingTicketHref}
                                style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                              >
                                {t(lang, "Update coordination ticket", "更新排课协调工单")}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ border: "1px solid #fed7aa", borderRadius: 10, padding: 10, background: "#fff" }}>
                      <div style={{ fontWeight: 800, color: "#b45309" }}>
                        {t(lang, "This request does not match current availability", "这个时间不在当前 availability 里")}
                      </div>
                      <div style={{ color: "#475569", marginTop: 4 }}>
                        {t(
                          lang,
                          "Keep the coordination ticket open, record the parent's special request, and only then ask the teacher for an exception.",
                          "请继续保留排课协调工单，先记录家长的特殊时间，再按例外流程回到老师确认。"
                        )}
                      </div>
                    </div>
                    {specialRequestCheck?.alternatives?.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Nearest availability-backed alternatives", "最近的 availability 替代时间")}</div>
                        {specialRequestCheck.alternatives.map((slot) => (
                          (() => {
                            const slotDefaults = coordinationSlotDefaultsByTeacher.get(slot.teacherId);
                            const quickScheduleReady = Boolean(slotDefaults?.subjectId && slotDefaults?.campusId);
                            return (
                          <div
                            key={`alt-${slot.slotKey}`}
                            style={{ border: "1px solid #fde68a", borderRadius: 12, padding: 12, background: "#fff", display: "grid", gap: 8 }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                              <div style={{ display: "grid", gap: 4 }}>
                                <div style={{ fontWeight: 800 }}>
                                  {formatBusinessDateOnly(slot.startAt)} {formatBusinessTimeOnly(slot.startAt)}-{formatBusinessTimeOnly(slot.endAt)}
                                </div>
                                <div style={{ color: "#475569" }}>
                                  {slot.teacherName}
                                  {slot.teacherSubjectLabel ? ` | ${slot.teacherSubjectLabel}` : ""}
                                </div>
                              </div>
                              <div
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {t(lang, "Nearest alternative", "最近替代时间")}
                              </div>
                            </div>
                            {!quickScheduleReady ? (
                              <div style={{ color: "#b45309", fontSize: 12 }}>
                                {t(lang, "This alternative can open Quick Schedule directly, but campus or subject still needs one more confirmation.", "这个替代时间可以直接打开排课弹窗，但校区或科目还需要再确认一次。")}
                              </div>
                            ) : null}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <a
                                href={buildQuickScheduleHrefForCoordinationSlot(slot)}
                                style={{ padding: "8px 12px", borderRadius: 10, background: "#2563eb", color: "#fff", textDecoration: "none", fontWeight: 700 }}
                              >
                                {t(lang, "Use this instead", "改用这个时间排课")}
                              </a>
                              <CopyTextButton
                                text={buildSchedulingCoordinationSlotShareText(slot, "alternative")}
                                label={t(lang, "Copy message", "复制发送文案")}
                                copiedLabel={t(lang, "Copied", "已复制")}
                              />
                              {activeSchedulingTicket && activeSchedulingTicket.status !== "Waiting Parent" ? (
                                <form action={markSchedulingCoordinationParentChoice.bind(null, studentId)}>
                                  <input type="hidden" name="ticketId" value={activeSchedulingTicket.id} />
                                  <input type="hidden" name="back" value={coordinationActionBackHref} />
                                  <button type="submit">{t(lang, "Mark alternatives sent", "标记已发替代时间")}</button>
                                </form>
                              ) : null}
                              {activeSchedulingTicket && activeSchedulingTicket.status !== "Waiting Teacher" && activeSchedulingTicket.status !== "Exception" ? (
                                <form action={markSchedulingCoordinationTeacherException.bind(null, studentId)}>
                                  <input type="hidden" name="ticketId" value={activeSchedulingTicket.id} />
                                  <input type="hidden" name="back" value={coordinationActionBackHref} />
                                  <button type="submit">{t(lang, "Ask teacher exception", "转老师例外确认")}</button>
                                </form>
                              ) : null}
                              {schedulingTicketHref ? (
                                <a
                                  href={schedulingTicketHref}
                                  style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none" }}
                                >
                                  {t(lang, "Record in ticket", "回工单记录")}
                                </a>
                              ) : null}
                            </div>
                          </div>
                            );
                          })()
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
        ) : (
          <div
            id="scheduling-coordination"
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 14,
              background: "#f8fafc",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 800 }}>{t(lang, "Scheduling coordination", "排课协调")}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  {t(lang, "The full coordination workspace now lives on its own page so this student detail view stays cleaner.", "完整的排课协调工作台现在已经挪到独立页面，这个学生详情页会更清爽。")}
                </div>
              </div>
              <a
                href={studentCoordinationHref}
                style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", textDecoration: "none", color: "inherit", fontWeight: 700 }}
              >
                {t(lang, "Open coordination workspace", "打开排课协调工作台")}
              </a>
            </div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Open lanes", "打开中的协调分道")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{openSchedulingTickets.length}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {openSchedulingTickets.length > 0
                    ? t(lang, "Open the workspace to switch between course tickets and helper tools.", "打开工作台后可以在不同课程工单和辅助工具之间切换。")
                    : t(lang, "No active coordination ticket yet.", "目前还没有活跃的排课协调工单。")}
                </div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Current phase", "当前阶段")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{schedulingCoordinationPhase?.title ?? t(lang, "No active ticket", "暂无活跃工单")}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {activeSchedulingTicket ? schedulingCoordinationPhase?.nextStep ?? "-" : t(lang, "Create or reopen a coordination lane only when timing still needs follow-up.", "只有在时间仍需继续跟进时，才新建或重新打开协调分道。")}
                </div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Latest parent submission", "最近家长提交")}</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>
                  {parentAvailabilityRequest?.submittedAt ? formatBusinessDateTime(parentAvailabilityRequest.submittedAt) : t(lang, "No submission yet", "还没有提交")}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {parentAvailabilityRows.length > 0
                    ? parentAvailabilityRows[0]?.value ?? "-"
                    : t(lang, "Open the workspace for the full parent submission and helper tools.", "打开工作台可查看完整家长提交内容和辅助工具。")}
                </div>
              </div>
            </div>
          </div>
        )}

        {!coordinationOnly ? (
        <>
        <details id="calendar-tools" open={Boolean(quickOpen || calendarOpen)} style={{ marginBottom: 14 }}>
            <summary style={{ fontWeight: 700 }}>{t(lang, "Planning tools & calendar", "排课工具与日历")}</summary>
            <div
              style={{
                margin: "6px 0 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                background: "#f8fafc",
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
        <a
          href={buildStudentDetailHref(
            studentId,
            new URLSearchParams({ month: monthLabel(prevMonth), calendarOpen: "1" }),
            "#calendar-tools",
            "#calendar-tools"
          )}
        >
          &lt;&lt; {tl(lang, "Prev Month")}
        </a>
        <b>{monthLabel(monthDate)}</b>
        <a
          href={buildStudentDetailHref(
            studentId,
            new URLSearchParams({ month: monthLabel(nextMonth), calendarOpen: "1" }),
            "#calendar-tools",
            "#calendar-tools"
          )}
        >
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
                const link = buildStudentDetailHref(studentId, params, "#quick-schedule", "#quick-schedule");
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
                      const teacherChange = latestTeacherChangeMap.get(s.id);
                      const cancelled = att?.status === "EXCUSED";
                      return (
                        <div
                          key={s.id}
                          data-session-ui={s.id}
                          style={{
                            fontSize: 12,
                            color: cancelled ? "#888" : "#555",
                            lineHeight: 1.3,
                            marginBottom: 6,
                            opacity: cancelled ? 0.7 : 1,
                          }}
                        >
                          <div
                            data-session-strike="1"
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
                            <span
                              data-session-cancel-suffix="1"
                              style={{ display: cancelled ? "inline" : "none" }}
                            >
                              {" "}
                              ({tl(lang, "Cancelled")})
                            </span>
                            {att?.excusedCharge ? ` (${tl(lang, "Charged")})` : ""}
                          </div>
                          <div
                            data-session-strike="1"
                            style={{
                              color: cancelled ? "#888" : "#666",
                              textDecoration: cancelled ? "line-through" : "none",
                            }}
                          >
                            {s.teacher?.name ?? s.class.teacher.name} {s.class.campus.name}
                            {s.class.room ? ` / ${s.class.room.name}` : ""}
                          </div>
                          {teacherChange && teacherChange.fromTeacherId !== teacherChange.toTeacherId ? (
                            <div style={{ color: cancelled ? "#888" : "#9a3412", fontSize: 11, marginTop: 2 }}>
                              {tl(lang, "Change Teacher")}: {teacherChange.fromTeacher.name} -&gt; {teacherChange.toTeacher.name}
                            </div>
                          ) : null}
                          <span
                            data-session-cancel-only="1"
                            style={{
                              display: cancelled ? "inline-block" : "none",
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
                          <div style={{ marginTop: 4 }}>
                            <SessionCancelRestoreClient
                              studentId={studentId}
                              sessionId={s.id}
                              initialCancelled={cancelled}
                              initialCharge={Boolean(att?.excusedCharge)}
                              variant="compact"
                              labels={{
                                cancel: tl(lang, "Cancel"),
                                restore: tl(lang, "Restore"),
                                restoreConfirm: tl(lang, "Restore this session?"),
                                delete: tl(lang, "Delete Session"),
                                deleteConfirm: tl(lang, "Delete this session? This cannot be undone."),
                                charge: tl(lang, "Charge"),
                                note: tl(lang, "Note"),
                              }}
                              returnHash="#calendar-tools"
                            />
                          </div>
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

      <details id="enrollments" open={enrollmentsOpen} style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Enrollments")} ({enrollments.length})</summary>
      {sectionReturnBar(lang, {
        hint: t(lang, "Use enrollments to confirm the current teaching container before changing packages or future sessions.", "先在这里确认当前报名归属，再决定是否去改课包或未来课次。"),
        links: [
          { href: "#packages", label: tl(lang, "Packages") },
          { href: "#upcoming-sessions", label: tl(lang, "Upcoming Sessions") },
        ],
      })}
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

      <details id="packages" open={packagesOpen} style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Packages")} ({packageCount})</summary>
      {sectionReturnBar(lang, {
        hint: t(lang, "Package balance and payment status usually decide whether the next step should be billing follow-up or schedule work.", "课包余额和付款状态通常决定下一步该先走账务跟进还是排课处理。"),
        links: [
          { href: "#attendance", label: tl(lang, "Attendance") },
          { href: "#quick-schedule", label: tl(lang, "Quick Schedule") },
        ],
      })}
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
                  {tl(lang, "Type")}: {p.type} | {tl(lang, "Status")}: {p.status} | {t(lang, "Invoice gate", "发票闸门")}: {packageFinanceGateLabelZh(p.financeGateStatus)}
                </div>
                {p.financeGateReason ? (
                  <div style={{ color: "#92400e", fontSize: 12, marginTop: 4 }}>{p.financeGateReason}</div>
                ) : null}
                {p.contracts[0] ? (
                  <div style={{ color: "#1d4ed8", fontSize: 12, marginTop: 4 }}>
                    {t(lang, "Contract", "合同")}: {studentContractStatusLabelZh(p.contracts[0].status)}
                    {p.contracts[0].signedAt ? ` · ${formatBusinessDateTime(new Date(p.contracts[0].signedAt))}` : ""}
                    {" · "}
                    <a href={`/admin/packages/${encodeURIComponent(p.id)}/billing#contract-flow`}>
                      {t(lang, "Open contract workspace", "打开合同工作区")}
                    </a>
                  </div>
                ) : (
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                    {t(lang, "Contract", "合同")}: {t(lang, "Not started", "尚未开始")}
                    {" · "}
                    <a href={`/admin/packages/${encodeURIComponent(p.id)}/billing#contract-flow`}>
                      {t(lang, "Create from package billing", "去课包账单页创建")}
                    </a>
                  </div>
                )}
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
                  {tl(lang, "Valid")}: {formatBusinessDateOnly(new Date(p.validFrom))} ~ {p.validTo ? formatBusinessDateOnly(new Date(p.validTo)) : "(open)"}
                </div>
                <div style={{ marginTop: 4 }}>
                  {tl(lang, "Paid")}: {p.paid ? tl(lang, "Yes") : tl(lang, "No")} | {tl(lang, "Paid At")}: {p.paidAt ? formatBusinessDateTime(new Date(p.paidAt)) : "-"}
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

      <details id="attendance" open={attendanceOpen} style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Attendance")} ({attendances.length})</summary>
      {sectionReturnBar(lang, {
        hint: t(lang, "After checking recent attendance, jump straight into upcoming sessions or planning if you need to fix the next lesson.", "看完近期点名后，如果要调整下一节课，可直接跳到即将上课或排课工具。"),
        links: [
          { href: "#upcoming-sessions", label: tl(lang, "Upcoming Sessions") },
          { href: "#quick-schedule", label: tl(lang, "Quick Schedule") },
        ],
      })}
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
        returnHash="#attendance"
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
                  {formatBusinessDateTime(new Date(a.session.startAt))} - {formatBusinessTimeOnly(new Date(a.session.endAt))}
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
                    {a.session.class.level ? ` / ${a.session.class.level.name}` : ""} |{" "}
                    {a.session.teacher?.name ?? a.session.class.teacher.name}
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
              <div style={{ marginTop: 4, color: a.session.feedbacks.length > 0 ? "#027a48" : "#b45309", fontWeight: 700 }}>
                {tl(lang, "Feedback")}: {a.session.feedbacks.length > 0 ? tl(lang, "Submitted") : tl(lang, "Missing")}
              </div>
            </div>
          ))}
        </div>
      )}
      </details>

      <details id="upcoming-sessions" open style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Upcoming Sessions")} ({upcomingSessions.length})</summary>
      {sectionReturnBar(lang, {
        hint: t(lang, "Use this section for the next real lesson, then return to the workbench bar if you need packages, attendance, or edit tools.", "这里适合处理下一节真实课次；如果还要看课包、点名或学生资料，就从这里回到工作条。"),
        links: [
          { href: "#packages", label: tl(lang, "Packages") },
          { href: "#edit-student", label: tl(lang, "Edit Student") },
        ],
      })}
      {upcomingSessions.length === 0 ? (
        <div style={{ color: "#999" }}>{tl(lang, "No upcoming sessions.")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginTop: 8 }}>
          {upcomingSessions.map((s) => {
            const att = upcomingAttendanceMap.get(s.id);
            const teacherChange = latestTeacherChangeMap.get(s.id);
            const cancelled = att?.status === "EXCUSED";
            return (
              <div key={s.id} data-session-ui={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700 }}>
                  {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span
                    data-session-status-pill="1"
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
                    <span
                      data-session-status-text="1"
                      data-cancelled-text={tl(lang, "Cancelled")}
                      data-active-text={tl(lang, "Scheduled")}
                    >
                      {cancelled ? tl(lang, "Cancelled") : tl(lang, "Scheduled")}
                    </span>
                  </span>
                </div>
                <div data-session-strike="1" style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={s.class.capacity} compact />
                    <span>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}{" "}
                      {s.class.level ? ` / ${s.class.level.name}` : ""} | {s.teacher?.name ?? s.class.teacher.name} |{" "}
                      {s.class.campus.name}
                      {s.class.room ? ` / ${s.class.room.name}` : ""}
                    </span>
                  </span>
                </div>
                <div data-session-strike="1" style={{ marginTop: 6, color: cancelled ? "#b00" : "#555", fontWeight: cancelled ? 700 : 400 }}>
                  <span
                    data-session-status-text="1"
                    data-cancelled-text={tl(lang, "Cancelled")}
                    data-active-text={tl(lang, "Scheduled")}
                  >
                    {cancelled ? tl(lang, "Cancelled") : tl(lang, "Scheduled")}
                  </span>
                  {att?.excusedCharge ? ` (${tl(lang, "Charged")})` : ""}
                </div>
                {teacherChange && teacherChange.fromTeacherId !== teacherChange.toTeacherId ? (
                  <div style={{ marginTop: 4, color: "#9a3412", fontSize: 12 }}>
                    {tl(lang, "Change Teacher")}: {teacherChange.fromTeacher.name} -&gt; {teacherChange.toTeacher.name}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <SessionReplaceTeacherClient
                      studentId={studentId}
                      sessionId={s.id}
                      teachers={teachers
                        .filter((tch) => canTeachSubject(tch, s.class.subjectId))
                        .map((tch) => ({ id: tch.id, name: tch.name }))}
                      labels={{
                        changeTeacher: tl(lang, "Change Teacher"),
                        selectTeacher: tl(lang, "Select teacher"),
                        reasonOptional: tl(lang, "Reason (optional)"),
                        replaceTeacher: tl(lang, "Replace Teacher"),
                        ok: tl(lang, "OK"),
                        error: tl(lang, "Error"),
                      }}
                      returnHash="#upcoming-sessions"
                    />
                  <a
                    href={buildStudentDetailHref(
                      studentId,
                      new URLSearchParams({
                        month: monthLabel(monthDate),
                        quickOpen: "1",
                        quickStartAt: fmtDatetimeLocal(new Date(s.startAt)),
                        quickDurationMin: String(Math.max(15, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000))),
                        quickCampusId: s.class.campusId,
                        quickRoomId: s.class.roomId ?? "",
                        quickSubjectId: s.class.subjectId ?? "",
                        quickLevelId: s.class.levelId ?? "",
                      }),
                      "#quick-schedule",
                      "#quick-schedule"
                    )}
                  >
                    {tl(lang, "Change Course")}
                  </a>
                </div>
                <div style={{ marginTop: 6 }}>
                  <SessionCancelRestoreClient
                    studentId={studentId}
                    sessionId={s.id}
                    initialCancelled={cancelled}
                    initialCharge={Boolean(att?.excusedCharge)}
                    variant="full"
                    labels={{
                      cancel: tl(lang, "Cancel"),
                      restore: tl(lang, "Restore"),
                      restoreConfirm: tl(lang, "Restore this session?"),
                      delete: tl(lang, "Delete Session"),
                      deleteConfirm: tl(lang, "Delete this session? This cannot be undone."),
                      charge: tl(lang, "Charge"),
                      note: tl(lang, "Note"),
                    }}
                    returnHash="#upcoming-sessions"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </details>

      <details open id="quick-schedule" style={{ marginBottom: 14 }}>
        <summary style={{ fontWeight: 700 }}>{tl(lang, "Quick Schedule (by Student Time)")}</summary>
        {sectionReturnBar(lang, {
          hint: t(lang, "Finish planning here, then jump back to upcoming sessions or packages instead of rescanning the whole student page.", "在这里完成排课后，可直接跳回即将上课或课包区，不用重新扫完整个学生页。"),
          links: [
            { href: "#upcoming-sessions", label: tl(lang, "Upcoming Sessions") },
            { href: "#packages", label: tl(lang, "Packages") },
          ],
        })}
        <QuickScheduleModal
          studentId={studentId}
          month={monthLabel(monthDate)}
          quickSubjectId={quickSubjectId}
          quickLevelId={quickLevelId}
          quickStartAt={quickStartAt}
          quickDurationMin={quickDurationMin}
          quickCampusId={quickCampusId}
          quickRoomId={quickRoomId}
          quickTeacherId={quickTeacherId}
          openOnLoad={quickOpen || focus === "quick-schedule"}
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
          campuses={campuses.map((c) => ({ id: c.id, name: c.name, isOnline: c.isOnline, requiresRoom: c.requiresRoom }))}
          rooms={rooms.map((r) => ({ id: r.id, name: `${r.name} (${r.campus.name})`, campusId: r.campusId }))}
          candidates={quickCandidates}
          sessionOptions={quickRescheduleSessionOptions}
          scheduleUrl={`/api/admin/students/${encodeURIComponent(studentId)}/quick-appointment`}
          returnHash="#quick-schedule"
          warning={quickPackageWarn}
          labels={{
            title: tl(lang, "Quick Schedule"),
            open: tl(lang, "Open Modal"),
            mode: tl(lang, "Mode"),
            modeCreate: tl(lang, "Create New Sessions"),
            modeReschedule: tl(lang, "Reschedule Existing Session"),
            course: tl(lang, "Course"),
            subject: tl(lang, "Subject"),
            level: tl(lang, "Level (optional)"),
            campus: tl(lang, "Campus"),
            room: tl(lang, "Room"),
            roomOptional: tl(lang, "optional"),
            start: tl(lang, "Start"),
            newStart: tl(lang, "New Start"),
            duration: tl(lang, "Duration (minutes)"),
            newDuration: tl(lang, "New Duration (minutes)"),
            find: tl(lang, "Find Available Teachers"),
            close: tl(lang, "Close"),
            teacher: tl(lang, "Teacher"),
            status: tl(lang, "Status"),
            action: tl(lang, "Action"),
            available: tl(lang, "Available"),
            preview: tl(lang, "Preview"),
            previewTitle: tl(lang, "Preview Result"),
            repeatWeeks: tl(lang, "Repeat Weeks"),
            onConflict: tl(lang, "On Conflict"),
            rejectImmediately: tl(lang, "Reject Immediately"),
            skipConflicts: tl(lang, "Skip Conflicts"),
            targetSession: tl(lang, "Target Session"),
            targetScope: tl(lang, "Reschedule Scope"),
            thisSessionOnly: tl(lang, "This Session Only"),
            futureSessions: tl(lang, "This + Future Sessions"),
            noTeachers: tl(lang, "No eligible teachers found."),
            chooseHint: tl(lang, "Choose subject, campus, room and time to match teachers."),
            schedule: tl(lang, "Schedule"),
            roomRequiredOffline: tl(lang, "Room is required for this campus."),
          }}
        />
      </details>

      <div id="edit-student" style={{ display: "grid", gap: 8 }}>
        {sectionReturnBar(lang, {
          hint: t(lang, "Use student editing after you finish queue work, then jump back to packages or attendance if needed.", "建议在队列型工作处理完后再编辑学生资料，改完可直接回课包或点名。"),
          links: [
            { href: "#packages", label: tl(lang, "Packages") },
            { href: "#attendance", label: tl(lang, "Attendance") },
          ],
        })}
        <StudentEditClient
          studentId={studentId}
          initial={{
            name: student.name,
            school: student.school ?? "",
            grade: student.grade ?? "",
            birthDate: fmtDateInput(student.birthDate),
            sourceChannelId: student.sourceChannelId ?? "",
            studentTypeId: student.studentTypeId ?? "",
            note: student.note ?? "",
          }}
          sources={sources.map((s) => ({ id: s.id, name: s.name }))}
          types={types.map((t) => ({ id: t.id, name: t.name }))}
          gradeOptions={GRADE_OPTIONS}
          initialOpen={editStudentOpen}
          labels={{
            title: tl(lang, "Edit Student"),
            name: tl(lang, "Name"),
            school: tl(lang, "School"),
            grade: tl(lang, "Grade"),
            birthDate: tl(lang, "Birth Date"),
            source: tl(lang, "Source"),
            type: tl(lang, "Type"),
            notes: tl(lang, "Notes"),
            save: tl(lang, "Save"),
            deleteStudent: tl(lang, "Delete Student"),
            deleteConfirm: tl(lang, "Delete student? This also deletes enrollments/appointments/packages."),
            ok: tl(lang, "OK"),
            error: tl(lang, "Error"),
          }}
          returnHash="#edit-student"
        />
      </div>
      </>
      ) : null}
      </div>
    </div>
  );
}

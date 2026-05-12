import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly, parseBusinessDateStart } from "@/lib/date-only";

const ATTENDED_STATUSES = ["PRESENT", "LATE"] as const;

export type IndividualStudentUtilityPeriodType = "weekly" | "monthly";

export type IndividualStudentUtilityRange = {
  periodType: IndividualStudentUtilityPeriodType;
  startDate: string;
  endDate: string;
  start: Date;
  endExclusive: Date;
  label: string;
};

export type IndividualStudentUtilityDetailRow = {
  attendanceId: string;
  studentId: string;
  studentName: string;
  studentType: string;
  sourceChannel: string;
  courseName: string;
  subjectName: string;
  levelName: string;
  teacherName: string;
  sessionDate: string;
  sessionStart: string;
  sessionEnd: string;
  attendanceStatus: string;
  deductedMinutes: number;
  deductedHours: number;
  packageId: string;
  packageStatus: string;
  packageRemainingMinutes: number | null;
  packageRemainingHours: number | null;
  packageSettlementMode: string;
};

export type IndividualStudentUtilitySummaryRow = {
  studentId: string;
  studentName: string;
  studentType: string;
  sourceChannel: string;
  lessonCount: number;
  totalDeductedMinutes: number;
  totalDeductedHours: number;
  coursesUsed: string;
  latestLessonDate: string;
  currentRemainingMinutes: number;
  currentRemainingHours: number;
};

export type IndividualStudentUtilityReport = {
  range: IndividualStudentUtilityRange;
  detailRows: IndividualStudentUtilityDetailRow[];
  summaryRows: IndividualStudentUtilitySummaryRow[];
  totalStudents: number;
  totalLessons: number;
  totalDeductedMinutes: number;
  totalDeductedHours: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function monthStartEnd(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return null;
  const startDate = `${year}-${pad2(monthNum)}-01`;
  const end = new Date(Date.UTC(year, monthNum, 0, 12, 0, 0, 0));
  const endDate = `${end.getUTCFullYear()}-${pad2(end.getUTCMonth() + 1)}-${pad2(end.getUTCDate())}`;
  return { startDate, endDate };
}

function addBusinessDays(dateOnly: string, days: number) {
  const start = parseBusinessDateStart(dateOnly);
  if (!start) return null;
  const shifted = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return formatBusinessDateOnly(shifted);
}

function resolveDateRange(input: {
  periodType?: string | null;
  month?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): IndividualStudentUtilityRange | null {
  const periodType: IndividualStudentUtilityPeriodType = input.periodType === "weekly" ? "weekly" : "monthly";
  const today = formatBusinessDateOnly(new Date());

  let startDate = String(input.startDate ?? "").trim();
  let endDate = String(input.endDate ?? "").trim();

  if (periodType === "monthly") {
    const month = String(input.month ?? today.slice(0, 7)).trim();
    const range = monthStartEnd(month);
    if (!range) return null;
    startDate = range.startDate;
    endDate = range.endDate;
  } else {
    if (!endDate) endDate = today;
    if (!startDate) startDate = addBusinessDays(endDate, -6) ?? "";
  }

  const start = parseBusinessDateStart(startDate);
  const endStart = parseBusinessDateStart(endDate);
  if (!start || !endStart || start.getTime() > endStart.getTime()) return null;

  const endExclusive = new Date(endStart.getTime() + 24 * 60 * 60 * 1000);
  return {
    periodType,
    startDate,
    endDate,
    start,
    endExclusive,
    label: `${startDate} to ${endDate}`,
  };
}

export function resolveIndividualStudentUtilityRange(input: {
  periodType?: string | null;
  month?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  return resolveDateRange(input);
}

export function minutesToHours(minutes: number | null | undefined) {
  return Number(((minutes ?? 0) / 60).toFixed(2));
}

export async function loadIndividualStudentUtilityReport(input: {
  periodType?: string | null;
  month?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<IndividualStudentUtilityReport | null> {
  const range = resolveDateRange(input);
  if (!range) return null;

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      status: { in: ATTENDED_STATUSES as any },
      deductedMinutes: { gt: 0 },
      session: {
        startAt: { gte: range.start, lt: range.endExclusive },
      },
      student: {
        studentType: {
          OR: [
            { name: { contains: "自己学生" } },
            { name: { contains: "直客学生" } },
            { name: { contains: "own", mode: "insensitive" } },
            { name: { contains: "self", mode: "insensitive" } },
          ],
        },
      },
    },
    include: {
      student: { include: { studentType: true, sourceChannel: true } },
      package: true,
      session: {
        include: {
          teacher: true,
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              teacher: true,
            },
          },
        },
      },
    },
    orderBy: [{ session: { startAt: "asc" } }, { student: { name: "asc" } }],
    take: 20000,
  });

  const studentIds = Array.from(new Set(attendanceRows.map((row) => row.studentId)));
  const activePackages = studentIds.length
    ? await prisma.coursePackage.findMany({
        where: {
          studentId: { in: studentIds },
          type: "HOURS",
          status: "ACTIVE",
          remainingMinutes: { gt: 0 },
        },
        select: { studentId: true, remainingMinutes: true },
      })
    : [];
  const currentRemainingByStudent = new Map<string, number>();
  for (const pkg of activePackages) {
    currentRemainingByStudent.set(pkg.studentId, (currentRemainingByStudent.get(pkg.studentId) ?? 0) + (pkg.remainingMinutes ?? 0));
  }

  const detailRows: IndividualStudentUtilityDetailRow[] = attendanceRows.map((row) => {
    const teacher = row.session.teacher ?? row.session.class.teacher;
    const startAt = new Date(row.session.startAt);
    const endAt = new Date(row.session.endAt);
    return {
      attendanceId: row.id,
      studentId: row.studentId,
      studentName: row.student.name,
      studentType: row.student.studentType?.name ?? "",
      sourceChannel: row.student.sourceChannel?.name ?? "",
      courseName: row.session.class.course.name,
      subjectName: row.session.class.subject?.name ?? "",
      levelName: row.session.class.level?.name ?? "",
      teacherName: teacher?.name ?? "",
      sessionDate: formatBusinessDateOnly(startAt),
      sessionStart: formatBusinessTimeOnly(startAt),
      sessionEnd: formatBusinessTimeOnly(endAt),
      attendanceStatus: row.status,
      deductedMinutes: row.deductedMinutes ?? 0,
      deductedHours: minutesToHours(row.deductedMinutes ?? 0),
      packageId: row.packageId ?? "",
      packageStatus: row.package?.status ?? "",
      packageRemainingMinutes: row.package?.remainingMinutes ?? null,
      packageRemainingHours: row.package ? minutesToHours(row.package.remainingMinutes ?? 0) : null,
      packageSettlementMode: row.package?.settlementMode ?? "",
    };
  });

  const summaryMap = new Map<string, {
    studentId: string;
    studentName: string;
    studentType: string;
    sourceChannel: string;
    lessonCount: number;
    totalDeductedMinutes: number;
    coursesUsed: Set<string>;
    latestLessonDate: string;
  }>();
  for (const row of detailRows) {
    const current = summaryMap.get(row.studentId) ?? {
      studentId: row.studentId,
      studentName: row.studentName,
      studentType: row.studentType,
      sourceChannel: row.sourceChannel,
      lessonCount: 0,
      totalDeductedMinutes: 0,
      coursesUsed: new Set<string>(),
      latestLessonDate: "",
    };
    current.lessonCount += 1;
    current.totalDeductedMinutes += row.deductedMinutes;
    if (row.courseName) current.coursesUsed.add(row.courseName);
    if (!current.latestLessonDate || row.sessionDate > current.latestLessonDate) current.latestLessonDate = row.sessionDate;
    summaryMap.set(row.studentId, current);
  }

  const summaryRows = Array.from(summaryMap.values())
    .map((row) => {
      const currentRemainingMinutes = currentRemainingByStudent.get(row.studentId) ?? 0;
      return {
        studentId: row.studentId,
        studentName: row.studentName,
        studentType: row.studentType,
        sourceChannel: row.sourceChannel,
        lessonCount: row.lessonCount,
        totalDeductedMinutes: row.totalDeductedMinutes,
        totalDeductedHours: minutesToHours(row.totalDeductedMinutes),
        coursesUsed: Array.from(row.coursesUsed).sort().join(", "),
        latestLessonDate: row.latestLessonDate,
        currentRemainingMinutes,
        currentRemainingHours: minutesToHours(currentRemainingMinutes),
      };
    })
    .sort((a, b) => b.totalDeductedMinutes - a.totalDeductedMinutes || a.studentName.localeCompare(b.studentName));

  const totalDeductedMinutes = detailRows.reduce((sum, row) => sum + row.deductedMinutes, 0);
  return {
    range,
    detailRows,
    summaryRows,
    totalStudents: summaryRows.length,
    totalLessons: detailRows.length,
    totalDeductedMinutes,
    totalDeductedHours: minutesToHours(totalDeductedMinutes),
  };
}

export function defaultIndividualStudentUtilityMonth() {
  return formatBusinessDateOnly(new Date()).slice(0, 7);
}

export function defaultIndividualStudentUtilityWeek() {
  const endDate = formatBusinessDateOnly(new Date());
  return {
    startDate: addBusinessDays(endDate, -6) ?? endDate,
    endDate,
  };
}

export function generatedAtLabel() {
  return formatBusinessDateTime(new Date(), true);
}

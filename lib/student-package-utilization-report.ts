import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly, parseBusinessDateStart } from "@/lib/date-only";

const ATTENDED_STATUSES = ["PRESENT", "LATE"] as const;

export type StudentPackageUtilizationCandidate = {
  studentId: string;
  name: string;
  grade: string | null;
  school: string | null;
};

export type StudentPackageUtilizationPackageOption = {
  packageId: string;
  ownerName: string;
  courseName: string;
  status: string;
  totalHours: number | null;
  remainingHours: number | null;
  sharedWith: string;
};

export type StudentPackageUtilizationDetailRow = {
  attendanceId: string;
  sessionId: string;
  packageId: string;
  packageOwnerName: string;
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
};

export type StudentPackageUtilizationReport = {
  ok: boolean;
  needDisambiguation: boolean;
  message: string | null;
  query: {
    studentId: string | null;
    studentName: string | null;
    packageId: string | null;
    startDate: string | null;
    endDate: string;
  };
  student: StudentPackageUtilizationCandidate | null;
  candidates: StudentPackageUtilizationCandidate[];
  packageOptions: StudentPackageUtilizationPackageOption[];
  detailRows: StudentPackageUtilizationDetailRow[];
  lessonCount: number;
  totalDeductedMinutes: number;
  totalDeductedHours: number;
  generatedAt: string;
};

export function utilizationMinutesToHours(minutes: number | null | undefined) {
  return Number(((minutes ?? 0) / 60).toFixed(2));
}

function normalizeDateInput(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function resolveEndDate(value: string | null | undefined) {
  const raw = normalizeDateInput(value);
  return raw || formatBusinessDateOnly(new Date());
}

function candidateFromStudent(row: { id: string; name: string; grade: string | null; school: string | null }) {
  return {
    studentId: row.id,
    name: row.name,
    grade: row.grade ?? null,
    school: row.school ?? null,
  };
}

async function resolveStudent(input: { studentId?: string | null; studentName?: string | null }) {
  const studentId = String(input.studentId ?? "").trim();
  const studentName = String(input.studentName ?? "").trim();

  if (studentId) {
    const row = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, school: true },
    });
    return {
      student: row ? candidateFromStudent(row) : null,
      candidates: row ? [candidateFromStudent(row)] : [],
      needDisambiguation: false,
      message: row ? null : "Student not found",
    };
  }

  if (!studentName) {
    return { student: null, candidates: [], needDisambiguation: false, message: "Missing student name or student ID" };
  }

  const exact = await prisma.student.findMany({
    where: { name: { equals: studentName, mode: "insensitive" } },
    take: 10,
    orderBy: { name: "asc" },
    select: { id: true, name: true, grade: true, school: true },
  });
  const rows =
    exact.length > 0
      ? exact
      : await prisma.student.findMany({
          where: { name: { contains: studentName, mode: "insensitive" } },
          take: 10,
          orderBy: { name: "asc" },
          select: { id: true, name: true, grade: true, school: true },
        });

  const candidates = rows.map(candidateFromStudent);
  if (candidates.length === 0) {
    return { student: null, candidates, needDisambiguation: false, message: "No matching student" };
  }
  if (candidates.length > 1) {
    return { student: null, candidates, needDisambiguation: true, message: "Multiple matching students" };
  }
  return { student: candidates[0] ?? null, candidates, needDisambiguation: false, message: null };
}

async function loadPackageOptions(studentId: string): Promise<StudentPackageUtilizationPackageOption[]> {
  const packages = await prisma.coursePackage.findMany({
    where: {
      OR: [{ studentId }, { sharedStudents: { some: { studentId } } }],
    },
    include: {
      student: { select: { name: true } },
      course: { select: { name: true } },
      sharedStudents: { include: { student: { select: { name: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return packages.map((pkg) => ({
    packageId: pkg.id,
    ownerName: pkg.student.name,
    courseName: pkg.course.name,
    status: pkg.status,
    totalHours: pkg.totalMinutes == null ? null : utilizationMinutesToHours(pkg.totalMinutes),
    remainingHours: pkg.remainingMinutes == null ? null : utilizationMinutesToHours(pkg.remainingMinutes),
    sharedWith: pkg.sharedStudents.map((x) => x.student.name).sort().join(", "),
  }));
}

export async function loadStudentPackageUtilizationReport(input: {
  studentId?: string | null;
  studentName?: string | null;
  packageId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<StudentPackageUtilizationReport> {
  const packageId = String(input.packageId ?? "").trim();
  const startDate = normalizeDateInput(input.startDate);
  const endDate = resolveEndDate(input.endDate);
  const start = startDate ? parseBusinessDateStart(startDate) : null;
  const endStart = parseBusinessDateStart(endDate);

  const base = {
    query: {
      studentId: String(input.studentId ?? "").trim() || null,
      studentName: String(input.studentName ?? "").trim() || null,
      packageId: packageId || null,
      startDate: startDate || null,
      endDate,
    },
    generatedAt: formatBusinessDateTime(new Date(), true),
  };

  if ((startDate && !start) || !endStart || (start && start.getTime() > endStart.getTime())) {
    return {
      ok: false,
      needDisambiguation: false,
      message: "Invalid date range",
      ...base,
      student: null,
      candidates: [],
      packageOptions: [],
      detailRows: [],
      lessonCount: 0,
      totalDeductedMinutes: 0,
      totalDeductedHours: 0,
    };
  }

  const resolved = await resolveStudent(input);
  if (!resolved.student) {
    return {
      ok: !resolved.message || resolved.needDisambiguation,
      needDisambiguation: resolved.needDisambiguation,
      message: resolved.message,
      ...base,
      student: null,
      candidates: resolved.candidates,
      packageOptions: [],
      detailRows: [],
      lessonCount: 0,
      totalDeductedMinutes: 0,
      totalDeductedHours: 0,
    };
  }

  const endExclusive = new Date(endStart.getTime() + 24 * 60 * 60 * 1000);
  const packageOptions = await loadPackageOptions(resolved.student.studentId);
  const rows = await prisma.attendance.findMany({
    where: {
      studentId: resolved.student.studentId,
      status: { in: ATTENDED_STATUSES as any },
      deductedMinutes: { gt: 0 },
      ...(packageId ? { packageId } : { packageId: { not: null } }),
      session: {
        startAt: {
          ...(start ? { gte: start } : {}),
          lt: endExclusive,
        },
      },
    },
    include: {
      package: { include: { student: { select: { name: true } } } },
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
    orderBy: [{ session: { startAt: "asc" } }],
    take: 5000,
  });

  const detailRows = rows.map<StudentPackageUtilizationDetailRow>((row) => {
    const startAt = new Date(row.session.startAt);
    const endAt = new Date(row.session.endAt);
    const teacher = row.session.teacher ?? row.session.class.teacher;
    return {
      attendanceId: row.id,
      sessionId: row.sessionId,
      packageId: row.packageId ?? "",
      packageOwnerName: row.package?.student.name ?? "",
      courseName: row.session.class.course.name,
      subjectName: row.session.class.subject?.name ?? "",
      levelName: row.session.class.level?.name ?? "",
      teacherName: teacher?.name ?? "",
      sessionDate: formatBusinessDateOnly(startAt),
      sessionStart: formatBusinessTimeOnly(startAt),
      sessionEnd: formatBusinessTimeOnly(endAt),
      attendanceStatus: row.status,
      deductedMinutes: row.deductedMinutes ?? 0,
      deductedHours: utilizationMinutesToHours(row.deductedMinutes ?? 0),
    };
  });
  const totalDeductedMinutes = detailRows.reduce((sum, row) => sum + row.deductedMinutes, 0);

  return {
    ok: true,
    needDisambiguation: false,
    message: null,
    ...base,
    student: resolved.student,
    candidates: resolved.candidates,
    packageOptions,
    detailRows,
    lessonCount: detailRows.length,
    totalDeductedMinutes,
    totalDeductedHours: utilizationMinutesToHours(totalDeductedMinutes),
  };
}

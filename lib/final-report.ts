import { prisma } from "@/lib/prisma";

export const FINAL_REPORT_RECOMMENDATIONS = [
  "CONTINUE_CURRENT",
  "MOVE_TO_NEXT_LEVEL",
  "CHANGE_FOCUS",
  "PAUSE_AFTER_COMPLETION",
  "COURSE_COMPLETED",
] as const;

export const FINAL_REPORT_DELIVERY_CHANNELS = [
  "WECHAT",
  "EMAIL",
  "WHATSAPP",
  "PRINTED",
  "OTHER",
] as const;

export const FINAL_REPORT_EXEMPT_REASONS = [
  "TRIAL_ONLY",
  "ASSESSMENT_ONLY",
  "EARLY_WITHDRAWAL",
  "OPS_NOT_REQUIRED",
  "DUPLICATE_ASSIGNMENT",
  "OTHER",
] as const;

export const FINAL_REPORT_SHARE_DURATION_DAYS = [7, 30, 90] as const;

export type FinalReportRecommendation = (typeof FINAL_REPORT_RECOMMENDATIONS)[number] | "";
export type FinalReportDeliveryChannel = (typeof FINAL_REPORT_DELIVERY_CHANNELS)[number] | "";
export type FinalReportExemptReason = (typeof FINAL_REPORT_EXEMPT_REASONS)[number] | "";
export type FinalReportShareDurationDays = (typeof FINAL_REPORT_SHARE_DURATION_DAYS)[number];

export type FinalReportDraft = {
  initialGoals: string;
  finalSummary: string;
  strengths: string;
  areasToContinue: string;
  recommendedNextStep: FinalReportRecommendation;
  parentNote: string;
  teacherComment: string;
  attendanceComment: string;
  homeworkComment: string;
};

export const EMPTY_FINAL_REPORT_DRAFT: FinalReportDraft = {
  initialGoals: "",
  finalSummary: "",
  strengths: "",
  areasToContinue: "",
  recommendedNextStep: "",
  parentNote: "",
  teacherComment: "",
  attendanceComment: "",
  homeworkComment: "",
};

export type FinalReportMeta = {
  forwardedByName: string;
  forwardedByUserId: string;
  deliveryNote: string;
};

export const EMPTY_FINAL_REPORT_META: FinalReportMeta = {
  forwardedByName: "",
  forwardedByUserId: "",
  deliveryNote: "",
};

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function asRecommendation(value: unknown): FinalReportRecommendation {
  const text = asString(value).toUpperCase();
  if (FINAL_REPORT_RECOMMENDATIONS.includes(text as (typeof FINAL_REPORT_RECOMMENDATIONS)[number])) {
    return text as FinalReportRecommendation;
  }
  return "";
}

function asDeliveryChannel(value: unknown): FinalReportDeliveryChannel {
  const text = asString(value).toUpperCase();
  if (FINAL_REPORT_DELIVERY_CHANNELS.includes(text as (typeof FINAL_REPORT_DELIVERY_CHANNELS)[number])) {
    return text as FinalReportDeliveryChannel;
  }
  return "";
}

function asExemptReason(value: unknown): FinalReportExemptReason {
  const text = asString(value).toUpperCase();
  if (FINAL_REPORT_EXEMPT_REASONS.includes(text as (typeof FINAL_REPORT_EXEMPT_REASONS)[number])) {
    return text as FinalReportExemptReason;
  }
  return "";
}

export function parseFinalReportDraft(raw: unknown): FinalReportDraft {
  if (!raw || typeof raw !== "object") return { ...EMPTY_FINAL_REPORT_DRAFT };
  const row = raw as Record<string, unknown>;
  return {
    initialGoals: asString(row.initialGoals),
    finalSummary: asString(row.finalSummary),
    strengths: asString(row.strengths),
    areasToContinue: asString(row.areasToContinue),
    recommendedNextStep: asRecommendation(row.recommendedNextStep),
    parentNote: asString(row.parentNote),
    teacherComment: asString(row.teacherComment),
    attendanceComment: asString(row.attendanceComment),
    homeworkComment: asString(row.homeworkComment),
  };
}

export function parseFinalDraftFromFormData(formData: FormData): FinalReportDraft {
  const read = (key: keyof FinalReportDraft) => asString(formData.get(key));
  return parseFinalReportDraft({
    initialGoals: read("initialGoals"),
    finalSummary: read("finalSummary"),
    strengths: read("strengths"),
    areasToContinue: read("areasToContinue"),
    recommendedNextStep: read("recommendedNextStep"),
    parentNote: read("parentNote"),
    teacherComment: read("teacherComment"),
    attendanceComment: read("attendanceComment"),
    homeworkComment: read("homeworkComment"),
  });
}

export function parseFinalReportMeta(raw: unknown): FinalReportMeta {
  if (!raw || typeof raw !== "object") return { ...EMPTY_FINAL_REPORT_META };
  const row = raw as Record<string, unknown>;
  const meta = row._meta && typeof row._meta === "object" ? (row._meta as Record<string, unknown>) : row;
  return {
    forwardedByName: asString(meta.forwardedByName),
    forwardedByUserId: asString(meta.forwardedByUserId),
    deliveryNote: asString(meta.deliveryNote),
  };
}

export function parseDeliveryChannel(value: unknown): FinalReportDeliveryChannel {
  return asDeliveryChannel(value);
}

export function parseExemptReason(value: unknown): FinalReportExemptReason {
  return asExemptReason(value);
}

export function parseShareDurationDays(value: unknown): FinalReportShareDurationDays {
  const n = Number(String(value ?? "").trim());
  if (FINAL_REPORT_SHARE_DURATION_DAYS.includes(n as FinalReportShareDurationDays)) {
    return n as FinalReportShareDurationDays;
  }
  return 30;
}

function safePositiveInt(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export async function loadFinalReportCandidates() {
  const packages = await prisma.coursePackage.findMany({
    where: {
      type: "HOURS",
      status: "ACTIVE",
      totalMinutes: { gt: 0 },
      remainingMinutes: { lte: 0 },
    },
    include: {
      student: true,
      course: true,
      attendances: {
        where: {
          status: "PRESENT",
        },
        include: {
          student: true,
          session: {
            include: {
              teacher: true,
              class: {
                include: {
                  teacher: true,
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 80,
      },
      finalReports: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          studentId: true,
          teacherId: true,
          status: true,
          archivedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const rows = packages.flatMap((pkg) => {
    const total = safePositiveInt(pkg.totalMinutes);
    const remaining = Math.max(0, Number(pkg.remainingMinutes ?? 0));
    if (total <= 0) return [];

    const latestReportByTeacherAndStudent = new Map<string, "ASSIGNED" | "SUBMITTED" | "FORWARDED" | "EXEMPT" | "ARCHIVED">();
    for (const report of pkg.finalReports) {
      if (!report.teacherId || !report.studentId) continue;
      const reportKey = `${report.studentId}:${report.teacherId}`;
      if (latestReportByTeacherAndStudent.has(reportKey)) continue;
      if (report.archivedAt) {
        latestReportByTeacherAndStudent.set(reportKey, "ARCHIVED");
        continue;
      }
      if (
        report.status === "ASSIGNED" ||
        report.status === "SUBMITTED" ||
        report.status === "FORWARDED" ||
        report.status === "EXEMPT"
      ) {
        latestReportByTeacherAndStudent.set(reportKey, report.status);
      }
    }

    const studentTeacherMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        teacherMap: Map<
          string,
          {
            id: string;
            name: string;
            subjectId: string | null;
            subjectName: string | null;
            latestStartAt: Date;
            latestReportStatus: "ASSIGNED" | "SUBMITTED" | "FORWARDED" | "EXEMPT" | "ARCHIVED" | null;
          }
        >;
      }
    >();

    for (const attendance of pkg.attendances) {
      if (!attendance.studentId || !attendance.student?.name) continue;
      const teacher = attendance.session.teacher ?? attendance.session.class.teacher;
      if (!teacher?.id) continue;
      const subjectId = attendance.session.class.subject?.id ?? null;
      const subjectName = attendance.session.class.subject?.name ?? null;
      const studentEntry =
        studentTeacherMap.get(attendance.studentId) ??
        {
          studentId: attendance.studentId,
          studentName: attendance.student.name,
          teacherMap: new Map(),
        };
      const reportKey = `${attendance.studentId}:${teacher.id}`;
      const prev = studentEntry.teacherMap.get(teacher.id);
      if (!prev || prev.latestStartAt < attendance.session.startAt) {
        studentEntry.teacherMap.set(teacher.id, {
          id: teacher.id,
          name: teacher.name,
          subjectId,
          subjectName,
          latestStartAt: attendance.session.startAt,
          latestReportStatus: latestReportByTeacherAndStudent.get(reportKey) ?? null,
        });
      }
      studentTeacherMap.set(attendance.studentId, studentEntry);
    }

    return Array.from(studentTeacherMap.values())
      .map((entry) => {
        const teacherOptions = Array.from(entry.teacherMap.values())
          .filter((opt) => opt.latestReportStatus !== "EXEMPT" && opt.latestReportStatus !== "ARCHIVED")
          .sort((a, b) => b.latestStartAt.getTime() - a.latestStartAt.getTime());
        const topTeacher = teacherOptions[0] ?? null;
        if (!topTeacher) return null;

        return {
          candidateKey: `${pkg.id}:${entry.studentId}`,
          packageId: pkg.id,
          studentId: entry.studentId,
          studentName: entry.studentName,
          courseId: pkg.courseId,
          courseName: pkg.course.name,
          totalMinutes: total,
          remainingMinutes: remaining,
          usedMinutes: Math.max(0, total - remaining),
          teacherOptions,
          defaultTeacherId: topTeacher.id,
          defaultSubjectId: topTeacher.subjectId,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  });

  const result: Array<{
    candidateKey: string;
    packageId: string;
    studentId: string;
    studentName: string;
    courseId: string;
    courseName: string;
    totalMinutes: number;
    remainingMinutes: number;
    usedMinutes: number;
      teacherOptions: Array<{
        id: string;
        name: string;
        subjectId: string | null;
        subjectName: string | null;
        latestStartAt: Date;
        latestReportStatus: "ASSIGNED" | "SUBMITTED" | "FORWARDED" | "EXEMPT" | "ARCHIVED" | null;
      }>;
    defaultTeacherId: string;
    defaultSubjectId: string | null;
  }> = [];

  for (const row of rows) {
    result.push({
      ...row,
      teacherOptions: row.teacherOptions.map((opt) => ({
        ...opt,
        latestReportStatus:
          opt.latestReportStatus === "ASSIGNED" ||
          opt.latestReportStatus === "SUBMITTED" ||
          opt.latestReportStatus === "FORWARDED" ||
          opt.latestReportStatus === "EXEMPT" ||
          opt.latestReportStatus === "ARCHIVED"
            ? opt.latestReportStatus
            : null,
      })),
    });
  }

  result.sort((a, b) => a.studentName.localeCompare(b.studentName, "zh-Hans-CN"));
  return result;
}

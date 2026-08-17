import { prisma } from "@/lib/prisma";

export type MidtermLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "";

export const MIDTERM_REPORT_EXEMPT_REASONS = [
  "TRIAL_ONLY",
  "ASSESSMENT_ONLY",
  "EARLY_WITHDRAWAL",
  "OPS_NOT_REQUIRED",
  "DUPLICATE_ASSIGNMENT",
  "OTHER",
] as const;

export type MidtermReportExemptReason = (typeof MIDTERM_REPORT_EXEMPT_REASONS)[number] | "";

export type MidtermReportDraft = {
  assessmentTool: string;
  warningNote: string;

  overallEstimatedLevel: string;
  overallSummary: string;

  listeningLevel: MidtermLevel;
  listeningPerformance: string;
  listeningStrengths: string;
  listeningImprovements: string;

  readingLevel: MidtermLevel;
  readingPerformance: string;
  readingStrengths: string;
  readingImprovements: string;

  writingLevel: MidtermLevel;
  writingPerformance: string;
  writingStrengths: string;
  writingImprovements: string;

  speakingLevel: MidtermLevel;
  speakingPerformance: string;
  speakingStrengths: string;
  speakingImprovements: string;

  classParticipation: string;
  focusEngagement: string;
  homeworkPreparation: string;
  attitudeGeneral: string;

  keyStrengths: string;
  primaryBottlenecks: string;
  nextPhaseFocus: string;
  suggestedPracticeLoad: string;
  targetLevelScore: string;

  // Optional exam block (fully customizable)
  examName: string;
  examMetric1Label: string;
  examMetric1Value: string;
  examMetric2Label: string;
  examMetric2Value: string;
  examMetric3Label: string;
  examMetric3Value: string;
  examMetric4Label: string;
  examMetric4Value: string;
  examMetric5Label: string;
  examMetric5Value: string;
  examMetric6Label: string;
  examMetric6Value: string;
  examTotalLabel: string;
  examTotalValue: string;
};

export const DEFAULT_WARNING_NOTE = [
  "本报告基于内部评估及课堂观察所形成，仅反映学生当前英语能力水平。",
  "该成绩不代表任何官方外部考试结果。",
  "本评估旨在为后续学习提供针对性指导与改进方向。",
].join("\n");

export const EMPTY_REPORT_DRAFT: MidtermReportDraft = {
  assessmentTool: "",
  warningNote: DEFAULT_WARNING_NOTE,

  overallEstimatedLevel: "",
  overallSummary: "",

  listeningLevel: "",
  listeningPerformance: "",
  listeningStrengths: "",
  listeningImprovements: "",

  readingLevel: "",
  readingPerformance: "",
  readingStrengths: "",
  readingImprovements: "",

  writingLevel: "",
  writingPerformance: "",
  writingStrengths: "",
  writingImprovements: "",

  speakingLevel: "",
  speakingPerformance: "",
  speakingStrengths: "",
  speakingImprovements: "",

  classParticipation: "",
  focusEngagement: "",
  homeworkPreparation: "",
  attitudeGeneral: "",

  keyStrengths: "",
  primaryBottlenecks: "",
  nextPhaseFocus: "",
  suggestedPracticeLoad: "",
  targetLevelScore: "",

  examName: "",
  examMetric1Label: "",
  examMetric1Value: "",
  examMetric2Label: "",
  examMetric2Value: "",
  examMetric3Label: "",
  examMetric3Value: "",
  examMetric4Label: "",
  examMetric4Value: "",
  examMetric5Label: "",
  examMetric5Value: "",
  examMetric6Label: "",
  examMetric6Value: "",
  examTotalLabel: "",
  examTotalValue: "",
};

function asString(v: unknown) {
  return String(v ?? "").trim();
}

function asLevel(v: unknown): MidtermLevel {
  const text = asString(v).toUpperCase();
  if (text === "A1" || text === "A2" || text === "B1" || text === "B2" || text === "C1") return text;
  return "";
}

function asExemptReason(v: unknown): MidtermReportExemptReason {
  const text = asString(v).toUpperCase();
  if (MIDTERM_REPORT_EXEMPT_REASONS.includes(text as (typeof MIDTERM_REPORT_EXEMPT_REASONS)[number])) {
    return text as MidtermReportExemptReason;
  }
  return "";
}

export function parseMidtermExemptReason(v: unknown): MidtermReportExemptReason {
  return asExemptReason(v);
}

export function parseReportDraft(raw: unknown): MidtermReportDraft {
  if (!raw || typeof raw !== "object") return { ...EMPTY_REPORT_DRAFT };
  const row = raw as Record<string, unknown>;
  return {
    assessmentTool: asString(row.assessmentTool),
    warningNote: asString(row.warningNote) || DEFAULT_WARNING_NOTE,

    overallEstimatedLevel: asString(row.overallEstimatedLevel),
    overallSummary: asString(row.overallSummary || row.overallComment),

    listeningLevel: asLevel(row.listeningLevel),
    listeningPerformance: asString(row.listeningPerformance || row.listeningComment),
    listeningStrengths: asString(row.listeningStrengths),
    listeningImprovements: asString(row.listeningImprovements),

    readingLevel: asLevel(row.readingLevel),
    readingPerformance: asString(row.readingPerformance || row.readingComment),
    readingStrengths: asString(row.readingStrengths),
    readingImprovements: asString(row.readingImprovements),

    writingLevel: asLevel(row.writingLevel),
    writingPerformance: asString(row.writingPerformance || row.writingComment),
    writingStrengths: asString(row.writingStrengths),
    writingImprovements: asString(row.writingImprovements),

    speakingLevel: asLevel(row.speakingLevel),
    speakingPerformance: asString(row.speakingPerformance || row.speakingComment),
    speakingStrengths: asString(row.speakingStrengths),
    speakingImprovements: asString(row.speakingImprovements),

    classParticipation: asString(row.classParticipation),
    focusEngagement: asString(row.focusEngagement),
    homeworkPreparation: asString(row.homeworkPreparation),
    attitudeGeneral: asString(row.attitudeGeneral),

    keyStrengths: asString(row.keyStrengths),
    primaryBottlenecks: asString(row.primaryBottlenecks),
    nextPhaseFocus: asString(row.nextPhaseFocus),
    suggestedPracticeLoad: asString(row.suggestedPracticeLoad),
    targetLevelScore: asString(row.targetLevelScore),

    examName: asString(row.examName),
    examMetric1Label: asString(row.examMetric1Label) || (asString(row.itepGrammar) ? "Grammar" : ""),
    examMetric1Value: asString(row.examMetric1Value) || asString(row.itepGrammar),
    examMetric2Label: asString(row.examMetric2Label) || (asString(row.itepVocab) ? "Vocab" : ""),
    examMetric2Value: asString(row.examMetric2Value) || asString(row.itepVocab),
    examMetric3Label: asString(row.examMetric3Label) || (asString(row.itepListening) ? "Listening" : ""),
    examMetric3Value: asString(row.examMetric3Value) || asString(row.itepListening),
    examMetric4Label: asString(row.examMetric4Label) || (asString(row.itepReading) ? "Reading" : ""),
    examMetric4Value: asString(row.examMetric4Value) || asString(row.itepReading),
    examMetric5Label: asString(row.examMetric5Label) || (asString(row.itepWriting) ? "Writing" : ""),
    examMetric5Value: asString(row.examMetric5Value) || asString(row.itepWriting),
    examMetric6Label: asString(row.examMetric6Label) || (asString(row.itepSpeaking) ? "Speaking" : ""),
    examMetric6Value: asString(row.examMetric6Value) || asString(row.itepSpeaking),
    examTotalLabel: asString(row.examTotalLabel) || (asString(row.itepTotal) ? "Total" : ""),
    examTotalValue: asString(row.examTotalValue) || asString(row.itepTotal),
  };
}

export function parseDraftFromFormData(formData: FormData): MidtermReportDraft {
  const read = (key: keyof MidtermReportDraft) => asString(formData.get(key));
  return parseReportDraft({
    assessmentTool: read("assessmentTool"),
    warningNote: read("warningNote") || DEFAULT_WARNING_NOTE,

    overallEstimatedLevel: read("overallEstimatedLevel"),
    overallSummary: read("overallSummary"),

    listeningLevel: read("listeningLevel"),
    listeningPerformance: read("listeningPerformance"),
    listeningStrengths: read("listeningStrengths"),
    listeningImprovements: read("listeningImprovements"),

    readingLevel: read("readingLevel"),
    readingPerformance: read("readingPerformance"),
    readingStrengths: read("readingStrengths"),
    readingImprovements: read("readingImprovements"),

    writingLevel: read("writingLevel"),
    writingPerformance: read("writingPerformance"),
    writingStrengths: read("writingStrengths"),
    writingImprovements: read("writingImprovements"),

    speakingLevel: read("speakingLevel"),
    speakingPerformance: read("speakingPerformance"),
    speakingStrengths: read("speakingStrengths"),
    speakingImprovements: read("speakingImprovements"),

    classParticipation: read("classParticipation"),
    focusEngagement: read("focusEngagement"),
    homeworkPreparation: read("homeworkPreparation"),
    attitudeGeneral: read("attitudeGeneral"),

    keyStrengths: read("keyStrengths"),
    primaryBottlenecks: read("primaryBottlenecks"),
    nextPhaseFocus: read("nextPhaseFocus"),
    suggestedPracticeLoad: read("suggestedPracticeLoad"),
    targetLevelScore: read("targetLevelScore"),

    examName: read("examName"),
    examMetric1Label: read("examMetric1Label"),
    examMetric1Value: read("examMetric1Value"),
    examMetric2Label: read("examMetric2Label"),
    examMetric2Value: read("examMetric2Value"),
    examMetric3Label: read("examMetric3Label"),
    examMetric3Value: read("examMetric3Value"),
    examMetric4Label: read("examMetric4Label"),
    examMetric4Value: read("examMetric4Value"),
    examMetric5Label: read("examMetric5Label"),
    examMetric5Value: read("examMetric5Value"),
    examMetric6Label: read("examMetric6Label"),
    examMetric6Value: read("examMetric6Value"),
    examTotalLabel: read("examTotalLabel"),
    examTotalValue: read("examTotalValue"),
  });
}

function safePositiveInt(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export function formatMinutesToHours(minutes: number) {
  const h = Math.max(0, minutes) / 60;
  if (Number.isInteger(h)) return `${h}`;
  return h.toFixed(2).replace(/\.?0+$/, "");
}

export const MIDTERM_REPORT_MIN_PROGRESS = 45;
export const MIDTERM_REPORT_MAX_PROGRESS = 70;

export function calculateMidtermSubjectProgress(input: {
  packageTotalMinutes: number;
  participantCount: number;
  attendedMinutes: number;
}) {
  const packageTotalMinutes = safePositiveInt(input.packageTotalMinutes);
  const participantCount = Math.max(1, safePositiveInt(input.participantCount));
  const attendedMinutes = Math.max(0, safePositiveInt(input.attendedMinutes));
  const referenceMinutes = packageTotalMinutes > 0 ? Math.max(1, Math.round(packageTotalMinutes / participantCount)) : 0;
  const progressPercent = referenceMinutes > 0 ? Math.round((attendedMinutes / referenceMinutes) * 100) : 0;

  return {
    attendedMinutes,
    referenceMinutes,
    progressPercent,
    eligible:
      referenceMinutes > 0 &&
      progressPercent >= MIDTERM_REPORT_MIN_PROGRESS &&
      progressPercent <= MIDTERM_REPORT_MAX_PROGRESS,
  };
}

export async function loadMidtermCandidates() {
  const throughAt = new Date();
  const packages = await prisma.coursePackage.findMany({
    where: {
      type: "HOURS",
      status: "ACTIVE",
      totalMinutes: { gt: 0 },
      remainingMinutes: { gte: 0 },
    },
    include: {
      course: { select: { name: true } },
      sharedStudents: { select: { studentId: true } },
      attendances: {
        where: {
          status: { in: ["PRESENT", "LATE"] },
          session: { endAt: { lte: throughAt } },
        },
        select: {
          studentId: true,
          student: { select: { name: true } },
          session: {
            select: {
              startAt: true,
              endAt: true,
              teacher: { select: { id: true, name: true } },
              class: {
                select: {
                  teacher: { select: { id: true, name: true } },
                  subject: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      midtermReports: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          studentId: true,
          teacherId: true,
          subjectId: true,
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
    if (total <= 0) return [];
    const participantIds = new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)]);
    const participantCount = participantIds.size;

    type CandidateStatus = "ASSIGNED" | "SUBMITTED" | "EXEMPT" | "ARCHIVED";
    const reportsByStudentAndTeacher = new Map<
      string,
      Array<{ subjectId: string | null; status: CandidateStatus }>
    >();
    for (const report of pkg.midtermReports) {
      if (!report.teacherId || !report.studentId) continue;
      const reportKey = `${report.studentId}:${report.teacherId}`;
      const status: CandidateStatus | null = report.archivedAt
        ? "ARCHIVED"
        : report.status === "ASSIGNED" || report.status === "SUBMITTED" || report.status === "EXEMPT"
          ? report.status
          : null;
      if (!status) continue;
      const existing = reportsByStudentAndTeacher.get(reportKey) ?? [];
      existing.push({ subjectId: report.subjectId, status });
      reportsByStudentAndTeacher.set(reportKey, existing);
    }

    const studentSubjectMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        subjectId: string | null;
        subjectName: string | null;
        attendedMinutes: number;
        attendedSessions: number;
        teacherMap: Map<
          string,
          {
            id: string;
            name: string;
            latestStartAt: Date;
          }
        >;
      }
    >();

    for (const a of pkg.attendances) {
      if (!a.studentId || !a.student?.name) continue;
      const teacher = a.session.teacher ?? a.session.class.teacher;
      if (!teacher?.id) continue;
      const subjectId = a.session.class.subject?.id ?? null;
      const subjectName = a.session.class.subject?.name ?? null;
      const studentKey = `${a.studentId}:${subjectId ?? `teacher-${teacher.id}`}`;
      const durationMinutes = Math.max(
        0,
        Math.round((a.session.endAt.getTime() - a.session.startAt.getTime()) / 60_000),
      );
      const studentEntry =
        studentSubjectMap.get(studentKey) ??
        {
          studentId: a.studentId,
          studentName: a.student.name,
          subjectId,
          subjectName,
          attendedMinutes: 0,
          attendedSessions: 0,
          teacherMap: new Map(),
        };
      const prev = studentEntry.teacherMap.get(teacher.id);
      if (!prev || prev.latestStartAt < a.session.startAt) {
        studentEntry.teacherMap.set(teacher.id, {
          id: teacher.id,
          name: teacher.name,
          latestStartAt: a.session.startAt,
        });
      }
      studentEntry.attendedMinutes += durationMinutes;
      studentEntry.attendedSessions += 1;
      studentSubjectMap.set(studentKey, studentEntry);
    }

    return Array.from(studentSubjectMap.values())
      .map((entry) => {
        const progress = calculateMidtermSubjectProgress({
          packageTotalMinutes: total,
          participantCount,
          attendedMinutes: entry.attendedMinutes,
        });
        if (!progress.eligible) return null;

        const teacherOptions = Array.from(entry.teacherMap.values())
          .map((opt) => {
            const reports = reportsByStudentAndTeacher.get(`${entry.studentId}:${opt.id}`) ?? [];
            const exact = reports.find((report) => report.subjectId === entry.subjectId);
            const legacy = entry.subjectId ? reports.find((report) => report.subjectId === null) : null;
            return { ...opt, latestReportStatus: exact?.status ?? legacy?.status ?? null };
          })
          .filter((opt) => opt.latestReportStatus !== "EXEMPT" && opt.latestReportStatus !== "ARCHIVED")
          .sort((a, b) => b.latestStartAt.getTime() - a.latestStartAt.getTime());
        const topTeacher = teacherOptions[0] ?? null;
        if (!topTeacher) return null;

        return {
          candidateKey: `${pkg.id}:${entry.studentId}:${entry.subjectId ?? `teacher-${topTeacher.id}`}`,
          packageId: pkg.id,
          studentId: entry.studentId,
          studentName: entry.studentName,
          courseId: pkg.courseId,
          courseName: pkg.course.name,
          subjectId: entry.subjectId,
          subjectName: entry.subjectName,
          totalMinutes: progress.referenceMinutes,
          consumedMinutes: progress.attendedMinutes,
          progressPercent: progress.progressPercent,
          consumedSessions: entry.attendedSessions,
          participantCount,
          teacherOptions,
          defaultTeacherId: topTeacher.id,
          defaultSubjectId: entry.subjectId,
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
    subjectId: string | null;
    subjectName: string | null;
    totalMinutes: number;
    consumedMinutes: number;
    progressPercent: number;
    consumedSessions: number;
    participantCount: number;
      teacherOptions: Array<{
        id: string;
        name: string;
        latestStartAt: Date;
        latestReportStatus: "ASSIGNED" | "SUBMITTED" | "EXEMPT" | "ARCHIVED" | null;
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
          opt.latestReportStatus === "EXEMPT" ||
          opt.latestReportStatus === "ARCHIVED"
            ? opt.latestReportStatus
            : null,
      })),
    });
  }
  result.sort((a, b) => b.progressPercent - a.progressPercent);
  return result;
}

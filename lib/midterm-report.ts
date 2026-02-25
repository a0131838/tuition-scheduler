import { prisma } from "@/lib/prisma";

export type MidtermLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "";

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

export const DEFAULT_WARNING_NOTE =
  [
    "This report reflects the students current English performance based on internal assessment and classroom observation.",
    "It does not represent an official external examination result.",
    "The purpose of this evaluation is to guide improvement and provide targeted academic support.",
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

export async function loadMidtermCandidates() {
  const packages = await prisma.coursePackage.findMany({
    where: {
      type: "HOURS",
      status: "ACTIVE",
      totalMinutes: { gt: 0 },
      remainingMinutes: { gte: 0 },
    },
    include: {
      student: true,
      course: true,
      txns: {
        where: { kind: "DEDUCT" },
        select: { id: true },
      },
      attendances: {
        where: { deductedMinutes: { gt: 0 } },
        include: {
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
        take: 50,
      },
      midtermReports: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const rows = packages.map((pkg) => {
    const total = safePositiveInt(pkg.totalMinutes);
    const remaining = safePositiveInt(pkg.remainingMinutes);
    const used = Math.max(0, total - remaining);
    if (total <= 0 || used <= 0) return null;
    const progress = Math.round((used / total) * 100);
    if (progress < 45 || progress > 70) return null;

    const latestReport = pkg.midtermReports[0] ?? null;
    if (latestReport && latestReport.status === "SUBMITTED") return null;

    const teacherMap = new Map<
      string,
      { id: string; name: string; subjectId: string | null; subjectName: string | null; latestStartAt: Date }
    >();
    for (const a of pkg.attendances) {
      const teacher = a.session.teacher ?? a.session.class.teacher;
      if (!teacher?.id) continue;
      const subjectId = a.session.class.subject?.id ?? null;
      const subjectName = a.session.class.subject?.name ?? null;
      const prev = teacherMap.get(teacher.id);
      if (!prev || prev.latestStartAt < a.session.startAt) {
        teacherMap.set(teacher.id, {
          id: teacher.id,
          name: teacher.name,
          subjectId,
          subjectName,
          latestStartAt: a.session.startAt,
        });
      }
    }

    const teacherOptions = Array.from(teacherMap.values()).sort((a, b) => b.latestStartAt.getTime() - a.latestStartAt.getTime());
    const topTeacher = teacherOptions[0] ?? null;
    if (!topTeacher) return null;

    return {
      packageId: pkg.id,
      studentId: pkg.studentId,
      studentName: pkg.student.name,
      courseId: pkg.courseId,
      courseName: pkg.course.name,
      totalMinutes: total,
      consumedMinutes: used,
      progressPercent: progress,
      consumedSessions: pkg.txns.length,
      teacherOptions,
      defaultTeacherId: topTeacher.id,
      defaultSubjectId: topTeacher.subjectId,
      latestReportStatus: latestReport?.status ?? null,
    };
  });

  const result: Array<{
    packageId: string;
    studentId: string;
    studentName: string;
    courseId: string;
    courseName: string;
    totalMinutes: number;
    consumedMinutes: number;
    progressPercent: number;
    consumedSessions: number;
    teacherOptions: Array<{ id: string; name: string; subjectId: string | null; subjectName: string | null; latestStartAt: Date }>;
    defaultTeacherId: string;
    defaultSubjectId: string | null;
    latestReportStatus: "ASSIGNED" | "SUBMITTED" | null;
  }> = [];

  for (const row of rows) {
    if (!row) continue;
    result.push({
      ...row,
      latestReportStatus: row.latestReportStatus === "ASSIGNED" || row.latestReportStatus === "SUBMITTED" ? row.latestReportStatus : null,
    });
  }
  result.sort((a, b) => b.progressPercent - a.progressPercent);
  return result;
}

import { prisma } from "@/lib/prisma";

export type MidtermLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "";

export type MidtermReportDraft = {
  warningNote: string;
  overallComment: string;
  listeningLevel: MidtermLevel;
  listeningComment: string;
  vocabularyLevel: MidtermLevel;
  vocabularyComment: string;
  readingLevel: MidtermLevel;
  readingComment: string;
  writingLevel: MidtermLevel;
  writingComment: string;
  speakingLevel: MidtermLevel;
  speakingComment: string;
  summaryComment: string;
  itepGrammar: string;
  itepVocab: string;
  itepListening: string;
  itepReading: string;
  itepWriting: string;
  itepSpeaking: string;
  itepTotal: string;
  disciplineSubject: string;
  disciplinePages: string;
  disciplineProgress: string;
  disciplineStrengths: string;
  disciplineClassBehavior: string;
  disciplineNextStep: string;
};

export const DEFAULT_WARNING_NOTE =
  "本报告中的评分不代表任何正式考试成绩，仅反映学生阶段性表现，供家长参考。";

export const EMPTY_REPORT_DRAFT: MidtermReportDraft = {
  warningNote: DEFAULT_WARNING_NOTE,
  overallComment: "",
  listeningLevel: "",
  listeningComment: "",
  vocabularyLevel: "",
  vocabularyComment: "",
  readingLevel: "",
  readingComment: "",
  writingLevel: "",
  writingComment: "",
  speakingLevel: "",
  speakingComment: "",
  summaryComment: "",
  itepGrammar: "",
  itepVocab: "",
  itepListening: "",
  itepReading: "",
  itepWriting: "",
  itepSpeaking: "",
  itepTotal: "",
  disciplineSubject: "",
  disciplinePages: "",
  disciplineProgress: "",
  disciplineStrengths: "",
  disciplineClassBehavior: "",
  disciplineNextStep: "",
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
    warningNote: asString(row.warningNote) || DEFAULT_WARNING_NOTE,
    overallComment: asString(row.overallComment),
    listeningLevel: asLevel(row.listeningLevel),
    listeningComment: asString(row.listeningComment),
    vocabularyLevel: asLevel(row.vocabularyLevel),
    vocabularyComment: asString(row.vocabularyComment),
    readingLevel: asLevel(row.readingLevel),
    readingComment: asString(row.readingComment),
    writingLevel: asLevel(row.writingLevel),
    writingComment: asString(row.writingComment),
    speakingLevel: asLevel(row.speakingLevel),
    speakingComment: asString(row.speakingComment),
    summaryComment: asString(row.summaryComment),
    itepGrammar: asString(row.itepGrammar),
    itepVocab: asString(row.itepVocab),
    itepListening: asString(row.itepListening),
    itepReading: asString(row.itepReading),
    itepWriting: asString(row.itepWriting),
    itepSpeaking: asString(row.itepSpeaking),
    itepTotal: asString(row.itepTotal),
    disciplineSubject: asString(row.disciplineSubject),
    disciplinePages: asString(row.disciplinePages),
    disciplineProgress: asString(row.disciplineProgress),
    disciplineStrengths: asString(row.disciplineStrengths),
    disciplineClassBehavior: asString(row.disciplineClassBehavior),
    disciplineNextStep: asString(row.disciplineNextStep),
  };
}

export function parseDraftFromFormData(formData: FormData): MidtermReportDraft {
  const read = (key: keyof MidtermReportDraft) => asString(formData.get(key));
  return parseReportDraft({
    warningNote: read("warningNote") || DEFAULT_WARNING_NOTE,
    overallComment: read("overallComment"),
    listeningLevel: read("listeningLevel"),
    listeningComment: read("listeningComment"),
    vocabularyLevel: read("vocabularyLevel"),
    vocabularyComment: read("vocabularyComment"),
    readingLevel: read("readingLevel"),
    readingComment: read("readingComment"),
    writingLevel: read("writingLevel"),
    writingComment: read("writingComment"),
    speakingLevel: read("speakingLevel"),
    speakingComment: read("speakingComment"),
    summaryComment: read("summaryComment"),
    itepGrammar: read("itepGrammar"),
    itepVocab: read("itepVocab"),
    itepListening: read("itepListening"),
    itepReading: read("itepReading"),
    itepWriting: read("itepWriting"),
    itepSpeaking: read("itepSpeaking"),
    itepTotal: read("itepTotal"),
    disciplineSubject: read("disciplineSubject"),
    disciplinePages: read("disciplinePages"),
    disciplineProgress: read("disciplineProgress"),
    disciplineStrengths: read("disciplineStrengths"),
    disciplineClassBehavior: read("disciplineClassBehavior"),
    disciplineNextStep: read("disciplineNextStep"),
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

  const rows = packages
    .map((pkg) => {
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

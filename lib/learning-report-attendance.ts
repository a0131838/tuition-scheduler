import { formatBusinessDateOnly } from "@/lib/date-only";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";

export type LearningReportAttendanceSnapshot = {
  version: 1;
  source: "ATTENDANCE";
  scope: "SUBJECT" | "TEACHER";
  attendedMinutes: number;
  sessionCount: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  subjectId: string | null;
  teacherId: string;
  throughAt: string;
  capturedAt: string;
};

type AttendanceRow = {
  session: {
    startAt: Date;
    endAt: Date;
    teacherId: string | null;
    class: {
      teacherId: string;
      subjectId: string | null;
    };
  };
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asIsoDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseLearningReportAttendanceSnapshot(raw: unknown): LearningReportAttendanceSnapshot | null {
  const root = asRecord(raw);
  const meta = asRecord(root._meta);
  const snapshot = asRecord(meta.attendanceSnapshot);
  const attendedMinutes = Number(snapshot.attendedMinutes);
  const sessionCount = Number(snapshot.sessionCount);
  const throughAt = asIsoDate(snapshot.throughAt);
  const capturedAt = asIsoDate(snapshot.capturedAt);
  const teacherId = String(snapshot.teacherId ?? "").trim();
  const scope = snapshot.scope === "SUBJECT" ? "SUBJECT" : snapshot.scope === "TEACHER" ? "TEACHER" : null;

  if (
    snapshot.version !== 1 ||
    snapshot.source !== "ATTENDANCE" ||
    !scope ||
    !teacherId ||
    !throughAt ||
    !capturedAt ||
    !Number.isFinite(attendedMinutes) ||
    attendedMinutes < 0 ||
    !Number.isInteger(sessionCount) ||
    sessionCount < 0
  ) {
    return null;
  }

  return {
    version: 1,
    source: "ATTENDANCE",
    scope,
    attendedMinutes: Math.round(attendedMinutes),
    sessionCount,
    firstSessionAt: asIsoDate(snapshot.firstSessionAt),
    lastSessionAt: asIsoDate(snapshot.lastSessionAt),
    subjectId: snapshot.subjectId ? String(snapshot.subjectId) : null,
    teacherId,
    throughAt,
    capturedAt,
  };
}

export function mergeLearningReportAttendanceSnapshot(
  draft: Record<string, unknown>,
  previousReportJson: unknown,
  snapshot: LearningReportAttendanceSnapshot | null,
) {
  const previous = asRecord(previousReportJson);
  const previousMeta = asRecord(previous._meta);
  return {
    ...draft,
    ...(Object.keys(previousMeta).length || snapshot
      ? {
          _meta: {
            ...previousMeta,
            ...(snapshot ? { attendanceSnapshot: snapshot } : {}),
          },
        }
      : {}),
  };
}

export function summarizeLearningReportAttendance(
  rows: AttendanceRow[],
  input: { subjectId: string | null; teacherId: string; throughAt: Date; capturedAt?: Date },
): LearningReportAttendanceSnapshot {
  const relevantRows = rows.filter((row) => {
    if (row.session.endAt.getTime() > input.throughAt.getTime()) return false;
    if (input.subjectId) return row.session.class.subjectId === input.subjectId;
    const effectiveTeacherId = row.session.teacherId ?? row.session.class.teacherId;
    return effectiveTeacherId === input.teacherId;
  });

  const sessionDates = relevantRows.map((row) => row.session.startAt).sort((a, b) => a.getTime() - b.getTime());
  const attendedMinutes = relevantRows.reduce((sum, row) => {
    const duration = Math.round((row.session.endAt.getTime() - row.session.startAt.getTime()) / 60_000);
    return sum + Math.max(0, duration);
  }, 0);

  return {
    version: 1,
    source: "ATTENDANCE",
    scope: input.subjectId ? "SUBJECT" : "TEACHER",
    attendedMinutes,
    sessionCount: relevantRows.length,
    firstSessionAt: sessionDates[0]?.toISOString() ?? null,
    lastSessionAt: sessionDates.at(-1)?.toISOString() ?? null,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
    throughAt: input.throughAt.toISOString(),
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
  };
}

export async function createLearningReportAttendanceSnapshot(input: {
  packageId: string | null;
  studentId: string;
  subjectId: string | null;
  teacherId: string;
  throughAt: Date;
}) {
  const rows = await prisma.attendance.findMany({
    where: {
      ...(input.packageId ? { packageId: input.packageId } : {}),
      studentId: input.studentId,
      status: { in: ["PRESENT", "LATE"] },
      session: { endAt: { lte: input.throughAt } },
    },
    select: {
      session: {
        select: {
          startAt: true,
          endAt: true,
          teacherId: true,
          class: { select: { teacherId: true, subjectId: true } },
        },
      },
    },
    orderBy: { session: { startAt: "asc" } },
  });

  return summarizeLearningReportAttendance(rows, input);
}

export function isLegacyPackageCompletionLabel(value: string | null | undefined) {
  return /^\s*\d+(?:\.\d+)?h\s+package\s+completed\s*$/i.test(String(value ?? ""));
}

export function isLegacyLearningPeriodLabel(value: string | null | undefined) {
  const text = String(value ?? "");
  return isLegacyPackageCompletionLabel(text) || /^\s*\d+\s+sessions?\s+completed\s*$/i.test(text);
}

export function learningReportPeriodLabel(
  snapshot: LearningReportAttendanceSnapshot,
  customLabel: string | null | undefined,
  lang: "BILINGUAL" | "ZH" | "EN",
) {
  const custom = isLegacyLearningPeriodLabel(customLabel) ? "" : String(customLabel ?? "").trim();
  const first = snapshot.firstSessionAt ? formatBusinessDateOnly(new Date(snapshot.firstSessionAt)) : "";
  const last = snapshot.lastSessionAt ? formatBusinessDateOnly(new Date(snapshot.lastSessionAt)) : "";
  const range = first && last ? (first === last ? first : `${first} - ${last}`) : "";
  const hours = formatMinutesToHours(snapshot.attendedMinutes);
  const attendance =
    lang === "ZH"
      ? `实际出勤 ${hours} 小时`
      : lang === "EN"
        ? `${hours} attended hours`
        : `${hours} attended hours / 实际出勤 ${hours} 小时`;
  return [custom || range, attendance].filter(Boolean).join(" · ");
}

export function finalReportStageProgressLabel(
  snapshot: LearningReportAttendanceSnapshot,
  lang: "BILINGUAL" | "ZH" | "EN",
) {
  const hours = formatMinutesToHours(snapshot.attendedMinutes);
  const zh = snapshot.scope === "SUBJECT" ? `本学科已实际出勤 ${hours} 小时` : `跟随本老师已实际出勤 ${hours} 小时`;
  const en = snapshot.scope === "SUBJECT" ? `Completed ${hours} attended hours in this subject` : `Completed ${hours} attended hours with this teacher`;
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

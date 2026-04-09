import { listBookingSlotsForMonth, monthKey, type BookingSlot } from "@/lib/booking";

type EnrollmentLike = {
  class: {
    subjectId: string | null;
    levelId: string | null;
    teacherId: string;
    subject?: { name: string } | null;
    level?: { name: string } | null;
    teacher?: { name: string } | null;
  };
};

type TeacherLike = {
  id: string;
  name: string;
  subjectCourseId?: string | null;
  subjects?: Array<{ id: string; name: string }>;
};

export type SchedulingCoordinationTeacherOption = {
  teacherId: string;
  teacherName: string;
  subjectId?: string;
  subjectLabel?: string;
  levelId?: string;
  levelLabel?: string;
  assigned: boolean;
};

export function buildSchedulingCoordinationTeacherOptions(args: {
  enrollments: EnrollmentLike[];
  teachers: TeacherLike[];
}) {
  const subjectMeta = new Map<string, { subjectLabel?: string; levelId?: string; levelLabel?: string }>();
  const assignedTeacherIds = new Set<string>();
  const options = new Map<string, SchedulingCoordinationTeacherOption>();

  for (const enrollment of args.enrollments) {
    const subjectId = enrollment.class.subjectId ?? undefined;
    if (!subjectId) continue;
    subjectMeta.set(subjectId, {
      subjectLabel: enrollment.class.subject?.name ?? undefined,
      levelId: enrollment.class.levelId ?? undefined,
      levelLabel: enrollment.class.level?.name ?? undefined,
    });
    assignedTeacherIds.add(enrollment.class.teacherId);
    options.set(enrollment.class.teacherId, {
      teacherId: enrollment.class.teacherId,
      teacherName: enrollment.class.teacher?.name ?? enrollment.class.teacherId,
      subjectId,
      subjectLabel: enrollment.class.subject?.name ?? undefined,
      levelId: enrollment.class.levelId ?? undefined,
      levelLabel: enrollment.class.level?.name ?? undefined,
      assigned: true,
    });
  }

  for (const teacher of args.teachers) {
    const matchedSubject = teacher.subjects?.find((subject) => subjectMeta.has(subject.id));
    const matchedSubjectId = matchedSubject?.id ?? (teacher.subjectCourseId && subjectMeta.has(teacher.subjectCourseId) ? teacher.subjectCourseId : undefined);
    if (!matchedSubjectId) continue;
    if (options.has(teacher.id)) continue;
    const matchedMeta = subjectMeta.get(matchedSubjectId);
    options.set(teacher.id, {
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectId: matchedSubjectId,
      subjectLabel: matchedMeta?.subjectLabel ?? matchedSubject?.name ?? undefined,
      levelId: matchedMeta?.levelId,
      levelLabel: matchedMeta?.levelLabel,
      assigned: assignedTeacherIds.has(teacher.id),
    });
  }

  return Array.from(options.values()).sort((a, b) => {
    if (a.assigned !== b.assigned) return a.assigned ? -1 : 1;
    return a.teacherName.localeCompare(b.teacherName);
  });
}

export function inferSchedulingCoordinationDurationMin(args: {
  upcomingSessions: Array<{ startAt: Date; endAt: Date }>;
  monthlySessions: Array<{ startAt: Date; endAt: Date }>;
}) {
  const sample = args.upcomingSessions[0] ?? args.monthlySessions[0] ?? null;
  if (!sample) return 45;
  const minutes = Math.round((sample.endAt.getTime() - sample.startAt.getTime()) / 60000);
  return Number.isFinite(minutes) && minutes >= 15 ? minutes : 45;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfWindow(date: Date, horizonDays: number) {
  const end = startOfDay(date);
  end.setDate(end.getDate() + Math.max(1, horizonDays));
  return end;
}

function uniqueMonthsBetween(startAt: Date, endAt: Date) {
  const months: string[] = [];
  const cursor = new Date(startAt.getFullYear(), startAt.getMonth(), 1, 0, 0, 0, 0);
  const limit = new Date(endAt.getFullYear(), endAt.getMonth(), 1, 0, 0, 0, 0);
  while (cursor <= limit) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export async function listSchedulingCoordinationCandidateSlots(args: {
  studentId: string;
  teacherOptions: SchedulingCoordinationTeacherOption[];
  teacherId?: string;
  startAt: Date;
  durationMin: number;
  horizonDays?: number;
  maxSlots?: number;
}) {
  const selectedTeachers = args.teacherId
    ? args.teacherOptions.filter((option) => option.teacherId === args.teacherId)
    : args.teacherOptions;
  if (selectedTeachers.length === 0) return [] as BookingSlot[];

  const windowStart = startOfDay(args.startAt);
  const windowEnd = endOfWindow(args.startAt, args.horizonDays ?? 14);
  const months = uniqueMonthsBetween(windowStart, windowEnd);

  const slotCollections = await Promise.all(
    months.map((month) =>
      listBookingSlotsForMonth({
        linkId: `coordination:${args.studentId}`,
        teachers: selectedTeachers.map((option) => ({
          teacherId: option.teacherId,
          teacherName: option.teacherName,
          subjectLabel: option.subjectLabel,
        })),
        startDate: windowStart,
        endDate: windowEnd,
        durationMin: args.durationMin,
        month,
        stepMin: args.durationMin,
      })
    )
  );

  const merged = slotCollections
    .flatMap((result) => result?.slots ?? [])
    .filter((slot) => slot.startAt >= args.startAt && slot.endAt <= windowEnd)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.teacherName.localeCompare(b.teacherName));

  return merged.slice(0, Math.max(1, args.maxSlots ?? 5));
}

export async function evaluateSchedulingSpecialRequest(args: {
  studentId: string;
  teacherOptions: SchedulingCoordinationTeacherOption[];
  teacherId?: string;
  requestedStartAt: Date;
  durationMin: number;
}) {
  const exactCandidates = await listSchedulingCoordinationCandidateSlots({
    studentId: args.studentId,
    teacherOptions: args.teacherOptions,
    teacherId: args.teacherId,
    startAt: args.requestedStartAt,
    durationMin: args.durationMin,
    horizonDays: 7,
    maxSlots: 12,
  });

  const requestedEndAt = new Date(args.requestedStartAt.getTime() + args.durationMin * 60000);
  const matches = exactCandidates.filter(
    (slot) =>
      slot.startAt.getTime() === args.requestedStartAt.getTime() && slot.endAt.getTime() === requestedEndAt.getTime()
  );

  return {
    matches,
    alternatives: exactCandidates
      .filter((slot) => slot.startAt.getTime() !== args.requestedStartAt.getTime())
      .slice(0, 3),
  };
}

import { AttendanceStatus, Prisma } from "@prisma/client";

export const COURSE_CHANGE_REMINDER_REQUEUE_ERROR = "Course changed; rebuild reminder";

type CourseTransitionDb = Pick<
  Prisma.TransactionClient,
  "class" | "course" | "coursePackage" | "enrollment" | "miniappNotificationOutbox" | "session"
>;

type TargetSubject = {
  id: string;
  name: string;
  levels: Array<{ id: string; name: string }>;
};

type TransitionSession = {
  id: string;
  startAt: Date;
  endAt: Date;
  studentId: string | null;
  feedbacks: Array<{ id: string }>;
  attendances: Array<{
    studentId: string;
    status: AttendanceStatus;
    deductedMinutes: number;
    deductedCount: number;
  }>;
  class: {
    id: string;
    teacherId: string;
    courseId: string;
    subjectId: string | null;
    levelId: string | null;
    campusId: string;
    roomId: string | null;
    capacity: number;
    oneOnOneStudentId: string | null;
    subject: { name: string } | null;
    level: { name: string } | null;
    enrollments: Array<{ studentId: string }>;
  };
};

export type PackageCourseTransitionPreview = {
  packageId: string;
  oldCourseId: string;
  oldCourseName: string;
  targetCourseId: string;
  targetCourseName: string;
  eligibleStudentIds: string[];
  futureOneOnOneSessions: number;
  futureGroupSessions: number;
  protectedSessions: number;
  ambiguousSessions: number;
};

export type PackageCourseTransitionResult = PackageCourseTransitionPreview & {
  migratedSessionIds: string[];
  clearedSubjectCount: number;
  invalidatedReminderCount: number;
};

function normalizedAliases(value: string | null | undefined) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return [];
  const pieces = text.split(/[\/|,，;；()（）]+/g);
  return Array.from(
    new Set(
      [text, ...pieces]
        .map((part) => part.replace(/[\s._-]+/g, ""))
        .filter(Boolean)
    )
  );
}

export function matchCourseTransitionSubject(
  sourceName: string | null | undefined,
  targetSubjects: TargetSubject[]
) {
  const sourceAliases = new Set(normalizedAliases(sourceName));
  if (!sourceAliases.size) return null;
  const exact = targetSubjects.find(
    (subject) => normalizedAliases(subject.name)[0] === normalizedAliases(sourceName)[0]
  );
  if (exact) return exact;
  const matches = targetSubjects.filter((subject) =>
    normalizedAliases(subject.name).some((alias) => sourceAliases.has(alias))
  );
  return matches.length === 1 ? matches[0] : null;
}

export function matchCourseTransitionLevel(
  sourceName: string | null | undefined,
  targetLevels: Array<{ id: string; name: string }>
) {
  const sourceAliases = new Set(normalizedAliases(sourceName));
  if (!sourceAliases.size) return null;
  const exact = targetLevels.find(
    (level) => normalizedAliases(level.name)[0] === normalizedAliases(sourceName)[0]
  );
  if (exact) return exact;
  const matches = targetLevels.filter((level) =>
    normalizedAliases(level.name).some((alias) => sourceAliases.has(alias))
  );
  return matches.length === 1 ? matches[0] : null;
}

export function sharedCourseIdsAfterTransition(input: {
  selectedSharedCourseIds: string[];
  oldCourseId: string;
  targetCourseId: string;
}) {
  const ids = new Set(input.selectedSharedCourseIds.filter(Boolean));
  ids.delete(input.targetCourseId);
  if (input.oldCourseId !== input.targetCourseId) ids.add(input.oldCourseId);
  return Array.from(ids);
}

export function packageCourseAccessAfterTransition(input: {
  primaryCourseId: string;
  selectedSharedCourseIds: string[];
  sourceCourseId: string;
  targetCourseId: string;
  hasSharedStudents: boolean;
}) {
  const changePrimaryCourse =
    !input.hasSharedStudents && input.sourceCourseId === input.primaryCourseId;
  const resultingPrimaryCourseId = changePrimaryCourse
    ? input.targetCourseId
    : input.primaryCourseId;

  if (changePrimaryCourse) {
    return {
      changePrimaryCourse,
      primaryCourseId: resultingPrimaryCourseId,
      sharedCourseIds: sharedCourseIdsAfterTransition({
        selectedSharedCourseIds: input.selectedSharedCourseIds,
        oldCourseId: input.sourceCourseId,
        targetCourseId: input.targetCourseId,
      }),
    };
  }

  const sharedCourseIds = new Set(input.selectedSharedCourseIds.filter(Boolean));
  sharedCourseIds.delete(resultingPrimaryCourseId);
  if (input.sourceCourseId !== resultingPrimaryCourseId) {
    sharedCourseIds.add(input.sourceCourseId);
  }
  if (input.targetCourseId !== resultingPrimaryCourseId) {
    sharedCourseIds.add(input.targetCourseId);
  }
  return {
    changePrimaryCourse,
    primaryCourseId: resultingPrimaryCourseId,
    sharedCourseIds: Array.from(sharedCourseIds),
  };
}

function sessionStudentId(session: TransitionSession, eligibleStudentIds: Set<string>) {
  const linkedStudentIds = new Set(
    [
      session.studentId,
      session.class.oneOnOneStudentId,
      ...session.class.enrollments.map((row) => row.studentId),
    ].filter((id): id is string => Boolean(id))
  );
  if (linkedStudentIds.size !== 1) return null;
  const studentId = Array.from(linkedStudentIds)[0];
  return eligibleStudentIds.has(studentId) ? studentId : null;
}

function isProtectedSession(session: TransitionSession) {
  if (session.feedbacks.length > 0) return true;
  return session.attendances.some(
    (row) =>
      row.status !== AttendanceStatus.UNMARKED ||
      row.deductedMinutes > 0 ||
      row.deductedCount > 0
  );
}

async function loadTransitionContext(
  db: CourseTransitionDb,
  input: {
    packageId: string;
    sourceCourseId?: string;
    targetCourseId: string;
    studentIds?: string[];
    now: Date;
  }
) {
  const pkg = await db.coursePackage.findUnique({
    where: { id: input.packageId },
    select: {
      id: true,
      studentId: true,
      courseId: true,
      course: { select: { name: true } },
      sharedStudents: { select: { studentId: true } },
      sharedCourses: { select: { courseId: true } },
    },
  });
  if (!pkg) throw new Error("PACKAGE_NOT_FOUND");

  const sourceCourseId = input.sourceCourseId || pkg.courseId;
  const allowedCourseIds = new Set([
    pkg.courseId,
    ...pkg.sharedCourses.map((row) => row.courseId),
  ]);
  if (!allowedCourseIds.has(sourceCourseId)) throw new Error("SOURCE_COURSE_NOT_ALLOWED");

  const sourceCourse = await db.course.findUnique({
    where: { id: sourceCourseId },
    select: { id: true, name: true },
  });
  if (!sourceCourse) throw new Error("SOURCE_COURSE_NOT_FOUND");

  const targetCourse = await db.course.findUnique({
    where: { id: input.targetCourseId },
    select: {
      id: true,
      name: true,
      subjects: {
        select: {
          id: true,
          name: true,
          levels: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!targetCourse) throw new Error("TARGET_COURSE_NOT_FOUND");

  const packageStudentIds = Array.from(
    new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)])
  );
  const requestedStudentIds = Array.from(
    new Set((input.studentIds?.length ? input.studentIds : [pkg.studentId]).filter(Boolean))
  );
  if (
    requestedStudentIds.length === 0 ||
    requestedStudentIds.some((studentId) => !packageStudentIds.includes(studentId))
  ) {
    throw new Error("STUDENT_SCOPE_NOT_ALLOWED");
  }
  const eligibleStudentIds = requestedStudentIds;

  const sessions = (await db.session.findMany({
    where: {
      startAt: { gt: input.now },
      class: {
        courseId: sourceCourse.id,
        capacity: 1,
        OR: [
          { oneOnOneStudentId: { in: eligibleStudentIds } },
          { enrollments: { some: { studentId: { in: eligibleStudentIds } } } },
        ],
      },
      OR: [{ studentId: { in: eligibleStudentIds } }, { studentId: null }],
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      studentId: true,
      feedbacks: { select: { id: true }, take: 1 },
      attendances: {
        select: {
          studentId: true,
          status: true,
          deductedMinutes: true,
          deductedCount: true,
        },
      },
      class: {
        select: {
          id: true,
          teacherId: true,
          courseId: true,
          subjectId: true,
          levelId: true,
          campusId: true,
          roomId: true,
          capacity: true,
          oneOnOneStudentId: true,
          subject: { select: { name: true } },
          level: { select: { name: true } },
          enrollments: { select: { studentId: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
  })) as TransitionSession[];

  const futureGroupSessions = await db.session.count({
    where: {
      startAt: { gt: input.now },
      class: {
        courseId: sourceCourse.id,
        capacity: { gt: 1 },
        enrollments: { some: { studentId: { in: eligibleStudentIds } } },
      },
    },
  });

  const eligibleIds = new Set(eligibleStudentIds);
  const protectedSessions = sessions.filter(isProtectedSession).length;
  const ambiguousSessions = sessions.filter(
    (session) => !isProtectedSession(session) && !sessionStudentId(session, eligibleIds)
  ).length;
  const movableSessions = sessions.filter(
    (session) => !isProtectedSession(session) && Boolean(sessionStudentId(session, eligibleIds))
  );

  return {
    pkg,
    sourceCourse,
    targetCourse,
    eligibleStudentIds,
    sessions,
    movableSessions,
    futureGroupSessions,
    protectedSessions,
    ambiguousSessions,
  };
}

export async function previewPackageCourseTransition(
  db: CourseTransitionDb,
  input: {
    packageId: string;
    sourceCourseId?: string;
    targetCourseId: string;
    studentIds?: string[];
    now?: Date;
  }
): Promise<PackageCourseTransitionPreview> {
  const context = await loadTransitionContext(db, {
    packageId: input.packageId,
    sourceCourseId: input.sourceCourseId,
    targetCourseId: input.targetCourseId,
    studentIds: input.studentIds,
    now: input.now ?? new Date(),
  });
  return {
    packageId: context.pkg.id,
    oldCourseId: context.sourceCourse.id,
    oldCourseName: context.sourceCourse.name,
    targetCourseId: context.targetCourse.id,
    targetCourseName: context.targetCourse.name,
    eligibleStudentIds: context.eligibleStudentIds,
    futureOneOnOneSessions: context.movableSessions.length,
    futureGroupSessions: context.futureGroupSessions,
    protectedSessions: context.protectedSessions,
    ambiguousSessions: context.ambiguousSessions,
  };
}

export async function transitionPackageCourse(
  db: CourseTransitionDb,
  input: {
    packageId: string;
    sourceCourseId?: string;
    targetCourseId: string;
    studentIds?: string[];
    now?: Date;
  }
): Promise<PackageCourseTransitionResult> {
  const now = input.now ?? new Date();
  const context = await loadTransitionContext(db, {
    packageId: input.packageId,
    sourceCourseId: input.sourceCourseId,
    targetCourseId: input.targetCourseId,
    studentIds: input.studentIds,
    now,
  });
  const eligibleIds = new Set(context.eligibleStudentIds);
  const migratedSessionIds: string[] = [];
  let clearedSubjectCount = 0;

  for (const session of context.movableSessions) {
    const studentId = sessionStudentId(session, eligibleIds);
    if (!studentId) continue;

    const targetSubject = matchCourseTransitionSubject(
      session.class.subject?.name,
      context.targetCourse.subjects
    );
    const targetLevel = targetSubject
      ? matchCourseTransitionLevel(session.class.level?.name, targetSubject.levels)
      : null;
    if (session.class.subjectId && !targetSubject) clearedSubjectCount += 1;

    let targetClass = await db.class.findFirst({
      where: {
        teacherId: session.class.teacherId,
        courseId: context.targetCourse.id,
        subjectId: targetSubject?.id ?? null,
        levelId: targetLevel?.id ?? null,
        campusId: session.class.campusId,
        roomId: session.class.roomId,
        capacity: 1,
        OR: [
          { oneOnOneStudentId: studentId },
          { enrollments: { some: { studentId } } },
        ],
      },
      select: { id: true },
    });

    if (!targetClass) {
      targetClass = await db.class.create({
        data: {
          teacherId: session.class.teacherId,
          courseId: context.targetCourse.id,
          subjectId: targetSubject?.id ?? null,
          levelId: targetLevel?.id ?? null,
          campusId: session.class.campusId,
          roomId: session.class.roomId,
          capacity: 1,
          oneOnOneStudentId: studentId,
        },
        select: { id: true },
      });
    }

    const duplicate = await db.session.findFirst({
      where: {
        id: { not: session.id },
        classId: targetClass.id,
        startAt: session.startAt,
        endAt: session.endAt,
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("TARGET_SESSION_CONFLICT");

    await db.enrollment.upsert({
      where: { classId_studentId: { classId: targetClass.id, studentId } },
      update: {},
      create: { classId: targetClass.id, studentId },
    });
    await db.session.update({
      where: { id: session.id },
      data: { classId: targetClass.id },
    });
    migratedSessionIds.push(session.id);
  }

  let invalidatedReminderCount = 0;
  if (migratedSessionIds.length > 0) {
    const result = await db.miniappNotificationOutbox.updateMany({
      where: {
        status: "PENDING",
        templateKey: "course_reminder_24h",
        targetType: "Session",
        OR: migratedSessionIds.map((sessionId) => ({ targetId: `${sessionId}:24h` })),
      },
      data: {
        status: "SKIPPED",
        error: COURSE_CHANGE_REMINDER_REQUEUE_ERROR,
      },
    });
    invalidatedReminderCount = result.count;
  }

  return {
    packageId: context.pkg.id,
    oldCourseId: context.sourceCourse.id,
    oldCourseName: context.sourceCourse.name,
    targetCourseId: context.targetCourse.id,
    targetCourseName: context.targetCourse.name,
    eligibleStudentIds: context.eligibleStudentIds,
    futureOneOnOneSessions: context.movableSessions.length,
    futureGroupSessions: context.futureGroupSessions,
    protectedSessions: context.protectedSessions,
    ambiguousSessions: context.ambiguousSessions,
    migratedSessionIds,
    clearedSubjectCount,
    invalidatedReminderCount,
  };
}

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const SIGNIN_THRESHOLD_KEY = "signin_alert_threshold_min";
export const DEFAULT_SIGNIN_ALERT_THRESHOLD_MIN = 10;
const SIGNIN_ALERT_SYNC_LAST_AT_KEY = "signin_alert_sync_last_at";
const SIGNIN_ALERT_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const SIGNIN_LOOKBACK_DAYS = 7;
const FEEDBACK_ALERT_LOOKBACK_DAYS = 60;

export const ALERT_TYPE_TEACHER = "TEACHER_SIGNIN_MISSED";
export const ALERT_TYPE_STUDENT = "STUDENT_SIGNIN_MISSED";
export const ALERT_TYPE_FEEDBACK = "TEACHER_FEEDBACK_OVERDUE";
export const ALERT_ROLE_ADMIN = "ADMIN";
export const ALERT_ROLE_TEACHER = "TEACHER";

type SessionForAlert = {
  id: string;
  classId: string;
  startAt: Date;
  endAt: Date;
  teacherId: string | null;
  studentId: string | null;
  attendances: Array<{ studentId: string; status: string }>;
  feedbacks: Array<{ id: string; teacherId: string; status: string }>;
  class: {
    capacity: number;
    teacherId: string;
    oneOnOneStudentId: string | null;
    enrollments: Array<{ studentId: string }>;
  };
};

type DesiredAlert = {
  sessionId: string;
  alertType: string;
  targetRole: string;
  targetUserId: string | null;
  studentId: string | null;
  scopeKey: string;
};

function toIntSafe(v: string | null | undefined, def: number) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : def;
}

function isMissingTableError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021";
}

async function shouldRunSignInAlertSync(now: Date) {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: SIGNIN_ALERT_SYNC_LAST_AT_KEY },
      select: { value: true },
    });
    if (!row?.value) return true;
    const last = new Date(row.value);
    if (Number.isNaN(last.getTime())) return true;
    return now.getTime() - last.getTime() >= SIGNIN_ALERT_SYNC_MIN_INTERVAL_MS;
  } catch (err) {
    if (isMissingTableError(err)) return true;
    throw err;
  }
}

async function markSignInAlertSyncTime(now: Date) {
  try {
    await prisma.appSetting.upsert({
      where: { key: SIGNIN_ALERT_SYNC_LAST_AT_KEY },
      create: { key: SIGNIN_ALERT_SYNC_LAST_AT_KEY, value: now.toISOString() },
      update: { value: now.toISOString() },
    });
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

export async function getSignInAlertThresholdMin() {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: SIGNIN_THRESHOLD_KEY },
      select: { value: true },
    });
    const n = toIntSafe(row?.value, DEFAULT_SIGNIN_ALERT_THRESHOLD_MIN);
    return Math.max(1, n);
  } catch (err) {
    if (isMissingTableError(err)) return DEFAULT_SIGNIN_ALERT_THRESHOLD_MIN;
    throw err;
  }
}

export async function setSignInAlertThresholdMin(min: number) {
  const v = String(Math.max(1, Math.floor(min)));
  try {
    await prisma.appSetting.upsert({
      where: { key: SIGNIN_THRESHOLD_KEY },
      create: { key: SIGNIN_THRESHOLD_KEY, value: v },
      update: { value: v },
    });
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

function sessionExpectedStudentIds(s: SessionForAlert) {
  const expected =
    s.class.capacity === 1 && s.studentId
      ? [s.studentId]
      : s.class.capacity === 1 && s.class.oneOnOneStudentId
      ? [s.class.oneOnOneStudentId]
      : s.class.capacity === 1 && s.class.enrollments.length > 0
      ? [s.class.enrollments[0].studentId]
      : s.class.enrollments.map((e) => e.studentId);
  const cancelledSet = new Set(
    s.attendances
      .filter((a) => a.status === "EXCUSED")
      .map((a) => a.studentId)
  );
  return expected.filter((sid) => !cancelledSet.has(sid));
}

function teacherSignedIn(s: SessionForAlert) {
  if (s.feedbacks.length > 0) return true;
  return s.attendances.some((a) => a.status !== "UNMARKED");
}

export async function syncSignInAlerts(now = new Date()) {
  const shouldRun = await shouldRunSignInAlertSync(now);
  if (!shouldRun) {
    const thresholdMin = await getSignInAlertThresholdMin();
    return { thresholdMin, activeCount: 0, skipped: true as const };
  }

  const thresholdMin = await getSignInAlertThresholdMin();
  const thresholdAt = new Date(now.getTime() - thresholdMin * 60 * 1000);
  const lookbackSignIn = new Date(now.getTime() - SIGNIN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const lookbackFeedback = new Date(now.getTime() - FEEDBACK_ALERT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const sessions = (await prisma.session.findMany({
    where: {
      startAt: { gte: lookbackFeedback, lte: thresholdAt },
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      feedbacks: { select: { id: true, teacherId: true, status: true } },
      class: { include: { enrollments: { select: { studentId: true } } } },
    },
  })) as SessionForAlert[];

  if (sessions.length === 0) {
    await markSignInAlertSyncTime(now);
    return { thresholdMin, activeCount: 0, skipped: false as const };
  }

  const teacherIds = Array.from(new Set(sessions.map((s) => s.class.teacherId)));
  const teacherUsers = teacherIds.length
    ? await prisma.user.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { id: true, teacherId: true },
      })
    : [];
  const teacherUserIdsByTeacherId = new Map<string, string[]>();
  for (const u of teacherUsers) {
    if (!u.teacherId) continue;
    const arr = teacherUserIdsByTeacherId.get(u.teacherId) ?? [];
    arr.push(u.id);
    teacherUserIdsByTeacherId.set(u.teacherId, arr);
  }

  const desired: DesiredAlert[] = [];
  for (const s of sessions) {
    const inSignInWindow = s.startAt >= lookbackSignIn;
    const actualTeacherId = s.teacherId ?? s.class.teacherId;
    const expected = sessionExpectedStudentIds(s);
    if (expected.length === 0) continue;
    const markedSet = new Set(
      s.attendances.filter((a) => a.status !== "UNMARKED").map((a) => a.studentId)
    );
    const missingStudents = inSignInWindow ? expected.filter((sid) => !markedSet.has(sid)) : [];
    const missTeacher = inSignInWindow && !teacherSignedIn(s);
    const feedbackDueAt = new Date(new Date(s.endAt).getTime() + 12 * 60 * 60 * 1000);
    const teacherFeedback = s.feedbacks.find((f) => f.teacherId === actualTeacherId) ?? null;
    const missFeedback = now > feedbackDueAt && (!teacherFeedback || teacherFeedback.status === "PROXY_DRAFT");

    const teacherUserIds = teacherUserIdsByTeacherId.get(actualTeacherId) ?? [];

    if (missTeacher) {
      desired.push({
        sessionId: s.id,
        alertType: ALERT_TYPE_TEACHER,
        targetRole: ALERT_ROLE_ADMIN,
        targetUserId: null,
        studentId: null,
        scopeKey: "admin",
      });
      for (const uid of teacherUserIds) {
        desired.push({
          sessionId: s.id,
          alertType: ALERT_TYPE_TEACHER,
          targetRole: ALERT_ROLE_TEACHER,
          targetUserId: uid,
          studentId: null,
          scopeKey: `user:${uid}`,
        });
      }
    }

    for (const sid of missingStudents) {
      desired.push({
        sessionId: s.id,
        alertType: ALERT_TYPE_STUDENT,
        targetRole: ALERT_ROLE_ADMIN,
        targetUserId: null,
        studentId: sid,
        scopeKey: `admin:student:${sid}`,
      });
      for (const uid of teacherUserIds) {
        desired.push({
          sessionId: s.id,
          alertType: ALERT_TYPE_STUDENT,
          targetRole: ALERT_ROLE_TEACHER,
          targetUserId: uid,
          studentId: sid,
          scopeKey: `user:${uid}:student:${sid}`,
        });
      }
    }

    if (missFeedback) {
      desired.push({
        sessionId: s.id,
        alertType: ALERT_TYPE_FEEDBACK,
        targetRole: ALERT_ROLE_ADMIN,
        targetUserId: null,
        studentId: null,
        scopeKey: "admin:feedback",
      });
      for (const uid of teacherUserIds) {
        desired.push({
          sessionId: s.id,
          alertType: ALERT_TYPE_FEEDBACK,
          targetRole: ALERT_ROLE_TEACHER,
          targetUserId: uid,
          studentId: null,
          scopeKey: `user:${uid}:feedback`,
        });
      }
    }
  }

  const dedup = new Map<string, DesiredAlert>();
  for (const d of desired) {
    const key = `${d.sessionId}|${d.alertType}|${d.targetRole}|${d.scopeKey}`;
    dedup.set(key, d);
  }
  const desiredList = Array.from(dedup.values());
  const desiredKeySet = new Set(dedup.keys());
  const sessionIds = Array.from(new Set(sessions.map((s) => s.id)));

  try {
    const existingOpen = await prisma.signInAlert.findMany({
      where: {
        sessionId: { in: sessionIds },
        resolvedAt: null,
        OR: [{ targetRole: ALERT_ROLE_ADMIN }, { targetRole: ALERT_ROLE_TEACHER }],
      },
      select: {
        id: true,
        sessionId: true,
        alertType: true,
        targetRole: true,
        scopeKey: true,
      },
    });

    for (const d of desiredList) {
      await prisma.signInAlert.upsert({
        where: {
          sessionId_alertType_targetRole_scopeKey: {
            sessionId: d.sessionId,
            alertType: d.alertType,
            targetRole: d.targetRole,
            scopeKey: d.scopeKey,
          },
        },
        create: {
          sessionId: d.sessionId,
          alertType: d.alertType,
          targetRole: d.targetRole,
          targetUserId: d.targetUserId,
          studentId: d.studentId,
          scopeKey: d.scopeKey,
          thresholdMin,
          firstTriggeredAt: now,
          lastTriggeredAt: now,
        },
        update: {
          targetUserId: d.targetUserId,
          studentId: d.studentId,
          thresholdMin,
          lastTriggeredAt: now,
          resolvedAt: null,
        },
      });
    }

    for (const e of existingOpen) {
      const key = `${e.sessionId}|${e.alertType}|${e.targetRole}|${e.scopeKey}`;
      if (!desiredKeySet.has(key)) {
        await prisma.signInAlert.update({
          where: { id: e.id },
          data: { resolvedAt: now },
        });
      }
    }
  } catch (err) {
    if (isMissingTableError(err)) return { thresholdMin, activeCount: 0 };
    throw err;
  }

  await markSignInAlertSyncTime(now);
  return { thresholdMin, activeCount: desiredList.length, skipped: false as const };
}

export async function getAdminOpenSignInAlerts(limit = 200) {
  try {
    return await prisma.signInAlert.findMany({
      where: { targetRole: ALERT_ROLE_ADMIN, resolvedAt: null },
      include: {
        session: {
          include: {
            student: { select: { id: true, name: true } },
            class: {
              include: {
                course: true,
                subject: true,
                level: true,
                teacher: true,
                campus: true,
                room: true,
                oneOnOneStudent: { select: { id: true, name: true } },
                enrollments: { include: { student: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ lastTriggeredAt: "desc" }],
      take: limit,
    });
  } catch (err) {
    if (isMissingTableError(err)) return [];
    throw err;
  }
}

export async function getTeacherOpenSignInAlerts(userId: string, limit = 200) {
  try {
    return await prisma.signInAlert.findMany({
      where: {
        targetRole: ALERT_ROLE_TEACHER,
        targetUserId: userId,
        resolvedAt: null,
      },
      include: {
        session: {
          include: {
            student: { select: { id: true, name: true } },
            class: {
              include: {
                course: true,
                subject: true,
                level: true,
                teacher: true,
                campus: true,
                room: true,
                oneOnOneStudent: { select: { id: true, name: true } },
                enrollments: { include: { student: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ lastTriggeredAt: "desc" }],
      take: limit,
    });
  } catch (err) {
    if (isMissingTableError(err)) return [];
    throw err;
  }
}

export async function getTeacherVisibleSignInAlerts(
  userId: string,
  opts?: { limit?: number; keepResolvedHours?: number }
) {
  const limit = opts?.limit ?? 200;
  const keepResolvedHours = opts?.keepResolvedHours ?? 72;
  const resolvedSince = new Date(Date.now() - keepResolvedHours * 60 * 60 * 1000);

  try {
    return await prisma.signInAlert.findMany({
      where: {
        targetRole: ALERT_ROLE_TEACHER,
        targetUserId: userId,
        OR: [{ resolvedAt: null }, { resolvedAt: { gte: resolvedSince } }],
      },
      include: {
        session: {
          include: {
            student: { select: { id: true, name: true } },
            class: {
              include: {
                course: true,
                subject: true,
                level: true,
                teacher: true,
                campus: true,
                room: true,
                oneOnOneStudent: { select: { id: true, name: true } },
                enrollments: { include: { student: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ resolvedAt: "asc" }, { lastTriggeredAt: "desc" }],
      take: limit,
    });
  } catch (err) {
    if (isMissingTableError(err)) return [];
    throw err;
  }
}

export async function getOpenSignInAlertCountsForUser(userId: string | null) {
  try {
    const [adminCount, teacherCount] = await Promise.all([
      prisma.signInAlert.count({ where: { targetRole: ALERT_ROLE_ADMIN, resolvedAt: null } }),
      userId
        ? prisma.signInAlert.count({
            where: { targetRole: ALERT_ROLE_TEACHER, targetUserId: userId, resolvedAt: null },
          })
        : Promise.resolve(0),
    ]);
    return { adminCount, teacherCount };
  } catch (err) {
    if (isMissingTableError(err)) return { adminCount: 0, teacherCount: 0 };
    throw err;
  }
}

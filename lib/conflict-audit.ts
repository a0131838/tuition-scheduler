import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CONFLICT_AUDIT_LAST_DAY_KEY = "conflict_audit_last_day";
const CONFLICT_AUDIT_LAST_RESULT_KEY = "conflict_audit_last_result";
const CONFLICT_AUDIT_VERSION_KEY = "conflict_audit_version";
const CONFLICT_AUDIT_VERSION = "3";
const CONFLICT_AUTOFIX_LAST_DAY_KEY = "conflict_autofix_last_day";
const CONFLICT_AUTOFIX_LAST_RESULT_KEY = "conflict_autofix_last_result";

type AuditSummary = {
  day: string;
  scannedFrom: string;
  scannedTo: string;
  teacherConflictPairs: number;
  teacherAppointmentOverlapPairs: number;
  roomConflictPairs: number;
  duplicateSessionGroups: number;
  capacityIssues: number;
  sessionTimeIssues: number;
  totalIssues: number;
  sample: string[];
};

function isMissingTableError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021";
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function overlaps(a: { startAt: Date; endAt: Date }, b: { startAt: Date; endAt: Date }) {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

function isFullyCancelledSessionForConflict(s: any) {
  const cancelledSet = new Set(
    Array.isArray(s.attendances) ? s.attendances.filter((a: any) => a?.status === "EXCUSED").map((a: any) => a.studentId as string) : []
  );
  if (cancelledSet.size === 0) return false;

  if (s.class?.capacity === 1) {
    const sid =
      (s.studentId as string | null) ?? (s.class?.oneOnOneStudentId as string | null) ?? (s.class?.enrollments?.[0]?.studentId as string | null);
    return !!sid && cancelledSet.has(sid);
  }

  const expected = Array.isArray(s.class?.enrollments) ? s.class.enrollments.map((e: any) => e.studentId as string) : [];
  if (expected.length === 0) return false;
  return expected.every((sid: string) => cancelledSet.has(sid));
}

function collectOverlapPairs<T extends { startAt: Date; endAt: Date }>(groups: Map<string, T[]>) {
  let pairs = 0;
  for (const list of groups.values()) {
    list.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[j].startAt >= list[i].endAt) break;
        if (overlaps(list[i], list[j])) pairs += 1;
      }
    }
  }
  return pairs;
}

export async function runConflictAuditSnapshot(referenceDate = new Date(), horizonDays = 30): Promise<AuditSummary> {
  const dayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + horizonDays);
  dayEnd.setHours(23, 59, 59, 999);

  const [sessionsRaw, classes, appointments] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { gte: dayStart, lte: dayEnd } },
      include: {
        attendances: { select: { studentId: true, status: true } },
        class: {
          select: {
            id: true,
            teacherId: true,
            roomId: true,
            capacity: true,
            oneOnOneStudentId: true,
            enrollments: { select: { studentId: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.class.findMany({
      include: { room: true },
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { startAt: "asc" },
    }),
  ]);
  const sessions = sessionsRaw.filter((s) => !isFullyCancelledSessionForConflict(s));

  const byTeacher = new Map<string, typeof sessions>();
  const byRoom = new Map<string, typeof sessions>();
  const duplicateKeyMap = new Map<string, number>();

  for (const s of sessions) {
    const teacherId = s.teacherId ?? s.class.teacherId;
    if (teacherId) {
      const arr = byTeacher.get(teacherId) ?? [];
      arr.push(s);
      byTeacher.set(teacherId, arr);
    }
    if (s.class.roomId) {
      const arr = byRoom.get(s.class.roomId) ?? [];
      arr.push(s);
      byRoom.set(s.class.roomId, arr);
    }
    const key = `${s.classId}|${new Date(s.startAt).toISOString()}|${new Date(s.endAt).toISOString()}`;
    duplicateKeyMap.set(key, (duplicateKeyMap.get(key) ?? 0) + 1);
  }

  const teacherConflictPairs = collectOverlapPairs(byTeacher);
  const roomConflictPairs = collectOverlapPairs(byRoom);
  const sessionsByTeacher = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const tid = s.teacherId ?? s.class.teacherId;
    const arr = sessionsByTeacher.get(tid) ?? [];
    arr.push(s);
    sessionsByTeacher.set(tid, arr);
  }
  const apptsByTeacher = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const arr = apptsByTeacher.get(a.teacherId) ?? [];
    arr.push(a);
    apptsByTeacher.set(a.teacherId, arr);
  }
  let teacherAppointmentOverlapPairs = 0;
  for (const [tid, appts] of apptsByTeacher.entries()) {
    const sList = (sessionsByTeacher.get(tid) ?? []).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const aList = appts.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    let i = 0;
    let j = 0;
    while (i < sList.length && j < aList.length) {
      const s = sList[i];
      const a = aList[j];
      if (a.endAt <= s.startAt) {
        j += 1;
        continue;
      }
      if (s.endAt <= a.startAt) {
        i += 1;
        continue;
      }
      teacherAppointmentOverlapPairs += 1;
      if (s.endAt <= a.endAt) i += 1;
      else j += 1;
    }
  }
  const duplicateSessionGroups = Array.from(duplicateKeyMap.values()).filter((n) => n > 1).length;
  const capacityIssues = classes.filter((c) => c.room && c.capacity > c.room.capacity).length;
  const sessionTimeIssues = sessions.filter((s) => s.endAt <= s.startAt).length;
  const totalIssues =
    teacherConflictPairs +
    teacherAppointmentOverlapPairs +
    roomConflictPairs +
    duplicateSessionGroups +
    capacityIssues +
    sessionTimeIssues;

  const sample: string[] = [];
  if (teacherConflictPairs > 0) sample.push(`Teacher overlap pairs: ${teacherConflictPairs}`);
  if (teacherAppointmentOverlapPairs > 0)
    sample.push(`Teacher appointment overlap pairs: ${teacherAppointmentOverlapPairs}`);
  if (roomConflictPairs > 0) sample.push(`Room overlap pairs: ${roomConflictPairs}`);
  if (duplicateSessionGroups > 0) sample.push(`Duplicate session groups: ${duplicateSessionGroups}`);
  if (capacityIssues > 0) sample.push(`Class capacity > room capacity: ${capacityIssues}`);
  if (sessionTimeIssues > 0) sample.push(`Invalid session time ranges: ${sessionTimeIssues}`);
  if (sample.length === 0) sample.push("No conflict found.");

  return {
    day: ymd(referenceDate),
    scannedFrom: ymd(dayStart),
    scannedTo: ymd(dayEnd),
    teacherConflictPairs,
    teacherAppointmentOverlapPairs,
    roomConflictPairs,
    duplicateSessionGroups,
    capacityIssues,
    sessionTimeIssues,
    totalIssues,
    sample,
  };
}

export async function getOrRunDailyConflictAudit(referenceDate = new Date()): Promise<AuditSummary> {
  const today = ymd(referenceDate);
  try {
    const [lastDayRow, lastResultRow, versionRow] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: CONFLICT_AUDIT_LAST_DAY_KEY }, select: { value: true } }),
      prisma.appSetting.findUnique({ where: { key: CONFLICT_AUDIT_LAST_RESULT_KEY }, select: { value: true } }),
      prisma.appSetting.findUnique({ where: { key: CONFLICT_AUDIT_VERSION_KEY }, select: { value: true } }),
    ]);

    if (lastDayRow?.value === today && lastResultRow?.value && versionRow?.value === CONFLICT_AUDIT_VERSION) {
      try {
        return JSON.parse(lastResultRow.value) as AuditSummary;
      } catch {
        // fallback to rerun
      }
    }

    const snapshot = await runConflictAuditSnapshot(referenceDate);
    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUDIT_LAST_DAY_KEY },
        create: { key: CONFLICT_AUDIT_LAST_DAY_KEY, value: today },
        update: { value: today },
      }),
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUDIT_LAST_RESULT_KEY },
        create: { key: CONFLICT_AUDIT_LAST_RESULT_KEY, value: JSON.stringify(snapshot) },
        update: { value: JSON.stringify(snapshot) },
      }),
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUDIT_VERSION_KEY },
        create: { key: CONFLICT_AUDIT_VERSION_KEY, value: CONFLICT_AUDIT_VERSION },
        update: { value: CONFLICT_AUDIT_VERSION },
      }),
    ]);
    return snapshot;
  } catch (err) {
    if (isMissingTableError(err)) {
      return runConflictAuditSnapshot(referenceDate);
    }
    throw err;
  }
}

export async function refreshDailyConflictAudit(referenceDate = new Date()) {
  const today = ymd(referenceDate);
  const snapshot = await runConflictAuditSnapshot(referenceDate);
  try {
    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUDIT_LAST_DAY_KEY },
        create: { key: CONFLICT_AUDIT_LAST_DAY_KEY, value: today },
        update: { value: today },
      }),
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUDIT_LAST_RESULT_KEY },
        create: { key: CONFLICT_AUDIT_LAST_RESULT_KEY, value: JSON.stringify(snapshot) },
        update: { value: JSON.stringify(snapshot) },
      }),
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUDIT_VERSION_KEY },
        create: { key: CONFLICT_AUDIT_VERSION_KEY, value: CONFLICT_AUDIT_VERSION },
        update: { value: CONFLICT_AUDIT_VERSION },
      }),
    ]);
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  return snapshot;
}

export type TeacherConflictAutoFixResult = {
  scannedFrom: string;
  scannedTo: string;
  detectedPairs: number;
  fixedSessions: number;
  skippedPairs: number;
  notes: string[];
};

function collectTeacherConflictPairs(
  sessions: Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    teacherId: string | null;
    class: { teacherId: string };
  }>
) {
  const byTeacher = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const effectiveTeacherId = s.teacherId ?? s.class.teacherId;
    const arr = byTeacher.get(effectiveTeacherId) ?? [];
    arr.push(s);
    byTeacher.set(effectiveTeacherId, arr);
  }
  const pairs: Array<{ teacherId: string; a: (typeof sessions)[number]; b: (typeof sessions)[number] }> = [];
  for (const [teacherId, list] of byTeacher.entries()) {
    list.sort((x, y) => +new Date(x.startAt) - +new Date(y.startAt));
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[j].startAt >= list[i].endAt) break;
        if (overlaps(list[i], list[j])) pairs.push({ teacherId, a: list[i], b: list[j] });
      }
    }
  }
  return pairs;
}

export async function autoResolveTeacherConflicts(referenceDate = new Date(), horizonDays = 30): Promise<TeacherConflictAutoFixResult> {
  const dayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + horizonDays);
  dayEnd.setHours(23, 59, 59, 999);

  const [sessionsRaw, appointments] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { gte: dayStart, lte: dayEnd } },
      include: {
        attendances: { select: { studentId: true, status: true } },
        class: {
          select: {
            teacherId: true,
            capacity: true,
            oneOnOneStudentId: true,
            enrollments: { select: { studentId: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { startAt: "asc" },
    }),
  ]);
  const sessions = sessionsRaw.filter((s) => !isFullyCancelledSessionForConflict(s));

  const pairs = collectTeacherConflictPairs(sessions);
  const apptPairs: Array<{ session: (typeof sessions)[number]; appointment: (typeof appointments)[number] }> = [];
  for (const s of sessions) {
    const tid = s.teacherId ?? s.class.teacherId;
    const overlapsAppt = appointments.filter(
      (a) => a.teacherId === tid && overlaps({ startAt: s.startAt, endAt: s.endAt }, { startAt: a.startAt, endAt: a.endAt })
    );
    for (const a of overlapsAppt) apptPairs.push({ session: s, appointment: a });
  }
  const notes: string[] = [];
  let fixedSessions = 0;
  let skippedPairs = 0;
  const fixedSessionSet = new Set<string>();
  const canFallbackToClassTeacher = (c: { id: string; startAt: Date; endAt: Date; teacherId: string | null; class: { teacherId: string } }) => {
    const fallbackTeacherId = c.class.teacherId;
    const conflictWithFallbackSession = sessions.some((other) => {
      if (other.id === c.id) return false;
      const otherTeacherId = other.teacherId ?? other.class.teacherId;
      if (otherTeacherId !== fallbackTeacherId) return false;
      return overlaps(c, other);
    });
    if (conflictWithFallbackSession) return false;
    const conflictWithFallbackAppointment = appointments.some((a) => {
      if (a.teacherId !== fallbackTeacherId) return false;
      return overlaps(c, a);
    });
    if (conflictWithFallbackAppointment) return false;
    return true;
  };

  for (const p of pairs) {
    // Safe auto-fix strategy:
    // if one side is teacher override (session.teacherId) and can fall back to class default teacher without creating new conflict,
    // clear teacherId to use class.teacherId.
    const candidates = [p.a, p.b].filter((s) => !!s.teacherId && s.teacherId !== s.class.teacherId);
    if (candidates.length === 0) {
      skippedPairs += 1;
      continue;
    }

    let fixed = false;
    for (const c of candidates) {
      if (fixedSessionSet.has(c.id)) continue;
      if (!canFallbackToClassTeacher(c)) continue;

      await prisma.session.update({
        where: { id: c.id },
        data: { teacherId: null },
      });
      fixedSessionSet.add(c.id);
      fixedSessions += 1;
      notes.push(`Session ${c.id} fallback to class teacher.`);
      fixed = true;
      break;
    }
    if (!fixed) skippedPairs += 1;
  }

  for (const p of apptPairs) {
    const s = p.session;
    if (fixedSessionSet.has(s.id)) continue;
    if (!s.teacherId || s.teacherId === s.class.teacherId) {
      skippedPairs += 1;
      continue;
    }
    if (!canFallbackToClassTeacher(s)) {
      skippedPairs += 1;
      continue;
    }
    await prisma.session.update({
      where: { id: s.id },
      data: { teacherId: null },
    });
    fixedSessionSet.add(s.id);
    fixedSessions += 1;
    notes.push(`Session ${s.id} fallback to class teacher (appointment overlap).`);
  }

  return {
    scannedFrom: ymd(dayStart),
    scannedTo: ymd(dayEnd),
    detectedPairs: pairs.length + apptPairs.length,
    fixedSessions,
    skippedPairs,
    notes: notes.slice(0, 20),
  };
}

export async function saveAutoFixResult(result: TeacherConflictAutoFixResult, referenceDate = new Date()) {
  const today = ymd(referenceDate);
  try {
    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUTOFIX_LAST_DAY_KEY },
        create: { key: CONFLICT_AUTOFIX_LAST_DAY_KEY, value: today },
        update: { value: today },
      }),
      prisma.appSetting.upsert({
        where: { key: CONFLICT_AUTOFIX_LAST_RESULT_KEY },
        create: { key: CONFLICT_AUTOFIX_LAST_RESULT_KEY, value: JSON.stringify(result) },
        update: { value: JSON.stringify(result) },
      }),
    ]);
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

export async function getLatestAutoFixResult() {
  try {
    const [dayRow, resultRow] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: CONFLICT_AUTOFIX_LAST_DAY_KEY }, select: { value: true } }),
      prisma.appSetting.findUnique({ where: { key: CONFLICT_AUTOFIX_LAST_RESULT_KEY }, select: { value: true } }),
    ]);
    if (!resultRow?.value) return null;
    let parsed: TeacherConflictAutoFixResult | null = null;
    try {
      parsed = JSON.parse(resultRow.value) as TeacherConflictAutoFixResult;
    } catch {
      parsed = null;
    }
    if (!parsed) return null;
    return { day: dayRow?.value ?? null, result: parsed };
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

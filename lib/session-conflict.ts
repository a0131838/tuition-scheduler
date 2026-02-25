type AttendanceLite = {
  studentId: string;
  status: string;
  excusedCharge?: boolean | null;
  deductedMinutes?: number | null;
  deductedCount?: number | null;
};

type SessionConflictLite = {
  id?: string;
  classId?: string;
  studentId?: string | null;
  class?: {
    capacity?: number | null;
    oneOnOneStudentId?: string | null;
    enrollments?: Array<{ studentId?: string | null }> | null;
  } | null;
  attendances?: AttendanceLite[] | null;
};

function isZeroOrFalse(v: unknown) {
  return !v || Number(v) <= 0;
}

function isExcusedNoCharge(a: AttendanceLite) {
  return (
    a.status === "EXCUSED" &&
    !a.excusedCharge &&
    isZeroOrFalse(a.deductedMinutes) &&
    isZeroOrFalse(a.deductedCount)
  );
}

export function shouldIgnoreTeacherConflictSession(session: SessionConflictLite, schedulingStudentId?: string | null) {
  const rows = session.attendances ?? [];

  if (schedulingStudentId) {
    const self = rows.find((a) => a.studentId === schedulingStudentId);
    if (self?.status === "EXCUSED") return true;
  }

  const isOneOnOne = Number(session.class?.capacity ?? 0) === 1;
  if (!isOneOnOne) {
    const expected = (session.class?.enrollments ?? [])
      .map((e) => e?.studentId)
      .filter(Boolean) as string[];
    if (expected.length === 0) return false;
    return expected.every((sid) => {
      const studentRows = rows.filter((a) => a.studentId === sid);
      return studentRows.length > 0 && studentRows.every(isExcusedNoCharge);
    });
  }

  const oneOnOneStudentId = session.studentId ?? session.class?.oneOnOneStudentId ?? null;
  if (!oneOnOneStudentId) return false;

  const studentRows = rows.filter((a) => a.studentId === oneOnOneStudentId);
  if (studentRows.length === 0) return false;

  return studentRows.every(isExcusedNoCharge);
}

export function pickTeacherSessionConflict<T extends SessionConflictLite>(
  sessions: T[],
  schedulingStudentId?: string | null
) {
  return sessions.find((s) => !shouldIgnoreTeacherConflictSession(s, schedulingStudentId)) ?? null;
}

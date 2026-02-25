type AttendanceLite = {
  studentId: string;
  status: string;
  excusedCharge?: boolean | null;
  deductedMinutes?: number | null;
  deductedCount?: number | null;
};

type SessionConflictLite = {
  studentId?: string | null;
  class?: {
    capacity?: number | null;
    oneOnOneStudentId?: string | null;
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
  if (!isOneOnOne) return false;

  const oneOnOneStudentId = session.studentId ?? session.class?.oneOnOneStudentId ?? null;
  if (!oneOnOneStudentId) return false;

  const studentRows = rows.filter((a) => a.studentId === oneOnOneStudentId);
  if (studentRows.length === 0) return false;

  return studentRows.every(isExcusedNoCharge);
}


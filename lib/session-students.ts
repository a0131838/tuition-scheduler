type StudentLike = {
  id?: string | null;
  name?: string | null;
};

type EnrollmentLike = {
  studentId?: string | null;
  student?: StudentLike | null;
};

type AttendanceLike = {
  studentId?: string | null;
  status?: string | null;
};

type SessionLike = {
  studentId?: string | null;
  student?: StudentLike | null;
  attendances?: AttendanceLike[] | null;
  class?: {
    capacity?: number | null;
    oneOnOneStudentId?: string | null;
    oneOnOneStudent?: StudentLike | null;
    enrollments?: EnrollmentLike[] | null;
  } | null;
};

export type SessionStudent = {
  id: string;
  name: string | null;
};

export function getCancelledSessionStudentIds(session: SessionLike) {
  return new Set(
    Array.isArray(session.attendances)
      ? session.attendances
          .filter((row) => row?.status === "EXCUSED" && row?.studentId)
          .map((row) => String(row.studentId))
      : []
  );
}

export function getSessionStudents(session: SessionLike): SessionStudent[] {
  const enrollments = Array.isArray(session.class?.enrollments) ? session.class?.enrollments ?? [] : [];
  const enrollmentStudents = enrollments
    .map((row) => ({
      id: row.studentId ?? row.student?.id ?? null,
      name: row.student?.name ?? null,
    }))
    .filter((row): row is SessionStudent => Boolean(row.id));

  if (session.class?.capacity === 1) {
    const candidateId =
      session.student?.id ??
      session.studentId ??
      session.class?.oneOnOneStudent?.id ??
      session.class?.oneOnOneStudentId ??
      enrollmentStudents[0]?.id ??
      null;
    if (!candidateId) return [];
    const candidateName =
      session.student?.name ??
      session.class?.oneOnOneStudent?.name ??
      enrollmentStudents.find((row) => row.id === candidateId)?.name ??
      null;
    return [{ id: candidateId, name: candidateName }];
  }

  const dedup = new Map<string, SessionStudent>();
  for (const row of enrollmentStudents) {
    if (!dedup.has(row.id)) dedup.set(row.id, row);
  }
  return Array.from(dedup.values());
}

export function getVisibleSessionStudents(session: SessionLike): SessionStudent[] {
  const cancelledSet = getCancelledSessionStudentIds(session);
  return getSessionStudents(session).filter((row) => !cancelledSet.has(row.id));
}

export function getVisibleSessionStudentNames(session: SessionLike) {
  return getVisibleSessionStudents(session)
    .map((row) => row.name)
    .filter((name): name is string => Boolean(name));
}

export function isSessionFullyCancelled(session: SessionLike) {
  const allStudents = getSessionStudents(session);
  if (allStudents.length === 0) return false;
  return getVisibleSessionStudents(session).length === 0 && getCancelledSessionStudentIds(session).size > 0;
}

const STUDENT_ID_PATTERN = /\bstudentId\s*(?:=|:)\s*([0-9a-fA-F-]{20,})/i;
const ATTENDANCE_ID_PATTERN = /\battendanceId\s*(?:=|:)\s*([0-9a-fA-F-]{20,})/i;

export function parsePackageLedgerReferences(note: string | null | undefined) {
  const text = String(note ?? "");
  return {
    studentId: text.match(STUDENT_ID_PATTERN)?.[1] ?? null,
    attendanceId: text.match(ATTENDANCE_ID_PATTERN)?.[1] ?? null,
  };
}

export function cleanPackageLedgerNote(note: string | null | undefined) {
  return String(note ?? "")
    .replace(/\s*\bstudentId\s*(?:=|:)\s*\S+/gi, "")
    .replace(/\s*\battendanceId\s*(?:=|:)\s*\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function resolvePackageLedgerStudentId(
  note: string | null | undefined,
  attendanceStudentIdById: ReadonlyMap<string, string>,
) {
  const references = parsePackageLedgerReferences(note);
  if (references.studentId) return references.studentId;
  if (!references.attendanceId) return null;
  return attendanceStudentIdById.get(references.attendanceId) ?? null;
}

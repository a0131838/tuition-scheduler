export function studentScheduleTeacherName(session: {
  teacher?: { name: string } | null;
  class: { teacher: { name: string } };
}) {
  return session.teacher?.name ?? session.class.teacher.name;
}

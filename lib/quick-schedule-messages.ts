export function formatStudentQuickScheduleConflictReason(input: { existingSessionLabel: string; exactTimeslot: boolean }) {
  if (input.exactTimeslot) {
    return `学生已有同时间课次 / Session already exists at this time. Existing session: ${input.existingSessionLabel}`;
  }
  return `学生时间冲突（不是所选教室被占用）/ Student time conflict, not selected-room conflict. Existing session: ${input.existingSessionLabel}`;
}

export function buildTopUpMinutesUpdate(current: { remainingMinutes: number | null; totalMinutes: number | null }, addMinutes: number) {
  const curTotal = current.totalMinutes ?? current.remainingMinutes ?? 0;
  return {
    remainingMinutes: current.remainingMinutes == null ? addMinutes : { increment: addMinutes as number },
    totalMinutes: current.totalMinutes == null ? curTotal + addMinutes : { increment: addMinutes as number },
  };
}

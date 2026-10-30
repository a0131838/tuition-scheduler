export const DEFAULT_TEACHING_RULE = { maxContinuousMinutes: 240, minBreakMinutes: 15 };
export type TeachingInterval = { startAt: Date; endAt: Date; candidate?: boolean };
export function inspectContinuousTeaching(intervals: TeachingInterval[], rule = DEFAULT_TEACHING_RULE) {
  let end = -Infinity, minutes = 0, includesCandidate = false;
  for (const row of [...intervals].sort((a,b)=>+a.startAt-+b.startAt)) {
    const start=+row.startAt, finish=+row.endAt;
    if (!Number.isFinite(start)||!Number.isFinite(finish)||finish<=start) throw new Error('Invalid teaching interval');
    if ((start-end)/60000 >= rule.minBreakMinutes) { minutes=0; includesCandidate=false; end=start; }
    minutes += Math.max(0, finish-Math.max(start,end))/60000; end=Math.max(end,finish);includesCandidate ||= Boolean(row.candidate);
    if (includesCandidate && minutes>rule.maxContinuousMinutes) return { blocked:true, minutes, ...rule };
  }
  return { blocked:false,minutes,...rule };
}

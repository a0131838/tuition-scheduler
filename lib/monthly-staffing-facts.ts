import {resolveAttendanceRoster} from './session-attendance-roster';
import {formatBusinessDateOnly} from './date-only';

type Lesson = Parameters<typeof resolveAttendanceRoster>[0] & {attendances: Array<{studentId:string;status:string}>};
/** Cancelled students do not consume instruction time; ambiguous ownership stays unallocated. */
export function monthlyStaffingLessonFacts(session: Lesson) {
  const roster=resolveAttendanceRoster(session);
  const cancelled=new Set(session.attendances.filter(row=>row.status==='EXCUSED').map(row=>row.studentId));
  const studentIds=roster.students.map(row=>row.id).filter(id=>!cancelled.has(id));
  return {studentIds,needsReview:roster.needsReview,teacherBusy:roster.needsReview||studentIds.length>0};
}

/** Weekly frequency alone cannot establish this month's total instruction minutes. */
export function confirmedMonthlyDemand(item:{intent:string|null;expectedMinutes:number|null}):number|null {
  if(!['KEEP','CHANGE'].includes(item.intent??''))return null;
  return item.expectedMinutes!=null && Number.isFinite(item.expectedMinutes) && item.expectedMinutes>=0 ? item.expectedMinutes : null;
}

/** Clip overnight appointments to business dates and the month before counting availability. */
export function monthlyBusyDateIntervals(start:Date,end:Date,range:{start:Date;end:Date}) {
  const out:Array<{date:string;startMin:number;endMin:number}>=[];
  let cursor=Math.max(start.getTime(),range.start.getTime());const stop=Math.min(end.getTime(),range.end.getTime());
  while(cursor<stop){
    const date=formatBusinessDateOnly(new Date(cursor)),dayStart=new Date(`${date}T00:00:00+08:00`).getTime();
    const next=Math.min(stop,dayStart+86400000);
    out.push({date,startMin:(cursor-dayStart)/60000,endMin:(next-dayStart)/60000});cursor=next;
  }
  return out;
}

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { resolveAttendanceRoster } from './session-attendance-roster';

export const completionSessionInclude = {
  class: { include: { enrollments: { select: { studentId: true } }, teacher: { select: { name: true } } } },
  teacher: { select: { name: true } },
  attendances: { select: { studentId: true, status: true } },
} satisfies Prisma.SessionInclude;
type Lesson = Prisma.SessionGetPayload<{ include: typeof completionSessionInclude }>;
type Scope = { studentId: string; courseId: string; month: Date };
function inMonth(date: Date, month: Date) {
  const key = (d: Date) => new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 7);
  return key(date) === key(month);
}
export function isFormalMonthlyLesson(s: Lesson, scope: Scope) {
  const roster = resolveAttendanceRoster(s);
  return !roster.needsReview && roster.students.some(r => r.id === scope.studentId)
    && s.class.courseId === scope.courseId && inMonth(s.startAt, scope.month)
    && s.endAt > s.startAt && !s.attendances.some(a => a.studentId === scope.studentId && a.status === 'EXCUSED');
}
function snapshot(s: Lesson, scope: Scope) {
  return { id: s.id, classId: s.classId, studentId: scope.studentId, courseId: scope.courseId,
    teacherId: s.teacherId ?? s.class.teacherId, startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() };
}
type Snapshot = ReturnType<typeof snapshot>;
export type MonthlyScheduleEvidence = { version: 1; verifiedAt: string; actorName: string; reason: string; expectedSessionCount: number; offerIds: string[]; sessions: Snapshot[] };
export function readMonthlyScheduleEvidence(value: unknown): MonthlyScheduleEvidence | null {
  const v = value as MonthlyScheduleEvidence | null;
  if (!v || v.version !== 1 || typeof v.verifiedAt !== 'string' || !Number.isFinite(new Date(v.verifiedAt).getTime()) || typeof v.actorName !== 'string' || typeof v.reason !== 'string' || !Array.isArray(v.sessions) || !v.sessions.length || v.sessions.length > 100
    || v.sessions.some(s => !s || typeof s.id !== 'string' || typeof s.startAt !== 'string' || typeof s.endAt !== 'string')
    || !Number.isInteger(v.expectedSessionCount) || v.sessions.length !== v.expectedSessionCount) return null;
  return v;
}
export function verifyMonthlySchedule(input: Scope & { sessions: Lesson[]; ids: string[]; expectedSessionCount: number;
  reason: string; actorName: string; expectedMinutes: number | null;
  offers: Array<{ id: string; teacherId: string; sessionDatesJson: unknown }> }): MonthlyScheduleEvidence {
  const fail = (en: string, zh: string): never => { throw new Error(`${en} / ${zh}`); };
  if (!input.ids.length || input.ids.length > 100 || new Set(input.ids).size !== input.ids.length
    || input.sessions.length !== input.ids.length || input.sessions.some(s => !input.ids.includes(s.id)))
    fail('Select specific formal lessons', '请选择具体正式课次，不得重复或缺失');
  if (!Number.isInteger(input.expectedSessionCount) || input.expectedSessionCount < 1 || input.expectedSessionCount !== input.sessions.length)
    fail('Selected lessons must match the confirmed monthly total', '所选课次数必须与确认的本月总次数一致');
  if (input.reason.trim().length < 10) fail('Record the confirmation basis (at least 10 characters)', '请记录整月安排的核验依据（至少10字）');
  if (input.sessions.some(s => !isFormalMonthlyLesson(s, input))) fail('Lesson month, course, student or cancellation state does not match', '课次月份、课程、学生或取消状态不符合要求');
  const ordered = [...input.sessions].sort((a,b) => a.startAt.getTime() - b.startAt.getTime());
  if (ordered.some((s,i) => i > 0 && ordered[i-1].endAt > s.startAt)) fail('Selected lessons overlap', '所选课次时间重叠');
  const minutes = ordered.reduce((sum,s) => sum + (s.endAt.getTime()-s.startAt.getTime())/60000,0);
  if (input.expectedMinutes && minutes < input.expectedMinutes) fail('Selected lessons do not cover the recorded monthly minutes', '所选课次未覆盖已记录的整月预计分钟数，请先核对家长需求');
  for (const offer of input.offers) {
    const dates = offer.sessionDatesJson;
    if (!Array.isArray(dates) || !dates.length) fail('Accepted option has incomplete dates; review it first', '已确认方案缺少完整日期，请先核对');
    for (const date of dates as Array<{startAt?:string;endAt?:string}>) {
      if (!date || !ordered.some(s => (s.teacherId ?? s.class.teacherId) === offer.teacherId
        && s.startAt.getTime() === new Date(date.startAt ?? '').getTime() && s.endAt.getTime() === new Date(date.endAt ?? '').getTime()))
        fail('Not all confirmed option dates and teachers have formal lessons', '已确认方案的日期、时间和老师尚未全部对应正式课次');
    }
  }
  return { version: 1, verifiedAt: new Date().toISOString(), actorName: input.actorName,
    reason: input.reason.trim(), expectedSessionCount: input.expectedSessionCount, offerIds: input.offers.map(o=>o.id), sessions: ordered.map(s=>snapshot(s,input)) };
}
/** Read-only evidence review: stored completion never silently substitutes for current lesson facts. */
export async function monthlyCompletionReviews(items: Array<{id:string;status:string;studentId:string;courseId:string;scheduleEvidenceJson:unknown}>, month: Date) {
  const scheduled = items.filter(i=>i.status==='SCHEDULED');
  const ids = [...new Set(scheduled.flatMap(i=>readMonthlyScheduleEvidence(i.scheduleEvidenceJson)?.sessions.map(s=>s.id)??[]))];
  const sessions = ids.length ? await prisma.session.findMany({where:{id:{in:ids}},include:completionSessionInclude}) : [];
  const map = new Map(sessions.map(s=>[s.id,s]));
  return new Map(scheduled.map(item=>{
    const evidence=readMonthlyScheduleEvidence(item.scheduleEvidenceJson);
    const valid=!!evidence && evidence.sessions.every(old=>{
      const current=map.get(old.id),scope={studentId:item.studentId,courseId:item.courseId,month};
      return !!current && isFormalMonthlyLesson(current,scope) && Object.entries(snapshot(current,scope)).every(([key,value])=>old[key as keyof Snapshot]===value);
    });
    return [item.id, {needsReview:!valid, evidence}] as const;
  }));
}
export async function monthlyCompletionCandidates(month: Date, courseIds: string[]) {
  const business=new Date(month.getTime()+8*3600000);
  const end=new Date(Date.UTC(business.getUTCFullYear(),business.getUTCMonth()+1,1)-8*3600000);
  return prisma.session.findMany({where:{startAt:{gte:month,lt:end},class:{courseId:{in:courseIds}}},include:completionSessionInclude,orderBy:{startAt:'asc'},take:2000});
}

export type FeedbackActivity = 'TEACHING'|'EXAM_ONLY'|'NON_TEACHING';
export type FeedbackPolicySession = {id?:string;classId?:string;teacherId?:string|null;studentId?:string|null;startAt?:Date|string;endAt?:Date|string;class?:{teacherId?:string|null;capacity?:number;oneOnOneStudentId?:string|null;enrollments?:Array<{studentId:string}>};feedbackPolicyJson?:unknown};
function iso(value:Date|string|undefined){const d=value===undefined?null:new Date(value);return d&&!Number.isNaN(d.getTime())?d.toISOString():null;}
export function feedbackPolicyScope(s:FeedbackPolicySession){const ids=s.class?.capacity===1?[s.studentId??s.class?.oneOnOneStudentId??(s.class?.enrollments?.length===1?s.class.enrollments[0].studentId:undefined)].filter((x):x is string=>!!x):(s.class?.enrollments??[]).map(x=>x.studentId);return {studentIds:[...new Set(ids)].sort().join("|"),sessionId:s.id??null,classId:s.classId??null,teacherId:s.teacherId??s.class?.teacherId??null,studentId:s.studentId??null,startAt:iso(s.startAt),endAt:iso(s.endAt)};}
export function feedbackPolicyState(s:FeedbackPolicySession){
 const raw=s.feedbackPolicyJson;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {exempt:false,stale:!!raw,activity:'TEACHING' as FeedbackActivity,reason:''};
 const r=raw as Record<string,unknown>,activity=r.activity;
 const valid=r.version===1&&['TEACHING','EXAM_ONLY','NON_TEACHING'].includes(String(activity))&&typeof r.reason==='string'&&r.reason.trim().length>=10&&typeof r.actor==='string'&&!!r.actor&&typeof r.reviewedAt==='string'&&!Number.isNaN(new Date(r.reviewedAt).getTime())&&typeof r.scope==='object'&&r.scope!==null;
 if(!valid)return {exempt:false,stale:true,activity:'TEACHING' as FeedbackActivity,reason:''};
 const scope=feedbackPolicyScope(s),stored=r.scope as Record<string,unknown>;
 const fresh=!!scope.studentIds&&!!scope.sessionId&&!!scope.classId&&!!scope.teacherId&&!!scope.startAt&&!!scope.endAt&&Object.entries(scope).every(([k,v])=>stored[k]===v);
 return {exempt:fresh&&activity!=='TEACHING',stale:!fresh,activity:activity as FeedbackActivity,reason:r.reason as string,reviewedBy:r.actor as string,reviewedAt:r.reviewedAt as string};
}
export function needsTeachingFeedback(s:FeedbackPolicySession){return !feedbackPolicyState(s).exempt;}

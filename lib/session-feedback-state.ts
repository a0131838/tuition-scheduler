import {needsTeachingFeedback,type FeedbackPolicySession} from "./session-feedback-policy";
/** A proxy draft is preparation, never proof of a teacher's completed feedback. */
export type FeedbackEvidence = {teacherId?: string | null; status?: string | null; isProxyDraft?: boolean | null; content?: string | null};
export function isFinalTeacherFeedback(feedback: FeedbackEvidence | null | undefined): boolean {
 return !!feedback && !feedback.isProxyDraft && (feedback.status==='ON_TIME'||feedback.status==='LATE') && (feedback.content===undefined || Boolean(feedback.content?.trim()));
}
export type SessionFeedbackState = 'EXEMPT'|'NOT_DUE'|'MISSING'|'PROXY_DRAFT'|'SUBMITTED';
export function sessionFeedbackState(input:FeedbackPolicySession & {endAt:Date|string;responsibleTeacherId:string;feedbacks:FeedbackEvidence[]},now=new Date()):SessionFeedbackState {
 const feedback=input.feedbacks.find(f=>f.teacherId===input.responsibleTeacherId);
 if(isFinalTeacherFeedback(feedback))return 'SUBMITTED';
 if(!needsTeachingFeedback(input))return 'EXEMPT';
 if(new Date(input.endAt).getTime()>now.getTime())return 'NOT_DUE';
 return feedback?.isProxyDraft||feedback?.status==='PROXY_DRAFT'?'PROXY_DRAFT':'MISSING';
}
export function isPendingFeedback(state:SessionFeedbackState){return state==='MISSING'||state==='PROXY_DRAFT';}

/** A student's cancellation does not exempt classmates who attended the same lesson. */
export function studentLessonFeedbackState(input:Parameters<typeof sessionFeedbackState>[0] & {attendances:Array<{studentId:string;status:string}>},studentId:string,now=new Date()):SessionFeedbackState|'CANCELLED' {
 if(input.attendances.some(a=>a.studentId===studentId&&a.status==='EXCUSED'))return 'CANCELLED';
 return sessionFeedbackState(input,now);
}

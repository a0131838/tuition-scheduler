/** A proxy draft is preparation, never proof of a teacher's completed feedback. */
export type FeedbackEvidence = {teacherId?: string | null; status?: string | null; isProxyDraft?: boolean | null; content?: string | null};
export function isFinalTeacherFeedback(feedback: FeedbackEvidence | null | undefined): boolean {
 return !!feedback && !feedback.isProxyDraft && (feedback.status==='ON_TIME'||feedback.status==='LATE') && (feedback.content===undefined || Boolean(feedback.content?.trim()));
}
export type SessionFeedbackState = 'NOT_DUE'|'MISSING'|'PROXY_DRAFT'|'SUBMITTED';
export function sessionFeedbackState(input:{endAt:Date|string;responsibleTeacherId:string;feedbacks:FeedbackEvidence[]},now=new Date()):SessionFeedbackState {
 const feedback=input.feedbacks.find(f=>f.teacherId===input.responsibleTeacherId);
 if(isFinalTeacherFeedback(feedback))return 'SUBMITTED';
 if(new Date(input.endAt).getTime()>now.getTime())return 'NOT_DUE';
 return feedback?.isProxyDraft||feedback?.status==='PROXY_DRAFT'?'PROXY_DRAFT':'MISSING';
}
export function isPendingFeedback(state:SessionFeedbackState){return state==='MISSING'||state==='PROXY_DRAFT';}

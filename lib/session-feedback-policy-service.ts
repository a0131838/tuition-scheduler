import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {feedbackPolicyScope,type FeedbackPolicySession,type FeedbackActivity} from './session-feedback-policy';
import {isFinalTeacherFeedback} from './session-feedback-state';
export function feedbackPolicyFingerprint(s:FeedbackPolicySession){return createHash('sha256').update(JSON.stringify({scope:feedbackPolicyScope(s),policy:s.feedbackPolicyJson??null})).digest('hex');}
export type FeedbackPolicyInput={sessionId:string;fingerprint:string;requestKey:string;activity:FeedbackActivity;reason:string;acknowledged:boolean;actorEmail:string};
export async function saveFeedbackPolicyInTransaction(tx:Prisma.TransactionClient,input:FeedbackPolicyInput){
 const reason=typeof input.reason==='string'?input.reason.trim():'';
 if(!['TEACHING','EXAM_ONLY','NON_TEACHING'].includes(input.activity)||reason.length<10||reason.length>2000||!input.actorEmail||!input.acknowledged||!/^[a-zA-Z0-9-]{20,80}$/.test(input.requestKey))throw new Error('Select activity, explain the review and acknowledge its scope / 请选择活动类型、填写至少10字核对依据并确认范围');
 await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${input.sessionId} FOR UPDATE`;
 const session=await tx.session.findUnique({where:{id:input.sessionId},include:{class:{select:{teacherId:true,capacity:true,oneOnOneStudentId:true,enrollments:{select:{studentId:true}}}},feedbacks:{select:{teacherId:true,status:true,isProxyDraft:true}}}});
 if(!session)throw new Error('Session not found / 课次不存在');
 const before=session.feedbackPolicyJson as Record<string,unknown>|null;
 if(before?.requestKey===input.requestKey){if(before.activity!==input.activity||before.reason!==reason)throw new Error('Request key already used / 操作编号已使用');return {alreadySaved:true};}
 if(feedbackPolicyFingerprint(session)!==input.fingerprint)throw new Error('Session changed; reload and review / 课次已变更，请刷新重新核对');
 if(input.activity!=='TEACHING'&&!feedbackPolicyScope(session).studentIds)throw new Error('Session students need review / 请先核对课次学生');
 if(input.activity!=='TEACHING'&&session.feedbacks.some(isFinalTeacherFeedback))throw new Error('Existing final feedback needs review before exemption / 已有正式反馈，请先核对实际授课情况');
 const after={version:1,activity:input.activity,reason,actor:input.actorEmail,reviewedAt:new Date().toISOString(),requestKey:input.requestKey,scope:feedbackPolicyScope(session)};
 await tx.session.update({where:{id:session.id},data:{feedbackPolicyJson:after}});
 if(input.activity!=='TEACHING')await tx.signInAlert.updateMany({where:{sessionId:session.id,alertType:'TEACHER_FEEDBACK_OVERDUE',resolvedAt:null},data:{resolvedAt:new Date()}});
 await tx.auditLog.create({data:{actorEmail:input.actorEmail,actorRole:'ADMIN',module:'TEACHING',action:'REVIEW_FEEDBACK_POLICY',entityType:'Session',entityId:session.id,meta:JSON.parse(JSON.stringify({before,after,attendanceUnchanged:true,ledgerUnchanged:true,payrollUnchanged:true}))}});
 return {alreadySaved:false};
}
export async function saveFeedbackPolicy(input:FeedbackPolicyInput){
 try{return await prisma.$transaction(tx=>saveFeedbackPolicyInTransaction(tx,input),{isolationLevel:'Serializable',timeout:15000});}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&(e.code==='P2034'||e.code==='P2010'&&['40001','40P01'].includes(String(e.meta?.code))))throw new Error('Session changed concurrently; reload and retry / 课次同时发生变更，请刷新后重试');throw e;}
}

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {ensureFeedbackCommunicationTasks} from './parent-communication-center';
import {needsTeachingFeedback} from './session-feedback-policy';
import {resolveAttendanceRoster} from './session-attendance-roster';
/** Serialize submission against the administrator's activity review. */
export async function saveTeacherFeedbackReviewed(sessionId:string,teacherId:string,args:Prisma.SessionFeedbackUpsertArgs){
 try{return await prisma.$transaction(async tx=>{
  const submittingUserId=args.create.submittedByUserId;
  if(submittingUserId)await tx.$queryRaw`SELECT id FROM "User" WHERE id=${submittingUserId} FOR SHARE`;
  const actor=submittingUserId?await tx.user.findUnique({where:{id:submittingUserId},select:{id:true,email:true,name:true,role:true,isObserver:true,teacherId:true}}):null;
  if(submittingUserId&&(!actor||actor.isObserver||actor.teacherId!==teacherId))throw new Error('Teacher account or assignment changed / 老师账号或身份关联已变更');
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
  const session=await tx.session.findUnique({where:{id:sessionId},include:{class:{select:{teacherId:true,capacity:true,oneOnOneStudentId:true,enrollments:{select:{studentId:true}}}}}});
  if(!session||(session.teacherId??session.class.teacherId)!==teacherId)throw new Error('Session assignment changed; reload and review / 课次老师已变更，请刷新核对');
  if(resolveAttendanceRoster(session).needsReview)throw new Error('Student assignment needs review before teaching feedback / 提交教学反馈前，请先核对课次学生归属');
  if(!needsTeachingFeedback(session))throw new Error('Reviewed non-teaching activity; ask teaching management before submitting lesson feedback / 此课次已核对为非教学活动，请先由教务核对再提交教学反馈');
  if(args.where.sessionId_teacherId?.sessionId!==sessionId||args.where.sessionId_teacherId?.teacherId!==teacherId)throw new Error('Feedback scope mismatch / 反馈归属不匹配');
  const before=await tx.sessionFeedback.findUnique({where:{sessionId_teacherId:{sessionId,teacherId}}});
  const submittedAt=args.create.submittedAt instanceof Date?args.create.submittedAt:new Date();
  const feedback=await tx.sessionFeedback.upsert({...args,
   create:{...args.create,submittedAt,reviewStatus:'PENDING_REVIEW',reviewNote:null,isProxyDraft:false,proxyNote:null},
   update:{...args.update,submittedAt,reviewStatus:'PENDING_REVIEW',reviewNote:null,isProxyDraft:false,proxyNote:null},
  });
  // A new teacher submission awaits review. Preserve sent/publication history, stop pending old content.
  const invalidated=await tx.miniappNotificationOutbox.updateMany({where:{targetType:'SessionFeedback',OR:[{targetId:feedback.id},{targetId:{startsWith:feedback.id+':revision:'}}],status:{in:['PENDING','FAILED']}},data:{status:'SKIPPED',error:'Teacher resubmitted feedback; awaiting review / 老师已重新提交反馈，等待审核'}});
  const tasks=await ensureFeedbackCommunicationTasks(feedback.id,tx);
  await tx.auditLog.create({data:{actorEmail:actor?.email??'system-feedback@sgtmanage.local',actorName:actor?.name??'Teacher feedback synchronization',actorRole:actor?.role??'SYSTEM',module:'COMMUNICATION',action:'SUBMIT_TEACHER_FEEDBACK',entityType:'SessionFeedback',entityId:feedback.id,meta:{sessionId,teacherId,submittedByUserId:actor?.id??null,before:before?{content:before.content,reviewStatus:before.reviewStatus,submittedAt:before.submittedAt.toISOString(),publishedAt:before.publishedAt?.toISOString()??null}:null,afterReviewStatus:feedback.reviewStatus,taskIds:tasks.map(task=>task.id),invalidatedCount:invalidated.count}}});
  return feedback;
 },{isolationLevel:'Serializable',timeout:20000});}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&(e.code==='P2034'||e.code==='P2010'&&['40001','40P01'].includes(String(e.meta?.code))))throw new Error('Session changed; reload before submitting / 课次已变更，请刷新后提交');throw e;}
}

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {needsTeachingFeedback} from './session-feedback-policy';
import {resolveAttendanceRoster} from './session-attendance-roster';
/** Serialize submission against the administrator's activity review. */
export async function saveTeacherFeedbackReviewed(sessionId:string,teacherId:string,args:Prisma.SessionFeedbackUpsertArgs){
 try{return await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
  const session=await tx.session.findUnique({where:{id:sessionId},include:{class:{select:{teacherId:true,capacity:true,oneOnOneStudentId:true,enrollments:{select:{studentId:true}}}}}});
  if(!session||(session.teacherId??session.class.teacherId)!==teacherId)throw new Error('Session assignment changed; reload and review / 课次老师已变更，请刷新核对');
  if(resolveAttendanceRoster(session).needsReview)throw new Error('Student assignment needs review before teaching feedback / 提交教学反馈前，请先核对课次学生归属');
  if(!needsTeachingFeedback(session))throw new Error('Reviewed non-teaching activity; ask teaching management before submitting lesson feedback / 此课次已核对为非教学活动，请先由教务核对再提交教学反馈');
  if(args.where.sessionId_teacherId?.sessionId!==sessionId||args.where.sessionId_teacherId?.teacherId!==teacherId)throw new Error('Feedback scope mismatch / 反馈归属不匹配');
  return tx.sessionFeedback.upsert(args);
 },{isolationLevel:'Serializable',timeout:15000});}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&(e.code==='P2034'||e.code==='P2010'&&['40001','40P01'].includes(String(e.meta?.code))))throw new Error('Session changed; reload before submitting / 课次已变更，请刷新后提交');throw e;}
}

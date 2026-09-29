import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {requireCommunicationWriteAccess} from './communication-write-access';
import {resolveAttendanceRoster} from './session-attendance-roster';

const hour=60*60*1000;
/** Queue only the selected recipient's still-valid failure. This never sends a message. */
export async function retryCommunicationNotification(taskId:string,userId:string){
 return prisma.$transaction(async tx=>{
  const actor=await requireCommunicationWriteAccess(tx,userId);
  await tx.$queryRaw`SELECT id FROM "ParentCommunicationTask" WHERE id=${taskId} FOR UPDATE`;
  const task=await tx.parentCommunicationTask.findUnique({where:{id:taskId}});
  if(!task)throw Error('Communication task not found / 沟通任务不存在');
  if(!task.parentId||!task.studentId)throw Error('Recipient identity needs review / 收件家长及学生归属待核对');
  const isFeedback=task.kind==='FEEDBACK';
  if(!isFeedback&&task.kind!=='COURSE_REMINDER_PARENT')throw Error('No supported automatic reminder for this task / 此任务无可重试的自动提醒');
  const feedback=isFeedback&&task.feedbackId?await tx.sessionFeedback.findUnique({where:{id:task.feedbackId}}):null;
  if(isFeedback&&(!feedback||feedback.reviewStatus!=='PUBLISHED'||!feedback.publishedAt||feedback.isProxyDraft||feedback.status==='PROXY_DRAFT'))
   throw Error('Publish the reviewed feedback before retrying / 请先审核发布反馈再重试');
  const sessionId=isFeedback?feedback!.sessionId:task.sessionId;
  if(!sessionId||(task.sessionId&&task.sessionId!==sessionId))throw Error('Exact lesson linkage needs review / 请先核对确切课次关联');
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
  const session=await tx.session.findUnique({where:{id:sessionId},include:{student:true,teacher:true,attendances:true,class:{include:{course:true,subject:true,level:true,teacher:true,campus:true,room:true,oneOnOneStudent:true,enrollments:{include:{student:true}}}}}});
  if(!session)throw Error('Lesson no longer exists; review the reminder / 课次已不存在，请核对提醒');
  const roster=resolveAttendanceRoster(session);
  if(roster.needsReview||!roster.students.some(s=>s.id===task.studentId)||session.attendances.some(a=>a.studentId===task.studentId&&a.status==='EXCUSED'))
   throw Error('Lesson student or cancellation state changed / 课次学生归属或取消状态已变更');
  await tx.$queryRaw`SELECT id FROM "ParentAccount" WHERE id=${task.parentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "ParentStudentLink" WHERE "parentId"=${task.parentId} AND "studentId"=${task.studentId} FOR SHARE`;
  const link=await tx.parentStudentLink.findUnique({where:{parentId_studentId:{parentId:task.parentId,studentId:task.studentId}},include:{parent:true}});
  if(!link||link.parent.status!=='ACTIVE'||!(isFeedback?link.canViewFeedback:link.canViewSchedule))
   throw Error('Current parent binding or permission is unavailable / 当前家长绑定或查看权限已失效');
  let targetId=`${sessionId}:24h`;
  if(isFeedback){
   const publication=await tx.auditLog.findFirst({where:{module:'COMMUNICATION',action:'PUBLISH_FEEDBACK',meta:{path:['feedbackId'],equals:feedback!.id}},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{meta:true}});
   const candidate=(publication?.meta as {notificationTargetId?:unknown}|null)?.notificationTargetId;
   if(publication&&(typeof candidate!=='string'||(candidate!==feedback!.id&&(!candidate.startsWith(`${feedback!.id}:revision:`)||candidate===`${feedback!.id}:revision:`))))
    throw Error('Historical publication identity needs review / 历史发布版本归属待核对');
   if(!publication&&await tx.miniappNotificationOutbox.findFirst({where:{targetType:'SessionFeedback',targetId:{startsWith:`${feedback!.id}:revision:`}},select:{id:true}}))
    throw Error('Historical notification revision needs review / 历史通知版本需先核对');
   targetId=typeof candidate==='string'?candidate:feedback!.id;
  }
  const row=await tx.miniappNotificationOutbox.findFirst({where:{targetType:isFeedback?'SessionFeedback':'Session',targetId,templateKey:isFeedback?'feedback_published':'course_reminder_24h',parentId:task.parentId,studentId:task.studentId,status:'FAILED'}});
  // Repeated retry, invalidated, processing or sent records are left unchanged.
  if(!row)return {...task,retryCount:0};
  if(row.sentAt||!row.openId||row.openId!==link.parent.wechatOpenId)throw Error('Recipient or prior delivery evidence needs review / 收件身份或历史送达证据待核对');
  const now=new Date(),scheduledBase=isFeedback?row.createdAt.getTime():session.startAt.getTime()-24*hour;
  if(now.getTime()>scheduledBase+(isFeedback?7*24:2)*hour)
   throw Error('Original notification window expired; review before a new communication / 原通知时限已过，请核对后另行沟通');
  const student=await tx.student.findUniqueOrThrow({where:{id:task.studentId}});
  const teacherName=session.teacher?.name||session.class.teacher.name;
  const expected:Record<string,unknown>=isFeedback?{
   feedbackId:feedback!.id,sessionId,studentName:student.name,
   courseLabel:[session.class.course.name,session.class.subject?.name].filter(Boolean).join(' / '),teacherName,submittedAt:feedback!.submittedAt.toISOString(),
  }:{
   sessionId,reminderHours:24,startAt:session.startAt.toISOString(),endAt:session.endAt.toISOString(),
   courseName:session.class.course.name,subjectName:session.class.subject?.name||session.class.course.name,
   courseLabel:[session.class.course.name,session.class.subject?.name,session.class.level?.name].filter(Boolean).join(' / '),
   teacherName,studentName:student.name,durationMinutes:Math.max(1,Math.round((session.endAt.getTime()-session.startAt.getTime())/60000)),
   campusName:session.class.campus.name,roomName:session.class.room?.name??null,
   locationLabel:session.class.campus.isOnline?'线上课程':[session.class.campus.name,session.class.room?.name].filter(Boolean).join(' · '),mode:session.class.campus.isOnline?'ONLINE':'OFFLINE',
  };
  const payload=row.payloadJson as Record<string,unknown>|null;
  if(!payload||row.eventType!==(isFeedback?'FEEDBACK_PUBLISHED':'COURSE_REMINDER')||Object.entries(expected).some(([key,value])=>payload[key]!==value))
   throw Error('Notification content no longer matches the current lesson; review before retry / 通知内容与当前课次不一致，请先核对');
  const result=await tx.miniappNotificationOutbox.updateMany({where:{id:row.id,status:'FAILED'},data:{status:'PENDING',error:null}});
  if(result.count)await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'COMMUNICATION',action:'RETRY_AUTOMATIC_NOTIFICATION',entityType:'ParentCommunicationTask',entityId:task.id,meta:{count:result.count,targetId,parentId:task.parentId,studentId:task.studentId,outboxId:row.id,beforeStatus:row.status,beforeError:row.error,originalCreatedAt:row.createdAt.toISOString(),scheduledAtPreserved:row.scheduledAt.toISOString(),invalidatedRevisionsRetained:true}}});
  return {...task,retryCount:result.count};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
}

import {MiniappNotificationOutbox, Prisma} from '@prisma/client';
import {resolveAttendanceRoster} from './session-attendance-roster';

export class InvalidNotificationSource extends Error {}
const invalid = (message:string):never => { throw new InvalidNotificationSource(message); };
const hour = 3600000;

/** Current source facts checked in the claim transaction, after asynchronous template lookup. */
export async function validateNotificationForSend(tx:Prisma.TransactionClient, row:MiniappNotificationOutbox, now:Date) {
  const feedbackNotice = row.templateKey === 'feedback_published';
  const courseNotice = row.templateKey === 'course_reminder_24h';
  const payload = row.payloadJson as Record<string,unknown>|null;
  let session = null;
  let feedback = null;
  if (feedbackNotice || courseNotice) {
    if (!row.studentId || !payload || typeof payload.sessionId !== 'string') invalid('Exact lesson/student needs review / 确切课次及学生归属待核对');
    const sessionId = String(payload!.sessionId);
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
    session = await tx.session.findUnique({where:{id:sessionId},include:{student:true,teacher:true,attendances:true,class:{include:{course:true,subject:true,level:true,teacher:true,campus:true,room:true,oneOnOneStudent:true,enrollments:{include:{student:true}}}}}});
    if (!session) invalid('Lesson missing / 课次已不存在，请核对');
    const roster = resolveAttendanceRoster(session!);
    if (roster.needsReview || !roster.students.some(s=>s.id===row.studentId) || session!.attendances.some(a=>a.studentId===row.studentId && a.status==='EXCUSED'))
      invalid('Lesson student or cancellation changed / 课次学生归属或取消状态已变更');
    if (feedbackNotice) {
      if (typeof payload!.feedbackId !== 'string') invalid('Feedback identity needs review / 反馈归属待核对');
      feedback = await tx.sessionFeedback.findUnique({where:{id:String(payload!.feedbackId)}});
      if (!feedback || feedback.sessionId!==sessionId || feedback.reviewStatus!=='PUBLISHED' || !feedback.publishedAt || feedback.isProxyDraft || feedback.status==='PROXY_DRAFT')
        invalid('Feedback is not currently published / 当前反馈尚未审核发布');
      const publication = await tx.auditLog.findFirst({where:{module:'COMMUNICATION',action:'PUBLISH_FEEDBACK',meta:{path:['feedbackId'],equals:feedback!.id}},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{meta:true}});
      const target = (publication?.meta as {notificationTargetId?:unknown}|null)?.notificationTargetId;
      if (publication && (typeof target!=='string' || (target!==feedback!.id && (!target.startsWith(`${feedback!.id}:revision:`) || target===`${feedback!.id}:revision:`))))
        invalid('Publication identity needs review / 发布版本归属待核对');
      if (!publication && await tx.miniappNotificationOutbox.findFirst({where:{targetType:'SessionFeedback',targetId:{startsWith:`${feedback!.id}:revision:`}},select:{id:true}}))
        invalid('Historical publication needs review / 历史发布版本待核对');
      if (row.targetType!=='SessionFeedback' || row.targetId!==(target??feedback!.id) || row.eventType!=='FEEDBACK_PUBLISHED')
        invalid('Feedback notification has been replaced / 反馈通知版本已替代');
    } else if (row.targetType!=='Session' || row.targetId!==`${sessionId}:24h` || row.eventType!=='COURSE_REMINDER') {
      invalid('Reminder identity needs review / 提醒归属待核对');
    }
    const student = await tx.student.findUniqueOrThrow({where:{id:row.studentId!}});
    const s = session!;
    const expected:Record<string,unknown> = feedbackNotice ? {
      feedbackId:feedback!.id,sessionId,studentName:student.name,
      courseLabel:[s.class.course.name,s.class.subject?.name].filter(Boolean).join(' / '),
      teacherName:s.teacher?.name||s.class.teacher.name,submittedAt:feedback!.submittedAt.toISOString(),
    } : {
      sessionId,reminderHours:24,startAt:s.startAt.toISOString(),endAt:s.endAt.toISOString(),
      courseName:s.class.course.name,subjectName:s.class.subject?.name||s.class.course.name,
      courseLabel:[s.class.course.name,s.class.subject?.name,s.class.level?.name].filter(Boolean).join(' / '),
      teacherName:s.teacher?.name||s.class.teacher.name,studentName:student.name,
      durationMinutes:Math.max(1,Math.round((s.endAt.getTime()-s.startAt.getTime())/60000)),
      campusName:s.class.campus.name,roomName:s.class.room?.name??null,
      locationLabel:s.class.campus.isOnline?'线上课程':[s.class.campus.name,s.class.room?.name].filter(Boolean).join(' · '),mode:s.class.campus.isOnline?'ONLINE':'OFFLINE',
    };
    if (Object.entries(expected).some(([key,value])=>payload![key]!==value)) invalid('Notification content changed / 通知内容已变更，请核对');
    if (courseNotice && now.getTime()<s.startAt.getTime()-24*hour) invalid('Reminder timing changed / 提醒时间已变更，请核对');
  }
  // Keep the existing document/request business policy; only recipient safety is shared.
  await tx.$queryRaw`SELECT id FROM "ParentAccount" WHERE id=${row.parentId} FOR SHARE`;
  const parent = await tx.parentAccount.findUnique({where:{id:row.parentId}});
  if (!parent || parent.status!=='ACTIVE' || (row.openId && row.openId!==parent.wechatOpenId))
    invalid('Recipient binding unavailable or changed / 收件家长绑定失效或已变更');
  if (row.studentId) {
    await tx.$queryRaw`SELECT id FROM "ParentStudentLink" WHERE "parentId"=${row.parentId} AND "studentId"=${row.studentId} FOR SHARE`;
    const link = await tx.parentStudentLink.findUnique({where:{parentId_studentId:{parentId:row.parentId,studentId:row.studentId}}});
    const permission = feedbackNotice?'canViewFeedback':courseNotice?'canViewSchedule':row.templateKey==='request_status_changed'?'canCreateRequests':'canViewFinance';
    if (!link || !link[permission]) invalid('Parent permission unavailable / 家长当前查看权限已失效');
  }
  const expiresAt = courseNotice?session!.startAt.getTime()-22*hour:row.createdAt.getTime()+7*24*hour;
  if (now.getTime()>expiresAt) invalid('Original notification window expired / 原通知时限已过，请核对');
}

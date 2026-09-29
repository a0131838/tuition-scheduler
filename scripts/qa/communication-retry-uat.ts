import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {updateParentCommunicationTask} from '../../lib/parent-communication-center';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r461-fixture.json','utf8')),token=randomUUID();await prisma.authSession.create({data:{userId:actor.id,token,expiresAt:new Date(Date.now()+3600000)}});
  const staff=await createStaffMiniappSession(actor.id),headers={'Content-Type':'application/json'},base='http://127.0.0.1:3149';
  const patch=(id:string,mini=false)=>fetch(base+(mini?'/api/miniapp/staff/communications/':'/api/admin/communications/')+id,{method:'PATCH',headers:mini?{...headers,Authorization:'Bearer '+staff.token}:{...headers,Cookie:'ts_admin_session='+token},body:JSON.stringify({action:'retry_auto'}),redirect:'manual'});
  assert.equal((await patch(f.taskId)).status,200);assert.equal((await prisma.miniappNotificationOutbox.findUniqueOrThrow({where:{id:f.rowId}})).status,'PENDING');
  assert.equal((await patch(f.taskId,true)).status,200);assert.equal(await prisma.auditLog.count({where:{entityId:f.taskId,action:'RETRY_AUTOMATIC_NOTIFICATION'}}),f.auditCount+1);
  const skipped=await prisma.miniappNotificationOutbox.findUniqueOrThrow({where:{id:f.otherId}});assert.equal(skipped.status,'SKIPPED');assert.equal((await patch(f.combinedId,true)).status,409);
  console.log(JSON.stringify({passed:true,webRetry:true,miniappRepeatIdempotent:true,invalidatedRecipientPreserved:true,miniappCombinedLinkRejected:true}));return;
 }
 const student=await prisma.student.create({data:{name:'Isolated retry student '+randomUUID().slice(0,6)}}),otherStudent=await prisma.student.create({data:{name:'Isolated unrelated student'}});
 const parent=await prisma.parentAccount.create({data:{name:'Isolated retry parent',wechatOpenId:'isolated-'+randomUUID()}}),other=await prisma.parentAccount.create({data:{name:'Isolated other parent',wechatOpenId:'isolated-'+randomUUID()}});
 for(const p of [parent,other])await prisma.parentStudentLink.create({data:{parentId:p.id,studentId:student.id}});
 const teacher=await prisma.teacher.create({data:{name:'Isolated retry teacher'}}),course=await prisma.course.create({data:{name:'Isolated retry course'}}),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}}),startAt=new Date(Date.now()+24*3600000),endAt=new Date(startAt.getTime()+3600000);
 const lesson=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt,endAt}});
 const payload={sessionId:lesson.id,reminderHours:24,startAt:startAt.toISOString(),endAt:endAt.toISOString(),courseName:course.name,subjectName:course.name,courseLabel:course.name,teacherName:teacher.name,studentName:student.name,durationMinutes:60,campusName:campus.name,roomName:null,locationLabel:campus.isOnline?'线上课程':campus.name,mode:campus.isOnline?'ONLINE':'OFFLINE'};
 const task=await prisma.parentCommunicationTask.create({data:{taskKey:'retry:'+randomUUID(),kind:'COURSE_REMINDER_PARENT',status:'READY_TO_SEND',studentId:student.id,parentId:parent.id,sessionId:lesson.id,title:'Isolated retry',messageText:'Never delivered'}});
 const scheduledAt=new Date(startAt.getTime()-24*3600000);
 const row=await prisma.miniappNotificationOutbox.create({data:{parentId:parent.id,studentId:student.id,openId:parent.wechatOpenId,templateKey:'course_reminder_24h',eventType:'COURSE_REMINDER',targetType:'Session',targetId:lesson.id+':24h',payloadJson:payload,status:'FAILED',scheduledAt,error:'Isolated failure'}});
 const otherRow=await prisma.miniappNotificationOutbox.create({data:{parentId:other.id,studentId:student.id,openId:other.wechatOpenId,templateKey:row.templateKey,eventType:row.eventType,targetType:row.targetType,targetId:row.targetId,payloadJson:payload,status:'SKIPPED',scheduledAt,error:'Invalidated'}});
 const snapshot=async()=>({outbox:await prisma.miniappNotificationOutbox.findMany({where:{targetId:{startsWith:lesson.id}},orderBy:{id:'asc'}}),audits:await prisma.auditLog.findMany({where:{entityId:task.id},orderBy:{id:'asc'}})});
 const act=async(id=task.id,user=actor)=>{const result=await updateParentCommunicationTask({id,action:'retry_auto',actor:{...user,isObserver:false}});assert(result&&'retryCount' in result);return result;};
 const rejected=async(pattern:RegExp)=>{const before=await snapshot();await assert.rejects(act(),pattern);assert.deepEqual(await snapshot(),before);};
 const ledger=await prisma.packageTxn.count();
 for(const name of ['Policy OBSERVER','Policy FINANCE','Policy TEACHER']){const user=await prisma.user.findFirstOrThrow({where:{name}});await assert.rejects(act(task.id,user),/Read-only|permission/);}
 let fail=true;prisma.$use(async(p,next)=>{if(fail&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.action==='RETRY_AUTOMATIC_NOTIFICATION')throw Error('forced retry audit failure');return next(p);});await rejected(/forced retry audit/);fail=false;
 const race=await Promise.allSettled([act(),act()]);assert(race.some(r=>r.status==='fulfilled'));const retried=await snapshot();assert.equal(retried.audits.length,1);assert.deepEqual(retried.outbox.find(r=>r.id===row.id)?.scheduledAt,scheduledAt);assert.deepEqual(retried.outbox.find(r=>r.id===otherRow.id),otherRow);assert.equal((await act()).retryCount,0);assert.deepEqual(await snapshot(),retried);
 await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{status:'SKIPPED'}});const skipped=await snapshot();assert.equal((await act()).retryCount,0);assert.deepEqual(await snapshot(),skipped);await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{status:'FAILED'}});
 await prisma.session.update({where:{id:lesson.id},data:{startAt:new Date(startAt.getTime()-4*3600000)}});await rejected(/window expired/);await prisma.session.update({where:{id:lesson.id},data:{startAt}});
 await prisma.session.update({where:{id:lesson.id},data:{endAt:new Date(endAt.getTime()+60000)}});await rejected(/content no longer/);await prisma.session.update({where:{id:lesson.id},data:{endAt}});
 const attendance=await prisma.attendance.create({data:{sessionId:lesson.id,studentId:student.id,status:'EXCUSED'}});await rejected(/cancellation/);await prisma.attendance.update({where:{id:attendance.id},data:{status:'UNMARKED'}});
 await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}},data:{canViewSchedule:false}});await rejected(/permission is unavailable/);await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}},data:{canViewSchedule:true}});
 await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{openId:'stale-recipient'}});await rejected(/Recipient or prior/);await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{openId:parent.wechatOpenId}});
 await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{payloadJson:{...payload,teacherName:'Previous teacher'}}});await rejected(/content no longer/);await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{payloadJson:payload}});
 const combined=await prisma.parentCommunicationTask.create({data:{taskKey:'combined:'+randomUUID(),kind:task.kind,status:task.status,studentId:student.id,parentId:parent.id,title:'Combined reminder',messageText:'Multiple lessons'}});await assert.rejects(act(combined.id),/Exact lesson/);
 // Feedback retries use only this recipient and validated latest publication identity.
 const feedback=await prisma.sessionFeedback.create({data:{sessionId:lesson.id,teacherId:teacher.id,content:'Isolated published',reviewStatus:'PUBLISHED',publishedAt:new Date()}});
 const ftask=await prisma.parentCommunicationTask.create({data:{taskKey:'feedback-retry:'+randomUUID(),kind:'FEEDBACK',status:'READY_TO_SEND',feedbackId:feedback.id,sessionId:lesson.id,studentId:student.id,parentId:parent.id,title:'Isolated feedback',messageText:'Not sent'}});
 const fp={feedbackId:feedback.id,sessionId:lesson.id,studentName:student.name,courseLabel:course.name,teacherName:teacher.name,submittedAt:feedback.submittedAt.toISOString()};
 const frow=await prisma.miniappNotificationOutbox.create({data:{parentId:parent.id,studentId:student.id,openId:parent.wechatOpenId,templateKey:'feedback_published',eventType:'FEEDBACK_PUBLISHED',targetType:'SessionFeedback',targetId:feedback.id,payloadJson:fp,status:'FAILED'}});
 const foreign=await prisma.miniappNotificationOutbox.create({data:{parentId:other.id,studentId:student.id,openId:other.wechatOpenId,templateKey:frow.templateKey,eventType:frow.eventType,targetType:frow.targetType,targetId:frow.targetId,payloadJson:fp,status:'FAILED'}});
 await act(ftask.id);assert.deepEqual(await prisma.miniappNotificationOutbox.findUniqueOrThrow({where:{id:foreign.id}}),foreign);
 await prisma.miniappNotificationOutbox.update({where:{id:frow.id},data:{status:'FAILED',createdAt:new Date(Date.now()-8*24*3600000)}});await assert.rejects(act(ftask.id),/window expired/);await prisma.miniappNotificationOutbox.update({where:{id:frow.id},data:{createdAt:new Date(),studentId:otherStudent.id}});assert.equal((await act(ftask.id)).retryCount,0);await prisma.miniappNotificationOutbox.update({where:{id:frow.id},data:{studentId:student.id}});
 const revision=await prisma.miniappNotificationOutbox.create({data:{parentId:parent.id,studentId:student.id,openId:parent.wechatOpenId,templateKey:frow.templateKey,eventType:frow.eventType,targetType:frow.targetType,targetId:feedback.id+':revision:'+randomUUID(),payloadJson:fp,status:'FAILED'}});await assert.rejects(act(ftask.id),/revision needs review/);
 const publication=await prisma.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'COMMUNICATION',action:'PUBLISH_FEEDBACK',entityType:'ParentCommunicationTask',entityId:ftask.id,meta:{feedbackId:feedback.id,notificationTargetId:lesson.id}}});await assert.rejects(act(ftask.id),/identity needs review/);
 await prisma.auditLog.update({where:{id:publication.id},data:{meta:{feedbackId:feedback.id,notificationTargetId:revision.targetId}}});await act(ftask.id);assert.equal((await prisma.miniappNotificationOutbox.findUniqueOrThrow({where:{id:frow.id}})).status,'FAILED');assert.equal((await prisma.miniappNotificationOutbox.findUniqueOrThrow({where:{id:revision.id}})).status,'PENDING');
 await prisma.sessionFeedback.update({where:{id:feedback.id},data:{reviewStatus:'RETURNED'}});await assert.rejects(act(ftask.id),/Publish the reviewed/);
 assert.equal(await prisma.packageTxn.count(),ledger);assert.equal(await prisma.miniappNotificationOutbox.count({where:{id:{in:[row.id,otherRow.id,frow.id,foreign.id,revision.id]},status:'SENT'}}),0);
 writeFileSync('/tmp/sgt-r461-fixture.json',JSON.stringify({taskId:task.id,rowId:row.id,otherId:otherRow.id,combinedId:combined.id,auditCount:await prisma.auditLog.count({where:{entityId:task.id,action:'RETRY_AUTOMATIC_NOTIFICATION'}})}));
 console.log(JSON.stringify({passed:true,exactRecipientAndStudent:true,freshRoles:true,atomicAuditRollback:true,concurrentRepeatOnce:true,scheduledAtPreserved:true,skippedNotRevived:true,originalExpiryNotReset:true,currentLessonAndParentValidity:true,combinedLinkRejected:true,feedbackTargetAndRevisionEvidence:true,noMessagesSentOrLedgerWrites:true}));
}
const timer=setTimeout(()=>{throw Error('Retry UAT timeout');},60000);main().finally(()=>{clearTimeout(timer);return prisma.$disconnect();});

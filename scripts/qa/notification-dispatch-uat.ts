import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {dispatchNotification,invalidateScannedPendingNotification,NotificationAdapter} from '../../lib/notification-dispatch';
import {NotificationTransportError} from '../../lib/notification-transport-outcome';
import {queueMiniappNotification} from '../../lib/miniapp-notifications';
import {communicationDeliveryEvidence} from '../../lib/communication-delivery-evidence';
import {availableServiceTemplate} from '../../lib/wechat-miniapp-service-subscription';

async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 globalThis.fetch=async()=>{throw Error('External HTTP forbidden in isolated sender UAT');};
 const ledgerCount=await prisma.packageTxn.count();
 const student=await prisma.student.create({data:{name:'Isolated dispatch '+randomUUID().slice(0,8)}});
 const otherStudent=await prisma.student.create({data:{name:'Isolated unrelated dispatch student'}});
 const parent=await prisma.parentAccount.create({data:{name:'Isolated dispatch parent',wechatOpenId:'isolated-'+randomUUID()}});
 await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});
 const teacher=await prisma.teacher.create({data:{name:'Isolated dispatch teacher'}}),course=await prisma.course.create({data:{name:'Isolated dispatch course'}}),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 let sequence=0;
 const fixture=async(feedback=false)=>{
  const startAt=new Date(Date.now()+24*3600000-60000+(sequence++)*10),endAt=new Date(startAt.getTime()+3600000);
  const session=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt,endAt}});
  const f=feedback?await prisma.sessionFeedback.create({data:{sessionId:session.id,teacherId:teacher.id,content:'Isolated only',reviewStatus:'PUBLISHED',publishedAt:new Date()}}):null;
  const payload=f?{feedbackId:f.id,sessionId:session.id,studentName:student.name,teacherName:teacher.name,courseLabel:course.name,submittedAt:f.submittedAt.toISOString()}:{sessionId:session.id,reminderHours:24,startAt:startAt.toISOString(),endAt:endAt.toISOString(),courseName:course.name,subjectName:course.name,courseLabel:course.name,teacherName:teacher.name,studentName:student.name,durationMinutes:60,campusName:campus.name,roomName:null,locationLabel:campus.isOnline?'线上课程':campus.name,mode:campus.isOnline?'ONLINE':'OFFLINE'};
  const row=await prisma.miniappNotificationOutbox.create({data:{parentId:parent.id,studentId:student.id,openId:parent.wechatOpenId,templateKey:f?'feedback_published':'course_reminder_24h',eventType:f?'FEEDBACK_PUBLISHED':'COURSE_REMINDER',targetType:f?'SessionFeedback':'Session',targetId:f?f.id:session.id+':24h',payloadJson:payload,scheduledAt:new Date(Date.now()-60000)}});
  return {row,session,f};
 };
 const get=(id:string)=>prisma.miniappNotificationOutbox.findUniqueOrThrow({where:{id}});
 let calls=0,failAction='',queueRaceId='';
 prisma.$use(async(p,next)=>{
  if(p.model==='AuditLog'&&p.action==='create'&&p.args.data.action===failAction)throw Error('forced '+failAction);
  const result=await next(p);
  if(queueRaceId&&p.model==='MiniappNotificationOutbox'&&p.action==='findUnique'&&result?.id===queueRaceId){
   const id=queueRaceId;queueRaceId='';await prisma.miniappNotificationOutbox.update({where:{id},data:{status:'PROCESSING'}});
  }
  return result;
 });
 const adapter:NotificationAdapter<{templateId:string;groupKey:string}>={templateKeys:['course_reminder_24h','feedback_published','invoice_issued'],prefix:'AUTO_NOTIFICATION',available:async()=>({templateId:'isolated-template',groupKey:'learning'}),send:async()=>{calls++;return {errcode:0};}};
 const noSend=async(id:string,expected='skipped',a=adapter)=>{const before=calls;assert.equal(await dispatchNotification(id,a),expected);assert.equal(calls,before);};
 // Fresh validity is evaluated after asynchronous consent lookup, not at the initial scan.
 for(const variant of ['cancel','time','teacher','roster','payload','permission','recipient','inactive','deleted','expired','future']){
  const f=await fixture();
  const a={...adapter,available:async()=>{
   if(variant==='cancel')await prisma.attendance.create({data:{sessionId:f.session.id,studentId:student.id,status:'EXCUSED'}});
   if(variant==='time')await prisma.session.update({where:{id:f.session.id},data:{endAt:new Date(f.session.endAt.getTime()+60000)}});
   if(variant==='teacher')await prisma.teacher.update({where:{id:teacher.id},data:{name:'Changed teacher'}});
   if(variant==='roster')await prisma.session.update({where:{id:f.session.id},data:{studentId:otherStudent.id}});
   if(variant==='payload')await prisma.course.update({where:{id:course.id},data:{name:'Changed course'}});
   if(variant==='permission')await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}},data:{canViewSchedule:false}});
   if(variant==='recipient')await prisma.parentAccount.update({where:{id:parent.id},data:{wechatOpenId:'changed'}});
   if(variant==='inactive')await prisma.parentAccount.update({where:{id:parent.id},data:{status:'INACTIVE'}});
   if(variant==='deleted')await prisma.session.delete({where:{id:f.session.id}});
   if(variant==='expired'||variant==='future'){
    const startAt=new Date(Date.now()+(variant==='expired'?20:25)*3600000),endAt=new Date(startAt.getTime()+3600000);
    await prisma.session.update({where:{id:f.session.id},data:{startAt,endAt}});
    await prisma.miniappNotificationOutbox.update({where:{id:f.row.id},data:{payloadJson:{...(f.row.payloadJson as object),startAt:startAt.toISOString(),endAt:endAt.toISOString()}}});
   }
   return adapter.available(f.row);
  }};
  if(['expired','future'].includes(variant)){await noSend(f.row.id,'unchanged',a);await noSend(f.row.id);}else await noSend(f.row.id,'skipped',a);
  assert.match((await get(f.row.id)).error!,/[\u4e00-\u9fff]/);
  await prisma.teacher.update({where:{id:teacher.id},data:{name:teacher.name}});await prisma.course.update({where:{id:course.id},data:{name:course.name}});
  await prisma.parentAccount.update({where:{id:parent.id},data:{wechatOpenId:parent.wechatOpenId,status:'ACTIVE'}});
  await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}},data:{canViewSchedule:true}});
 }
 for(const variant of ['returned','resubmitted','revision','ambiguous','identity','expiry','feedback-permission']){
  const f=await fixture(true);
  if(variant==='returned')await prisma.sessionFeedback.update({where:{id:f.f!.id},data:{reviewStatus:'RETURNED'}});
  if(variant==='resubmitted')await prisma.sessionFeedback.update({where:{id:f.f!.id},data:{submittedAt:new Date(f.f!.submittedAt.getTime()+1000)}});
  if(variant==='revision'||variant==='identity')await prisma.auditLog.create({data:{actorEmail:'isolated@test.local',module:'COMMUNICATION',action:'PUBLISH_FEEDBACK',meta:{feedbackId:f.f!.id,notificationTargetId:variant==='revision'?f.f!.id+':revision:'+randomUUID():'wrong'}}});
  if(variant==='ambiguous')await prisma.miniappNotificationOutbox.create({data:{parentId:parent.id,templateKey:'feedback_published',eventType:'FEEDBACK_PUBLISHED',targetType:'SessionFeedback',targetId:f.f!.id+':revision:'+randomUUID(),status:'SENT'}});
  if(variant==='expiry')await prisma.miniappNotificationOutbox.update({where:{id:f.row.id},data:{createdAt:new Date(Date.now()-8*86400000),scheduledAt:new Date()}});
  if(variant==='feedback-permission')await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}},data:{canViewFeedback:false}});
  await noSend(f.row.id);
  await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}},data:{canViewFeedback:true}});
 }
 const revisionCurrent=await fixture(true);const currentTarget=revisionCurrent.f!.id+':revision:'+randomUUID();
 await prisma.auditLog.create({data:{actorEmail:'isolated@test.local',module:'COMMUNICATION',action:'PUBLISH_FEEDBACK',meta:{feedbackId:revisionCurrent.f!.id,notificationTargetId:currentTarget}}});
 await prisma.miniappNotificationOutbox.update({where:{id:revisionCurrent.row.id},data:{targetId:currentTarget}});
 assert.equal(await dispatchNotification(revisionCurrent.row.id,adapter),'sent');
 const missingStudent=await fixture();await prisma.miniappNotificationOutbox.update({where:{id:missingStudent.row.id},data:{studentId:null}});await noSend(missingStudent.row.id);
 const waits=await fixture();await noSend(waits.row.id,'waitingConsent',{...adapter,available:async()=>null});assert.equal((await get(waits.row.id)).status,'PENDING');
 const stale=await fixture();await noSend(stale.row.id,'unchanged',{...adapter,available:async()=>{await prisma.miniappNotificationOutbox.update({where:{id:stale.row.id},data:{status:'SENT',sentAt:new Date()}});return adapter.available(stale.row);}});assert.equal((await get(stale.row.id)).status,'SENT');
 const claimed=await fixture();failAction='AUTO_NOTIFICATION_CLAIMED';const beforeClaim=calls;await assert.rejects(dispatchNotification(claimed.row.id,adapter),/forced/);assert.equal(calls,beforeClaim);assert.equal((await get(claimed.row.id)).status,'PENDING');failAction='';
 // Success + audit failure must NEVER enter a resend path.
 const success=await fixture();failAction='AUTO_NOTIFICATION_SENT';const beforeSuccess=calls;await assert.rejects(dispatchNotification(success.row.id,adapter),/forced/);assert.equal(calls,beforeSuccess+1);assert.equal((await get(success.row.id)).status,'PROCESSING');assert.equal((await get(success.row.id)).sentAt,null);failAction='';await noSend(success.row.id,'unchanged');
 assert.equal(await invalidateScannedPendingNotification(success.row,'stale scan'),0);
 await queueMiniappNotification({parentId:parent.id,studentId:student.id,templateKey:success.row.templateKey,eventType:success.row.eventType,targetType:success.row.targetType,targetId:success.row.targetId,payload:{changed:true}});assert.equal((await get(success.row.id)).status,'PROCESSING');
 const queueRace=await fixture();queueRaceId=queueRace.row.id;
 await queueMiniappNotification({parentId:parent.id,studentId:student.id,templateKey:queueRace.row.templateKey,eventType:queueRace.row.eventType,targetType:queueRace.row.targetType,targetId:queueRace.row.targetId,payload:{changed:true}});assert.equal((await get(queueRace.row.id)).status,'PROCESSING');assert.deepEqual((await get(queueRace.row.id)).payloadJson,queueRace.row.payloadJson);
 const refreshed=await fixture();await prisma.miniappNotificationOutbox.update({where:{id:refreshed.row.id},data:{error:'updated scan'}});assert.equal(await invalidateScannedPendingNotification(refreshed.row,'stale scan'),0);
 const invalidated=await fixture();failAction='INVALIDATE_STALE_COURSE_REMINDER';await assert.rejects(invalidateScannedPendingNotification(invalidated.row,'invalid'),/forced/);assert.equal((await get(invalidated.row.id)).status,'PENDING');failAction='';assert.equal(await invalidateScannedPendingNotification(invalidated.row,'invalid'),1);
 await prisma.miniappNotificationOutbox.createMany({data:Array.from({length:1001},()=>({parentId:parent.id,templateKey:'unrelated-quota-history',eventType:'UNRELATED',targetId:randomUUID(),status:'SENT'}))});
 const unknown=await fixture(true);const quotaTemplate='isolated-quota-'+randomUUID();process.env.WECHAT_TEMPLATE_FEEDBACK_PUBLISHED=quotaTemplate;
 await prisma.parentPortalAudit.create({data:{parentId:parent.id,action:'MINIAPP_SUBSCRIPTION_INTENT',targetId:'learning',metaJson:{acceptedTemplateIds:[quotaTemplate]}}});
 assert(await availableServiceTemplate(parent.id,'feedback_published'));
 assert.equal(await dispatchNotification(unknown.row.id,{...adapter,available:async()=>({templateId:quotaTemplate,groupKey:'learning'}),send:async()=>{calls++;throw Error('Lost response');}}),'uncertain');assert.equal((await get(unknown.row.id)).status,'PROCESSING');await noSend(unknown.row.id,'unchanged');assert.equal(await availableServiceTemplate(parent.id,'feedback_published'),null);
 const evidence=(await communicationDeliveryEvidence([{id:'isolated-evidence',kind:'FEEDBACK',feedbackId:unknown.f!.id,sessionId:unknown.session.id,studentId:student.id,parentId:parent.id}])).get('isolated-evidence')!;assert.equal(evidence.status,'PROCESSING');assert(evidence.reviewNeeded);assert.match(evidence.note,/unconfirmed/);
 for(const outcome of ['NOT_SENT','REJECTED'] as const){
  const f=await fixture();assert.equal(await dispatchNotification(f.row.id,{...adapter,send:async()=>{calls++;throw new NotificationTransportError('Isolated rejection / 隔离拒绝',outcome,-1);}}),'retried');
  const row=await get(f.row.id);assert.equal(row.status,'PENDING');assert(row.scheduledAt>new Date());assert.equal(row.sentAt,null);await noSend(row.id,'unchanged');
  await prisma.miniappNotificationOutbox.update({where:{id:row.id},data:{scheduledAt:new Date(),error:'attempt=2; prior rejected'}});
  assert.equal(await dispatchNotification(row.id,{...adapter,send:async()=>{calls++;throw new NotificationTransportError('rejected',outcome,-1);}}),'failed');
 }
 const permanent=await fixture();assert.equal(await dispatchNotification(permanent.row.id,{...adapter,send:async()=>{calls++;throw new NotificationTransportError('Denied','REJECTED',43101);}}),'failed');
 const race=await fixture();const beforeRace=calls;const results=await Promise.allSettled([dispatchNotification(race.row.id,adapter),dispatchNotification(race.row.id,adapter)]);assert(results.some(r=>r.status==='fulfilled'&&r.value==='sent'));assert.equal(calls,beforeRace+1);assert.equal((await get(race.row.id)).status,'SENT');assert((await get(race.row.id)).sentAt);assert.equal(await prisma.auditLog.count({where:{entityId:race.row.id,action:'AUTO_NOTIFICATION_SENT'}}),1);await noSend(race.row.id,'unchanged');
 // Non-learning payload remains untouched by the common transport/outcome boundary.
 const finance=await prisma.miniappNotificationOutbox.create({data:{parentId:parent.id,studentId:student.id,openId:parent.wechatOpenId,templateKey:'invoice_issued',eventType:'INVOICE_ISSUED',targetType:'Invoice',targetId:'isolated-'+randomUUID(),payloadJson:{invoiceNo:'Isolated only'}}});
 assert.equal(await dispatchNotification(finance.id,{...adapter,send:async input=>{calls++;assert.deepEqual(input.payload,{invoiceNo:'Isolated only'});}}),'sent');
 assert.equal(await prisma.packageTxn.count(),ledgerCount);
 console.log(JSON.stringify({passed:true,transport:'injected mock only; external HTTP forbidden',freshSourceAndRecipient:true,currentFeedbackRevision:true,originalExpiry:true,atomicClaimAndOutcomeAudit:true,successAuditFailureNeverRequeued:true,unknownOutcomeRetained:true,consentReservedForUnknown:true,queueRacePreservesProcessing:true,concurrentSendOnce:true,knownFailureBoundedRetry:true,documentPayloadPreserved:true,noFinancialLedgerWrites:true}));
}
const timer=setTimeout(()=>{throw Error('Dispatch UAT timeout');},90000);main().finally(()=>{clearTimeout(timer);return prisma.$disconnect();});

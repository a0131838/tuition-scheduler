import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {observerSessionToken} from '../../lib/observer-mode';
import {updateParentCommunicationTask} from '../../lib/parent-communication-center';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),actor={id:owner.id,name:owner.name!,email:owner.email,role:owner.role};
 const act=(id:string,action:string,data:Record<string,unknown>={})=>updateParentCommunicationTask({id,action,actor,data});
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r447-fixture.json','utf8'));
  const cookie=async(userId:string,observer=false)=>{const token=observer?await observerSessionToken(randomUUID()):randomUUID();await prisma.authSession.create({data:{userId,token,expiresAt:new Date(Date.now()+3600000)}});return `ts_admin_session=${token}`;};
  const ownerCookie=await cookie(owner.id);
  const patch=(Cookie:string,action:string)=>fetch('http://127.0.0.1:3149/api/admin/communications/'+f.taskId,{method:'PATCH',headers:{Cookie,'Content-Type':'application/json'},body:JSON.stringify({action}),redirect:'manual'});
  const observer=await prisma.user.findFirstOrThrow({where:{name:'Policy OBSERVER'}});assert.equal((await patch(await cookie(observer.id,true),'claim')).status,403);
  const before=await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:f.taskId}});
  for(const name of ['Policy OBSERVER','Policy FINANCE','Policy TEACHER']){const user=await prisma.user.findFirstOrThrow({where:{name}});const res=await patch(await cookie(user.id),'claim');assert([303,307,403,409].includes(res.status),name+':'+res.status);assert.deepEqual(await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:f.taskId}}),before);}
  assert.equal((await patch(ownerCookie,'manual_sent')).status,200);
  const sent=await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:f.taskId}});
  assert.equal((await patch(ownerCookie,'manual_sent')).status,200);assert.deepEqual(await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:f.taskId}}),sent);
  assert.equal((await patch(ownerCookie,'claim')).status,409);
  assert.equal(await prisma.auditLog.count({where:{entityId:f.taskId,action:'MARK_MANUAL_SENT'}}),1);
  console.log(JSON.stringify({passed:true,httpOwnerConfirmation:true,httpDuplicateRetainsFirstEvidence:true,httpClosedClaim409:true,observerFinanceTeacherDenied:true}));return;
 }
 const student=await prisma.student.create({data:{name:'Communication atomic UAT '+randomUUID().slice(0,4)}}),parent=await prisma.parentAccount.create({data:{name:'Communication isolated parent'}});
 await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});
 const make=(status='READY_TO_SEND',kind='COURSE_REMINDER_PARENT')=>prisma.parentCommunicationTask.create({data:{taskKey:'atomic-uat:'+randomUUID(),studentId:student.id,parentId:parent.id,status,kind,title:'Isolated communication',messageText:'Not sent to anybody',dueAt:new Date('2047-06-03T00:00:00+08:00')}});
 const task=await make(),snapshot=async()=>({task:await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:task.id}}),link:await prisma.parentStudentLink.findUniqueOrThrow({where:{parentId_studentId:{parentId:parent.id,studentId:student.id}}}),confirm:await prisma.todoReminderConfirm.count({where:{targetId:student.id}}),audits:await prisma.auditLog.count({where:{entityId:task.id}})});
 let failure='',failureTarget=task.id;prisma.$use(async(p,next)=>{if(failure&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.entityId===failureTarget&&p.args.data.action===failure)throw Error('forced communication audit failure');return next(p);});
 for(const [action,audit] of [['claim','CLAIM_TASK'],['transfer','TRANSFER_TASK'],['copy','COPY_WECHAT_MESSAGE'],['manual_sent','MARK_MANUAL_SENT'],['waive','WAIVE_COMMUNICATION_TASK']]){
  failure=audit;const before=await snapshot();await assert.rejects(act(task.id,action,{ownerUserId:owner.id,note:'Isolated exemption basis',wechatGroupName:'Isolated new group'}),/forced communication audit/);assert.deepEqual(await snapshot(),before);
 }
 failure='';const beforeMessages=await prisma.miniappNotificationOutbox.count(),beforeLedger=await prisma.packageTxn.count();
 await act(task.id,'copy');assert.equal((await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:task.id}})).manualSentAt,null);
 const races=await Promise.allSettled([act(task.id,'manual_sent',{wechatGroupName:'Isolated confirmed group'}),act(task.id,'manual_sent',{wechatGroupName:'Isolated confirmed group'})]);assert(races.some(r=>r.status==='fulfilled'));
 const sent=await snapshot();assert.equal(sent.task.status,'COMPLETED');assert.equal(sent.link.wechatGroupName,'Isolated confirmed group');assert.equal(sent.confirm,1);
 await act(task.id,'manual_sent',{wechatGroupName:'Should not overwrite'});assert.deepEqual(await snapshot(),sent);assert.equal(await prisma.auditLog.count({where:{entityId:task.id,action:'MARK_MANUAL_SENT'}}),1);
 await assert.rejects(act(task.id,'claim'),/closed/);await assert.rejects(act(task.id,'waive',{note:'Cannot erase delivery'}),/closed/);
 const waived=await make();await act(waived.id,'waive',{note:'Isolated not applicable'});await assert.rejects(act(waived.id,'claim'),/closed/);await assert.rejects(act(waived.id,'manual_sent'),/closed/);
 for(const status of ['PENDING_REVIEW','RETURNED','ATTENTION']){const row=await make(status);assert.equal((await act(row.id,'claim'))?.status,status);if(status!=='ATTENTION')await assert.rejects(act(row.id,'manual_sent'),/review/);}
 const correction=await make('ATTENTION','COURSE_CHANGE');await assert.rejects(act(correction.id,'manual_sent'),/截图/);
 // Feedback authorization is checked from the current published record even if the task is CLAIMED.
 const fake=await make('CLAIMED','FEEDBACK');await prisma.parentCommunicationTask.update({where:{id:fake.id},data:{feedbackId:'missing-isolated-feedback'}});await assert.rejects(act(fake.id,'manual_sent'),/Publish reviewed/);
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2047-05-31T16:00:00Z')},create:{month:new Date('2047-05-31T16:00:00Z'),status:'CLOSED'},update:{status:'CLOSED'}}),course=await prisma.course.create({data:{name:'Communication monthly isolated'}});
 const item=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,parentId:parent.id,courseId:course.id,token:randomUUID(),status:'NOT_SENT'}});
 const monthly=await make('READY_TO_SEND','MONTHLY_SCHEDULING');await prisma.parentCommunicationTask.update({where:{id:monthly.id},data:{taskKey:`monthly-scheduling:${campaign.id}:${parent.id}`}});await act(monthly.id,'manual_sent');assert.equal((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}})).status,'NOT_SENT');
 // The final manual recipient updates forwarding only in the same audited transaction.
 const teacher=await prisma.teacher.create({data:{name:'Communication feedback isolated teacher'}}),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 const lesson=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt:new Date('2047-06-03T02:00:00Z'),endAt:new Date('2047-06-03T03:00:00Z')}});
 const feedback=await prisma.sessionFeedback.create({data:{sessionId:lesson.id,teacherId:teacher.id,content:'Isolated published content',reviewStatus:'PUBLISHED',publishedAt:new Date()}});
 const first=await make('READY_TO_SEND','FEEDBACK'),last=await make('READY_TO_SEND','FEEDBACK');
 await prisma.parentCommunicationTask.updateMany({where:{id:{in:[first.id,last.id]}},data:{feedbackId:feedback.id}});
 await act(first.id,'manual_sent');assert.equal((await prisma.sessionFeedback.findUniqueOrThrow({where:{id:feedback.id}})).forwardedAt,null);
 failure='MARK_MANUAL_SENT';failureTarget=last.id;await assert.rejects(act(last.id,'manual_sent'),/forced communication audit/);
 assert.equal((await prisma.sessionFeedback.findUniqueOrThrow({where:{id:feedback.id}})).forwardedAt,null);assert.equal((await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:last.id}})).manualSentAt,null);
 failure='';await act(last.id,'manual_sent');assert((await prisma.sessionFeedback.findUniqueOrThrow({where:{id:feedback.id}})).forwardedAt);
 assert.equal(await prisma.miniappNotificationOutbox.count(),beforeMessages);assert.equal(await prisma.packageTxn.count(),beforeLedger);
 const http=await make();writeFileSync('/tmp/sgt-r447-fixture.json',JSON.stringify({taskId:http.id}));
 console.log(JSON.stringify({passed:true,allFiveActionAuditRollback:true,closedTasksCannotReopen:true,reviewStatusPreserved:true,duplicateAndConcurrentSendOnce:true,groupAndReminderAtomic:true,copyDoesNotSend:true,unpublishedFeedbackRejected:true,closedCampaignUnchanged:true,noMessagesOrLedgerWrites:true}));
}
main().finally(()=>prisma.$disconnect());

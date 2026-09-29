import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {ensureFeedbackCommunicationTasks,updateParentCommunicationTask} from '../../lib/parent-communication-center';
import {buildParentFeedbackText} from '../../lib/parent-feedback-format';
import {createParentPortalSession} from '../../lib/parent-portal';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 const content=(marker:string)=>buildParentFeedbackText({lessonFocus:marker,currentFinding:'Clear reasoning',classPerformance:'Good progress',nextPlan:'Practise examples',parentNote:'Review together'});
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r458-fixture.json','utf8')),base='http://127.0.0.1:3149';
  const token=randomUUID();await prisma.authSession.create({data:{userId:actor.id,token,expiresAt:new Date(Date.now()+3600000)}});const headers={Cookie:'ts_admin_session='+token,'Content-Type':'application/json'},url=base+'/api/admin/communications/'+f.taskId;
  const patch=(action:string,data:unknown)=>fetch(url,{method:'PATCH',headers,body:JSON.stringify({action,data})});
  const initial=await prisma.sessionFeedback.findUniqueOrThrow({where:{id:f.feedbackId}});
  assert.equal((await patch('publish_feedback',{parentContent:content('HTTP-PUBLISHED'),expectedFeedbackUpdatedAt:initial.updatedAt.toISOString()})).status,200);
  const parentHeaders={Authorization:'Bearer '+f.parentToken};
  const endpoints=['feedbacks','home','service-progress'];
  assert.equal((await fetch(base+'/api/miniapp/feedbacks/'+f.feedbackId,{headers:parentHeaders})).status,200);
  for(const endpoint of endpoints){const res=await fetch(base+'/api/miniapp/students/'+f.studentId+'/'+endpoint,{headers:parentHeaders});assert.equal(res.status,200);assert((await res.text()).includes(f.feedbackId),endpoint);}
  assert.equal((await patch('return_feedback',{note:'Stale attempt',expectedFeedbackUpdatedAt:initial.updatedAt.toISOString()})).status,409);
  assert.equal((await patch('return_feedback',{note:'Teacher needs to correct the draft'})).status,200);
  assert.equal((await fetch(base+'/api/miniapp/feedbacks/'+f.feedbackId,{headers:parentHeaders})).status,404);
  for(const endpoint of endpoints){const res=await fetch(base+'/api/miniapp/students/'+f.studentId+'/'+endpoint,{headers:parentHeaders});assert.equal(res.status,200);assert(!(await res.text()).includes(f.feedbackId),endpoint);}
  assert.equal((await patch('publish_feedback',{parentContent:content('HTTP-REVISION')})).status,200);
  const observer=await prisma.user.findFirstOrThrow({where:{name:'Policy OBSERVER'}}),observerToken=randomUUID();await prisma.authSession.create({data:{userId:observer.id,token:observerToken,expiresAt:new Date(Date.now()+3600000)}});const denied=await fetch(url,{method:'PATCH',headers:{...headers,Cookie:'ts_admin_session='+observerToken},body:JSON.stringify({action:'return_feedback',data:{note:'Must be denied'}}),redirect:'manual'});assert([303,307,403,409].includes(denied.status));
  console.log(JSON.stringify({passed:true,actualPublishReturnRevision:true,parentListHomeProgressHideUnreviewed:true,staleWebReviewAndObserverDenied:true}));return;
 }
 const student=await prisma.student.create({data:{name:'Isolated feedback review '+randomUUID().slice(0,6)}}),parent=await prisma.parentAccount.create({data:{name:'Isolated feedback parent',wechatOpenId:'isolated-'+randomUUID()}});await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id,canViewFeedback:true,canViewSchedule:true}});
 const teacher=await prisma.teacher.create({data:{name:'Isolated review teacher'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow(),klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 const lesson=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt:new Date(Date.now()-2*3600000),endAt:new Date(Date.now()-3600000)}});
 const feedback=await prisma.sessionFeedback.create({data:{sessionId:lesson.id,teacherId:teacher.id,content:content('TEACHER-DRAFT'),homework:'Write one paragraph',previousHomeworkDone:true}});
 const [task]=await ensureFeedbackCommunicationTasks(feedback.id);assert(task);
 const act=(action:string,data:Record<string,unknown>={},user=actor)=>updateParentCommunicationTask({id:task.id,action,actor:{...user,isObserver:false},data});
 const snapshot=async()=>({feedback:await prisma.sessionFeedback.findUniqueOrThrow({where:{id:feedback.id}}),tasks:await prisma.parentCommunicationTask.findMany({where:{feedbackId:feedback.id},orderBy:{id:'asc'}}),outbox:await prisma.miniappNotificationOutbox.findMany({where:{targetType:'SessionFeedback',OR:[{targetId:feedback.id},{targetId:{startsWith:feedback.id+':revision:'}}]},orderBy:{id:'asc'}}),audits:await prisma.auditLog.findMany({where:{entityId:task.id},orderBy:{id:'asc'}})});
 const ledger=await prisma.packageTxn.count(),attendance=await prisma.attendance.count();let fail='';prisma.$use(async(p,next)=>{if(fail&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.action===fail)throw Error('forced feedback review audit');return next(p);});
 for(const name of ['Policy OBSERVER','Policy FINANCE','Policy TEACHER']){const user=await prisma.user.findFirstOrThrow({where:{name}});await assert.rejects(act('publish_feedback',{parentContent:content('PUBLIC')},user),/Read-only|permission/);}
 const before=await snapshot();fail='PUBLISH_FEEDBACK';await assert.rejects(act('publish_feedback',{parentContent:content('PUBLIC')}),/forced feedback review audit/);assert.deepEqual(await snapshot(),before);fail='';
 const race=await Promise.allSettled([act('publish_feedback',{parentContent:content('PUBLIC')}),act('publish_feedback',{parentContent:content('PUBLIC')})]);assert(race.some(r=>r.status==='fulfilled'));let published=await snapshot();assert.equal(published.audits.filter(a=>a.action==='PUBLISH_FEEDBACK').length,1);assert.equal(published.outbox.length,1);await act('publish_feedback',{parentContent:content('PUBLIC')});assert.deepEqual(await snapshot(),published);
 await act('waive',{note:'No separate manual message required'});await ensureFeedbackCommunicationTasks(feedback.id);assert.equal((await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:task.id}})).status,'WAIVED');
 published=await snapshot();fail='RETURN_FEEDBACK';await assert.rejects(act('return_feedback',{note:'Please correct the examples'}),/forced feedback review audit/);assert.deepEqual(await snapshot(),published);fail='';await act('return_feedback',{note:'Please correct the examples'});const returned=await snapshot();assert.equal(returned.feedback.reviewStatus,'RETURNED');assert(returned.feedback.publishedAt);assert.equal(returned.outbox[0].status,'SKIPPED');assert.equal(returned.tasks[0].status,'WAIVED');await act('return_feedback',{note:'Please correct the examples'});assert.deepEqual(await snapshot(),returned);await assert.rejects(act('retry_auto'),/Publish the reviewed/);
 await act('publish_feedback',{parentContent:content('REVISED-PUBLIC')});const revised=await snapshot();assert.equal(revised.outbox.length,2);assert.equal(revised.outbox.filter(o=>o.status==='PENDING').length,1);assert.deepEqual(revised.feedback.publishedAt,published.feedback.publishedAt);
 const newest=revised.outbox.find(o=>o.status==='PENDING')!;await prisma.miniappNotificationOutbox.update({where:{id:newest.id},data:{status:'FAILED'}});const retryBefore=await snapshot();fail='RETRY_AUTOMATIC_NOTIFICATION';await assert.rejects(act('retry_auto'),/forced feedback review audit/);assert.deepEqual(await snapshot(),retryBefore);fail='';await act('retry_auto');const retried=await snapshot();assert.equal(retried.outbox.filter(o=>o.status==='SKIPPED').length,1);assert.equal(retried.outbox.filter(o=>o.status==='PENDING').length,1);
 // A changed review version and a proxy draft cannot be published.
 await assert.rejects(act('publish_feedback',{parentContent:content('STALE'),expectedFeedbackUpdatedAt:feedback.updatedAt.toISOString()}),/changed/);await prisma.sessionFeedback.update({where:{id:feedback.id},data:{isProxyDraft:true}});await assert.rejects(act('publish_feedback',{parentContent:content('DRAFT')}),/Teacher submission/);await prisma.sessionFeedback.update({where:{id:feedback.id},data:{isProxyDraft:false,reviewStatus:'PENDING_REVIEW'}});
 assert.equal(await prisma.packageTxn.count(),ledger);assert.equal(await prisma.attendance.count(),attendance);assert.deepEqual(await prisma.session.findUniqueOrThrow({where:{id:lesson.id}}),lesson);
 const parentSession=await createParentPortalSession(parent.id);writeFileSync('/tmp/sgt-r458-fixture.json',JSON.stringify({studentId:student.id,feedbackId:feedback.id,taskId:task.id,parentToken:parentSession.token}));console.log(JSON.stringify({passed:true,publicationReturnAuditQueueTaskAtomic:true,concurrentAndRepeatedPublicationOnce:true,freshObserverRoleDenied:true,waivedSameContentPreserved:true,revisionInvalidatesPendingOld:true,originalPublicationTimePreserved:true,noLedgerOrTeachingWrites:true}));
}
const watchdog=setTimeout(()=>{throw Error('Feedback review UAT timed out');},60000);main().finally(()=>{clearTimeout(watchdog);return prisma.$disconnect();});

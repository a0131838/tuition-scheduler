import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {ensureFeedbackCommunicationTasks} from '../../lib/parent-communication-center';
import {renderCommunicationTemplate} from '../../lib/parent-communication-templates';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
async function main(){
  for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){
    const u=new URL(process.env[key]||'');
    assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');
  }
  const before={tasks:await prisma.parentCommunicationTask.count(),outbox:await prisma.miniappNotificationOutbox.count(),ledger:await prisma.packageTxn.count()};
  const rollback=new Error('ROLLBACK_ISOLATED_FIXTURE');
  try {await prisma.$transaction(async tx=>{
    const teacher=await tx.teacher.create({data:{name:'Full copy test '+randomUUID()}});
    const student=await tx.student.create({data:{name:'Isolated full copy'}});
    const course=await tx.course.findFirstOrThrow(),campus=await tx.campus.findFirstOrThrow();
    const klass=await tx.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
    const session=await tx.session.create({data:{classId:klass.id,studentId:student.id,startAt:new Date('2040-10-06T11:00:00Z'),endAt:new Date('2040-10-06T12:30:00Z')}});
    const body='课堂表现 / Performance\n'+('完整段落 Keep every sentence 😀\n'.repeat(60))+'\n课后作业 / Homework: FINAL_HOMEWORK_SENTINEL';
    const feedback=await tx.sessionFeedback.create({data:{sessionId:session.id,teacherId:teacher.id,content:'PRIVATE_RAW_NOTE',parentContent:body,reviewStatus:'PUBLISHED',publishedAt:new Date(),homework:'FINAL_HOMEWORK_SENTINEL'}});
    const [task]=await ensureFeedbackCommunicationTasks(feedback.id,tx);
    assert(task.messageText.includes(body));assert(!task.messageText.includes('PRIVATE_RAW_NOTE'));assert.equal(task.status,'READY_TO_SEND');
    const template=await tx.parentCommunicationTemplate.findFirstOrThrow({where:{code:'FEEDBACK_PUBLISHED',status:'PUBLISHED'},orderBy:{version:'desc'}});
    const compact=body.replace(/\s+/g,' ').trim().slice(0,260)+'…';
    const legacyMessage=renderCommunicationTemplate(template.content,{...(task.templateVariables as any),feedbackSummary:compact});
    const source=hash(JSON.stringify({content:body,homework:feedback.homework,performance:feedback.classPerformance,previousHomeworkDone:feedback.previousHomeworkDone,actualStartAt:feedback.actualStartAt,actualEndAt:feedback.actualEndAt}));
    const legacy={messageText:legacyMessage,contentFingerprint:hash(`${source}\n${legacyMessage}`)};
    await tx.parentCommunicationTask.update({where:{id:task.id},data:legacy});
    const [upgraded]=await ensureFeedbackCommunicationTasks(feedback.id,tx);
    assert.equal(upgraded.id,task.id);assert(upgraded.messageText.includes(body));assert.equal(upgraded.manualSentAt,null);
    for(const status of ['COMPLETED','WAIVED']){
      const snapshot=await tx.parentCommunicationTask.update({where:{id:task.id},data:{...legacy,status,manualSentAt:status==='COMPLETED'?new Date():null}});
      const count=await tx.parentCommunicationTask.count();
      await ensureFeedbackCommunicationTasks(feedback.id,tx);
      assert.deepEqual(await tx.parentCommunicationTask.findUniqueOrThrow({where:{id:task.id}}),snapshot);
      assert.equal(await tx.parentCommunicationTask.count(),count);
    }
    await tx.parentCommunicationTask.update({where:{id:task.id},data:{status:'COMPLETED',manualSentAt:new Date()}});
    await tx.sessionFeedback.update({where:{id:feedback.id},data:{parentContent:body+'\nGENUINE_CHANGED_TAIL'}});
    const [correction]=await ensureFeedbackCommunicationTasks(feedback.id,tx);
    assert.notEqual(correction.id,task.id);assert(correction.messageText.endsWith('miniapp.') && correction.messageText.includes('GENUINE_CHANGED_TAIL'));
    await tx.sessionFeedback.update({where:{id:feedback.id},data:{reviewStatus:'PENDING_REVIEW',content:'UNREVIEWED_NEW_SUBMISSION'}});
    const [pending]=await ensureFeedbackCommunicationTasks(feedback.id,tx);assert.equal(pending.status,'PENDING_REVIEW');
    assert.equal(await tx.miniappNotificationOutbox.count(),before.outbox);assert.equal(await tx.packageTxn.count(),before.ledger);
    throw rollback;
  },{timeout:30000});}catch(e){if(e!==rollback)throw e;}
  assert.equal(await prisma.parentCommunicationTask.count(),before.tasks);
  console.log(JSON.stringify({passed:true,fullPublishedBody:true,legacyUnsentUpgraded:true,completedAndWaivedUnchanged:true,realRevisionStillCreatesCorrection:true,unreviewedNotReady:true,noNotificationsOrLedgerWrites:true,fixtureRolledBack:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

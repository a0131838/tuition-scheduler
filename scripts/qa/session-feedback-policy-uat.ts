import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {saveFeedbackPolicy,saveFeedbackPolicyInTransaction,feedbackPolicyFingerprint} from '../../lib/session-feedback-policy-service';
import {feedbackPolicyState} from '../../lib/session-feedback-policy';
import {saveTeacherFeedbackReviewed} from '../../lib/teacher-feedback-save';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const teacher=await prisma.teacher.create({data:{name:'Non-teaching policy UAT'}}),student=await prisma.student.create({data:{name:'Non-teaching policy fictional student'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 let n=0;
 const make=async()=>{const endAt=new Date(Date.now()-86400000-(n++)*3600000);const s=await prisma.session.create({data:{classId:klass.id,teacherId:teacher.id,studentId:student.id,startAt:new Date(endAt.getTime()-3600000),endAt},include:{class:{include:{enrollments:true}}}});await prisma.attendance.create({data:{sessionId:s.id,studentId:student.id,status:'PRESENT',waiveDeduction:true}});return s;};
 const read=(id:string)=>prisma.session.findUniqueOrThrow({where:{id},include:{class:{include:{enrollments:true}}}});
 const input=(s:Awaited<ReturnType<typeof make>>)=>({sessionId:s.id,fingerprint:feedbackPolicyFingerprint(s),requestKey:randomUUID(),activity:'EXAM_ONLY' as const,reason:'Reviewed actual exam booking; no teaching occurred',acknowledged:true,actorEmail:'zhaohongwei0880@gmail.com'});
 const s=await make(),data=input(s),before=await read(s.id),attendance=await prisma.attendance.findMany({where:{sessionId:s.id}});
 await prisma.signInAlert.create({data:{sessionId:s.id,alertType:'TEACHER_FEEDBACK_OVERDUE',targetRole:'ADMIN',scopeKey:'admin:feedback',thresholdMin:10}});
 await assert.rejects(saveFeedbackPolicy({...data,reason:''}),/核对依据/);await assert.rejects(saveFeedbackPolicy({...data,fingerprint:'stale'}),/已变更/);
 await assert.rejects(prisma.$transaction(tx=>saveFeedbackPolicyInTransaction(new Proxy(tx,{get(target,key){if(key==='auditLog')return {...target.auditLog,create:async()=>{throw new Error('forced policy audit failure');}};return Reflect.get(target,key);}}),data)),/forced policy audit failure/);
 assert.deepEqual(await read(s.id),before);assert.equal(await prisma.signInAlert.count({where:{sessionId:s.id,resolvedAt:null}}),1);
 const outcomes=await Promise.allSettled([saveFeedbackPolicy(data),saveFeedbackPolicy(data)]);assert.ok(outcomes.some(r=>r.status==='fulfilled'));assert.equal((await saveFeedbackPolicy(data)).alreadySaved,true);assert.equal(await prisma.auditLog.count({where:{entityId:s.id,action:'REVIEW_FEEDBACK_POLICY'}}),1);assert.equal(await prisma.signInAlert.count({where:{sessionId:s.id,resolvedAt:null}}),0);assert.equal(feedbackPolicyState(await read(s.id)).exempt,true);
 const submit=(row:typeof s)=>saveTeacherFeedbackReviewed(row.id,teacher.id,{where:{sessionId_teacherId:{sessionId:row.id,teacherId:teacher.id}},create:{sessionId:row.id,teacherId:teacher.id,content:'Isolated formal teaching feedback',status:'ON_TIME'},update:{content:'Isolated formal teaching feedback',status:'ON_TIME',isProxyDraft:false}});
 await assert.rejects(submit(s),/非教学活动/);
 const current=await read(s.id);await saveFeedbackPolicy({...data,fingerprint:feedbackPolicyFingerprint(current),requestKey:randomUUID(),activity:'TEACHING',reason:'Reviewed teaching occurred; restore requirement'});assert.equal(feedbackPolicyState(await read(s.id)).exempt,false);assert.equal(await prisma.auditLog.count({where:{entityId:s.id,action:'REVIEW_FEEDBACK_POLICY'}}),2);assert.deepEqual(await prisma.attendance.findMany({where:{sessionId:s.id}}),attendance);
 const changed=await make();await saveFeedbackPolicy(input(changed));await prisma.session.update({where:{id:changed.id},data:{endAt:new Date(changed.endAt.getTime()+60000)}});assert.equal(feedbackPolicyState(await read(changed.id)).stale,true);
 const final=await make();await submit(final);await assert.rejects(saveFeedbackPolicy(input(final)),/正式反馈/);
 const race=await make();const competing=await Promise.allSettled([saveFeedbackPolicy(input(race)),submit(race)]);assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);assert.equal(feedbackPolicyState(await read(race.id)).exempt?0:1,await prisma.sessionFeedback.count({where:{sessionId:race.id}}));
 const browser=await make();writeFileSync('/tmp/sgt-r431-fixture.json',JSON.stringify({teacherId:teacher.id,studentId:student.id,...input(browser)}));
 console.log(JSON.stringify({passed:true,rollback:true,scopeAndReason:true,idempotent:true,restorable:true,staleScopeReactivatesRequirement:true,submissionRaceSafe:true,attendanceUnchanged:true,browserSessionId:browser.id}));
}
main().finally(()=>prisma.$disconnect());

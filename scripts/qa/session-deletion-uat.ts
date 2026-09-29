import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {deleteEmptySession,deleteEmptySessionInTransaction} from '../../lib/session-deletion';
import {deleteUnusedSchedulingContainer} from '../../lib/scheduling-container-deletion';
import {saveTeacherFeedbackReviewed} from '../../lib/teacher-feedback-save';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor={email:'zhaohongwei0880@gmail.com',role:'ADMIN'},teacher=await prisma.teacher.create({data:{name:'Deletion safety fictional teacher'}}),student=await prisma.student.create({data:{name:'Deletion safety fictional student'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.create({data:{name:'Deletion safety isolated campus'}});
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 let n=0;const make=()=>{const startAt=new Date(Date.now()+86400000+(n++)*3600000);return prisma.session.create({data:{classId:klass.id,teacherId:teacher.id,studentId:student.id,startAt,endAt:new Date(+startAt+1800000)}});};
 const safe=await make();const input={sessionId:safe.id,classId:klass.id,actor};
 await assert.rejects(deleteEmptySession({...input,classId:'wrong'}),/此班级/);
 await assert.rejects(prisma.$transaction(tx=>deleteEmptySessionInTransaction(new Proxy(tx,{get(t,k){if(k==='auditLog')return {...t.auditLog,create:async()=>{throw new Error('forced deletion audit failure');}};return Reflect.get(t,k);}}),input)),/forced deletion audit failure/);
 assert.ok(await prisma.session.findUnique({where:{id:safe.id}}));
 const competing=await Promise.allSettled([deleteEmptySession(input),deleteEmptySession(input)]);assert.equal(competing.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(await prisma.session.count({where:{id:safe.id}}),0);
 const audit=await prisma.auditLog.findFirstOrThrow({where:{entityId:safe.id,action:'SESSION_DELETED'}});const evidence=audit.meta as any;assert.equal(evidence.sourceSnapshot.teacherId,teacher.id);assert.equal(evidence.sourceSnapshot.studentId,student.id);assert.equal(evidence.sourceSnapshot.class.course.id,course.id);assert.equal(await prisma.auditLog.count({where:{entityId:safe.id,action:'SESSION_DELETED'}}),1);
 const old=await make();await prisma.session.update({where:{id:old.id},data:{startAt:new Date(Date.now()-7200000),endAt:new Date(Date.now()-3600000)}});await assert.rejects(deleteEmptySession({sessionId:old.id,actor}),/关联历史/);
 const marked=await make();await prisma.attendance.create({data:{sessionId:marked.id,studentId:student.id,status:'UNMARKED',note:'Historical review note'}});await assert.rejects(deleteEmptySession({sessionId:marked.id,actor}),/关联历史/);
 const policy=await make();await prisma.session.update({where:{id:policy.id},data:{feedbackPolicyJson:{version:1}}});await assert.rejects(deleteEmptySession({sessionId:policy.id,actor}),/关联历史/);
 const final=await make();await prisma.sessionFeedback.create({data:{sessionId:final.id,teacherId:teacher.id,status:'ON_TIME',content:'Retained lesson feedback'}});await assert.rejects(deleteEmptySession({sessionId:final.id,actor}),/关联历史/);
 const pay=await make();await prisma.teacherPayrollSessionOverride.create({data:{sessionId:pay.id,teacherId:teacher.id,payMode:'NORMAL',reason:'Isolated payroll history',createdBy:actor.email}});await assert.rejects(deleteEmptySession({sessionId:pay.id,actor}),/关联历史/);
 const reminder=await make();await prisma.signInAlert.create({data:{sessionId:reminder.id,alertType:'TEACHER_FEEDBACK_OVERDUE',targetRole:'ADMIN',scopeKey:'isolated',thresholdMin:10}});await assert.rejects(deleteEmptySession({sessionId:reminder.id,actor}),/关联历史/);
 for(const [kind,id] of [['Class',klass.id],['Teacher',teacher.id],['Campus',campus.id]] as const)await assert.rejects(deleteUnusedSchedulingContainer(kind,id,actor),/关联排课/);
 assert.equal(await prisma.sessionFeedback.count({where:{sessionId:final.id}}),1);assert.equal(await prisma.teacherPayrollSessionOverride.count({where:{sessionId:pay.id}}),1);
 const emptyClass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1}});await deleteUnusedSchedulingContainer('Class',emptyClass.id,actor);assert.equal(await prisma.class.count({where:{id:emptyClass.id}}),0);
 const race=await make();const outcomes=await Promise.allSettled([deleteEmptySession({sessionId:race.id,actor}),saveTeacherFeedbackReviewed(race.id,teacher.id,{where:{sessionId_teacherId:{sessionId:race.id,teacherId:teacher.id}},create:{sessionId:race.id,teacherId:teacher.id,status:'ON_TIME',content:'Concurrent teaching feedback'},update:{content:'Concurrent teaching feedback'}})]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(await prisma.session.count({where:{id:race.id}}),await prisma.sessionFeedback.count({where:{sessionId:race.id}}));
 const http=await make();writeFileSync('/tmp/sgt-r432-fixture.json',JSON.stringify({classId:klass.id,teacherId:teacher.id,studentId:student.id,campusId:campus.id,safeSessionId:http.id,blockedSessionId:final.id}));
 console.log(JSON.stringify({passed:true,scope:true,auditRollback:true,concurrentDeleteOnce:true,fullSnapshot:true,historyRetained:true,containerBypassBlocked:true,feedbackRace:true}));
}
main().finally(()=>prisma.$disconnect());

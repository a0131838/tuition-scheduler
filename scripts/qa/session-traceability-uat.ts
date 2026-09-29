import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {getSessionTraceability} from '../../lib/session-traceability';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const teacher=await prisma.teacher.create({data:{name:'Traceability fictional teacher'}}),student=await prisma.student.create({data:{name:'Traceability fictional student'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 const startAt=new Date('2026-08-18T11:00:00Z'),endAt=new Date('2026-08-18T12:00:00Z');
 const source=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt,endAt}}),result=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt:new Date(+startAt+86400000),endAt:new Date(+endAt+86400000)}});
 const unrelatedClass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});const unrelated=await prisma.session.create({data:{classId:unrelatedClass.id,studentId:student.id,startAt,endAt}});
 const ticket=await prisma.ticket.create({data:{ticketNo:'UAT-TRACE-'+randomUUID(),source:'INTERNAL',type:'SCHEDULING',priority:'NORMAL',studentName:student.name,studentId:student.id,status:'Confirmed'}});
 const action=await prisma.ticketSchedulingAction.create({data:{ticketId:ticket.id,actionType:'CREATE_SESSION',sourceSessionId:source.id,resultSessionIds:[result.id],status:'READY'}});
 const missingId=randomUUID();await prisma.auditLog.create({data:{actorEmail:'isolated@example.invalid',module:'TICKETS',action:'ADMIN_LINK_EXISTING_SCHEDULING_RESULT',entityType:'TicketSchedulingAction',entityId:action.id,meta:{sourceSessionId:missingId,resultSessionIds:[result.id]}}});
 await prisma.auditLog.create({data:{actorEmail:'isolated@example.invalid',module:'SCHEDULING',action:'SESSION_DELETED',entityType:'Session',entityId:missingId,meta:{classId:klass.id,before:{startAt:startAt.toISOString(),endAt:endAt.toISOString(),teacherName:teacher.name,studentName:student.name},reason:'Isolated historical source evidence'}}});
 await prisma.sessionFeedback.create({data:{sessionId:result.id,teacherId:teacher.id,status:'ON_TIME',content:'Preserved formal teaching feedback'}});
 const snapshot=()=>prisma.session.findMany({where:{id:{in:[source.id,result.id,unrelated.id]}},include:{feedbacks:true,attendances:true}});const before=await snapshot();
 const evidence=await getSessionTraceability(result.id);assert.equal(evidence.actions.length,1);assert.equal(evidence.actions[0].sourceSessionId,source.id);assert.ok(evidence.sessions.some(s=>s.id===source.id));assert.ok(!evidence.sessions.some(s=>s.id===unrelated.id));assert.ok(evidence.audits.some(a=>(a.meta as any).sourceSessionId===missingId));assert.ok(!evidence.sessions.some(s=>s.id===missingId));
 const archived=await getSessionTraceability(missingId);assert.equal(archived.actions.length,0);assert.ok(archived.sessions.some(s=>s.id===result.id));assert.ok(archived.audits.some(a=>a.action==='SESSION_DELETED'));
 const sameTime=await getSessionTraceability(unrelated.id);assert.equal(sameTime.actions.length,0);assert.equal(sameTime.audits.length,0);assert.deepEqual(await snapshot(),before);
 writeFileSync('/tmp/sgt-r433-fixture.json',JSON.stringify({sessionId:result.id,sourceSessionId:source.id,archivedId:missingId,unrelatedId:unrelated.id,ticketId:ticket.id,classId:klass.id}));
 console.log(JSON.stringify({passed:true,exactRelationshipsOnly:true,arrayResults:true,archivedOriginalReachable:true,missingOriginalExplicit:true,noNameDateInference:true,feedbackAttendanceUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

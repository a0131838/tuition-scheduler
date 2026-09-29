import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {deleteEmptySession} from '../../lib/session-deletion';
import {deleteUnusedSchedulingContainer} from '../../lib/scheduling-container-deletion';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),actor={email:owner.email,role:owner.role};
 const teacher=await prisma.teacher.create({data:{name:'Linked-record deletion UAT'}}),student=await prisma.student.create({data:{name:'Linked-record isolated student'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1}});
 let n=0;const make=()=>{const startAt=new Date(Date.now()+86400000+(n++)*3600000);return prisma.session.create({data:{classId:klass.id,startAt,endAt:new Date(+startAt+1800000)}});};
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',validFrom:new Date(),totalMinutes:60,remainingMinutes:60}}),ledger=await make();
 await prisma.packageTxn.create({data:{packageId:pkg.id,sessionId:ledger.id,kind:'ADJUST',deltaMinutes:0,note:'Isolated preserved historical marker'}});
 await assert.rejects(deleteEmptySession({sessionId:ledger.id,actor}),/关联历史/);
 const ticket=await prisma.ticket.create({data:{ticketNo:'UAT-DELETE-'+randomUUID(),source:'INTERNAL',type:'SCHEDULING',priority:'NORMAL',studentName:student.name,studentId:student.id,status:'OPEN'}});
 const array=await make();await prisma.ticketSchedulingAction.create({data:{ticketId:ticket.id,actionType:'CREATE_SESSION',resultSessionIds:[array.id]}});await assert.rejects(deleteEmptySession({sessionId:array.id,actor}),/关联历史/);
 const source=await make();await prisma.ticketSchedulingAction.create({data:{ticketId:ticket.id,sequence:1,actionType:'CANCEL_SESSION',sourceSessionId:source.id}});await assert.rejects(deleteEmptySession({sessionId:source.id,actor}),/关联历史/);
 const employmentTeacher=await prisma.teacher.create({data:{name:'Isolated employment teacher'}}),employee=await prisma.user.create({data:{email:`employee-${randomUUID()}@example.invalid`,name:'Isolated employee',role:'TEACHER',passwordHash:randomUUID(),passwordSalt:randomUUID()}}),entity=await prisma.hrLegalEntity.create({data:{name:'Isolated legal entity '+randomUUID()}});
 await prisma.employeeProfile.create({data:{userId:employee.id,teacherId:employmentTeacher.id,legalEntityId:entity.id,startDate:new Date(),createdByUserId:owner.id,updatedByUserId:owner.id}});
 await assert.rejects(deleteUnusedSchedulingContainer('Teacher',employmentTeacher.id,actor),/关联排课/);
 assert.equal(await prisma.employeeProfile.count({where:{teacherId:employmentTeacher.id}}),1);assert.equal(await prisma.packageTxn.count({where:{sessionId:ledger.id}}),1);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}})).remainingMinutes,60);
 console.log(JSON.stringify({passed:true,ledgerProtected:true,sourceAndResultArrayProtected:true,employeeProfileProtected:true,packageUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

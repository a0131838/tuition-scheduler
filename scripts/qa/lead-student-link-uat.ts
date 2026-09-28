import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {linkLeadStudent,linkLeadStudentInTransaction,type LeadStudentInput} from '../../lib/lead-student-link';
async function main(){
 const url=new URL(process.env.DATABASE_URL||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/sgt_workspace_completion_test');
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),tag=`Student reuse UAT ${randomUUID()}`;
 const originalSource=await prisma.studentSourceChannel.create({data:{name:`Original ${tag}`}});
 const twins=await Promise.all([1,2].map(i=>prisma.student.create({data:{name:tag,grade:String(i),note:'Original student history',sourceChannelId:originalSource.id}})));
 async function lead(kind='STUDENT') {return prisma.lead.create({data:{leadNo:`UAT-${randomUUID()}`,sourceType:'渠道介绍',recordKind:kind,studentName:tag,status:'Contacted',latestSummary:'Important follow-up retained'}});}
 const l=await lead(),beforeStudents=await prisma.student.count(),beforeLedger=await prisma.packageTxn.count(),beforePackages=await prisma.coursePackage.count();
 const input:LeadStudentInput={leadId:l.id,expectedUpdatedAt:l.updatedAt.toISOString(),mode:'LINK',studentId:twins[1].id,reviewNote:'Verified exact profile ID and school record'};
 await assert.rejects(linkLeadStudent(actor,{...input,reviewNote:''}),/核对依据/);
 await assert.rejects(linkLeadStudent(actor,{...input,studentId:'missing-student'}),/已不存在/);
 await assert.rejects(linkLeadStudent(actor,{...input,expectedUpdatedAt:'stale'}),/刷新/);
 assert.equal(await linkLeadStudent(actor,input),twins[1].id);
 assert.equal(await linkLeadStudent(actor,input),twins[1].id);
 await assert.rejects(linkLeadStudent(actor,{...input,studentId:twins[0].id}),/另一学生/);
 const after=await prisma.lead.findUniqueOrThrow({where:{id:l.id}});assert.equal(after.status,'Contacted');assert.equal(after.latestSummary,l.latestSummary);assert.equal(after.convertedSourceChannelId,null);
 assert.deepEqual(await prisma.student.findMany({where:{id:{in:twins.map(s=>s.id)}},orderBy:{grade:'asc'}}),twins);
 assert.equal(await prisma.student.count(),beforeStudents);assert.equal(await prisma.auditLog.count({where:{entityId:l.id,action:'LINK_EXISTING_STUDENT'}}),1);
 const second=await lead();assert.equal(await linkLeadStudent(actor,{...input,leadId:second.id,expectedUpdatedAt:second.updatedAt.toISOString()}),twins[1].id);assert.equal(await prisma.student.count(),beforeStudents);
 for(const role of ['SALES','CS','FINANCE','TEACHER']) await assert.rejects(linkLeadStudent({...actor,role,operationsAdmin:false},input),/管理员/);
 await assert.rejects(linkLeadStudent({...actor,isObserver:true},input),/管理员/);
 for(const kind of ['RELATIONSHIP','UNREVIEWED']){const pending=await lead(kind);await assert.rejects(linkLeadStudent(actor,{...input,leadId:pending.id,expectedUpdatedAt:pending.updatedAt.toISOString()}),/学生商机/);}
 const archived=await lead();await prisma.lead.update({where:{id:archived.id},data:{isArchived:true}});const arc=await prisma.lead.findUniqueOrThrow({where:{id:archived.id}});await assert.rejects(linkLeadStudent(actor,{...input,leadId:arc.id,expectedUpdatedAt:arc.updatedAt.toISOString()}),/恢复/);
 const fresh=await lead(),create:LeadStudentInput={leadId:fresh.id,expectedUpdatedAt:fresh.updatedAt.toISOString(),mode:'CREATE'};
 const race=await Promise.allSettled([linkLeadStudent(actor,create),linkLeadStudent(actor,create)]);assert.ok(race.some(r=>r.status==='fulfilled'));
 const createdId=await linkLeadStudent(actor,create);assert.ok(createdId);assert.equal(await prisma.student.count(),beforeStudents+1);assert.equal(await prisma.auditLog.count({where:{entityId:fresh.id,action:'CREATE_STUDENT'}}),1);
 assert.equal((await prisma.lead.findUniqueOrThrow({where:{id:fresh.id}})).status,'Contacted');
 const atomic=await lead(),studentCount=await prisma.student.count();
 await assert.rejects(prisma.$transaction(async tx=>{await linkLeadStudentInTransaction(tx,actor,{leadId:atomic.id,expectedUpdatedAt:atomic.updatedAt.toISOString(),mode:'CREATE'});throw new Error('forced isolated rollback');}),/forced isolated rollback/);
 assert.equal(await prisma.student.count(),studentCount);assert.equal((await prisma.lead.findUniqueOrThrow({where:{id:atomic.id}})).convertedStudentId,null);assert.equal(await prisma.auditLog.count({where:{entityId:atomic.id}}),0);
 assert.equal(await prisma.packageTxn.count(),beforeLedger);assert.equal(await prisma.coursePackage.count(),beforePackages);
 console.log(JSON.stringify({passed:true,exactStudentId:true,sameNameNotMerged:true,studentProfileAndHistoryUnchanged:true,pipelineUnchanged:true,oneStudentUnderConcurrency:true,auditAtomic:true,rolesGuarded:true,browserLeadId:atomic.id,existingStudentId:twins[0].id,search:tag}));
}
main().finally(()=>prisma.$disconnect());

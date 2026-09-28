import assert from 'node:assert/strict';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {mutateSalesRelationship,mutateSalesRelationshipInTransaction} from '../../lib/sales-relationships';
import {summarizeRelationshipLeads} from '../../lib/sales-relationship-policy';

async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const url=new URL(process.env[key]||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 const tag=`Relationship UAT ${randomUUID()}`;
 const profile={name:tag,kind:'AGENT',status:'ACTIVE',ownerName:actor.name,nextAction:'Review three referrals',nextActionDue:'2026-10-01T10:30'};
 const id=await mutateSalesRelationship(actor,{action:'CREATE',values:profile});
 const original=await prisma.salesRelationship.findUniqueOrThrow({where:{id}});
 assert.equal(original.nextActionDue?.toISOString(),'2026-10-01T02:30:00.000Z');
 const studentsBefore=await prisma.student.count(),ledgerBefore=await prisma.packageTxn.count();
 const leads=await Promise.all(['A','B','C'].map(letter=>prisma.lead.create({data:{leadNo:`UAT-${randomUUID()}`,sourceType:'渠道',studentName:`${tag} ${letter}`}})));
 for(const lead of leads){
  assert.equal(lead.recordKind,'UNREVIEWED');assert.equal(lead.relationshipId,null);
  await assert.rejects(mutateSalesRelationship(actor,{action:'LINK_LEAD',values:{leadId:lead.id,relationshipId:id,expectedUpdatedAt:lead.updatedAt.toISOString(),recordKind:'STUDENT',reviewNote:''}}),/必填/);
  await mutateSalesRelationship(actor,{action:'LINK_LEAD',values:{leadId:lead.id,relationshipId:id,expectedUpdatedAt:lead.updatedAt.toISOString(),recordKind:'STUDENT',reviewNote:'Explicit isolated referral evidence'}});
  await assert.rejects(mutateSalesRelationship(actor,{action:'LINK_LEAD',values:{leadId:lead.id,relationshipId:'',expectedUpdatedAt:lead.updatedAt.toISOString(),recordKind:'STUDENT',reviewNote:'stale form'}}),/刷新/);
 }
 await prisma.lead.update({where:{id:leads[0].id},data:{status:'Won'}});
 await prisma.lead.update({where:{id:leads[1].id},data:{status:'Lost',isArchived:true}});
 const linked=await prisma.lead.findMany({where:{relationshipId:id}});
 assert.deepEqual(summarizeRelationshipLeads(linked),{studentOpportunities:3,linkedStudents:0,openStudentOpportunities:1,pipelineWon:1,unreviewed:0});
 assert.equal((await prisma.salesRelationship.findUniqueOrThrow({where:{id}})).status,'ACTIVE');
 assert.equal(await prisma.student.count(),studentsBefore);assert.equal(await prisma.packageTxn.count(),ledgerBefore);
 const follow={relationshipId:id,expectedUpdatedAt:original.updatedAt.toISOString(),channel:'Email',content:'Discussed next intake',nextAction:'Send agreed proposal',nextActionDue:'2026-10-03T14:00'};
 const concurrency=await Promise.allSettled([mutateSalesRelationship(actor,{action:'FOLLOW_UP',values:follow}),mutateSalesRelationship(actor,{action:'FOLLOW_UP',values:follow})]);
 assert.equal(concurrency.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(await prisma.salesRelationshipFollowUp.count({where:{relationshipId:id}}),1);
 await assert.rejects(mutateSalesRelationship(actor,{action:'FOLLOW_UP',values:follow}),/刷新/);
 const current=await prisma.salesRelationship.findUniqueOrThrow({where:{id}});
 assert.equal(current.nextActionDue?.toISOString(),'2026-10-03T06:00:00.000Z');
 const auditCount=await prisma.auditLog.count({where:{entityId:id}});
 await assert.rejects(prisma.$transaction(async tx=>{await mutateSalesRelationshipInTransaction(tx,actor,{action:'FOLLOW_UP',values:{...follow,expectedUpdatedAt:current.updatedAt.toISOString()}});throw new Error('forced audit rollback');}),/forced audit rollback/);
 assert.equal(await prisma.salesRelationshipFollowUp.count({where:{relationshipId:id}}),1);
 assert.equal(await prisma.auditLog.count({where:{entityId:id}}),auditCount);
 await mutateSalesRelationship(actor,{action:'OPPORTUNITY',values:{relationshipId:id,title:'School workshop',status:'WON',estimatedAmount:'1200.50',ownerName:'Project owner'}});
 const project=await prisma.salesRelationshipOpportunity.findFirstOrThrow({where:{relationshipId:id}});
 assert.equal(project.estimatedAmount?.toString(),'1200.5');assert.equal(project.currency,'SGD');
 assert.equal((await prisma.salesRelationship.findUniqueOrThrow({where:{id}})).status,'ACTIVE');
 await assert.rejects(mutateSalesRelationship(actor,{action:'OPPORTUNITY',values:{relationshipId:id,title:'Bad amount',status:'OPEN',estimatedAmount:'-1'}}),/非负/);
 const otherId=await mutateSalesRelationship(actor,{action:'CREATE',values:{...profile,name:`${tag} Other`}});
 await assert.rejects(mutateSalesRelationship(actor,{action:'OPPORTUNITY',values:{relationshipId:otherId,opportunityId:project.id,title:'Cross-profile edit',status:'LOST',expectedUpdatedAt:project.updatedAt.toISOString()}}));
 for(const denied of [{...actor,role:'FINANCE',operationsAdmin:false},{...actor,role:'TEACHER',operationsAdmin:false},{...actor,isObserver:true}]){
  await assert.rejects(mutateSalesRelationship(denied,{action:'CREATE',values:profile}),/无权/);
 }
 for(const role of ['SALES','CS']){
  await mutateSalesRelationship({...actor,role},{action:'OPPORTUNITY',values:{relationshipId:id,title:`${role} project`,status:'OPEN'}});
 }
 // Archive and restoration preserve referrals and follow-ups.
 let row=await prisma.salesRelationship.findUniqueOrThrow({where:{id}});
 await mutateSalesRelationship(actor,{action:'UPDATE',values:{...profile,relationshipId:id,status:'ARCHIVED',expectedUpdatedAt:row.updatedAt.toISOString()}});
 assert.equal(await prisma.lead.count({where:{relationshipId:id}}),3);
 row=await prisma.salesRelationship.findUniqueOrThrow({where:{id}});
 await mutateSalesRelationship(actor,{action:'UPDATE',values:{...profile,relationshipId:id,status:'ACTIVE',expectedUpdatedAt:row.updatedAt.toISOString()}});
 // Explicit relinking retains the complete original lead history and is audited.
 const move=await prisma.lead.findUniqueOrThrow({where:{id:leads[2].id}});
 await mutateSalesRelationship(actor,{action:'LINK_LEAD',values:{leadId:move.id,relationshipId:otherId,recordKind:'STUDENT',reviewNote:'Corrected exact referral evidence',expectedUpdatedAt:move.updatedAt.toISOString()}});
 const moved=await prisma.lead.findUniqueOrThrow({where:{id:move.id}});assert.equal(moved.leadNo,move.leadNo);assert.equal(moved.studentName,move.studentName);assert.equal(moved.relationshipId,otherId);
 assert.equal(await prisma.student.count(),studentsBefore);assert.equal(await prisma.packageTxn.count(),ledgerBefore);
 if(process.env.UAT_HTTP==='1'){
  const password='LocalUAT-Relationship-20260928',salt=randomBytes(16).toString('hex');
  for(const role of ['SALES','CS','FINANCE','TEACHER','OBSERVER','OPS'] as const){
   const user=await prisma.user.create({data:{email:`relation-${randomUUID()}@example.invalid`,name:`Relationship UAT ${role}`,role:role==='OBSERVER'?'ADMIN':role==='OPS'?'TEACHER':role,isObserver:role==='OBSERVER',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
   if(role==='OPS')await prisma.operationsAdminAcl.create({data:{email:user.email,note:'Isolated relationship acceptance only'}});
   const login=await fetch('http://127.0.0.1:3149/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'admin'})});
   // A teacher is also rejected at the admin sign-in boundary.
   if(role==='TEACHER'&&login.status!==200){assert.equal(login.status,403);continue;}
   assert.equal(login.status,200);
   const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
   const response=await fetch(`http://127.0.0.1:3149/admin/relationships/${id}`,{headers:{Cookie},redirect:'manual'});
   if(['SALES','CS','OBSERVER','OPS'].includes(role)){assert.equal(response.status,200);assert.ok((await response.text()).includes(tag));}
   else {assert.ok([303,307,308].includes(response.status));}
   if(role==='OBSERVER'){const denied=await fetch('http://127.0.0.1:3149/admin/relationships',{method:'POST',headers:{Cookie},body:'test=1',redirect:'manual'});assert.equal(denied.status,403);}
   if(role==='OPS'){
    const denied=await fetch('http://127.0.0.1:3149/api/admin/packages/missing/top-up',{method:'POST',headers:{Cookie},body:'{}',redirect:'manual'});assert.equal(denied.status,403);
    const finance=await fetch('http://127.0.0.1:3149/admin/finance/workbench',{headers:{Cookie},redirect:'manual'});assert.equal(finance.status,307);
   }
  }
 }
 console.log(JSON.stringify({passed:true,relationshipId:id,otherRelationshipId:otherId,leadIds:leads.map(l=>l.id),independentStudents:3,concurrentFollowUpOnce:true,auditRollback:true,permissionGuard:true,noStudentOrLedgerWrites:true}));
}
main().finally(()=>prisma.$disconnect());

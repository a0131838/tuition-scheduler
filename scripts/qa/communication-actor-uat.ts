import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {listParentCommunicationTasks,updateParentCommunicationTask} from '../../lib/parent-communication-center';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 const user=await prisma.user.create({data:{email:`communication-actor-${randomUUID()}@example.invalid`,name:'Current isolated operator',role:'CS',passwordHash:owner.passwordHash,passwordSalt:owner.passwordSalt}});
 const staleActor={id:user.id,email:'forged@example.invalid',name:'Stale cached name',role:'ADMIN',isObserver:false};
 const make=()=>prisma.parentCommunicationTask.create({data:{taskKey:'fresh-actor:'+randomUUID(),kind:'COURSE_REMINDER_PARENT',status:'READY_TO_SEND',title:'Isolated access verification',messageText:'Never send this fixture'}});
 const task=await make(),actions=['claim','transfer','copy','manual_sent','waive','share_card'];
 const act=(action:string,id=task.id,data:Record<string,unknown>={ownerUserId:owner.id,note:'Isolated reason'})=>updateParentCommunicationTask({id,action,actor:staleActor,data});
 const snapshot=async()=>({task:await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:task.id}}),audits:await prisma.auditLog.findMany({where:{entityId:task.id},orderBy:{id:'asc'}})});
 const denied=async()=>{const before=await snapshot();for(const action of actions)await assert.rejects(act(action),/Read-only|permission/);assert.deepEqual(await snapshot(),before);};
 const ledger=await prisma.packageTxn.count(),outbox=await prisma.miniappNotificationOutbox.count();
 // Caller role/observer/name data is deliberately stale; every write rechecks the DB.
 await prisma.user.update({where:{id:user.id},data:{isObserver:true}});await denied();
 for(const role of ['FINANCE','TEACHER','SALES','STUDENT'] as const){await prisma.user.update({where:{id:user.id},data:{isObserver:false,role}});await denied();}
 await prisma.user.update({where:{id:user.id},data:{role:'SALES'}});
 const workspace=await prisma.userWorkspaceAccess.create({data:{userId:user.id,workspace:'CS'}});await act('copy');await prisma.userWorkspaceAccess.update({where:{id:workspace.id},data:{isActive:false}});await denied();
 await prisma.user.update({where:{id:user.id},data:{role:'TEACHER'}});
 const manager=await prisma.managerAcl.create({data:{email:user.email}});await act('copy');await prisma.managerAcl.update({where:{id:manager.id},data:{isActive:false}});await denied();
 const ops=await prisma.operationsAdminAcl.create({data:{email:user.email}});await act('copy');await prisma.operationsAdminAcl.update({where:{id:ops.id},data:{isActive:false}});await denied();
 await prisma.user.update({where:{id:user.id},data:{role:'CS'}});
 for(const action of actions){const row=await make();await act(action,row.id);const audits=await prisma.auditLog.findMany({where:{entityId:row.id}});assert.equal(audits.length,1);assert.equal(audits[0].actorEmail,user.email);assert.equal(audits[0].actorName,user.name);assert.equal(audits[0].actorRole,'CS');const result=await prisma.parentCommunicationTask.findUniqueOrThrow({where:{id:row.id}});if(action==='claim')assert.equal(result.ownerName,user.name);if(action==='copy')assert.equal(result.copiedByName,user.name);if(action==='manual_sent')assert.equal(result.manualSentByName,user.name);if(action==='share_card')assert.deepEqual(result,row);}
 // An observer must not remain selectable, nor acquire ownership via stale UI selection.
 const target=await prisma.user.create({data:{email:`communication-target-${randomUUID()}@example.invalid`,name:'Isolated observer owner',role:'CS',isObserver:true,passwordHash:owner.passwordHash,passwordSalt:owner.passwordSalt}});
 assert(!(await listParentCommunicationTasks({limit:1})).staff.some(s=>s.id===target.id));
 const before=await snapshot();await assert.rejects(act('transfer',task.id,{ownerUserId:target.id}),/Invalid communication owner/);assert.deepEqual(await snapshot(),before);
 // Share audit failure must not create evidence, mark delivery or alter the task.
 let fail=true;prisma.$use(async(p,next)=>{if(fail&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.action==='SHARE_MINIAPP_CARD')throw Error('forced share audit failure');return next(p);});
 await assert.rejects(act('share_card'),/forced share audit/);assert.deepEqual(await snapshot(),before);fail=false;
 // Even idempotent repeats require an account that is still allowed to write.
 const sent=await make();await act('manual_sent',sent.id);await prisma.user.update({where:{id:user.id},data:{isObserver:true}});await assert.rejects(act('manual_sent',sent.id),/Read-only/);
 assert.equal(await prisma.packageTxn.count(),ledger);assert.equal(await prisma.miniappNotificationOutbox.count(),outbox);
 console.log(JSON.stringify({passed:true,sixActionsFreshObserverRoleAndRevokedAclDenied:true,existingWorkspaceManagerOperationsAccessPreserved:true,currentActorEvidence:true,observerAssignmentRejected:true,shareIntentNotDelivery:true,shareAuditRollback:true,closedReplayStillAuthorized:true,noLedgerOrOutboxWrites:true}));
}
const timer=setTimeout(()=>{throw Error('Communication actor UAT timeout');},60000);main().finally(()=>{clearTimeout(timer);return prisma.$disconnect();});

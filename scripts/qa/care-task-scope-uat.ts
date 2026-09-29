import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { prisma } from '../../lib/prisma';
import { addCareTask, updateCareTask } from '../../lib/care-management';

async function main() {
  for (const key of ['DATABASE_URL','DIRECT_DATABASE_URL']) {
    const url = new URL(process.env[key] || '');
    assert.equal(url.hostname,'127.0.0.1'); assert.equal(url.port,'55439'); assert.equal(url.pathname,'/sgt_workspace_completion_test');
  }
  const owner = await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
  if (process.argv.includes('--http')) {
    const f=JSON.parse(readFileSync('/tmp/sgt-r453-fixture.json','utf8'));
    const base='http://127.0.0.1:3149',url=base+'/admin/care/'+f.engagementId;
    const token=randomUUID();await prisma.authSession.create({data:{userId:f.memberId,token,expiresAt:new Date(Date.now()+3600000)}});
    const cookie='ts_admin_session='+token;
    const html=await(await fetch(url,{headers:{Cookie:cookie}})).text();
    const form=(html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)||[]).find(s=>s.includes('type="hidden" name="taskId"')&&s.includes(f.taskId));assert(form,'task update form');
    const fields=[...form.matchAll(/<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&quot;','"').replaceAll('&amp;','&')]);
    const action=form.match(/name="(\$ACTION_(?:REF|ID)_[^"]+)"/);assert(action);
    const before=await prisma.careTask.findUniqueOrThrow({where:{id:f.foreignTaskId}});
    const data=new FormData();for(const [key,value] of fields)data.set(key,value);data.set(action[1],'');data.set('taskId',before.id);data.set('version',String(before.version));data.set('status','DONE');data.set('completionEvidence','Isolated forged cross-project request');
    const denied=await fetch(url,{method:'POST',headers:{Cookie:cookie,Origin:base},body:data,redirect:'manual'});assert([303,307].includes(denied.status));assert.deepEqual(await prisma.careTask.findUniqueOrThrow({where:{id:before.id}}),before);assert.match(decodeURIComponent(denied.headers.get('location')||'').replaceAll('+',' '),/Task not found in this care project/);
    const own=await prisma.careTask.findUniqueOrThrow({where:{id:f.taskId}});data.set('taskId',own.id);data.set('version',String(own.version));data.set('completionEvidence','Isolated own-project completion');
    const accepted=await fetch(url,{method:'POST',headers:{Cookie:cookie,Origin:base},body:data,redirect:'manual'});assert.equal(accepted.status,303);assert.equal((await prisma.careTask.findUniqueOrThrow({where:{id:own.id}})).status,'DONE');
    console.log(JSON.stringify({passed:true,actualFormRejectsForeignTask:true,actualFormUpdatesOwnTask:true}));return;
  }
  const member=await prisma.user.create({data:{name:'Isolated task coordinator',email:randomUUID()+'@example.invalid',role:'CS',passwordHash:'isolated',passwordSalt:'isolated',workspaceAccesses:{create:{workspace:'CARE'}}}});
  const student=await prisma.student.create({data:{name:'Isolated task scope '+randomUUID().slice(0,6)}});
  const makeProject=(programType:'UNIVERSITY_GROWTH'|'CAREER_LAUNCH')=>prisma.careEngagement.create({data:{studentId:student.id,programType,status:'ACTIVE',scopeJson:[],createdByUserId:owner.id}});
  const project=await makeProject('UNIVERSITY_GROWTH'),other=await makeProject('CAREER_LAUNCH');
  const membership=await prisma.careEngagementMember.create({data:{engagementId:project.id,userId:member.id,role:'COORDINATOR',assignedByUserId:owner.id}});
  await prisma.careEngagementMember.create({data:{engagementId:other.id,userId:owner.id,role:'CASE_OWNER',assignedByUserId:owner.id}});
  const baseline={ledger:await prisma.packageTxn.count(),outbox:await prisma.miniappNotificationOutbox.count()};
  const create={actor:member,engagementId:project.id,title:'Isolated task',description:'Scope acceptance',assignedToUserId:member.id,priority:'NORMAL',dueAt:'2048-08-01T10:00'};
  let fail='CREATE_TASK';prisma.$use(async(p,next)=>{if(p.model==='AuditLog'&&p.action==='create'&&p.args.data.action===fail)throw Error('forced task audit failure');return next(p);});
  await assert.rejects(addCareTask(create),/forced task audit/);assert.equal(await prisma.careTask.count({where:{engagementId:project.id}}),0);fail='';
  const task=await addCareTask(create),foreign=await addCareTask({...create,actor:owner,engagementId:other.id,assignedToUserId:owner.id});
  const snap=()=>prisma.careTask.findUniqueOrThrow({where:{id:task.id}});
  const update={actor:member,engagementId:project.id,taskId:task.id,version:task.version,status:'DONE',completionEvidence:'Assessment reviewed',nextFollowUpAt:''};
  await assert.rejects(updateCareTask({...update,taskId:foreign.id,version:foreign.version}),/Task not found in this care project/);
  await assert.rejects(updateCareTask({...update,engagementId:other.id,taskId:foreign.id}),/no longer have permission/);
  const before=await snap();fail='UPDATE_TASK';await assert.rejects(updateCareTask(update),/forced task audit/);assert.deepEqual(await snap(),before);fail='';
  await prisma.user.update({where:{id:member.id},data:{isObserver:true}});await assert.rejects(updateCareTask({...update,actor:{...member,role:'ADMIN'}}),/Read-only/);await assert.rejects(addCareTask(create),/Read-only/);await prisma.user.update({where:{id:member.id},data:{isObserver:false}});
  await prisma.careEngagementMember.update({where:{id:membership.id},data:{isActive:false}});await assert.rejects(updateCareTask(update),/no longer have permission/);await prisma.careEngagementMember.update({where:{id:membership.id},data:{isActive:true}});
  const race=await Promise.allSettled([updateCareTask(update),updateCareTask(update)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  const done=await snap();await updateCareTask({...update,actor:owner,version:done.version,completionEvidence:'Assessment evidence refined'});const refined=await snap();assert.deepEqual(refined.completedAt,done.completedAt);assert.equal(refined.completedByUserId,member.id);
  await updateCareTask({...update,version:refined.version,status:'OPEN',completionEvidence:''});const reopened=await snap();assert.equal(reopened.completedAt,null);
  const audit=await prisma.auditLog.findFirstOrThrow({where:{entityId:task.id,action:'UPDATE_TASK'},orderBy:{createdAt:'desc'}});const meta=audit.meta as {before:{completedAt:string;completionEvidence:string};after:{status:string}};assert.equal(meta.before.completedAt,done.completedAt!.toISOString());assert.equal(meta.before.completionEvidence,'Assessment evidence refined');assert.equal(meta.after.status,'OPEN');
  await assert.rejects(updateCareTask(update),/updated by another user/);
  // Freeze just before current membership is read, revoke it, then resume the stale transaction.
  let reached!:()=>void,resume!:()=>void,paused=false;
  const gate=new Promise<void>(r=>resume=r),read=new Promise<void>(r=>reached=r);
  prisma.$use(async(p,next)=>{if(!paused&&p.action==='queryRaw'&&JSON.stringify(p.args).includes('CareEngagementMember')){paused=true;reached();await gate;}return next(p);});
  const pending=updateCareTask({...update,version:reopened.version});await read;await prisma.careEngagementMember.update({where:{id:membership.id},data:{isActive:false}});resume();await assert.rejects(pending);assert.deepEqual(await snap(),reopened);await prisma.careEngagementMember.update({where:{id:membership.id},data:{isActive:true}});
  assert.equal(await prisma.packageTxn.count(),baseline.ledger);assert.equal(await prisma.miniappNotificationOutbox.count(),baseline.outbox);
  writeFileSync('/tmp/sgt-r453-fixture.json',JSON.stringify({engagementId:project.id,memberId:member.id,taskId:task.id,foreignTaskId:foreign.id}));
  console.log(JSON.stringify({passed:true,exactProjectScope:true,currentObserverMembership:true,auditRollback:true,concurrencyOnce:true,completionHistoryPreserved:true,revocationRaceRejected:true,noLedgerOrOutboxWrites:true}));
}
const watchdog=setTimeout(()=>{throw Error('Care task UAT timed out');},30000);
main().finally(()=>{clearTimeout(watchdog);return prisma.$disconnect();});

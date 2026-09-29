import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Prisma} from '@prisma/client';
import {prisma} from '../../lib/prisma';
import {deleteVoidedSchoolApplication,voidSchoolApplication,prepareSchoolApplicationSignLink,saveSchoolApplicationDraft} from '../../lib/school-application';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r449-fixture.json','utf8')),base='http://127.0.0.1:3149',token=randomUUID();
  await prisma.authSession.create({data:{token,userId:owner.id,expiresAt:new Date(Date.now()+3600000)}});
  const Cookie='ts_admin_session='+token,url=base+'/admin/students/'+f.studentId+'/school-applications';
  try {
   for(const language of ['EN','ZH','BILINGUAL'] as const){
    await prisma.user.update({where:{id:owner.id},data:{language}});
    const res=await fetch(url,{headers:{Cookie}});assert.equal(res.status,200);const html=await res.text();
    assert(html.includes(language==='ZH'?'删除未使用的已作废草稿':'Delete unused voided draft'));
    assert(html.includes(language==='EN'?'Application links, submissions':'申请链接、资料提交'));
   }
   const html=await (await fetch(url,{headers:{Cookie}})).text();
   const forms=html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)||[];
   const form=forms.find(s=>s.includes(f.safeId)&&s.includes('Delete unused voided draft'));assert(form);
   const action=form.match(/name="(\$ACTION_ID_[^"]+)"/);assert(action);
   const send=async(id:string,cookie=Cookie)=>{const data=new FormData();data.set(action[1],'');data.set('studentId',f.studentId);data.set('applicationId',id);return fetch(url,{method:'POST',headers:{Cookie:cookie,Origin:base},body:data,redirect:'manual'});};
   assert.equal((await send(f.blockedId)).status,303);assert.equal(await prisma.schoolApplicationService.count({where:{id:f.blockedId}}),1);
   const observer=await prisma.user.findFirstOrThrow({where:{name:'Policy OBSERVER'}}),ot=randomUUID();await prisma.authSession.create({data:{token:ot,userId:observer.id,expiresAt:new Date(Date.now()+3600000)}});
   await send(f.safeId,'ts_admin_session='+ot);assert.equal(await prisma.schoolApplicationService.count({where:{id:f.safeId}}),1);
   assert.equal((await send(f.safeId)).status,303);assert.equal(await prisma.schoolApplicationService.count({where:{id:f.safeId}}),0);assert.equal(await prisma.auditLog.count({where:{entityId:f.safeId,action:'DELETE_UNUSED_VOIDED_DRAFT'}}),1);
   console.log(JSON.stringify({passed:true,threeLanguageHistoryUI:true,tamperedHistoricalDeleteBlocked:true,legacyObserverSessionBlocked:true,unusedDraftDeletedWithAudit:true}));
  }finally{await prisma.user.update({where:{id:owner.id},data:{language:owner.language}});}
  return;
 }
 const student=await prisma.student.create({data:{name:'Isolated school history '+randomUUID().slice(0,6)}});
 const make=(data:Partial<Prisma.SchoolApplicationServiceUncheckedCreateInput>={})=>prisma.schoolApplicationService.create({data:{studentId:student.id,applicationItemsJson:[],billTo:'Isolated only',agreementDate:new Date(),status:'VOID',...data}});
 const snapshot=(id:string)=>prisma.schoolApplicationService.findUniqueOrThrow({where:{id},include:{events:true}});
 const baseline=async()=>({ledger:await prisma.packageTxn.count(),outbox:await prisma.miniappNotificationOutbox.count(),billing:await prisma.appSetting.findUnique({where:{key:'parent_billing_v1'}})});const before=await baseline();
 for(const data of [{signedAt:new Date()},{signatureImagePath:'/test/signature.png'},{invoiceNo:'ISOLATED'},{parentInfoSubmittedAt:new Date()},{signToken:randomUUID()}]){
  const row=await make(data),snap=await snapshot(row.id);await assert.rejects(deleteVoidedSchoolApplication({id:row.id,actorUserId:owner.id}),/unused voided draft/);assert.deepEqual(await snapshot(row.id),snap);
 }
 const blocked=await make();await prisma.schoolApplicationEvent.create({data:{applicationId:blocked.id,eventType:'SIGNED',actorType:'TEST'}});await assert.rejects(deleteVoidedSchoolApplication({id:blocked.id,actorUserId:owner.id}),/unused voided draft/);
 const row=await make({status:'SIGNED',signedAt:new Date(),signatureImagePath:'/test/retained.png'}),original=await snapshot(row.id);await assert.rejects(voidSchoolApplication({id:row.id,actorUserId:owner.id}),/requires a reason/);
 let failEvent=true,failAudit=true;prisma.$use(async(p,next)=>{if(failEvent&&p.model==='SchoolApplicationEvent'&&p.action==='create'&&p.args.data.eventType==='VOIDED')throw Error('forced void event failure');if(failAudit&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.action==='DELETE_UNUSED_VOIDED_DRAFT')throw Error('forced draft audit failure');return next(p);});
 await assert.rejects(voidSchoolApplication({id:row.id,reason:'Isolated reason',actorUserId:owner.id}),/forced void event/);assert.deepEqual(await snapshot(row.id),original);failEvent=false;
 const races=await Promise.allSettled([1,2].map(()=>voidSchoolApplication({id:row.id,reason:'Isolated reason',actorUserId:owner.id})));assert.equal(races.filter(x=>x.status==='fulfilled').length,1);const voided=await snapshot(row.id);assert.equal(voided.signatureImagePath,original.signatureImagePath);assert.equal(voided.events.filter(e=>e.eventType==='VOIDED').length,1);assert.equal((voided.events[0].payloadJson as any).fromStatus,'SIGNED');
 await assert.rejects(prepareSchoolApplicationSignLink({id:row.id,actorUserId:owner.id}),/voided application/);
 await assert.rejects(saveSchoolApplicationDraft({id:row.id,parentInfo:{parentName:'Test'},items:[],billTo:'Test',agreementDate:'2040-01-01',actorUserId:owner.id}),/voided school application/);
 const safe=await make();await assert.rejects(deleteVoidedSchoolApplication({id:safe.id,actorUserId:owner.id}),/forced draft audit/);assert.equal(await prisma.schoolApplicationService.count({where:{id:safe.id}}),1);failAudit=false;
 const observer=await prisma.user.findFirstOrThrow({where:{name:'Policy OBSERVER'}});await assert.rejects(deleteVoidedSchoolApplication({id:safe.id,actorUserId:observer.id}),/Read-only/);await assert.rejects(voidSchoolApplication({id:safe.id,actorUserId:observer.id}),/Read-only/);
 const deletes=await Promise.allSettled([1,2].map(()=>deleteVoidedSchoolApplication({id:safe.id,actorUserId:owner.id})));assert.equal(deletes.filter(x=>x.status==='fulfilled').length,1);const audit=await prisma.auditLog.findFirstOrThrow({where:{entityId:safe.id,action:'DELETE_UNUSED_VOIDED_DRAFT'}});assert.equal((audit.meta as any).sourceSnapshot.studentId,student.id);assert.deepEqual(await baseline(),before);
 const http=await make();writeFileSync('/tmp/sgt-r449-fixture.json',JSON.stringify({studentId:student.id,safeId:http.id,blockedId:blocked.id}));
 console.log(JSON.stringify({passed:true,signatureInvoiceLinkSubmissionEventHistoryRetained:true,voidEventRollback:true,deleteAuditRollback:true,concurrentVoidAndDeleteOnce:true,observerDenied:true,billingLedgerOutboxUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

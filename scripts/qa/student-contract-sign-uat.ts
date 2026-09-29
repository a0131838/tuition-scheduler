import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {Prisma} from '@prisma/client';
import {prisma} from '../../lib/prisma';
import {finalizeStudentContractSignature,signStudentContract,voidStudentContract,refreshStudentContractIntakeLink,refreshStudentContractSignLink,getStudentContractBySignToken,detachDeletedInvoiceFromStudentContract} from '../../lib/student-contract';
import {buildStudentContractSnapshot} from '../../lib/student-contract-template';
import {saveStudentContractInvoiceChoice,saveStudentContractInvoiceChoiceInTransaction} from '../../lib/student-contract-invoice-choice';
import {listParentBillingForPackage} from '../../lib/student-parent-billing';

async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const course=await prisma.course.findFirstOrThrow(),template=await prisma.contractTemplate.create({data:{name:'Isolated signature fixture',slug:randomUUID(),version:1,bodyHtml:'Fixture'}});
 const make=async(renewal=true)=>{
  const student=await prisma.student.create({data:{name:`Signature UAT ${randomUUID()}`}});
  const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',totalMinutes:600,remainingMinutes:300,validFrom:new Date('2026-01-01')}});
  await prisma.packageTxn.createMany({data:[{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:600},{packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-300}]});
  const parentInfo={parentFullNameEn:'Isolated Parent',phone:'00000000',email:'fixture@example.invalid',relationshipToStudent:'Parent',isLegalGuardian:true};
  const businessInfo={courseName:course.name,packageType:'HOURS',totalMinutes:120,feeAmount:200,billTo:student.name,agreementDateIso:'2026-09-29'};
  const {snapshot}=buildStudentContractSnapshot({studentId:student.id,studentName:student.name,packageId:pkg.id,businessInfo,parentInfo,agreementDate:businessInfo.agreementDateIso,contractMode:'TUITION_AGREEMENT'});
  const contract=await prisma.studentContract.create({data:{studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),signToken:randomUUID(),signExpiresAt:new Date(Date.now()+86400000),status:'READY_TO_SIGN',flowType:renewal?'RENEWAL':'NEW_PURCHASE',contractSnapshotJson:snapshot as unknown as Prisma.InputJsonValue,businessInfoJson:businessInfo,parentInfoJson:parentInfo}});
  if(renewal)await saveStudentContractInvoiceChoice({contractId:contract.id,packageId:pkg.id,mode:'CREATE_NEW',selectedBy:'uat@example.invalid'});
  const current=await prisma.studentContract.findUniqueOrThrow({where:{id:contract.id}});
  const input={token:contract.signToken!,signerName:'Isolated Parent'};
  const prepared={contractId:contract.id,expectedUpdatedAt:current.updatedAt.toISOString(),signedAt:new Date(),signatureImagePath:'/uploads/contract-signatures/isolated.png',signedPdfPath:'/uploads/contracts/isolated.pdf'};
  return {student,pkg,contract:current,input,prepared};
 };
 const fixture=await make();
 await prisma.packageInvoiceApproval.create({data:{packageId:fixture.pkg.id,invoiceId:randomUUID(),submittedBy:"old-fixture@example.invalid",status:"PENDING_MANAGER"}});
 const state=async()=>({pkg:await prisma.coursePackage.findUnique({where:{id:fixture.pkg.id}}),contract:await prisma.studentContract.findUnique({where:{id:fixture.contract.id}}),txns:await prisma.packageTxn.findMany({where:{packageId:fixture.pkg.id},orderBy:{id:'asc'}}),billing:await listParentBillingForPackage(fixture.pkg.id),events:await prisma.studentContractEvent.findMany({where:{contractId:fixture.contract.id}}),approvals:await prisma.packageInvoiceApproval.findMany({where:{packageId:fixture.pkg.id}})});
 const parent=await prisma.parentAccount.create({data:{name:'Isolated notification recipient'}});
 await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:fixture.student.id,canViewFinance:true}});
 const before=await state();
 // Failure after invoice/audit/gate/top-up/status must leave none of those writes behind.
 await assert.rejects(prisma.$transaction(async tx=>{const broken=new Proxy(tx,{get(target,key){if(key==='studentContractEvent')return {...target.studentContractEvent,create:async()=>{throw new Error('forced signed event failure');}};return Reflect.get(target,key);}});return finalizeStudentContractSignature(broken,fixture.input,fixture.prepared);}),/forced signed event failure/);
 assert.deepEqual(await state(),before);assert.equal(await prisma.miniappNotificationOutbox.count({where:{studentId:fixture.student.id}}),0);
 await assert.rejects(prisma.$transaction(tx=>finalizeStudentContractSignature(tx,{...fixture.input,token:'wrong'},fixture.prepared)),/链接已变更/);
 await assert.rejects(prisma.$transaction(tx=>finalizeStudentContractSignature(tx,fixture.input,{...fixture.prepared,expectedUpdatedAt:'stale'})),/已变更/);
 const execute=()=>prisma.$transaction(tx=>finalizeStudentContractSignature(tx,fixture.input,fixture.prepared),{isolationLevel:'Serializable',timeout:15000});
 const competing=await Promise.allSettled([execute(),execute()]);assert.ok(competing.some(r=>r.status==='fulfilled'));
 const signed=await execute();assert.equal(signed.status,'INVOICE_CREATED');
 const after=await state();assert.equal(after.pkg?.totalMinutes,720);assert.equal(after.pkg?.remainingMinutes,420);assert.equal(after.txns.length,3);assert.equal(after.billing.invoices.length,1);assert.equal(after.events.filter(e=>e.eventType==='SIGNED').length,1);assert.equal(after.events.filter(e=>e.eventType==='INVOICE_CREATED').length,1);assert.equal(after.approvals.length,1);assert.equal(after.approvals[0].invoiceId,signed.invoiceId);assert.equal(await prisma.miniappNotificationOutbox.count({where:{studentId:fixture.student.id,status:'PENDING'}}),2);
 assert.equal(await prisma.auditLog.count({where:{action:'CREATE_INVOICE',entityId:signed.invoiceId!}}),1);
 await assert.rejects(refreshStudentContractIntakeLink({contractId:signed.id}),/cannot be resent/);
 await assert.rejects(saveStudentContractInvoiceChoice({contractId:signed.id,packageId:fixture.pkg.id,mode:'CREATE_NEW',selectedBy:'uat@example.invalid'}),/不能更改/);
 const cancelled=await make();await voidStudentContract({contractId:cancelled.contract.id,packageId:cancelled.pkg.id,expectedUpdatedAt:cancelled.prepared.expectedUpdatedAt,reason:'Isolated cancellation before signature commit'});
 await assert.rejects(prisma.$transaction(tx=>finalizeStudentContractSignature(tx,cancelled.input,cancelled.prepared)),/已变更/);
 assert.equal((await listParentBillingForPackage(cancelled.pkg.id)).invoices.length,0);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:cancelled.pkg.id}})).totalMinutes,600);
 const changedChoice=await make();
 const choiceInput={contractId:changedChoice.contract.id,packageId:changedChoice.pkg.id,mode:'CREATE_NEW' as const,selectedBy:'uat@example.invalid'};
 const choiceBefore=await prisma.appSetting.findUnique({where:{key:'student_contract_invoice_choice_v1'}});
 await assert.rejects(prisma.$transaction(tx=>{const broken=new Proxy(tx,{get(target,key){if(key==='auditLog')return {...target.auditLog,create:async()=>{throw new Error('forced choice audit failure');}};return Reflect.get(target,key);}});return saveStudentContractInvoiceChoiceInTransaction(broken,choiceInput);}),/forced choice audit failure/);
 assert.deepEqual(await prisma.appSetting.findUnique({where:{key:'student_contract_invoice_choice_v1'}}),choiceBefore);
 assert.equal((await prisma.studentContract.findUniqueOrThrow({where:{id:changedChoice.contract.id}})).updatedAt.toISOString(),changedChoice.prepared.expectedUpdatedAt);
 await saveStudentContractInvoiceChoice(choiceInput);
 await assert.rejects(prisma.$transaction(tx=>finalizeStudentContractSignature(tx,changedChoice.input,changedChoice.prepared)),/已变更/);
 assert.equal((await listParentBillingForPackage(changedChoice.pkg.id)).invoices.length,0);
 // Signature and void race: only the winner's business effect is allowed.
 const raced=await make();const result=await Promise.allSettled([prisma.$transaction(tx=>finalizeStudentContractSignature(tx,raced.input,raced.prepared),{isolationLevel:'Serializable'}),voidStudentContract({contractId:raced.contract.id,packageId:raced.pkg.id,expectedUpdatedAt:raced.prepared.expectedUpdatedAt})]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 const final=await prisma.studentContract.findUniqueOrThrow({where:{id:raced.contract.id}}),racedBilling=await listParentBillingForPackage(raced.pkg.id);assert.equal(racedBilling.invoices.length,final.status==='VOID'?0:1);
 // Pause a legacy link refresh after its read, then void; its stale write must fail.
 const stale=await make();const model=prisma.studentContract as any,originalFind=model.findUnique;
 let releaseRead!:()=>void,readReached!:()=>void;
 const held=new Promise<void>(resolve=>releaseRead=resolve),reached=new Promise<void>(resolve=>readReached=resolve);
 model.findUnique=async(args:any)=>{const row=await originalFind.call(model,args);if(args.where.id===stale.contract.id){readReached();await held;}return row;};
 try{
  const pending=refreshStudentContractSignLink({contractId:stale.contract.id});await reached;
  await voidStudentContract({contractId:stale.contract.id,packageId:stale.pkg.id,expectedUpdatedAt:stale.prepared.expectedUpdatedAt});releaseRead();
  await assert.rejects(pending,/合同已变更/);
 }finally{releaseRead();model.findUnique=originalFind;}
 assert.equal((await prisma.studentContract.findUniqueOrThrow({where:{id:stale.contract.id}})).status,'VOID');
 assert.equal(await prisma.studentContractEvent.count({where:{contractId:stale.contract.id,eventType:'SIGN_LINK_SENT'}}),0);
 // Expiration reading an old version must not overwrite a concurrent VOID.
 const expired=await make();await prisma.studentContract.update({where:{id:expired.contract.id},data:{signExpiresAt:new Date(0)}});
 let releaseExpiry!:()=>void,expiryRead!:()=>void;
 const expiryHeld=new Promise<void>(resolve=>releaseExpiry=resolve),expiryReached=new Promise<void>(resolve=>expiryRead=resolve);
 model.findUnique=async(args:any)=>{const row=await originalFind.call(model,args);if(args.where.signToken===expired.input.token){expiryRead();await expiryHeld;}return row;};
 try{
  const pending=getStudentContractBySignToken(expired.input.token);await expiryReached;
  const now=await prisma.studentContract.findUniqueOrThrow({where:{id:expired.contract.id}});
  await voidStudentContract({contractId:now.id,packageId:now.packageId,expectedUpdatedAt:now.updatedAt.toISOString()});releaseExpiry();
  assert.equal((await pending)?.status,'VOID');
 }finally{releaseExpiry();model.findUnique=originalFind;}
 assert.equal(await prisma.studentContractEvent.count({where:{contractId:expired.contract.id,eventType:'EXPIRED'}}),0);
 // Detaching a deleted invoice must preserve VOID even when a signature exists.
 const latest=await prisma.studentContract.findUniqueOrThrow({where:{id:signed.id}});await voidStudentContract({contractId:signed.id,packageId:fixture.pkg.id,expectedUpdatedAt:latest.updatedAt.toISOString(),reason:'Isolated retained signed history'});
 await detachDeletedInvoiceFromStudentContract({invoiceId:signed.invoiceId!,actorLabel:'Isolated test'});assert.equal((await prisma.studentContract.findUniqueOrThrow({where:{id:signed.id}})).status,'VOID');
 // Actual file/PDF preparation and public service, only a fake unlinked parent; no sender runs.
 const publicFlow=await make(false);const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 const publicResult=await signStudentContract({...publicFlow.input,signatureDataUrl:image});assert.equal(publicResult.status,'INVOICE_CREATED');assert.ok(publicResult.signedPdfPath);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:publicFlow.pkg.id}})).totalMinutes,600);assert.equal((await listParentBillingForPackage(publicFlow.pkg.id)).invoices.length,1);
 const browser=await make(false);writeFileSync('/tmp/sgt-r428-fixture.json',JSON.stringify({packageId:browser.pkg.id,contractId:browser.contract.id,token:browser.input.token}));
 console.log(JSON.stringify({passed:true,rollback:true,signatureIdempotent:true,voidRace:true,invoiceGateTopUpAuditAtomic:true,voidPreserved:true,realPdf:true,browserToken:browser.input.token}));
}
main().finally(()=>prisma.$disconnect());

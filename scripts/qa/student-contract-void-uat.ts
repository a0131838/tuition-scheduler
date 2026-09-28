import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {voidStudentContract,voidStudentContractInTransaction,deleteVoidStudentContractDraft} from '../../lib/student-contract';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),tag=`Contract Void UAT ${randomUUID()}`;
 const student=await prisma.student.create({data:{name:tag}}),shared=await prisma.student.create({data:{name:tag+' Shared'}}),course=await prisma.course.findFirstOrThrow();
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',totalMinutes:6000,remainingMinutes:2130,validFrom:new Date('2026-03-01'),sharedStudents:{create:{studentId:shared.id}}}});
 await prisma.packageTxn.createMany({data:[{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:6000,deltaAmount:8000,note:'Isolated purchase fixture'},{packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-3870,note:'Isolated usage fixture'}]});
 const template=await prisma.contractTemplate.create({data:{name:tag,slug:randomUUID(),version:1,bodyHtml:'Isolated fixture'}});
 const makeContract=(status:'SIGNED'|'CONTRACT_DRAFT'='SIGNED')=>prisma.studentContract.create({data:{studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status,signedAt:status==='SIGNED'?new Date():null,invoiceId:status==='SIGNED'?randomUUID():null,invoiceNo:status==='SIGNED'?'UAT-VOID-INVOICE':null,signedPdfPath:status==='SIGNED'?'uat-retained.pdf':null,signerName:status==='SIGNED'?'UAT Signer':null}});
 const contract=await makeContract();
 const input={contractId:contract.id,packageId:pkg.id,expectedUpdatedAt:contract.updatedAt.toISOString(),actorUserId:actor.id,actorLabel:actor.email,reason:'Confirmed wrong duplicate contract in isolated test'};
 const snapshot=()=>Promise.all([prisma.coursePackage.findUnique({where:{id:pkg.id},include:{sharedStudents:true}}),prisma.packageTxn.findMany({where:{packageId:pkg.id},orderBy:{id:'asc'}}),prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','parent_receipt_approval_v1']}},orderBy:{key:'asc'}}),prisma.packageInvoiceApproval.findMany({where:{packageId:pkg.id}})]);
 const before=await snapshot();
 await assert.rejects(voidStudentContract({...input,packageId:'another-package'}),/当前课包/);
 await assert.rejects(voidStudentContract({...input,expectedUpdatedAt:'old-version'}),/合同已更新/);
 await assert.rejects(voidStudentContract({...input,reason:''}),/必须填写原因/);
 await assert.rejects(voidStudentContract({...input,reason:'x'.repeat(2001)}),/最多2000/);
 await assert.rejects(prisma.$transaction(async tx=>{await voidStudentContractInTransaction(tx,input);throw new Error('forced event rollback');}),/forced event rollback/);
 assert.equal((await prisma.studentContract.findUniqueOrThrow({where:{id:contract.id}})).status,'SIGNED');assert.equal(await prisma.studentContractEvent.count({where:{contractId:contract.id,eventType:'VOIDED'}}),0);
 const race=await Promise.allSettled([voidStudentContract(input),voidStudentContract(input)]);assert.ok(race.some(r=>r.status==='fulfilled'));
 const saved=await voidStudentContract(input);assert.equal(saved.status,'VOID');assert.equal(saved.invoiceId,contract.invoiceId);assert.equal(saved.signedPdfPath,contract.signedPdfPath);assert.equal(saved.signerName,contract.signerName);assert.deepEqual(saved.signedAt,contract.signedAt);
 assert.equal(await prisma.studentContractEvent.count({where:{contractId:contract.id,eventType:'VOIDED'}}),1);
 await assert.rejects(voidStudentContract({...input,packageId:'another-package'}),/当前课包/);
 assert.deepEqual(await snapshot(),before);
 const draft=await makeContract('CONTRACT_DRAFT');await voidStudentContract({...input,contractId:draft.id,expectedUpdatedAt:draft.updatedAt.toISOString(),reason:''});assert.equal(await prisma.studentContractEvent.count({where:{contractId:draft.id,eventType:'VOIDED'}}),1);
 // A historical signature marker requires a reason even if the current status is a draft.
 const historical=await makeContract('CONTRACT_DRAFT');const marked=await prisma.studentContract.update({where:{id:historical.id},data:{signedPdfPath:'uat-history.pdf'}});await assert.rejects(voidStudentContract({...input,contractId:marked.id,expectedUpdatedAt:marked.updatedAt.toISOString(),reason:''}),/必须填写原因/);
 await voidStudentContract({...input,contractId:marked.id,expectedUpdatedAt:marked.updatedAt.toISOString(),reason:'Reviewed preserved signature evidence'});await assert.rejects(deleteVoidStudentContractDraft({contractId:marked.id,actorUserId:actor.id}),/stay in history/);
 const browser=await makeContract();const fixture={packageId:pkg.id,contractId:browser.id,expectedUpdatedAt:browser.updatedAt.toISOString(),studentId:student.id};writeFileSync('/tmp/sgt-r425-fixture.json',JSON.stringify(fixture));
 console.log(JSON.stringify({passed:true,exactPackageScope:true,staleVersionRejected:true,eventAtomicity:true,retriesOneEvent:true,signedHistoryRetained:true,sharedPackageUsageBillingApprovalsUnchanged:true,...fixture}));
}
main().finally(()=>prisma.$disconnect());

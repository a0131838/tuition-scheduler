import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {readPackageCorrection} from '../../lib/package-correction-evidence';
import {previewPackageCorrection} from '../../lib/package-correction-policy';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const tag=`Correction UAT ${randomUUID()}`,student=await prisma.student.create({data:{name:tag}}),course=await prisma.course.findFirstOrThrow();
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',totalMinutes:6000,remainingMinutes:2130,validFrom:new Date('2026-03-01')}});
 await prisma.packageTxn.createMany({data:[{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:6000},{packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-3870}]});
 const billingRow=await prisma.appSetting.findUniqueOrThrow({where:{key:'parent_billing_v1'}}),approvalRow=await prisma.appSetting.findUniqueOrThrow({where:{key:'parent_receipt_approval_v1'}});
 const billing=JSON.parse(billingRow.value),approvals=JSON.parse(approvalRow.value),invoiceId=randomUUID(),receiptId=randomUUID();
 billing.invoices.push({id:invoiceId,packageId:pkg.id,studentId:student.id,invoiceNo:tag,amount:8000,gstAmount:0,totalAmount:8000});
 billing.receipts.push({id:receiptId,invoiceId,packageId:pkg.id,studentId:student.id,amountReceived:8000});
 approvals.push({receiptId,financeApprovedBy:['finance@uat.invalid'],managerApprovedBy:[]});
 const persist=()=>Promise.all([prisma.appSetting.update({where:{key:billingRow.key},data:{value:JSON.stringify(billing)}}),prisma.appSetting.update({where:{key:approvalRow.key},data:{value:JSON.stringify(approvals)}})]);
 await persist();
 const snapshot=()=>Promise.all([prisma.coursePackage.findUnique({where:{id:pkg.id}}),prisma.packageTxn.findMany({where:{packageId:pkg.id},orderBy:{id:'asc'}}),prisma.appSetting.findMany({where:{key:{in:[billingRow.key,approvalRow.key]}},orderBy:{key:'asc'}}),prisma.auditLog.count(),prisma.studentContractEvent.count()]);
 const before=await snapshot(),full=await readPackageCorrection(pkg.id);assert.ok(full);assert.equal(full.approvedCents,800000);assert.equal(full.financialReview,false);assert.equal(previewPackageCorrection(full.facts,'64.5')?.remaining,0);assert.deepEqual(await snapshot(),before);
 const receipt=billing.receipts.find((x:any)=>x.id===receiptId);receipt.amountReceived=2000;await persist();const partial=await readPackageCorrection(pkg.id);assert.equal(partial?.approvedCents,200000);assert.notEqual(partial?.fingerprint,full.fingerprint);assert.equal(previewPackageCorrection(partial!.facts,'64.5')?.remaining,0);
 const approval=approvals.find((x:any)=>x.receiptId===receiptId);approval.financeApprovedBy=[];await persist();const pending=await readPackageCorrection(pkg.id);assert.equal(pending?.approvedCents,0);assert.equal(pending?.invoices.find(i=>i.id===invoiceId)?.pending,1);
 approval.financeRejectedAt='2026-09-28';approval.financeApprovedBy=['finance@uat.invalid'];await persist();assert.equal((await readPackageCorrection(pkg.id))?.approvedCents,0);delete approval.financeRejectedAt;
 receipt.packageId='wrong-package';await persist();const wrong=await readPackageCorrection(pkg.id);assert.equal(wrong?.financialReview,true);assert.equal(wrong?.approvedCents,null);assert.equal(previewPackageCorrection(wrong!.facts,'64.5')?.ready,false);receipt.packageId=pkg.id;
 receipt.invoiceId='missing';await persist();assert.equal((await readPackageCorrection(pkg.id))?.orphanReceipts,1);receipt.invoiceId=invoiceId;receipt.amountReceived=8000;await persist();
 await prisma.appSetting.update({where:{key:billingRow.key},data:{value:'not JSON'}});assert.equal((await readPackageCorrection(pkg.id))?.approvedCents,null);await persist();
 const shared=await prisma.student.create({data:{name:tag+' Shared'}});await prisma.coursePackageSharedStudent.create({data:{packageId:pkg.id,studentId:shared.id}});
 const s=await readPackageCorrection(pkg.id);assert.equal(previewPackageCorrection(s!.facts,'64.5')?.ready,false);assert.equal(s?.approvedCents,800000);
 await prisma.coursePackageSharedStudent.deleteMany({where:{packageId:pkg.id,studentId:shared.id}});
 const template=await prisma.contractTemplate.create({data:{name:tag,slug:randomUUID(),version:1,bodyHtml:'Isolated correction history'}});
 await prisma.studentContract.createMany({data:Array.from({length:33},(_,index)=>({studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status:index===0?'VOID' as const:'CONTRACT_DRAFT' as const,signedAt:index===0?new Date():null,invoiceId:index===0?invoiceId:null,invoiceNo:index===0?tag:null}))});
 const history=await readPackageCorrection(pkg.id);assert.equal(history?.contracts.length,33);assert.equal(history?.financialReview,false);
 const signed=history!.contracts.find(c=>c.status==='VOID')!;
 await prisma.studentContract.update({where:{id:signed.id},data:{invoiceId:'unresolved-source'}});const missing=await readPackageCorrection(pkg.id);assert.equal(missing?.unresolvedContractInvoices,1);assert.equal(missing?.financialReview,true);
 await prisma.studentContract.update({where:{id:signed.id},data:{invoiceId}});
 const finalBefore=await snapshot();await readPackageCorrection(pkg.id);assert.deepEqual(await snapshot(),finalBefore);
 const fixture={packageId:pkg.id,studentId:student.id,invoiceId,receiptId,tag};writeFileSync('/tmp/sgt-r426-fixture.json',JSON.stringify(fixture));console.log(JSON.stringify({passed:true,readOnly:true,fullPartialPendingRejectedCovered:true,malformedAndOrphanReview:true,sharedAllocationNotGuessed:true,...fixture}));
}
main().finally(()=>prisma.$disconnect());

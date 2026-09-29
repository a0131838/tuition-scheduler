import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {readPackageCorrection} from '../../lib/package-correction-evidence';
import {applyEntitlementCorrection,applyEntitlementCorrectionInTransaction,type EntitlementCorrectionInput} from '../../lib/package-entitlement-correction';
import {lockLegacyLedgerSnapshot} from '../../lib/package-ledger-correction-guard';
import {getRenewalEntitlementEvidence,verifyRenewalEntitlement} from '../../lib/renewal-entitlement-evidence';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),course=await prisma.course.findFirstOrThrow();
 const make=async(count=false)=>{const student=await prisma.student.create({data:{name:`Entitlement UAT ${randomUUID()}`}});const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',note:count?'[GROUP_PACK]':null,totalMinutes:count?100:6000,remainingMinutes:count?40:2130,validFrom:new Date('2026-03-01')}});const purchase=await prisma.packageTxn.create({data:{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:count?100:6000,deltaAmount:8000,note:'Immutable isolated source'}});await prisma.packageTxn.create({data:{packageId:pkg.id,kind:'DEDUCT',deltaMinutes:count?-60:-3870}});return {pkg,purchase,student};};
 const {pkg,purchase}=await make();const before=await readPackageCorrection(pkg.id);assert.ok(before);assert.equal(before.facts.issues.length,0);
 const input:EntitlementCorrectionInput={packageId:pkg.id,sourceTxnId:purchase.id,requestKey:randomUUID(),fingerprint:before.fingerprint,target:'64.5',reason:'Confirmed incorrect purchase quantity',evidence:'Finance confirmed only64.5hours purchased; no cash refund',acknowledged:true};
 const financeBefore=await prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','parent_receipt_approval_v1','partner_billing_v1']}},orderBy:{key:'asc'}});
 for(const denied of [{...actor,email:'not-owner@example.invalid'},{...actor,role:'FINANCE'},{...actor,isObserver:true},{...actor,operationsAdmin:true}])await assert.rejects(applyEntitlementCorrection(denied,input),/仅老板/);
 await assert.rejects(applyEntitlementCorrection(actor,{...input,acknowledged:false}),/处理范围/);
 await assert.rejects(applyEntitlementCorrection(actor,{...input,fingerprint:'0'.repeat(64)}),/凭据已变化/);
 await assert.rejects(applyEntitlementCorrection(actor,{...input,sourceTxnId:randomUUID()}),/原始购入/);
 await assert.rejects(applyEntitlementCorrection(actor,{...input,target:'50'}),/核对预览/);
 // Fail precisely when writing the audit; no package, correction or ledger change may survive.
 await assert.rejects(prisma.$transaction(async tx=>{const broken=new Proxy(tx,{get(target,key){if(key==='auditLog')return {...target.auditLog,create:async()=>{throw new Error('forced audit failure');}};return Reflect.get(target,key);}});await applyEntitlementCorrectionInTransaction(broken,actor,input);}),/forced audit failure/);
 assert.deepEqual(await prisma.coursePackage.findUnique({where:{id:pkg.id}}),pkg);assert.equal(await prisma.packageTxn.count({where:{packageId:pkg.id}}),2);assert.equal(await prisma.packageEntitlementCorrection.count({where:{packageId:pkg.id}}),0);
 const raced=await Promise.allSettled([applyEntitlementCorrection(actor,input),applyEntitlementCorrection(actor,input)]);assert.ok(raced.some(r=>r.status==='fulfilled'));
 const record=await applyEntitlementCorrection(actor,input);assert.equal(record.afterTotal,3870);assert.equal(record.afterBalance,0);assert.equal(await prisma.packageEntitlementCorrection.count({where:{packageId:pkg.id}}),1);assert.equal(await prisma.auditLog.count({where:{entityId:record.id,action:'APPLY_ENTITLEMENT_CORRECTION'}}),1);
 assert.deepEqual(await prisma.packageTxn.findUnique({where:{id:purchase.id}}),purchase);assert.equal(await prisma.packageTxn.count({where:{packageId:pkg.id}}),3);
 const after=await readPackageCorrection(pkg.id);assert.equal(after?.facts.issues.length,0);assert.equal(after?.facts.purchase,6000);assert.equal(after?.facts.verifiedCorrection,-2130);assert.equal(after?.facts.recordedTotal,3870);
 const renewalTask={id:randomUUID(),studentId:pkg.studentId,packageId:pkg.id,createdAt:new Date('2026-01-01'),contractId:null};
 const renewal=await getRenewalEntitlementEvidence(renewalTask);assert.equal(renewal.candidates.find(c=>c.id===purchase.id)?.blocker,'CORRECTION');assert.deepEqual(renewal.automaticIds,[]);
 await assert.rejects(prisma.$transaction(tx=>verifyRenewalEntitlement(renewalTask,{entitlementEvidenceIds:[purchase.id],entitlementReviewNote:'Confirmed original purchase evidence'},tx)),/发生冲正/);
 await assert.rejects(applyEntitlementCorrection(actor,{...input,target:'70'}),/请求编号/);
 await assert.rejects(prisma.$transaction(tx=>lockLegacyLedgerSnapshot(tx,{packageId:pkg.id,totalMinutes:3870,remainingMinutes:0,ledgerRemaining:0,txnId:purchase.id})),{name:'Error'});
 await assert.rejects(prisma.$transaction(tx=>lockLegacyLedgerSnapshot(tx,{packageId:pkg.id,totalMinutes:3870,remainingMinutes:0,ledgerRemaining:0,txnId:record.adjustmentTxnId})),{name:'Error'});
 await assert.rejects(prisma.packageTxn.delete({where:{id:purchase.id}}));
 const counted=await make(true),countBefore=await readPackageCorrection(counted.pkg.id);const countResult=await applyEntitlementCorrection(actor,{...input,packageId:counted.pkg.id,sourceTxnId:counted.purchase.id,requestKey:randomUUID(),fingerprint:countBefore!.fingerprint,target:'60'});assert.equal(countResult.unit,'COUNT');assert.equal(countResult.deltaUnits,-40);
 const sequential=await make();const seqBefore=await readPackageCorrection(sequential.pkg.id);await applyEntitlementCorrection(actor,{...input,packageId:sequential.pkg.id,sourceTxnId:sequential.purchase.id,requestKey:randomUUID(),fingerprint:seqBefore!.fingerprint,target:'80'});const seqNext=await readPackageCorrection(sequential.pkg.id);const seqEnd=await applyEntitlementCorrection(actor,{...input,packageId:sequential.pkg.id,sourceTxnId:sequential.purchase.id,requestKey:randomUUID(),fingerprint:seqNext!.fingerprint,target:'64.5'});assert.equal(seqEnd.afterBalance,0);assert.equal((await readPackageCorrection(sequential.pkg.id))?.facts.issues.length,0);
 const shared=await make();await prisma.coursePackageSharedStudent.create({data:{packageId:shared.pkg.id,studentId:counted.student.id}});const sharedRead=await readPackageCorrection(shared.pkg.id);await assert.rejects(applyEntitlementCorrection(actor,{...input,packageId:shared.pkg.id,sourceTxnId:shared.purchase.id,requestKey:randomUUID(),fingerprint:sharedRead!.fingerprint}),/核对预览/);
 assert.deepEqual(await prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','parent_receipt_approval_v1','partner_billing_v1']}},orderBy:{key:'asc'}}),financeBefore);
 const browser=await make();const browserData=await readPackageCorrection(browser.pkg.id);const fixture={packageId:browser.pkg.id,sourceTxnId:browser.purchase.id,fingerprint:browserData!.fingerprint,target:'64.5',reason:input.reason,evidence:input.evidence,acknowledged:true,requestKey:randomUUID()};writeFileSync('/tmp/sgt-r427-fixture.json',JSON.stringify(fixture));
 console.log(JSON.stringify({passed:true,sourceRetained:true,auditAtomic:true,idempotent:true,concurrency:true,proofReconciles:true,countSupported:true,legacyProtection:true,sharedBlocked:true,financialSourcesUnchanged:true,...fixture}));
}
main().finally(()=>prisma.$disconnect());

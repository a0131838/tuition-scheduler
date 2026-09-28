import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {attributePartnerInvoice,attributePartnerInvoiceInTransaction,readPartnerInvoiceEvidence,listPartnerInvoiceCandidates} from '../../lib/sales-partner-invoice-evidence';
import {mutateSalesEvidence} from '../../lib/sales-evidence';
import {salesInvoiceFingerprint} from '../../lib/sales-invoice-policy';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const keys=['partner_billing_v1','partner_receipt_approval_v1','approval_finance_emails_v1'];
 const originals=await prisma.appSetting.findMany({where:{key:{in:keys}}});
 const set=(key:string,value:unknown)=>prisma.appSetting.upsert({where:{key},create:{key,value:typeof value==='string'?value:JSON.stringify(value)},update:{value:typeof value==='string'?value:JSON.stringify(value)}});
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),tag=`Partner Invoice UAT ${randomUUID()}`;
 const student=await prisma.student.create({data:{name:tag}}),course=await prisma.course.findFirstOrThrow();
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',validFrom:new Date(),totalMinutes:600,remainingMinutes:600}});
 const channel=await prisma.studentSourceChannel.create({data:{name:tag}});
 const partner=await prisma.partner.create({data:{name:tag,sourceChannelId:channel.id,billTo:tag}});
 const settlement=await prisma.partnerSettlement.create({data:{studentId:student.id,partnerId:partner.id,packageId:pkg.id,mode:'ONLINE_PACKAGE_END',amount:100}});
 const relation=await prisma.salesRelationship.create({data:{name:tag,kind:'AGENT',status:'ACTIVE',createdById:actor.id,createdByName:actor.name}});
 const makeLead=()=>prisma.lead.create({data:{leadNo:`UAT-${randomUUID()}`,studentName:tag,sourceType:'Referral',recordKind:'STUDENT',relationshipId:relation.id,convertedStudentId:student.id,relationshipLinkedAt:new Date(),status:'Contacted'}});
 const lead=await makeLead(),other=await makeLead();
 const invoice={id:randomUUID(),partnerId:partner.id,mode:'ONLINE_PACKAGE_END',settlementIds:[settlement.id],invoiceNo:`UAT-PARTNER-${randomUUID()}`,issueDate:'2026-09-28',dueDate:'2026-10-01',amount:100,gstAmount:9,totalAmount:109,lines:[{id:randomUUID(),type:'SETTLEMENT',settlementId:settlement.id,amount:33.33,quantity:3,gstAmount:9,totalAmount:109}]};
 const receipt={id:randomUUID(),partnerId:partner.id,mode:invoice.mode,invoiceId:invoice.id,receiptNo:'UAT-PARTNER-RC',amountReceived:50};
 const approved={receiptId:receipt.id,managerApprovedBy:[],financeApprovedBy:['finance@uat.invalid']};
 const input={leadId:lead.id,documentId:invoice.id,expectedUpdatedAt:lead.updatedAt.toISOString(),sourceFingerprint:salesInvoiceFingerprint(invoice),reviewNote:'Exact partner invoice and referral reviewed'};
 const credit=await prisma.creditNote.create({data:{sourceType:'PARTNER_INVOICE',sourceInvoiceId:invoice.id,sourceInvoiceNo:invoice.invoiceNo,sourceInvoiceDate:invoice.issueDate,sourceInvoiceSnapshot:invoice,creditNoteNo:`UAT-CN-${randomUUID()}`,issueDate:'2026-09-28',supplierName:'UAT',supplierAddress:'UAT',supplierRegistrationNo:'UAT',customerName:tag,reason:'Isolated test',originalInvoiceTotal:109,amount:20,gstAmount:1.8,totalAmount:21.8,status:'ISSUED',createdBy:actor.email,issuedAt:new Date()}});
 const beforeLedger=await prisma.packageTxn.count(),beforePackage=await prisma.coursePackage.findUnique({where:{id:pkg.id}});
 try{
 await set(keys[0],{invoices:[invoice],receipts:[receipt]});await set(keys[1],[approved]);await set(keys[2],'finance@uat.invalid');
 const settingsBefore=await prisma.appSetting.findMany({where:{key:{in:keys}},orderBy:{key:'asc'}});
 for(const denied of [{...actor,role:'SALES'},{...actor,role:'CS'},{...actor,role:'FINANCE'},{...actor,operationsAdmin:true},{...actor,isObserver:true}])await assert.rejects(attributePartnerInvoice(denied,input));
 for(const denied of [{...actor,role:'SALES'},{...actor,operationsAdmin:true}]){await assert.rejects(readPartnerInvoiceEvidence(denied,{leadId:lead.id}));await assert.rejects(listPartnerInvoiceCandidates(denied,lead.id));}
 for(const bad of [{...input,sourceFingerprint:'stale'},{...input,expectedUpdatedAt:'stale'},{...input,reviewNote:''}])await assert.rejects(attributePartnerInvoice(actor,bad));
 await assert.rejects(prisma.$transaction(async tx=>{await attributePartnerInvoiceInTransaction(tx,actor,input);throw Error('forced isolated rollback');}),/forced isolated rollback/);assert.equal(await prisma.salesEvidenceAssignment.count({where:{documentId:invoice.id}}),0);
 const race=await Promise.allSettled([attributePartnerInvoice(actor,input),attributePartnerInvoice(actor,{...input,leadId:other.id,expectedUpdatedAt:other.updatedAt.toISOString()})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 let assignment=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{kind_documentId:{kind:'PARTNER_INVOICE',documentId:invoice.id}}});
 const winner=assignment.leadId===lead.id?lead:other;const winnerInput={...input,leadId:winner.id,expectedUpdatedAt:winner.updatedAt.toISOString()};await attributePartnerInvoice(actor,winnerInput);assert.equal(await prisma.auditLog.count({where:{entityId:assignment.id,action:'ATTACH_PARTNER_INVOICE'}}),1);
 let totals=(await readPartnerInvoiceEvidence(actor,{relationshipId:relation.id})).summary;assert.equal(totals.approvedCents,5000);assert.equal(totals.creditCents,2180);assert.equal(totals.adjustedInvoiceCents,8720);
 assert.deepEqual(await prisma.appSetting.findMany({where:{key:{in:keys}},orderBy:{key:'asc'}}),settingsBefore);
 assert.deepEqual(await prisma.partnerSettlement.findUnique({where:{id:settlement.id}}),settlement);assert.deepEqual(await prisma.creditNote.findUnique({where:{id:credit.id}}),credit);
 await prisma.partnerSettlement.update({where:{id:settlement.id},data:{revertedAt:new Date()}});assert.equal((await readPartnerInvoiceEvidence(actor,{relationshipId:relation.id})).summary.review,1);await prisma.partnerSettlement.update({where:{id:settlement.id},data:{revertedAt:null}});
 await prisma.creditNote.update({where:{id:credit.id},data:{status:'VOID',voidedAt:new Date()}});totals=(await readPartnerInvoiceEvidence(actor,{relationshipId:relation.id})).summary;assert.equal(totals.creditCents,0);assert.equal(totals.approvedCents,5000);await prisma.creditNote.update({where:{id:credit.id},data:{status:'ISSUED',voidedAt:null}});
 const edited={...invoice,invoiceNo:invoice.invoiceNo+'-EDIT'};await set(keys[0],{invoices:[edited],receipts:[receipt]});assert.equal((await readPartnerInvoiceEvidence(actor,{relationshipId:relation.id})).summary.review,1);await assert.rejects(attributePartnerInvoice(actor,winnerInput),/发票内容/);await set(keys[0],{invoices:[invoice],receipts:[receipt]});
 await mutateSalesEvidence(actor,{action:'REVOKE',leadId:winner.id,assignmentId:assignment.id,expectedUpdatedAt:assignment.updatedAt.toISOString(),reviewNote:'Isolated revoke'});assert.equal((await readPartnerInvoiceEvidence(actor,{relationshipId:relation.id})).summary.verifiedInvoices,0);await attributePartnerInvoice(actor,winnerInput);
 assert.equal(await prisma.packageTxn.count(),beforeLedger);assert.deepEqual(await prisma.coursePackage.findUnique({where:{id:pkg.id}}),beforePackage);assert.equal((await prisma.lead.findUniqueOrThrow({where:{id:lead.id}})).status,'Contacted');
 const browserInvoice={...invoice,id:randomUUID(),invoiceNo:'UAT-PARTNER-BROWSER-109'};
 const browserReceipt={...receipt,id:randomUUID(),invoiceId:browserInvoice.id};
 const mixedInvoice={...invoice,id:randomUUID(),invoiceNo:'UAT-MIXED-REVIEW',settlementIds:[settlement.id,'unknown-settlement']};
 await set(keys[0],{invoices:[invoice,browserInvoice,mixedInvoice],receipts:[receipt,browserReceipt]});await set(keys[1],[approved,{...approved,receiptId:browserReceipt.id}]);
 const candidates=await listPartnerInvoiceCandidates(actor,lead.id);assert.equal(candidates.rows.find(r=>r.id===mixedInvoice.id)?.state,'REVIEW');assert.equal((await readPartnerInvoiceEvidence(actor,{relationshipId:relation.id})).unassignedInvoices,2);
 const fixture={leadId:lead.id,relationshipId:relation.id,invoiceId:browserInvoice.id};writeFileSync('/tmp/sgt-r423-fixture.json',JSON.stringify(fixture));
 console.log(JSON.stringify({passed:true,uniqueAttribution:true,creditNotDoubleSubtracted:true,sourceChangeReview:true,atomicRollback:true,businessRecordsUnchanged:true,...fixture}));
 }finally{if(process.env.UAT_KEEP_FIXTURE!=='1'){for(const key of keys){const original=originals.find(r=>r.key===key);if(original)await prisma.appSetting.upsert({where:{key},create:original,update:{value:original.value}});else await prisma.appSetting.deleteMany({where:{key}});}}}
}
main().finally(()=>prisma.$disconnect());

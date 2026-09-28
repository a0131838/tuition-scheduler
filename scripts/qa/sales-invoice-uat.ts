import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {attributeParentInvoice,attributeParentInvoiceInTransaction,readParentInvoiceEvidence,listParentInvoiceCandidates,type ParentInvoiceInput} from '../../lib/sales-invoice-evidence';
import {mutateSalesEvidence,readSalesContractEvidence} from '../../lib/sales-evidence';
import {salesInvoiceFingerprint} from '../../lib/sales-invoice-policy';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const keys=['parent_billing_v1','parent_receipt_approval_v1','approval_finance_emails_v1'];
 const originals=await prisma.appSetting.findMany({where:{key:{in:keys}}});
 const set=(key:string,value:unknown)=>prisma.appSetting.upsert({where:{key},create:{key,value:typeof value==='string'?value:JSON.stringify(value)},update:{value:typeof value==='string'?value:JSON.stringify(value)}});
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),tag=`Invoice Evidence UAT ${randomUUID()}`;
 const student=await prisma.student.create({data:{name:tag}}),course=await prisma.course.findFirstOrThrow();
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',validFrom:new Date(),totalMinutes:600,remainingMinutes:600}});
 const relation=await prisma.salesRelationship.create({data:{name:tag,kind:'AGENT',status:'ACTIVE',createdById:actor.id,createdByName:actor.name}});
 const makeLead=()=>prisma.lead.create({data:{leadNo:`UAT-${randomUUID()}`,studentName:tag,sourceType:'Referral',recordKind:'STUDENT',relationshipId:relation.id,convertedStudentId:student.id,relationshipLinkedAt:new Date(),status:'Contacted'}});
 const lead=await makeLead(),other=await makeLead();
 const invoice={id:randomUUID(),studentId:student.id,packageId:pkg.id,invoiceNo:`UAT-PARENT-${randomUUID()}`,issueDate:'2026-09-28',dueDate:'2026-10-01',amount:100,gstAmount:9,totalAmount:109,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 const receipt={id:randomUUID(),studentId:student.id,packageId:pkg.id,invoiceId:invoice.id,receiptNo:'UAT-RC',amountReceived:50};
 const approved={receiptId:receipt.id,managerApprovedBy:[],financeApprovedBy:['finance@uat.invalid']};
 const input:ParentInvoiceInput={leadId:lead.id,documentId:invoice.id,expectedUpdatedAt:lead.updatedAt.toISOString(),sourceFingerprint:salesInvoiceFingerprint(invoice),reviewNote:'Exact invoice and referral reviewed'};
 const template=await prisma.contractTemplate.create({data:{name:tag,slug:randomUUID(),version:1,bodyHtml:'Isolated test'}});
 const contract=await prisma.studentContract.create({data:{studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status:'SIGNED',signedAt:new Date(),invoiceId:invoice.id}});
 const contractInput={action:'ATTACH' as const,leadId:other.id,documentId:contract.id,expectedUpdatedAt:other.updatedAt.toISOString(),sourceUpdatedAt:contract.updatedAt.toISOString(),reviewNote:'Exact contract reviewed'};
 const beforeLedger=await prisma.packageTxn.count(),beforePackage=await prisma.coursePackage.findUnique({where:{id:pkg.id}});
 try{
 await set(keys[0],{invoices:[invoice],receipts:[receipt]});await set(keys[1],[approved]);await set(keys[2],'finance@uat.invalid');
 const settingsBefore=await prisma.appSetting.findMany({where:{key:{in:keys}},orderBy:{key:'asc'}});
 for(const denied of [{...actor,role:'SALES'},{...actor,role:'CS'},{...actor,role:'FINANCE'},{...actor,operationsAdmin:true},{...actor,isObserver:true}])await assert.rejects(attributeParentInvoice(denied,input));
 for(const denied of [{...actor,role:'SALES'},{...actor,operationsAdmin:true}]){await assert.rejects(readParentInvoiceEvidence(denied,{leadId:lead.id}));await assert.rejects(listParentInvoiceCandidates(denied,lead.id));}
 for(const bad of [{...input,sourceFingerprint:'stale'},{...input,expectedUpdatedAt:'stale'},{...input,reviewNote:''}])await assert.rejects(attributeParentInvoice(actor,bad));
 await assert.rejects(prisma.$transaction(async tx=>{await attributeParentInvoiceInTransaction(tx,actor,input);throw Error('forced isolated rollback');}),/forced isolated rollback/);assert.equal(await prisma.salesEvidenceAssignment.count({where:{documentId:invoice.id}}),0);
 const race=await Promise.allSettled([attributeParentInvoice(actor,input),attributeParentInvoice(actor,{...input,leadId:other.id,expectedUpdatedAt:other.updatedAt.toISOString()})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 let assignment=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{kind_documentId:{kind:'PARENT_INVOICE',documentId:invoice.id}}});
 const winner=assignment.leadId===lead.id?lead:other;const winnerInput={...input,leadId:winner.id,expectedUpdatedAt:winner.updatedAt.toISOString()};await attributeParentInvoice(actor,winnerInput);assert.equal(await prisma.auditLog.count({where:{entityId:assignment.id,action:'ATTACH_INVOICE'}}),1);
 assert.equal((await readParentInvoiceEvidence(actor,{relationshipId:relation.id})).summary.approvedCents,5000);
 await assert.rejects(mutateSalesEvidence(actor,{...contractInput,leadId:assignment.leadId===lead.id?other.id:lead.id,expectedUpdatedAt:assignment.leadId===lead.id?other.updatedAt.toISOString():lead.updatedAt.toISOString()}),/关联发票/);
 assert.deepEqual(await prisma.appSetting.findMany({where:{key:{in:keys}},orderBy:{key:'asc'}}),settingsBefore);
 await set(keys[1],[]);let totals=(await readParentInvoiceEvidence(actor,{relationshipId:relation.id})).summary;assert.equal(totals.approvedCents,0);assert.equal(totals.pendingReceipts,1);
 await set(keys[1],[{...approved,managerRejectReason:'Review'}]);totals=(await readParentInvoiceEvidence(actor,{relationshipId:relation.id})).summary;assert.equal(totals.approvedCents,0);assert.equal(totals.rejectedReceipts,1);
 await set(keys[1],[approved]);
 const edited={...invoice,amount:200,totalAmount:209};await set(keys[0],{invoices:[edited],receipts:[receipt]});assert.equal((await readParentInvoiceEvidence(actor,{relationshipId:relation.id})).summary.review,1);await assert.rejects(attributeParentInvoice(actor,winnerInput),/发票内容/);await attributeParentInvoice(actor,{...winnerInput,sourceFingerprint:salesInvoiceFingerprint(edited)});
 assignment=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{id:assignment.id}});await mutateSalesEvidence(actor,{action:'REVOKE',leadId:winner.id,assignmentId:assignment.id,expectedUpdatedAt:assignment.updatedAt.toISOString(),reviewNote:'Invoice reassignment reviewed'});
 await mutateSalesEvidence(actor,contractInput);await assert.rejects(attributeParentInvoice(actor,{...input,sourceFingerprint:salesInvoiceFingerprint(edited)}),/关联合同/);
 // An existing invoice attribution must become REVIEW if contract linkage later conflicts.
 await attributeParentInvoice(actor,{...input,leadId:other.id,expectedUpdatedAt:other.updatedAt.toISOString(),sourceFingerprint:salesInvoiceFingerprint(edited)});
 const contractAssignment=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{kind_documentId:{kind:'CONTRACT',documentId:contract.id}}});
 await prisma.salesEvidenceAssignment.update({where:{id:contractAssignment.id},data:{leadId:lead.id}});
 assert.equal((await readParentInvoiceEvidence(actor,{leadId:other.id})).summary.review,1);
 assert.equal((await readSalesContractEvidence(actor,{leadId:lead.id})).rows[0].state,'REVIEW');
 await prisma.salesEvidenceAssignment.update({where:{id:contractAssignment.id},data:{status:'REVOKED'}});
 // Concurrency across document kinds must not split one contract/invoice across leads.
 const raceInvoice={...invoice,id:randomUUID(),invoiceNo:'UAT-CROSS-RACE'};
 await set(keys[0],{invoices:[edited,raceInvoice],receipts:[receipt]});
 const raceContract=await prisma.studentContract.create({data:{studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status:'SIGNED',signedAt:new Date(),invoiceId:raceInvoice.id}});
 const cross=await Promise.allSettled([attributeParentInvoice(actor,{...input,documentId:raceInvoice.id,sourceFingerprint:salesInvoiceFingerprint(raceInvoice)}),mutateSalesEvidence(actor,{...contractInput,documentId:raceContract.id,sourceUpdatedAt:raceContract.updatedAt.toISOString()})]);assert.equal(cross.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(await prisma.packageTxn.count(),beforeLedger);assert.deepEqual(await prisma.coursePackage.findUnique({where:{id:pkg.id}}),beforePackage);assert.deepEqual(await prisma.studentContract.findUnique({where:{id:contract.id}}),contract);
 // Keep a separate unattached invoice for actual browser acceptance, never use live business data.
 const browserInvoice={...invoice,id:randomUUID(),invoiceNo:'UAT-BROWSER-109'};
 const browserReceipt={...receipt,id:randomUUID(),invoiceId:browserInvoice.id};
 await set(keys[0],{invoices:[edited,raceInvoice,browserInvoice],receipts:[receipt,browserReceipt]});await set(keys[1],[approved,{...approved,receiptId:browserReceipt.id}]);
 console.log(JSON.stringify({passed:true,uniqueAttribution:true,crossKindRaceProtected:true,approvalStateLive:true,changedInvoiceRereview:true,noBillingWritesDuringAttribution:true,browserLeadId:lead.id,browserRelationshipId:relation.id,browserInvoiceId:browserInvoice.id}));
 }finally{if(process.env.UAT_KEEP_FIXTURE!=='1'){for(const key of keys){const original=originals.find(r=>r.key===key);if(original)await prisma.appSetting.upsert({where:{key},create:original,update:{value:original.value}});else await prisma.appSetting.deleteMany({where:{key}});}}}
}
main().finally(()=>prisma.$disconnect());

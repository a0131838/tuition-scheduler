import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {getNextParentInvoiceNo,createParentInvoice,createParentReceipt,addParentPaymentRecord,listParentBillingForPackage,listDeletedParentInvoices,deleteParentInvoice} from '../../lib/student-parent-billing';
import {deleteParentInvoiceInTransaction} from '../../lib/parent-invoice-deletion';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const course=await prisma.course.findFirstOrThrow(),template=await prisma.contractTemplate.create({data:{name:'Invoice archive UAT',slug:randomUUID(),version:1,bodyHtml:'Isolated'}});
 const make=async()=>{
  const student=await prisma.student.create({data:{name:`Invoice archive UAT ${randomUUID()}`}}),parent=await prisma.parentAccount.create({data:{name:'Fake parent without contact'}});
  await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});
  const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',totalMinutes:600,remainingMinutes:300,validFrom:new Date('2026-01-01'),financeGateStatus:'INVOICE_PENDING_MANAGER'}});
  await prisma.packageTxn.createMany({data:[{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:600},{packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-300}]});
  const invoice=await createParentInvoice({packageId:pkg.id,studentId:student.id,invoiceNo:await getNextParentInvoiceNo('2026-09-29'),issueDate:'2026-09-29',dueDate:'2026-10-01',billTo:student.name,quantity:1,description:'Isolated original invoice retained',amount:200,gstAmount:18,totalAmount:218,paymentTerms:'Immediate',note:'Original source note',createdBy:'uat@example.invalid'});
  const contract=await prisma.studentContract.create({data:{studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status:'VOID',voidedAt:new Date(),signedAt:new Date(),signedPdfPath:'retained-uat.pdf',invoiceId:invoice.id,invoiceNo:invoice.invoiceNo,invoiceCreatedAt:new Date()}});
  await prisma.packageInvoiceApproval.create({data:{packageId:pkg.id,invoiceId:invoice.id,submittedBy:'uat@example.invalid'}});
  const input={invoiceId:invoice.id,packageId:pkg.id,actorEmail:'zhaohongwei0880@gmail.com',reason:'Reviewed wrong duplicate draft; no payment received',expectedUpdatedAt:invoice.updatedAt};return {student,pkg,invoice,contract,input};
 };
 const f=await make();
 const snapshot=()=>Promise.all([prisma.appSetting.findUnique({where:{key:'parent_billing_v1'}}),prisma.coursePackage.findUnique({where:{id:f.pkg.id}}),prisma.packageTxn.findMany({where:{packageId:f.pkg.id},orderBy:{id:'asc'}}),prisma.studentContract.findUnique({where:{id:f.contract.id}}),prisma.packageInvoiceApproval.findMany({where:{packageId:f.pkg.id}}),prisma.miniappNotificationOutbox.findMany({where:{studentId:f.student.id},orderBy:{id:'asc'}})]);
 const before=await snapshot();
 await assert.rejects(deleteParentInvoice({...f.input,packageId:randomUUID()}),/不属于/);
 await assert.rejects(deleteParentInvoice({...f.input,expectedUpdatedAt:'stale'}),/已变更/);
 await assert.rejects(deleteParentInvoice({...f.input,reason:''}),/核对原因/);
 await assert.rejects(prisma.$transaction(tx=>{const broken=new Proxy(tx,{get(target,key){if(key==='auditLog')return {...target.auditLog,create:async()=>{throw new Error('forced deletion audit failure');}};return Reflect.get(target,key);}});return deleteParentInvoiceInTransaction(broken,f.input);}),/forced deletion audit failure/);
 assert.deepEqual(await snapshot(),before);
 const race=await Promise.allSettled([deleteParentInvoice(f.input),deleteParentInvoice(f.input)]);assert.ok(race.some(r=>r.status==='fulfilled'));
 assert.equal((await deleteParentInvoice(f.input)).alreadyDeleted,true);
 const history=(await listDeletedParentInvoices(f.pkg.id)).filter(i=>i.invoiceId===f.invoice.id);assert.equal(history.length,1);assert.deepEqual(history[0].snapshot,f.invoice);assert.equal(history[0].reason,f.input.reason);
 const after=await prisma.coursePackage.findUniqueOrThrow({where:{id:f.pkg.id}});assert.equal(after.totalMinutes,600);assert.equal(after.remainingMinutes,300);assert.equal(after.financeGateStatus,'EXEMPT');
 const c=await prisma.studentContract.findUniqueOrThrow({where:{id:f.contract.id}});assert.equal(c.status,'VOID');assert.equal(c.signedPdfPath,'retained-uat.pdf');assert.deepEqual(c.signedAt,f.contract.signedAt);assert.equal(c.invoiceNo,f.invoice.invoiceNo);assert.equal(c.invoiceId,null);
 assert.equal(await prisma.packageInvoiceApproval.count({where:{invoiceId:f.invoice.id}}),0);assert.equal(await prisma.auditLog.count({where:{action:'DELETE_INVOICE',entityId:f.invoice.id}}),1);assert.equal(await prisma.miniappNotificationOutbox.count({where:{studentId:f.student.id,status:'SKIPPED'}}),2);
 assert.deepEqual(await prisma.packageTxn.findMany({where:{packageId:f.pkg.id},orderBy:{id:'asc'}}),before[2]);
 const active=await make();await prisma.studentContract.update({where:{id:active.contract.id},data:{status:'SIGNED',voidedAt:null}});await assert.rejects(deleteParentInvoice(active.input),/关联合同/);
 const app=await make();await prisma.schoolApplicationService.create({data:{studentId:app.student.id,packageId:app.pkg.id,status:'SIGNED',invoiceId:app.invoice.id,billTo:'Isolated Parent',agreementDate:new Date(),applicationItemsJson:[]}});await assert.rejects(deleteParentInvoice(app.input),/关联合同/);
 const paid=await make();await createParentReceipt({packageId:paid.pkg.id,studentId:paid.student.id,invoiceId:paid.invoice.id,receiptNo:paid.invoice.invoiceNo+'-RC',receiptDate:'2026-09-29',receivedFrom:'Isolated Parent',paidBy:'Test',quantity:1,description:'Partial receipt',amount:100,gstAmount:0,totalAmount:100,amountReceived:100,createdBy:'uat@example.invalid'});await assert.rejects(deleteParentInvoice(paid.input),/已有收据/);
 const proof=await make();await addParentPaymentRecord({packageId:proof.pkg.id,studentId:proof.student.id,originalFileName:'fake.png',storedFileName:'fake.png',relativePath:'/isolated/fake.png',uploadedBy:'uat@example.invalid'});await assert.rejects(deleteParentInvoice(proof.input),/未核销付款凭据/);
 // A receipt racing deletion must never survive without its source invoice.
 for(let attempt=0;attempt<3;attempt++){
  const concurrent=await make();
  const outcomes=await Promise.allSettled([deleteParentInvoice(concurrent.input),createParentReceipt({packageId:concurrent.pkg.id,studentId:concurrent.student.id,invoiceId:concurrent.invoice.id,receiptNo:concurrent.invoice.invoiceNo+'-RC',receiptDate:'2026-09-29',receivedFrom:'Isolated Parent',paidBy:'Test',quantity:1,description:'Concurrent partial receipt',amount:100,gstAmount:0,totalAmount:100,amountReceived:100,createdBy:'uat@example.invalid'})]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  const billing=await listParentBillingForPackage(concurrent.pkg.id);
  assert.equal(billing.receipts.length,billing.invoices.length);
 }
 const sending=await make();await prisma.miniappNotificationOutbox.updateMany({where:{targetType:'ParentInvoice',targetId:sending.invoice.id},data:{status:'PROCESSING'}});await assert.rejects(deleteParentInvoice(sending.input),/正在处理/);
 // A later ordinary store mutation must retain the complete archived snapshot.
 assert.deepEqual((await listDeletedParentInvoices(f.pkg.id))[0].snapshot,f.invoice);
 const browser=await make();writeFileSync('/tmp/sgt-r429-fixture.json',JSON.stringify({packageId:browser.pkg.id,invoiceId:browser.invoice.id,invoiceNo:browser.invoice.invoiceNo,contractId:browser.contract.id}));
 console.log(JSON.stringify({passed:true,sourceRetained:true,idempotent:true,auditAtomic:true,receiptsBlock:true,paymentProofBlocks:true,activeAgreementsBlock:true,ledgerUnchanged:true,queuedNoticesSkipped:true,receiptRaceSafe:true,processingNotificationBlocks:true,...browser.input}));
}
main().finally(()=>prisma.$disconnect());

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {getApprovalRoleConfig} from './approval-flow';
import {parseSalesBilling,parseSalesApprovals,evaluateSalesReceipts,salesMoneyCents,salesInvoiceFingerprint} from './sales-invoice-policy';
import {packageCorrectionFacts} from './package-correction-policy';

// Caller uses the existing package billing permission boundary; no writes or renewal synchronization.
export async function readPackageCorrection(packageId:string){
 return prisma.$transaction(async db=>{
  const pkg=await db.coursePackage.findUnique({where:{id:packageId},include:{student:{select:{id:true,name:true}},course:{select:{name:true}},sharedStudents:{select:{studentId:true,student:{select:{name:true}}}}}});
  if(!pkg)return null;
  const [txns,contracts,billingRow,approvalRow,config]=await Promise.all([
   db.packageTxn.findMany({where:{packageId},orderBy:[{createdAt:'asc'},{id:'asc'}]}),
   db.studentContract.findMany({where:{packageId},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{id:true,studentId:true,status:true,flowType:true,createdAt:true,signedAt:true,voidedAt:true,invoiceId:true,invoiceNo:true,updatedAt:true}}),
   db.appSetting.findUnique({where:{key:'parent_billing_v1'},select:{value:true}}),
   db.appSetting.findUnique({where:{key:'parent_receipt_approval_v1'},select:{value:true}}),getApprovalRoleConfig(db)
  ]);
  const billing=parseSalesBilling(billingRow?.value??null),approvals=parseSalesApprovals(approvalRow?.value??null);
  const members=new Set([pkg.studentId,...pkg.sharedStudents.map(s=>s.studentId)]);
  const invoices=billing.invoices.filter(x=>x.packageId===packageId).map(invoice=>{
   let error:string|null=null;let errorZh:string|null=null;
   const fail=(en:string,zh:string)=>{error=en;errorZh=zh;};
   const total=salesMoneyCents(invoice.totalAmount),amount=salesMoneyCents(invoice.amount),gst=salesMoneyCents(invoice.gstAmount);
   if(!billing.valid||!approvals.valid)fail('Billing or approval evidence is malformed','账单或审批凭据格式异常');
   if(typeof invoice.id!=='string'||!invoice.id||billing.invoices.filter(x=>x.id===invoice.id).length!==1||billing.deleted.some(x=>x.invoiceId===invoice.id))fail('Invoice identity or deletion history needs review','发票编号或删除历史需要核对');
   if(typeof invoice.studentId!=='string'||!members.has(invoice.studentId))fail('Invoice student does not belong to the package','发票学生不属于当前课包');
   if(total===null||amount===null||gst===null||amount+gst!==total)fail('Invoice amount is inconsistent','发票金额不一致');
   const receipts=evaluateSalesReceipts(String(invoice.id),{billing,approvals,financeApproverEmails:config.financeApproverEmails},r=>r.packageId===packageId&&r.studentId===invoice.studentId);
   if('error' in receipts)fail(receipts.error.en,receipts.error.zh);
   return {id:typeof invoice.id==='string'?invoice.id:'',invoiceNo:typeof invoice.invoiceNo==='string'?invoice.invoiceNo:'—',totalCents:total,approvedCents:error||'error' in receipts?null:receipts.approvedCents,pending:'error' in receipts?null:receipts.pendingReceipts,rejected:'error' in receipts?null:receipts.rejectedReceipts,error,errorZh};
  });
  const orphanReceipts=billing.receipts.filter(r=>r.packageId===packageId&&!invoices.some(i=>i.id===r.invoiceId)).length;
  const unresolvedContractInvoices=contracts.filter(c=>c.invoiceId&&billing.invoices.filter(i=>i.id===c.invoiceId&&i.packageId===pkg.id&&i.studentId===c.studentId).length!==1).length;
  const recordedApproved=invoices.reduce((n,x)=>n+(x.approvedCents??0),0);
  const financialReview=!billing.valid||!approvals.valid||orphanReceipts>0||unresolvedContractInvoices>0||invoices.some(i=>i.error!==null)||!Number.isSafeInteger(recordedApproved);
  const facts=packageCorrectionFacts({...pkg,sharedStudentIds:[...members].filter(id=>id!==pkg.studentId)},txns);
  if(financialReview)facts.issues.push({en:"Resolve financial evidence inconsistencies before correction",zh:"更正前须先核对财务凭据不一致"});
  // Includes the exact source rows and approver rules; never exposed as business identity matching.
  const fingerprint=salesInvoiceFingerprint(JSON.parse(JSON.stringify({pkg,txns,contracts,billing:billingRow?.value??null,approvals:approvalRow?.value??null,config})));
  return {pkg,txns,contracts,invoices,facts,financialReview,orphanReceipts,unresolvedContractInvoices,fingerprint,approvedCents:financialReview?null:recordedApproved};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

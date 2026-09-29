import {Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {prisma} from './prisma';
import {parseSalesBilling,salesMoneyCents} from './sales-invoice-policy';
import {hasNonVoidedAgreementLink} from './invoice-deletion-safety';
import {buildPackageFinanceGateReason} from './package-finance-gate';

export type ParentInvoiceDeletionInput={invoiceId:string;packageId:string;actorEmail:string;reason:string;expectedUpdatedAt?:string};
/** Preserve full raw source evidence; never use a lossy billing sanitizer before archiving. */
export async function deleteParentInvoiceInTransaction(tx:Prisma.TransactionClient,input:ParentInvoiceDeletionInput){
 const invoiceId=input.invoiceId.trim(),packageId=input.packageId.trim(),reason=input.reason.trim(),actor=input.actorEmail.trim().toLowerCase();
 if(!invoiceId||!packageId||!actor||reason.length<10||reason.length>2000)throw new Error('Invoice, package and review reason are required / 请填写发票、课包及至少10字核对原因');
 await tx.$queryRaw`SELECT id FROM "StudentContract" WHERE "invoiceId"=${invoiceId} ORDER BY id FOR UPDATE`;
 await tx.$queryRaw`SELECT id FROM "SchoolApplicationService" WHERE "invoiceId"=${invoiceId} ORDER BY id FOR UPDATE`;
 await tx.$queryRaw`SELECT id FROM "CoursePackage" WHERE id=${packageId} FOR UPDATE`;
 await tx.$queryRaw`SELECT key FROM "AppSetting" WHERE key='parent_billing_v1' FOR UPDATE`;
 const saved=await tx.appSetting.findUnique({where:{key:'parent_billing_v1'}}),parsed=parseSalesBilling(saved?.value??null);
 if(!saved||!parsed.valid)throw new Error('Billing evidence needs review / 账单凭据需要核对');
 const rawStore=JSON.parse(saved.value);
 if(rawStore.paymentRecords!==undefined&&!Array.isArray(rawStore.paymentRecords))throw new Error('Payment evidence needs review / 付款凭据需要核对');
 const matches=parsed.invoices.filter(i=>i.id===invoiceId),archived=parsed.deleted.filter(i=>i.invoiceId===invoiceId);
 if(!matches.length&&archived.length===1){
  const prior=archived[0],snapshot=prior.snapshot as Record<string,unknown>|undefined;
  if(prior.packageId!==packageId || (input.expectedUpdatedAt!==undefined&&snapshot?.updatedAt!==input.expectedUpdatedAt))throw new Error('Deleted invoice evidence differs / 已删除发票凭据不一致');
  return {id:String(prior.id),alreadyDeleted:true};
 }
 if(matches.length!==1||archived.length)throw new Error('Invoice identity is missing or ambiguous / 发票不存在或编号存在歧义');
 const invoice=matches[0];
 const amount=salesMoneyCents(invoice.amount),gst=salesMoneyCents(invoice.gstAmount),total=salesMoneyCents(invoice.totalAmount);
 if(typeof invoice.invoiceNo!=='string'||!invoice.invoiceNo.trim()||amount===null||gst===null||total===null||amount+gst!==total)throw new Error('Invoice amount or identity needs review / 发票金额或编号需要核对');
 if(invoice.packageId!==packageId)throw new Error('Invoice does not belong to this package / 发票不属于当前课包');
 if(input.expectedUpdatedAt!==undefined&&(!input.expectedUpdatedAt||invoice.updatedAt!==input.expectedUpdatedAt))throw new Error('Invoice changed; reload and review / 发票已变更，请刷新核对');
 if((rawStore.paymentRecords||[]).some((r:Record<string,unknown>)=>r?.packageId===packageId&&!parsed.receipts.some(receipt=>receipt.paymentRecordId===r.id)))throw new Error('Unallocated payment proof needs Finance review / 存在未核销付款凭据，请先由财务核对');
 if(parsed.receipts.some(r=>r.invoiceId===invoiceId))throw new Error('Cannot delete invoice: linked receipt exists / 发票已有收据，不能删除');
 const [contracts,applications,approvals,pkg,outbox]=await Promise.all([
  tx.studentContract.findMany({where:{invoiceId},select:{id:true,status:true,invoiceId:true,invoiceNo:true,invoiceCreatedAt:true,packageId:true,studentId:true,signedAt:true,signedPdfPath:true}}),
  tx.schoolApplicationService.findMany({where:{invoiceId},select:{id:true,status:true,invoiceId:true,invoiceNo:true,studentId:true}}),
  tx.packageInvoiceApproval.findMany({where:{invoiceId}}),
  tx.coursePackage.findUnique({where:{id:packageId}}),
  tx.miniappNotificationOutbox.findMany({where:{targetType:'ParentInvoice',targetId:invoiceId}})
 ]);
 if(!pkg||invoice.studentId!==pkg.studentId||contracts.some(c=>c.packageId!==packageId||c.studentId!==invoice.studentId)||applications.some(a=>a.studentId!==invoice.studentId)||approvals.some(a=>a.packageId!==packageId))throw new Error('Invoice ownership needs review / 发票归属需要核对');
 if(hasNonVoidedAgreementLink(contracts)||hasNonVoidedAgreementLink(applications))throw new Error('Void or review linked agreements before deleting the draft / 删除草稿前须先作废或核对关联合同');
 if(outbox.some(n=>n.status==='PROCESSING'))throw new Error('Invoice notification is processing; retry after it completes / 发票通知正在处理，请稍后重试');
 const root=JSON.parse(saved.value),id=randomUUID(),deletedAt=new Date().toISOString();
 const history={id,invoiceId,invoiceNo:invoice.invoiceNo,packageId,studentId:invoice.studentId,billTo:invoice.billTo,issueDate:invoice.issueDate,deletedBy:actor,deletedAt,reason,snapshot:invoice,contractIds:contracts.map(c=>c.id),applicationIds:applications.map(a=>a.id)};
 root.invoices=root.invoices.filter((i:{id:string})=>i.id!==invoiceId);root.deletedInvoices=[history,...(root.deletedInvoices||[])];
 // Reserved sequence numbers and all unrelated raw fields are retained.
 await tx.appSetting.update({where:{key:saved.key},data:{value:JSON.stringify(root)}});
 await tx.packageInvoiceApproval.deleteMany({where:{invoiceId}});
 await tx.miniappNotificationOutbox.updateMany({where:{targetType:'ParentInvoice',targetId:invoiceId,status:{in:['PENDING','FAILED']}},data:{status:'SKIPPED',error:'Invoice draft archived / 发票草稿已留档'}});
 // Preserve VOID/signature/PDF/events; the archive and audit retain former invoice links.
 await tx.studentContract.updateMany({where:{invoiceId,status:'VOID'},data:{invoiceId:null}});
 const deletedIds=root.deletedInvoices.map((i:{invoiceId:unknown})=>i.invoiceId).filter((id:unknown):id is string=>typeof id==='string');
 const latest=await tx.packageInvoiceApproval.findFirst({where:{packageId,invoiceId:{notIn:deletedIds}},orderBy:[{submittedAt:'desc'},{id:'desc'}]});
 const status=latest?(latest.status==='APPROVED'?'SCHEDULABLE':latest.status==='REJECTED'?'BLOCKED':'INVOICE_PENDING_MANAGER'):'EXEMPT';
 if(approvals.length||contracts.length)await tx.coursePackage.update({where:{id:packageId},data:{financeGateStatus:status,financeGateReason:buildPackageFinanceGateReason({status,rejectReason:latest?.managerRejectReason,settlementMode:pkg.settlementMode}),financeGateUpdatedAt:new Date(),financeGateUpdatedBy:actor}});
 await tx.auditLog.create({data:{actorEmail:actor,actorRole:'ADMIN',module:'PARENT_BILLING',action:'DELETE_INVOICE',entityType:'ParentInvoice',entityId:invoiceId,meta:JSON.parse(JSON.stringify({history,previousApprovals:approvals,previousContractLinks:contracts,previousApplicationLinks:applications,previousNotificationOutbox:outbox,packageEntitlementsUnchanged:true,noRefund:true}))}});
 return {id,alreadyDeleted:false};
}

export async function deleteParentInvoiceReviewed(input:ParentInvoiceDeletionInput){
 try{return await prisma.$transaction(tx=>deleteParentInvoiceInTransaction(tx,input),{isolationLevel:'Serializable',timeout:15000});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&(error.code==='P2034'||(error.code==='P2010'&&['40001','40P01'].includes(String(error.meta?.code)))))throw new Error('Billing changed; reload and retry / 账单同时发生变更，请刷新后重试');throw error;}
}

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {getApprovalRoleConfig} from './approval-flow';
import type {RelationshipActor} from './sales-relationship-policy';
import {assertSalesEvidenceAccess} from './sales-evidence-policy';
import {parseSalesBilling,parseSalesApprovals,salesInvoiceFingerprint,evaluateParentInvoice,summarizeInvoiceEvidence,type ParentInvoiceContext} from './sales-invoice-policy';

const leadSelect={id:true,relationshipId:true,convertedStudentId:true,recordKind:true,relationshipLinkedAt:true,leadNo:true,studentName:true} satisfies Prisma.LeadSelect;
export async function parentInvoiceContext(db:Prisma.TransactionClient,leadId:string):Promise<ParentInvoiceContext & {contractAttributions:Array<{invoiceId:string;leadId:string}>}>{
 const [billingRow,approvalRow,roleConfig]=await Promise.all([db.appSetting.findUnique({where:{key:'parent_billing_v1'},select:{value:true}}),db.appSetting.findUnique({where:{key:'parent_receipt_approval_v1'},select:{value:true}}),getApprovalRoleConfig(db)]);
 const billing=parseSalesBilling(billingRow?.value??null),approvals=parseSalesApprovals(approvalRow?.value??null);
 const [packages,contracts]=await Promise.all([db.coursePackage.findMany({where:{id:{in:[...new Set(billing.invoices.flatMap(i=>typeof i.packageId==='string'?[i.packageId]:[]))]}},select:{id:true,studentId:true,sharedStudents:{select:{studentId:true}}}}),db.studentContract.findMany({where:{invoiceId:{in:billing.invoices.flatMap(i=>typeof i.id==='string'?[i.id]:[])}},select:{id:true,invoiceId:true}})]);
 const competing=await db.salesEvidenceAssignment.findMany({where:{kind:'CONTRACT',status:'ACTIVE',documentId:{in:contracts.map(c=>c.id)}},select:{documentId:true,leadId:true}});
 const contractAttributions=competing.flatMap(a=>{const invoiceId=contracts.find(c=>c.id===a.documentId)?.invoiceId;return invoiceId?[{invoiceId,leadId:a.leadId}]:[];});
 return {billing,approvals,financeApproverEmails:roleConfig.financeApproverEmails,packages:packages.map(p=>({id:p.id,studentId:p.studentId,sharedStudentIds:p.sharedStudents.map(s=>s.studentId)})),contractAttributions,conflictingInvoiceIds:new Set(contractAttributions.filter(a=>a.leadId!==leadId).map(a=>a.invoiceId))};
}
export type ParentInvoiceInput={leadId:string;documentId:string;expectedUpdatedAt:string;sourceFingerprint:string;reviewNote:string};
export async function attributeParentInvoiceInTransaction(tx:Prisma.TransactionClient,actor:RelationshipActor,input:ParentInvoiceInput){
 assertSalesEvidenceAccess(actor,true);
 const note=input.reviewNote.trim();if(!note||note.length>2000)throw new Error('Record the attribution review basis (up to 2000 characters) / 请填写归属核对依据（最多2000字）');
 await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${input.leadId} FOR UPDATE`;
 const lead=await tx.lead.findUniqueOrThrow({where:{id:input.leadId}});
 if(lead.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new Error('Lead changed; reload before saving / 商机已更新，请刷新后保存');
 if(!lead.relationshipId||!lead.convertedStudentId||lead.recordKind!=='STUDENT'||lead.isArchived)throw new Error('Link an active student opportunity to an exact student and relationship first / 请先将有效学生商机关联到准确的学生和关系档案');
 // Serialize review against existing billing-store mutations; no billing values are written.
 await tx.$queryRaw`SELECT key FROM "AppSetting" WHERE key='parent_billing_v1' FOR UPDATE`;
 const context=await parentInvoiceContext(tx,lead.id);
 const data={kind:'PARENT_INVOICE',documentId:input.documentId,sourceFingerprint:input.sourceFingerprint,leadId:lead.id,relationshipId:lead.relationshipId,studentId:lead.convertedStudentId,leadRelationshipLinkedAt:lead.relationshipLinkedAt,status:'ACTIVE',reviewNote:note,reviewedBy:actor.email};
 const evaluated=evaluateParentInvoice(data,lead,context);if(evaluated.state!=='VERIFIED')throw new Error(`${evaluated.en} / ${evaluated.zh}`);
 const before=await tx.salesEvidenceAssignment.findUnique({where:{kind_documentId:{kind:'PARENT_INVOICE',documentId:input.documentId}}});
 if(before?.status==='ACTIVE'&&before.leadId!==lead.id)throw new Error('Invoice is attributed to another lead; revoke that attribution first / 发票已归属其他商机，请先撤销原归属');
 if(before?.status==='ACTIVE'&&before.leadId===lead.id&&before.relationshipId===lead.relationshipId&&before.studentId===lead.convertedStudentId&&before.leadRelationshipLinkedAt?.getTime()===lead.relationshipLinkedAt?.getTime()&&before.sourceFingerprint===input.sourceFingerprint)return lead.id;
 const after=before?await tx.salesEvidenceAssignment.update({where:{id:before.id},data}):await tx.salesEvidenceAssignment.create({data});
 await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SALES_EVIDENCE',action:'ATTACH_INVOICE',entityType:'SalesEvidenceAssignment',entityId:after.id,meta:JSON.parse(JSON.stringify({before,after,reviewNote:note,verifiedAtReview:evaluated,businessDocumentsUnchanged:true}))}});
 return lead.id;
}
export async function attributeParentInvoice(actor:RelationshipActor,input:ParentInvoiceInput){
 assertSalesEvidenceAccess(actor,true);
 try{return await prisma.$transaction(tx=>attributeParentInvoiceInTransaction(tx,actor,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&['P2034','P2002'].includes(error.code))throw new Error('Concurrent update; reload before retrying / 同时有人更新了记录，请刷新后重试');throw error;}
}
export async function readParentInvoiceEvidence(actor:RelationshipActor,scope:{leadId:string}|{relationshipId:string}){
 assertSalesEvidenceAccess(actor);
 return prisma.$transaction(async tx=>{
 const assignments=await tx.salesEvidenceAssignment.findMany({where:{...scope,kind:'PARENT_INVOICE'},include:{lead:{select:leadSelect}},orderBy:{updatedAt:'desc'}});
 // Load store/package/contract evidence once; derive contract competitors for each exact lead below.
 const context=await parentInvoiceContext(tx,'');
 const rows=assignments.map(a=>{
  const conflictingInvoiceIds=new Set(context.contractAttributions.filter(c=>c.leadId!==a.leadId).map(c=>c.invoiceId));
  const source=context.billing.invoices.find(i=>i.id===a.documentId);
  return {...a,...evaluateParentInvoice(a,a.lead,{...context,conflictingInvoiceIds}),invoiceNo:typeof source?.invoiceNo==='string'?source.invoiceNo:a.documentId,packageId:typeof source?.packageId==='string'?source.packageId:null};
 });return {rows,summary:summarizeInvoiceEvidence(rows)};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
export async function listParentInvoiceCandidates(actor:RelationshipActor,leadId:string){
 assertSalesEvidenceAccess(actor);
 return prisma.$transaction(async tx=>{
  const lead=await tx.lead.findUniqueOrThrow({where:{id:leadId},select:leadSelect});
  if(!lead.relationshipId||!lead.convertedStudentId||lead.recordKind!=='STUDENT')return {valid:true,rows:[]};
  const context=await parentInvoiceContext(tx,lead.id);
  const invoices=context.billing.invoices.filter(i=>i.studentId===lead.convertedStudentId&&typeof i.id==='string');
  const assignments=await tx.salesEvidenceAssignment.findMany({where:{kind:'PARENT_INVOICE',status:'ACTIVE',documentId:{in:invoices.map(i=>String(i.id))}},select:{documentId:true,leadId:true}});
  return {valid:context.billing.valid&&context.approvals.valid,rows:invoices.slice(-100).reverse().map(invoice=>{
   const sourceFingerprint=salesInvoiceFingerprint(invoice),id=String(invoice.id);
   return {id,invoiceNo:typeof invoice.invoiceNo==='string'?invoice.invoiceNo:id,sourceFingerprint,assignedElsewhere:assignments.some(a=>a.documentId===id&&a.leadId!==lead.id),...evaluateParentInvoice({kind:'PARENT_INVOICE',documentId:id,leadId,relationshipId:lead.relationshipId!,studentId:lead.convertedStudentId!,leadRelationshipLinkedAt:lead.relationshipLinkedAt,status:'ACTIVE',sourceFingerprint},lead,context)};
  })};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {getApprovalRoleConfig} from './approval-flow';
import type {RelationshipActor} from './sales-relationship-policy';
import {assertSalesEvidenceAccess} from './sales-evidence-policy';
import {parseSalesBilling,parseSalesApprovals,salesInvoiceFingerprint,type RawRecord} from './sales-invoice-policy';
import {evaluatePartnerInvoice,summarizePartnerInvoiceEvidence,type PartnerInvoiceContext} from './sales-partner-invoice-policy';
import type {ParentInvoiceInput} from './sales-invoice-evidence';
const leadSelect={id:true,relationshipId:true,convertedStudentId:true,recordKind:true,relationshipLinkedAt:true,leadNo:true,studentName:true} satisfies Prisma.LeadSelect;
function references(invoice:RawRecord):string[]{return [...(Array.isArray(invoice.settlementIds)?invoice.settlementIds:[]),...(Array.isArray(invoice.lines)?invoice.lines.flatMap(l=>l&&typeof l==='object'&&'settlementId' in l?[l.settlementId]:[]):[])].filter((id):id is string=>typeof id==='string'&&!!id);}
export async function partnerInvoiceContext(db:Prisma.TransactionClient):Promise<PartnerInvoiceContext>{
 const [billingRow,approvalRow,config]=await Promise.all([db.appSetting.findUnique({where:{key:'partner_billing_v1'},select:{value:true}}),db.appSetting.findUnique({where:{key:'partner_receipt_approval_v1'},select:{value:true}}),getApprovalRoleConfig(db)]);
 const billing=parseSalesBilling(billingRow?.value??null),approvals=parseSalesApprovals(approvalRow?.value??null);
 const ids=billing.invoices.flatMap(i=>typeof i.id==='string'?[i.id]:[]);
 const [settlements,credits,partners]=await Promise.all([
  db.partnerSettlement.findMany({where:{id:{in:[...new Set(billing.invoices.flatMap(references))]}},select:{id:true,studentId:true,partnerId:true,mode:true,monthKey:true,revertedAt:true,amount:true}}),
  db.creditNote.findMany({where:{sourceType:'PARTNER_INVOICE',sourceInvoiceId:{in:ids},status:'ISSUED'},select:{id:true,sourceInvoiceId:true,sourceInvoiceNo:true,currency:true,status:true,issuedAt:true,voidedAt:true,originalInvoiceTotal:true,amount:true,gstAmount:true,totalAmount:true}}),
  db.partner.findMany({where:{id:{in:billing.invoices.flatMap(i=>typeof i.partnerId==='string'?[i.partnerId]:[])}},select:{id:true}}),
 ]);
 return {billing,approvals,financeApproverEmails:config.financeApproverEmails,settlements,partnerIds:new Set(partners.map(p=>p.id)),credits:credits.map(c=>({...c,originalInvoiceTotal:Number(c.originalInvoiceTotal),amount:Number(c.amount),gstAmount:Number(c.gstAmount),totalAmount:Number(c.totalAmount)}))};
}
export async function attributePartnerInvoiceInTransaction(tx:Prisma.TransactionClient,actor:RelationshipActor,input:ParentInvoiceInput){
 assertSalesEvidenceAccess(actor,true);
 const note=input.reviewNote.trim();if(!note||note.length>2000)throw new Error('Record the attribution review basis (up to 2000 characters) / 请填写归属核对依据（最多2000字）');
 await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${input.leadId} FOR UPDATE`;
 const lead=await tx.lead.findUniqueOrThrow({where:{id:input.leadId}});
 if(lead.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new Error('Lead changed; reload before saving / 商机已更新，请刷新后保存');
 if(!lead.relationshipId||!lead.convertedStudentId||lead.recordKind!=='STUDENT'||lead.isArchived)throw new Error('Link an active student opportunity to an exact student and relationship first / 请先将有效学生商机关联到准确的学生和关系档案');
 await tx.$queryRaw`SELECT key FROM "AppSetting" WHERE key='partner_billing_v1' FOR UPDATE`;
 const context=await partnerInvoiceContext(tx);
 const data={kind:'PARTNER_INVOICE',documentId:input.documentId,sourceFingerprint:input.sourceFingerprint,leadId:lead.id,relationshipId:lead.relationshipId,studentId:lead.convertedStudentId,leadRelationshipLinkedAt:lead.relationshipLinkedAt,status:'ACTIVE',reviewNote:note,reviewedBy:actor.email};
 const evaluated=evaluatePartnerInvoice(data,lead,context);if(evaluated.state!=='VERIFIED')throw new Error(`${evaluated.en} / ${evaluated.zh}`);
 const before=await tx.salesEvidenceAssignment.findUnique({where:{kind_documentId:{kind:'PARTNER_INVOICE',documentId:input.documentId}}});
 if(before?.status==='ACTIVE'&&before.leadId!==lead.id)throw new Error('Invoice is attributed to another lead; revoke that attribution first / 发票已归属其他商机，请先撤销原归属');
 if(before?.status==='ACTIVE'&&before.leadId===lead.id&&before.relationshipId===lead.relationshipId&&before.studentId===lead.convertedStudentId&&before.leadRelationshipLinkedAt?.getTime()===lead.relationshipLinkedAt?.getTime()&&before.sourceFingerprint===input.sourceFingerprint)return lead.id;
 const after=before?await tx.salesEvidenceAssignment.update({where:{id:before.id},data}):await tx.salesEvidenceAssignment.create({data});
 await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SALES_EVIDENCE',action:'ATTACH_PARTNER_INVOICE',entityType:'SalesEvidenceAssignment',entityId:after.id,meta:JSON.parse(JSON.stringify({before,after,reviewNote:note,verifiedAtReview:evaluated,businessDocumentsUnchanged:true,creditsAreNotCashRefunds:true}))}});
 return lead.id;
}
export async function attributePartnerInvoice(actor:RelationshipActor,input:ParentInvoiceInput){
 assertSalesEvidenceAccess(actor,true);
 try{return await prisma.$transaction(tx=>attributePartnerInvoiceInTransaction(tx,actor,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&['P2034','P2002'].includes(error.code))throw new Error('Concurrent update; reload before retrying / 同时有人更新了记录，请刷新后重试');throw error;}
}
export async function readPartnerInvoiceEvidence(actor:RelationshipActor,scope:{leadId:string}|{relationshipId:string}){
 assertSalesEvidenceAccess(actor);
 return prisma.$transaction(async tx=>{
  const assignments=await tx.salesEvidenceAssignment.findMany({where:{...scope,kind:'PARTNER_INVOICE'},include:{lead:{select:leadSelect}},orderBy:{updatedAt:'desc'}});
  const context=await partnerInvoiceContext(tx);
  const active=await tx.salesEvidenceAssignment.findMany({where:{kind:'PARTNER_INVOICE',status:'ACTIVE'},select:{documentId:true}});
  const activeIds=new Set(active.map(a=>a.documentId));
  const rows=assignments.map(a=>{const source=context.billing.invoices.find(i=>i.id===a.documentId);return {...a,...evaluatePartnerInvoice(a,a.lead,context),invoiceNo:typeof source?.invoiceNo==='string'?source.invoiceNo:a.documentId,packageId:null,partnerId:typeof source?.partnerId==='string'?source.partnerId:null,mode:typeof source?.mode==='string'?source.mode:null};});
  return {rows,summary:summarizePartnerInvoiceEvidence(rows),unassignedInvoices:context.billing.valid?new Set(context.billing.invoices.flatMap(i=>typeof i.id==='string'&&!activeIds.has(i.id)?[i.id]:[])).size:null};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
export async function listPartnerInvoiceCandidates(actor:RelationshipActor,leadId:string){
 assertSalesEvidenceAccess(actor);
 return prisma.$transaction(async tx=>{
  const lead=await tx.lead.findUniqueOrThrow({where:{id:leadId},select:leadSelect});
  if(!lead.relationshipId||!lead.convertedStudentId||lead.recordKind!=='STUDENT')return {valid:true,rows:[]};
  const context=await partnerInvoiceContext(tx),studentSettlements=new Set(context.settlements.filter(s=>s.studentId===lead.convertedStudentId).map(s=>s.id));
  const invoices=[...new Map(context.billing.invoices.filter(i=>typeof i.id==='string'&&references(i).some(id=>studentSettlements.has(id))).map(i=>[String(i.id),i])).values()];
  const assignments=await tx.salesEvidenceAssignment.findMany({where:{kind:'PARTNER_INVOICE',status:'ACTIVE',documentId:{in:invoices.map(i=>String(i.id))}},select:{documentId:true,leadId:true}});
  return {valid:context.billing.valid&&context.approvals.valid,rows:invoices.slice(-100).reverse().map(invoice=>{
   const sourceFingerprint=salesInvoiceFingerprint(invoice),id=String(invoice.id);
   return {id,invoiceNo:typeof invoice.invoiceNo==='string'?invoice.invoiceNo:id,sourceFingerprint,assignedElsewhere:assignments.some(a=>a.documentId===id&&a.leadId!==lead.id),...evaluatePartnerInvoice({kind:'PARTNER_INVOICE',documentId:id,leadId,relationshipId:lead.relationshipId!,studentId:lead.convertedStudentId!,leadRelationshipLinkedAt:lead.relationshipLinkedAt,status:'ACTIVE',sourceFingerprint},lead,context)};
  })};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

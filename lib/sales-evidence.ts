import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import type {RelationshipActor} from './sales-relationship-policy';
import {assertSalesEvidenceAccess,evaluateContractEvidence,summarizeContractEvidence} from './sales-evidence-policy';
const contractSelect={id:true,studentId:true,packageId:true,status:true,signedAt:true,voidedAt:true,createdAt:true,updatedAt:true,invoiceNo:true,invoiceId:true} satisfies Prisma.StudentContractSelect;
const leadSelect={id:true,relationshipId:true,convertedStudentId:true,recordKind:true,relationshipLinkedAt:true,leadNo:true,studentName:true} satisfies Prisma.LeadSelect;
export type SalesEvidenceInput={action:'ATTACH'|'REVOKE';leadId:string;documentId?:string;assignmentId?:string;expectedUpdatedAt:string;sourceUpdatedAt?:string;reviewNote:string};
export async function mutateSalesEvidenceInTransaction(tx:Prisma.TransactionClient,actor:RelationshipActor,input:SalesEvidenceInput) {
  assertSalesEvidenceAccess(actor,true);
  const note=input.reviewNote.trim();if(!note||note.length>2000)throw new Error('Record the attribution review basis (up to 2000 characters) / 请填写归属核对依据（最多2000字）');
  await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${input.leadId} FOR UPDATE`;
  const lead=await tx.lead.findUniqueOrThrow({where:{id:input.leadId}});
  let before,after;
  if(input.action==='REVOKE') {
    if(!input.assignmentId)throw new Error('Select the attribution to revoke / 请选择需要撤销的归属记录');
    await tx.$queryRaw`SELECT id FROM "SalesEvidenceAssignment" WHERE id=${input.assignmentId} FOR UPDATE`;
    before=await tx.salesEvidenceAssignment.findUniqueOrThrow({where:{id:input.assignmentId}});
    if(before.leadId!==lead.id)throw new Error('Attribution belongs to another lead / 归属记录属于其他商机');
    if(before.status==='REVOKED')return lead.id;
    if(before.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new Error('Attribution changed; reload before saving / 归属已更新，请刷新后保存');
    after=await tx.salesEvidenceAssignment.update({where:{id:before.id},data:{status:'REVOKED',reviewNote:note,reviewedBy:actor.email}});
  }else if(input.action==='ATTACH') {
    if(lead.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new Error('Lead changed; reload before saving / 商机已更新，请刷新后保存');
    if(!lead.relationshipId||!lead.convertedStudentId||lead.recordKind!=='STUDENT'||lead.isArchived)throw new Error('Link an active student opportunity to an exact student and relationship first / 请先将有效学生商机关联到准确的学生和关系档案');
    const documentId=input.documentId?.trim();if(!documentId)throw new Error('Select an exact contract / 请选择准确的合同');
    // All attachment attempts lock the actual contract before reading uniqueness or its current state.
    await tx.$queryRaw`SELECT id FROM "StudentContract" WHERE id=${documentId} FOR UPDATE`;
    const source=await tx.studentContract.findUnique({where:{id:documentId},select:contractSelect});
    if(!source||source.studentId!==lead.convertedStudentId)throw new Error('Contract does not belong to this student / 合同不属于该学生');
    if(source.updatedAt.toISOString()!==input.sourceUpdatedAt)throw new Error('Contract changed; reload and review its current state / 合同已更新，请刷新并核对当前状态');
    if(source.invoiceId){const invoiceOwner=await tx.salesEvidenceAssignment.findUnique({where:{kind_documentId:{kind:'PARENT_INVOICE',documentId:source.invoiceId}}});if(invoiceOwner?.status==='ACTIVE'&&invoiceOwner.leadId!==lead.id)throw new Error('Linked invoice is attributed to another lead; review that attribution first / 关联发票已归属其他商机，请先核对原归属');}
    const data={kind:'CONTRACT',documentId,leadId:lead.id,relationshipId:lead.relationshipId,studentId:lead.convertedStudentId,leadRelationshipLinkedAt:lead.relationshipLinkedAt,status:'ACTIVE',reviewNote:note,reviewedBy:actor.email};
    const result=evaluateContractEvidence(data,lead,source);
    if(result.state==='REVIEW'||result.state==='INACTIVE')throw new Error(`${result.en} / ${result.zh}`);
    before=await tx.salesEvidenceAssignment.findUnique({where:{kind_documentId:{kind:'CONTRACT',documentId}}});
    if(before?.status==='ACTIVE'&&before.leadId!==lead.id)throw new Error('Contract is attributed to another lead; review and revoke that attribution first / 合同已归属其他商机，请先核对并撤销原归属');
    // A retry after a successful save creates no second audit, but a changed relationship link requires a new review.
    if(before?.status==='ACTIVE'&&before.leadId===lead.id&&before.relationshipId===data.relationshipId&&before.studentId===data.studentId&&before.leadRelationshipLinkedAt?.getTime()===data.leadRelationshipLinkedAt?.getTime())return lead.id;
    after=before?await tx.salesEvidenceAssignment.update({where:{id:before.id},data}):await tx.salesEvidenceAssignment.create({data});
  }else throw new Error('Invalid attribution action / 归属操作无效');
  await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SALES_EVIDENCE',action:input.action,entityType:'SalesEvidenceAssignment',entityId:after.id,meta:JSON.parse(JSON.stringify({before,after,reviewNote:note,businessDocumentsUnchanged:true}))}});
  return lead.id;
}
export async function mutateSalesEvidence(actor:RelationshipActor,input:SalesEvidenceInput) {
  assertSalesEvidenceAccess(actor,true);
  try{return await prisma.$transaction(tx=>mutateSalesEvidenceInTransaction(tx,actor,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
  catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&['P2034','P2002'].includes(error.code))throw new Error('Concurrent update; reload before retrying / 同时有人更新了记录，请刷新后重试');throw error;}
}
export async function readSalesContractEvidence(actor:RelationshipActor,scope:{leadId:string}|{relationshipId:string}) {
  assertSalesEvidenceAccess(actor);
  const assignments=await prisma.salesEvidenceAssignment.findMany({where:{...scope,kind:'CONTRACT'},include:{lead:{select:leadSelect}},orderBy:{updatedAt:'desc'}});
  const sources=await prisma.studentContract.findMany({where:{id:{in:assignments.map(a=>a.documentId)}},select:contractSelect});
  const byId=new Map(sources.map(s=>[s.id,s]));
  const invoiceOwners=await prisma.salesEvidenceAssignment.findMany({where:{kind:'PARENT_INVOICE',status:'ACTIVE',documentId:{in:sources.flatMap(s=>s.invoiceId?[s.invoiceId]:[])}},select:{documentId:true,leadId:true}});
  const rows=assignments.map(a=>{const source=byId.get(a.documentId)??null;const evaluated=evaluateContractEvidence(a,a.lead,source);return {...a,source,...(a.status==='ACTIVE'&&source?.invoiceId&&invoiceOwners.some(i=>i.documentId===source.invoiceId&&i.leadId!==a.leadId)?{state:'REVIEW' as const,en:'Linked invoice is attributed to another lead',zh:'关联发票已归属其他商机'}:evaluated)};});
  return {rows,summary:summarizeContractEvidence(rows)};
}
export async function listSalesContractCandidates(actor:RelationshipActor,leadId:string) {
  assertSalesEvidenceAccess(actor);
  const lead=await prisma.lead.findUniqueOrThrow({where:{id:leadId},select:leadSelect});
  if(!lead.convertedStudentId||!lead.relationshipId||lead.recordKind!=='STUDENT')return [];
  const sources=await prisma.studentContract.findMany({where:{studentId:lead.convertedStudentId},select:contractSelect,orderBy:{createdAt:'desc'},take:100});
  const existing=await prisma.salesEvidenceAssignment.findMany({where:{kind:'CONTRACT',documentId:{in:sources.map(s=>s.id)},status:'ACTIVE'},select:{documentId:true,leadId:true}});
  const invoiceOwners=await prisma.salesEvidenceAssignment.findMany({where:{kind:'PARENT_INVOICE',status:'ACTIVE',documentId:{in:sources.flatMap(s=>s.invoiceId?[s.invoiceId]:[])}},select:{documentId:true,leadId:true}});
  return sources.map(source=>({...source,assignedElsewhere:existing.some(a=>a.documentId===source.id&&a.leadId!==lead.id)||invoiceOwners.some(i=>i.documentId===source.invoiceId&&i.leadId!==lead.id),...evaluateContractEvidence({kind:'CONTRACT',documentId:source.id,leadId,relationshipId:lead.relationshipId!,studentId:lead.convertedStudentId!,status:'ACTIVE',leadRelationshipLinkedAt:lead.relationshipLinkedAt},lead,source)}));
}

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {buildLeadSourceChannelName,buildLeadStudentNote} from './leads';
import {type RelationshipActor} from './sales-relationship-policy';

export type LeadStudentInput={leadId:string;expectedUpdatedAt:string;mode:'CREATE'|'LINK';studentId?:string;reviewNote?:string};
function allowed(actor:RelationshipActor){
 if(actor.isObserver||(actor.role!=='ADMIN'&&!actor.operationsAdmin))throw new Error('Student handoff requires an administrator / 学生承接需要管理员处理');
}
export async function linkLeadStudentInTransaction(tx:Prisma.TransactionClient,actor:RelationshipActor,input:LeadStudentInput){
 allowed(actor);
 if(!['CREATE','LINK'].includes(input.mode))throw new Error('Choose how to link this student / 请选择学生关联方式');
 if(input.mode==='LINK'&&(!input.studentId?.trim()||!input.reviewNote?.trim()))throw new Error('Select the exact student and record the identity check / 请选择准确的学生并填写身份核对依据');
 await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${input.leadId} FOR UPDATE`;
 const lead=await tx.lead.findUnique({where:{id:input.leadId}});
 if(!lead)throw new Error('Lead no longer exists / 商机记录已不存在');
 if(lead.convertedStudentId){
  if(input.mode==='LINK'&&input.studentId!==lead.convertedStudentId)throw new Error('This lead already links to another student; review the history / 本商机已关联另一学生，请先核对历史');
  return lead.convertedStudentId;
 }
 if(lead.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new Error('This record changed; reload before saving / 记录已更新，请刷新后保存');
 if(lead.recordKind!=='STUDENT')throw new Error('Classify this as a student opportunity before handoff / 请先核对并分类为学生商机');
 if(lead.isArchived)throw new Error('Restore this archived lead before handoff / 请先恢复已归档商机，再办理学生承接');
 let studentId:string,sourceId:string|null=null;
 if(input.mode==='LINK'){
  const student=await tx.student.findUnique({where:{id:input.studentId},select:{id:true}});
  if(!student)throw new Error('Selected student no longer exists / 所选学生已不存在');
  studentId=student.id;
 }else{
  const source=await tx.studentSourceChannel.upsert({where:{name:buildLeadSourceChannelName(lead)},update:{isActive:true},create:{name:buildLeadSourceChannelName(lead)},select:{id:true}});
  sourceId=source.id;
  const student=await tx.student.create({data:{name:lead.studentName,grade:lead.grade,school:lead.school,coachingContent:lead.needs,targetSchool:lead.target,sourceChannelId:source.id,note:buildLeadStudentNote(lead),nextAction:lead.nextAction,nextActionDue:lead.nextActionDue,advisorOwner:lead.ownerName},select:{id:true}});
  studentId=student.id;
 }
 // Reusing a student must not rewrite their source, profile, financial history or other leads.
 await tx.lead.update({where:{id:lead.id},data:{convertedStudentId:studentId,convertedSourceChannelId:sourceId}});
 await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SALES_RELATIONSHIP',action:input.mode==='LINK'?'LINK_EXISTING_STUDENT':'CREATE_STUDENT',entityType:'Lead',entityId:lead.id,meta:{studentId,relationshipId:lead.relationshipId,identityReview:input.reviewNote?.trim().slice(0,2000)||null,pipelineStatusUnchanged:lead.status,existingStudentUnchanged:input.mode==='LINK'}}});
 return studentId;
}
export async function linkLeadStudent(actor:RelationshipActor,input:LeadStudentInput){
 allowed(actor);
 try{return await prisma.$transaction(tx=>linkLeadStudentInTransaction(tx,actor,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034')throw new Error('Concurrent update; reload before retrying / 同时有人更新了记录，请刷新后重试');throw error;}
}

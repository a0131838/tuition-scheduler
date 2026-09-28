import { Prisma } from '@prisma/client';
import {prisma} from './prisma';
import {parseLeadDateTime} from './leads';
import {assertRelationshipWrite,assertRelationshipLink,relationshipOption,relationshipText,RELATIONSHIP_KINDS,RELATIONSHIP_STATUSES,RELATIONSHIP_OPPORTUNITY_STATUSES,type RelationshipActor} from './sales-relationship-policy';
type Values=Record<string,unknown>;
function nullable(value:unknown,max=2000){return relationshipText(value,max)||null;}
function date(value:unknown){const text=relationshipText(value,40);const result=parseLeadDateTime(text);if(text&&!result)throw new Error('Invalid follow-up date / 跟进日期无效');return result;}
function required(value:unknown,max=2000){const result=relationshipText(value,max);if(!result)throw new Error('Required information is missing / 请补齐必填资料');return result;}
function version(updatedAt:Date,expected:unknown){if(updatedAt.toISOString()!==String(expected??''))throw new Error('This record changed; reload before saving / 记录已更新，请刷新后保存');}
function profile(v:Values){return {name:required(v.name,160),kind:relationshipOption(v.kind,RELATIONSHIP_KINDS),status:relationshipOption(v.status,RELATIONSHIP_STATUSES),ownerName:nullable(v.ownerName,120),contactName:nullable(v.contactName,120),contactEmail:nullable(v.contactEmail,160),contactPhone:nullable(v.contactPhone,80),contactWechat:nullable(v.contactWechat,120),nextAction:nullable(v.nextAction,500),nextActionDue:date(v.nextActionDue),note:nullable(v.note)};}
async function audit(tx:Prisma.TransactionClient,actor:RelationshipActor,action:string,id:string,meta:unknown){await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SALES_RELATIONSHIP',action,entityType:'SalesRelationship',entityId:id,meta:JSON.parse(JSON.stringify(meta))}});}
async function lock(tx:Prisma.TransactionClient,id:string){await tx.$queryRaw`SELECT id FROM "SalesRelationship" WHERE id=${id} FOR UPDATE`;return tx.salesRelationship.findUniqueOrThrow({where:{id}});}
export type RelationshipMutation={action:'CREATE'|'UPDATE'|'FOLLOW_UP'|'LINK_LEAD'|'OPPORTUNITY';values:Values};
export async function mutateSalesRelationshipInTransaction(tx:Prisma.TransactionClient,actor:RelationshipActor,input:RelationshipMutation){
 assertRelationshipWrite(actor);const v=input.values;
 if(input.action==='CREATE') {const row=await tx.salesRelationship.create({data:{...profile(v),createdById:actor.id,createdByName:actor.name}});await audit(tx,actor,'CREATE',row.id,{after:row});return row.id;}
 if(input.action==='LINK_LEAD') {
  const leadId=required(v.leadId,100);await tx.$queryRaw`SELECT id FROM "Lead" WHERE id=${leadId} FOR UPDATE`;
  const before=await tx.lead.findUniqueOrThrow({where:{id:leadId}});version(before.updatedAt,v.expectedUpdatedAt);
  const relationshipId=nullable(v.relationshipId,100),recordKind=required(v.recordKind,30),reviewNote=required(v.reviewNote);
  assertRelationshipLink({recordKind,reviewNote,convertedStudentId:before.convertedStudentId});
  if(relationshipId)await lock(tx,relationshipId);
  const after=await tx.lead.update({where:{id:leadId},data:{relationshipId,recordKind,relationshipReviewNote:reviewNote,relationshipLinkedAt:relationshipId?new Date():null}});
  await audit(tx,actor,'LINK_LEAD',relationshipId??before.relationshipId??leadId,{leadId,before:{relationshipId:before.relationshipId,recordKind:before.recordKind},after:{relationshipId:after.relationshipId,recordKind:after.recordKind},reviewNote});return relationshipId??'';
 }
 const id=required(v.relationshipId,100),before=await lock(tx,id);
 if(input.action==='UPDATE'){version(before.updatedAt,v.expectedUpdatedAt);const after=await tx.salesRelationship.update({where:{id},data:profile(v)});await audit(tx,actor,'UPDATE',id,{before,after});return id;}
 if(input.action==='FOLLOW_UP'){
  version(before.updatedAt,v.expectedUpdatedAt);
  const followUp=await tx.salesRelationshipFollowUp.create({data:{relationshipId:id,actorUserId:actor.id,actorName:actor.name,channel:required(v.channel,60),content:required(v.content),nextAction:nullable(v.nextAction,500),nextActionDue:date(v.nextActionDue)}});
  await tx.salesRelationship.update({where:{id},data:{nextAction:followUp.nextAction,nextActionDue:followUp.nextActionDue}});
  await audit(tx,actor,'FOLLOW_UP',id,{followUpId:followUp.id,content:followUp.content,beforeNextAction:before.nextAction,beforeDue:before.nextActionDue,nextAction:followUp.nextAction,nextActionDue:followUp.nextActionDue});return id;
 }
 const amount=relationshipText(v.estimatedAmount,30);
 if(amount&&!/^\d{1,10}(\.\d{1,2})?$/.test(amount))throw new Error('Enter a non-negative amount with at most two decimal places / 预计金额须为非负数，最多两位小数');
 const data={title:required(v.title,160),status:relationshipOption(v.status,RELATIONSHIP_OPPORTUNITY_STATUSES),ownerName:nullable(v.ownerName,120),nextAction:nullable(v.nextAction,500),nextActionDue:date(v.nextActionDue),estimatedAmount:amount?new Prisma.Decimal(amount):null,currency:'SGD',note:nullable(v.note)};
 const opportunityId=nullable(v.opportunityId,100);
 const previous=opportunityId?await tx.salesRelationshipOpportunity.findFirstOrThrow({where:{id:opportunityId,relationshipId:id}}):null;
 if(previous)version(previous.updatedAt,v.expectedUpdatedAt);
 const after=previous?await tx.salesRelationshipOpportunity.update({where:{id:previous.id},data}):await tx.salesRelationshipOpportunity.create({data:{...data,relationshipId:id}});
 await audit(tx,actor,previous?'UPDATE_OPPORTUNITY':'CREATE_OPPORTUNITY',id,{before:previous,after,amountIsEstimate:true});return id;
}
export async function mutateSalesRelationship(actor:RelationshipActor,input:RelationshipMutation){
 assertRelationshipWrite(actor);
 try{return await prisma.$transaction(tx=>mutateSalesRelationshipInTransaction(tx,actor,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034')throw new Error('Concurrent update; reload before retrying / 同时有人更新了记录，请刷新后重试');throw error;}
}

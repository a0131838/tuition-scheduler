import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {resolveAttendanceRoster} from './session-attendance-roster';
import {cancellationLedgerEvidence} from './cancellation-ledger-evidence';
import {requireCommunicationWriteAccess} from './communication-write-access';

const ACTION='VERIFY_MONTHLY_CLOSURE';
const closed=(status:string)=>['PAUSED','EXCLUDED'].includes(status);
const liveOffer=(status:string)=>['AVAILABLE','HELD','ACCEPTED','COMPLETED'].includes(status);
const include={campaign:true,offers:{orderBy:{id:'asc' as const}}} satisfies Prisma.MonthlySchedulingItemInclude;
type Item=Prisma.MonthlySchedulingItemGetPayload<{include:typeof include}>;
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function range(month:Date){const local=new Date(+month+8*3600000);return {gte:month,lt:new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,1)-8*3600000)};}
function referencedIds(item:Item){
 const evidence=item.scheduleEvidenceJson as {sessions?:Array<{id?:unknown}>}|null;
 const schedule=Array.isArray(item.currentScheduleJson)?item.currentScheduleJson as Array<{sessionId?:unknown}>:[];
 return [...new Set([...(Array.isArray(evidence?.sessions)?evidence.sessions.map(s=>s?.id):[]),...schedule.map(s=>s?.sessionId)].filter((id):id is string=>typeof id==='string'&&!!id))].sort();
}
async function sourceFacts(tx:Prisma.TransactionClient,items:Item[]){
 if(!items.length)return new Map<string,{fingerprint:string;blocker:string|null;hasArrangements:boolean;sessionIds:string[]}>();
 const prior=await tx.auditLog.findMany({where:{module:'MONTHLY_SCHEDULING',action:ACTION,entityId:{in:items.map(i=>i.id)}},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{entityId:true,meta:true}});
 const refsFor=(item:Item)=>{const old=(prior.find(a=>a.entityId===item.id)?.meta as {sessionIds?:unknown}|null)?.sessionIds;return [...new Set([...referencedIds(item),...(Array.isArray(old)?old.filter((id):id is string=>typeof id==='string'):[])])].sort();};
 const refs=[...new Set(items.flatMap(refsFor))];
 const sessions=await tx.session.findMany({where:{OR:[{id:{in:refs}},...items.map(i=>({startAt:range(i.campaign.month),class:{courseId:i.courseId},OR:[{studentId:i.studentId},{class:{oneOnOneStudentId:i.studentId}},{class:{enrollments:{some:{studentId:i.studentId}}}}]}))]},include:{class:{include:{enrollments:{select:{studentId:true},orderBy:{studentId:'asc'}}}},attendances:{orderBy:{id:'asc'},include:{package:{select:{id:true,type:true,note:true}}}}},orderBy:{id:'asc'}});
 const txns=await tx.packageTxn.findMany({where:{sessionId:{in:sessions.map(s=>s.id)}},orderBy:{id:'asc'}});
 const all=new Map(sessions.map(s=>[s.id,s]));
 return new Map(items.map(item=>{
  const ids=refsFor(item),time=range(item.campaign.month);
  let blocker:string|null=null;
  if((item.scheduleEvidenceJson||item.scheduledAt) && !ids.length)blocker='Historical timetable evidence needs review / 历史课表证据缺少确切课次，需核对';
  if(ids.some(id=>!all.has(id)))blocker='A referenced lesson is missing; review its history / 引用课次已缺失，请核对原始历史';
  const relevant=sessions.filter(s=>{
   if(ids.includes(s.id))return true;
   if(s.class.courseId!==item.courseId||s.startAt<time.gte||s.startAt>=time.lt)return false;
   const roster=resolveAttendanceRoster(s);
   if(roster.needsReview){if(s.studentId===item.studentId||s.class.oneOnOneStudentId===item.studentId||s.class.enrollments.some(e=>e.studentId===item.studentId)){blocker='Lesson student identity needs review / 课次学生归属待核对';return true;}return false;}
   return roster.students.some(r=>r.id===item.studentId);
  });
  const evidence=relevant.map(s=>{
   const roster=resolveAttendanceRoster(s),attendance=s.attendances.find(a=>a.studentId===item.studentId);
   if(roster.needsReview||!roster.students.some(r=>r.id===item.studentId)||s.class.courseId!==item.courseId||s.startAt<time.gte||s.startAt>=time.lt)
    blocker='Referenced lesson scope changed; review it first / 引用课次归属或月份已变化，请先核对';
   if(attendance?.status!=='EXCUSED')blocker='Formal lessons remain active; review them in the timetable / 仍有未取消的正式课次，请先到课表处理';
   const ledger=cancellationLedgerEvidence({studentId:item.studentId,exclusiveStudentId:s.studentId,durationMinutes:Math.max(1,Math.round((+s.endAt-+s.startAt)/60000)),attendances:s.attendances,transactions:txns.filter(t=>t.sessionId===s.id)});
   if(attendance?.status==='EXCUSED'&&ledger.status!=='VERIFIED')blocker=ledger.message;
   return {id:s.id,classId:s.classId,studentId:s.studentId,teacherId:s.teacherId??s.class.teacherId,startAt:s.startAt,endAt:s.endAt,
    roster,attendances:s.attendances,transactions:txns.filter(t=>t.sessionId===s.id),ledger};
  });
  const snapshot={status:item.status,intent:item.intent,pausedAt:item.pausedAt,parentConfirmedAt:item.parentConfirmedAt,submittedAt:item.submittedAt,parentNotes:item.parentNotes,internalNote:item.internalNote,studentId:item.studentId,courseId:item.courseId,month:item.campaign.month,scheduledAt:item.scheduledAt,
   scheduleEvidenceJson:item.scheduleEvidenceJson,currentScheduleJson:item.currentScheduleJson,offers:item.offers,evidence};
  return [item.id,{fingerprint:hash(snapshot),blocker,sessionIds:relevant.map(s=>s.id),hasArrangements:!!item.scheduleEvidenceJson||!!item.scheduledAt||item.offers.some(o=>liveOffer(o.status))||relevant.length>0}] as const;
 }));
}

export type MonthlyClosureReview={needsReview:boolean;blocker:string|null;evidence:{verifiedAt:string;actorName:string;reason:string;sessionIds:string[]}|null};
/** A prior acknowledgement is valid only while current source facts still match. */
export async function monthlyClosureReviews(itemIds:string[]){
 if(!itemIds.length)return new Map<string,MonthlyClosureReview>();
 return prisma.$transaction(async tx=>{
  const items=await tx.monthlySchedulingItem.findMany({where:{id:{in:itemIds},status:{in:['PAUSED','EXCLUDED']}},include});
  const facts=await sourceFacts(tx,items);
  const audits=await tx.auditLog.findMany({where:{module:'MONTHLY_SCHEDULING',action:ACTION,entityId:{in:items.map(i=>i.id)}},orderBy:[{createdAt:'desc'},{id:'desc'}]});
  return new Map(items.map(item=>{
   const fact=facts.get(item.id)!,audit=audits.find(a=>a.entityId===item.id),meta=audit?.meta as {fingerprint?:string;reason?:string;sessionIds?:string[]}|null;
   const valid=!fact.blocker&&meta?.fingerprint===fact.fingerprint;
   return [item.id,{needsReview:(fact.hasArrangements||!!fact.blocker||!!audit)&&!valid,blocker:fact.blocker,evidence:valid?{verifiedAt:audit!.createdAt.toISOString(),actorName:audit!.actorName??audit!.actorEmail,reason:meta?.reason??'',sessionIds:fact.sessionIds}:null}] as const;
  }));
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:20000});
}

export async function verifyMonthlyClosure(input:{itemId:string;actorUserId:string;expectedUpdatedAt:string;expectedStatus:string;reason:string;withdrawOptions:boolean}){
 return prisma.$transaction(async tx=>{
  // Monthly management has the same current ADMIN/CS/workspace/manager/operations boundary.
  const actor=await requireCommunicationWriteAccess(tx,input.actorUserId);
  await tx.$queryRaw`SELECT id FROM "MonthlySchedulingItem" WHERE id=${input.itemId} FOR UPDATE`;
  const item=await tx.monthlySchedulingItem.findUnique({where:{id:input.itemId},include});
  if(!item||!closed(item.status)||item.status!==input.expectedStatus||!input.expectedUpdatedAt||item.updatedAt.toISOString()!==input.expectedUpdatedAt)
   throw Error('Item changed; refresh the closure review / 记录已变化，请刷新暂停或排除核验');
  const reason=input.reason.trim();
  if(reason.length<20||reason.length>2000||!input.withdrawOptions)
   throw Error('Record the parent agreement and confirm withdrawal of retained options / 请记录家长约定及处理依据（20–2000字），并确认撤回保留方案');
  const fact=(await sourceFacts(tx,[item])).get(item.id)!;
  if(fact.blocker)throw Error(fact.blocker);
  const last=await tx.auditLog.findFirst({where:{module:'MONTHLY_SCHEDULING',action:ACTION,entityId:item.id},orderBy:[{createdAt:'desc'},{id:'desc'}]});
  if((last?.meta as {fingerprint?:string;reason?:string}|null)?.fingerprint===fact.fingerprint&&(last?.meta as {reason?:string}).reason===reason)return item;
  const options=item.offers.filter(o=>liveOffer(o.status));
  if(options.length)await tx.monthlySchedulingOffer.updateMany({where:{id:{in:options.map(o=>o.id)},status:{in:['AVAILABLE','HELD','ACCEPTED','COMPLETED']}},data:{status:'WITHDRAWN',holdExpiresAt:null}});
  // Original schedule evidence, accepted/completed timestamps and parent response stay intact.
  const row=await tx.monthlySchedulingItem.update({where:{id:item.id},data:{internalNote:reason,ownerUserId:item.ownerUserId??actor.id,ownerName:item.ownerName??actor.name},include});
  const after=(await sourceFacts(tx,[row])).get(item.id)!;
  await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'MONTHLY_SCHEDULING',action:ACTION,entityType:'MonthlySchedulingItem',entityId:item.id,
   meta:{fingerprint:after.fingerprint,reason,sessionIds:after.sessionIds,withdrawnOptions:json(options),beforeInternalNote:item.internalNote,originalTimetableEvidence:json(item.scheduleEvidenceJson),formalLessonsAndLedgerUnchanged:true}}});
  return row;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
}

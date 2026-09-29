import {Prisma} from '@prisma/client';
import {prisma} from './prisma';

type TaskScope={id:string;kind:string;feedbackId:string|null;sessionId:string|null;studentId:string|null;parentId:string|null};
type Counts=Record<string,number>;
export type DeliveryEvidence={status:string;total:number;counts:Counts;reviewNeeded:boolean;scope:string;note:string};
export function summarizeDeliveryCounts(counts:Counts){
 const total=Object.values(counts).reduce((sum,count)=>sum+count,0);
 const status=counts.FAILED?'FAILED':counts.PROCESSING?'PROCESSING':counts.PENDING?'PENDING':counts.SKIPPED?'SKIPPED':total>0&&counts.SENT===total?'SENT':total>0?'NEEDS_REVIEW':'NOT_QUEUED';
 return {status,total,counts};
}
const review=(note:string):DeliveryEvidence=>({status:'NEEDS_REVIEW',total:0,counts:{},reviewNeeded:true,scope:'UNRESOLVED',note});
/** Complete grouped counts, exact recipients and an evidenced publication identity; no age/row sample. */
export async function communicationDeliveryEvidence(tasks:TaskScope[]){
 if(!tasks.length)return new Map<string,DeliveryEvidence>();
 return prisma.$transaction(async tx=>{
  const feedbackIds=[...new Set(tasks.flatMap(row=>row.feedbackId?[row.feedbackId]:[]))];
  const sessionTargets=[...new Set(tasks.filter(row=>row.kind==='COURSE_REMINDER_PARENT'&&row.sessionId).map(row=>`${row.sessionId}:24h`))];
  const [feedbacks,publications,groups]=await Promise.all([
   tx.sessionFeedback.findMany({where:{id:{in:feedbackIds}},select:{id:true,reviewStatus:true,isProxyDraft:true,publishedAt:true}}),
   feedbackIds.length?tx.$queryRaw<Array<{feedbackId:string;targetId:string|null}>>`SELECT DISTINCT ON (meta->>'feedbackId') meta->>'feedbackId' AS "feedbackId",meta->>'notificationTargetId' AS "targetId" FROM "AuditLog" WHERE module='COMMUNICATION' AND action='PUBLISH_FEEDBACK' AND meta->>'feedbackId' IN (${Prisma.join(feedbackIds)}) ORDER BY meta->>'feedbackId',"createdAt" DESC,id DESC`:[],
   tx.miniappNotificationOutbox.groupBy({by:['targetType','targetId','templateKey','studentId','parentId','status'],where:{OR:[...feedbackIds.map(id=>({targetType:'SessionFeedback',templateKey:'feedback_published',OR:[{targetId:id},{targetId:{startsWith:`${id}:revision:`}}]})),...(sessionTargets.length?[{targetType:'Session',templateKey:'course_reminder_24h',targetId:{in:sessionTargets}}]:[])]},_count:{_all:true}}),
  ]);
  const feedbackMap=new Map(feedbacks.map(row=>[row.id,row])),publicationMap=new Map(publications.map(row=>[row.feedbackId,row.targetId]));
  return new Map(tasks.map(task=>{
   let targetType:string,targetId:string,templateKey:string,scope:string,note:string;
   if(!['FEEDBACK','COURSE_REMINDER_PARENT'].includes(task.kind))return [task.id,{...summarizeDeliveryCounts({}),reviewNeeded:false,scope:'NOT_APPLICABLE',note:'No automatic notification mapping / 无对应自动通知'}] as const;
   if(!task.parentId||!task.studentId)return [task.id,review('Recipient identity needs review / 收件家长及学生归属待核对')] as const;
   if(task.kind==='FEEDBACK'){
    if(!task.feedbackId)return [task.id,review('Feedback identity needs review / 反馈归属待核对')] as const;
    const feedback=feedbackMap.get(task.feedbackId);
    if(!feedback?.publishedAt||feedback.isProxyDraft||feedback.reviewStatus!=='PUBLISHED')return [task.id,review('Feedback is not currently published / 反馈当前未审核发布')] as const;
    const publishedTarget=publicationMap.get(task.feedbackId);
    const hasRevisions=groups.some(row=>row.targetType==='SessionFeedback'&&row.targetId?.startsWith(`${task.feedbackId}:revision:`));
    if((publicationMap.has(task.feedbackId)&&!publishedTarget)||(publishedTarget&&publishedTarget!==task.feedbackId&&!publishedTarget.startsWith(`${task.feedbackId}:revision:`))||(!publishedTarget&&hasRevisions))return [task.id,review('Historical publication revision needs review / 历史发布版本归属待核对')] as const;
    targetType='SessionFeedback';targetId=publishedTarget??task.feedbackId;templateKey='feedback_published';scope='CURRENT_FEEDBACK';note='Current published feedback, this parent and student only / 仅当前已发布反馈及此家长、学生';
   }else{
    if(!task.sessionId)return [task.id,review('Combined reminder lacks exact lesson linkage; review each lesson / 合并提醒缺少确切课次关联，请逐课核对')] as const;
    targetType='Session';targetId=`${task.sessionId}:24h`;templateKey='course_reminder_24h';scope='LINKED_LESSON_24H';note='Recorded 24-hour reminder for this lesson and recipient / 此课次及收件人的24小时提醒记录';
   }
   const counts:Counts={};
   for(const group of groups)if(group.targetType===targetType&&group.targetId===targetId&&group.templateKey===templateKey&&group.parentId===task.parentId&&group.studentId===task.studentId)counts[group.status]=(counts[group.status]??0)+group._count._all;
   const summary=summarizeDeliveryCounts(counts);
   return [task.id,{...summary,reviewNeeded:summary.status==='NEEDS_REVIEW',scope,note}] as const;
  }));
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:20000});
}

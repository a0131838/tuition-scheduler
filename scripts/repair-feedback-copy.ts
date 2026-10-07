/** Default: read-only preview. --apply upgrades only matching, unsent, published legacy snapshots. */
import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {formatFullFeedbackMessage} from '../lib/feedback-communication-text';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const open=['READY_TO_SEND','CLAIMED','ATTENTION'];
async function main(){
  const apply=process.argv.includes('--apply');let eligible=0,updated=0,skipped=0;
  const rows=await prisma.parentCommunicationTask.findMany({where:{kind:'FEEDBACK',manualSentAt:null,status:{in:open},feedbackId:{not:null}}});
  for(const row of rows){
    const feedback=await prisma.sessionFeedback.findUnique({where:{id:row.feedbackId!}});
    if(!feedback || feedback.reviewStatus!=='PUBLISHED' || !feedback.publishedAt || feedback.isProxyDraft ||
       row.taskKey!==`FEEDBACK:${feedback.id}:${row.studentId}:submission:${feedback.submittedAt.getTime()}`){skipped++;continue;}
    const body=feedback.parentContent||feedback.content,flat=body.replace(/\s+/g,' ').trim();
    const old=flat.length>260?flat.slice(0,260)+'…':flat;
    const vars=row.templateVariables as Record<string,unknown>|null;
    if(vars?.feedbackSummary!==old || !row.messageText.includes(old)){skipped++;continue;}
    const messageText=formatFullFeedbackMessage(row.messageText.replace(old,()=>body.trim()));
    if(messageText===row.messageText){skipped++;continue;}
    const source=hash(JSON.stringify({content:body,homework:feedback.homework,performance:feedback.classPerformance,previousHomeworkDone:feedback.previousHomeworkDone,actualStartAt:feedback.actualStartAt,actualEndAt:feedback.actualEndAt}));
    eligible++;
    if(apply)await prisma.$transaction(async tx=>{
      // Verify the source revision under a row lock; a concurrent teacher edit cannot leak a draft.
      await tx.$queryRaw`SELECT id FROM "SessionFeedback" WHERE id=${feedback.id} FOR UPDATE`;
      const current=await tx.sessionFeedback.findUniqueOrThrow({where:{id:feedback.id}});
      if(current.updatedAt.getTime()!==feedback.updatedAt.getTime())throw Error('Feedback changed; rerun preview');
      const result=await tx.parentCommunicationTask.updateMany({where:{id:row.id,updatedAt:row.updatedAt,manualSentAt:null,status:{in:open}},data:{messageText,templateVariables:{...vars,feedbackSummary:body.trim()} as Prisma.InputJsonValue,contentFingerprint:hash(`${source}\n${messageText}`)}});
      if(result.count!==1)throw Error('Delivery task changed; rerun preview');
      await tx.auditLog.create({data:{actorEmail:'system-feedback@sgtmanage.local',actorName:'Full feedback copy repair',actorRole:'SYSTEM',module:'COMMUNICATION',action:'UPGRADE_FULL_FEEDBACK_COPY',entityType:'ParentCommunicationTask',entityId:row.id,meta:{release:'2026-10-07-r477',beforeHash:hash(row.messageText),afterHash:hash(messageText)}}});
      updated++;
    });
  }
  console.log(JSON.stringify({apply,scanned:rows.length,eligible,updated,skipped,noMessagesSent:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

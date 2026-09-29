import {MiniappNotificationOutbox, Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {InvalidNotificationSource,validateNotificationForSend} from './notification-send-validity';
import {NotificationTransportError} from './notification-transport-outcome';

type Template = {templateId:string;groupKey?:string};
export type NotificationAdapter<T extends Template> = {
  templateKeys:string[];
  prefix:'AUTO_REMINDER'|'AUTO_NOTIFICATION';
  available:(row:MiniappNotificationOutbox)=>Promise<T|null>;
  send:(input:{openId:string;payload:unknown;template:T})=>Promise<unknown>;
};
export type DispatchResult = 'sent'|'waitingConsent'|'retried'|'failed'|'skipped'|'uncertain'|'unchanged';
const audit = (tx:Prisma.TransactionClient,row:MiniappNotificationOutbox,action:string,meta:Prisma.InputJsonObject={})=>tx.auditLog.create({data:{
  actorEmail:'system-reminders@sgtmanage.local',actorName:'Automatic Reminder',actorRole:'SYSTEM',module:'NOTIFICATIONS',action,
  entityType:'MiniappNotificationOutbox',entityId:row.id,
  meta:{templateKey:row.templateKey,targetType:row.targetType,targetId:row.targetId,parentId:row.parentId,studentId:row.studentId,...meta},
}});

/** Only injected adapters can send; tests supply a local mock. No transport runs on import. */
export async function dispatchNotification<T extends Template>(id:string,adapter:NotificationAdapter<T>):Promise<DispatchResult> {
  const initial = await prisma.miniappNotificationOutbox.findUnique({where:{id}});
  if (!initial || initial.status!=='PENDING' || !adapter.templateKeys.includes(initial.templateKey) || initial.scheduledAt>new Date()) return 'unchanged';
  const template = initial.openId ? await adapter.available(initial) : null;
  const claim = await prisma.$transaction(async tx=>{
    const row = await tx.miniappNotificationOutbox.findUnique({where:{id}});
    // A queue refresh during consent lookup must be evaluated again on the next run.
    if (!row || row.status!=='PENDING' || row.updatedAt.getTime()!==initial.updatedAt.getTime() || row.scheduledAt>new Date()) return {result:'unchanged' as const};
    try {
      if (row.sentAt) throw new InvalidNotificationSource('Prior delivery evidence needs review / 历史送达证据待核对');
      await validateNotificationForSend(tx,row,new Date());
    } catch (error) {
      if (!(error instanceof InvalidNotificationSource)) throw error;
      const changed = await tx.miniappNotificationOutbox.updateMany({where:{id,status:'PENDING',updatedAt:row.updatedAt},data:{status:'SKIPPED',error:error.message}});
      if (changed.count) await audit(tx,row,adapter.prefix+'_SKIPPED',{reason:error.message});
      return {result:changed.count?'skipped' as const:'unchanged' as const};
    }
    if (!row.openId || !template) return {result:'waitingConsent' as const};
    const payload = row.payloadJson && typeof row.payloadJson==='object' && !Array.isArray(row.payloadJson)?row.payloadJson:{};
    // Reserve the chosen template for PROCESSING too: an unknown delivery may have consumed consent.
    const reservedPayload = {...payload,deliveredTemplateId:template.templateId,...(template.groupKey?{deliveredConsentGroupKey:template.groupKey}:{})} as Prisma.InputJsonValue;
    const changed = await tx.miniappNotificationOutbox.updateMany({where:{id,status:'PENDING',updatedAt:row.updatedAt},data:{status:'PROCESSING',payloadJson:reservedPayload}});
    if (!changed.count) return {result:'unchanged' as const};
    await audit(tx,row,adapter.prefix+'_CLAIMED',{templateId:template.templateId,sourceValidatedAt:new Date().toISOString(),priorError:row.error});
    return {row};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
  if ('result' in claim) return claim.result!;
  const row = claim.row;
  const attempt = Number(row.error?.match(/^attempt=(\d+)/)?.[1]??0)+1;
  let transportError:unknown;
  try { await adapter.send({openId:row.openId!,payload:row.payloadJson,template:template!}); }
  catch (error) { transportError=error instanceof Error?error:new Error('Unknown delivery failure'); }
  // Never catch persistence failures as transport failures. Claim remains PROCESSING if this transaction fails.
  return prisma.$transaction(async tx=>{
    const known = transportError instanceof NotificationTransportError && transportError.outcome!=='UNKNOWN';
    const permanent = transportError instanceof NotificationTransportError && [40037,43101].includes(transportError.errcode??0);
    const retry = known && !permanent && attempt<3;
    const result:DispatchResult = !transportError?'sent':!known?'uncertain':retry?'retried':'failed';
    const status = result==='sent'?'SENT':result==='uncertain'?'PROCESSING':retry?'PENDING':'FAILED';
    const reason = transportError instanceof NotificationTransportError?transportError.message:'Delivery outcome unconfirmed / 发送结果未确认，请核对';
    const changed = await tx.miniappNotificationOutbox.updateMany({where:{id,status:'PROCESSING'},data:result==='sent'
      ? {status,sentAt:new Date(),error:null}
      : {status,error:`attempt=${attempt}; ${reason}`, ...(retry?{scheduledAt:new Date(Date.now()+attempt*5*60000)}:{})}});
    if (changed.count!==1) throw Error(`Notification outcome needs reconciliation (${id}); no automatic resend / 通知结果需核对，不自动重发`);
    await audit(tx,row,adapter.prefix+'_'+(result==='sent'?'SENT':result==='uncertain'?'UNCERTAIN':retry?'RETRY':'FAILED'),{
      attempt,templateId:template!.templateId,outcome:result==='sent'?'PROVIDER_ACCEPTED':transportError instanceof NotificationTransportError?transportError.outcome:'UNKNOWN',
      ...(result==='sent'?{}:{reason}),
    });
    return result;
  });
}

/** A queue scan may be stale: never overwrite PROCESSING/SENT or a refreshed payload. */
export async function invalidateScannedPendingNotification(row:{id:string;updatedAt:Date},reason:string,meta:Prisma.InputJsonObject={}) {
  return prisma.$transaction(async tx=>{
    const current=await tx.miniappNotificationOutbox.findUnique({where:{id:row.id}});
    if (!current) return 0;
    const changed=await tx.miniappNotificationOutbox.updateMany({where:{id:row.id,status:'PENDING',updatedAt:row.updatedAt},data:{status:'SKIPPED',error:reason}});
    if (changed.count) await audit(tx,current,'INVALIDATE_STALE_COURSE_REMINDER',{reason,...meta});
    return changed.count;
  });
}

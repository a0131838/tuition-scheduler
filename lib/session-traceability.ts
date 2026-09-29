import {prisma} from './prisma';
import {explicitSessionReferences} from './session-traceability-evidence';
/** Exact recorded identifiers only. Names and timestamps are not relationships. */
export async function getSessionTraceability(sessionId:string){
 const [actions,audits]=await Promise.all([
  prisma.ticketSchedulingAction.findMany({where:{OR:[{sourceSessionId:sessionId},{resultSessionId:sessionId},{resultSessionIds:{has:sessionId}}]},select:{id:true,actionType:true,status:true,sourceSessionId:true,resultSessionId:true,resultSessionIds:true,appliedAt:true,ticket:{select:{id:true,ticketNo:true}}},orderBy:{updatedAt:'desc'},take:21}),
  prisma.auditLog.findMany({where:{OR:[{entityType:'Session',entityId:sessionId,module:{in:['SCHEDULING','session','TEACHING']}},{entityType:'TicketSchedulingAction',module:'TICKETS',OR:[{meta:{path:['sourceSessionId'],equals:sessionId}},{meta:{path:['resultSessionId'],equals:sessionId}},{meta:{path:['resultSessionIds'],array_contains:[sessionId]}}]}]},select:{id:true,action:true,entityType:true,entityId:true,createdAt:true,actorName:true,actorEmail:true,meta:true},orderBy:{createdAt:'desc'},take:31})
 ]);
 const ids=new Set([sessionId]);for(const a of [...actions,...audits.map(a=>explicitSessionReferences(a.meta))]){if(a.sourceSessionId)ids.add(a.sourceSessionId);for(const id of a.resultSessionIds)ids.add(id);if('resultSessionId' in a&&typeof a.resultSessionId==='string'&&a.resultSessionId)ids.add(a.resultSessionId);}
 const sessions=await prisma.session.findMany({
  where:{id:{in:[...ids]}},
  select:{id:true,classId:true,startAt:true,endAt:true,
   teacher:{select:{name:true}},student:{select:{name:true}},
   class:{select:{teacher:{select:{name:true}},course:{select:{name:true}}}},
  },
 });
 return {actions:actions.slice(0,20),audits:audits.slice(0,30),sessions,truncated:actions.length>20||audits.length>30};
}

import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import type {SchedulingHistoryActor} from './scheduling-change-history';

export class SessionDeletionBlocked extends Error {
  constructor(message='Session has teaching or linked history; use cancellation and reviewed correction / 课次已有教学或关联历史，请使用取消及核对纠正流程'){super(message);}
}
export async function deleteEmptySessionInTransaction(tx:Prisma.TransactionClient,input:{sessionId:string;classId?:string;actor:SchedulingHistoryActor}){
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${input.sessionId} FOR UPDATE`;
  const row=await tx.session.findUnique({where:{id:input.sessionId},include:{
    class:{include:{teacher:{select:{id:true,name:true}},course:{select:{id:true,name:true}},subject:{select:{id:true,name:true}},level:{select:{id:true,name:true}},campus:{select:{id:true,name:true}},room:{select:{id:true,name:true}},enrollments:{select:{studentId:true,student:{select:{name:true}}}}}},
    teacher:{select:{id:true,name:true}},student:{select:{id:true,name:true}},attendances:true,payrollOverride:true,_count:true,
  }});
  if(!row||input.classId&&row.classId!==input.classId)throw new SessionDeletionBlocked('Session not found in this class / 此班级中没有该课次');
  if(row.startAt<=new Date()||row.feedbackPolicyJson!==null||row.payrollOverride!==null||
    row.attendances.some(a=>a.status!=='UNMARKED'||a.deductedMinutes!==0||a.deductedCount!==0||a.packageId||a.note||a.excusedCharge||a.waiveDeduction||a.waiveReason)||
    Object.entries(row._count).some(([key,n])=>key!=='attendances'&&n>0)||
    await tx.packageTxn.count({where:{sessionId:row.id}})||
    await tx.ticketSchedulingAction.count({where:{resultSessionIds:{has:row.id}}})
  )throw new SessionDeletionBlocked();
  const before={startAt:row.startAt.toISOString(),endAt:row.endAt.toISOString(),teacherName:row.teacher?.name??row.class.teacher.name,studentName:row.student?.name??null,campusName:row.class.campus.name,roomName:row.class.room?.name??null};
  await tx.auditLog.create({data:{actorEmail:input.actor.email,actorName:input.actor.name,actorRole:input.actor.role,module:'SCHEDULING',action:'SESSION_DELETED',entityType:'Session',entityId:row.id,meta:JSON.parse(JSON.stringify({version:1,classId:row.classId,source:'WEB',scope:'single',reason:'Removed unused future session / 删除未发生业务的未来课次',before,sourceSnapshot:row}))}});
  await tx.session.delete({where:{id:row.id}});
  return {ok:true};
}
export async function deleteEmptySession(input:Parameters<typeof deleteEmptySessionInTransaction>[1]){
  try{return await prisma.$transaction(tx=>deleteEmptySessionInTransaction(tx,input),{isolationLevel:'Serializable',timeout:15000});}
  catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&(e.code==='P2034'||e.code==='P2010'&&['40001','40P01'].includes(String(e.meta?.code))))throw new SessionDeletionBlocked('Session changed; refresh before deleting / 课次已变更，请刷新后核对');throw e;}
}

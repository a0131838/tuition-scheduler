import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
import {formatBusinessDateOnly,parseBusinessDateStart} from './date-only';
type Db=typeof prisma|Prisma.TransactionClient;
type Actor={id:string;name:string;email:string;role:string;isObserver?:boolean};
export function parseAvailabilityBlockInput(body:Record<string,unknown>){
  const dateText=String(body.date||''),date=parseBusinessDateStart(dateText);
  const startMin=body.fullDay===true?0:Number(body.startMin),endMin=body.fullDay===true?1440:Number(body.endMin);
  if(!date||formatBusinessDateOnly(date)!==dateText||!Number.isInteger(startMin)||!Number.isInteger(endMin)||startMin<0||endMin>1440||endMin<=startMin)
    throw Error('请选择有效日期和不可用时段 / Select a valid date and unavailable interval');
  return {date,startMin,endMin,note:String(body.note||'').trim().slice(0,500)||null};
}
export async function saveTeacherAvailabilityBlock(teacherId:string,body:Record<string,unknown>,actor:Actor){
  if(actor.isObserver)throw Error('只读账号不能修改 / Read-only account cannot edit');
  const input=parseAvailabilityBlockInput(body);
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Teacher" WHERE id=${teacherId} FOR UPDATE`;
    const block=await tx.teacherAvailabilityBlock.upsert({where:{teacherId_date_startMin_endMin:{teacherId,date:input.date,startMin:input.startMin,endMin:input.endMin}},create:{teacherId,...input},update:{note:input.note}});
    await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'TEACHER_AVAILABILITY',action:'SET_UNAVAILABLE',entityType:'TeacherAvailabilityBlock',entityId:block.id,meta:{teacherId,date:formatBusinessDateOnly(input.date),startMin:input.startMin,endMin:input.endMin}}});
    const startAt=new Date(+input.date+input.startMin*60000),endAt=new Date(+input.date+input.endMin*60000);
    const existingLessons=await tx.session.count({where:{startAt:{lt:endAt},endAt:{gt:startAt},OR:[{teacherId},{teacherId:null,class:{teacherId}}]}});
    return {block,existingLessons};
  });
}
export async function removeTeacherAvailabilityBlock(teacherId:string,id:string,expectedUpdatedAt:string,actor:Actor){
  if(actor.isObserver)throw Error('只读账号不能修改 / Read-only account cannot edit');
  const updatedAt=new Date(expectedUpdatedAt);if(!id||!Number.isFinite(+updatedAt))throw Error('请刷新后重试 / Refresh and try again');
  return prisma.$transaction(async tx=>{
    const result=await tx.teacherAvailabilityBlock.deleteMany({where:{id,teacherId,updatedAt}});
    if(result.count!==1)throw Error('记录已变更，请刷新后重试 / Record changed; refresh and try again');
    await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'TEACHER_AVAILABILITY',action:'REMOVE_UNAVAILABLE',entityType:'TeacherAvailabilityBlock',entityId:id,meta:{teacherId}}});
  });
}
export async function listTeacherAvailabilityBlocks(db:Db,teacherId:string,month:string){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('月份无效 / Invalid month');
  const from=parseBusinessDateStart(month+'-01')!;
  const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();
  const to=new Date(+parseBusinessDateStart(`${month}-${last}`)!+86400000);
  const rows=await db.teacherAvailabilityBlock.findMany({where:{teacherId,date:{gte:from,lt:to}},orderBy:[{date:'asc'},{startMin:'asc'}]});
  return rows.map(row=>({...row,date:formatBusinessDateOnly(row.date),updatedAt:row.updatedAt.toISOString()}));
}

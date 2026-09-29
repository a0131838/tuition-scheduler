import {prisma} from './prisma';
import type {SchedulingHistoryActor} from './scheduling-change-history';
/** Parent deletion cannot be used to bypass session history protection. */
export async function deleteUnusedSchedulingContainer(kind:'Class'|'Campus'|'Teacher',id:string,actor:SchedulingHistoryActor){
 return prisma.$transaction(async tx=>{
  // kind is a closed internal enum, never interpolated from request data.
  if(kind==='Class')await tx.$queryRaw`SELECT id FROM "Class" WHERE id=${id} FOR UPDATE`;
  else if(kind==='Campus')await tx.$queryRaw`SELECT id FROM "Campus" WHERE id=${id} FOR UPDATE`;
  else await tx.$queryRaw`SELECT id FROM "Teacher" WHERE id=${id} FOR UPDATE`;
  const row=kind==='Class'?await tx.class.findUnique({where:{id},include:{_count:true}}):kind==='Campus'?await tx.campus.findUnique({where:{id},include:{_count:true}}):await tx.teacher.findUnique({where:{id},include:{_count:true,employeeProfile:{select:{id:true}}}});
  if(!row)throw new Error('Record not found / 记录不存在');
  if(Object.values(row._count).some(n=>n>0)||('employeeProfile' in row && row.employeeProfile))throw new Error('Linked scheduling or business records exist; keep this record and review them individually / 存在关联排课或业务记录，请保留此档案并逐项核对，不能级联删除');
  await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SCHEDULING',action:'DELETE_UNUSED_CONTAINER',entityType:kind,entityId:id,meta:JSON.parse(JSON.stringify({version:1,sourceSnapshot:row}))}});
  if(kind==='Class')await tx.class.delete({where:{id}});
  else if(kind==='Campus')await tx.campus.delete({where:{id}});
  else await tx.teacher.delete({where:{id}});
  return {ok:true};
 },{isolationLevel:'Serializable',timeout:15000});
}

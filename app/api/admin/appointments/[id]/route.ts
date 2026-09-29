import {prisma} from '@/lib/prisma';
import {requireSessionDeletionActor} from '@/lib/session-deletion-auth';
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){
 let actor;try{actor=await requireSessionDeletionActor();}catch{return Response.json({ok:false,message:'Teaching management permission required / 需要教学管理权限'},{status:403});}
 const {id}=await params;
 try{
  await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Appointment" WHERE id=${id} FOR UPDATE`;
   const row=await tx.appointment.findUnique({where:{id},include:{_count:true}});
   if(!row)throw new Error('Appointment not found / 预约不存在');
   if(row.startAt<=new Date()||row._count.bookingRequests>0)throw new Error('Appointment has history; use reviewed cancellation / 预约已有历史，请核对后使用取消流程');
   // A similar time is not an identity link: never delete a guessed lesson.
   if(await tx.session.count({where:{startAt:row.startAt,endAt:row.endAt,OR:[{teacherId:row.teacherId},{teacherId:null,class:{teacherId:row.teacherId}}]}}))throw new Error('A lesson exists at this teacher and time. Review the exact records separately; no lesson was deleted / 该老师此时段存在课次，请分别核对准确记录；未删除任何课程');
   await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'SCHEDULING',action:'DELETE_UNUSED_APPOINTMENT',entityType:'Appointment',entityId:id,meta:JSON.parse(JSON.stringify({version:1,sourceSnapshot:row,deletedSession:false}))}});
   await tx.appointment.delete({where:{id}});
  },{isolationLevel:'Serializable',timeout:15000});
  return Response.json({ok:true,deletedSession:false});
 }catch(e){return Response.json({ok:false,message:e instanceof Error?e.message:'Delete failed / 删除失败'},{status:409});}
}

import { prisma } from "./prisma";
import { getCurrentUser, isManagerUser, isTeacherLeadUser } from "./auth";
import { formatBusinessDateOnly } from "./date-only";

export const adminRoomReservationsPath = "/admin/room-reservations";
export const teacherRoomReservationsPath = "/teacher/lead/rooms";
export type RoomReservationArea = "admin" | "teacher";

export function canManageAdminRoomReservations(user: {
  role: string;
  workspaces: string[];
  operationsAdmin: boolean;
  isObserver: boolean;
}, manager: boolean) {
  return !user.isObserver && user.role !== "STUDENT" &&
    (user.role === "ADMIN" || user.role === "CS" || user.operationsAdmin || user.workspaces.includes("CS") || manager);
}

export async function requireRoomReservationUser(area: RoomReservationArea) {
  const actor = await getCurrentUser();
  const allowed = actor && !actor.isObserver && (area === "admin"
    ? canManageAdminRoomReservations(actor, await isManagerUser(actor))
    : actor.role === "ADMIN" || actor.operationsAdmin || await isTeacherLeadUser(actor));
  if (!allowed) throw new Error("Room booking permission required / 需要教务或老师主管权限");
  return actor;
}

export async function saveRoomReservation(area: RoomReservationArea, input:{id?:string;updatedAt?:string;roomId:string;organization:string;contact?:string;note?:string;startAt:string;endAt:string;repeatWeeks?:number;status?:string}){
 const actor=await requireRoomReservationUser(area);const startAt=new Date(input.startAt),endAt=new Date(input.endAt);const repeat=input.id?1:Number(input.repeatWeeks||1);
 if(!input.roomId||!input.organization.trim()||input.organization.length>120||!Number.isFinite(+startAt)||!Number.isFinite(+endAt)||endAt<=startAt||formatBusinessDateOnly(startAt)!==formatBusinessDateOnly(endAt)||!Number.isInteger(repeat)||repeat<1||repeat>12)throw new Error('Check organization, room and same-day time range / 请核对机构、教室及当天起止时间');
 if(!['CONFIRMED','CANCELLED','COMPLETED'].includes(input.status||'CONFIRMED'))throw new Error('Invalid status / 状态无效');
 return prisma.$transaction(async tx=>{
  if(!await tx.room.findUnique({where:{id:input.roomId}}))throw new Error('Room not found / 教室不存在');
  const before=input.id?await tx.roomReservation.findUnique({where:{id:input.id}}):null;
  if(input.id&&(!before||before.updatedAt.toISOString()!==input.updatedAt))throw new Error('Booking changed; refresh / 预约已变更，请刷新');
  const output=[];
  for(let i=0;i<repeat;i++){
   const data={roomId:input.roomId,organization:input.organization.trim(),contact:input.contact?.trim().slice(0,300)||null,note:input.note?.trim().slice(0,2000)||null,startAt:new Date(+startAt+i*7*86400000),endAt:new Date(+endAt+i*7*86400000),status:input.status||'CONFIRMED',responsibleUserId:before?.responsibleUserId||actor.id};
   let row;if(before){const changed=await tx.roomReservation.updateMany({where:{id:before.id,updatedAt:before.updatedAt},data});if(changed.count!==1)throw new Error('Booking changed; refresh / 预约已变更，请刷新');row=await tx.roomReservation.findUniqueOrThrow({where:{id:before.id}});}else row=await tx.roomReservation.create({data});
   await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'ROOMS',action:before?'UPDATE_ROOM_RESERVATION':'CREATE_ROOM_RESERVATION',entityType:'RoomReservation',entityId:row.id,meta:{before,after:row}}});output.push(row);
  }return output;
 },{isolationLevel:'Serializable',timeout:20000}).catch(e=>{const msg=e instanceof Error?e.message:'';if(msg.includes('CLASSROOM_'))throw new Error('Room/time conflict with a lesson or booking / 教室时段与正式课程或已有预约冲突');if(msg.includes('P2034')||msg.includes('serialize'))throw new Error('Concurrent booking changed; refresh / 同时有预约变更，请刷新');throw e;});
}

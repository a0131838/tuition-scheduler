import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/date-only";
export default async function RoomReservationPanel({from,to,date}:{from:Date;to:Date;date:string}){
 const rows=await prisma.roomReservation.findMany({where:{startAt:{gte:from,lt:to},status:{not:'CANCELLED'}},orderBy:{startAt:'asc'}});const [rooms,users]=await Promise.all([prisma.room.findMany({where:{id:{in:rows.map(r=>r.roomId)}},include:{campus:true}}),prisma.user.findMany({where:{id:{in:rows.map(r=>r.responsibleUserId)}},select:{id:true,name:true}})]);
 return <section style={{background:'#f0fdfa',border:'1px solid #99d5cd',borderRadius:12,padding:14}}><h2>External classroom bookings / 外部教室预约</h2><a href={`/teacher/lead/rooms?date=${date}`}>Book / manage XDF, 2B and other reservations / 预约及管理教室</a>{!rows.length?<p>No external bookings this week / 本周暂无外部预约</p>:rows.map(r=><p key={r.id}>{formatBusinessDateTime(r.startAt)} – {formatBusinessDateTime(r.endAt)} · {r.organization} · {rooms.find(x=>x.id===r.roomId)?.campus.name} / {rooms.find(x=>x.id===r.roomId)?.name} · {users.find(x=>x.id===r.responsibleUserId)?.name} · {r.note}</p>)}</section>;
}

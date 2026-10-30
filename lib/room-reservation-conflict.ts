import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { formatBusinessDateTime } from "./date-only";
export async function roomReservationConflict(db:typeof prisma|Prisma.TransactionClient,roomId:string,startAt:Date,endAt:Date){
 const row=await db.roomReservation.findFirst({where:{roomId,status:{not:'CANCELLED'},startAt:{lt:endAt},endAt:{gt:startAt}},orderBy:{startAt:'asc'}});
 return row?`Classroom reserved by ${row.organization}: ${formatBusinessDateTime(row.startAt)} – ${formatBusinessDateTime(row.endAt)} / 教室已被外部预约占用`:null;
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {formatBusinessDateOnly, formatBusinessTimeOnly, parseBusinessDateStart, parseBusinessDateEnd} from "./date-only";
import {effectiveDateAvailability} from "./teacher-availability-ranges";

type DbClient = typeof prisma | Prisma.TransactionClient;
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const sourceNull=null as "date" | "weekly" | null;
function fmtSlotRange(startMin:number,endMin:number){
  const fmt=(min:number)=>`${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`;
  return `${fmt(startMin)}-${fmt(endMin)}`;
}

export async function inspectTeacherSchedulingAvailability(db:DbClient,teacherId:string,startAt:Date,endAt:Date){
  const dateKey=formatBusinessDateOnly(startAt);
  if(!Number.isFinite(+startAt)||!Number.isFinite(+endAt)||endAt<=startAt||dateKey!==formatBusinessDateOnly(endAt))
    return {error:"课程须在同一自然日内，结束时间晚于开始时间 / Lesson must end after it starts within one Singapore day",source:sourceNull};
  const dayStart=parseBusinessDateStart(dateKey)!,dayEnd=parseBusinessDateEnd(dateKey)!;
  const weekday=new Date(dayStart.getTime()+8*3600000).getUTCDay();
  const [dateSlots,weeklySlots,blocks,approvedLeave]=await Promise.all([
    db.teacherAvailabilityDate.findMany({where:{teacherId,date:{gte:dayStart,lte:dayEnd}},select:{startMin:true,endMin:true},orderBy:{startMin:"asc"}}),
    db.teacherAvailability.findMany({where:{teacherId,weekday},select:{startMin:true,endMin:true},orderBy:{startMin:"asc"}}),
    db.teacherAvailabilityBlock.findMany({where:{teacherId,date:{gte:dayStart,lte:dayEnd}},select:{startMin:true,endMin:true}}),
    db.hrLeaveRequest.findFirst({where:{status:"APPROVED",startAt:{lt:endAt},endAt:{gt:startAt},employee:{teacherId}},select:{leaveType:true}}),
  ]);
  if(approvedLeave)return {error:`老师在该时段已有已批准假期（${approvedLeave.leaveType}），请更换老师或时间 / Approved leave overlaps this lesson; choose another time or teacher`,source:sourceNull};
  const minutes=(d:Date)=>{const shifted=new Date(+d+8*3600000);return shifted.getUTCHours()*60+shifted.getUTCMinutes();};
  const startMin=minutes(startAt),endMin=minutes(endAt);
  if(blocks.some(b=>b.startMin<endMin && b.endMin>startMin))return {error:"老师在该日期时段已明确不可用，请更换老师或时间 / Teacher is explicitly unavailable for this date and time",source:sourceNull};
  // Weekly templates are planning references, never confirmation for an empty date.
  if(!dateSlots.length){
    if(weeklySlots.length)return {error:`${WEEKDAYS[weekday]}只有每周常规模板（${weeklySlots.map(s=>fmtSlotRange(s.startMin,s.endMin)).join(", ")}），当天尚未确认；请联系老师并录入按日期时段 / Weekly template only; confirm with the teacher and add date availability before scheduling`,source:"weekly" as const};
    return {error:`${WEEKDAYS[weekday]}没有录入可用时间，请先联系老师确认并补充老师时间 / No date availability; confirm with the teacher first`,source:sourceNull};
  }
  const slots=effectiveDateAvailability(dateSlots,blocks);
  if(!slots.some(s=>s.startMin<=startMin && s.endMin>=endMin))return {error:`${WEEKDAYS[weekday]} ${formatBusinessTimeOnly(startAt)}-${formatBusinessTimeOnly(endAt)}不在老师的当天特殊可用时间内；可用：${slots.map(s=>fmtSlotRange(s.startMin,s.endMin)).join(", ")||"无"} / Outside confirmed date availability`,source:"date" as const};
  return {error:null as string|null,source:"date" as const};
}

export async function checkTeacherSchedulingAvailability(db:DbClient,teacherId:string,startAt:Date,endAt:Date){
  return (await inspectTeacherSchedulingAvailability(db,teacherId,startAt,endAt)).error;
}

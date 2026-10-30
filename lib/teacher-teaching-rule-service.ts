import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { inspectContinuousTeaching,DEFAULT_TEACHING_RULE } from "./teacher-teaching-rule";
import { isSessionFullyCancelled } from "./session-students";
import { formatBusinessDateOnly,parseBusinessDateStart } from "./date-only";
export async function teachingBreakError(db:typeof prisma|Prisma.TransactionClient,teacherId:string,startAt:Date,endAt:Date,excludeSessionIds:string[]=[]){
 if(startAt<new Date())return null;
 const date=formatBusinessDateOnly(startAt),from=parseBusinessDateStart(date)!;const to=new Date(+from+86400000);
 const [configured,lessons,appointments]=await Promise.all([db.teacherTeachingRule.findUnique({where:{teacherId}}),db.session.findMany({where:{id:{notIn:excludeSessionIds},OR:[{teacherId},{teacherId:null,class:{teacherId}}],startAt:{gte:from,lt:to}},include:{attendances:{select:{studentId:true,status:true}},class:{include:{enrollments:{select:{studentId:true}}}}}}),db.appointment.findMany({where:{teacherId,startAt:{gte:from,lt:to}}})]);
 const result=inspectContinuousTeaching([...lessons.filter(s=>!isSessionFullyCancelled(s)).map(s=>({startAt:s.startAt,endAt:s.endAt})),...appointments.map(s=>({startAt:s.startAt,endAt:s.endAt})),{startAt,endAt,candidate:true}],configured??DEFAULT_TEACHING_RULE);
 return result.blocked?`Continuous teaching would exceed ${result.maxContinuousMinutes} minutes. Arrange at least ${result.minBreakMinutes} minutes break, or ask the manager to confirm an individual rule / 连续授课将超过${result.maxContinuousMinutes}分钟，请安排至少${result.minBreakMinutes}分钟休息，或由主管确认个人规则。`:null;
}

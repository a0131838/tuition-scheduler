import { prisma } from "./prisma";
import { getCurrentUser, isTeacherLeadUser } from "./auth";
import { formatBusinessDateOnly, formatBusinessTimeOnly, parseBusinessDateStart } from "./date-only";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "./session-students";
export async function loadTeacherCalendarExport(teacherId: string, params: URLSearchParams) {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("401");
  if (actor.teacherId !== teacherId && actor.role !== "ADMIN" && !actor.operationsAdmin && !(await isTeacherLeadUser(actor))) throw new Error("403");
  const month = params.get("month") || formatBusinessDateOnly(new Date()).slice(0,7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("400");
  let from = parseBusinessDateStart(month+"-01")!;
  let to = parseBusinessDateStart(`${Number(month.slice(0,4))+(month.endsWith('-12')?1:0)}-${month.endsWith('-12')?'01':String(Number(month.slice(5))+1).padStart(2,'0')}-01`)!;
  const view = params.get("view") === "week" ? "week" : "month";
  if (view === "week") {
    const start = params.get("week") || month+"-01";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !parseBusinessDateStart(start)) throw new Error("400");
    from = parseBusinessDateStart(start)!; to = new Date(+from+7*86400000);
  }
  const [teacher,sessions,availability,blocks,leave] = await Promise.all([
    prisma.teacher.findUnique({where:{id:teacherId},select:{id:true,name:true}}),
    prisma.session.findMany({where:{OR:[{teacherId},{teacherId:null,class:{teacherId}}],startAt:{gte:from,lt:to}},include:{student:{select:{id:true,name:true}},attendances:{select:{studentId:true,status:true}},class:{include:{course:true,subject:true,teacher:true,campus:true,room:true,oneOnOneStudent:{select:{id:true,name:true}},enrollments:{include:{student:{select:{id:true,name:true}}}}}}},orderBy:{startAt:'asc'}}),
    params.get('availability')==='1'?prisma.teacherAvailabilityDate.findMany({where:{teacherId,date:{gte:from,lt:to}},orderBy:[{date:'asc'},{startMin:'asc'}]}):Promise.resolve([]),
    params.get('availability')==='1'?prisma.teacherAvailabilityBlock.findMany({where:{teacherId,date:{gte:from,lt:to}}}):Promise.resolve([]),
    params.get('availability')==='1'?prisma.hrLeaveRequest.findMany({where:{status:'APPROVED',employee:{teacherId},startAt:{lt:to},endAt:{gt:from}},select:{startAt:true,endAt:true}}):Promise.resolve([]),
  ]);
  if (!teacher) throw new Error("404");
  const hm=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  return {teacher,month,view,from,to,generatedAt:new Date(),lessons:sessions.map(s=>({id:s.id,date:formatBusinessDateOnly(s.startAt),time:`${formatBusinessTimeOnly(s.startAt)}–${formatBusinessTimeOnly(s.endAt)}`,students:getVisibleSessionStudentNames(s).join(', '),course:[s.class.course.name,s.class.subject?.name].filter(Boolean).join(' / '),place:s.class.campus.isOnline?'Online / 线上':[s.class.campus.name,s.class.room?.name].filter(Boolean).join(' / '),cancelled:isSessionFullyCancelled(s)})),availability:availability.map(a=>({date:formatBusinessDateOnly(a.date),text:`${hm(a.startMin)}–${hm(a.endMin)} Recorded availability / 已录可用时间（并非空闲承诺）`})),blocks:[...leave.flatMap(l=>{const rows:{date:string;text:string}[]=[];for(let d=new Date(Math.max(+from,+(parseBusinessDateStart(formatBusinessDateOnly(l.startAt))!)));d<to&&d<=l.endAt;d=new Date(+d+86400000))rows.push({date:formatBusinessDateOnly(d),text:'Approved leave / 已批准假期'});return rows;}),...blocks.map(a=>({date:formatBusinessDateOnly(a.date),text:`${hm(a.startMin)}–${hm(a.endMin)} Unavailable / 不可用`}))]};
}

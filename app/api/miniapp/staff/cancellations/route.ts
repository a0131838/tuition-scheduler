import { bad, ok } from '@/app/api/miniapp/_lib';
import { requireMiniappStaff } from '@/app/api/miniapp/staff/_lib';
import { isManagerUser } from "@/lib/auth";
import { canManageMiniappSchedulingCoordination } from '@/lib/miniapp-staff-session';
import { prisma } from '@/lib/prisma';
import { parseBusinessDateStart, parseBusinessDateEnd, formatBusinessDateOnly, formatBusinessDateTime } from '@/lib/date-only';
import { cancellationRequesterLabel } from '@/lib/lesson-cancellation-policy';
import { listLessonChangeHistory } from '@/lib/lesson-change-history';

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if(!auth.ok) return auth.response;
  if(auth.user.role!=='FINANCE' && !canManageMiniappSchedulingCoordination(auth.user) && !await isManagerUser(auth.user)) return bad('No permission / 无查询权限',403);
  const q = new URL(req.url).searchParams, today = formatBusinessDateOnly(new Date());
  const fromText = q.get('from') || `${today.slice(0,7)}-01`, toText = q.get('to') || today;
  const from = parseBusinessDateStart(fromText), to = parseBusinessDateEnd(toText);
  if(!from || !to || to<from || +to - +from > 366*86400000) return bad('Select a valid date range within one year / 请选择一年以内有效日期范围',400);
  const requester = q.get('requester') || '', charge = q.get('charge') || '', student = (q.get('student')||'').trim();
  const rows = await prisma.attendance.findMany({where:{status:'EXCUSED',session:{startAt:{gte:from,lte:to}},
    ...(student?{student:{name:{contains:student,mode:'insensitive'}}}:{}),
    ...(requester==='UNKNOWN'?{cancellationRequestedBy:null}:['PARENT','TEACHER','SCHOOL'].includes(requester)?{cancellationRequestedBy:requester}:{}),
    ...(charge==='charged'?{OR:[{excusedCharge:true},{deductedMinutes:{gt:0}},{deductedCount:{gt:0}}]}:charge==='uncharged'?{excusedCharge:false,deductedMinutes:0,deductedCount:0}:{})},
    select:{id:true,cancellationRequestedBy:true,cancellationReason:true,note:true,excusedCharge:true,deductedMinutes:true,deductedCount:true,student:{select:{name:true}},session:{select:{startAt:true,endAt:true,teacher:{select:{name:true}},class:{select:{teacher:{select:{name:true}},course:{select:{name:true}}}}}}},orderBy:{session:{startAt:'desc'}},take:500});
  const history = await listLessonChangeHistory({from,to});
  return ok({readOnly:true,from:fromText,to:toText,limited:rows.length===500,rows:rows.map(r=>({id:r.id,studentName:r.student.name,courseName:r.session.class.course.name,teacherName:r.session.teacher?.name||r.session.class.teacher.name,time:formatBusinessDateTime(r.session.startAt),
    requester:cancellationRequesterLabel(r.cancellationRequestedBy,'ZH'),charged:r.excusedCharge||r.deductedMinutes>0||r.deductedCount>0,deductedMinutes:r.deductedMinutes,deductedCount:r.deductedCount,reason:r.cancellationReason||r.note||'-'})),
    history:history.rows.filter(r=>!student||r.studentName.toLowerCase().includes(student.toLowerCase())).slice(0,100).map(r=>({...r,changedAt:formatBusinessDateTime(new Date(r.changedAt)),beforeStart:r.beforeStart?formatBusinessDateTime(new Date(r.beforeStart)):null,afterStart:r.afterStart?formatBusinessDateTime(new Date(r.afterStart)):null})),historyLimited:history.limited||history.rows.length>100});
}

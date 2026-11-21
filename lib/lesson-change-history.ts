import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export async function listLessonChangeHistory(input: {from: Date; to: Date; studentId?: string; teacherId?: string; courseId?: string}, db: Prisma.TransactionClient = prisma) {
  const audits = await db.auditLog.findMany({where:{module:'SCHEDULING',action:{in:['SESSION_CANCELLED','SESSION_RESCHEDULED','SESSION_DELETED']},createdAt:{gte:input.from,lte:input.to}},orderBy:{createdAt:'desc'},take:1000});
  const sessions = await db.session.findMany({where:{id:{in:audits.map(a=>a.entityId).filter((id):id is string=>!!id)}},include:{student:{select:{id:true,name:true}},teacher:{select:{id:true,name:true}},class:{include:{teacher:{select:{id:true,name:true}},course:{select:{id:true,name:true}},enrollments:{select:{studentId:true,student:{select:{name:true}}}}}}}});
  const byId = new Map(sessions.map(s=>[s.id,s]));
  const rows = audits.flatMap(a=>{
    const meta = (a.meta || {}) as any, saved = meta.sourceSnapshot, session = byId.get(a.entityId || '') || saved;
    const cls = session?.class;
    const studentIds = session?.studentId ? [session.studentId] : cls?.oneOnOneStudentId ? [cls.oneOnOneStudentId] : (cls?.enrollments || []).map((e:any)=>e.studentId);
    if(input.studentId && !studentIds.includes(input.studentId)) return [];
    if(input.teacherId && (session?.teacherId || cls?.teacherId)!==input.teacherId) return [];
    if(input.courseId && cls?.courseId!==input.courseId) return [];
    const before = meta.before || {}, after = meta.after || {};
    return [{id:a.id,sessionId:a.entityId,action:a.action,changedAt:a.createdAt.toISOString(),actor:a.actorName || a.actorEmail,
      studentName:session?.student?.name || before.studentName || (cls?.enrollments || []).map((e:any)=>e.student?.name).filter(Boolean).join(', ') || '-',
      courseName:cls?.course?.name || '-',teacherName:session?.teacher?.name || cls?.teacher?.name || before.teacherName || '-',
      beforeStart:before.startAt || session?.startAt?.toISOString?.() || null, beforeEnd:before.endAt || null,
      afterStart:after.startAt || null,afterEnd:after.endAt || null,reason:typeof meta.reason==='string'?meta.reason:'',
      retained:!!byId.get(a.entityId || '')}];
  });
  return {rows,limited:audits.length===1000};
}

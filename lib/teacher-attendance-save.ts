import { AttendanceStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getCancelledSessionStudentIds } from "./session-students";
import { attendanceLedgerImpact } from "./attendance-ledger-impact";

type Input = { sessionId: string; teacherId: string; actor: { email: string; name?: string | null; role: string }; action: "TEACHER_SAVE" | "MINIAPP_TEACHER_SAVE"; items: Array<{studentId?: unknown; status?: unknown; note?: unknown}> };
export class AttendanceSaveError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export async function saveTeacherAttendanceInTransaction(tx: Prisma.TransactionClient, input: Input) {
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${input.sessionId} FOR UPDATE`;
  const session = await tx.session.findUnique({where:{id:input.sessionId},include:{attendances:true,class:{include:{enrollments:true}}}});
  if(!session || !(session.teacherId===input.teacherId || (!session.teacherId && session.class.teacherId===input.teacherId))) throw new AttendanceSaveError("Session unavailable or no permission / 课程不存在或无权限",403);
  const cancelled = getCancelledSessionStudentIds(session);
  const students = session.class.capacity===1 && session.studentId ? session.class.enrollments.filter(e=>e.studentId===session.studentId) : session.class.enrollments;
  const expected = new Set(students.filter(e=>!cancelled.has(e.studentId)).map(e=>e.studentId));
  if(!input.items.length) throw new AttendanceSaveError("No attendance items / 没有点名记录");
  const seen = new Set<string>();
  const changes = [];
  for(const item of input.items) {
    if (!item || typeof item !== 'object') throw new AttendanceSaveError("Invalid attendance item / 点名记录格式无效",400);
    const studentId=String(item.studentId??''),status=String(item.status??'UNMARKED');
    if(!expected.has(studentId) || seen.has(studentId)) throw new AttendanceSaveError("Roster changed or duplicate student; reload before saving / 名单已变化或学生重复，请刷新后再保存");
    if(!(Object.values(AttendanceStatus) as string[]).includes(status)) throw new AttendanceSaveError("Invalid attendance status / 出勤状态无效",400);
    seen.add(studentId);
    const previous=session.attendances.find(a=>a.studentId===studentId);
    const note=String(item.note??'').trim()||null;
    await tx.attendance.upsert({where:{sessionId_studentId:{sessionId:session.id,studentId}},
      // Never copy a stale financial snapshot into a teacher's factual update.
      update:{status:status as AttendanceStatus,note},
      create:{sessionId:session.id,studentId,status:status as AttendanceStatus,note}});
    changes.push({studentId,beforeStatus:previous?.status??null,afterStatus:status,beforeNote:previous?.note??null,afterNote:note});
  }
  const rows=await tx.attendance.findMany({where:{sessionId:session.id},include:{package:{select:{type:true,note:true}}}});
  const transactions=await tx.packageTxn.findMany({where:{sessionId:session.id},select:{packageId:true,kind:true,deltaMinutes:true,note:true}});
  const impacts=changes.map(change=>({studentId:change.studentId,...attendanceLedgerImpact({studentId:change.studentId,exclusiveStudentId:session.class.capacity===1?session.studentId:null,rows,transactions})}));
  const reviewCount=impacts.filter(i=>i.needsReview).length;
  await tx.auditLog.create({data:{actorEmail:input.actor.email.trim().toLowerCase(),actorName:input.actor.name??null,actorRole:input.actor.role,module:'ATTENDANCE',action:input.action,entityType:'Session',entityId:session.id,
    meta:{submittedItemCount:input.items.length,expectedStudentCount:expected.size,changes,impacts,financialRecordsChanged:false}}});
  return {savedAt:new Date().toISOString(),reviewCount,financialRecordsChanged:false};
}
export async function saveTeacherAttendance(input:Input) {
  try { return await prisma.$transaction(tx=>saveTeacherAttendanceInTransaction(tx,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable}); }
  catch(error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2034') throw new AttendanceSaveError("Attendance changed concurrently; reload and retry / 其他人员同时更新了记录，请刷新后重试");
    throw error;
  }
}

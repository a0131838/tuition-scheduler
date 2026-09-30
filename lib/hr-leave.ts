import { HrLeaveStatus, HrLeaveType, Prisma } from "@prisma/client";
import { getApprovalRoleConfig } from "@/lib/approval-flow";
import {requireHrWriteActor} from "./hr-write-access";
import { prisma } from "@/lib/prisma";
import { isSessionFullyCancelled } from "@/lib/session-students";

const BALANCE_CONTROLLED_TYPES = new Set<HrLeaveType>([
  HrLeaveType.ANNUAL,
  HrLeaveType.SICK_OUTPATIENT,
  HrLeaveType.HOSPITALISATION,
  HrLeaveType.OFF_IN_LIEU,
]);

export function calculateWorkingLeaveMinutes(input: {
  startAt: Date;
  endAt: Date;
  portion?: "FULL_DAY" | "HALF_DAY" | "HOURLY";
  hourlyMinutes?: number;
  workPattern?: Prisma.JsonValue | null;
}) {
  if (!(input.startAt instanceof Date) || !(input.endAt instanceof Date) || !Number.isFinite(+input.startAt) || !Number.isFinite(+input.endAt) || input.endAt < input.startAt) {
    throw new Error("Invalid leave period / 请假时间无效");
  }
  const pattern = input.workPattern && typeof input.workPattern === "object" && !Array.isArray(input.workPattern)
    ? (input.workPattern as Record<string, unknown>)
    : {};
  const dailyMinutes = Math.max(60, Math.min(24 * 60, Number(pattern.dailyMinutes) || 480));
  const workDays = Array.isArray(pattern.workDays)
    ? new Set(pattern.workDays.map(Number).filter((value) => value >= 0 && value <= 6))
    : new Set([1, 2, 3, 4, 5]);
  if (input.portion === "HOURLY") return Math.max(1, Math.min(dailyMinutes, Math.round(input.hourlyMinutes || 0)));

  const cursor = new Date(input.startAt);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(input.endAt);
  last.setHours(0, 0, 0, 0);
  let workingDays = 0;
  while (cursor <= last) {
    if (workDays.has(cursor.getDay())) workingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!workingDays) throw new Error("Leave period contains no working day / 请假时段不包含工作日");
  return workingDays * (input.portion === "HALF_DAY" ? Math.round(dailyMinutes / 2) : dailyMinutes);
}

export async function getEmployeeLeaveBalances(employeeId: string, now = new Date(), db: Prisma.TransactionClient = prisma) {
  const rows = await db.hrLeaveLedgerEntry.groupBy({
    by: ["leaveType"],
    where: { employeeId, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    _sum: { minutes: true },
  });
  return new Map(rows.map((row) => [row.leaveType, row._sum.minutes ?? 0]));
}

async function resolveLeaveApprover(employeeId: string, db: Prisma.TransactionClient) {
  const employee = await db.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { userId: true, managerUserId: true },
  });
  if (!employee) throw new Error("Employee profile not found / 员工档案不存在");
  if (employee.managerUserId && employee.managerUserId !== employee.userId) return employee.managerUserId;

  const hrManager = await db.user.findFirst({
    where: {
      id: { not: employee.userId },
      role: "ADMIN",
      workspaceAccesses: { some: { workspace: "HR", isActive: true } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (hrManager) return hrManager.id;

  const config = await getApprovalRoleConfig(db);
  const fallback = await db.user.findFirst({
    where: { id: { not: employee.userId }, email: { in: config.managerApproverEmails, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function countEmployeeScheduleConflicts(employeeId: string, startAt: Date, endAt: Date, db: Prisma.TransactionClient = prisma) {
  const employee = await db.employeeProfile.findUnique({ where: { id: employeeId }, select: { teacherId: true } });
  if (!employee?.teacherId) return 0;
  const sessions = await db.session.findMany({
    where: {
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId: employee.teacherId }, { teacherId: null, class: { teacherId: employee.teacherId } }],
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      student: { select: { id: true } },
      class: {
        include: {
          oneOnOneStudent: { select: { id: true } },
          enrollments: { include: { student: { select: { id: true } } } },
        },
      },
    },
  });
  return sessions.filter((session) => !isSessionFullyCancelled(session)).length;
}

// Employee lock serializes separate requests spending the same leave balance.
async function lockedLeave(tx:Prisma.TransactionClient,id:string){
 const initial=await tx.hrLeaveRequest.findUnique({where:{id},select:{employeeId:true}});
 if(!initial)throw Error('Leave request not found / 请假申请不存在');
 await tx.$queryRaw`SELECT id FROM "EmployeeProfile" WHERE id=${initial.employeeId} FOR UPDATE`;
 await tx.$queryRaw`SELECT id FROM "HrLeaveRequest" WHERE id=${id} FOR UPDATE`;
 const row=await tx.hrLeaveRequest.findUnique({where:{id},include:{employee:{select:{userId:true}}}});
 if(!row||row.employeeId!==initial.employeeId)throw Error('Leave request changed / 请假申请已变化');
 return row;
}
async function leaveAudit(tx:Prisma.TransactionClient,actor:{email:string;name:string;role:string},action:string,id:string,before:unknown,after:unknown){
 await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'hr',action,entityType:'HrLeaveRequest',entityId:id,meta:JSON.parse(JSON.stringify({before,after}))}});
}
function leaveConflict(error:unknown):never{
 if(error instanceof Prisma.PrismaClientKnownRequestError&&(error.code==='P2034'||(error.code==='P2010'&&String(error.meta?.code)==='40001')))throw Error('Leave records changed; refresh and review before retrying / 请假记录已变化，请刷新核对后再试');
 throw error;
}

export async function submitLeaveRequest(input: {
  employeeId: string;
  leaveType: HrLeaveType;
  startAt: Date;
  endAt: Date;
  portion?: "FULL_DAY" | "HALF_DAY" | "HOURLY";
  hourlyMinutes?: number;
  reason?: string | null;
  attachment?: { privatePath: string; originalName: string; mimeType?: string | null } | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  return prisma.$transaction(async tx=>{
  const actor=await requireHrWriteActor(tx,input.actor.id);
  await tx.$queryRaw`SELECT id FROM "EmployeeProfile" WHERE id=${input.employeeId} FOR UPDATE`;
  const employee = await tx.employeeProfile.findUnique({ where: { id: input.employeeId } });
  if (!employee?.leaveEligible) throw new Error("Employee is not eligible for leave requests / 员工未启用请假");
  if(employee.userId!==actor.id)throw Error('Leave request does not belong to this employee / 仅可提交本人的请假');
  if(!Object.values(HrLeaveType).includes(input.leaveType))throw Error('Invalid leave type / 假期类型无效');
  const policy=await tx.hrLeavePolicy.findUnique({where:{legalEntityId_leaveType:{legalEntityId:employee.legalEntityId,leaveType:input.leaveType}}});
  if(policy?.requiresAttachment&&!input.attachment?.privatePath)throw Error('This leave type requires an attachment / 此假期类型需要证明附件');
  const durationMinutes = calculateWorkingLeaveMinutes({
    startAt: input.startAt,
    endAt: input.endAt,
    portion: input.portion,
    hourlyMinutes: input.hourlyMinutes,
    workPattern: employee.workPattern,
  });
  const overlap = await tx.hrLeaveRequest.findFirst({
    where: {
      employeeId: input.employeeId,
      status: { in: [HrLeaveStatus.SUBMITTED, HrLeaveStatus.APPROVED] },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: { id: true },
  });
  if (overlap) throw new Error("An active leave request already overlaps this period / 此时段已有未结束的请假申请");
  const approverUserId = await resolveLeaveApprover(input.employeeId,tx);
  const scheduleConflictCount = await countEmployeeScheduleConflicts(input.employeeId, input.startAt, input.endAt,tx);
  const row = await tx.hrLeaveRequest.create({
    data: {
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startAt: input.startAt,
      endAt: input.endAt,
      durationMinutes,
      reason: input.reason?.trim() || null,
      attachmentPrivatePath: input.attachment?.privatePath,
      attachmentOriginalName: input.attachment?.originalName,
      attachmentMimeType: input.attachment?.mimeType,
      status: HrLeaveStatus.SUBMITTED,
      approverUserId,
      submittedAt: new Date(),
      scheduleConflictCount,
    },
  });
  await leaveAudit(tx,actor,'LEAVE_SUBMITTED',row.id,null,row);
  return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000}).catch(leaveConflict);
}

export async function decideLeaveRequest(input: {
  requestId: string;
  decision: "APPROVE" | "REJECT";
  decisionNote?: string | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  return prisma.$transaction(async tx=>{
    const actor=await requireHrWriteActor(tx,input.actor.id,true);
    const request=await lockedLeave(tx,input.requestId);
    if(request.status!=='SUBMITTED')throw Error('Leave request is no longer pending / 此请假已不在待审批状态');
    if(request.employee.userId===actor.id)throw Error('Self-approval is not allowed / 不能审批本人的请假');
    if(request.approverUserId&&request.approverUserId!==actor.id&&actor.role!=='ADMIN')throw Error('This leave request is assigned to another approver / 此请假已分配给其他审批人');
    if(!['APPROVE','REJECT'].includes(input.decision))throw Error('Invalid leave decision / 审批操作无效');
    if(input.decision==='APPROVE'&&BALANCE_CONTROLLED_TYPES.has(request.leaveType)){
      const balances=await getEmployeeLeaveBalances(request.employeeId,new Date(),tx);
      if((balances.get(request.leaveType)??0)<request.durationMinutes)throw Error('Insufficient leave balance / 假期余额不足');
    }
    const row=await tx.hrLeaveRequest.update({where:{id:request.id},data:{status:input.decision==='APPROVE'?'APPROVED':'REJECTED',approverUserId:actor.id,decidedAt:new Date(),decisionNote:input.decisionNote?.trim()||null}});
    if(input.decision==='APPROVE'&&BALANCE_CONTROLLED_TYPES.has(request.leaveType))await tx.hrLeaveLedgerEntry.create({data:{employeeId:request.employeeId,leaveType:request.leaveType,entryType:'USED',minutes:-request.durationMinutes,leaveRequestId:request.id,source:'APPROVED_LEAVE',createdById:actor.id}});
    await leaveAudit(tx,actor,input.decision==='APPROVE'?'LEAVE_APPROVED':'LEAVE_REJECTED',row.id,request,row);
    return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000}).catch(leaveConflict);
}

export async function cancelLeaveRequest(input: {
  requestId: string;
  employeeUserId: string;
  reason?: string | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  return prisma.$transaction(async tx=>{
    const actor=await requireHrWriteActor(tx,input.actor.id);
    const request=await lockedLeave(tx,input.requestId);
    if(request.employee.userId!==actor.id&&actor.role!=='ADMIN')throw Error('Leave request does not belong to this employee / 仅本人或管理员可取消此请假');
    if(!['SUBMITTED','APPROVED'].includes(request.status))throw Error('Leave request cannot be cancelled / 此请假当前不能取消');
    const row=await tx.hrLeaveRequest.update({where:{id:request.id},data:{status:'CANCELLED',cancelledAt:new Date(),cancelReason:input.reason?.trim()||null}});
    if(request.status==='APPROVED'&&BALANCE_CONTROLLED_TYPES.has(request.leaveType)){
      const ledger=await tx.hrLeaveLedgerEntry.findMany({where:{employeeId:request.employeeId,leaveType:request.leaveType,leaveRequestId:request.id}});
      const used=ledger.filter(e=>e.entryType==='USED'),other=ledger.filter(e=>e.entryType!=='USED');
      if(used.length!==1||used[0].minutes!==-request.durationMinutes||other.length)throw Error('Leave ledger needs review before cancellation / 请假流水需核对后才能取消');
      await tx.hrLeaveLedgerEntry.create({data:{employeeId:request.employeeId,leaveType:request.leaveType,entryType:'RESTORED',minutes:request.durationMinutes,leaveRequestId:request.id,source:'CANCELLED_APPROVED_LEAVE',createdById:actor.id}});
    }
    await leaveAudit(tx,actor,'LEAVE_CANCELLED',row.id,request,row);
    return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000}).catch(leaveConflict);
}

export async function findApprovedTeacherLeaveConflict(teacherId: string, startAt: Date, endAt: Date) {
  return prisma.hrLeaveRequest.findFirst({
    where: {
      status: HrLeaveStatus.APPROVED,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      employee: { teacherId },
    },
    select: { id: true, leaveType: true, startAt: true, endAt: true },
  });
}

export function hrLeaveTypeLabel(type: HrLeaveType) {
  return {
    ANNUAL: "Annual leave / 年假",
    SICK_OUTPATIENT: "Outpatient sick leave / 门诊病假",
    HOSPITALISATION: "Hospitalisation leave / 住院病假",
    OFF_IN_LIEU: "Off in lieu / 调休",
    UNPAID: "Unpaid leave / 无薪假",
    OTHER: "Other leave / 其他假期",
  }[type];
}

import { HrLeaveType } from "@prisma/client";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { cancelLeaveRequest, getEmployeeLeaveBalances, hrLeaveTypeLabel, submitLeaveRequest } from "@/lib/hr-leave";
import { prisma } from "@/lib/prisma";

function dateOnly(value: Date) { return value.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); }

export async function GET(req: Request) {
  const access = await requireMiniappStaff(req); if (!access.ok) return access.response;
  const employee = await prisma.employeeProfile.findUnique({ where: { userId: access.user.id }, include: { legalEntity: true, manager: { select: { name: true } } } });
  if (!employee) return ok({ configured: false, message: "HR 员工档案尚未建立，请联系 HR。" });
  const [requests, balances, policies] = await Promise.all([
    prisma.hrLeaveRequest.findMany({ where: { employeeId: employee.id }, include: { approver: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    getEmployeeLeaveBalances(employee.id),
    prisma.hrLeavePolicy.findMany({ where: { legalEntityId: employee.legalEntityId, isActive: true } }),
  ]);
  return ok({ configured: true, employee: { name: access.user.name, legalEntity: employee.legalEntity.name, managerName: employee.manager?.name || "HR", leaveEligible: employee.leaveEligible }, leaveTypes: Object.values(HrLeaveType).map(type => ({ value: type, label: hrLeaveTypeLabel(type), balanceDays: Number(((balances.get(type) || 0) / 480).toFixed(1)), requiresAttachment: Boolean(policies.find(policy => policy.leaveType === type)?.requiresAttachment) })), requests: requests.map(row => ({ id: row.id, leaveType: row.leaveType, leaveTypeLabel: hrLeaveTypeLabel(row.leaveType), startDate: dateOnly(row.startAt), endDate: dateOnly(new Date(row.endAt.getTime() - 1)), durationDays: Number((row.durationMinutes / 480).toFixed(1)), status: row.status, approverName: row.approver?.name || "HR", scheduleConflictCount: row.scheduleConflictCount, decisionNote: row.decisionNote || "", cancellable: row.status === "SUBMITTED" || row.status === "APPROVED" })) });
}

export async function POST(req: Request) {
  const access = await requireMiniappStaff(req); if (!access.ok) return access.response;
  const employee = await prisma.employeeProfile.findUnique({ where: { userId: access.user.id } });
  if (!employee) return bad("HR 员工档案尚未建立，请联系 HR。", 409);
  const body = await req.json().catch(() => null);
  if (body?.action === "CANCEL") {
    try { await cancelLeaveRequest({ requestId: String(body.requestId || ""), employeeUserId: access.user.id, reason: String(body.reason || "员工在小程序取消"), actor: access.user }); return ok({ message: "假期申请已取消" }); }
    catch (error) { return bad(error instanceof Error ? error.message : "取消失败", 409); }
  }
  const leaveType = String(body?.leaveType || "ANNUAL") as HrLeaveType;
  const startAt = new Date(`${String(body?.startDate || "")}T00:00:00+08:00`);
  const endAt = new Date(`${String(body?.endDate || body?.startDate || "")}T23:59:59.999+08:00`);
  if (!Object.values(HrLeaveType).includes(leaveType) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return bad("请选择正确的假期类型和日期", 400);
  const policy = await prisma.hrLeavePolicy.findUnique({ where: { legalEntityId_leaveType: { legalEntityId: employee.legalEntityId, leaveType } } });
  if (policy?.requiresAttachment) return bad("此假期类型需要上传证明，请使用网页端 My HR 提交。", 409);
  try { await submitLeaveRequest({ employeeId: employee.id, leaveType, startAt, endAt, portion: body?.portion === "HALF_DAY" || body?.portion === "HOURLY" ? body.portion : "FULL_DAY", hourlyMinutes: Math.round(Number(body?.hours || 0) * 60), reason: String(body?.reason || ""), actor: access.user }); return ok({ message: "假期申请已提交审批" }); }
  catch (error) { return bad(error instanceof Error ? error.message : "提交失败", 409); }
}

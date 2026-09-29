import { Prisma, HrPayslipStatus } from "@prisma/client";
import { isStrictSuperAdmin, managerEmailsFromEnv } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function normalizeHrMonth(value: string) {
  const month = value.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid payroll month / 工资月份无效");
  return month;
}

export function hrPayrollMonthRange(monthValue: string) {
  const month = normalizeHrMonth(monthValue);
  const [year, monthNumber] = month.split("-").map(Number);
  return { month, start: new Date(year, monthNumber - 1, 1), end: new Date(year, monthNumber, 0, 23, 59, 59, 999) };
}

export function calculateHrPayslipTotals(input: {
  basicSalaryCents: number;
  allowanceCents: number;
  deductionCents: number;
  employeeCpfCents: number;
  employerCpfCents?: number;
  reimbursementCents: number;
}) {
  const basicSalaryCents = Math.max(0, Math.round(input.basicSalaryCents));
  const allowanceCents = Math.max(0, Math.round(input.allowanceCents));
  const deductionCents = Math.max(0, Math.round(input.deductionCents));
  const employeeCpfCents = Math.max(0, Math.round(input.employeeCpfCents));
  const reimbursementCents = Math.max(0, Math.round(input.reimbursementCents));
  const grossPayCents = basicSalaryCents + allowanceCents;
  const netPayCents = Math.max(0, grossPayCents - deductionCents - employeeCpfCents + reimbursementCents);
  return { basicSalaryCents, allowanceCents, deductionCents, employeeCpfCents, reimbursementCents, grossPayCents, netPayCents };
}

/** Match the existing HR/finance page policy using current, locked account facts. */
async function payrollActor(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR SHARE`;
  const actor = await tx.user.findUnique({where:{id}});
  if (!actor || actor.isObserver) throw new Error("Read-only or unavailable account / 账号仅可查看或已失效");
  await tx.$queryRaw`SELECT id FROM "ManagerAcl" WHERE "isActive"=true FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "UserWorkspaceAccess" WHERE "userId"=${id} AND workspace='HR' AND "isActive"=true FOR SHARE`;
  const [acl, workspace] = await Promise.all([
    tx.managerAcl.findMany({where:{isActive:true},select:{email:true}}),
    tx.userWorkspaceAccess.findFirst({where:{userId:id,workspace:'HR',isActive:true}}),
  ]);
  const managers = new Set([...managerEmailsFromEnv(), ...acl.map(row=>row.email.trim().toLowerCase())]);
  const hrManager = isStrictSuperAdmin(actor) || (['ADMIN','TEACHER'].includes(actor.role) &&
    (!!workspace || (managers.size ? managers.has(actor.email.toLowerCase()) : actor.role==='ADMIN')));
  const finance = actor.role==='FINANCE' || isStrictSuperAdmin(actor);
  if (!hrManager && !finance) throw new Error("Payroll permission no longer available / 当前无工资单操作权限");
  return {actor, hrManager, finance};
}
function payrollConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code==='P2034' || (error.code==='P2010' && String(error.meta?.code)==='40001')))
    throw new Error("Payslip changed; refresh and review before retrying / 工资单已变化，请刷新核对后再重试");
  throw error;
}
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function checkVersion(row: {updatedAt:Date}|null, expected: string|null|undefined) {
  if (expected===undefined || (row ? row.updatedAt.toISOString()!==expected : expected!==null))
    throw new Error("Payslip changed; refresh and review before saving / 工资单已变化，请刷新核对后再保存");
}

export async function saveDraftHrPayslip(input: {
  employeeId: string;
  month: string;
  expectedUpdatedAt: string | null;
  currencyCode?: string;
  basicSalaryCents: number;
  allowanceCents: number;
  deductionCents: number;
  employeeCpfCents: number;
  employerCpfCents: number;
  reimbursementCents: number;
  note?: string | null;
  preparedBy: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  const range = hrPayrollMonthRange(input.month);
  for (const value of [input.basicSalaryCents,input.allowanceCents,input.deductionCents,input.employeeCpfCents,input.employerCpfCents,input.reimbursementCents]) {
    if (!Number.isSafeInteger(value) || value<0 || value>2147483647) throw new Error("Invalid payroll amount / 工资金额无效");
  }
  const totals = calculateHrPayslipTotals(input);
  if (totals.grossPayCents>2147483647 || totals.netPayCents>2147483647) throw new Error("Payroll total is too large / 工资合计超出范围");
  return prisma.$transaction(async tx=>{
    const {actor} = await payrollActor(tx,input.preparedBy.id);
    await tx.$queryRaw`SELECT id FROM "EmployeeProfile" WHERE id=${input.employeeId} FOR UPDATE`;
    const employee = await tx.employeeProfile.findUnique({where:{id:input.employeeId}});
    if (!employee?.payrollEligible) throw new Error("Employee is not eligible for payroll / 员工未启用工资单");
    await tx.$queryRaw`SELECT id FROM "HrPayslip" WHERE "employeeId"=${input.employeeId} AND month=${range.month} FOR UPDATE`;
    const existing = await tx.hrPayslip.findUnique({where:{employeeId_month:{employeeId:input.employeeId,month:range.month}}});
    checkVersion(existing,input.expectedUpdatedAt);
    if (existing && existing.status!=='DRAFT') throw new Error("Only a draft payslip can be edited / 仅可编辑草稿工资单");
    const data = {currencyCode:input.currencyCode?.trim().toUpperCase()||'SGD',...totals,
      employerCpfCents:input.employerCpfCents,note:input.note?.trim()||null,preparedById:actor.id};
    const row = existing ? await tx.hrPayslip.update({where:{id:existing.id},data}) : await tx.hrPayslip.create({data:{
      ...data,employeeId:employee.id,legalEntityId:employee.legalEntityId,month:range.month,periodStart:range.start,periodEnd:range.end}});
    await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'hr',action:'PAYSLIP_DRAFT_SAVED',entityType:'HrPayslip',entityId:row.id,meta:{before:snapshot(existing),after:snapshot(row)}}});
    return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000}).catch(payrollConflict);
}

const TRANSITIONS: Record<HrPayslipStatus, HrPayslipStatus[]> = {
  DRAFT: [HrPayslipStatus.HR_VERIFIED, HrPayslipStatus.VOID],
  HR_VERIFIED: [HrPayslipStatus.FINANCE_CONFIRMED, HrPayslipStatus.DRAFT, HrPayslipStatus.VOID],
  FINANCE_CONFIRMED: [HrPayslipStatus.DIRECTOR_APPROVED, HrPayslipStatus.HR_VERIFIED, HrPayslipStatus.VOID],
  DIRECTOR_APPROVED: [HrPayslipStatus.PAID, HrPayslipStatus.FINANCE_CONFIRMED, HrPayslipStatus.VOID],
  PAID: [],
  VOID: [],
};

export async function transitionHrPayslip(input: {
  payslipId: string;
  expectedUpdatedAt: string;
  nextStatus: HrPayslipStatus;
  paymentReference?: string | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  return prisma.$transaction(async tx=>{
  const {actor,hrManager,finance} = await payrollActor(tx,input.actor.id);
  const permitted = ['HR_VERIFIED','DIRECTOR_APPROVED'].includes(input.nextStatus) ? hrManager :
    ['FINANCE_CONFIRMED','PAID'].includes(input.nextStatus) ? finance :
    ['DRAFT','VOID'].includes(input.nextStatus) && (hrManager || finance);
  if (!permitted) throw new Error("This approval step is not assigned to your role / 当前角色不能处理此审批步骤");
  await tx.$queryRaw`SELECT id FROM "HrPayslip" WHERE id=${input.payslipId} FOR UPDATE`;
  const row = await tx.hrPayslip.findUnique({ where: { id: input.payslipId } });
  if (!row) throw new Error("Payslip not found / 工资单不存在");
  checkVersion(row,input.expectedUpdatedAt);
  if (input.nextStatus==='PAID' && !input.paymentReference?.trim()) throw new Error("Payment reference is required / 请填写付款编号");
  if (!TRANSITIONS[row.status].includes(input.nextStatus)) throw new Error(`Invalid payslip transition / 工资单状态流转无效: ${row.status} -> ${input.nextStatus}`);
  const now = new Date();
  const roleFields =
    input.nextStatus === HrPayslipStatus.HR_VERIFIED
      ? { hrVerifiedById: actor.id, hrVerifiedAt: now }
      : input.nextStatus === HrPayslipStatus.FINANCE_CONFIRMED
        ? { financeConfirmedById: actor.id, financeConfirmedAt: now }
        : input.nextStatus === HrPayslipStatus.DIRECTOR_APPROVED
          ? { directorApprovedById: actor.id, directorApprovedAt: now }
          : input.nextStatus === HrPayslipStatus.PAID
            ? { paidById: actor.id, paidAt: now, paymentReference: input.paymentReference?.trim() || null }
            : {};
  const after = await tx.hrPayslip.update({where:{id:row.id},data:{status:input.nextStatus,...roleFields}});
  await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,module:'hr',action:`PAYSLIP_${input.nextStatus}`,entityType:'HrPayslip',entityId:row.id,meta:{before:snapshot(row),after:snapshot(after)}}});
  return after;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000}).catch(payrollConflict);
}

export function formatHrMoney(cents: number, currency = "SGD") {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

import { HrLeaveType, StaffWorkspace } from "@prisma/client";
import { ensureEmployeeChecklist } from "@/lib/hr-checklist";
import { prisma } from "@/lib/prisma";

type SeedEmployee = { key: string; email?: string; nameContains: string; startDate: string; jobTitle: string; department: string; managerKey: "JASMINE" | "OWNER" };

const PEOPLE: SeedEmployee[] = [
  { key: "JESSIKA", email: "sym.sweyeemon@gmail.com", nameContains: "Jessika", startDate: "2026-08-10", jobTitle: "Teacher & Academic Operations", department: "Academic", managerKey: "JASMINE" },
  { key: "JASMINE", nameContains: "Jasmine", startDate: "2026-06-01", jobTitle: "Director", department: "Management", managerKey: "OWNER" },
  { key: "SHARILYN", email: "sharilynang@123.com", nameContains: "Sharilyn", startDate: "2026-06-01", jobTitle: "Finance", department: "Finance", managerKey: "JASMINE" },
];

async function findUser(person: SeedEmployee) {
  if (person.email) {
    const exact = await prisma.user.findFirst({ where: { email: { equals: person.email, mode: "insensitive" } } });
    if (exact) return exact;
  }
  return prisma.user.findFirst({ where: { name: { contains: person.nameContains, mode: "insensitive" } }, orderBy: { createdAt: "asc" } });
}

async function main() {
  const owner = await prisma.user.findFirst({ where: { email: { equals: "zhaohongwei0880@gmail.com", mode: "insensitive" } } });
  if (!owner) throw new Error("Owner account not found; HR bootstrap stopped");
  const resolved = new Map<string, Awaited<ReturnType<typeof findUser>>>();
  for (const person of PEOPLE) resolved.set(person.key, await findUser(person));
  const jasmine = resolved.get("JASMINE");
  if (!jasmine) throw new Error("Jasmine account not found; HR bootstrap stopped before assigning approvers");

  const entity = await prisma.hrLegalEntity.upsert({ where: { name: "GT Educational Institute Pte. Ltd." }, create: { name: "GT Educational Institute Pte. Ltd.", registrationNumber: "202303312G", countryCode: "SG" }, update: { registrationNumber: "202303312G", isActive: true } });
  await prisma.userWorkspaceAccess.upsert({ where: { userId_workspace: { userId: jasmine.id, workspace: StaffWorkspace.HR } }, create: { userId: jasmine.id, workspace: StaffWorkspace.HR, isActive: true, isDefault: false, note: "HR approver and director" }, update: { isActive: true, note: "HR approver and director" } });

  for (const leaveType of Object.values(HrLeaveType)) {
    await prisma.hrLeavePolicy.upsert({ where: { legalEntityId_leaveType: { legalEntityId: entity.id, leaveType } }, create: { legalEntityId: entity.id, leaveType, annualEntitlementMinutes: 0, requiresAttachment: leaveType === HrLeaveType.SICK_OUTPATIENT || leaveType === HrLeaveType.HOSPITALISATION, allowHalfDay: true, allowHourly: leaveType === HrLeaveType.OFF_IN_LIEU, note: "Entitlement must be confirmed against signed employment terms before balance grant." }, update: {} });
  }

  for (const person of PEOPLE) {
    const user = resolved.get(person.key);
    if (!user) { console.warn(`[hr-bootstrap] Account not found for ${person.key}; skipped`); continue; }
    const managerUserId = person.managerKey === "JASMINE" ? jasmine.id : owner.id;
    const employee = await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, teacherId: user.teacherId, legalEntityId: entity.id, employmentType: "FULL_TIME", employmentStatus: "ACTIVE", department: person.department, jobTitle: person.jobTitle, managerUserId, startDate: new Date(`${person.startDate}T00:00:00+08:00`), workPattern: { workDays: [1,2,3,4,5], dailyMinutes: 480 }, payrollEligible: true, leaveEligible: true, createdByUserId: owner.id, updatedByUserId: owner.id },
      update: { teacherId: user.teacherId, legalEntityId: entity.id, employmentType: "FULL_TIME", employmentStatus: "ACTIVE", department: person.department, jobTitle: person.jobTitle, managerUserId, startDate: new Date(`${person.startDate}T00:00:00+08:00`), payrollEligible: true, leaveEligible: true, updatedByUserId: owner.id },
    });
    await ensureEmployeeChecklist(employee.id, jasmine.id);
    console.log(`[hr-bootstrap] ${user.name}: ${employee.id}`);
  }
  console.log("[hr-bootstrap] complete; configure contractual leave entitlements in /admin/hr before granting balances");
}

main().finally(() => prisma.$disconnect());

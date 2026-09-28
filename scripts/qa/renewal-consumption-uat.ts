import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { getRenewalForecasts, syncRenewalTasks } from "../../lib/renewal-management";
import { createStaffMiniappSession } from "../../lib/miniapp-staff";
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.hostname,"127.0.0.1"); assert.equal(url.port,"55439"); assert.equal(url.pathname,"/sgt_workspace_completion_test");
  const now = new Date(); const ago = (days: number) => new Date(now.getTime()-days*86400000);
  const student = await prisma.student.create({data:{name:`Consumption UAT ${Date.now()}`}});
  const course = await prisma.course.create({data:{name:`Consumption UAT ${Date.now()}`}});
  const teacher = await prisma.teacher.create({data:{name:"Consumption UAT teacher"}});
  const campus = await prisma.campus.create({data:{name:`Consumption UAT ${Date.now()}`}});
  const cls = await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1}});
  const session = (days: number) => prisma.session.create({data:{classId:cls.id,studentId:student.id,startAt:ago(days),endAt:new Date(ago(days).getTime()+3600000)}});
  const recent = await session(10), old = await session(40), other = await session(8);
  const pkg = await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:"HOURS",validFrom:ago(100),totalMinutes:6000,remainingMinutes:6000}});
  const txn = (sessionId: string|null,kind: string,deltaMinutes: number,days=1) => prisma.packageTxn.create({data:{packageId:pkg.id,sessionId,kind,deltaMinutes,createdAt:ago(days)}});
  await txn(old.id,"DEDUCT",-60,40); await txn(old.id,"ROLLBACK",60);
  await txn(recent.id,"DEDUCT",-120,10); await txn(recent.id,"ROLLBACK",60);
  await txn(other.id,"DEDUCT",-120,8); await txn(null,"ADJUST",-3000);
  const snapshot = async () => (await getRenewalForecasts(now,true)).find(p=>p.packageId===pkg.id)!;
  assert.equal((await snapshot()).recentWeeklyMinutes,45); assert.equal((await snapshot()).riskLevel,"RESOLVED");
  const task = await prisma.renewalTask.create({data:{studentId:student.id,packageId:pkg.id,status:"PENDING_CONTACT",riskLevel:"YELLOW",remainingMinutes:90,nextFollowUpAt:ago(10000)}});
  await txn("deleted-source-lesson","DEDUCT",-60);
  const beforePkg = await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}});
  const beforeLedger = await prisma.packageTxn.findMany({where:{packageId:pkg.id},orderBy:{id:"asc"}});
  assert.equal((await snapshot()).riskLevel,"REVIEW"); assert.equal((await snapshot()).expectedDepletionAt,null);
  await syncRenewalTasks();
  const pending = await prisma.renewalTask.findUniqueOrThrow({where:{id:task.id}});
  assert.equal(pending.completedAt,null); assert.equal(pending.riskLevel,"REVIEW"); assert.equal(pending.status,"PENDING_CONTACT");
  assert.equal(pending.paymentConfirmedAt,null); assert.equal(pending.activatedPackageId,null);
  assert.match(pending.parentMessage!,/需先核对/);
  assert.deepEqual(await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}}),beforePkg);
  assert.deepEqual(await prisma.packageTxn.findMany({where:{packageId:pkg.id},orderBy:{id:"asc"}}),beforeLedger);
  if(process.env.UAT_HTTP === "1") {
    const actor = await prisma.user.findUniqueOrThrow({where:{email:"zhaohongwei0880@gmail.com"}});
    const auth = await createStaffMiniappSession(actor.id);
    const response = await fetch("http://127.0.0.1:3149/api/miniapp/staff/renewals?limit=500",{headers:{Authorization:`Bearer ${auth.token}`}});
    assert.equal(response.status,200);const body=await response.json();const row=body.tasks.find((r:{id:string})=>r.id===task.id);
    assert.equal(row.canonicalRiskLevel,"REVIEW");assert.match(row.riskLevel,/消耗待核对/);assert.equal(row.expectedDepletionAt,null);
  }
  if(process.env.UAT_KEEP_REVIEW !== "1") {
    await txn("deleted-source-lesson","ROLLBACK",60);
    await syncRenewalTasks();
    const resolved = await prisma.renewalTask.findUniqueOrThrow({where:{id:task.id}});
    assert.equal(resolved.status,"RISK_RESOLVED");assert.equal(resolved.paymentConfirmedAt,null);assert.equal(resolved.activatedPackageId,null);
    // An old completion's snooze cannot hide newly discovered uncertain consumption.
    await prisma.renewalTask.update({where:{id:task.id},data:{status:"PACKAGE_ACTIVE",snoozedUntil:new Date(now.getTime()+86400000)}});
    await txn("another-deleted-lesson","DEDUCT",-60); await syncRenewalTasks();
    const reopened = await prisma.renewalTask.findFirstOrThrow({where:{packageId:pkg.id,completedAt:null}});
    assert.notEqual(reopened.id,task.id);assert.equal(reopened.riskLevel,"REVIEW");
    assert.equal((await prisma.renewalTask.findUniqueOrThrow({where:{id:task.id}})).status,"PACKAGE_ACTIVE");
  }
  console.log(JSON.stringify({passed:true,taskId:task.id,packageId:pkg.id,netWeeklyUnits:45,unresolvedLedgerPreventsAutoClosure:true,noBusinessWritesByScan:true}));
}
main().finally(()=>prisma.$disconnect());

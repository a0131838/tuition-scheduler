import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { getRenewalForecasts, syncRenewalTasks, listRenewalTasks, renewalTaskDto } from "../../lib/renewal-management";
import { createStaffMiniappSession } from "../../lib/miniapp-staff";
async function main() {
 const url=new URL(process.env.DATABASE_URL||"");assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"55439");assert.equal(url.pathname,"/sgt_workspace_completion_test");
 const now=new Date(), day=(n:number)=>new Date(now.getTime()+n*86400000);
 const a=await prisma.student.create({data:{name:`Count forecast UAT ${Date.now()}`}}), b=await prisma.student.create({data:{name:"Shared count UAT"}});
 const course=await prisma.course.create({data:{name:`Count forecast ${Date.now()}`}}),teacher=await prisma.teacher.create({data:{name:"Forecast teacher UAT"}}),campus=await prisma.campus.create({data:{name:`Forecast campus ${Date.now()}`}});
 const cls=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:5,enrollments:{create:[{studentId:a.id},{studentId:b.id}]}}});
 const pkg=await prisma.coursePackage.create({data:{studentId:a.id,courseId:course.id,type:"HOURS",note:"[GROUP_PACK]",totalMinutes:10,remainingMinutes:10,validFrom:day(-60),sharedStudents:{create:{studentId:b.id}}}});
 const makeSession=(n:number)=>prisma.session.create({data:{classId:cls.id,startAt:day(n),endAt:new Date(day(n).getTime()+5400000)}});
 const past=await makeSession(-7),future=await makeSession(1);
 await prisma.packageTxn.create({data:{packageId:pkg.id,sessionId:past.id,kind:"DEDUCT",deltaMinutes:-1,createdAt:day(-7)}});
 const snapshot=async(id=pkg.id)=>(await getRenewalForecasts(now,true)).find(p=>p.packageId===id)!;
 let f=await snapshot();assert.equal(f.scheduledMinutes,2);assert.equal(f.lessonsRemaining,10);assert.equal(f.forecastSnapshot.weeklyUnits,.25);assert.equal(f.forecastSnapshot.unit,"COUNT");assert.match(f.parentMessage,/剩余 10 次/);assert.doesNotMatch(f.parentMessage,/0.2 小时/);
 await prisma.attendance.create({data:{sessionId:future.id,studentId:a.id,status:"EXCUSED",excusedCharge:false}});
 assert.equal((await snapshot()).scheduledMinutes,1);
 await prisma.attendance.update({where:{sessionId_studentId:{sessionId:future.id,studentId:a.id}},data:{excusedCharge:true}});
 assert.equal((await snapshot()).scheduledMinutes,2);
 await prisma.attendance.update({where:{sessionId_studentId:{sessionId:future.id,studentId:a.id}},data:{packageId:pkg.id,deductedCount:1}});
 assert.equal((await snapshot()).riskLevel,"REVIEW"); // metadata alone cannot prove the existing debit
 await prisma.packageTxn.create({data:{packageId:pkg.id,sessionId:future.id,kind:"DEDUCT",deltaMinutes:-1,createdAt:now}});
 f=await snapshot();assert.equal(f.scheduledMinutes,1);assert.notEqual(f.riskLevel,"REVIEW");
 await prisma.attendance.create({data:{sessionId:future.id,studentId:b.id,status:"PRESENT",waiveDeduction:true}});
 assert.equal((await snapshot()).scheduledMinutes,0);
 const second=await prisma.coursePackage.create({data:{studentId:a.id,courseId:course.id,type:"HOURS",note:"[GROUP_PACK]",remainingMinutes:10,validFrom:day(-60)}});
 const next=await makeSession(2);
 assert.equal((await snapshot()).riskLevel,"REVIEW");assert.equal((await snapshot(second.id)).riskLevel,"REVIEW");
 await prisma.attendance.create({data:{sessionId:next.id,studentId:a.id,status:"UNMARKED",packageId:pkg.id}});
 f=await snapshot();assert.notEqual(f.riskLevel,"REVIEW");assert.equal(f.scheduledMinutes,2);
 // Monthly packages are expiry-based even if their legacy minute field happens to be zero.
 const monthlyStudent=await prisma.student.create({data:{name:"Monthly forecast UAT"}});
 const monthly=await prisma.coursePackage.create({data:{studentId:monthlyStudent.id,courseId:course.id,type:"MONTHLY",remainingMinutes:0,validFrom:day(-60),validTo:day(60)}});
 let m=await snapshot(monthly.id);assert.equal(m.riskLevel,"RESOLVED");assert.equal(m.lessonsRemaining,null);assert.equal(m.expectedDepletionAt,null);assert.equal(m.forecastSnapshot.remainingUnits,null);assert.equal(m.forecastSnapshot.unit,"PERIOD");
 await prisma.coursePackage.update({where:{id:monthly.id},data:{validTo:day(4)}});assert.equal((await snapshot(monthly.id)).riskLevel,"RED");
 await prisma.coursePackage.update({where:{id:monthly.id},data:{validTo:null}});assert.equal((await snapshot(monthly.id)).riskLevel,"RESOLVED");
 const task=await prisma.renewalTask.create({data:{studentId:a.id,packageId:pkg.id,status:"PAYMENT_PENDING",riskLevel:"YELLOW",remainingMinutes:10,nextFollowUpAt:day(-12000)}});
 const before=await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}}),txns=await prisma.packageTxn.findMany({where:{packageId:pkg.id},orderBy:{id:"asc"}});
 await syncRenewalTasks();
 const dto=renewalTaskDto((await listRenewalTasks()).find(t=>t.id===task.id)!);assert.equal(dto.forecastSnapshot?.unit,"COUNT");assert.equal(dto.forecastSnapshot?.weeklyUnits,.25);
 assert.deepEqual(await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}}),before);assert.deepEqual(await prisma.packageTxn.findMany({where:{packageId:pkg.id},orderBy:{id:"asc"}}),txns);
 if(process.env.UAT_HTTP === "1") {
  const actor=await prisma.user.findUniqueOrThrow({where:{email:"zhaohongwei0880@gmail.com"}});
  const auth=await createStaffMiniappSession(actor.id);
  const response=await fetch("http://127.0.0.1:3149/api/miniapp/staff/renewals?limit=500",{headers:{Authorization:`Bearer ${auth.token}`}});
  assert.equal(response.status,200);const body=await response.json();const row=body.tasks.find((r:{id:string})=>r.id===task.id);
  assert.equal(row.status,"PAYMENT_PENDING");assert.equal(row.forecastSnapshot.unit,"COUNT");assert.equal(row.forecastSnapshot.weeklyUnits,.25);assert.match(row.riskLevel,/小时栏不适用/);
 }
 console.log(JSON.stringify({passed:true,taskId:task.id,packageId:pkg.id,unit:"COUNT",remaining:10,scheduled:2,weekly:.25,noBusinessWritesByScan:true}));
}
main().finally(()=>prisma.$disconnect());

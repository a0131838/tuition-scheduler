import assert from 'node:assert/strict';
import {prisma} from '../../lib/prisma';
import {saveAdminAttendance,saveAdminAttendanceInTransaction} from '../../lib/admin-attendance-deduction';
async function main(){
 const url=new URL(process.env.DATABASE_URL||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/sgt_workspace_completion_test');
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 async function fixture(mode='HOURS_MINUTES',balance=180,students=1){
  const roster=await Promise.all(Array.from({length:students},(_,i)=>prisma.student.create({data:{name:`Admin attendance UAT ${Date.now()} ${i}`}})));
  const teacher=await prisma.teacher.create({data:{name:'Admin attendance teacher'}}),course=await prisma.course.create({data:{name:'Admin attendance course'}}),campus=await prisma.campus.create({data:{name:'Admin attendance campus'}});
  const cls=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:mode==='HOURS_MINUTES'?1:5,enrollments:{create:roster.map(s=>({studentId:s.id}))}}});
  const pkg=await prisma.coursePackage.create({data:{studentId:roster[0].id,courseId:course.id,type:mode==='MONTHLY'?'MONTHLY':'HOURS',note:mode==='GROUP_COUNT'?'[GROUP_PACK]':mode==='GROUP_MINUTES'?'[GROUP_PACK_MINUTES]':null,totalMinutes:balance,remainingMinutes:balance,validFrom:new Date('2026-01-01'),sharedStudents:{create:roster.slice(1).map(s=>({studentId:s.id}))}}});
  const session=await prisma.session.create({data:{classId:cls.id,studentId:mode==='HOURS_MINUTES'?roster[0].id:null,startAt:new Date('2026-09-20T02:00Z'),endAt:new Date('2026-09-20T03:00Z')}});
  return{roster,pkg,session};
 }
 const f=await fixture();const studentId=f.roster[0].id;
 const input={actor,sessionId:f.session.id,items:[{studentId,status:'PRESENT',deductedMinutes:60,packageId:f.pkg.id}]};
 await saveAdminAttendance(input);await saveAdminAttendance(input);
 assert.equal(await prisma.packageTxn.count({where:{sessionId:f.session.id}}),1);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:f.pkg.id}})).remainingMinutes,120);
 // Restored lesson with a correct stored debit must not be charged again when facts are corrected.
 await prisma.attendance.update({where:{sessionId_studentId:{sessionId:f.session.id,studentId}},data:{status:'UNMARKED'}});
 await saveAdminAttendance(input);assert.equal(await prisma.packageTxn.count({where:{sessionId:f.session.id}}),1);
 const cancel={...input,items:[{studentId,status:'EXCUSED',excusedCharge:false}]};
 const parallel=await Promise.allSettled([saveAdminAttendance(cancel),saveAdminAttendance(cancel)]);assert.ok(parallel.some(r=>r.status==='fulfilled'));await saveAdminAttendance(cancel);
 assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:f.pkg.id}})).remainingMinutes,180);assert.equal(await prisma.packageTxn.count({where:{sessionId:f.session.id,kind:'ROLLBACK'}}),1);
 // Stored wrong metadata or debit on another package cannot be offset into a false pass.
 await prisma.packageTxn.create({data:{packageId:f.pkg.id,sessionId:f.session.id,kind:'DEDUCT',deltaMinutes:-20,note:`studentId=${studentId}`}});
 const before=await prisma.attendance.findMany({where:{sessionId:f.session.id}}),balance=await prisma.coursePackage.findUniqueOrThrow({where:{id:f.pkg.id}}),count=await prisma.packageTxn.count({where:{sessionId:f.session.id}});
 await assert.rejects(saveAdminAttendance(input),/先核对/);
 assert.deepEqual(await prisma.attendance.findMany({where:{sessionId:f.session.id}}),before);assert.deepEqual(await prisma.coursePackage.findUniqueOrThrow({where:{id:f.pkg.id}}),balance);assert.equal(await prisma.packageTxn.count({where:{sessionId:f.session.id}}),count);
 const group=await fixture('GROUP_COUNT',5,2);
 await saveAdminAttendance({actor,sessionId:group.session.id,markAll:{waiveDeduction:false,waiveReason:null}});
 assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:group.pkg.id}})).remainingMinutes,3);
 await saveAdminAttendance({actor,sessionId:group.session.id,markAll:{waiveDeduction:false,waiveReason:null}});assert.equal(await prisma.packageTxn.count({where:{sessionId:group.session.id}}),2);
 const gm=await fixture('GROUP_MINUTES',180,2);
 await saveAdminAttendance({actor,sessionId:gm.session.id,markAll:{waiveDeduction:false,waiveReason:null}});assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:gm.pkg.id}})).remainingMinutes,60);
 const waived=await fixture();await saveAdminAttendance({actor,sessionId:waived.session.id,markAll:{waiveDeduction:true,waiveReason:'Free teaching UAT'}});assert.equal(await prisma.packageTxn.count({where:{sessionId:waived.session.id}}),0);
 const atomic=await fixture();const atomicInput={actor,sessionId:atomic.session.id,markAll:{waiveDeduction:false,waiveReason:null}};
 await assert.rejects(prisma.$transaction(async tx=>{await saveAdminAttendanceInTransaction(tx,atomicInput);throw new Error('forced isolated rollback');}),/forced isolated rollback/);
 assert.equal(await prisma.attendance.count({where:{sessionId:atomic.session.id}}),0);assert.equal(await prisma.packageTxn.count({where:{sessionId:atomic.session.id}}),0);assert.equal(await prisma.auditLog.count({where:{entityId:atomic.session.id}}),0);
 // Distinct lessons competing for one shared balance cannot overspend it.
 const scarce=await fixture('HOURS_MINUTES',60);
 const another=await prisma.session.create({data:{classId:scarce.session.classId,studentId:scarce.roster[0].id,startAt:new Date('2026-09-21T02:00Z'),endAt:new Date('2026-09-21T03:00Z')}});
 const race=await Promise.allSettled([scarce.session.id,another.id].map(sessionId=>saveAdminAttendance({actor,sessionId,markAll:{waiveDeduction:false,waiveReason:null}})));
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:scarce.pkg.id}})).remainingMinutes,0);
 const uncertain=await fixture('GROUP_COUNT',5,2);await prisma.packageTxn.create({data:{packageId:uncertain.pkg.id,sessionId:uncertain.session.id,kind:'DEDUCT',deltaMinutes:-1}});
 await assert.rejects(saveAdminAttendance({actor,sessionId:uncertain.session.id,markAll:{waiveDeduction:false,waiveReason:null}}),/先核对/);assert.equal(await prisma.attendance.count({where:{sessionId:uncertain.session.id}}),0);
 // Monthly entitlements must never enter the minute/count debit path.
 const monthly=await fixture('MONTHLY');
 await assert.rejects(saveAdminAttendance({actor,sessionId:monthly.session.id,items:[{studentId:monthly.roster[0].id,status:'PRESENT',packageId:monthly.pkg.id,deductedMinutes:60}]}),/not HOURS/);
 assert.equal(await prisma.packageTxn.count({where:{packageId:monthly.pkg.id}}),0);
 // Moving a debit to another exact package restores A and deducts B once.
 const moved=await fixture();const moveStudent=moved.roster[0].id;
 const otherPackage=await prisma.coursePackage.create({data:{studentId:moveStudent,courseId:moved.pkg.courseId,type:'HOURS',remainingMinutes:180,totalMinutes:180,validFrom:new Date('2026-01-01')}});
 await saveAdminAttendance({actor,sessionId:moved.session.id,items:[{studentId:moveStudent,status:'PRESENT',packageId:moved.pkg.id,deductedMinutes:60}]});
 await saveAdminAttendance({actor,sessionId:moved.session.id,items:[{studentId:moveStudent,status:'PRESENT',packageId:otherPackage.id,deductedMinutes:60}]});
 assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:moved.pkg.id}})).remainingMinutes,180);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:otherPackage.id}})).remainingMinutes,120);
 // The established fourth-leave charging rule remains unchanged.
 const charged=await fixture();
 for(let i=1;i<=3;i++){const past=await prisma.session.create({data:{classId:charged.session.classId,studentId:charged.roster[0].id,startAt:new Date(`2026-09-0${i}T02:00Z`),endAt:new Date(`2026-09-0${i}T03:00Z`)}});await prisma.attendance.create({data:{sessionId:past.id,studentId:charged.roster[0].id,status:'EXCUSED'}});}
 await saveAdminAttendance({actor,sessionId:charged.session.id,items:[{studentId:charged.roster[0].id,status:'EXCUSED',excusedCharge:true,deductedMinutes:60,packageId:charged.pkg.id}]});assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:charged.pkg.id}})).remainingMinutes,120);
 if(process.env.UAT_HTTP==='1'){
  const login=await fetch('http://127.0.0.1:3149/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:actor.email,password:'LocalUAT-Cancellation-20260928',portal:'admin'})});assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),headers={Cookie:cookie,'Content-Type':'application/json'};
  const marked=await fetch(`http://127.0.0.1:3149/api/admin/sessions/${atomic.session.id}/attendance/mark-all-present`,{method:'POST',headers,body:'{}'});assert.equal(marked.status,200);
  const excused=await fetch(`http://127.0.0.1:3149/api/admin/sessions/${atomic.session.id}/attendance`,{method:'POST',headers,body:JSON.stringify({items:[{studentId:atomic.roster[0].id,status:'EXCUSED'}]})});assert.equal(excused.status,200);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:atomic.pkg.id}})).remainingMinutes,180);
 }
 console.log(JSON.stringify({passed:true,exactPackageLedger:true,restoredAttendanceNoRededuction:true,concurrentRefundOnce:true,sharedCountAndMinutes:true,noOverspend:true,atomicAudit:true}));
}
main().finally(()=>prisma.$disconnect());

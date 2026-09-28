import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {saveTeacherAttendance,saveTeacherAttendanceInTransaction} from '../../lib/teacher-attendance-save';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 const url=new URL(process.env.DATABASE_URL||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/sgt_workspace_completion_test');
 const student=await prisma.student.create({data:{name:`Attendance fact UAT ${Date.now()}`}});
 const teacher=await prisma.teacher.create({data:{name:'Attendance UAT teacher'}}), course=await prisma.course.create({data:{name:'Attendance UAT course'}}),campus=await prisma.campus.create({data:{name:'Attendance UAT campus'}});
 const cls=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,enrollments:{create:{studentId:student.id}}}});
 const session=await prisma.session.create({data:{classId:cls.id,studentId:student.id,startAt:new Date('2026-09-20T02:00Z'),endAt:new Date('2026-09-20T03:00Z')}});
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',totalMinutes:600,remainingMinutes:540,validFrom:new Date('2026-01-01')}});
 const row=await prisma.attendance.create({data:{sessionId:session.id,studentId:student.id,status:'PRESENT',packageId:pkg.id,deductedMinutes:60}});
 await prisma.packageTxn.create({data:{packageId:pkg.id,sessionId:session.id,kind:'DEDUCT',deltaMinutes:-60,note:`studentId=${student.id}`}});
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 const input={sessionId:session.id,teacherId:teacher.id,actor,action:'TEACHER_SAVE' as const,items:[{studentId:student.id,status:'LATE',note:'Actual attendance'}]};
 const ledgerBefore=await prisma.packageTxn.findMany({where:{sessionId:session.id}}),pkgBefore=await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}});
 assert.equal((await saveTeacherAttendance(input)).reviewCount,0);
 let after=await prisma.attendance.findUniqueOrThrow({where:{id:row.id}});assert.equal(after.status,'LATE');assert.equal(after.deductedMinutes,60);assert.equal(after.packageId,pkg.id);
 const auditsBefore=await prisma.auditLog.count({where:{entityId:session.id}});
 await assert.rejects(saveTeacherAttendance({...input,teacherId:'another-teacher'}),/无权限/);
 await assert.rejects(saveTeacherAttendance({...input,items:[...input.items,{studentId:'foreign',status:'PRESENT'}]}),/名单/);
 await assert.rejects(saveTeacherAttendance({...input,items:[...input.items,...input.items]}),/重复/);
 await assert.rejects(saveTeacherAttendance({...input,items:[{studentId:student.id,status:'INVALID'}]}),/状态/);
 assert.equal(await prisma.auditLog.count({where:{entityId:session.id}}),auditsBefore);
 // An outer transactional failure must undo both attendance and its audit.
 await assert.rejects(prisma.$transaction(async tx=>{await saveTeacherAttendanceInTransaction(tx,{...input,items:[{studentId:student.id,status:'ABSENT'}]});throw new Error('forced isolated failure');}),/forced isolated failure/);
 assert.deepEqual(await prisma.attendance.findUniqueOrThrow({where:{id:row.id}}),after);
 assert.equal(await prisma.auditLog.count({where:{entityId:session.id}}),auditsBefore);
 const parallel=await Promise.allSettled([saveTeacherAttendance(input),saveTeacherAttendance(input)]);assert.ok(parallel.some(r=>r.status==='fulfilled'));
 // Simulate academic staff changing the financial metadata while the teacher saves facts.
 await Promise.allSettled([saveTeacherAttendance(input),prisma.attendance.update({where:{id:row.id},data:{deductedMinutes:45}})]);
 assert.equal((await prisma.attendance.findUniqueOrThrow({where:{id:row.id}})).deductedMinutes,45);
 assert.equal((await saveTeacherAttendance(input)).reviewCount,1);
 await prisma.attendance.update({where:{id:row.id},data:{deductedMinutes:60}});
 if(process.env.UAT_HTTP==='1'){
  const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.pbkdf2Sync('LocalUAT-Attendance-20260928',salt,100000,32,'sha256').toString('hex');
  const user=await prisma.user.create({data:{email:`attendance-uat-${Date.now()}@example.invalid`,name:'Attendance UAT teacher',role:'TEACHER',teacherId:teacher.id,passwordHash:hash,passwordSalt:salt}});
  const auth=await createStaffMiniappSession(user.id);
  const response=await fetch(`http://127.0.0.1:3149/api/miniapp/staff/schedule/${session.id}/attendance`,{method:'POST',headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:JSON.stringify({items:[{studentId:student.id,status:'EXCUSED',note:'Leave; academic review needed',deductedMinutes:0,packageId:null}]})});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.reviewCount,1);assert.equal(body.financialRecordsChanged,false);
  const browserSession=await prisma.session.create({data:{classId:cls.id,studentId:student.id,startAt:new Date('2026-09-21T02:00Z'),endAt:new Date('2026-09-21T03:00Z')}});
  await prisma.attendance.create({data:{sessionId:browserSession.id,studentId:student.id,status:'UNMARKED',packageId:pkg.id,deductedMinutes:60}});
  await prisma.packageTxn.create({data:{sessionId:browserSession.id,packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-60,note:`studentId=${student.id}`}});
  console.log(JSON.stringify({browserSessionId:browserSession.id,teacherEmail:user.email}));
  const observer=await prisma.user.create({data:{email:`attendance-observer-${Date.now()}@example.invalid`,name:'Readonly UAT',role:'ADMIN',isObserver:true,passwordHash:hash,passwordSalt:salt}});
  const obs=await createStaffMiniappSession(observer.id);
  const denied=await fetch(`http://127.0.0.1:3149/api/miniapp/staff/schedule/${session.id}/attendance`,{method:'POST',headers:{Authorization:`Bearer ${obs.token}`,'Content-Type':'application/json'},body:JSON.stringify({items:input.items})});assert.equal(denied.status,403);
 } else {assert.equal((await saveTeacherAttendance({...input,items:[{studentId:student.id,status:'EXCUSED'}]})).reviewCount,1);}
 after=await prisma.attendance.findUniqueOrThrow({where:{id:row.id}});assert.equal(after.status,'EXCUSED');assert.equal(after.deductedMinutes,60);assert.equal(after.packageId,pkg.id);
 assert.deepEqual(await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}}),pkgBefore);assert.deepEqual(await prisma.packageTxn.findMany({where:{sessionId:session.id}}),ledgerBefore);
 const audit=await prisma.auditLog.findFirstOrThrow({where:{entityId:session.id},orderBy:{createdAt:'desc'}});assert.equal((audit.meta as any).financialRecordsChanged,false);assert.equal((audit.meta as any).impacts[0].needsReview,true);
 console.log(JSON.stringify({passed:true,sessionId:session.id,teacherId:teacher.id,atomicAudit:true,concurrentFinancialFieldsPreserved:true,noFinancialWrites:true}));
}
main().finally(()=>prisma.$disconnect());

import {saveTeacherFeedbackReviewed} from '../../lib/teacher-feedback-save';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {saveTeacherAttendance} from '../../lib/teacher-attendance-save';
import {saveAdminAttendance} from '../../lib/admin-attendance-deduction';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),teacher=await prisma.teacher.create({data:{name:'Exact roster UAT teacher'}}),a=await prisma.student.create({data:{name:'Explicit session student A'}}),b=await prisma.student.create({data:{name:'Different enrolled student B'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:b.id,enrollments:{create:{studentId:b.id}}}});
 const source=await prisma.session.create({data:{classId:klass.id,studentId:a.id,startAt:new Date('2026-09-20T02:00:00Z'),endAt:new Date('2026-09-20T03:00:00Z')}});
 const pkg=await prisma.coursePackage.create({data:{studentId:a.id,courseId:course.id,type:'HOURS',totalMinutes:180,remainingMinutes:180,validFrom:new Date('2026-01-01')}});
 const adminInput={sessionId:source.id,actor:owner,items:[{studentId:a.id,status:'PRESENT',deductedMinutes:60,packageId:pkg.id}]};
 await saveAdminAttendance(adminInput);await saveAdminAttendance(adminInput);assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}})).remainingMinutes,120);assert.equal(await prisma.packageTxn.count({where:{sessionId:source.id}}),1);
 const savedLedger=await prisma.packageTxn.findMany({where:{sessionId:source.id}});
 const input={sessionId:source.id,teacherId:teacher.id,actor:owner,action:'TEACHER_SAVE' as const,items:[{studentId:a.id,status:'LATE'}]};await saveTeacherAttendance(input);
 await assert.rejects(saveTeacherAttendance({...input,items:[{studentId:b.id,status:'PRESENT'}]}),/名单/);assert.deepEqual(await prisma.packageTxn.findMany({where:{sessionId:source.id}}),savedLedger);
 const fixedClass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:a.id}}),fixed=await prisma.session.create({data:{classId:fixedClass.id,startAt:new Date('2026-09-21T02:00:00Z'),endAt:new Date('2026-09-21T03:00:00Z')}});
 await saveTeacherAttendance({...input,sessionId:fixed.id});assert.equal(await prisma.attendance.count({where:{sessionId:fixed.id,studentId:a.id}}),1);
 const ambiguousClass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,enrollments:{create:[{studentId:a.id},{studentId:b.id}]}}}),ambiguous=await prisma.session.create({data:{classId:ambiguousClass.id,startAt:new Date('2026-09-22T02:00:00Z'),endAt:new Date('2026-09-22T03:00:00Z')}});
 await assert.rejects(saveTeacherAttendance({...input,sessionId:ambiguous.id}),/学生归属/);await assert.rejects(saveAdminAttendance({...adminInput,sessionId:ambiguous.id}),/学生归属/);assert.equal(await prisma.attendance.count({where:{sessionId:ambiguous.id}}),0);
 await assert.rejects(saveTeacherFeedbackReviewed(ambiguous.id,teacher.id,{where:{sessionId_teacherId:{sessionId:ambiguous.id,teacherId:teacher.id}},create:{sessionId:ambiguous.id,teacherId:teacher.id,status:'ON_TIME',content:'Must not save ambiguous feedback'},update:{content:'Must not save ambiguous feedback'}}),/Student assignment/);
 const password='LocalUAT-Roster-20260929',salt=randomBytes(16).toString('hex');const user=await prisma.user.create({data:{name:'Roster UAT teacher',email:`roster-${randomUUID()}@example.invalid`,role:'TEACHER',teacherId:teacher.id,language:'BILINGUAL',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});const token=await createStaffMiniappSession(user.id);
 writeFileSync('/tmp/sgt-r434-fixture.json',JSON.stringify({sessionId:source.id,fixedSessionId:fixed.id,ambiguousSessionId:ambiguous.id,studentA:a.id,studentB:b.id,teacherId:teacher.id,email:user.email,password,token:token.token}));
 console.log(JSON.stringify({passed:true,explicitStudentWithoutEnrollment:true,classDefaultWithoutEnrollment:true,foreignEnrolledStudentRejected:true,ambiguousOneToOneRejected:true,oneDeductionOnly:true,teacherLedgerUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

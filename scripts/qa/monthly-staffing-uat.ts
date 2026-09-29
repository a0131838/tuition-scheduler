import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {buildMonthlyStaffingReport} from '../../lib/monthly-scheduling';
async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const course=await prisma.course.create({data:{name:'Forecast isolated '+randomUUID().slice(0,4)}}),teacher=await prisma.teacher.create({data:{name:'Forecast isolated teacher'}}),campus=await prisma.campus.findFirstOrThrow();
 await prisma.teacherCourseRate.create({data:{teacherId:teacher.id,courseId:course.id}});
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2045-04-30T16:00:00Z')},create:{month:new Date('2045-04-30T16:00:00Z'),status:'OPEN'},update:{}});
 const students=[];for(let i=0;i<3;i++)students.push(await prisma.student.create({data:{name:'Forecast UAT '+randomUUID().slice(0,4)}}));
 for(let i=0;i<3;i++)await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:students[i].id,courseId:course.id,token:randomUUID(),status:['OFFERED','PARENT_SELECTED','CHANGE_REQUESTED'][i],intent:'CHANGE',expectedMinutes:i===2?null:60,expectedSessionsPerWeek:3}});
 const klass=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1,oneOnOneStudentId:students[0].id}});
 await prisma.session.create({data:{classId:klass.id,studentId:students[0].id,startAt:new Date('2045-05-02T02:00:00Z'),endAt:new Date('2045-05-02T04:00:00Z')}});
 const cancelled=await prisma.session.create({data:{classId:klass.id,studentId:students[1].id,startAt:new Date('2045-05-03T02:00:00Z'),endAt:new Date('2045-05-03T03:00:00Z')}});await prisma.attendance.create({data:{sessionId:cancelled.id,studentId:students[1].id,status:'EXCUSED'}});
 await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:new Date('2045-05-02T16:00:00Z'),startMin:600,endMin:660}});
 const before={lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),attendance:await prisma.attendance.count(),outbox:await prisma.miniappNotificationOutbox.count(),items:await prisma.monthlySchedulingItem.findMany({where:{campaignId:campaign.id},orderBy:{id:'asc'}})};
 const report=await buildMonthlyStaffingReport(campaign.id),row=report.courses.find(r=>r.courseId===course.id)!;
 assert.equal(row.studentCount,3);assert.equal(row.demandMinutes,120);assert.equal(row.scheduledMinutes,120);assert.equal(row.unknownDemandCount,1);assert.equal(row.unscheduledMinutes,60);assert.equal(row.availableMinutes,60);assert.equal(row.gapMinutes,0);assert.equal(row.tone,'AMBER');
 assert.deepEqual({lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),attendance:await prisma.attendance.count(),outbox:await prisma.miniappNotificationOutbox.count(),items:await prisma.monthlySchedulingItem.findMany({where:{campaignId:campaign.id},orderBy:{id:'asc'}})},before);
 writeFileSync('/tmp/sgt-r440-fixture.json',JSON.stringify({month:'2045-05',courseName:course.name,campaignId:campaign.id}));
 console.log(JSON.stringify({passed:true,optionAndChangeRowsIncluded:true,noFourWeekDefault:true,noCrossStudentOffset:true,cancelledLessonExcludedAndTeacherCapacityFreed:true,unknownDemandNotGreen:true,reportReadOnly:true}));
}
main().finally(()=>prisma.$disconnect());

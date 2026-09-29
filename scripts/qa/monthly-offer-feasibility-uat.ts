import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {refreshMonthlySchedulingOffers,rankMonthlySchedulingOffers} from '../../lib/monthly-scheduling';
import {createParentPortalSession} from '../../lib/parent-portal';

async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r446-fixture.json','utf8'));
  const post=()=>fetch('http://127.0.0.1:3149/api/miniapp/monthly-scheduling',{method:'POST',headers:{Authorization:`Bearer ${f.token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'RANK_OFFERS',itemId:f.itemId,offerIds:[f.offerId]})});
  const before=await prisma.monthlySchedulingOffer.findUniqueOrThrow({where:{id:f.offerId}});
  assert.equal((await post()).status,409);assert.deepEqual(await prisma.monthlySchedulingOffer.findUniqueOrThrow({where:{id:f.offerId}}),before);
  await prisma.appointment.update({where:{id:f.appointmentId},data:{startAt:new Date('2046-06-03T07:00:00Z'),endAt:new Date('2046-06-03T08:00:00Z')}});
  assert.equal((await post()).status,200);
  assert.equal((await prisma.monthlySchedulingOffer.findUniqueOrThrow({where:{id:f.offerId}})).status,'HELD');
  console.log(JSON.stringify({passed:true,httpStaleConflict409:true,httpFreshHold200:true}));return;
 }
 const course=await prisma.course.create({data:{name:'Offer feasibility UAT '+randomUUID().slice(0,4)}});
 const teacher=await prisma.teacher.create({data:{name:'Offer feasibility isolated teacher'}});
 const otherTeacher=await prisma.teacher.create({data:{name:'Offer other isolated teacher'}});
 const student=await prisma.student.create({data:{name:'Offer isolated student'}});
 const other=await prisma.student.create({data:{name:'Offer unrelated student'}});
 const parent=await prisma.parentAccount.create({data:{name:'Offer isolated parent'}});
 await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});
 await prisma.teacherCourseRate.create({data:{teacherId:teacher.id,courseId:course.id}});
 const slot=await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:new Date('2046-06-02T16:00:00Z'),startMin:600,endMin:840}});
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2046-05-31T16:00:00Z')},create:{month:new Date('2046-05-31T16:00:00Z'),status:'OPEN'},update:{status:'OPEN'}});
 const item=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,parentId:parent.id,courseId:course.id,token:randomUUID(),status:'SUBMITTED',intent:'CHANGE',availabilityJson:{selectionMode:'calendar',dateSelections:[{date:'2046-06-03',start:'10:00',end:'14:00',priority:'REQUIRED'}]}}});
 const campus=await prisma.campus.findFirstOrThrow(),klass=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1,oneOnOneStudentId:other.id}});
 const lesson=await prisma.session.create({data:{classId:klass.id,studentId:other.id,startAt:new Date('2046-06-03T02:00:00Z'),endAt:new Date('2046-06-03T03:00:00Z')}});
 let offers=await refreshMonthlySchedulingOffers(item.id);assert.equal(offers[0].start,'11:00');
 // Cancelled teaching does not occupy a teacher; the student's appointment with a different teacher does.
 await prisma.attendance.create({data:{sessionId:lesson.id,studentId:other.id,status:'EXCUSED'}});
 offers=await refreshMonthlySchedulingOffers(item.id);assert.equal(offers[0].start,'10:00');
 const appointment=await prisma.appointment.create({data:{teacherId:otherTeacher.id,studentId:student.id,mode:'OFFLINE',startAt:new Date('2046-06-03T02:00:00Z'),endAt:new Date('2046-06-03T03:00:00Z')}});
 const staleId=offers[0].id;
 const snapshot=async()=>({item:await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}}),offers:await prisma.monthlySchedulingOffer.findMany({where:{itemId:item.id},orderBy:{id:'asc'}}),audits:await prisma.parentPortalAudit.count({where:{targetId:item.id}})});
 const before=await snapshot();
 await assert.rejects(rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[staleId]}),/no longer available/);assert.deepEqual(await snapshot(),before);
 offers=await refreshMonthlySchedulingOffers(item.id);assert.equal(offers[0].start,'11:00');
 await prisma.teacherAvailabilityDate.update({where:{id:slot.id},data:{startMin:720}});
 await assert.rejects(rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[offers[0].id]}),/no longer available/);
 await prisma.teacherAvailabilityDate.update({where:{id:slot.id},data:{startMin:600}});
 // Fresh leave blocks both generation and ranking, without running any HR approval workflow.
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),legal=await prisma.hrLegalEntity.findFirstOrThrow();
 const fakeUser=await prisma.user.create({data:{email:`offer-${randomUUID()}@example.invalid`,name:'Offer leave UAT',role:'TEACHER',passwordHash:'not-a-login',passwordSalt:'not-a-login'}});
 const employee=await prisma.employeeProfile.create({data:{userId:fakeUser.id,teacherId:teacher.id,legalEntityId:legal.id,startDate:new Date(),createdByUserId:owner.id,updatedByUserId:owner.id}});
 const leave=await prisma.hrLeaveRequest.create({data:{employeeId:employee.id,leaveType:'ANNUAL',status:'APPROVED',startAt:new Date('2046-06-03T03:00:00Z'),endAt:new Date('2046-06-03T04:00:00Z'),durationMinutes:60}});
 await assert.rejects(rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[offers[0].id]}),/no longer available/);
 offers=await refreshMonthlySchedulingOffers(item.id);assert.equal(offers[0].start,'12:00');
 await prisma.hrLeaveRequest.update({where:{id:leave.id},data:{status:'CANCELLED'}});
 // Ranking also checks a formal lesson inserted after options were generated.
 const conflict=await prisma.session.create({data:{classId:klass.id,studentId:other.id,startAt:new Date('2046-06-03T04:00:00Z'),endAt:new Date('2046-06-03T05:00:00Z')}});
 await assert.rejects(rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[offers[0].id]}),/no longer available/);
 await prisma.attendance.create({data:{sessionId:conflict.id,studentId:other.id,status:'EXCUSED'}});
 let failAudit=true;prisma.$use(async(p,next)=>{if(failAudit&&p.model==='ParentPortalAudit'&&p.action==='create'&&p.args.data.targetId===item.id)throw Error('forced offer audit failure');return next(p);});
 const preHold=await snapshot();await assert.rejects(rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[offers[0].id]}),/forced offer audit/);assert.deepEqual(await snapshot(),preHold);failAudit=false;
 const business=async()=>({lessons:await prisma.session.findMany({where:{classId:klass.id},orderBy:{id:'asc'}}),ledger:await prisma.packageTxn.count(),attendance:await prisma.attendance.findMany({where:{session:{classId:klass.id}},orderBy:{id:'asc'}}),outbox:await prisma.miniappNotificationOutbox.count()});
 // Ranking skips a newly conflicting first choice and keeps a still-feasible fallback.
 const firstChoice=await prisma.monthlySchedulingOffer.create({data:{itemId:item.id,teacherId:teacher.id,weekdayLabel:'SUN',startMin:600,endMin:660,durationMin:60,sessionDatesJson:[{date:'2046-06-03',startAt:'2046-06-03T02:00:00Z',endAt:'2046-06-03T03:00:00Z'}]}});
 const preBusiness=await business();const held=await rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[firstChoice.id,offers[0].id]});assert.equal(held.id,offers[0].id);assert.deepEqual(await business(),preBusiness);
 // A month-boundary appointment beginning in the previous month must block generation.
 const boundarySlot=await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:new Date('2046-05-31T16:00:00Z'),startMin:0,endMin:180}});
 await prisma.appointment.create({data:{teacherId:teacher.id,studentId:other.id,mode:'OFFLINE',startAt:new Date('2046-05-31T15:00:00Z'),endAt:new Date('2046-05-31T17:00:00Z')}});
 const boundaryStudent=await prisma.student.create({data:{name:'Boundary UAT'}}),boundary=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:boundaryStudent.id,courseId:course.id,token:randomUUID(),status:'SUBMITTED',intent:'CHANGE',availabilityJson:{selectionMode:'calendar',dateSelections:[{date:'2046-06-01',start:'00:00',end:'03:00',priority:'REQUIRED'}]}}});
 assert.equal((await refreshMonthlySchedulingOffers(boundary.id))[0].start,'01:00');assert(boundarySlot);
 // Prepare a separate HTTP stale option. No real data or send runner is used.
 await prisma.monthlySchedulingOffer.updateMany({where:{itemId:item.id,status:'HELD'},data:{status:'WITHDRAWN'}});
 await prisma.monthlySchedulingItem.update({where:{id:item.id},data:{status:'SUBMITTED'}});
 offers=await refreshMonthlySchedulingOffers(item.id);assert.equal(offers[0].start,'11:00');
 await prisma.appointment.update({where:{id:appointment.id},data:{startAt:new Date('2046-06-03T03:00:00Z'),endAt:new Date('2046-06-03T04:00:00Z')}});
 const auth=await createParentPortalSession(parent.id);writeFileSync('/tmp/sgt-r446-fixture.json',JSON.stringify({itemId:item.id,offerId:offers[0].id,appointmentId:appointment.id,token:auth.token}));
 console.log(JSON.stringify({passed:true,laterSlotFound:true,cancellationRespected:true,studentOtherTeacherAppointment:true,freshAvailabilityLeaveLessonChecks:true,monthBoundaryOverlap:true,atomicAuditRollback:true,holdDoesNotWriteTeachingOrLedger:true}));
}
main().finally(()=>prisma.$disconnect());

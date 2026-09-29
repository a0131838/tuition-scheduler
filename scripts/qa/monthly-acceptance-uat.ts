import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {refreshMonthlySchedulingOffers,rankMonthlySchedulingOffers,updateMonthlySchedulingItem} from '../../lib/monthly-scheduling';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r448-fixture.json','utf8'));
  const send=()=>fetch('http://127.0.0.1:3149/api/miniapp/staff/monthly-scheduling',{method:'PATCH',headers:{Authorization:`Bearer ${f.token}`,'Content-Type':'application/json'},body:JSON.stringify({itemId:f.itemId,status:'MATCHED',expectedStatus:'PARENT_SELECTED',expectedUpdatedAt:f.updatedAt})});
  const before=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.itemId}});assert.equal((await send()).status,409);assert.deepEqual(await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.itemId}}),before);
  await prisma.teacherAvailabilityDate.update({where:{id:f.slotId},data:{startMin:600}});assert.equal((await send()).status,200);assert.equal((await send()).status,409);
  console.log(JSON.stringify({passed:true,httpFreshAcceptanceGuard:true,httpValidAcceptance200:true,httpRepeatStale409:true}));return;
 }
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),course=await prisma.course.create({data:{name:'Acceptance isolated '+randomUUID().slice(0,4)}}),teacher=await prisma.teacher.create({data:{name:'Acceptance isolated teacher'}});
 await prisma.teacherCourseRate.create({data:{teacherId:teacher.id,courseId:course.id}});
 const slot=await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:new Date('2048-06-03T00:00:00+08:00'),startMin:600,endMin:720}});
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2048-06-01T00:00:00+08:00')},create:{month:new Date('2048-06-01T00:00:00+08:00'),status:'OPEN'},update:{status:'OPEN'}});
 const parent=await prisma.parentAccount.create({data:{name:'Acceptance isolated parent'}}),student=await prisma.student.create({data:{name:'Acceptance isolated student'}});
 await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});
 const item=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,parentId:parent.id,courseId:course.id,token:randomUUID(),status:'SUBMITTED',intent:'CHANGE',expectedMinutes:60,availabilityJson:{selectionMode:'calendar',dateSelections:[{date:'2048-06-03',start:'10:00',end:'11:00',priority:'REQUIRED'}]}}});
 const offers=await refreshMonthlySchedulingOffers(item.id);assert.equal(offers.length,1);await rankMonthlySchedulingOffers({itemId:item.id,parentId:parent.id,offerIds:[offers[0].id]});
 const snap=()=>prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id},include:{offers:{orderBy:{id:'asc'}}}});
 const selected=await snap(),input={itemId:item.id,status:'MATCHED' as const,expectedStatus:'PARENT_SELECTED' as const,expectedUpdatedAt:selected.updatedAt.toISOString(),ownerUserId:owner.id};
 // Each rejected acceptance leaves item and all offer history unchanged.
 await prisma.teacherAvailabilityDate.update({where:{id:slot.id},data:{startMin:660}});await assert.rejects(updateMonthlySchedulingItem(input),/no longer available/);assert.deepEqual(await snap(),selected);await prisma.teacherAvailabilityDate.update({where:{id:slot.id},data:{startMin:600}});
 const other=await prisma.student.create({data:{name:'Acceptance other isolated student'}}),otherItem=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:other.id,courseId:course.id,token:randomUUID(),status:'MATCHED'}});
 const competing=await prisma.monthlySchedulingOffer.create({data:{itemId:otherItem.id,teacherId:teacher.id,status:'ACCEPTED',weekdayLabel:'WED',startMin:600,endMin:660,durationMin:60,sessionDatesJson:selected.offers[0].sessionDatesJson!}});
 await assert.rejects(updateMonthlySchedulingItem(input),/no longer available/);assert.deepEqual(await snap(),selected);await prisma.monthlySchedulingOffer.update({where:{id:competing.id},data:{status:'WITHDRAWN'}});
 const campus=await prisma.campus.findFirstOrThrow(),klass=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1,oneOnOneStudentId:other.id}});
 const conflict=await prisma.session.create({data:{classId:klass.id,studentId:other.id,startAt:new Date('2048-06-03T02:00:00Z'),endAt:new Date('2048-06-03T03:00:00Z')}});
 await assert.rejects(updateMonthlySchedulingItem(input),/no longer available/);assert.deepEqual(await snap(),selected);await prisma.attendance.create({data:{sessionId:conflict.id,studentId:other.id,status:'EXCUSED'}});
 await prisma.monthlySchedulingCampaign.update({where:{id:campaign.id},data:{status:'CLOSED'}});await assert.rejects(updateMonthlySchedulingItem(input),/Reopen the campaign/);assert.deepEqual(await snap(),selected);await prisma.monthlySchedulingCampaign.update({where:{id:campaign.id},data:{status:'OPEN'}});
 await prisma.monthlySchedulingOffer.update({where:{id:offers[0].id},data:{holdExpiresAt:new Date(0)}});await assert.rejects(updateMonthlySchedulingItem(input),/expired/);await prisma.monthlySchedulingOffer.update({where:{id:offers[0].id},data:{holdExpiresAt:selected.offers[0].holdExpiresAt}});
 const extra=await prisma.monthlySchedulingOffer.create({data:{itemId:item.id,teacherId:teacher.id,generation:2,status:'HELD',weekdayLabel:'WED',startMin:600,endMin:660,durationMin:60,sessionDatesJson:selected.offers[0].sessionDatesJson!}});await assert.rejects(updateMonthlySchedulingItem(input),/needs review/);await prisma.monthlySchedulingOffer.update({where:{id:extra.id},data:{status:'WITHDRAWN'}});
 const beforeAudit=await snap();let failAudit=true;prisma.$use(async(p,next)=>{if(failAudit&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.entityId===item.id&&p.args.data.action==='ITEM_STATUS_VERIFIED')throw Error('forced acceptance audit failure');return next(p);});
 await assert.rejects(updateMonthlySchedulingItem(input),/forced acceptance audit/);assert.deepEqual(await snap(),beforeAudit);failAudit=false;
 const observer=await prisma.user.findFirstOrThrow({where:{name:'Policy OBSERVER'}});await assert.rejects(updateMonthlySchedulingItem({...input,ownerUserId:observer.id}),/read-only/);
 const baseline=async()=>({lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),outbox:await prisma.miniappNotificationOutbox.count()});const before=await baseline();
 const races=await Promise.allSettled([updateMonthlySchedulingItem(input),updateMonthlySchedulingItem(input)]);assert.equal(races.filter(r=>r.status==='fulfilled').length,1);assert.deepEqual(await baseline(),before);
 const audit=await prisma.auditLog.findFirstOrThrow({where:{entityId:item.id,action:'ITEM_STATUS_VERIFIED'}});assert.equal((audit.meta as any).acceptedOfferId,offers[0].id);
 const matched=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}});assert.equal(matched.status,'MATCHED');
 // Explicit formal lesson fixtures are created only after acceptance, then verified by exact ID.
 const ownClass=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}}),formal=await prisma.session.create({data:{classId:ownClass.id,studentId:student.id,startAt:new Date('2048-06-03T02:00:00Z'),endAt:new Date('2048-06-03T03:00:00Z')}});
 const formalBefore=await prisma.session.findUniqueOrThrow({where:{id:formal.id}});
 const done=await updateMonthlySchedulingItem({itemId:item.id,status:'SCHEDULED',expectedStatus:'MATCHED',expectedUpdatedAt:matched.updatedAt.toISOString(),ownerUserId:owner.id,sessionIds:[formal.id],expectedSessionCount:1,completionReason:'Isolated explicit formal lesson checked against accepted parent choice.'});assert.equal(done.status,'SCHEDULED');assert.deepEqual(await prisma.session.findUniqueOrThrow({where:{id:formal.id}}),formalBefore);
 // Separate HTTP fixture on another date; no real parent or teaching records are touched.
 const httpStudent=await prisma.student.create({data:{name:'Acceptance HTTP isolated'}}),httpSlot=await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:new Date('2048-06-04T00:00:00+08:00'),startMin:660,endMin:720}});
 const httpItem=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:httpStudent.id,courseId:course.id,token:randomUUID(),status:'PARENT_SELECTED',intent:'CHANGE'}});
 await prisma.monthlySchedulingOffer.create({data:{itemId:httpItem.id,teacherId:teacher.id,status:'HELD',holdExpiresAt:new Date(Date.now()+3600000),parentRank:1,weekdayLabel:'THU',startMin:600,endMin:660,durationMin:60,sessionDatesJson:[{date:'2048-06-04',startAt:'2048-06-04T02:00:00Z',endAt:'2048-06-04T03:00:00Z'}]}});
 const token=await createStaffMiniappSession(owner.id);writeFileSync('/tmp/sgt-r448-fixture.json',JSON.stringify({itemId:httpItem.id,updatedAt:httpItem.updatedAt.toISOString(),slotId:httpSlot.id,token:token.token}));
 console.log(JSON.stringify({passed:true,freshAvailabilityHoldLessonGuards:true,closedCampaignAndExpiredRejected:true,ambiguousHoldsRejected:true,atomicAuditRollback:true,observerDenied:true,concurrentAcceptanceOnce:true,acceptanceToFormalVerification:true,noBusinessWritesDuringAcceptance:true}));
}
main().finally(()=>prisma.$disconnect());

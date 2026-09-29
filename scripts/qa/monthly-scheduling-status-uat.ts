import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {updateMonthlySchedulingItem,type MonthlySchedulingItemStatus} from '../../lib/monthly-scheduling';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r436-fixture.json','utf8')),base='http://127.0.0.1:3149';
  const send=(body:unknown)=>fetch(base+'/api/miniapp/staff/monthly-scheduling',{method:'PATCH',headers:{Authorization:`Bearer ${f.token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const status of ['VIEWED','SUBMITTED','OFFERED','PARENT_SELECTED','CHANGE_REQUESTED','MATCHED'])assert.equal((await send({itemId:f.itemId,status,expectedStatus:'NOT_SENT',internalNote:'Cannot fabricate a response'})).status,409,status);
  assert.equal((await send({itemId:f.itemId,status:'SENT',expectedStatus:'NOT_SENT'})).status,409);
  assert.equal((await send({itemId:f.itemId,status:'SENT',expectedStatus:'NOT_SENT',internalNote:'Isolated manual send confirmed: WeChat 10:30'})).status,200);
  const saved=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.itemId}});assert.equal(saved.status,'SENT');assert.equal(saved.submittedAt,null);assert.equal(saved.viewedAt,null);
  assert.equal((await send({itemId:f.itemId,status:'SENT',expectedStatus:'SENT',internalNote:'Updated internal follow-up note'})).status,200);
  assert.deepEqual((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.itemId}})).sentAt,saved.sentAt);
  console.log(JSON.stringify({passed:true,httpRejectsFabricatedFacts:true,manualSendEvidenceRequired:true,noteDoesNotChangeSendTime:true}));return;
 }
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),course=await prisma.course.findFirstOrThrow();
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2044-11-30T16:00:00Z')},create:{month:new Date('2044-11-30T16:00:00Z'),status:'OPEN'},update:{}});
 async function make(status='NOT_SENT',reply=false){const student=await prisma.student.create({data:{name:'Monthly status UAT '+randomUUID().slice(0,4)}});return prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,courseId:course.id,token:randomUUID(),status,intent:reply?'KEEP':null,submittedAt:reply?new Date():null,parentConfirmedAt:reply?new Date():null,carryForwardScheduleJson:reply?[{weekday:'MON',teacherId:'isolated-review-source'}]:undefined,ownerUserId:actor.id,ownerName:'Retained coordinator'}});}
 const raw=await make(),reply=await make('SUBMITTED',true),ledger=await prisma.packageTxn.count(),lessons=await prisma.session.count();
 for(const status of ['VIEWED','SUBMITTED','OFFERED','PARENT_SELECTED','CHANGE_REQUESTED','MATCHED'] as MonthlySchedulingItemStatus[])await assert.rejects(updateMonthlySchedulingItem({itemId:raw.id,status,expectedStatus:'NOT_SENT',ownerUserId:actor.id,internalNote:'Cannot fabricate facts from dropdown'}));
 assert.deepEqual(await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:raw.id}}),raw);
 assert.equal(await prisma.auditLog.count({where:{entityId:raw.id}}),0);
 await assert.rejects(updateMonthlySchedulingItem({itemId:reply.id,status:'NO_RESPONSE',expectedStatus:'SUBMITTED',ownerUserId:actor.id}),/recorded parent/);
 const matched=await updateMonthlySchedulingItem({itemId:reply.id,status:'MATCHED',expectedStatus:'SUBMITTED',ownerUserId:actor.id});assert.equal(matched.status,'MATCHED');assert.equal(matched.ownerName,'Retained coordinator');assert.deepEqual(matched.submittedAt,reply.submittedAt);
 const reviewed=await make('SUBMITTED',true);await prisma.monthlySchedulingItem.update({where:{id:reviewed.id},data:{teacherPreferenceType:'VERIFY'}});await assert.rejects(updateMonthlySchedulingItem({itemId:reviewed.id,status:'MATCHED',expectedStatus:'SUBMITTED',ownerUserId:actor.id}),/teacher identity/);
 const teacher=await prisma.teacher.findFirstOrThrow(),selected=await make('PARENT_SELECTED',true);await prisma.monthlySchedulingOffer.create({data:{itemId:selected.id,teacherId:teacher.id,status:'HELD',parentRank:1,holdExpiresAt:new Date(Date.now()+3600000),weekdayLabel:'MON',startMin:600,endMin:660,durationMin:60,sessionDatesJson:[{date:'2044-12-05',startAt:'2044-12-05T02:00:00Z',endAt:'2044-12-05T03:00:00Z'}]}});
 assert.equal((await updateMonthlySchedulingItem({itemId:selected.id,status:'MATCHED',expectedStatus:'PARENT_SELECTED',ownerUserId:actor.id})).status,'MATCHED');assert.equal(await prisma.monthlySchedulingOffer.count({where:{itemId:selected.id,status:'ACCEPTED'}}),1);
 assert.equal(await prisma.packageTxn.count(),ledger);assert.equal(await prisma.session.count(),lessons);
 const token=await createStaffMiniappSession(actor.id);writeFileSync('/tmp/sgt-r436-fixture.json',JSON.stringify({itemId:raw.id,token:token.token,month:'2044-12'}));
 console.log(JSON.stringify({passed:true,noFabricatedReplyReadSelection:true,recordedReplyCannotBeErased:true,validKeepAndHeldOfferConfirmations:true,unresolvedTeacherBlocked:true,ownerAndReplyRetained:true,noLessonOrLedgerMutation:true}));
}
main().finally(()=>prisma.$disconnect());

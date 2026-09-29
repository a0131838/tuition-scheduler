import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {submitMonthlySchedulingPreference,submitMonthlySchedulingPreferenceByStaff,refreshMonthlySchedulingOffers} from '../../lib/monthly-scheduling';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
import {createParentPortalSession} from '../../lib/parent-portal';
async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r438-fixture.json','utf8')),base='http://127.0.0.1:3149';
  const post=(staff:boolean,body:unknown)=>fetch(base+'/api/miniapp/'+(staff?'staff/':'')+'monthly-scheduling',{method:'POST',headers:{Authorization:`Bearer ${staff?f.token:f.parentToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const prior=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.itemId}}),history=await prisma.monthlySchedulingOffer.count({where:{itemId:f.itemId}});
  const proxy={action:'PROXY_PREFERENCE',itemId:f.itemId,expectedStatus:prior.status,expectedUpdatedAt:prior.updatedAt.toISOString(),intent:'KEEP',responseChannel:'WECHAT_GROUP',parentConfirmationNote:'Isolated parent confirmed current timetable.',parentConfirmedAt:new Date().toISOString()};
  assert.equal((await post(true,{...proxy,expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).status,409);
  assert.equal((await post(true,proxy)).status,200);
  assert.equal((await post(true,proxy)).status,409);
  assert.equal(await prisma.monthlySchedulingOffer.count({where:{itemId:f.itemId}}),history);
  assert.equal(await prisma.monthlySchedulingOffer.count({where:{itemId:f.itemId,status:{notIn:['WITHDRAWN','EXPIRED']}}}),0);
  const parentBefore=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.itemId}});
  assert.equal((await post(false,{itemId:f.itemId,intent:'PAUSE',parentNotes:'Isolated family away',expectedUpdatedAt:prior.updatedAt.toISOString()})).status,409);
  assert.equal((await post(false,{itemId:f.itemId,intent:'PAUSE',parentNotes:'Isolated family away',expectedUpdatedAt:parentBefore.updatedAt.toISOString()})).status,200);
  const response=await fetch(base+'/api/miniapp/monthly-scheduling',{headers:{Authorization:`Bearer ${f.parentToken}`}}),body=await response.json();assert.equal(response.status,200);
  const rows=body.items??body.data?.items;assert(Array.isArray(rows));const row=rows.find((r:any)=>r.id===f.itemId);assert.equal(row.status,'PAUSED');assert.equal(row.offers.length,0);assert(!('internalNote' in row));
  console.log(JSON.stringify({passed:true,httpRevisionGuard:true,repeatedSubmissionRejected:true,historyRetained:true,parentStaffSameResponse:true,privateNotesNotExposed:true}));return;
 }
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),course=await prisma.course.create({data:{name:'Monthly response isolated '+randomUUID().slice(0,4)}}),teacher=await prisma.teacher.create({data:{name:'Monthly response history teacher'}});
 await prisma.teacherCourseRate.create({data:{teacherId:teacher.id,courseId:course.id}});await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:new Date('2045-03-05T16:00:00Z'),startMin:540,endMin:720}});
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2045-02-28T16:00:00Z')},create:{month:new Date('2045-02-28T16:00:00Z'),status:'OPEN'},update:{}}),parent=await prisma.parentAccount.create({data:{name:'Monthly response isolated parent'}});
 async function make(status='NOT_SENT'){const student=await prisma.student.create({data:{name:'Monthly parent response '+randomUUID().slice(0,4)}});await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});return prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,parentId:parent.id,courseId:course.id,status,token:randomUUID()}});}
 const item=await make(),before={lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),feedback:await prisma.sessionFeedback.count(),outbox:await prisma.miniappNotificationOutbox.count()};
 const request={itemId:item.id,intent:'CHANGE' as const,expectedMinutes:60,availability:{selectionMode:'calendar',dateSelections:[{date:'2045-03-06',start:'10:00',end:'12:00',priority:'REQUIRED'}]}};
 const first=await submitMonthlySchedulingPreference({...request,parentId:parent.id});assert.equal(first.status,'OFFERED');const original=await prisma.monthlySchedulingOffer.findFirstOrThrow({where:{itemId:item.id,status:'AVAILABLE'}});assert.equal(original.generation,1);assert.equal(await prisma.parentPortalAudit.count({where:{targetId:item.id,action:'MONTHLY_PREFERENCE'}}),1);
 const staff={...request,expectedStatus:'OFFERED' as const,actorUserId:actor.id,actorEmail:actor.email,actorName:actor.name!,actorRole:actor.role,responseChannel:'WECHAT_GROUP' as const,parentConfirmationNote:'Parent confirmed updated weekly preference in the group.',parentConfirmedAt:new Date().toISOString()};
 const second=await submitMonthlySchedulingPreferenceByStaff({...staff,expectedUpdatedAt:first.updatedAt.toISOString()});assert.equal(second.status,'OFFERED');const retained=await prisma.monthlySchedulingOffer.findUniqueOrThrow({where:{id:original.id}});assert.equal(retained.status,'WITHDRAWN');assert.deepEqual(retained.sessionDatesJson,original.sessionDatesJson);const latest=await prisma.monthlySchedulingOffer.findFirstOrThrow({where:{itemId:item.id,status:'AVAILABLE'}});assert.equal(latest.generation,2);assert.notEqual(latest.id,original.id);
 const savedOffers=await prisma.monthlySchedulingOffer.findMany({where:{itemId:item.id},orderBy:{id:'asc'}});let failAudit=true;
 prisma.$use(async(params,next)=>{if(failAudit&&params.model==='AuditLog'&&params.action==='create'&&params.args.data.action==='PROXY_PARENT_PREFERENCE'&&params.args.data.entityId===item.id)throw Error('forced preference audit failure');return next(params);});
 await assert.rejects(submitMonthlySchedulingPreferenceByStaff({...staff,expectedUpdatedAt:second.updatedAt.toISOString()}),/forced preference audit/);failAudit=false;
 assert.deepEqual(await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:item.id}}),second);assert.deepEqual(await prisma.monthlySchedulingOffer.findMany({where:{itemId:item.id},orderBy:{id:'asc'}}),savedOffers);
 const concurrent=await Promise.allSettled([submitMonthlySchedulingPreferenceByStaff({...staff,expectedUpdatedAt:second.updatedAt.toISOString()}),submitMonthlySchedulingPreferenceByStaff({...staff,expectedUpdatedAt:second.updatedAt.toISOString()})]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
 const preStale=await prisma.monthlySchedulingOffer.findMany({where:{itemId:item.id},orderBy:{id:'asc'}});let editDuringScan=true;
 prisma.$use(async(params,next)=>{const value=await next(params);if(editDuringScan&&params.model==='Teacher'&&params.action==='findMany'&&params.args.include?.dateAvailabilities){editDuringScan=false;await prisma.monthlySchedulingItem.update({where:{id:item.id},data:{parentNotes:'A newer response while old options were being computed'}});}return value;});
 await assert.rejects(refreshMonthlySchedulingOffers(item.id),/response or time selection changed/);assert.deepEqual(await prisma.monthlySchedulingOffer.findMany({where:{itemId:item.id},orderBy:{id:'asc'}}),preStale);
 const revoked=await make();let revoke=true;prisma.$use(async(params,next)=>{const value=await next(params);if(revoke&&params.model==='MonthlySchedulingItem'&&params.action==='findFirst'&&value?.id===revoked.id){revoke=false;await prisma.parentStudentLink.update({where:{parentId_studentId:{parentId:parent.id,studentId:revoked.studentId}},data:{canCreateRequests:false}});}return value;});
 await assert.rejects(submitMonthlySchedulingPreference({itemId:revoked.id,parentId:parent.id,intent:'KEEP'}),/access changed/);assert.equal((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:revoked.id}})).status,'NOT_SENT');
 const paused=await make();await assert.rejects(submitMonthlySchedulingPreference({itemId:paused.id,parentId:parent.id,intent:'PAUSE'}),/why next month/);assert.equal((await submitMonthlySchedulingPreference({itemId:paused.id,parentId:parent.id,intent:'PAUSE',parentNotes:'Family travelling during this month'})).status,'PAUSED');
 const excluded=await make('EXCLUDED');await assert.rejects(submitMonthlySchedulingPreference({itemId:excluded.id,parentId:parent.id,intent:'KEEP'}),/excluded/);
 assert.deepEqual({lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),feedback:await prisma.sessionFeedback.count(),outbox:await prisma.miniappNotificationOutbox.count()},before);
 const token=await createStaffMiniappSession(actor.id),parentToken=await createParentPortalSession(parent.id);writeFileSync('/tmp/sgt-r438-fixture.json',JSON.stringify({itemId:item.id,parentId:parent.id,token:token.token,parentToken:parentToken.token,month:'2045-03',courseName:course.name}));
 console.log(JSON.stringify({passed:true,parentReplyOptionsAndAuditAtomic:true,sameSlotGenerationsPreserveOriginalIds:true,auditRollback:true,concurrentReplyOnce:true,staleGenerationRejected:true,parentAccessRechecked:true,pauseReasonAndExcludedGuard:true,noTeachingLedgerMessagesWritten:true}));
}
main().finally(()=>prisma.$disconnect());

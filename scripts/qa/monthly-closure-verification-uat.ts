import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {monthlyClosureReviews,verifyMonthlyClosure} from '../../lib/monthly-closure-verification';
import {getMonthlySchedulingCampaign,monthlySchedulingQueueLane,listParentMonthlyScheduling} from '../../lib/monthly-scheduling';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r464-fixture.json','utf8')),base='http://127.0.0.1:3149';
  const token=await createStaffMiniappSession(actor.id),headers={Authorization:'Bearer '+token.token,'Content-Type':'application/json'};
  const r=await fetch(base+'/api/miniapp/staff/monthly-scheduling',{method:'PATCH',headers,body:JSON.stringify({action:'VERIFY_CLOSURE',itemId:f.itemId,expectedStatus:'PAUSED',expectedUpdatedAt:f.updatedAt,reason:'Parent confirmed the pause; all cancelled lessons and charges reviewed.',withdrawOptions:true})});assert.equal(r.status,200,await r.text());
  const view=await(await fetch(base+'/api/miniapp/staff/monthly-scheduling?month=2050-02&itemId='+f.itemId,{headers})).json();assert.equal(view.items[0].closureReview.needsReview,false);
  const observer=await prisma.user.findFirstOrThrow({where:{name:'Policy OBSERVER'}}),obs=await createStaffMiniappSession(observer.id);
  assert.equal((await fetch(base+'/api/miniapp/staff/monthly-scheduling',{method:'PATCH',headers:{...headers,Authorization:'Bearer '+obs.token},body:JSON.stringify({action:'VERIFY_CLOSURE',itemId:f.itemId})})).status,403);
  const cookie=randomUUID();await prisma.authSession.create({data:{userId:actor.id,token:cookie,expiresAt:new Date(Date.now()+3600000)}});
  const original=actor.language;
  try{for(const language of ['EN','ZH','BILINGUAL'] as const){
   await prisma.user.update({where:{id:actor.id},data:{language}});
   const res=await fetch(base+'/admin/monthly-scheduling?month=2050-02&cohort=BOSS_OTHER&status=PAUSED',{headers:{Cookie:'ts_admin_session='+cookie}});assert.equal(res.status,200);const html=await res.text();
   if(language!=='ZH')assert(html.includes('Verify pause / exclusion outcome'));
   if(language!=='EN')assert(html.includes('核验暂停／排除结果'));
  }}finally{await prisma.user.update({where:{id:actor.id},data:{language:original}});}
  console.log(JSON.stringify({passed:true,staffHTTPVerification:true,observerDenied:true,threeLanguageRenderedControls:true,noVisualClaim:true}));return;
 }
 const course=await prisma.course.create({data:{name:'Isolated closure course'}}),teacher=await prisma.teacher.create({data:{name:'Isolated closure teacher'}}),campus=await prisma.campus.findFirstOrThrow();
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2050-01-31T16:00:00Z')},create:{month:new Date('2050-01-31T16:00:00Z'),status:'OPEN'},update:{}});
 const make=async(status='PAUSED')=>{
  const student=await prisma.student.create({data:{name:'Isolated closure '+randomUUID().slice(0,6)}}),parent=await prisma.parentAccount.create({data:{name:'Isolated parent'}});
  await prisma.parentStudentLink.create({data:{parentId:parent.id,studentId:student.id}});
  const klass=await prisma.class.create({data:{courseId:course.id,teacherId:teacher.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
  const lesson=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt:new Date('2050-02-03T02:00Z'),endAt:new Date('2050-02-03T03:00Z'),attendances:{create:{studentId:student.id,status:'EXCUSED'}}}});
  const row=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,courseId:course.id,parentId:parent.id,token:randomUUID(),status,scheduledAt:new Date(),scheduleEvidenceJson:{version:1,sessions:[{id:lesson.id}]},parentNotes:'Original agreement retained',ownerName:'Original owner'}});
  for(const state of ['ACCEPTED','COMPLETED'])await prisma.monthlySchedulingOffer.create({data:{itemId:row.id,teacherId:teacher.id,status:state,generation:state==='ACCEPTED'?1:2,weekdayLabel:'THU',startMin:600,endMin:660,durationMin:60,acceptedAt:new Date(),sessionDatesJson:[{startAt:lesson.startAt.toISOString(),endAt:lesson.endAt.toISOString()}]}});
  return {row,lesson,student,parent,klass};
 };
 const f=await make();
 const read=()=>prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.row.id}});
 const input=async()=>({itemId:f.row.id,actorUserId:actor.id,expectedStatus:'PAUSED',expectedUpdatedAt:(await read()).updatedAt.toISOString(),reason:'Parent confirmed the pause; all cancelled lessons and charges reviewed.',withdrawOptions:true});
 const history=async()=>({item:await read(),offers:await prisma.monthlySchedulingOffer.findMany({where:{itemId:f.row.id},orderBy:{id:'asc'}}),audits:await prisma.auditLog.findMany({where:{entityId:f.row.id},orderBy:{id:'asc'}})});
 const business=()=>Promise.all([prisma.session.findUnique({where:{id:f.lesson.id},include:{attendances:true,feedbacks:true}}),prisma.packageTxn.findMany({where:{sessionId:f.lesson.id},orderBy:{id:'asc'}})]);
 const rejected=async(pattern:RegExp,overrides={})=>{const before=await history(),facts=await business();await assert.rejects(verifyMonthlyClosure({...await input(),...overrides}),pattern);assert.deepEqual(await history(),before);assert.deepEqual(await business(),facts);};
 await rejected(/Record the parent/,{reason:'short'});await rejected(/Record the parent/,{withdrawOptions:false});await rejected(/Item changed/,{expectedUpdatedAt:'stale'});
 for(const role of ['Policy OBSERVER','Policy FINANCE','Policy TEACHER']){const user=await prisma.user.findFirstOrThrow({where:{name:role}});await rejected(/Read-only|permission/,{actorUserId:user.id});}
 const attendance=await prisma.attendance.findFirstOrThrow({where:{sessionId:f.lesson.id}});
 await prisma.attendance.update({where:{id:attendance.id},data:{status:'PRESENT'}});await rejected(/remain active/);await prisma.attendance.update({where:{id:attendance.id},data:{status:'EXCUSED'}});
 const pkg=await prisma.coursePackage.create({data:{studentId:f.student.id,courseId:course.id,type:'HOURS',totalMinutes:120,remainingMinutes:60,validFrom:new Date('2049-01-01')}});
 await prisma.packageTxn.create({data:{sessionId:f.lesson.id,packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-60,note:'studentId='+f.student.id}});await rejected(/Net lesson ledger/);
 await prisma.packageTxn.create({data:{sessionId:f.lesson.id,packageId:pkg.id,kind:'ROLLBACK',deltaMinutes:60,note:'studentId='+f.student.id}});
 let fail=true;prisma.$use(async(p,next)=>{if(fail&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.action==='VERIFY_MONTHLY_CLOSURE')throw Error('forced closure verification audit');return next(p);});await rejected(/forced closure verification/);fail=false;
 const before=await history(),facts=await business(),same=await input();
 const race=await Promise.allSettled([verifyMonthlyClosure(same),verifyMonthlyClosure(same)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.deepEqual(await business(),facts);
 const saved=await read();assert.deepEqual(saved.scheduleEvidenceJson,f.row.scheduleEvidenceJson);assert.deepEqual(saved.scheduledAt,f.row.scheduledAt);assert.equal(saved.ownerName,f.row.ownerName);assert.equal(saved.parentNotes,f.row.parentNotes);
 const offers=await prisma.monthlySchedulingOffer.findMany({where:{itemId:f.row.id},orderBy:{id:'asc'}});assert(offers.every(o=>o.status==='WITHDRAWN'));for(const o of offers)assert.deepEqual(o.acceptedAt,before.offers.find(old=>old.id===o.id)!.acceptedAt);
 assert.equal((await monthlyClosureReviews([f.row.id])).get(f.row.id)?.needsReview,false);
 const completed=await history();await verifyMonthlyClosure(await input());assert.deepEqual(await history(),completed);
 const campaignView=await getMonthlySchedulingCampaign('2050-02');assert.equal(monthlySchedulingQueueLane(campaignView!.items.find(i=>i.id===f.row.id)!),'COMPLETED');
 assert.equal((await listParentMonthlyScheduling(f.parent.id)).find(i=>i.id===f.row.id)?.closureReview?.needsReview,false);
 // Fresh lesson, attendance, ledger and agreement changes make an old review invalid again.
 await prisma.attendance.update({where:{id:attendance.id},data:{status:'PRESENT'}});assert.equal((await monthlyClosureReviews([f.row.id])).get(f.row.id)?.needsReview,true);await prisma.attendance.update({where:{id:attendance.id},data:{status:'EXCUSED'}});
 const newLesson=await prisma.session.create({data:{classId:f.klass.id,studentId:f.student.id,startAt:new Date('2050-02-10T02:00Z'),endAt:new Date('2050-02-10T03:00Z')}});assert.equal((await monthlyClosureReviews([f.row.id])).get(f.row.id)?.needsReview,true);await rejected(/remain active/);await prisma.session.delete({where:{id:newLesson.id}});
 await prisma.monthlySchedulingItem.update({where:{id:f.row.id},data:{internalNote:'New parent arrangement to review'}});assert.equal((await monthlyClosureReviews([f.row.id])).get(f.row.id)?.needsReview,true);
 const missing=await make('EXCLUDED');await prisma.monthlySchedulingItem.update({where:{id:missing.row.id},data:{scheduleEvidenceJson:{sessions:[{id:randomUUID()}]}}});await assert.rejects(verifyMonthlyClosure({...same,itemId:missing.row.id,expectedStatus:'EXCLUDED',expectedUpdatedAt:(await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:missing.row.id}})).updatedAt.toISOString()}),/missing/);
 const charged=await make('EXCLUDED');const cp=await prisma.coursePackage.create({data:{studentId:charged.student.id,courseId:course.id,type:'HOURS',totalMinutes:120,remainingMinutes:60,validFrom:new Date('2049-01-01')}});
 await prisma.attendance.updateMany({where:{sessionId:charged.lesson.id},data:{packageId:cp.id,excusedCharge:true,deductedMinutes:60}});
 await prisma.packageTxn.create({data:{sessionId:charged.lesson.id,packageId:cp.id,kind:'DEDUCT',deltaMinutes:-60,note:'studentId='+charged.student.id}});
 const chargeBefore=await prisma.coursePackage.findUniqueOrThrow({where:{id:cp.id}});
 await verifyMonthlyClosure({...same,itemId:charged.row.id,expectedStatus:'EXCLUDED',expectedUpdatedAt:charged.row.updatedAt.toISOString()});assert.deepEqual(await prisma.coursePackage.findUniqueOrThrow({where:{id:cp.id}}),chargeBefore);
 const ambiguous=await make();await prisma.class.update({where:{id:ambiguous.klass.id},data:{capacity:2,enrollments:{create:[{studentId:ambiguous.student.id},{studentId:f.student.id}]}}});await prisma.session.update({where:{id:ambiguous.lesson.id},data:{studentId:null}});
 await prisma.packageTxn.create({data:{sessionId:ambiguous.lesson.id,packageId:cp.id,kind:'DEDUCT',deltaMinutes:-60}});
 await assert.rejects(verifyMonthlyClosure({...same,itemId:ambiguous.row.id,expectedUpdatedAt:ambiguous.row.updatedAt.toISOString()}),/ownership needs review/);
 const http=await make();writeFileSync('/tmp/sgt-r464-fixture.json',JSON.stringify({itemId:http.row.id,updatedAt:http.row.updatedAt.toISOString()}));
 console.log(JSON.stringify({passed:true,activeAndUnreconciledLessonsBlocked:true,historyAndBusinessUnchanged:true,explicitOptionsWithdrawal:true,currentRoles:true,atomicAuditRollback:true,concurrentAndRepeatedOnce:true,sourceChangesReopenReview:true,missingHistoryNotInferred:true,parentAndStaffSameFacts:true,chargedCancellationPreserved:true,ambiguousSharedLedgerBlocked:true}));
}
const timer=setTimeout(()=>{throw Error('Closure verification UAT timeout');},90000);main().finally(()=>{clearTimeout(timer);return prisma.$disconnect();});

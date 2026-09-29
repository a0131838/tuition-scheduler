import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {expireMonthlySchedulingOfferHolds} from '../../lib/monthly-scheduling';
async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const now=new Date('2026-09-01T00:00:00Z'),past=new Date(+now-1000),future=new Date(+now+3600000),course=await prisma.course.findFirstOrThrow(),teacher=await prisma.teacher.findFirstOrThrow();
 const campaign=await prisma.monthlySchedulingCampaign.upsert({where:{month:new Date('2045-01-31T16:00:00Z')},create:{month:new Date('2045-01-31T16:00:00Z'),status:'OPEN'},update:{}});
 async function make(){const student=await prisma.student.create({data:{name:'Hold expiry isolated '+randomUUID().slice(0,4)}});const item=await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:student.id,courseId:course.id,token:randomUUID(),status:'PARENT_SELECTED'}});const offer=await prisma.monthlySchedulingOffer.create({data:{itemId:item.id,teacherId:teacher.id,status:'HELD',holdExpiresAt:past,parentRank:1,weekdayLabel:'MON',startMin:600,endMin:660,durationMin:60,sessionDatesJson:[]}});return {item,offer};}
 const first=await make();let renewed=false;
 prisma.$use(async(params,next)=>{const value=await next(params);if(!renewed&&params.model==='MonthlySchedulingOffer'&&params.action==='findMany'&&Array.isArray(value)&&value.some(r=>r.id===first.offer.id)) {renewed=true;await prisma.monthlySchedulingOffer.update({where:{id:first.offer.id},data:{holdExpiresAt:future}});}return value;});
 const before={lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),feedback:await prisma.sessionFeedback.count()};
 await expireMonthlySchedulingOfferHolds(now);
 assert.equal((await prisma.monthlySchedulingOffer.findUniqueOrThrow({where:{id:first.offer.id}})).status,'HELD');assert.equal((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:first.item.id}})).status,'PARENT_SELECTED');assert.equal(await prisma.auditLog.count({where:{entityId:first.item.id,action:'EXPIRE_TIME_HOLD'}}),0);
 await prisma.monthlySchedulingOffer.update({where:{id:first.offer.id},data:{holdExpiresAt:past}});assert.equal(await expireMonthlySchedulingOfferHolds(now),1);assert.equal((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:first.item.id}})).status,'OFFERED');assert.equal(await prisma.auditLog.count({where:{entityId:first.item.id,action:'EXPIRE_TIME_HOLD'}}),1);
 assert.equal(await expireMonthlySchedulingOfferHolds(now),0);
 const second=await make();await prisma.monthlySchedulingOffer.create({data:{itemId:second.item.id,teacherId:teacher.id,status:'HELD',holdExpiresAt:future,parentRank:2,weekdayLabel:'TUE',startMin:600,endMin:660,durationMin:60,sessionDatesJson:[]}});assert.equal(await expireMonthlySchedulingOfferHolds(now),1);assert.equal((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:second.item.id}})).status,'PARENT_SELECTED');
 const third=await make();let failAudit=true;prisma.$use(async(params,next)=>{if(failAudit&&params.model==='AuditLog'&&params.action==='create'&&params.args.data.entityId===third.item.id)throw Error('forced hold expiry audit failure');return next(params);});
 await assert.rejects(expireMonthlySchedulingOfferHolds(now),/forced hold expiry/);failAudit=false;assert.equal((await prisma.monthlySchedulingOffer.findUniqueOrThrow({where:{id:third.offer.id}})).status,'HELD');assert.equal((await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:third.item.id}})).status,'PARENT_SELECTED');
 const concurrent=await Promise.all([expireMonthlySchedulingOfferHolds(now),expireMonthlySchedulingOfferHolds(now)]);assert.equal(concurrent.reduce((a,b)=>a+b,0),1);assert.equal(await prisma.auditLog.count({where:{entityId:third.item.id,action:'EXPIRE_TIME_HOLD'}}),1);
 assert.deepEqual({lessons:await prisma.session.count(),ledger:await prisma.packageTxn.count(),feedback:await prisma.sessionFeedback.count()},before);
 console.log(JSON.stringify({passed:true,renewedHoldSurvivesStaleScan:true,expiryAuditedOnce:true,remainingLiveHoldPreservesSelection:true,auditFailureRollback:true,concurrentExpiryOnce:true,noTeachingOrLedgerWrites:true}));
}
main().finally(()=>prisma.$disconnect());

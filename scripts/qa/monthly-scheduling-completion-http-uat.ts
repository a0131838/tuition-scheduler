import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {createParentPortalSession} from '../../lib/parent-portal';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r435-fixture.json','utf8')),base='http://127.0.0.1:3149';
 const send=(token:string,body:unknown)=>fetch(base+'/api/miniapp/staff/monthly-scheduling',{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const itemNow=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.browserItemId}});
 if(itemNow.status==='SCHEDULED') {const reset=await send(f.token,{itemId:itemNow.id,status:'MATCHED',expectedStatus:'SCHEDULED',expectedUpdatedAt:itemNow.updatedAt.toISOString(),internalNote:'Isolated browser repeat acceptance'});assert.equal(reset.status,200);}
 const initial=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:f.browserItemId}});
 for(const role of ['FINANCE','OBSERVER','SALES','TEACHER']){
  const user=await prisma.user.findFirstOrThrow({where:{name:`Policy ${role}`},orderBy:{createdAt:'desc'}}),token=await createStaffMiniappSession(user.id);
  assert.ok([401,403].includes((await send(token.token,{itemId:initial.id,status:'SCHEDULED',expectedStatus:'MATCHED'})).status),role);
 }
 let response=await send(f.token,{itemId:initial.id,status:'SCHEDULED',expectedStatus:'MATCHED'});assert.equal(response.status,409);assert.match(await response.text(),/web workspace/);
 response=await send(f.token,{itemId:initial.id,status:'PAUSED',expectedStatus:'MATCHED'});assert.equal(response.status,409);
 assert.deepEqual(await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:initial.id}}),initial);
 const all=await(await fetch(base+`/api/miniapp/staff/monthly-scheduling?month=${f.month}&status=ALL`,{headers:{Authorization:`Bearer ${f.token}`}})).json();
 assert.equal(all.items.find((r:any)=>r.id===f.historicalItemId).completionNeedsReview,true);
 assert.equal(all.items.find((r:any)=>r.id===f.itemId).completionNeedsReview,false);
 const review=await(await fetch(base+`/api/miniapp/staff/monthly-scheduling?month=${f.month}&status=EXCEPTIONS`,{headers:{Authorization:`Bearer ${f.token}`}})).json();assert.ok(review.items.some((r:any)=>r.id===f.historicalItemId));
 const ready=await(await fetch(base+`/api/miniapp/staff/monthly-scheduling?month=${f.month}&status=READY_CONFIRM`,{headers:{Authorization:`Bearer ${f.token}`}})).json();assert.ok(ready.items.some((r:any)=>r.id===initial.id));
 const scoped=await prisma.monthlySchedulingItem.findMany({where:{id:{in:[f.itemId,f.historicalItemId]}}});
 const parent=await prisma.parentAccount.create({data:{name:'Isolated monthly parent',studentLinks:{create:scoped.map(i=>({studentId:i.studentId,canCreateRequests:true}))}}}),parentSession=await createParentPortalSession(parent.id);
 const parentData=await(await fetch(base+'/api/miniapp/monthly-scheduling',{headers:{Authorization:`Bearer ${parentSession.token}`}})).json();
 assert.equal(parentData.items.length,2);assert.equal(parentData.items.find((i:any)=>i.id===f.itemId).completionNeedsReview,false);assert.equal(parentData.items.find((i:any)=>i.id===f.historicalItemId).completionNeedsReview,true);
 assert.ok(!JSON.stringify(parentData).includes('Follow-up note only'));assert.ok(!JSON.stringify(parentData).includes('scheduleEvidenceJson'));
 console.log(JSON.stringify({passed:true,fourRolesDenied:true,legacyMiniCannotBypassEvidence:true,pauseReasonRequired:true,failedWritesUnchanged:true,miniQueueAndReviewMatchWeb:true,parentScopeAndReviewMatch:true}));
}
main().finally(()=>prisma.$disconnect());

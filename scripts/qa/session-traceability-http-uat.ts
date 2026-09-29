import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {linkTicketResults} from '../../lib/ticket-existing-results';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r433-fixture.json','utf8')),base='http://127.0.0.1:3149';
 const before=await prisma.session.findUniqueOrThrow({where:{id:f.sessionId},include:{feedbacks:true,attendances:true}}),ledgerBefore=await prisma.packageTxn.findMany({where:{sessionId:{in:[f.sourceSessionId,f.sessionId]}}});
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),action=await prisma.ticketSchedulingAction.findFirstOrThrow({where:{ticketId:f.ticketId}});
 // Exercise the existing explicit result workflow. Linking does not create a lesson or alter ledger/feedback.
 await linkTicketResults({ticketId:f.ticketId,actionId:action.id,resultSessionIds:[f.sessionId],verified:true,note:'Isolated exact original and result review',confirmedChange:true,user:owner});
 const saved=await prisma.ticketSchedulingAction.findUniqueOrThrow({where:{id:action.id}});assert.equal(saved.sourceSessionId,f.sourceSessionId);assert.ok(saved.resultSessionIds.includes(f.sessionId));
 const login=async(email:string,password:string,portal='admin')=>{const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal})});assert.equal(r.status,200);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');};
 const cookie=await login(owner.email,'LocalUAT-Cancellation-20260928');
 for(const id of [f.sessionId,f.archivedId]){const r=await fetch(base+`/admin/sessions/${id}/attendance`,{headers:{Cookie:cookie}});assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(f.sessionId));assert.ok(html.includes(f.archivedId));assert.ok(html.includes('原课、结果课与历史'));}
 const unrelated=await(await fetch(base+`/admin/sessions/${f.unrelatedId}/attendance`,{headers:{Cookie:cookie}})).text();assert.ok(!unrelated.includes(f.ticketId));
 const teacher=JSON.parse(readFileSync('/tmp/sgt-r431-teacher.json','utf8')),teacherCookie=await login(teacher.email,teacher.password,'teacher');const denied=await fetch(base+`/admin/sessions/${f.sessionId}/attendance`,{headers:{Cookie:teacherCookie},redirect:'manual'});assert.ok([303,307,403].includes(denied.status));
 assert.deepEqual(await prisma.session.findUniqueOrThrow({where:{id:f.sessionId},include:{feedbacks:true,attendances:true}}),before);assert.deepEqual(await prisma.packageTxn.findMany({where:{sessionId:{in:[f.sourceSessionId,f.sessionId]}}}),ledgerBefore);
 console.log(JSON.stringify({passed:true,existingExplicitResultWorkflow:true,exactOriginalAndResultRetained:true,webCurrentAndArchived:true,unrelatedExcluded:true,teacherScopePreserved:true,ledgerAttendanceFeedbackUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

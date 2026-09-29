import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r434-fixture.json','utf8')),base='http://127.0.0.1:3149';
 const login=async(email:string,password:string,portal='admin')=>{const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal})});assert.equal(r.status,200);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');};
 const teacher=await login(f.email,f.password,'teacher'),owner=await login('zhaohongwei0880@gmail.com','LocalUAT-Cancellation-20260928'),mini={Authorization:`Bearer ${f.token}`};
 const ledger=await prisma.packageTxn.findMany({where:{sessionId:f.sessionId}}),packages=await prisma.coursePackage.findMany({where:{studentId:f.studentA}});
 const send=(path:string,headers:Record<string,string>,items:unknown[])=>fetch(base+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({items}),redirect:'manual'});
 for(const id of [f.sessionId,f.fixedSessionId]){
  const rows=await(await fetch(base+`/api/miniapp/staff/schedule/${id}/attendance`,{headers:mini})).json();assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].studentId,f.studentA);
  assert.equal((await send(`/api/teacher/sessions/${id}/attendance`,{Cookie:teacher},[{studentId:f.studentA,status:'PRESENT'}])).status,200);
  assert.equal((await send(`/api/miniapp/staff/schedule/${id}/attendance`,mini,[{studentId:f.studentA,status:'LATE'}])).status,200);
  assert.equal((await send(`/api/teacher/sessions/${id}/attendance`,{Cookie:teacher},[{studentId:f.studentB,status:'PRESENT'}])).status,409);
 }
 const ambiguous=await(await fetch(base+`/api/miniapp/staff/schedule/${f.ambiguousSessionId}/attendance`,{headers:mini})).json();assert.equal(ambiguous.rows.length,0);assert.equal(ambiguous.rosterNeedsReview,true);
 assert.equal((await send(`/api/miniapp/staff/schedule/${f.ambiguousSessionId}/attendance`,mini,[{studentId:f.studentA,status:'PRESENT'}])).status,409);
 for(const [prefix,cookie] of [['admin',owner],['teacher',teacher]]){const path=prefix==='admin'?`/admin/sessions/${f.sessionId}/attendance`:`/teacher/sessions/${f.sessionId}`;const html=await(await fetch(base+path,{headers:{Cookie:cookie}})).text();assert.ok(html.includes('Explicit session student A'));}
 const reviewPage=await(await fetch(base+`/teacher/sessions/${f.ambiguousSessionId}`,{headers:{Cookie:teacher}})).text();assert.ok(reviewPage.includes('Student assignment needs review'));assert.ok(!reviewPage.includes('All 0 students marked'));assert.ok(!reviewPage.includes('Attendance is complete for 0 students'));
 assert.deepEqual(await prisma.packageTxn.findMany({where:{sessionId:f.sessionId}}),ledger);assert.deepEqual(await prisma.coursePackage.findMany({where:{studentId:f.studentA}}),packages);assert.equal(await prisma.attendance.count({where:{sessionId:f.ambiguousSessionId}}),0);
 console.log(JSON.stringify({passed:true,webMiniSameExactRoster:true,explicitAndClassDefault:true,foreignStudentRejected:true,ambiguousDenied:true,adminTeacherPages:true,ledgerPackageUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const fixture=JSON.parse(readFileSync('/tmp/sgt-r425-fixture.json','utf8'));
 const before=await prisma.studentContract.findUniqueOrThrow({where:{id:fixture.contractId}});
 const base='http://127.0.0.1:3149',path=`/admin/packages/${fixture.packageId}/contract`;
 const password='LocalUAT-Void-20260928',salt=randomBytes(16).toString('hex');
 for(const role of ['ADMIN','FINANCE','OBSERVER','SALES','CS'] as const){
  const user=await prisma.user.create({data:{email:`void-${randomUUID()}@example.invalid`,name:`Void UAT ${role}`,role:role==='OBSERVER'?'ADMIN':role,isObserver:role==='OBSERVER',language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
  const login=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'admin'})});assert.equal(login.status,200);
  const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const page=await fetch(base+path,{headers:{Cookie},redirect:'manual'});
  if(['FINANCE','SALES','CS'].includes(role)){assert.ok([303,307,308].includes(page.status));continue;}
  assert.equal(page.status,200);const html=await page.text();const form=[...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]).find(f=>f.includes('Void signed contract only'));assert.ok(form,'Signed contract void form exists');
  const inputs=[...form.matchAll(/<input\b[^>]*>/g)].flatMap(m=>{const name=m[0].match(/name="([^"]+)"/)?.[1];const value=m[0].match(/value="([^"]*)"/)?.[1]??'';return name?[[name,value.replaceAll('&amp;','&').replaceAll('&quot;','"')]]:[];});
  assert.ok(inputs.some(([name,value])=>name==='expectedUpdatedAt'&&value===fixture.expectedUpdatedAt));
  if(role==='OBSERVER'){
   const response=await fetch(base+path,{method:'POST',headers:{Cookie,Origin:base},body:new URLSearchParams({contractId:fixture.contractId,packageId:fixture.packageId,reason:'Observer denial'}),redirect:'manual'});assert.equal(response.status,403);
  }

 }
 assert.deepEqual(await prisma.studentContract.findUniqueOrThrow({where:{id:fixture.contractId}}),before);assert.equal(await prisma.studentContractEvent.count({where:{contractId:fixture.contractId,eventType:'VOIDED'}}),0);
 console.log(JSON.stringify({passed:true,adminReadPreserved:true,financeRouteRestrictionPreserved:true,observerMutationDenied:true,resourceOnlyDenied:true,rejectedFormsLeaveContractUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

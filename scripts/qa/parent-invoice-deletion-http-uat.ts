import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r429-fixture.json','utf8')),base='http://127.0.0.1:3149',path=`/admin/packages/${f.packageId}/billing`;
 const before=await prisma.appSetting.findUnique({where:{key:'parent_billing_v1'}});
 const password='LocalUAT-Archive-Permissions',salt=randomBytes(16).toString('hex');
 for(const role of ['ADMIN','FINANCE','OBSERVER','SALES','CS'] as const){
  const user=await prisma.user.create({data:{email:`archive-${randomUUID()}@example.invalid`,name:`Archive UAT ${role}`,role:role==='OBSERVER'?'ADMIN':role,isObserver:role==='OBSERVER',language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
  const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'admin'})});assert.equal(r.status,200);const Cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const response=await fetch(base+path,{headers:{Cookie},redirect:'manual'});
  if(['SALES','CS'].includes(role)){assert.ok([303,307,308].includes(response.status));continue;}
  if(role==='FINANCE'&&[303,307,308].includes(response.status))continue;
  assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('Deletion review reason'));assert.ok(html.includes('expectedUpdatedAt'));assert.ok(html.includes('Archive incorrect draft'));
  if(role==='OBSERVER'){const denied=await fetch(base+path,{method:'POST',headers:{Cookie,Origin:base},body:new URLSearchParams({packageId:f.packageId,invoiceId:f.invoiceId,reason:'Observer must not archive'}),redirect:'manual'});assert.equal(denied.status,403);}
 }
 assert.deepEqual(await prisma.appSetting.findUnique({where:{key:'parent_billing_v1'}}),before);
 console.log(JSON.stringify({passed:true,fiveRoleBoundaries:true,versionedReviewForm:true,observerMutationDenied:true,billingUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

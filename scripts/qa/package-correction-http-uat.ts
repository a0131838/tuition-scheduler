import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const fixture=JSON.parse(readFileSync('/tmp/sgt-r426-fixture.json','utf8')),base='http://127.0.0.1:3149',path=`/admin/packages/${fixture.packageId}/billing`;
 const snapshot=()=>Promise.all([prisma.coursePackage.findUnique({where:{id:fixture.packageId}}),prisma.packageTxn.findMany({where:{packageId:fixture.packageId},orderBy:{id:'asc'}}),prisma.studentContract.findMany({where:{packageId:fixture.packageId},orderBy:{id:'asc'}}),prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','parent_receipt_approval_v1']}},orderBy:{key:'asc'}}),prisma.auditLog.count()]);const before=await snapshot();
 const password='LocalUAT-Correction-20260928',salt=randomBytes(16).toString('hex');
 for(const role of ['ADMIN','FINANCE','OBSERVER','SALES','CS','TEACHER','OPS'] as const){
  const user=await prisma.user.create({data:{email:`correction-${randomUUID()}@example.invalid`,name:`Correction UAT ${role}`,role:role==='OBSERVER'?'ADMIN':role==='OPS'?'TEACHER':role,isObserver:role==='OBSERVER',language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
  if(role==='OPS')await prisma.operationsAdminAcl.create({data:{email:user.email,note:'Isolated correction acceptance'}});
  const login=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'admin'})});
  if(role==='TEACHER'&&login.status!==200){assert.equal(login.status,403);continue;}assert.equal(login.status,200);
  const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const response=await fetch(base+path+'?view=correction&target=64.5',{headers:{Cookie},redirect:'manual'});
  if(['SALES','CS','TEACHER','OPS'].includes(role)){assert.ok([303,307,308].includes(response.status));const denied=await response.text();assert.ok(!denied.includes('Projected package result'));continue;}
  assert.equal(response.status,200);let html=await response.text();assert.ok(html.includes('Projected package result'));assert.ok(html.includes('35.5 hours'));assert.ok(html.includes('SGD 8000.00'));assert.ok(html.includes('Contract history (33)'));
  const invalid=await fetch(base+path+'?view=correction&target=50',{headers:{Cookie}});assert.ok((await invalid.text()).includes('Proposed cancellation exceeds'));
  const original=await fetch(base+path,{headers:{Cookie}});assert.equal(original.status,200);assert.ok((await original.text()).includes('Review a transaction correction'));
  if(role==='ADMIN'){
   const repeated=await fetch(base+path+'?view=correction&target=64.5&target=50',{headers:{Cookie}});assert.ok((await repeated.text()).includes('Enter a nonnegative quantity'));
   const context=await (await fetch(base+path+'?view=correction&source=receipts&receiptsBack='+encodeURIComponent('/admin/receipts-approvals?focus=pending'),{headers:{Cookie}})).text();assert.ok(context.includes('name="source" value="receipts"'));assert.ok(context.includes('name="receiptsBack"'));
   for(const language of ['ZH','BILINGUAL'] as const){await prisma.user.update({where:{id:user.id},data:{language}});html=await (await fetch(base+path+'?view=correction&target=64.5',{headers:{Cookie}})).text();assert.ok(html.includes('交易纠错核对'));assert.ok(html.includes('课包预计结果'));if(language==='ZH')assert.ok(!html.includes('Projected package result'));}
   await prisma.user.update({where:{id:user.id},data:{language:'EN'}});writeFileSync('/tmp/sgt-r426-browser.json',JSON.stringify({email:user.email,password,url:base+path+'?view=correction',userId:user.id}));
   const missing=await fetch(base+'/admin/packages/'+randomUUID()+'/billing?view=correction',{headers:{Cookie}});const missingHtml=await missing.text();assert.ok(missingHtml.includes('404'));assert.ok(!missingHtml.includes('Projected package result'));
  }
 }
 assert.deepEqual(await snapshot(),before);console.log(JSON.stringify({passed:true,sevenRoleBoundaries:true,threeLanguages:true,originalBillingPreserved:true,negativePreviewBlocked:true,all33ContractsRetained:true,businessSourcesUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

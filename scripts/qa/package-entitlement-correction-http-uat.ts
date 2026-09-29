import assert from 'node:assert/strict';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {readPackageCorrection} from '../../lib/package-correction-evidence';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const base='http://127.0.0.1:3149',student=await prisma.student.create({data:{name:`Correction HTTP ${randomUUID()}`}}),course=await prisma.course.findFirstOrThrow();
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',totalMinutes:6000,remainingMinutes:2130,validFrom:new Date('2026-03-01')}}),source=await prisma.packageTxn.create({data:{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:6000}});await prisma.packageTxn.create({data:{packageId:pkg.id,kind:'DEDUCT',deltaMinutes:-3870}});
 const path=`/api/admin/packages/${pkg.id}/corrections`,data=await readPackageCorrection(pkg.id),input={sourceTxnId:source.id,requestKey:randomUUID(),fingerprint:data!.fingerprint,target:'64.5',reason:'Finance confirmed wrong original quantity',evidence:'Paid64.5hours confirmed; cancel unused erroneous entitlement only',acknowledged:true};
 const login=async(email:string,password:string)=>{const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal:'admin'})});return {response:r,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};};
 const owner=await login('zhaohongwei0880@gmail.com','LocalUAT-Cancellation-20260928');assert.equal(owner.response.status,200);
 const send=(cookie:string,body:unknown,url=path,method='POST')=>fetch(base+url,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 const password='LocalUAT-Correction-Permissions',salt=randomBytes(16).toString('hex');
 for(const role of ['ADMIN','FINANCE','OBSERVER','SALES','CS','TEACHER','OPS'] as const){const user=await prisma.user.create({data:{email:`correction-denied-${randomUUID()}@example.invalid`,name:role,role:role==='OBSERVER'||role==='OPS'?'ADMIN':role,isObserver:role==='OBSERVER',language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});if(role==='OPS')await prisma.operationsAdminAcl.create({data:{email:user.email,note:'Isolated test'}});const signed=await login(user.email,password);if(role==='TEACHER'&&signed.response.status===403)continue;assert.equal(signed.response.status,200);const denied=await send(signed.cookie,input);assert.ok([403,303,307].includes(denied.status));const page=await fetch(base+`/admin/packages/${pkg.id}/billing?view=correction&target=64.5`,{headers:{Cookie:signed.cookie},redirect:'manual'});assert.ok(!(await page.text()).includes('Owner: record the reviewed correction'));}
 assert.equal(await prisma.packageEntitlementCorrection.count({where:{packageId:pkg.id}}),0);
 assert.equal((await send(owner.cookie,{...input,fingerprint:'0'.repeat(64)})).status,409);assert.equal((await send(owner.cookie,{...input,acknowledged:false})).status,400);
 const race=await Promise.all([send(owner.cookie,input),send(owner.cookie,{minutes:60,note:'Gift race fixture'},`/api/admin/packages/${pkg.id}/ledger/gift`),send(owner.cookie,{minutes:120,note:'Gift race fixture'},`/api/admin/packages/${pkg.id}/ledger/gift`)]);assert.ok([200,409].includes(race[0].status));assert.equal(race[1].status,200);assert.equal(race[2].status,200);
 if(race[0].status!==200){input.fingerprint=(await readPackageCorrection(pkg.id))!.fingerprint;assert.equal((await send(owner.cookie,input)).status,200);}
 const repeat=await send(owner.cookie,input);assert.equal(repeat.status,200);const result=await repeat.json();assert.equal(await prisma.packageEntitlementCorrection.count({where:{packageId:pkg.id}}),1);
 const after=await readPackageCorrection(pkg.id);assert.equal(after?.facts.storedRemaining,180);assert.equal(after?.facts.balance,180);assert.equal(after?.facts.recordedTotal,3870);assert.equal(after?.facts.issues.length,0);
 assert.equal((await send(owner.cookie,{deltaMinutes:6000},`/api/admin/packages/${pkg.id}/ledger/txns/${source.id}`,'PATCH')).status,409);
 const record=await prisma.packageEntitlementCorrection.findUniqueOrThrow({where:{id:result.id}});assert.equal((await fetch(base+`/api/admin/packages/${pkg.id}/ledger/txns/${record.adjustmentTxnId}`,{method:'DELETE',headers:{Cookie:owner.cookie}})).status,409);
 assert.equal((await fetch(base+`/api/admin/packages/${pkg.id}`,{method:'DELETE',headers:{Cookie:owner.cookie}})).status,409);
 assert.equal(await prisma.packageTxn.count({where:{packageId:pkg.id,kind:'GIFT'}}),2);assert.equal((await prisma.packageTxn.findUniqueOrThrow({where:{id:source.id}})).deltaMinutes,6000);
 console.log(JSON.stringify({passed:true,ownerOnly:true,sevenRoleDenials:true,staleRejected:true,idempotent:true,giftRacePreservesBalance:true,protectedSourceAndAdjustment:true,packageId:pkg.id}));
}
main().finally(()=>prisma.$disconnect());

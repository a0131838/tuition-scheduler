import assert from 'node:assert/strict';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const fixture=JSON.parse(readFileSync('/tmp/sgt-r423-fixture.json','utf8'));
 const assignment=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{kind_documentId:{kind:'PARTNER_INVOICE',documentId:fixture.invoiceId}}});
 const password='LocalUAT-Evidence-20260928',salt=randomBytes(16).toString('hex');
 for(const role of ['ADMIN','SALES','CS','FINANCE','TEACHER','OBSERVER','OPS'] as const){
  const user=await prisma.user.create({data:{email:`evidence-${randomUUID()}@example.invalid`,name:`Evidence UAT ${role}`,role:role==='OBSERVER'?'ADMIN':role==='OPS'?'TEACHER':role,isObserver:role==='OBSERVER',language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
  if(role==='OPS')await prisma.operationsAdminAcl.create({data:{email:user.email,note:'Isolated financial visibility acceptance'}});
  const login=await fetch('http://127.0.0.1:3149/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'admin'})});
  if(role==='TEACHER'&&login.status!==200){assert.equal(login.status,403);continue;}assert.equal(login.status,200);
  const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  for(const path of [`/admin/leads/${assignment.leadId}`,`/admin/relationships/${assignment.relationshipId}`]){
   const response=await fetch(`http://127.0.0.1:3149${path}`,{headers:{Cookie},redirect:'manual'});
   if(role==='FINANCE'||role==='TEACHER'){assert.ok([303,307,308].includes(response.status));continue;}
   assert.equal(response.status,200);const html=await response.text();
   if(role==='ADMIN'||role==='OBSERVER'){assert.ok(html.includes(assignment.documentId));if(role==='OBSERVER')assert.ok(!html.includes('Save reviewed invoice attribution'));}
   else {assert.ok(!html.includes(assignment.documentId));assert.ok(!html.includes(assignment.reviewNote));assert.ok(html.includes('An authorized administrator can review contract evidence'));}
  }
 }
 const billing=JSON.parse((await prisma.appSetting.findUniqueOrThrow({where:{key:'partner_billing_v1'}})).value);
 const source=billing.invoices.find((i:{id:string})=>i.id===assignment.documentId);assert.equal(source.totalAmount,109);
 assert.equal(billing.receipts.find((r:{invoiceId:string})=>r.invoiceId===assignment.documentId).amountReceived,50);
 assert.equal(await prisma.auditLog.count({where:{entityId:assignment.id,action:'ATTACH_PARTNER_INVOICE'}}),1);assert.equal(await prisma.auditLog.count({where:{entityId:assignment.id,action:'REVOKE'}}),1);
 assert.equal((await prisma.lead.findUniqueOrThrow({where:{id:assignment.leadId}})).status,'Contacted');
 console.log(JSON.stringify({passed:true,sevenRoleHttp:true,noInvoiceDataLeakToSalesCsOps:true,observerReadOnly:true,browserAttachAndRevokeExactlyOnce:true,invoiceAndReceiptsUnchanged:true,pipelineUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

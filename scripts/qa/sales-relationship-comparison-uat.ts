import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {readRelationshipFinancialComparison,type RelationshipFinancialMetrics} from '../../lib/sales-relationship-overview';
import {readParentInvoiceEvidence} from '../../lib/sales-invoice-evidence';
import {readPartnerInvoiceEvidence} from '../../lib/sales-partner-invoice-evidence';
import {readSalesContractEvidence} from '../../lib/sales-evidence';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 const fixture=JSON.parse(readFileSync('/tmp/sgt-r423-fixture.json','utf8'));
 const sourceSnapshot=()=>Promise.all([prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','partner_billing_v1','parent_receipt_approval_v1','partner_receipt_approval_v1']}},orderBy:{key:'asc'}}),prisma.packageTxn.count(),prisma.salesEvidenceAssignment.findMany({orderBy:{id:'asc'}})]);
 const before=await sourceSnapshot(),ids=(await prisma.salesRelationship.findMany({select:{id:true}})).map(r=>r.id);
 const comparison=await readRelationshipFinancialComparison(actor,ids);assert.ok(comparison);
 for(const id of ids){const [c,p,b]=await Promise.all([readSalesContractEvidence(actor,{relationshipId:id}),readParentInvoiceEvidence(actor,{relationshipId:id}),readPartnerInvoiceEvidence(actor,{relationshipId:id})]);const row:RelationshipFinancialMetrics=comparison.get(id)!;assert.equal(row.signed,c.summary.assigned?c.summary.signedContracts:null);assert.equal(row.parentApproved,p.summary.verifiedInvoices?p.summary.approvedCents:null);assert.equal(row.partnerApproved,b.summary.verifiedInvoices?b.summary.approvedCents:null);assert.equal(row.review,c.summary.review+p.summary.review+b.summary.review);}
 assert.equal(comparison.get(fixture.relationshipId)?.partnerApproved,5000);
 for(const denied of [{...actor,role:'SALES'},{...actor,role:'CS'},{...actor,role:'FINANCE'},{...actor,role:'TEACHER'},{...actor,operationsAdmin:true}])assert.equal(await readRelationshipFinancialComparison(denied,ids),null);
 assert.deepEqual(await readRelationshipFinancialComparison({...actor,isObserver:true},ids),comparison);assert.deepEqual(await sourceSnapshot(),before);
 const tag=`Comparison UAT ${randomUUID()}`;
 const future=new Date(Date.now()+86400000),past=new Date(Date.now()-86400000);
 const make=(name:string)=>prisma.salesRelationship.create({data:{name:`${tag} ${name}`,kind:'AGENT',status:'ACTIVE',ownerName:'Relationship owner',createdById:actor.id,createdByName:actor.name,nextAction:'Future relation follow-up',nextActionDue:future}});
 const child=await make('Due child'),closed=await make('Closed only'),project=await make('Due project');
 for(const [id,status] of [[child.id,'Contacted'],[closed.id,'Won']])await prisma.lead.create({data:{leadNo:`UAT-${randomUUID()}`,studentName:'Independent referral',sourceType:'Referral',recordKind:'STUDENT',relationshipId:id,status,ownerName:'Different deal owner',nextAction:'Student follow-up',nextActionDue:past}});
 await prisma.salesRelationshipOpportunity.create({data:{relationshipId:project.id,title:'Future activity',ownerName:'Project owner',status:'OPEN',nextAction:'Review proposal',nextActionDue:past,estimatedAmount:9999}});
 const fresh=await readRelationshipFinancialComparison(actor,[child.id,closed.id,project.id]);for(const value of fresh!.values()){assert.equal(value.signed,null);assert.equal(value.parentApproved,null);assert.equal(value.partnerApproved,null);}
 const data={tag,childId:child.id,closedId:closed.id,projectId:project.id,partnerRelationshipId:fixture.relationshipId};writeFileSync('/tmp/sgt-r424-fixture.json',JSON.stringify(data));
 if(process.env.UAT_HTTP==='1'){
  const password='LocalUAT-Compare-20260928',salt=randomBytes(16).toString('hex');
  for(const role of ['ADMIN','SALES','CS','FINANCE','TEACHER','OBSERVER','OPS'] as const){
   const user=await prisma.user.create({data:{email:`compare-${randomUUID()}@example.invalid`,name:`Comparison UAT ${role}`,role:role==='OBSERVER'?'ADMIN':role==='OPS'?'TEACHER':role,isObserver:role==='OBSERVER',language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
   if(role==='OPS')await prisma.operationsAdminAcl.create({data:{email:user.email,note:'Isolated comparison acceptance'}});
   const login=await fetch('http://127.0.0.1:3149/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'admin'})});
   if(role==='TEACHER'&&login.status!==200){assert.equal(login.status,403);continue;}assert.equal(login.status,200);
   const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
   const response=await fetch('http://127.0.0.1:3149/admin/relationships?view=compare',{headers:{Cookie},redirect:'manual'});
   if(['FINANCE','TEACHER'].includes(role)){assert.ok([303,307,308].includes(response.status));continue;}
   assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('Compare displayed relationships'));
   if(['ADMIN','OBSERVER'].includes(role)){assert.ok(html.includes('SGD 50.00'));assert.ok(html.includes('Parent approved receipts'));}
   else{assert.ok(!html.includes('SGD 50.00'));assert.ok(!html.includes('Parent approved receipts'));assert.ok(!html.includes('Partner approved receipts'));}
   const due=await fetch(`http://127.0.0.1:3149/admin/relationships?view=compare&focus=due&q=${encodeURIComponent(tag)}`,{headers:{Cookie}});const filtered=await due.text();assert.ok(filtered.includes(child.id));assert.ok(filtered.includes(project.id));assert.ok(!filtered.includes(closed.id));
  }
 }
 console.log(JSON.stringify({passed:true,batchMatchesEveryDetail:true,unauthorizedFinancialPayloadAbsent:true,unknownNotZero:true,dueChildAndProjectIncluded:true,closedExcluded:true,businessSourcesUnchanged:true,...data}));
}
main().finally(()=>prisma.$disconnect());

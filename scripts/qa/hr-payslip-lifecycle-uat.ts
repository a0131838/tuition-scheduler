import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {saveDraftHrPayslip,transitionHrPayslip} from '../../lib/hr-payslip';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 if(process.argv.includes('--http')){
  const f=JSON.parse(readFileSync('/tmp/sgt-r465-fixture.json','utf8')),base='http://127.0.0.1:3149',url=base+'/admin/hr/payslips?month=2051-01';
  const cookie=async(userId:string)=>{const token=randomUUID();await prisma.authSession.create({data:{userId,token,expiresAt:new Date(Date.now()+3600000)}});return 'ts_admin_session='+token;};
  const hrCookie=await cookie(f.hrId),financeCookie=await cookie(f.financeId),employeeCookie=await cookie(f.employeeUserId),observerCookie=await cookie(f.observerId),otherCookie=await cookie(f.otherId);
  const get=async(Cookie:string)=>{const res=await fetch(url,{headers:{Cookie}});assert.equal(res.status,200);return res.text();};
  const formFor=(html:string,value:string)=>(html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)||[]).find(s=>s.includes(`value="${f.payslipId}"`)&&s.includes(`value="${value}"`))!;
  const send=async(form:string,Cookie:string,nextStatus:string,extra:Record<string,string>={})=>{assert(form);const data=new FormData();for(const m of form.matchAll(/<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"/g))data.set(m[1],m[2].replaceAll('&quot;','"').replaceAll('&amp;','&'));const action=form.match(/name="(\$ACTION_(?:REF|ID)_[^"]+)"/);assert(action);data.set(action[1],'');data.set('nextStatus',nextStatus);for(const [k,v]of Object.entries(extra))data.set(k,v);return fetch(url,{method:'POST',headers:{Cookie,Origin:base},body:data,redirect:'manual'});};
  const current=()=>prisma.hrPayslip.findUniqueOrThrow({where:{id:f.payslipId}}),pdf=(Cookie:string)=>fetch(base+'/api/hr/payslips/'+f.payslipId+'/pdf',{headers:{Cookie},redirect:'manual'});
  assert.equal((await pdf(employeeCookie)).status,403);assert.equal((await pdf(otherCookie)).status,403);
  const hr=await prisma.user.findUniqueOrThrow({where:{id:f.hrId}});
  try{for(const language of ['EN','ZH','BILINGUAL'] as const){await prisma.user.update({where:{id:hr.id},data:{language}});const html=await get(hrCookie);assert(html.includes(language==='EN'?'Monthly payslips':'月度工资单'));assert(html.includes(language==='EN'?'Employees see only director-approved':'员工仅可查看主管批准'));}}finally{await prisma.user.update({where:{id:hr.id},data:{language:hr.language}});}
  let html=await get(hrCookie);
  const draftForm=(html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)||[]).find(s=>s.includes(`value="${f.employeeId}"`)&&s.includes('name="basicSalary"'))!;
  assert(draftForm);await send(draftForm,hrCookie,'',{basicSalary:'3100'});assert.equal((await current()).basicSalaryCents,310000);
  html=await get(hrCookie);let form=formFor(html,'HR_VERIFIED');let before=await current();
  await send(form,financeCookie,'HR_VERIFIED');await send(form,observerCookie,'HR_VERIFIED');await send(form,hrCookie,'DIRECTOR_APPROVED');assert.deepEqual(await current(),before);
  assert.equal((await send(form,hrCookie,'HR_VERIFIED')).status,303);assert.equal((await current()).status,'HR_VERIFIED');await send(form,hrCookie,'HR_VERIFIED');assert.equal(await prisma.auditLog.count({where:{entityId:f.payslipId,action:'PAYSLIP_HR_VERIFIED'}}),1);
  html=await get(financeCookie);form=formFor(html,'FINANCE_CONFIRMED');await send(form,hrCookie,'FINANCE_CONFIRMED');assert.equal((await current()).status,'HR_VERIFIED');await send(form,financeCookie,'FINANCE_CONFIRMED');assert.equal((await current()).status,'FINANCE_CONFIRMED');assert.equal((await pdf(employeeCookie)).status,403);
  html=await get(hrCookie);form=formFor(html,'DIRECTOR_APPROVED');await send(form,financeCookie,'DIRECTOR_APPROVED');assert.equal((await current()).status,'FINANCE_CONFIRMED');await send(form,hrCookie,'DIRECTOR_APPROVED');assert.equal((await current()).status,'DIRECTOR_APPROVED');
  const allowed=await pdf(employeeCookie);assert.equal(allowed.status,200);assert.equal(Buffer.from(await allowed.arrayBuffer()).subarray(0,4).toString(),'%PDF');assert.equal((await pdf(otherCookie)).status,403);
  html=await get(financeCookie);form=formFor(html,'PAID');await send(form,financeCookie,'PAID');assert.equal((await current()).status,'DIRECTOR_APPROVED');await send(form,financeCookie,'PAID',{paymentReference:'ISOLATED-NOT-A-BANK-TRANSFER'});assert.equal((await current()).status,'PAID');assert.equal((await pdf(employeeCookie)).status,200);
  const paid=await current();await send(draftForm,hrCookie,'',{basicSalary:'9999'});assert.deepEqual(await current(),paid);
  console.log(JSON.stringify({passed:true,draftFormAndStaleDraftDenial:true,actualApprovalForms:true,wrongRolesObserverAndSkippingDenied:true,repeatDoesNotReapprove:true,employeePdfOnlyAfterApproval:true,otherEmployeePdfDenied:true,paymentReferenceRequired:true,threeLanguageRenderedCopy:true}));return;
 }
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
 const user=async(role:'TEACHER'|'FINANCE'|'CS'|'ADMIN',name:string,hr=false)=>prisma.user.create({data:{name,email:randomUUID()+'@example.invalid',role,passwordHash:'isolated',passwordSalt:'isolated',...(hr?{workspaceAccesses:{create:{workspace:'HR'}}}:{})}});
 const hr=await user('TEACHER','Isolated HR verifier',true),finance=await user('FINANCE','Isolated payroll finance'),employeeUser=await user('CS','Isolated payroll employee'),other=await user('CS','Isolated unrelated employee'),observer=await user('ADMIN','Isolated payroll observer',true);await prisma.user.update({where:{id:observer.id},data:{isObserver:true}});
 const entity=await prisma.hrLegalEntity.create({data:{name:'Isolated employer '+randomUUID()}});
 const employee=await prisma.employeeProfile.create({data:{userId:employeeUser.id,legalEntityId:entity.id,startDate:new Date('2050-01-01'),createdByUserId:owner.id,updatedByUserId:owner.id}});
 const input={employeeId:employee.id,month:'2051-01',expectedUpdatedAt:null,basicSalaryCents:300000,allowanceCents:20000,deductionCents:5000,employeeCpfCents:60000,employerCpfCents:51000,reimbursementCents:1200,preparedBy:hr};
 const baseline=await Promise.all([prisma.packageTxn.count(),prisma.miniappNotificationOutbox.count()]);
 let fail=false;prisma.$use(async(p,next)=>{if(fail&&p.model==='AuditLog'&&p.action==='create'&&p.args.data.module==='hr')throw Error('forced payroll audit failure');return next(p);});
 fail=true;await assert.rejects(saveDraftHrPayslip(input),/forced payroll audit/);assert.equal(await prisma.hrPayslip.count({where:{employeeId:employee.id}}),0);fail=false;
 for(const actor of [observer,other])await assert.rejects(saveDraftHrPayslip({...input,preparedBy:{...actor,role:'ADMIN'}}));
 await assert.rejects(saveDraftHrPayslip({...input,basicSalaryCents:NaN}),/amount/);
 let row=await saveDraftHrPayslip(input);assert.equal(row.netPayCents,256200);assert.equal(row.employerCpfCents,51000);
 const snap=()=>prisma.hrPayslip.findUniqueOrThrow({where:{id:row.id}});
 const step=(nextStatus:any,actor=hr,version=row.updatedAt.toISOString(),ref?:string)=>transitionHrPayslip({payslipId:row.id,expectedUpdatedAt:version,nextStatus,actor,paymentReference:ref});
 let before=await snap();fail=true;await assert.rejects(saveDraftHrPayslip({...input,expectedUpdatedAt:row.updatedAt.toISOString(),basicSalaryCents:400000}),/forced payroll audit/);assert.deepEqual(await snap(),before);await assert.rejects(step('HR_VERIFIED'),/forced payroll audit/);assert.deepEqual(await snap(),before);fail=false;
 await assert.rejects(step('DIRECTOR_APPROVED'),/transition/);await assert.rejects(step('HR_VERIFIED',finance),/role/);await assert.rejects(step('HR_VERIFIED',observer),/Read-only/);
 const workspace=await prisma.userWorkspaceAccess.findFirstOrThrow({where:{userId:hr.id,workspace:'HR'}});await prisma.userWorkspaceAccess.update({where:{id:workspace.id},data:{isActive:false}});await assert.rejects(step('HR_VERIFIED'),/permission/);await prisma.userWorkspaceAccess.update({where:{id:workspace.id},data:{isActive:true}});
 const version=row.updatedAt.toISOString(),race=await Promise.allSettled([step('HR_VERIFIED'),saveDraftHrPayslip({...input,expectedUpdatedAt:version,basicSalaryCents:301000})]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);row=await snap();if(row.status==='DRAFT')row=await step('HR_VERIFIED');
 await assert.rejects(saveDraftHrPayslip({...input,expectedUpdatedAt:version}),/changed/);await assert.rejects(saveDraftHrPayslip({...input,expectedUpdatedAt:row.updatedAt.toISOString()}),/draft/);
 await assert.rejects(step('FINANCE_CONFIRMED',hr),/role/);row=await step('FINANCE_CONFIRMED',finance);row=await step('DIRECTOR_APPROVED',hr);await assert.rejects(step('PAID',finance),/reference/);
 before=await snap();fail=true;await assert.rejects(step('PAID',finance,row.updatedAt.toISOString(),'ISOLATED'),/forced payroll audit/);assert.deepEqual(await snap(),before);fail=false;
 const paidRace=await Promise.allSettled([step('PAID',finance,row.updatedAt.toISOString(),'ISOLATED'),step('PAID',finance,row.updatedAt.toISOString(),'ISOLATED')]);assert.equal(paidRace.filter(x=>x.status==='fulfilled').length,1);row=await snap();await assert.rejects(step('VOID',hr),/transition/);assert.equal(await prisma.auditLog.count({where:{entityId:row.id,action:'PAYSLIP_PAID'}}),1);
 const audit=await prisma.auditLog.findFirstOrThrow({where:{entityId:row.id,action:'PAYSLIP_PAID'}});assert.equal((audit.meta as any).before.status,'DIRECTOR_APPROVED');assert.equal((audit.meta as any).after.status,'PAID');
 const createRace=await Promise.allSettled([saveDraftHrPayslip({...input,month:'2051-03'}),saveDraftHrPayslip({...input,month:'2051-03'})]);assert.equal(createRace.filter(x=>x.status==='fulfilled').length,1);assert.equal(await prisma.hrPayslip.count({where:{employeeId:employee.id,month:'2051-03'}}),1);
 const manager=await user('TEACHER','Isolated payroll manager');const acl=await prisma.managerAcl.create({data:{email:manager.email}});await saveDraftHrPayslip({...input,month:'2051-04',preparedBy:manager});await prisma.managerAcl.update({where:{id:acl.id},data:{isActive:false}});await assert.rejects(saveDraftHrPayslip({...input,month:'2051-05',preparedBy:manager}),/permission/);
 assert.deepEqual(await Promise.all([prisma.packageTxn.count(),prisma.miniappNotificationOutbox.count()]),baseline);
 // Separate draft for actual HTTP lifecycle. No real salary/payments are created.
 const secondUser=await user('CS','Isolated HTTP payroll employee'),second=await prisma.employeeProfile.create({data:{userId:secondUser.id,legalEntityId:entity.id,startDate:new Date('2050-01-01'),createdByUserId:owner.id,updatedByUserId:owner.id}});
 const httpHr=await user('ADMIN','Isolated HTTP HR verifier',true);
 const httpRow=await saveDraftHrPayslip({...input,employeeId:second.id});
 writeFileSync('/tmp/sgt-r465-fixture.json',JSON.stringify({payslipId:httpRow.id,employeeId:second.id,employeeUserId:secondUser.id,hrId:httpHr.id,financeId:finance.id,observerId:observer.id,otherId:other.id}));
 console.log(JSON.stringify({passed:true,currentRolesAndRevokedWorkspace:true,draftAndTransitionAuditRollback:true,staleAndApprovedDraftEditsDenied:true,concurrentSaveVsApproveSafe:true,concurrentPayOnce:true,existingCalculationAndHistoryPreserved:true,unrelatedLedgerAndOutboxUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

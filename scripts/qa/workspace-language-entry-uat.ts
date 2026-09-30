import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const hr=JSON.parse(readFileSync('/tmp/sgt-r466-fixture.json','utf8')),school=JSON.parse(readFileSync('/tmp/sgt-r449-fixture.json','utf8')),care=JSON.parse(readFileSync('/tmp/sgt-r456-fixture.json','utf8')),monthly=JSON.parse(readFileSync('/tmp/sgt-r464-fixture.json','utf8'));
 const actor=await prisma.user.findUniqueOrThrow({where:{id:hr.hrId}}),owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),item=await prisma.monthlySchedulingItem.findUniqueOrThrow({where:{id:monthly.itemId},include:{campaign:true}});
 const base='http://127.0.0.1:3149';const cookie=async(userId:string)=>{const token=randomUUID();await prisma.authSession.create({data:{userId,token,expiresAt:new Date(Date.now()+3600000)}});return 'ts_admin_session='+token;};
 const hc=await cookie(actor.id),oc=await cookie(owner.id),ec=await cookie(hr.userId),get=(path:string,Cookie=hc)=>fetch(base+path,{headers:{Cookie},redirect:'manual'});
 const month=String(2100+Math.floor(Math.random()*500))+'-06';
 const campaign=await prisma.monthlySchedulingCampaign.create({data:{month:new Date(month+'-01T00:00:00+08:00'),status:'OPEN',createdByUserId:owner.id,createdByName:'Isolated UI acceptance'}});
 await prisma.monthlySchedulingItem.create({data:{campaignId:campaign.id,studentId:item.studentId,courseId:item.courseId,token:randomUUID(),status:'SUBMITTED',intent:'KEEP',responseChannel:'WECHAT_GROUP',responseEntryMode:'STAFF_PROXY'}});
 const monthlyPath='/admin/monthly-scheduling?month='+month,schoolPath='/admin/students/'+school.studentId+'/school-applications',carePath='/admin/care/'+care.engagementId+'/operations';
 const teacher=await prisma.teacher.create({data:{name:'Isolated HR entry teacher '+randomUUID()}});
 await prisma.user.update({where:{id:actor.id},data:{role:'TEACHER',teacherId:teacher.id}});
 const workspace=await prisma.userWorkspaceAccess.findFirstOrThrow({where:{userId:actor.id,workspace:'HR',isActive:true}});
 try {
  for(const p of ['/admin/hr','/admin/hr/leave','/admin/hr/payslips','/admin/hr/employees/'+hr.employeeId]){const r=await get(p);assert.equal(r.status,200,p);const text=await r.text();assert(!text.includes('href="/admin/finance/workbench"'),p);}
  for(const p of ['/admin/finance/workbench','/admin/receipts-approvals/queue','/admin/manager/users','/admin/students'])assert.notEqual((await get(p)).status,200,p);
  const teacherPage=await get('/teacher');assert.equal(teacherPage.status,200);assert((await teacherPage.text()).includes('/admin/hr'));
  await prisma.userWorkspaceAccess.update({where:{id:workspace.id},data:{isActive:false}});assert.notEqual((await get('/admin/hr')).status,200);await prisma.userWorkspaceAccess.update({where:{id:workspace.id},data:{isActive:true}});
  const request=await prisma.hrLeaveRequest.create({data:{employeeId:hr.employeeId,leaveType:'UNPAID',startAt:new Date('2055-01-04T00:00:00+08:00'),endAt:new Date('2055-01-04T23:59:59+08:00'),durationMinutes:480,status:'SUBMITTED',approverUserId:actor.id,reason:'Isolated HR teacher approval'}});
  const approvalHtml=await(await get('/admin/hr/leave')).text(),form=(approvalHtml.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)||[]).find(s=>s.includes(`value="${request.id}"`));assert(form);const data=new FormData();for(const m of form.matchAll(/<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"/g))data.set(m[1],m[2].replaceAll('&quot;','"').replaceAll('&amp;','&'));const action=form.match(/name="(\$ACTION_(?:REF|ID)_[^"]+)"/);assert(action);data.set(action[1],'');data.set('decision','APPROVE');data.set('decisionNote','Isolated approval by HR workspace teacher');
  const approved=await fetch(base+'/admin/hr/leave',{method:'POST',headers:{Cookie:hc,Origin:base},body:data,redirect:'manual'});assert.equal(approved.status,303);assert.equal((await prisma.hrLeaveRequest.findUniqueOrThrow({where:{id:request.id}})).status,'APPROVED');
  for(const [language,mHeading,hrHeading,sHeading]of [['EN','Parent arrangement','Apply for leave','School Applications'],['ZH','家长安排','提交请假','学校申请服务'],['BILINGUAL','Parent arrangement / 家长安排','Apply for leave / 提交请假','School Applications / 学校申请服务']] as const){
   await prisma.user.updateMany({where:{id:{in:[actor.id,owner.id,hr.userId]}},data:{language}});
   const m=await get(monthlyPath,oc);assert.equal(m.status,200);const mh=await m.text();assert(mh.includes(mHeading),language+' monthly');assert(mh.includes('data-label='));
   const h=await get('/staff/hr',ec);assert.equal(h.status,200);assert((await h.text()).includes(hrHeading),language+' HR');
   const l=await get('/admin/hr/leave');assert.equal(l.status,200);assert((await l.text()).includes(language==='ZH'?'假期审批与日历':'Leave approvals and calendar'));
   const s=await get(schoolPath,oc);assert.equal(s.status,200);assert((await s.text()).includes(sHeading),language+' school');
   const c=await get(carePath,oc);assert.equal(c.status,200);const ch=await c.text();assert(!ch.includes('>CONTINUE</option>'));
  }
  writeFileSync('/tmp/sgt-r468-ui-fixture.json',JSON.stringify({monthlyPath,schoolPath,carePath,employeePath:'/staff/hr',teacherHrId:actor.id}));
  console.log(JSON.stringify({passed:true,hrTeacherEntryAndRevocation:true,actualHrTeacherApproval:true,unrelatedCompanyAccessDenied:true,threeLanguageMonthlyHrSchoolCare:true,scope:'Rendered text and role routes; separate browser screenshots still required for mobile layout'}));
 }finally{await prisma.user.update({where:{id:actor.id},data:{role:actor.role,teacherId:actor.teacherId,language:actor.language}});await prisma.user.update({where:{id:owner.id},data:{language:owner.language}});await prisma.userWorkspaceAccess.update({where:{id:workspace.id},data:{isActive:true}});}
}
main().finally(()=>prisma.$disconnect());

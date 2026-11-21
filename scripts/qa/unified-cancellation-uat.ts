import { formatBusinessDateOnly, parseBusinessDateStart } from '../../lib/date-only';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { prisma } from '../../lib/prisma';

async function main() {
  for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']) {
    const url = new URL(process.env[key] || '');
    assert.equal(url.hostname,'127.0.0.1'); assert.equal(url.port,'55439'); assert.equal(url.pathname,'/sgt_final_periods_uat');
  }
  const base='http://127.0.0.1:3201', suffix=randomUUID().slice(0,8);
  const teacher=await prisma.teacher.create({data:{name:`Training Teacher ${suffix}`}});
  const student=await prisma.student.create({data:{name:`Training Student ${suffix}`}});
  const course=await prisma.course.create({data:{name:`Training English ${suffix}`}});
  const campus=await prisma.campus.create({data:{name:`Training Campus ${suffix}`}});
  const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
  await prisma.enrollment.create({data:{classId:klass.id,studentId:student.id}});
  const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',paid:true,totalMinutes:6000,remainingMinutes:6000,validFrom:new Date(Date.now()-86400000)}});
  await prisma.packageTxn.create({data:{packageId:pkg.id,kind:'PURCHASE',deltaMinutes:6000,deltaAmount:11000,note:'Isolated training fixture'}});
  const tokens:Record<string,{cookie:string;mini:string;id:string}>={};
  for(const role of ['ADMIN','FINANCE','TEACHER'] as const) {
    const user=await prisma.user.create({data:{email:`cancel-${role}-${suffix}@example.invalid`,name:`Training ${role}`,role,passwordSalt:randomUUID(),passwordHash:randomUUID(),language:'BILINGUAL',...(role==='TEACHER'?{teacherId:teacher.id}:{})}});
    const cookie=randomUUID(),mini=randomUUID(),expiresAt=new Date(Date.now()+86400000);
    await prisma.authSession.create({data:{userId:user.id,token:cookie,expiresAt}});
    await prisma.staffMiniappSession.create({data:{userId:user.id,token:mini,expiresAt}});
    tokens[role]={cookie,mini,id:user.id};
  }
  let n=0;const make=async()=>{const startAt=new Date(Date.now()+2*86400000+(n++)*2*3600000);return prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt,endAt:new Date(+startAt+90*60000)}});};
  const sessions: Awaited<ReturnType<typeof make>>[]=[];for(let i=0;i<14;i++)sessions.push(await make());
  const send=async(path:string,body:any,role='ADMIN',mini=false,method='POST')=>{
    const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(mini?{Authorization:`Bearer ${tokens[role].mini}`}:{Cookie:`ts_admin_session=${tokens[role].cookie}`})},body:method==='GET'?undefined:JSON.stringify(body),redirect:'manual'});
    return {status:r.status,data:await r.json().catch(()=>null)};
  };
  const web=(id:string)=>`/api/admin/students/${student.id}/sessions/cancel`;
  const balance=async()=>(await prisma.coursePackage.findUniqueOrThrow({where:{id:pkg.id}})).remainingMinutes;
  const noCharge={sessionId:sessions[0].id,requestedBy:'TEACHER',charge:false,note:'Teacher unwell — no deduction'};
  assert.equal((await send(web(sessions[0].id),{...noCharge,charge:true})).status,400);
  assert.equal((await send(web(sessions[0].id),{...noCharge,requestedBy:''})).status,400);
  assert.equal((await send(web(sessions[0].id),noCharge)).status,200);
  assert.equal(await balance(),6000);
  let a=await prisma.attendance.findUniqueOrThrow({where:{sessionId_studentId:{sessionId:sessions[0].id,studentId:student.id}}});
  assert.equal(a.cancellationRequestedBy,'TEACHER');assert.equal(a.deductedMinutes,0);
  const charge={sessionId:sessions[1].id,requestedBy:'PARENT',charge:true,note:'Approved cancellation deduction — 90 minutes'};
  const race=await Promise.all([send(web(sessions[1].id),charge),send(web(sessions[1].id),charge)]);
  assert.ok(race.some(r=>r.status===200));assert.equal(await balance(),5910);
  assert.equal((await send(web(sessions[1].id),charge)).status,200);assert.equal(await balance(),5910);
  await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:parseBusinessDateStart(formatBusinessDateOnly(sessions[1].startAt))!,startMin:0,endMin:1440}});
  const restored=await send(`/api/admin/students/${student.id}/sessions/restore`,{sessionId:sessions[1].id});assert.equal(restored.status,200,JSON.stringify(restored.data));assert.equal(await balance(),6000);
  for(let i=3;i<7;i++) await prisma.attendance.create({data:{sessionId:sessions[i].id,studentId:student.id,status:'EXCUSED',cancellationRequestedBy:'PARENT',cancellationReason:'Prior parent request',note:'Prior parent request'}});
  const miniPath=`/api/miniapp/staff/schedule/${sessions[7].id}/cancel`,miniBody={studentId:student.id,requestedBy:'PARENT',charge:false,note:'Parent request after four previous requests'};
  const pre=await send(miniPath,{...miniBody,mode:'preview'},'ADMIN',true);assert.equal(pre.status,200);assert.ok(pre.data.preview.parentCancellationCount>=4);
  assert.equal((await send(miniPath,{...miniBody,mode:'apply',requestedBy:'TEACHER',previewToken:pre.data.previewToken},'ADMIN',true)).status,409);
  assert.equal((await send(miniPath,{...miniBody,mode:'apply',previewToken:pre.data.previewToken},'ADMIN',true)).status,200);assert.equal(await balance(),6000);
  assert.equal((await send(miniPath,{...miniBody,mode:'apply',previewToken:pre.data.previewToken},'ADMIN',true)).status,409);
  const miniChargePath=`/api/miniapp/staff/schedule/${sessions[8].id}/cancel`,miniCharge={...miniBody,charge:true};
  const cp=await send(miniChargePath,{...miniCharge,mode:'preview'},'ADMIN',true);assert.equal(cp.status,200);
  assert.equal((await send(miniChargePath,{...miniCharge,mode:'apply',previewToken:cp.data.previewToken},'ADMIN',true)).status,200);assert.equal(await balance(),5910);
  const attendancePath=`/api/admin/sessions/${sessions[9].id}/attendance`;
  assert.equal((await send(attendancePath,{items:[{studentId:student.id,status:'EXCUSED',cancellationRequestedBy:'TEACHER',note:'School teacher unavailable',excusedCharge:true,deductedMinutes:90}]})).status,409);
  assert.equal((await send(attendancePath,{items:[{studentId:student.id,status:'EXCUSED',cancellationRequestedBy:'PARENT',note:'Reviewed parent cancellation',excusedCharge:true,deductedMinutes:1}]})).status,200);assert.equal(await balance(),5820);
  const parentCount=await prisma.attendance.count({where:{studentId:student.id,status:'EXCUSED',cancellationRequestedBy:'PARENT'}});
  assert.equal(parentCount,7);
  await prisma.attendance.create({data:{sessionId:sessions[10].id,studentId:student.id,status:'EXCUSED',note:'Legacy reason not classified'}});
  assert.equal(await prisma.attendance.count({where:{studentId:student.id,status:'EXCUSED',cancellationRequestedBy:'PARENT'}}),parentCount);
  assert.equal((await send(web(sessions[11].id),{...noCharge,sessionId:sessions[11].id},'FINANCE')).status,403);
  assert.equal((await send(miniChargePath,{...miniCharge,mode:'preview'},'FINANCE',true)).status,403);
  assert.equal((await send(`/api/admin/sessions/${sessions[12].id}`,null,'ADMIN',false,'DELETE')).status,200);
  assert.equal(await prisma.session.count({where:{id:sessions[12].id}}),0);
  const moveAt=new Date(Date.now()+10*86400000);moveAt.setUTCHours(2,0,0,0);
  await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:parseBusinessDateStart(formatBusinessDateOnly(moveAt))!,startMin:0,endMin:1440}});
  const moved=await send(`/api/admin/classes/${klass.id}/sessions/reschedule`,{sessionId:sessions[2].id,startAt:moveAt.toISOString(),durationMin:90,scope:'single'});
  assert.equal(moved.status,200,JSON.stringify(moved.data));assert.ok(moved.data.noticeIds.length);
  assert.equal(await balance(),5820);
  const query=`?from=${new Date().toISOString().slice(0,7)}-01&to=${new Date(Date.now()+30*86400000).toISOString().slice(0,10)}`;
  const finance=await send('/api/miniapp/staff/cancellations'+query,null,'FINANCE',true,'GET');assert.equal(finance.status,200);assert.equal(finance.data.readOnly,true);assert.ok(finance.data.rows.some((r:any)=>r.studentName===student.name&&r.requester==='老师'));assert.ok(finance.data.history.some((r:any)=>r.sessionId===sessions[12].id&&r.action==='SESSION_DELETED'));
  assert.equal((await send('/api/miniapp/staff/cancellations'+query,null,'TEACHER',true,'GET')).status,403);
  const report=await fetch(base+'/admin/reports/cancelled-sessions'+query,{headers:{Cookie:`ts_admin_session=${tokens.FINANCE.cookie}`},redirect:'manual'});assert.equal(report.status,200);const html=await report.text();assert.ok(html.includes(student.name));assert.ok(html.includes('Historical reason unclassified'));
  for(const mode of ['GROUP_COUNT','GROUP_MINUTES','MONTHLY'] as const) {
    const c=await prisma.course.create({data:{name:`Training ${mode} ${suffix}`}});
    const k=await prisma.class.create({data:{teacherId:teacher.id,courseId:c.id,campusId:campus.id,capacity:mode==='MONTHLY'?1:5,oneOnOneStudentId:student.id}});
    await prisma.enrollment.create({data:{classId:k.id,studentId:student.id}});
    const units=mode==='GROUP_COUNT'?1:mode==='MONTHLY'?0:90, initial=mode==='GROUP_COUNT'?10:600;
    const pack=await prisma.coursePackage.create({data:{studentId:student.id,courseId:c.id,type:mode==='MONTHLY'?'MONTHLY':'HOURS',totalMinutes:mode==='MONTHLY'?null:initial,remainingMinutes:mode==='MONTHLY'?null:initial,paid:true,validFrom:new Date(Date.now()-86400000),note:mode==='GROUP_COUNT'?'[GROUP_PACK]':mode==='GROUP_MINUTES'?'[GROUP_PACK_MINUTES]':null}});
    if(mode!=='MONTHLY') await prisma.packageTxn.create({data:{packageId:pack.id,kind:'PURCHASE',deltaMinutes:initial,deltaAmount:1100}});
    for(const mobile of [false,true]) {
      const at=new Date(Date.now()+40*86400000),session=await prisma.session.create({data:{classId:k.id,studentId:student.id,startAt:at,endAt:new Date(+at+90*60000)}});
      const body={sessionId:session.id,studentId:student.id,requestedBy:'PARENT',charge:true,note:`Isolated ${mode} cancellation`};
      const path=mobile?`/api/miniapp/staff/schedule/${session.id}/cancel`:web(session.id);
      const preview=await send(path,{...body,mode:'preview'},'ADMIN',mobile);assert.equal(preview.status,200,JSON.stringify(preview.data));
      const result=await send(path,{...body,mode:'apply',previewToken:preview.data.previewToken},'ADMIN',mobile);assert.equal(result.status,200,JSON.stringify(result.data));
      const record=await prisma.attendance.findUniqueOrThrow({where:{sessionId_studentId:{sessionId:session.id,studentId:student.id}}});
      assert.equal(record.deductedCount,mode==='GROUP_COUNT'?1:0);assert.equal(record.deductedMinutes,mode==='GROUP_MINUTES'?90:0);
    }
    assert.equal((await prisma.coursePackage.findUniqueOrThrow({where:{id:pack.id}})).remainingMinutes,mode==='MONTHLY'?null:initial-2*units);
  }
  writeFileSync('/private/tmp/sgt-cancellation-fixtures.json',JSON.stringify({studentId:student.id,studentName:student.name,teacherId:teacher.id,courseId:course.id,campusId:campus.id,classId:klass.id,packageId:pkg.id,sessions:sessions.map(s=>({id:s.id,startAt:s.startAt})),tokens,query}),{mode:0o600});
  console.log(JSON.stringify({passed:true,webTeacherFree:true,parentExplicitCharge:true,concurrentNoDoubleDeduct:true,restoreRefund:true,miniNoAutomaticCharge:true,previewTamperRejected:true,attendanceSamePolicy:true,legacyUnchanged:true,financeReadOnly:true,deletionHistoryRetained:true,teacherAccessDenied:true,rescheduleNoticeUnchanged:true,groupAndMonthlyUnitsMatch:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

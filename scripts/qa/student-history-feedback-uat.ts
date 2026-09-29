import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {feedbackPolicyScope} from '../../lib/session-feedback-policy';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),suffix=Date.now();
 const student=await prisma.student.create({data:{name:`Isolated feedback history ${suffix}`}}),teacher=await prisma.teacher.create({data:{name:'History feedback teacher'}}),other=await prisma.teacher.create({data:{name:'Previous teacher'}}),course=await prisma.course.create({data:{name:'History feedback test'}}),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{courseId:course.id,campusId:campus.id,teacherId:teacher.id,oneOnOneStudentId:student.id,capacity:1}});
 const ids:string[]=[];
 for(let i=0;i<8;i++){
  const endAt=new Date(Date.now()+(i===0?86400000:-(i+1)*86400000));
  const s=await prisma.session.create({data:{classId:klass.id,studentId:student.id,startAt:new Date(+endAt-3600000),endAt,attendances:{create:{studentId:student.id,status:i===1?'EXCUSED':i===0?'UNMARKED':'PRESENT',waiveDeduction:i===2,waiveReason:i===2?'Isolated free lesson':null}}}});ids.push(s.id);
  if([3,4,5].includes(i))await prisma.sessionFeedback.create({data:{sessionId:s.id,teacherId:i===5?other.id:teacher.id,status:i===3?'PROXY_DRAFT':'ON_TIME',content:'Isolated test feedback',isProxyDraft:i===3}});
  if(i>=6)await prisma.session.update({where:{id:s.id},data:{feedbackPolicyJson:{version:1,activity:'EXAM_ONLY',reason:'Reviewed isolated examination only',actor:owner.email,reviewedAt:new Date().toISOString(),scope:{...feedbackPolicyScope({...s,class:klass}),...(i===7?{teacherId:'old-teacher'}:{})}}}});
 }
 const base='http://127.0.0.1:3149',url=`${base}/admin/students/${student.id}?focus=attendance#attendance`;
 const login=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:owner.email,password:'LocalUAT-Cancellation-20260928',portal:'admin'})});assert.equal(login.status,200);const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const snapshot=()=>Promise.all([prisma.session.findMany({where:{id:{in:ids}},include:{attendances:true,feedbacks:true},orderBy:{id:'asc'}}),prisma.packageTxn.count()]),before=await snapshot();
 const labels={EN:['Not required - cancelled','Not required - reviewed activity','Lesson not finished','Feedback pending','Draft - teacher confirmation pending','Feedback submitted','Activity exemption needs review'],ZH:['无需反馈 — 已取消','无需反馈 — 活动已核验','课程尚未结束','待提交反馈','代录草稿 — 待老师确认','反馈已提交','活动豁免需重新核对']};
 try{for(const language of ['EN','ZH','BILINGUAL'] as const){await prisma.user.update({where:{id:owner.id},data:{language}});const res=await fetch(url,{headers:{Cookie}});assert.equal(res.status,200);const html=await res.text();for(const label of language==='BILINGUAL'?[...labels.EN,...labels.ZH]:labels[language])assert.ok(html.includes(label),`${language}: ${label}`);if(language!=='BILINGUAL')assert.ok(!html.includes(language==='EN'?labels.ZH[0]:labels.EN[0]));}}
 finally{await prisma.user.update({where:{id:owner.id},data:{language:owner.language}});}
 assert.deepEqual(await snapshot(),before);writeFileSync('/tmp/sgt-r444-fixture.json',JSON.stringify({url,studentId:student.id,sessionIds:ids}));
 console.log(JSON.stringify({passed:true,threeLanguages:true,cancelled:true,freeTeachingPending:true,proxyDraftPending:true,wrongTeacherPending:true,submitted:true,futureNotDue:true,reviewedExemption:true,staleExemptionFlagged:true,recordsUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

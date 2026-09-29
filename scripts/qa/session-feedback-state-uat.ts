import assert from 'node:assert/strict';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {syncSignInAlerts} from '../../lib/signin-alerts';
import {listCommunicationReminders} from '../../lib/communication-reminders';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const teacher=await prisma.teacher.create({data:{name:'Feedback state UAT '+randomUUID()}}),other=await prisma.teacher.create({data:{name:'Prior teacher UAT'}}),student=await prisma.student.create({data:{name:'Feedback state fictional student'}}),course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow();
 const klass=await prisma.class.create({data:{courseId:course.id,campusId:campus.id,teacherId:other.id,oneOnOneStudentId:student.id,capacity:1}});
 const password='LocalUAT-Feedback-20260929',salt=randomBytes(16).toString('hex'),user=await prisma.user.create({data:{email:`feedback-state-${randomUUID()}@example.invalid`,name:'Feedback UAT Teacher',role:'TEACHER',teacherId:teacher.id,language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
 const now=new Date(),sessions:Array<{id:string;startAt:Date;endAt:Date}>=[];
 for(let i=0;i<7;i++){
  const endAt=new Date(now.getTime()+(i===0?86400000:-86400000-i*3600000));
  const session=await prisma.session.create({data:{classId:klass.id,teacherId:teacher.id,studentId:student.id,startAt:new Date(endAt.getTime()-3600000),endAt}});sessions.push(session);
  await prisma.attendance.create({data:{sessionId:session.id,studentId:student.id,status:i===6?'EXCUSED':i===0?'UNMARKED':'PRESENT',waiveDeduction:i===1,waiveReason:i===1?'Free teaching still needs feedback':null}});
  if(i>=2&&i<=5)await prisma.sessionFeedback.create({data:{sessionId:session.id,teacherId:i===5?other.id:teacher.id,content:'Isolated content',status:i===2?'PROXY_DRAFT':'ON_TIME',isProxyDraft:i===3}});
 }
 const snapshot=()=>Promise.all([prisma.attendance.findMany({where:{sessionId:{in:sessions.map(s=>s.id)}},orderBy:{id:'asc'}}),prisma.sessionFeedback.findMany({where:{sessionId:{in:sessions.map(s=>s.id)}},orderBy:{id:'asc'}})]),before=await snapshot();
 const base='http://127.0.0.1:3149',token=await createStaffMiniappSession(user.id),headers={Authorization:`Bearer ${token.token}`};
 const get=async(path:string)=>{const r=await fetch(base+path,{headers});assert.equal(r.status,200);return r.json();};
 const todos=await get('/api/miniapp/staff/teacher/todos');assert.equal(todos.summary.feedbackPending,4);assert.ok(todos.sessionTodos.find((s:any)=>s.id===sessions[1].id)?.feedbackPending);assert.ok(!todos.sessionTodos.some((s:any)=>s.id===sessions[0].id));
 const history=await get('/api/miniapp/staff/teacher/history?month='+now.toISOString().slice(0,7));assert.equal(history.summary.feedbackCompleted,1);assert.equal(history.summary.feedbackPending,4);assert.ok(history.sessions.find((s:any)=>s.id===sessions[2].id).feedbackText.includes('Proxy draft'));
 const center=await get('/api/miniapp/staff/action-center');assert.ok(center.ok);
 const login=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password,portal:'teacher'})});assert.equal(login.status,200);const Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const html=await (await fetch(base+'/teacher/sessions',{headers:{Cookie}})).text();assert.ok(html.includes('After session ends'));assert.ok(html.includes('Proxy draft'));assert.ok(/Feedback pending[\s\S]{0,220}>4<\//.test(html));
 await prisma.appSetting.upsert({where:{key:'signin_alert_sync_last_at'},create:{key:'signin_alert_sync_last_at',value:'2000-01-01'},update:{value:'2000-01-01'}});
 await syncSignInAlerts(now);
 assert.equal(await prisma.signInAlert.count({where:{sessionId:{in:sessions.map(s=>s.id)},alertType:'TEACHER_FEEDBACK_OVERDUE',targetUserId:user.id,resolvedAt:null}}),4);
 const reminders=await listCommunicationReminders(now,10000);
 assert.equal(reminders.filter(r=>r.category==='FEEDBACK'&&sessions.some(s=>r.key===`FEEDBACK_MISSING:${s.id}`)).length,4);
 assert.deepEqual(await snapshot(),before);writeFileSync('/tmp/sgt-r430-fixture.json',JSON.stringify({email:user.email,password,teacherId:teacher.id,sessions:sessions.map(s=>s.id)}));
 console.log(JSON.stringify({passed:true,webPending:4,miniappPending:4,miniappCompleted:1,futureExcluded:true,freeTeachingIncluded:true,proxyNeverCompleted:true,wrongTeacherRejected:true,cancelledExcluded:true,teachingRecordsUnchanged:true,overrideTeacherAlerts:4,communicationReminders:4}));
}
main().finally(()=>prisma.$disconnect());

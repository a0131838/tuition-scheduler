import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {createStaffMiniappSession} from '../../lib/miniapp-staff';
import {feedbackPolicyFingerprint} from '../../lib/session-feedback-policy-service';
import {listCommunicationReminders} from '../../lib/communication-reminders';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r431-fixture.json','utf8')),base='http://127.0.0.1:3149',path=`/api/admin/sessions/${f.sessionId}/feedback-policy`;
 const read=()=>prisma.session.findUniqueOrThrow({where:{id:f.sessionId},include:{class:{include:{enrollments:true}}}}),before=await read(),attendance=await prisma.attendance.findMany({where:{sessionId:f.sessionId}});
 const login=async(email:string,password:string,portal='admin')=>{const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal})});assert.equal(r.status,200);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');};
 const send=(Cookie:string,body:any)=>fetch(base+path,{method:'POST',headers:{Cookie,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 const password='LocalUAT-FeedbackPolicy-20260929',salt=randomBytes(16).toString('hex');
 for(const role of ['FINANCE','OBSERVER','SALES','CS','TEACHER'] as const){
  const user=await prisma.user.create({data:{email:`policy-${randomUUID()}@example.invalid`,name:`Policy ${role}`,role:role==='OBSERVER'?'ADMIN':role,isObserver:role==='OBSERVER',teacherId:role==='TEACHER'?f.teacherId:null,language:'EN',passwordSalt:salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}});
  const Cookie=await login(user.email,password,role==='TEACHER'?'teacher':'admin');assert.ok([303,307,403].includes((await send(Cookie,f)).status));
  if(role==='TEACHER'){
   const token=await createStaffMiniappSession(user.id);writeFileSync('/tmp/sgt-r431-teacher.json',JSON.stringify({email:user.email,password,teacherId:f.teacherId,sessionId:f.sessionId,token:token.token}));
  }
 }
 assert.deepEqual(await read(),before);
 const owner=await login('zhaohongwei0880@gmail.com','LocalUAT-Cancellation-20260928');assert.equal((await send(owner,{...f,fingerprint:'stale'})).status,409);assert.equal((await send(owner,f)).status,200);assert.equal((await send(owner,f)).status,200);
 const teacher=JSON.parse(readFileSync('/tmp/sgt-r431-teacher.json','utf8')),headers={Authorization:`Bearer ${teacher.token}`},Cookie=await login(teacher.email,password,'teacher');
 const todos=await (await fetch(base+'/api/miniapp/staff/teacher/todos',{headers})).json();assert.ok(!todos.sessionTodos.some((r:any)=>r.id===f.sessionId));
 const history=await (await fetch(base+'/api/miniapp/staff/teacher/history?month='+before.startAt.toISOString().slice(0,7),{headers})).json();assert.ok(history.sessions.find((r:any)=>r.id===f.sessionId).feedbackText.includes('Not required'));
 const detail=await (await fetch(base+`/api/miniapp/staff/schedule/${f.sessionId}/feedback`,{headers})).json();assert.equal(detail.feedbackRequirement.exempt,true);
 const page=await (await fetch(base+`/teacher/sessions/${f.sessionId}`,{headers:{Cookie}})).text();assert.ok(page.includes('Reviewed non-teaching activity'));assert.ok(!page.includes('name="classPerformance"'));
 const reminders=await listCommunicationReminders(new Date(),10000);assert.ok(!reminders.some(r=>r.key===`FEEDBACK_MISSING:${f.sessionId}`));
 assert.deepEqual(await prisma.attendance.findMany({where:{sessionId:f.sessionId}}),attendance);assert.equal(await prisma.auditLog.count({where:{entityId:f.sessionId,action:'REVIEW_FEEDBACK_POLICY'}}),1);
 // A group review includes the full roster; adding a student invalidates it everywhere.
 const group=await prisma.class.create({data:{teacherId:f.teacherId,courseId:before.class.courseId,campusId:before.class.campusId,capacity:3}});
 const extra=await prisma.student.create({data:{name:'Group non-teaching isolated student'}});
 await prisma.enrollment.createMany({data:[{classId:group.id,studentId:f.studentId},{classId:group.id,studentId:extra.id}]});
 const groupSession=await prisma.session.create({data:{classId:group.id,startAt:new Date(Date.now()-172800000),endAt:new Date(Date.now()-169200000)},include:{class:{include:{enrollments:true}}}});
 const groupFingerprint=feedbackPolicyFingerprint(groupSession);
 const adminPage=await (await fetch(base+`/admin/sessions/${groupSession.id}/attendance`,{headers:{Cookie:owner}})).text();assert.ok(adminPage.includes(groupFingerprint),'Admin review fingerprint includes group roster');
 const result=await fetch(base+`/api/admin/sessions/${groupSession.id}/feedback-policy`,{method:'POST',headers:{Cookie:owner,'Content-Type':'application/json'},body:JSON.stringify({...f,sessionId:groupSession.id,fingerprint:groupFingerprint,requestKey:randomUUID()})});assert.equal(result.status,200);
 const groupPage=await (await fetch(base+`/teacher/sessions/${groupSession.id}`,{headers:{Cookie}})).text();assert.ok(groupPage.includes('Reviewed non-teaching activity'));
 const third=await prisma.student.create({data:{name:'New group member after review'}});await prisma.enrollment.create({data:{classId:group.id,studentId:third.id}});
 const stale=await (await fetch(base+`/api/miniapp/staff/schedule/${groupSession.id}/feedback`,{headers})).json();assert.equal(stale.feedbackRequirement.exempt,false);assert.equal(stale.feedbackRequirement.stale,true);
 // Restore through the same audited HTTP workflow; browser reviews a fresh required lesson.
 const current=await read();assert.equal((await send(owner,{...f,activity:'TEACHING',reason:'Restored normal teaching after fresh review',fingerprint:feedbackPolicyFingerprint(current),requestKey:randomUUID()})).status,200);
 const refreshed=await read();writeFileSync('/tmp/sgt-r431-fixture.json',JSON.stringify({...f,fingerprint:feedbackPolicyFingerprint(refreshed),requestKey:randomUUID()}));
 console.log(JSON.stringify({passed:true,fiveRoleDenials:true,staleRejected:true,idempotent:true,teacherWebAndMiniapp:true,groupRosterChecked:true,remindersExcluded:true,restorable:true,attendanceUnchanged:true,sessionId:f.sessionId}));
}
main().finally(()=>prisma.$disconnect());

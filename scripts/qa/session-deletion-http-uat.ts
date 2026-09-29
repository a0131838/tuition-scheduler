import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r432-fixture.json','utf8')),base='http://127.0.0.1:3149';
 const login=async(email:string,password:string,portal='admin')=>{const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal})});assert.equal(r.status,200);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');};
 const send=(Cookie:string,path:string,body?:any)=>fetch(base+path,{method:'DELETE',headers:{Cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual'});
 const routes=[`/api/admin/sessions/${f.blockedSessionId}`,`/api/admin/classes/${f.classId}/sessions`,`/api/admin/classes/${f.classId}`,`/api/admin/teachers/${f.teacherId}`,'/api/admin/campuses'];
 const before=await prisma.session.findUniqueOrThrow({where:{id:f.blockedSessionId},include:{feedbacks:true}});
 for(const role of ['FINANCE','OBSERVER','SALES','CS','TEACHER']){
  const user=await prisma.user.findFirstOrThrow({where:{name:`Policy ${role}`},orderBy:{createdAt:'desc'}});
  const cookie=await login(user.email,'LocalUAT-FeedbackPolicy-20260929',role==='TEACHER'?'teacher':'admin');
  for(const path of routes)assert.ok([303,307,403].includes((await send(cookie,path,{sessionId:f.blockedSessionId,id:f.campusId})).status),`${role}:${path}`);
 }
 const owner=await login('zhaohongwei0880@gmail.com','LocalUAT-Cancellation-20260928');
 for(const path of routes)assert.equal((await send(owner,path,{sessionId:f.blockedSessionId,id:f.campusId})).status,409);
 assert.deepEqual(await prisma.session.findUniqueOrThrow({where:{id:f.blockedSessionId},include:{feedbacks:true}}),before);
 const safe=await prisma.session.findUniqueOrThrow({where:{id:f.safeSessionId}});
 assert.equal((await send(owner,'/api/admin/classes/not-the-class/sessions',{sessionId:safe.id})).status,409);
 assert.equal((await send(owner,`/api/admin/classes/${f.classId}/sessions`,{sessionId:safe.id})).status,200);
 assert.equal(await prisma.auditLog.count({where:{entityId:safe.id,action:'SESSION_DELETED'}}),1);assert.equal(await prisma.session.count({where:{id:safe.id}}),0);
 const direct=await prisma.session.create({data:{classId:f.classId,teacherId:f.teacherId,studentId:f.studentId,startAt:new Date(Date.now()+86400000*10),endAt:new Date(Date.now()+86400000*10+3600000)}});
 assert.equal((await send(owner,`/api/admin/sessions/${direct.id}`)).status,200);assert.equal(await prisma.auditLog.count({where:{entityId:direct.id,action:'SESSION_DELETED'}}),1);
 const other=await prisma.student.create({data:{name:'Different student same appointment time'}});
 const match=await prisma.appointment.create({data:{teacherId:f.teacherId,studentId:other.id,startAt:before.startAt,endAt:before.endAt,mode:'ONLINE'}});
 assert.equal((await send(owner,`/api/admin/appointments/${match.id}`)).status,409);assert.ok(await prisma.appointment.findUnique({where:{id:match.id}}));assert.deepEqual(await prisma.session.findUniqueOrThrow({where:{id:before.id},include:{feedbacks:true}}),before);
 const appt=await prisma.appointment.create({data:{teacherId:f.teacherId,studentId:other.id,startAt:new Date(Date.now()+86400000*20),endAt:new Date(Date.now()+86400000*20+3600000),mode:'ONLINE'}});
 const deleted=await send(owner,`/api/admin/appointments/${appt.id}`);assert.equal(deleted.status,200);assert.equal((await deleted.json()).deletedSession,false);assert.equal(await prisma.auditLog.count({where:{entityId:appt.id,action:'DELETE_UNUSED_APPOINTMENT'}}),1);
 const html=await(await fetch(base+`/admin/classes/${f.classId}/sessions`,{headers:{Cookie:owner}})).text();assert.ok(html.includes('SESSION_DELETED')||html.includes('Session removed')||html.includes('移除课次'));
 writeFileSync('/tmp/sgt-r432-browser.json',JSON.stringify({classId:f.classId,blockedSessionId:f.blockedSessionId}));
 console.log(JSON.stringify({passed:true,fiveRolesDenied:true,twoDeletePathsAudited:true,classScope:true,historyAndParentContainersProtected:true,noAppointmentGuessDeletion:true,readableHistory:true}));
}
main().finally(()=>prisma.$disconnect());

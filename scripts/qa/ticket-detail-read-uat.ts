import assert from 'node:assert/strict';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const base='http://127.0.0.1:3149',suffix=Date.now();
 const student=await prisma.student.create({data:{name:`Isolated ticket read ${suffix}`}});
 const teacher=await prisma.teacher.create({data:{name:`Isolated replacement ${suffix}`}});
 const course=await prisma.course.create({data:{name:`Isolated read course ${suffix}`}});
 const subject=await prisma.subject.create({data:{name:'Test subject',courseId:course.id}});
 const campus=await prisma.campus.create({data:{name:`Isolated read campus ${suffix}`}});
 const cls=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,subjectId:subject.id,campusId:campus.id,capacity:1,oneOnOneStudentId:student.id}});
 await prisma.enrollment.create({data:{classId:cls.id,studentId:student.id}});
 const rows:Array<{id:string;ticketNo:string}>=[];
 for(const [idx,type,status,isArchived] of [[0,'排课协调','Waiting Teacher',false],[1,'改上课老师','Confirmed',false],[2,'排课协调','Completed',false],[3,'客服事项','Cancelled',true]] as const){
  rows.push(await prisma.ticket.create({data:{ticketNo:`UAT-READ-${suffix}-${idx}`,type,status,isArchived,studentId:student.id,studentName:student.name,source:'Isolated UAT',priority:'Normal',durationMin:60,...(idx===1?{schedulingActions:{create:{sequence:1,actionType:'REPLACE_TEACHER',status:'NEED_INFO'}}}:{})}}));
 }
 await prisma.parentAvailabilityRequest.create({data:{ticketId:rows[0].id,studentId:student.id,token:`isolated-read-${suffix}`}});
 const login=async(email:string,password:string)=>{const res=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal:'admin'})});assert.equal(res.status,200);return res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');};
 const Cookie=await login('zhaohongwei0880@gmail.com','LocalUAT-Cancellation-20260928');
 const snapshot=async()=>({tickets:await prisma.ticket.findMany({where:{id:{in:rows.map(r=>r.id)}},include:{schedulingActions:true},orderBy:{id:'asc'}}),sessions:await prisma.session.count(),ledger:await prisma.packageTxn.count(),attendance:await prisma.attendance.count(),audits:await prisma.auditLog.count({where:{entityId:{in:rows.map(r=>r.id)}}})});
 const before=await snapshot();
 for(let idx=0;idx<rows.length;idx++){
  const res=await fetch(`${base}/admin/tickets/${rows[idx].id}?work=execute`,{headers:{Cookie}});assert.equal(res.status,200);
  const html=(await res.text()).replace(/<!--.*?-->/gs,'');assert.ok(html.includes(rows[idx].ticketNo));assert.ok(html.includes(student.name));
  if(idx===0)assert.match(html,/1 teachers/);
  if(idx===1)assert.ok(html.includes(teacher.name));
  if(idx<2)assert.match(html,/AI工单服务尚未配置/);
  else assert.ok(!html.includes('AI工单服务尚未配置'));
 }
 const anon=await fetch(`${base}/admin/tickets/${rows[0].id}`,{redirect:'manual'});assert.ok([303,307].includes(anon.status));
 assert.deepEqual(await snapshot(),before);
 console.log(JSON.stringify({passed:true,activeCoordination:true,replacementOptions:true,closedAndArchivedSkipAI:true,missingAIManualFallback:true,anonymousDenied:true,businessSnapshotUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());

import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
const base='http://127.0.0.1:3151';
async function main(){
  for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const url=new URL(process.env[key]||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/sgt_workspace_completion_test');}
  const teachers:string[]=[],users:string[]=[],blockIds:string[]=[];
  try {
    const teacher=await prisma.teacher.create({data:{name:'HTTP availability UAT '+randomUUID()}});teachers.push(teacher.id);
    const other=await prisma.teacher.create({data:{name:'HTTP other UAT '+randomUUID()}});teachers.push(other.id);
    await prisma.teacherAvailability.create({data:{teacherId:teacher.id,weekday:1,startMin:480,endMin:1200}});
    async function account(role:'ADMIN'|'TEACHER',observer=false){
      const user=await prisma.user.create({data:{email:randomUUID()+'@example.invalid',name:'Isolated HTTP UAT',role,teacherId:role==='TEACHER'?teacher.id:null,isObserver:observer,passwordHash:'no-password-login',passwordSalt:'isolated-test'}});users.push(user.id);
      const token=randomBytes(32).toString('hex');await prisma.authSession.create({data:{userId:user.id,token,expiresAt:new Date(Date.now()+3600000)}});
      return {user,cookie:`ts_admin_session=${token}`};
    }
    const admin=await account('ADMIN'),staff=await account('TEACHER'),observer=await account('ADMIN',true);
    async function request(path:string,cookie:string,method='GET',body?:unknown){return fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual'});}
    const api=`/api/admin/teachers/${teacher.id}/availability/blocks`;
    const body={date:'2026-10-19',fullDay:true,note:'HTTP isolated restriction'};
    assert.equal((await request(api,observer.cookie,'POST',body)).status,403);
    assert([303,307,403].includes((await request(api,staff.cookie,'POST',body)).status));
    const self=await request('/api/teacher/availability/blocks',staff.cookie,'POST',{...body,teacherId:other.id});assert.equal(self.status,200);
    const saved=await self.json();blockIds.push(saved.block.id);assert.equal(saved.block.teacherId,teacher.id);assert.equal(await prisma.teacherAvailabilityBlock.count({where:{teacherId:other.id}}),0);
    const list=await (await request(api+'?month=2026-10',admin.cookie)).json();assert.equal(list.blocks[0].date,'2026-10-19');
    assert.equal((await request(api,admin.cookie,'DELETE',{id:saved.block.id,updatedAt:'1970-01-01T00:00:00Z'})).status,409);
    for(const language of ['EN','ZH','BILINGUAL'] as const){
      await prisma.user.update({where:{id:admin.user.id},data:{language}});
      const calendar=await request(`/admin/teachers/${teacher.id}/calendar?month=2026-10`,admin.cookie);assert.equal(calendar.status,200);
      const html=await calendar.text();assert(html.includes(language==='EN'?'Explicitly unavailable':'已明确不可用'));assert(html.includes(language==='EN'?'Weekly template only; date confirmation required':'只有每周模板；当天待确认'));
      const availability=await request(`/admin/teachers/${teacher.id}/availability?month=2026-10`,admin.cookie);assert.equal(availability.status,200);
      assert((await availability.text()).includes(language==='EN'?'Unavailable dates and times':'不可用日期与时段'));
    }
    const selfPage=await request('/teacher/availability',staff.cookie);assert.equal(selfPage.status,200);assert((await selfPage.text()).includes('Unavailable dates and times'));
    assert.equal((await request(api,admin.cookie,'DELETE',{id:saved.block.id,updatedAt:list.blocks[0].updatedAt})).status,200);
    assert.equal(await prisma.teacherAvailabilityBlock.count({where:{teacherId:teacher.id}}),0);
    console.log(JSON.stringify({passed:true,authenticatedApiSaveDelete:true,observerAndTeacherAdminWriteDenied:true,selfEndpointCannotTargetAnotherTeacher:true,staleRemovalDenied:true,calendarAndEditorThreeLanguages:true,teacherEditorRendered:true}));
  } finally {
    await prisma.auditLog.deleteMany({where:{entityId:{in:blockIds}}});await prisma.user.deleteMany({where:{id:{in:users}}});
    await prisma.teacherAvailability.deleteMany({where:{teacherId:{in:teachers}}});await prisma.teacher.deleteMany({where:{id:{in:teachers}}});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

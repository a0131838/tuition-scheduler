import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {saveTeacherAvailabilityBlock,removeTeacherAvailabilityBlock,listTeacherAvailabilityBlocks} from '../../lib/teacher-availability-blocks';
import {inspectTeacherSchedulingAvailability} from '../../lib/teacher-scheduling-availability';
import {getStaffMiniappScheduleCalendar} from '../../lib/miniapp-staff-schedule-calendar';
import {listBookingSlotsForMonth} from '../../lib/booking';
const actor={id:'isolated-uat',name:'Isolated availability UAT',email:'availability-uat@example.invalid',role:'ADMIN'};
const at=(time:string)=>new Date(`2026-10-19T${time}:00+08:00`);
const digest=(data:unknown)=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
async function state(){return {ledger:await prisma.packageTxn.count(),outbox:await prisma.miniappNotificationOutbox.count(),sessions:digest(await prisma.session.findMany({orderBy:{id:'asc'}}))};}
async function main(){
  for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const url=new URL(process.env[key]||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert.equal(url.pathname,'/sgt_workspace_completion_test');}
  process.env.TZ='Asia/Singapore';
  const before=await state(),teachers:string[]=[],blocks:string[]=[];let classId:string|undefined;
  try {
    const teacher=await prisma.teacher.create({data:{name:'Availability UAT '+randomUUID()}});teachers.push(teacher.id);
    const other=await prisma.teacher.create({data:{name:'Other teacher UAT '+randomUUID()}});teachers.push(other.id);
    const inspect=()=>inspectTeacherSchedulingAvailability(prisma,teacher.id,at('11:00'),at('12:30'));
    await prisma.teacherAvailability.create({data:{teacherId:teacher.id,weekday:1,startMin:480,endMin:1200}});
    assert.match(String((await inspect()).error),/Weekly template only/);
    await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:at('00:00'),startMin:600,endMin:900}});
    assert.equal((await inspect()).error,null);
    const course=await prisma.course.findFirstOrThrow(),campus=await prisma.campus.findFirstOrThrow();
    const klass=await prisma.class.create({data:{teacherId:teacher.id,courseId:course.id,campusId:campus.id,capacity:2}});classId=klass.id;
    const session=await prisma.session.create({data:{classId:klass.id,startAt:at('11:00'),endAt:at('12:30')}});
    const saved=await saveTeacherAvailabilityBlock(teacher.id,{date:'2026-10-19',startMin:660,endMin:750,note:'Isolated confirmed restriction'},actor);blocks.push(saved.block.id);
    assert.equal(saved.existingLessons,1);assert.deepEqual(await prisma.session.findUniqueOrThrow({where:{id:session.id}}),session);
    assert.match(String((await inspect()).error),/明确不可用/);
    const listed=await listTeacherAvailabilityBlocks(prisma,teacher.id,'2026-10');assert.equal(listed[0].date,'2026-10-19');
    await assert.rejects(()=>removeTeacherAvailabilityBlock(other.id,saved.block.id,listed[0].updatedAt,actor),/Record changed/);
    await assert.rejects(()=>removeTeacherAvailabilityBlock(teacher.id,saved.block.id,'1970-01-01T00:00:00Z',actor),/Record changed/);
    await assert.rejects(()=>saveTeacherAvailabilityBlock(teacher.id,{date:'2026-10-20',fullDay:true},{...actor,isObserver:true}),/Read-only/);
    const calendar=await getStaffMiniappScheduleCalendar({from:'2026-10-19',to:'2026-10-19',teacherId:teacher.id});
    assert.deepEqual(calendar.availability.map(s=>({startMin:s.startMin,endMin:s.endMin})),[{startMin:600,endMin:660},{startMin:750,endMin:900}]);
    const booking=await listBookingSlotsForMonth({linkId:'isolated-uat',teachers:[{teacherId:teacher.id,teacherName:teacher.name}],startDate:at('00:00'),endDate:at('00:00'),durationMin:60,month:'2026-10'});
    assert(booking && booking.slots.length>0);assert(booking.slots.every(s=>s.endAt<=at('11:00')||s.startAt>=at('12:30')));
    await removeTeacherAvailabilityBlock(teacher.id,saved.block.id,listed[0].updatedAt,actor);
    assert.equal((await inspect()).error,null); // Availability permission only; independent session conflict guards remain.
    const full=await saveTeacherAvailabilityBlock(teacher.id,{date:'2026-10-19',fullDay:true},actor);blocks.push(full.block.id);
    const same=await saveTeacherAvailabilityBlock(teacher.id,{date:'2026-10-19',fullDay:true,note:'Updated reason'},actor);assert.equal(same.block.id,full.block.id);
    assert.equal(await prisma.teacherAvailabilityBlock.count({where:{teacherId:teacher.id}}),1);
    assert.match(String((await inspect()).error),/明确不可用/);
    const fullCalendar=await getStaffMiniappScheduleCalendar({from:'2026-10-19',to:'2026-10-19',teacherId:teacher.id});assert.equal(fullCalendar.availability.length,0);
    const fullBooking=await listBookingSlotsForMonth({linkId:'isolated-uat',teachers:[{teacherId:teacher.id,teacherName:teacher.name}],startDate:at('00:00'),endDate:at('00:00'),durationMin:60,month:'2026-10'});assert.equal(fullBooking?.slots.length,0);
    // Monthly template regeneration replaces date rows; independent restrictions must survive.
    await prisma.teacherAvailabilityDate.deleteMany({where:{teacherId:teacher.id}});
    await prisma.teacherAvailabilityDate.create({data:{teacherId:teacher.id,date:at('00:00'),startMin:480,endMin:1200}});
    assert.match(String((await inspect()).error),/明确不可用/);
    assert.equal(await prisma.auditLog.count({where:{entityId:{in:blocks}}}),4);
  } finally {
    if(classId){await prisma.session.deleteMany({where:{classId}});await prisma.class.delete({where:{id:classId}});}
    await prisma.auditLog.deleteMany({where:{entityId:{in:blocks}}});
    await prisma.teacherAvailability.deleteMany({where:{teacherId:{in:teachers}}});
    await prisma.teacherAvailabilityDate.deleteMany({where:{teacherId:{in:teachers}}});
    await prisma.teacher.deleteMany({where:{id:{in:teachers}}});
  }
  assert.deepEqual(await state(),before);
  console.log(JSON.stringify({passed:true,weeklyOnlyPending:true,partialAndFullBlocks:true,miniappAndBookingConsistent:true,existingLessonsUnchanged:true,observerDenied:true,crossTeacherAndStaleRemovalDenied:true,monthlyRegenerationRetainsBlocks:true,auditAtomic:true,fixturesRemoved:true,noLedgerOrNotificationWrites:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

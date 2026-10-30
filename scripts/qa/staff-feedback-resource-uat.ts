import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {prisma} from '../../lib/prisma';import {teachingBreakError} from '../../lib/teacher-teaching-rule-service';
async function main(){for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const url=new URL(process.env[key]||'');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');assert(['/sgt_workspace_completion_test','/sgt_staff_feedback_test'].includes(url.pathname));}
 const suffix=randomUUID(),users:string[]=[],teachers:string[]=[],classes:string[]=[],rooms:string[]=[],reservations:string[]=[],sessions:string[]=[];let campusId='',courseId='',studentId='';
 try{
 const user=await prisma.user.create({data:{email:suffix+'@uat.invalid',name:'Resource UAT',role:'ADMIN',passwordHash:'not-a-login',passwordSalt:'isolated'}});users.push(user.id);
 const campus=await prisma.campus.create({data:{name:'Resource UAT '+suffix}});campusId=campus.id;
 const course=await prisma.course.create({data:{name:'Resource UAT '+suffix}});courseId=course.id;
 const student=await prisma.student.create({data:{name:'Resource UAT '+suffix}});studentId=student.id;
 for(let i=0;i<4;i++){const teacher=await prisma.teacher.create({data:{name:'Resource UAT '+i+' '+suffix}});teachers.push(teacher.id);const room=await prisma.room.create({data:{campusId,name:'UAT room '+i,capacity:10}});rooms.push(room.id);const cls=await prisma.class.create({data:{campusId,courseId,teacherId:teacher.id,roomId:room.id,capacity:1,oneOnOneStudentId:studentId}});classes.push(cls.id);}
 const at=(time:string)=>new Date('2057-01-02T'+time+':00+08:00');
 const lesson=async(index:number,start:string,end:string)=>{const row=await prisma.session.create({data:{classId:classes[index],studentId,startAt:at(start),endAt:at(end)}});sessions.push(row.id);return row;};
 const booking=async(room:number,start:string,end:string)=>{const row=await prisma.roomReservation.create({data:{roomId:rooms[room],organization:'XDF',responsibleUserId:user.id,startAt:at(start),endAt:at(end)}});reservations.push(row.id);return row;};
 const a=await lesson(0,'09:00','11:00');await lesson(0,'11:00','13:00');
 await assert.rejects(lesson(0,'13:00','14:00'),/TEACHER_BREAK_REQUIRED/);await assert.rejects(lesson(0,'13:14','14:00'),/TEACHER_BREAK_REQUIRED/);await lesson(0,'13:15','14:15');
 assert.equal(await teachingBreakError(prisma,teachers[0],at('13:00'),at('15:00'),[a.id]),null);
 await assert.rejects(booking(0,'10:00','10:30'),/CLASSROOM_LESSON_CONFLICT/);
 const booked=await booking(1,'09:00','10:00');await assert.rejects(lesson(1,'09:30','10:30'),/CLASSROOM_RESERVED/);await assert.rejects(booking(1,'09:30','10:30'),/CLASSROOM_RESERVED/);await lesson(1,'10:00','11:00');
 await prisma.roomReservation.update({where:{id:booked.id},data:{status:'CANCELLED'}});await lesson(1,'09:30','10:00');
 await prisma.attendance.create({data:{sessionId:a.id,studentId,status:'EXCUSED'}});const freed=await booking(0,'09:00','10:00');
 await assert.rejects(prisma.attendance.update({where:{sessionId_studentId:{sessionId:a.id,studentId}},data:{status:'PRESENT'}}),/CLASSROOM_RESERVED/);
 assert.equal((await prisma.attendance.findUniqueOrThrow({where:{sessionId_studentId:{sessionId:a.id,studentId}}})).status,'EXCUSED');
 await prisma.teacherTeachingRule.create({data:{teacherId:teachers[2],maxContinuousMinutes:360,minBreakMinutes:15,reason:'Teacher confirmed six-hour exception for isolated verification',confirmedBy:user.id}});await lesson(2,'09:00','13:00');await lesson(2,'13:00','15:00');await assert.rejects(lesson(2,'15:00','15:30'),/TEACHER_BREAK_REQUIRED/);
 const roomRace=await Promise.allSettled([booking(3,'16:00','17:00'),lesson(3,'16:00','17:00')]);assert.equal(roomRace.filter(r=>r.status==='fulfilled').length,1);
 await lesson(1,'15:00','17:00');const loadRace=await Promise.allSettled([lesson(1,'17:00','18:30'),lesson(1,'18:30','20:00')]);assert.equal(loadRace.filter(r=>r.status==='fulfilled').length,1);
 const feedback=await prisma.sessionFeedback.create({data:{sessionId:a.id,teacherId:teachers[0],content:'Isolated explicit no homework',homework:'Not Set / 本节未布置作业',previousHomeworkDone:null,previousHomeworkNotAssigned:true,status:'ON_TIME',dueAt:at('11:00'),submittedAt:at('11:00')}});assert.equal(feedback.previousHomeworkNotAssigned,true);await prisma.sessionFeedback.delete({where:{id:feedback.id}});
 console.log(JSON.stringify({passed:true,defaultFourHoursAnd15MinuteBreak:true,rescheduleExcludesOriginalLesson:true,individualSixHourLimit:true,roomBookingsAndLessonsMutuallyExclusive:true,adjacentBookingAllowed:true,cancellationFreesRoom:true,restoreCollisionRollback:true,roomRaceOneWinner:true,teachingRaceOneWinner:true,noHomeworkExplicitState:true}));
 }finally{await prisma.roomReservation.deleteMany({where:{id:{in:reservations}}});await prisma.session.deleteMany({where:{classId:{in:classes}}});await prisma.class.deleteMany({where:{id:{in:classes}}});await prisma.teacherTeachingRule.deleteMany({where:{teacherId:{in:teachers}}});await prisma.teacher.deleteMany({where:{id:{in:teachers}}});await prisma.room.deleteMany({where:{id:{in:rooms}}});if(studentId)await prisma.student.delete({where:{id:studentId}});if(courseId)await prisma.course.delete({where:{id:courseId}});if(campusId)await prisma.campus.delete({where:{id:campusId}});await prisma.user.deleteMany({where:{id:{in:users}}});}
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

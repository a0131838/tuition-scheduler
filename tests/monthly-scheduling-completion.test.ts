import assert from 'node:assert/strict';
import test from 'node:test';
import {verifyMonthlySchedule,isFormalMonthlyLesson,readMonthlyScheduleEvidence,completionSessionInclude} from '../lib/monthly-scheduling-completion';
import type {Prisma} from '@prisma/client';
type Lesson=Prisma.SessionGetPayload<{include:typeof completionSessionInclude}>;
const scope={studentId:'A',courseId:'course',month:new Date('2044-10-31T16:00:00Z')};
const lesson={id:'lesson',classId:'class',studentId:'A',teacherId:null,startAt:new Date('2044-11-01T02:00:00Z'),endAt:new Date('2044-11-01T03:00:00Z'),attendances:[],class:{capacity:1,oneOnOneStudentId:'B',courseId:'course',teacherId:'teacher',enrollments:[{studentId:'B'}]}} as unknown as Lesson;
const input={...scope,sessions:[lesson],ids:['lesson'],expectedSessionCount:1,reason:'Parent confirmed only this specific lesson this month',actorName:'Academic reviewer',expectedMinutes:60,offers:[]};
test('specific lesson student wins over conflicting class defaults',()=>{assert.equal(isFormalMonthlyLesson(lesson,scope),true);assert.equal(isFormalMonthlyLesson(lesson,{...scope,studentId:'B'}),false);});
test('wrong month, course, cancelled and ambiguous enrollment never complete',()=>{
 assert.equal(isFormalMonthlyLesson(lesson,{...scope,month:new Date('2044-12-01')}),false);
 assert.equal(isFormalMonthlyLesson(lesson,{...scope,courseId:'other'}),false);
 assert.equal(isFormalMonthlyLesson({...lesson,attendances:[{studentId:'A',status:'EXCUSED'}]},scope),false);
 assert.equal(isFormalMonthlyLesson({...lesson,studentId:null,class:{...lesson.class,oneOnOneStudentId:null,enrollments:[{studentId:'A'},{studentId:'B'}]}},scope),false);
});
test('monthly total and reason are required independently of having a lesson',()=>{
 assert.throws(()=>verifyMonthlySchedule({...input,expectedSessionCount:2}),/monthly total/);
 assert.throws(()=>verifyMonthlySchedule({...input,expectedMinutes:120}),/monthly minutes/);
 assert.throws(()=>verifyMonthlySchedule({...input,reason:''}),/confirmation basis/);
 assert.throws(()=>verifyMonthlySchedule({...input,ids:['lesson','lesson']}),/specific formal/);
});
test('every accepted date must match its teacher and exact time',()=>{
 const offer={id:'offer',teacherId:'teacher',sessionDatesJson:[{startAt:lesson.startAt.toISOString(),endAt:lesson.endAt.toISOString()}]};
 assert.equal(verifyMonthlySchedule({...input,offers:[offer]}).offerIds[0],'offer');
 assert.throws(()=>verifyMonthlySchedule({...input,offers:[{...offer,teacherId:'other'}]}),/confirmed option/);
 assert.throws(()=>verifyMonthlySchedule({...input,offers:[{...offer,sessionDatesJson:[{},...offer.sessionDatesJson]}]}),/confirmed option/);
});
test('overlapping lessons cannot satisfy the confirmed count',()=>assert.throws(()=>verifyMonthlySchedule({...input,ids:['lesson','second'],expectedSessionCount:2,sessions:[lesson,{...lesson,id:'second'}]}),/overlap/));
test('evidence preserves exact IDs and rejects malformed legacy proof',()=>{
 const e=verifyMonthlySchedule(input);assert.deepEqual(e.sessions.map(s=>s.id),['lesson']);assert.ok(readMonthlyScheduleEvidence(e));assert.equal(readMonthlyScheduleEvidence({...e,verifiedAt:'bad'}),null);assert.equal(readMonthlyScheduleEvidence(null),null);
});

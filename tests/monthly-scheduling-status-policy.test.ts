import assert from 'node:assert/strict';
import test from 'node:test';
import {assertMonthlyStaffStatusChange as check} from '../lib/monthly-scheduling-status-policy';
const item={status:'NOT_SENT',intent:null,submittedAt:null,parentConfirmedAt:null,teacherPreferenceType:null,currentScheduleJson:null,carryForwardScheduleJson:null};
const reply={...item,status:'SUBMITTED',intent:'KEEP',submittedAt:new Date(),parentConfirmedAt:new Date(),carryForwardScheduleJson:[{weekday:'MON'}]};
test('staff cannot fabricate viewed, submitted, offered or selected states',()=>{for(const status of ['VIEWED','SUBMITTED','OFFERED','PARENT_SELECTED','CHANGE_REQUESTED'])assert.throws(()=>check(item,status,'Any manual note'),/parent response/);});
test('notes preserve the existing observed state',()=>{for(const status of ['VIEWED','SUBMITTED','OFFERED','PARENT_SELECTED','SCHEDULED'])assert.doesNotThrow(()=>check({...item,status},status,''));});
test('manual send needs channel/time basis and cannot erase replies',()=>{assert.throws(()=>check(item,'SENT',''),/when and how/);assert.doesNotThrow(()=>check(item,'SENT','WeChat private chat today 10:30'));assert.throws(()=>check(reply,'SENT','Sent again today'),/cannot be reset/);});
test('a known response cannot be called no response',()=>assert.throws(()=>check(reply,'NO_RESPONSE',''),/recorded parent response/));
test('matching requires recorded response and resolved teacher identity',()=>{assert.throws(()=>check(item,'MATCHED','Agreed Monday 10:00 with teacher'),/Record the parent/);assert.throws(()=>check({...reply,teacherPreferenceType:'VERIFY'},'MATCHED','Agreed Monday with teacher'),/teacher identity/);assert.doesNotThrow(()=>check(reply,'MATCHED',''));});
test('manual matching without a baseline requires explicit arrangement evidence',()=>{assert.throws(()=>check({...reply,carryForwardScheduleJson:null},'MATCHED',''),/dates, time/);assert.doesNotThrow(()=>check({...reply,carryForwardScheduleJson:null},'MATCHED','November 2, 11am, agreed with teacher'));});
test('reopening a completed timetable requires a reason but does not reset any lesson',()=>{assert.throws(()=>check({...reply,status:'SCHEDULED'},'MATCHED',''),/reopened/);assert.doesNotThrow(()=>check({...reply,status:'SCHEDULED'},'MATCHED','Recheck a changed November arrangement'));});

import {monthlySchedulingQueueLane} from '../lib/monthly-scheduling';
test('teacher identity review takes priority over a keep-current response',()=>assert.equal(monthlySchedulingQueueLane({status:'SUBMITTED',intent:'KEEP',teacherPreferenceType:'VERIFY'}),'EXCEPTIONS'));

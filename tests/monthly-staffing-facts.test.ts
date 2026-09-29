import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyStaffingLessonFacts,confirmedMonthlyDemand,monthlyBusyDateIntervals} from '../lib/monthly-staffing-facts';
test('cancelled students do not consume instruction or wholly cancelled teacher time',()=>{
 const lesson={studentId:'a',class:{capacity:1,enrollments:[]},attendances:[{studentId:'a',status:'EXCUSED'}]};
 assert.deepEqual(monthlyStaffingLessonFacts(lesson),{studentIds:[],needsReview:false,teacherBusy:false});
 assert.deepEqual(monthlyStaffingLessonFacts({...lesson,class:{capacity:4,enrollments:[{studentId:'a'},{studentId:'b'}]}}),{studentIds:['b'],needsReview:false,teacherBusy:true});
});
test('ambiguous one-to-one ownership is not allocated to the first enrollment',()=>{
 assert.deepEqual(monthlyStaffingLessonFacts({class:{capacity:1,enrollments:[{studentId:'a'},{studentId:'b'}]},attendances:[]}),{studentIds:[],needsReview:true,teacherBusy:true});
});
test('weekly or historical defaults cannot manufacture monthly demand',()=>{
 assert.equal(confirmedMonthlyDemand({intent:'KEEP',expectedMinutes:null}),null);
 assert.equal(confirmedMonthlyDemand({intent:'UNSURE',expectedMinutes:300}),null);
 assert.equal(confirmedMonthlyDemand({intent:'CHANGE',expectedMinutes:300}),300);
 assert.equal(confirmedMonthlyDemand({intent:'KEEP',expectedMinutes:0}),0);
 assert.equal(confirmedMonthlyDemand({intent:'KEEP',expectedMinutes:-20}),null);
});
test('overnight busy time is clipped to exact Singapore days and month boundary',()=>{
 const range={start:new Date('2045-05-01T00:00:00+08:00'),end:new Date('2045-06-01T00:00:00+08:00')};
 assert.deepEqual(monthlyBusyDateIntervals(new Date('2045-04-30T23:30:00+08:00'),new Date('2045-05-01T01:00:00+08:00'),range),[{date:'2045-05-01',startMin:0,endMin:60}]);
 assert.deepEqual(monthlyBusyDateIntervals(new Date('2045-05-02T23:30:00+08:00'),new Date('2045-05-03T00:30:00+08:00'),range),[{date:'2045-05-02',startMin:1410,endMin:1440},{date:'2045-05-03',startMin:0,endMin:30}]);
});

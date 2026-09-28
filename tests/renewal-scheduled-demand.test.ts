import assert from "node:assert/strict";
import test from "node:test";
import { renewalScheduledDemand, type ForecastPackage, type ForecastSession } from "../lib/renewal-scheduled-demand";
const pkg: ForecastPackage = {id:"p",studentId:"a",courseId:"c",type:"HOURS",note:null,validFrom:new Date("2026-01-01"),validTo:null,sharedStudents:[],sharedCourses:[]};
const session: ForecastSession = {id:"s",studentId:"a",startAt:new Date("2026-09-01T10:00Z"),endAt:new Date("2026-09-01T11:30Z"),class:{courseId:"c",capacity:1,oneOnOneStudentId:null,enrollments:[]},attendances:[]};
const attendance = {studentId:"a",status:"EXCUSED",packageId:null,deductedMinutes:0,deductedCount:0,waiveDeduction:false,excusedCharge:false};
test("minutes, shared group counts and monthly periods use their own units",()=>{
 assert.equal(renewalScheduledDemand([pkg],[session]).get("p")!.units,90);
 const count={...pkg,note:"[GROUP_PACK]",sharedStudents:[{studentId:"b"}]};
 const group={...session,studentId:null,class:{...session.class,capacity:5,enrollments:[{studentId:"a"},{studentId:"b"}]}};
 assert.equal(renewalScheduledDemand([count],[group]).get("p")!.units,2);
 assert.equal(renewalScheduledDemand([{...pkg,type:"MONTHLY"}],[session]).get("p")!.units,0);
});
test("charged leave counts; free leave, waivers and already deducted lessons do not",()=>{
 for(const a of [attendance,{...attendance,status:"PRESENT",waiveDeduction:true},{...attendance,status:"PRESENT",deductedMinutes:90}])assert.equal(renewalScheduledDemand([pkg],[{...session,attendances:[a]}]).get("p")!.units,0);
 assert.equal(renewalScheduledDemand([pkg],[{...session,attendances:[{...attendance,excusedCharge:true}]}]).get("p")!.units,90);
});
test("student override replaces class membership; unrelated package is never charged",()=>{
 assert.equal(renewalScheduledDemand([pkg],[{...session,studentId:"other",class:{...session.class,oneOnOneStudentId:"a"}}]).get("p")!.units,0);
});
test("multiple candidates stay pending unless exact attendance binding resolves scope",()=>{
 const packages=[pkg,{...pkg,id:"second"}];
 const unknown=renewalScheduledDemand(packages,[session]);assert.equal(unknown.get("p")!.needsReview,true);assert.equal(unknown.get("p")!.units,0);
 const known=renewalScheduledDemand(packages,[{...session,attendances:[{...attendance,status:"UNMARKED",packageId:"p"}]}]);assert.equal(known.get("p")!.units,90);assert.equal(known.get("second")!.units,0);
});
test("expired eligibility cannot be guessed into another package",()=>{
 const result=renewalScheduledDemand([{...pkg,validTo:new Date("2026-08-31")}],[session]);assert.equal(result.get("p")!.needsReview,true);assert.equal(result.get("p")!.units,0);
});

test("invalid explicit binding cannot silently mark available packages safe",()=>{
 const result=renewalScheduledDemand([pkg],[{...session,attendances:[{...attendance,status:"UNMARKED",packageId:"foreign"}]}]);
 assert.equal(result.get("p")!.needsReview,true);assert.equal(result.get("p")!.units,0);
});

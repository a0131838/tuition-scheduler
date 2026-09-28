import assert from 'node:assert/strict';
import test from 'node:test';
import {attendanceLedgerImpact} from '../lib/attendance-ledger-impact';
const sid='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const row={id:'33333333-3333-4333-8333-333333333333',studentId:sid,status:'PRESENT',packageId:'p',deductedMinutes:60,deductedCount:0,waiveDeduction:false,excusedCharge:false,package:{type:'HOURS',note:null as string|null}};
const txn={packageId:'p',kind:'DEDUCT',deltaMinutes:-60,note:`studentId=${sid}`};
const impact=(r:Parameters<typeof attendanceLedgerImpact>[0]["rows"][number]=row,transactions=[txn],exclusiveStudentId:string|null=sid)=>attendanceLedgerImpact({studentId:sid,exclusiveStudentId,rows:[r],transactions});
test('actual matched debit, charged leave and count units can be verified',()=>{
 assert.equal(impact().needsReview,false);assert.equal(impact({...row,status:'EXCUSED',excusedCharge:true}).needsReview,false);
 assert.equal(impact({...row,deductedMinutes:0,deductedCount:1,package:{type:'HOURS',note:'[GROUP_PACK]'}},[{...txn,deltaMinutes:-1}]).needsReview,false);
});
test('status-only free leave and unmarked changes cannot claim refund completion',()=>{
 for(const r of [{...row,status:'EXCUSED'},{...row,status:'UNMARKED'},{...row,waiveDeduction:true}])assert.equal(impact(r).needsReview,true);
 assert.equal(impact({...row,status:'EXCUSED',deductedMinutes:0},[txn,{...txn,kind:'ROLLBACK',deltaMinutes:60}]).needsReview,false);
});
test('unpaid teaching, monthly and waived lessons keep their distinct semantics',()=>{
 assert.equal(impact({...row,packageId:null,package:null as any,deductedMinutes:0},[]).needsReview,true);
 assert.equal(impact({...row,package:{type:'MONTHLY',note:null},deductedMinutes:0},[]).needsReview,false);
 assert.equal(impact({...row,waiveDeduction:true,packageId:null,package:null as any,deductedMinutes:0},[]).needsReview,false);
});
test('cross-package refund cannot offset old debit; shared ownership cannot be guessed',()=>{
 assert.equal(impact({...row,status:'EXCUSED',deductedMinutes:0},[txn,{...txn,packageId:'other',kind:'ROLLBACK',deltaMinutes:60}]).needsReview,true);
 assert.equal(impact(row,[{...txn,note:''}],null).reason,'UNCERTAIN_OWNERSHIP');
 assert.equal(impact(row,[{...txn,note:`studentId=${other} attendanceId=${row.id}`}],null).reason,'UNCERTAIN_OWNERSHIP');
 assert.equal(impact(row,[{...txn,note:`attendanceId=${row.id}`}],null).needsReview,false);
});
test('malformed signs, corrections and wrong units remain pending',()=>{
 assert.equal(impact(row,[{...txn,kind:'ADJUST'}]).needsReview,true);
 assert.equal(impact(row,[{...txn,deltaMinutes:60}]).needsReview,true);
 assert.equal(impact({...row,deductedCount:1}).needsReview,true);
});

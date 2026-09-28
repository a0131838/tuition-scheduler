import assert from 'node:assert/strict';
import test from 'node:test';
import {summarizeRelationshipWork} from '../lib/sales-relationship-work';
const now=new Date('2026-09-28T12:00:00Z'),past=new Date('2026-09-28T10:00:00Z'),future=new Date('2026-10-01T10:00:00Z');
const lead={recordKind:'STUDENT',status:'Contacted',isArchived:false,nextActionDue:past};
test('child deadlines surface even with a future relationship follow-up',()=>{
 const result=summarizeRelationshipWork({nextActionDue:future,leads:[lead],opportunities:[{status:'OPEN',nextActionDue:past}]},now);
 assert.equal(result.relationshipDue,false);assert.equal(result.studentDue,1);assert.equal(result.projectDue,1);assert.deepEqual(result.nextDue,past);
});
test('closed, archived and unreviewed child records do not create due work',()=>{
 const leads=[{...lead,status:'Won'},{...lead,status:'Lost'},{...lead,isArchived:true},{...lead,recordKind:'UNREVIEWED'},{...lead,recordKind:'RELATIONSHIP'}];
 const result=summarizeRelationshipWork({nextActionDue:null,leads,opportunities:['WON','LOST','PAUSED'].map(status=>({status,nextActionDue:past}))},now);
 assert.deepEqual(result,{relationshipDue:false,studentDue:0,projectDue:0,openProjects:0,nextDue:null});
});
test('winning a student never clears an independent relationship deadline',()=>{
 const result=summarizeRelationshipWork({nextActionDue:past,leads:[{...lead,status:'Won'}],opportunities:[{status:'IN_PROGRESS',nextActionDue:future}]},now);
 assert.equal(result.relationshipDue,true);assert.equal(result.studentDue,0);assert.equal(result.openProjects,1);
});

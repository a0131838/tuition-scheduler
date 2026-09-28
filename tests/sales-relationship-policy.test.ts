import assert from 'node:assert/strict';
import test from 'node:test';
import {assertRelationshipWrite,assertRelationshipLink,summarizeRelationshipLeads} from '../lib/sales-relationship-policy';
test('relationship writes retain existing resource roles and reject observers',()=>{
 const actor={id:'a',email:'a@example.invalid',name:'A',role:'SALES'};
 for(const role of ['ADMIN','SALES','CS'])assert.doesNotThrow(()=>assertRelationshipWrite({...actor,role}));
 for(const role of ['TEACHER','FINANCE'])assert.throws(()=>assertRelationshipWrite({...actor,role}));
 assert.throws(()=>assertRelationshipWrite({...actor,isObserver:true}));
 assert.doesNotThrow(()=>assertRelationshipWrite({...actor,role:'TEACHER',operationsAdmin:true}));
});
test('historical relationship linkage requires explicit classification and evidence',()=>{
 assert.throws(()=>assertRelationshipLink({recordKind:'UNREVIEWED',reviewNote:'Same name'}));
 assert.throws(()=>assertRelationshipLink({recordKind:'STUDENT',reviewNote:''}));
 assert.throws(()=>assertRelationshipLink({recordKind:'RELATIONSHIP',reviewNote:'Reviewed',convertedStudentId:'student'}));
 assert.doesNotThrow(()=>assertRelationshipLink({recordKind:'STUDENT',reviewNote:'Confirmed exact referring contact'}));
});
test('three student deals stay independent; duplicated student IDs and legacy records do not inflate student totals',()=>{
 const rows=[{recordKind:'STUDENT',status:'Won',convertedStudentId:'a',isArchived:false},{recordKind:'STUDENT',status:'Contacted',convertedStudentId:'b',isArchived:false},{recordKind:'STUDENT',status:'Lost',convertedStudentId:'a',isArchived:false},{recordKind:'UNREVIEWED',status:'Won',convertedStudentId:'unknown',isArchived:false},{recordKind:'RELATIONSHIP',status:'Won',convertedStudentId:null,isArchived:false}];
 const result=summarizeRelationshipLeads(rows);assert.deepEqual(result,{studentOpportunities:3,linkedStudents:2,openStudentOpportunities:1,pipelineWon:1,unreviewed:1});assert.equal('received' in result,false);
});

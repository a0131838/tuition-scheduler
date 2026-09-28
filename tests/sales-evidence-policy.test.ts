import assert from 'node:assert/strict';
import test from 'node:test';
import {assertSalesEvidenceAccess,canReadSalesEvidence,evaluateContractEvidence,summarizeContractEvidence} from '../lib/sales-evidence-policy';
const actor={id:'a',email:'a@example.invalid',name:'A',role:'ADMIN'};
const date=new Date('2026-09-28T10:00:00Z');
const link={kind:'CONTRACT',documentId:'c',leadId:'l',relationshipId:'r',studentId:'s',status:'ACTIVE',leadRelationshipLinkedAt:date};
const lead={id:'l',relationshipId:'r',convertedStudentId:'s',recordKind:'STUDENT',relationshipLinkedAt:date};
const source={id:'c',studentId:'s',status:'SIGNED',signedAt:date,voidedAt:null};
test('financial attribution preserves role boundaries including restricted administrators',()=>{
 for(const role of ['SALES','CS','FINANCE','TEACHER']){assert.equal(canReadSalesEvidence({...actor,role}),false);assert.throws(()=>assertSalesEvidenceAccess({...actor,role},true));}
 assert.equal(canReadSalesEvidence({...actor,operationsAdmin:true}),false);assert.throws(()=>assertSalesEvidenceAccess({...actor,isObserver:true},true));assert.doesNotThrow(()=>assertSalesEvidenceAccess({...actor,isObserver:true}));
});
test('signed status and real signature are both required; void or expiry overrides signature',()=>{
 assert.equal(evaluateContractEvidence(link,lead,source).state,'SIGNED');
 assert.equal(evaluateContractEvidence(link,lead,{...source,signedAt:null}).state,'REVIEW');
 for(const status of ['VOID','EXPIRED'])assert.equal(evaluateContractEvidence(link,lead,{...source,status}).state,'INACTIVE');
 assert.equal(evaluateContractEvidence(link,lead,{...source,voidedAt:date}).state,'INACTIVE');
 assert.equal(evaluateContractEvidence(link,lead,{...source,status:'DRAFT',signedAt:null}).state,'PENDING');
 assert.equal(evaluateContractEvidence(link,lead,{...source,status:'DRAFT'}).state,'REVIEW');
});
test('changed identity or relationship never silently moves attributed outcomes',()=>{
 for(const altered of [{...lead,relationshipId:'other'},{...lead,convertedStudentId:'other'},{...lead,recordKind:'RELATIONSHIP'},{...lead,relationshipLinkedAt:new Date(date.getTime()+1)},null])assert.equal(evaluateContractEvidence(link,altered,source).state,'REVIEW');
 assert.equal(evaluateContractEvidence(link,lead,null).state,'REVIEW');assert.equal(evaluateContractEvidence(link,lead,{...source,studentId:'other'}).state,'REVIEW');
 assert.equal(evaluateContractEvidence({...link,status:'REVOKED'},lead,source).state,'REVOKED');
});
test('only distinct reviewed signed contracts count; no assignments do not prove zero revenue',()=>{
 const signed={...evaluateContractEvidence(link,lead,source),documentId:'c'};
 assert.deepEqual(summarizeContractEvidence([signed,signed]),{signedContracts:1,pending:0,review:0,assigned:2});
 assert.deepEqual(summarizeContractEvidence([]),{signedContracts:0,pending:0,review:0,assigned:0});assert.equal('received' in summarizeContractEvidence([]),false);
});

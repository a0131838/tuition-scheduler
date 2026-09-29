import test from 'node:test';
import assert from 'node:assert/strict';
import {explicitSessionReferences,traceSnapshotLabel} from '../lib/session-traceability-evidence';
test('only explicit IDs form source/result relationships',()=>{assert.deepEqual(explicitSessionReferences({sourceSessionId:'original',resultSessionId:'new',resultSessionIds:['new','second']}),{sourceSessionId:'original',resultSessionIds:['new','second']});});
test('names, dates and free text are never inferred as identities',()=>{assert.deepEqual(explicitSessionReferences({studentName:'Daisy',startAt:'2026-08-18',notes:'original -> new',sourceSession:{id:'guessed'}}),{sourceSessionId:null,resultSessionIds:[]});});
test('malformed and legacy input stays unknown',()=>{for(const x of [null,[],true,'source=abc',{sourceSessionId:4,resultSessionIds:'not-an-array'},{sourceSessionId:'x'.repeat(201),resultSessionIds:[null,{},9,'']}])assert.deepEqual(explicitSessionReferences(x),{sourceSessionId:null,resultSessionIds:[]});});
test('snapshot projection validates dates and preserves recorded names only',()=>{assert.equal(traceSnapshotLabel(null),null);assert.deepEqual(traceSnapshotLabel({startAt:'invalid',endAt:'2026-09-29T00:00:00Z',teacherName:'Recorded teacher',studentName:{name:'guess'}}),{startAt:null,endAt:'2026-09-29T00:00:00Z',teacherName:'Recorded teacher',studentName:null,campusName:null,roomName:null});});

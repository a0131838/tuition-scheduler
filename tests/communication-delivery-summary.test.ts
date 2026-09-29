import assert from 'node:assert/strict';
import test from 'node:test';
import {automaticCommunicationSummary} from '../lib/parent-communication-center';
test('automatic delivery is complete only when every matched recipient is sent',()=>{
 const check=(statuses:string[])=>automaticCommunicationSummary(statuses.map(status=>({status})));
 assert.equal(check([]).status,'NOT_QUEUED');
 assert.equal(check(['SENT','SENT']).status,'SENT');
 for(const state of ['FAILED','PROCESSING','PENDING','SKIPPED'])assert.equal(check(['SENT',state]).status,state);
 assert.equal(check(['SENT','UNKNOWN']).status,'NOT_QUEUED');
 assert.deepEqual(check(['SENT','PENDING']),{status:'PENDING',counts:{SENT:1,PENDING:1},total:2});
});

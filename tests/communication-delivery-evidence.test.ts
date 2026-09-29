import assert from 'node:assert/strict';
import test from 'node:test';
import {summarizeDeliveryCounts} from '../lib/communication-delivery-evidence';
test('complete delivery counts never hide a pending or unknown status behind sent recipients',()=>{
 assert.equal(summarizeDeliveryCounts({SENT:4000,FAILED:1}).status,'FAILED');
 assert.equal(summarizeDeliveryCounts({SENT:4000,PENDING:1}).status,'PENDING');
 assert.equal(summarizeDeliveryCounts({SENT:1,UNRECOGNIZED:1}).status,'NEEDS_REVIEW');
 assert.equal(summarizeDeliveryCounts({SENT:4001}).total,4001);
 assert.equal(summarizeDeliveryCounts({}).status,'NOT_QUEUED');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {confirmedNotificationResponse,NotificationTransportError,withNotificationToken} from '../lib/notification-transport-outcome';

test('only explicit provider acceptance is delivery success',async()=>{
 assert.deepEqual(await confirmedNotificationResponse(async()=>Response.json({errcode:0,errmsg:'ok'})),{errcode:0,errmsg:'ok'});
 for (const request of [async()=>{throw Error('timeout');},async()=>new Response('bad json'),async()=>Response.json({errcode:0},{status:500}),async()=>Response.json({}),async()=>Response.json({errcode:'0'})])
  await assert.rejects(confirmedNotificationResponse(request),e=>e instanceof NotificationTransportError&&e.outcome==='UNKNOWN');
});
test('provider rejection and pre-send token failure are distinguished from an ambiguous send',async()=>{
 await assert.rejects(confirmedNotificationResponse(async()=>Response.json({errcode:43101})),e=>e instanceof NotificationTransportError&&e.outcome==='REJECTED'&&e.errcode===43101);
 let calls=0;
 await assert.rejects(withNotificationToken(async()=>{throw Error('secret must not leak');},async()=>{calls++;}),e=>e instanceof NotificationTransportError&&e.outcome==='NOT_SENT'&&!e.message.includes('secret'));
 assert.equal(calls,0);
 await assert.rejects(withNotificationToken(async()=>'fake',async()=>{throw new NotificationTransportError('uncertain','UNKNOWN');}),e=>e instanceof NotificationTransportError&&e.outcome==='UNKNOWN');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {hasContractExecutionHistory} from '../lib/student-contract-history';
test('each execution marker preserves historical contract even without the other legacy fields',()=>{
 for(const marker of [{signedAt:new Date()},{signedPdfPath:'signed.pdf'},{signatureImagePath:'signature.png'},{invoiceId:'invoice'},{invoiceNo:'RGT-123'},{invoiceCreatedAt:new Date()}])assert.equal(hasContractExecutionHistory(marker),true);
 assert.equal(hasContractExecutionHistory({signedAt:null,signedPdfPath:null,signatureImagePath:null,invoiceId:null,invoiceNo:null,invoiceCreatedAt:null}),false);
});

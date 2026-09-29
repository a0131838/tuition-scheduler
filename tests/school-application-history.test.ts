import test from 'node:test';
import assert from 'node:assert/strict';
import {canDeleteVoidedSchoolApplication, schoolApplicationHasSignedHistory} from '../lib/school-application-history';
const draft = {status:'VOID',events:[{eventType:'GENERATED'},{eventType:'DRAFT_SAVED'},{eventType:'VOIDED'}]};
test('only unused voided drafts are deletable',()=>{
 assert.equal(canDeleteVoidedSchoolApplication(draft),true);
 for(const status of ['DRAFT','READY_TO_SIGN','SIGNED','INVOICE_CREATED']) assert.equal(canDeleteVoidedSchoolApplication({...draft,status}),false);
});
test('every signature, invoice, external link or submission marker protects history',()=>{
 for(const key of ['signedAt','invoiceCreatedAt','invoiceId','invoiceNo','signatureImagePath','signedPdfPath','signerName','signerEmail','signerPhone','signerIp','signToken','signExpiresAt','signViewedAt','contractSnapshotJson','parentInfoToken','parentInfoExpiresAt','parentInfoViewedAt','parentInfoSubmittedAt']) assert.equal(canDeleteVoidedSchoolApplication({...draft,[key]:'evidence'}),false,key);
 for(const eventType of ['SIGNED','INVOICE_CREATED','PARENT_INFO_LINK_SENT','PARENT_INFO_VIEWED','PARENT_INFO_SUBMITTED','SIGN_READY','SIGN_VIEWED','UNKNOWN']) assert.equal(canDeleteVoidedSchoolApplication({...draft,events:[{eventType}]}),false,eventType);
});
test('signed history survives inconsistent current status or missing invoice',()=>{
 assert.equal(schoolApplicationHasSignedHistory({...draft,status:'DRAFT',signedAt:new Date()}),true);
 assert.equal(schoolApplicationHasSignedHistory({...draft,events:[{eventType:'SIGNED'}]}),true);
 assert.equal(schoolApplicationHasSignedHistory(draft),false);
});

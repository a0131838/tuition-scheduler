import assert from 'node:assert/strict';
import test from 'node:test';
import {parseSalesBilling,parseSalesApprovals,salesInvoiceFingerprint,evaluateParentInvoice,summarizeInvoiceEvidence,salesMoneyCents,type ParentInvoiceContext} from '../lib/sales-invoice-policy';
const invoice={id:'i',studentId:'s',packageId:'p',invoiceNo:'UAT',amount:100,gstAmount:9,totalAmount:109};
const receipt={id:'r',invoiceId:'i',studentId:'s',packageId:'p',amountReceived:50};
const approval={receiptId:'r',managerApprovedBy:[],financeApprovedBy:['finance@example.invalid']};
const link={kind:'PARENT_INVOICE',documentId:'i',leadId:'l',relationshipId:'rel',studentId:'s',status:'ACTIVE',leadRelationshipLinkedAt:null,sourceFingerprint:salesInvoiceFingerprint(invoice)};
const lead={id:'l',relationshipId:'rel',convertedStudentId:'s',recordKind:'STUDENT',relationshipLinkedAt:null};
function context(invoices:unknown[]=[invoice],receipts:unknown[]=[receipt],approvals:unknown[]=[approval]):ParentInvoiceContext{return {billing:parseSalesBilling(JSON.stringify({invoices,receipts})),approvals:parseSalesApprovals(JSON.stringify(approvals)),financeApproverEmails:['finance@example.invalid'],packages:[{id:'p',studentId:'s',sharedStudentIds:[]}],conflictingInvoiceIds:new Set()};}
test('partial approved receipts are real amounts, pending or rejected receipts are never cash',()=>{
 assert.equal(evaluateParentInvoice(link,lead,context()).approvedCents,5000);
 assert.equal(evaluateParentInvoice(link,lead,context([invoice],[receipt],[])).pendingReceipts,1);
 for(const rejected of [{...approval,managerRejectReason:'No'},{...approval,financeRejectedAt:'2026-09-28'}]){const result=evaluateParentInvoice(link,lead,context([invoice],[receipt],[rejected]));assert.equal(result.approvedCents,0);assert.equal(result.rejectedReceipts,1);}
 assert.equal(evaluateParentInvoice(link,lead,{...context(),financeApproverEmails:[]}).approvedCents,0);
});
test('malformed source and duplicate financial IDs stay REVIEW, not zero',()=>{
 const cases=[{...context(),billing:parseSalesBilling('{bad')},{...context(),approvals:parseSalesApprovals('{}')},context([invoice,invoice]),context([invoice],[receipt,receipt]),context([invoice],[receipt],[approval,approval]),context([invoice],[{...receipt,amountReceived:'50'}]),context([invoice],[receipt],[{...approval,financeApprovedBy:[1]}])];
 for(const c of cases){const r=evaluateParentInvoice(link,lead,c);assert.equal(r.state,'REVIEW');assert.equal(r.approvedCents,null);}
});
test('exact invoice and receipt student/package scope cannot be replaced by name or shared membership',()=>{
 for(const c of [context([{...invoice,studentId:'other'}]),context([invoice],[{...receipt,studentId:'other'}]),context([invoice],[{...receipt,packageId:'other'}]),{...context(),packages:[]}])assert.equal(evaluateParentInvoice(link,lead,c).state,'REVIEW');
 assert.equal(evaluateParentInvoice(link,lead,{...context(),packages:[{id:'p',studentId:'owner',sharedStudentIds:['s']}]}).state,'VERIFIED');
 assert.equal(evaluateParentInvoice(link,lead,{...context(),packages:[{id:'p',studentId:'owner',sharedStudentIds:[]}]}).state,'REVIEW');
});
test('invoice changes, moved lead or cross-contract ownership require explicit rereview',()=>{
 assert.equal(evaluateParentInvoice(link,lead,context([{...invoice,totalAmount:110}])).state,'REVIEW');
 assert.equal(evaluateParentInvoice(link,{...lead,relationshipId:'other'},context()).state,'REVIEW');
 assert.equal(evaluateParentInvoice(link,lead,{...context(),conflictingInvoiceIds:new Set(['i'])}).state,'REVIEW');
 assert.equal(evaluateParentInvoice({...link,sourceFingerprint:null},lead,context()).state,'REVIEW');
});
test('revoked, missing and deleted invoices never inflate totals',()=>{
 assert.equal(evaluateParentInvoice({...link,status:'REVOKED'},lead,context()).state,'REVOKED');
 assert.equal(evaluateParentInvoice(link,lead,context([])).state,'REVIEW');
 const c=context([]);c.billing.deleted=[{invoiceId:'i'}];assert.equal(evaluateParentInvoice(link,lead,c).state,'INACTIVE');
 const result=evaluateParentInvoice(link,lead,context());const sum=summarizeInvoiceEvidence([{...result,documentId:'i'},{...result,documentId:'i'}]);assert.equal(sum.verifiedInvoices,1);assert.equal(sum.approvedCents,5000);assert.equal(summarizeInvoiceEvidence([]).verifiedInvoices,0);
});
test('money validation rejects fractional cents and invalid inputs; fingerprint is key-order independent',()=>{
 for(const value of [-1,NaN,Infinity,'100',100.001,Number.MAX_SAFE_INTEGER])assert.equal(salesMoneyCents(value),null);
 assert.equal(salesMoneyCents(2397),239700);assert.equal(salesMoneyCents(0),0);
 assert.equal(salesInvoiceFingerprint({a:1,b:{y:2,x:3}}),salesInvoiceFingerprint({b:{x:3,y:2},a:1}));
 const wrong={...invoice,amount:99};assert.equal(evaluateParentInvoice({...link,sourceFingerprint:salesInvoiceFingerprint(wrong)},lead,context([wrong])).state,'REVIEW');
});

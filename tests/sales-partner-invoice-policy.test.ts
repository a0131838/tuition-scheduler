import assert from 'node:assert/strict';
import test from 'node:test';
import {parseSalesBilling,parseSalesApprovals,salesInvoiceFingerprint,type RawRecord} from '../lib/sales-invoice-policy';
import {evaluatePartnerInvoice,summarizePartnerInvoiceEvidence,type PartnerInvoiceContext} from '../lib/sales-partner-invoice-policy';
const invoice={id:'i',invoiceNo:'UAT',partnerId:'p',mode:'ONLINE_PACKAGE_END',settlementIds:['s1'],amount:100,gstAmount:9,totalAmount:109,lines:[{id:'l1',type:'SETTLEMENT',settlementId:'s1',amount:33.33,quantity:3,gstAmount:9,totalAmount:109}]};
const receipt={id:'r',invoiceId:'i',partnerId:'p',mode:'ONLINE_PACKAGE_END',amountReceived:50};
const approval={receiptId:'r',managerApprovedBy:[],financeApprovedBy:['finance@example.invalid']};
const lead={id:'l',relationshipId:'rel',convertedStudentId:'s',recordKind:'STUDENT',relationshipLinkedAt:null};
const link={kind:'PARTNER_INVOICE',documentId:'i',leadId:'l',relationshipId:'rel',studentId:'s',status:'ACTIVE',leadRelationshipLinkedAt:null,sourceFingerprint:salesInvoiceFingerprint(invoice)};
function context(source:RawRecord=invoice):PartnerInvoiceContext{return {billing:parseSalesBilling(JSON.stringify({invoices:[source],receipts:[receipt]})),approvals:parseSalesApprovals(JSON.stringify([approval])),financeApproverEmails:['finance@example.invalid'],partnerIds:new Set(['p']),settlements:[{id:'s1',studentId:'s',partnerId:'p',mode:'ONLINE_PACKAGE_END',monthKey:null,revertedAt:null,amount:100}],credits:[]};}
function evaluate(c:PartnerInvoiceContext){return evaluatePartnerInvoice({...link,sourceFingerprint:salesInvoiceFingerprint(c.billing.invoices[0])},lead,c);}
test('rounded unit price is not confused with line total; actual approved receipts used',()=>{
 const r=evaluate(context());assert.equal(r.state,'VERIFIED');assert.equal(r.invoiceCents,10900);assert.equal(r.approvedCents,5000);
});
test('known monthly summary supports only exact student and actual settlement total',()=>{
 const c=context({...invoice,mode:'OFFLINE_MONTHLY',monthKey:'2026-09',lines:[{...invoice.lines[0],settlementId:null,quantity:1,amount:100}]});c.settlements[0]={...c.settlements[0],mode:'OFFLINE_MONTHLY',monthKey:'2026-09'};c.billing.receipts=[];assert.equal(evaluate(c).state,'VERIFIED');
 c.settlements[0].monthKey='2026-08';assert.equal(evaluate(c).state,'REVIEW');
});
test('mixed students, unknown partner, manual lines, reverted or wrong settlement never auto allocate',()=>{
 const cases:PartnerInvoiceContext[]=[];
 for(const patch of [{studentId:'other'},{partnerId:'other'},{revertedAt:new Date()},{mode:'OFFLINE_MONTHLY'},{amount:99}]){const c=context();c.settlements[0]={...c.settlements[0],...patch};cases.push(c);}
 cases.push(context({...invoice,partnerId:null}),context({...invoice,settlementIds:[]}),context({...invoice,settlementIds:['s1','s1']}),context({...invoice,lines:[{...invoice.lines[0],type:'MANUAL'}]}),context({...invoice,lines:[{...invoice.lines[0],settlementId:'other'}]}));
 for(const c of cases){const r=evaluate(c);assert.equal(r.state,'REVIEW');assert.equal(r.invoiceCents,null);}
});
test('issued credits adjust invoice only; actual receipts are not reduced twice',()=>{
 const c=context();const credit={id:'cn',sourceInvoiceId:'i',sourceInvoiceNo:'UAT',currency:'SGD',status:'ISSUED',issuedAt:new Date(),voidedAt:null,originalInvoiceTotal:109,amount:20,gstAmount:1.8,totalAmount:21.8};c.credits=[credit];const r=evaluate(c);assert.equal(r.state,'VERIFIED');assert.equal(r.creditCents,2180);assert.equal(r.adjustedInvoiceCents,8720);assert.equal(r.approvedCents,5000);
 for(const status of ['VOID','DRAFT']){c.credits=[{...credit,status}];assert.equal(evaluate(c).creditCents,0);}
 for(const patch of [{issuedAt:null},{voidedAt:new Date()},{currency:'USD'},{originalInvoiceTotal:110},{sourceInvoiceNo:'other'},{amount:200,totalAmount:201.8}]){c.credits=[{...credit,...patch}];assert.equal(evaluate(c).state,'REVIEW');}
});
test('receipt scope, duplicates, missing approvals and rejected approvals remain separate',()=>{
 const c=context();c.approvals=parseSalesApprovals('[]');assert.equal(evaluate(c).pendingReceipts,1);assert.equal(evaluate(c).approvedCents,0);
 c.approvals=parseSalesApprovals(JSON.stringify([{...approval,financeRejectedAt:'2026-09-28'}]));assert.equal(evaluate(c).rejectedReceipts,1);
 c.billing.receipts=[{...receipt,partnerId:'wrong'}];assert.equal(evaluate(c).state,'REVIEW');
 c.billing.receipts=[receipt,receipt];assert.equal(evaluate(c).state,'REVIEW');
});
test('changed invoice or lead links require review; aggregate deduplicates exact evidence',()=>{
 const c=context();assert.equal(evaluatePartnerInvoice({...link,sourceFingerprint:'old'},lead,c).state,'REVIEW');assert.equal(evaluatePartnerInvoice(link,{...lead,relationshipLinkedAt:new Date()},c).state,'REVIEW');assert.equal(evaluatePartnerInvoice({...link,status:'REVOKED'},lead,c).state,'REVOKED');
 const r={...evaluate(c),documentId:'i'},sum=summarizePartnerInvoiceEvidence([r,r]);assert.equal(sum.verifiedInvoices,1);assert.equal(sum.approvedCents,5000);
});

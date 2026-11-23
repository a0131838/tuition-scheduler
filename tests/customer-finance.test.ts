import test from 'node:test';
import assert from 'node:assert/strict';
import {customerInvoice,summarizeCustomerInvoices,type CustomerFinanceContext} from '../lib/customer-finance-policy';
import {parseSalesBilling,parseSalesApprovals} from '../lib/sales-invoice-policy';
const invoice={id:'invoice',invoiceNo:'INV-001',issueDate:'2026-11-23',studentId:'s1',packageId:'pkg',amount:100,gstAmount:9,totalAmount:109};
function context(receipts:unknown[]=[],approvals:unknown[]=[]):CustomerFinanceContext{return {billing:parseSalesBilling(JSON.stringify({invoices:[invoice],receipts})),approvals:parseSalesApprovals(JSON.stringify(approvals)),financeApproverEmails:['finance@example.test'],packages:[{id:'pkg',studentId:'s1',sharedStudentIds:['s2']}],credits:[]};}
const rc=(id:string,amount:number)=>({id,invoiceId:'invoice',studentId:'s1',packageId:'pkg',amountReceived:amount,receiptNo:id,receiptDate:'2026-11-23'});
const approval=(id:string,ok=false)=>({receiptId:id,financeApprovedBy:ok?['finance@example.test']:[],managerApprovedBy:[]});
test('approved, pending and rejected receipt amounts stay separate',()=>{
 const c=context([rc('approved',40),rc('pending',20),rc('rejected',10)],[approval('approved',true),approval('pending'),{...approval('rejected',true),financeRejectedAt:'2026-11-23'}]);
 const r=customerInvoice(invoice,'PARENT',c,{studentIds:['s1','s2']},true);assert.equal(r.state,'VERIFIED');assert.equal(r.approvedCents,4000);assert.equal(r.outstandingCents,6900);assert.equal(r.pendingReceipts,1);assert.equal(r.rejectedReceipts,1);assert.equal(r.renewal,true);
 assert.deepEqual(summarizeCustomerInvoices([r,r]),{invoiceCents:10900,approvedCents:4000,outstandingCents:6900,reviewCount:0,verifiedCount:1});
});
test('family scope does not guess ownership or turn malformed amounts into zero',()=>{
 const c=context();assert.equal(customerInvoice(invoice,'PARENT',c,{studentIds:['other']}).state,'REVIEW');
 for(const raw of [{...invoice,totalAmount:110},{...invoice,amount:NaN},{...invoice,studentId:'other'},{...invoice,packageId:'missing'}]){c.billing.invoices=[raw];const r=customerInvoice(raw,'PARENT',c,{studentIds:['s1']});assert.equal(r.state,'REVIEW');assert.equal(r.approvedCents,null);}
 const r=customerInvoice(invoice,'PARENT',{...context(),approvals:parseSalesApprovals('{broken')},{studentIds:['s1']});assert.equal(r.state,'REVIEW');assert.equal(summarizeCustomerInvoices([r]).approvedCents,null);
});
test('duplicate invoice, receipt and approval IDs are excluded',()=>{
 let c=context();c.billing.invoices=[invoice,invoice];assert.equal(customerInvoice(invoice,'PARENT',c,{studentIds:['s1']}).state,'REVIEW');
 c=context([rc('same',5),rc('same',5)],[approval('same',true)]);assert.equal(customerInvoice(invoice,'PARENT',c,{studentIds:['s1']}).state,'REVIEW');
 c=context([rc('x',5)],[approval('x',true),approval('x',true)]);assert.equal(customerInvoice(invoice,'PARENT',c,{studentIds:['s1']}).state,'REVIEW');
});
test('partner totals use the exact partner; issued credits are not cash refunds',()=>{
 const i={...invoice,partnerId:'partner',mode:'ONLINE_PACKAGE_END'};const c=context();c.billing.invoices=[i];c.credits=[{id:'credit',sourceInvoiceId:i.id,status:'ISSUED',issuedAt:new Date(),voidedAt:null,totalAmount:10,currency:'SGD',sourceInvoiceNo:i.invoiceNo,originalInvoiceTotal:109,amount:10,gstAmount:0}];
 const r=customerInvoice(i,'PARTNER',c,{studentIds:[],partnerId:'partner'});assert.equal(r.creditCents,1000);assert.equal(r.approvedCents,0);assert.equal(r.outstandingCents,9900);assert.equal(customerInvoice(i,'PARTNER',c,{studentIds:[],partnerId:'other'}).state,'REVIEW');
});

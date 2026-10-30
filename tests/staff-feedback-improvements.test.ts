import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectContinuousTeaching} from '../lib/teacher-teaching-rule';
import {previousHomeworkInput,previousHomeworkLabel,NO_HOMEWORK_TEXT} from '../lib/homework-status';
import {summarizeInvoiceRows} from '../lib/finance-document-summary';
import {filterFinanceDocumentRows,type FinanceDocumentRow} from '../lib/finance-documents';
const at=(time:string)=>new Date('2057-01-02T'+time+':00+08:00');
const period=(start:string,end:string,candidate=false)=>({startAt:at(start),endAt:at(end),candidate});
test('continuous four hours allows 15 minute break, not 14; daily total can exceed four',()=>{
 assert.equal(inspectContinuousTeaching([period('09:00','11:00'),period('11:00','13:00')]).blocked,false);
 assert.equal(inspectContinuousTeaching([period('09:00','13:00'),period('13:14','14:00',true)]).blocked,true);
 assert.equal(inspectContinuousTeaching([period('09:00','13:00'),period('13:15','15:00',true)]).blocked,false);
 assert.equal(inspectContinuousTeaching([period('09:00','11:00'),period('11:10','13:10'),period('13:10','13:20',true)]).blocked,true);
});
test('bridging a later lesson counts the whole continuous block; duplicate group intervals count once',()=>{
 assert.equal(inspectContinuousTeaching([period('09:00','11:00'),period('12:00','14:00'),period('11:00','12:00',true)]).blocked,true);
 assert.equal(inspectContinuousTeaching([period('09:00','11:00'),period('09:00','11:00'),period('11:00','13:00',true)]).blocked,false);
 assert.equal(inspectContinuousTeaching([period('09:00','13:00'),period('13:00','15:00',true)],{maxContinuousMinutes:360,minBreakMinutes:15}).blocked,false);
});
test('explicit no homework is not missing or failed homework',()=>{
 assert.deepEqual(previousHomeworkInput('not_assigned'),{previousHomeworkDone:null,previousHomeworkNotAssigned:true,valid:true});
 assert.equal(previousHomeworkInput('').valid,false);assert.equal(previousHomeworkInput('no').previousHomeworkDone,false);
 assert.match(previousHomeworkLabel(previousHomeworkInput('not_assigned')),/上次未布置/);assert.ok(NO_HOMEWORK_TEXT.includes('Not Set'));
});
const invoice:FinanceDocumentRow={id:'i',channel:'PARENT',type:'INVOICE',docNo:'I1',issueDate:'2057-01-02',packageId:'p',partyLabel:'Student',contextLabel:'Shared',amount:1000,creditAmount:100,adjustedAmount:900,receiptedAmount:300,pendingReceiptAmount:50,rejectedReceiptAmount:0,remainingAmount:600,receiptCount:1,paymentStatus:'PARTIAL',exportHref:null,openHref:'/',exportReady:true,studentIds:['a','b'],sharedPackage:true};
test('invoice summary never double counts receipts, credit notes, duplicates or void documents',()=>{
 const result=summarizeInvoiceRows([invoice,{...invoice}, {...invoice,id:'r',type:'RECEIPT',amount:300}, {...invoice,id:'c',type:'CREDIT_NOTE',amount:100}, {...invoice,id:'void',paymentStatus:'VOID'}]);
 assert.deepEqual(result,{invoiceCount:1,receivable:900,received:300,unpaid:600,pending:50,sharedPackageCount:1});
 assert.equal(filterFinanceDocumentRows([invoice],{studentId:'b'}).length,1);assert.equal(filterFinanceDocumentRows([invoice],{studentId:'unknown'}).length,0);
});

test('explicit personal exemption permits continuous teaching without changing default teachers',()=>{
 const lessons=[period('06:00','18:00'),period('18:00','23:00',true)];
 assert.equal(inspectContinuousTeaching(lessons,{maxContinuousMinutes:240,minBreakMinutes:15,exemptFromBreakRule:true}).blocked,false);
 assert.equal(inspectContinuousTeaching(lessons).blocked,true);
 assert.equal(inspectContinuousTeaching(lessons,{maxContinuousMinutes:240,minBreakMinutes:15,exemptFromBreakRule:false}).blocked,true);
});

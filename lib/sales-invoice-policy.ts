import {createHash} from 'node:crypto';
import {getReceiptApprovalStatus} from './receipt-approval-policy';
import type {EvidenceLead,EvidenceLink} from './sales-evidence-policy';
export type RawRecord=Record<string,unknown>;
function object(v:unknown):v is RawRecord{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function records(v:unknown){return Array.isArray(v)&&v.every(object)?v as RawRecord[]:null;}
export function parseSalesBilling(raw:string|null){
 if(raw===null)return {valid:true,invoices:[] as RawRecord[],receipts:[] as RawRecord[],deleted:[] as RawRecord[]};
 try{const data:unknown=JSON.parse(raw);if(!object(data))throw Error();const invoices=records(data.invoices),receipts=records(data.receipts),deleted=data.deletedInvoices===undefined?[]:records(data.deletedInvoices);if(!invoices||!receipts||!deleted)throw Error();return {valid:true,invoices,receipts,deleted};}catch{return {valid:false,invoices:[],receipts:[],deleted:[]};}
}
export function parseSalesApprovals(raw:string|null){
 if(raw===null)return {valid:true,items:[] as RawRecord[]};
 try{const items=records(JSON.parse(raw));if(!items)throw Error();return {valid:true,items};}catch{return {valid:false,items:[] as RawRecord[]};}
}
function stable(value:unknown):unknown {if(Array.isArray(value))return value.map(stable);if(object(value))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
export function salesInvoiceFingerprint(invoice:RawRecord){return createHash('sha256').update(JSON.stringify(stable(invoice))).digest('hex');}
export function salesMoneyCents(value:unknown):number|null {
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)return null;
 const cents=Math.round(value*100);return Number.isSafeInteger(cents)&&Math.abs(cents-value*100)<0.00001?cents:null;
}
export type InvoiceResult={state:'VERIFIED'|'REVIEW'|'INACTIVE'|'REVOKED';en:string;zh:string;invoiceCents:number|null;approvedCents:number|null;pendingReceipts:number;rejectedReceipts:number};
export type ParentInvoiceContext={billing:ReturnType<typeof parseSalesBilling>;approvals:ReturnType<typeof parseSalesApprovals>;financeApproverEmails:string[];packages:Array<{id:string;studentId:string;sharedStudentIds:string[]}>;conflictingInvoiceIds:Set<string>};
const result=(state:InvoiceResult['state'],en:string,zh:string):InvoiceResult=>({state,en,zh,invoiceCents:null,approvedCents:null,pendingReceipts:0,rejectedReceipts:0});
export function evaluateParentInvoice(link:EvidenceLink&{sourceFingerprint?:string|null},lead:EvidenceLead|null,context:ParentInvoiceContext):InvoiceResult {
 if(link.status==='REVOKED')return result('REVOKED','Attribution revoked; history retained','已撤销归属，保留历史');
 if(link.status!=='ACTIVE'||link.kind!=='PARENT_INVOICE')return result('REVIEW','Unsupported invoice evidence','发票凭据类型或状态需要核对');
 if(!lead||lead.id!==link.leadId||lead.recordKind!=='STUDENT'||lead.relationshipId!==link.relationshipId||lead.convertedStudentId!==link.studentId||lead.relationshipLinkedAt?.getTime()!==link.leadRelationshipLinkedAt?.getTime())return result('REVIEW','Student or relationship link changed; review attribution again','学生或关系关联已变更，请重新核对归属');
 if(!context.billing.valid||!context.approvals.valid)return result('REVIEW','Billing or approval records could not be verified','账单或审批记录无法核实');
 const matches=context.billing.invoices.filter(x=>x.id===link.documentId);
 if(matches.length!==1)return matches.length===0&&context.billing.deleted.some(x=>x.invoiceId===link.documentId)?result('INACTIVE','Invoice deleted; excluded from totals','发票已删除，不计入统计'):result('REVIEW','Invoice missing or duplicate invoice ID','发票不存在或编号重复');
 const invoice=matches[0];
 if(context.billing.deleted.some(x=>x.invoiceId===link.documentId))return result('REVIEW','Invoice also appears in deletion history','发票同时存在于删除历史，请核对');
 if(invoice.studentId!==link.studentId||typeof invoice.packageId!=='string')return result('REVIEW','Invoice student or package ownership differs','发票学生或课包归属不一致');
 const pkg=context.packages.find(p=>p.id===invoice.packageId);
 if(!pkg||(pkg.studentId!==link.studentId&&!pkg.sharedStudentIds.includes(link.studentId)))return result('REVIEW','Package ownership could not be verified','课包归属无法核实');
 if(context.conflictingInvoiceIds.has(link.documentId))return result('REVIEW','A linked contract is attributed to another lead','关联合同已归属其他商机');
 if(!link.sourceFingerprint||salesInvoiceFingerprint(invoice)!==link.sourceFingerprint)return result('REVIEW','Invoice changed; review attribution again','发票内容已变化，请重新核对归属');
 const total=salesMoneyCents(invoice.totalAmount),amount=salesMoneyCents(invoice.amount),gst=salesMoneyCents(invoice.gstAmount);
 if(total===null||amount===null||gst===null||amount+gst!==total)return result('REVIEW','Invoice amount is invalid or inconsistent','发票金额无效或不一致');
 const receipts=evaluateSalesReceipts(link.documentId,context,r=>r.studentId===link.studentId&&r.packageId===invoice.packageId);
 if('error' in receipts)return receipts.error;
 return {state:'VERIFIED',en:'Invoice attribution verified',zh:'发票归属已核实',invoiceCents:total,...receipts};
}

export function summarizeInvoiceEvidence(rows:Array<InvoiceResult&{documentId:string}>) {
 const distinct=new Map(rows.filter(r=>r.state==='VERIFIED').map(r=>[r.documentId,r]));const verified=[...distinct.values()];
 return {verifiedInvoices:verified.length,invoiceCents:verified.reduce((n,r)=>n+r.invoiceCents!,0),approvedCents:verified.reduce((n,r)=>n+r.approvedCents!,0),review:rows.filter(r=>r.state==='REVIEW').length,pendingReceipts:verified.reduce((n,r)=>n+r.pendingReceipts,0),rejectedReceipts:verified.reduce((n,r)=>n+r.rejectedReceipts,0)};
}

export function evaluateSalesReceipts(invoiceId:string,context:Pick<ParentInvoiceContext,'billing'|'approvals'|'financeApproverEmails'>,belongs:(receipt:RawRecord)=>boolean):{error:InvoiceResult}|{approvedCents:number;pendingReceipts:number;rejectedReceipts:number}{
 const receipts=context.billing.receipts.filter(r=>r.invoiceId===invoiceId);
 let approved=0,pending=0,rejected=0;
 for(const receipt of receipts){
  if(typeof receipt.id!=='string'||!receipt.id.trim()||context.billing.receipts.filter(r=>r.id===receipt.id).length!==1)return {error:result('REVIEW','Receipt ID is missing or duplicated','收据编号缺失或重复')};
  if(!belongs(receipt))return {error:result('REVIEW','Receipt ownership does not match this invoice','收据归属与此发票不一致')};
  const cents=salesMoneyCents(receipt.amountReceived);if(cents===null||cents<=0)return {error:result('REVIEW','Receipt amount could not be verified','收据金额无法核实')};
  const approvals=context.approvals.items.filter(a=>a.receiptId===receipt.id);
  if(approvals.length>1)return {error:result('REVIEW','Duplicate receipt approval records','收据审批记录重复')};
  const approval=approvals[0];
  if(approval){
   if(!Array.isArray(approval.financeApprovedBy)||!approval.financeApprovedBy.every(x=>typeof x==='string')||!Array.isArray(approval.managerApprovedBy)||!approval.managerApprovedBy.every(x=>typeof x==='string'))return {error:result('REVIEW','Receipt approver evidence is malformed','收据审批人凭据格式异常')};
   for(const key of ['managerRejectReason','financeRejectReason','managerRejectedAt','financeRejectedAt'])if(approval[key]!=null&&typeof approval[key]!=='string')return {error:result('REVIEW','Receipt rejection evidence is malformed','收据驳回凭据格式异常')};
  }
  // A recorded rejection date also blocks approval even if a legacy record lacks its reason.
  const rejectedAt=approval&&(approval.managerRejectedAt||approval.financeRejectedAt);
  const status=rejectedAt?'REJECTED':getReceiptApprovalStatus(approval as {financeApprovedBy:string[];managerRejectReason?:string;financeRejectReason?:string}|undefined,context);
  if(status==='COMPLETED')approved+=cents;else if(status==='REJECTED')rejected++;else pending++;
  if(!Number.isSafeInteger(approved))return {error:result('REVIEW','Receipt total exceeds the supported amount','收据合计超出可核验范围')};
 }
 return {approvedCents:approved,pendingReceipts:pending,rejectedReceipts:rejected};
}

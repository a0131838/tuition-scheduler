import type {EvidenceLead,EvidenceLink} from './sales-evidence-policy';
import {evaluateSalesReceipts,salesInvoiceFingerprint,salesMoneyCents,summarizeInvoiceEvidence,type InvoiceResult,type ParentInvoiceContext,type RawRecord} from './sales-invoice-policy';
export type PartnerEvidenceSettlement={id:string;studentId:string;partnerId:string|null;mode:string;monthKey:string|null;revertedAt:Date|null;amount:number};
export type PartnerEvidenceCredit={id:string;sourceInvoiceId:string;sourceInvoiceNo:string;currency:string;status:string;issuedAt:Date|null;voidedAt:Date|null;originalInvoiceTotal:number;amount:number;gstAmount:number;totalAmount:number};
export type PartnerInvoiceContext=Pick<ParentInvoiceContext,'billing'|'approvals'|'financeApproverEmails'>&{settlements:PartnerEvidenceSettlement[];credits:PartnerEvidenceCredit[];partnerIds:Set<string>};
export type PartnerInvoiceResult=InvoiceResult&{creditCents:number|null;adjustedInvoiceCents:number|null};
const result=(state:InvoiceResult['state'],en:string,zh:string):PartnerInvoiceResult=>({state,en,zh,invoiceCents:null,approvedCents:null,creditCents:null,adjustedInvoiceCents:null,pendingReceipts:0,rejectedReceipts:0});
export function evaluatePartnerInvoice(link:EvidenceLink&{sourceFingerprint?:string|null},lead:EvidenceLead|null,context:PartnerInvoiceContext):PartnerInvoiceResult{
 if(link.status==='REVOKED')return result('REVOKED','Attribution revoked; history retained','已撤销归属，保留历史');
 if(link.kind!=='PARTNER_INVOICE'||link.status!=='ACTIVE')return result('REVIEW','Unsupported invoice evidence','发票凭据类型或状态需要核对');
 if(!lead||lead.id!==link.leadId||lead.recordKind!=='STUDENT'||lead.relationshipId!==link.relationshipId||lead.convertedStudentId!==link.studentId||lead.relationshipLinkedAt?.getTime()!==link.leadRelationshipLinkedAt?.getTime())return result('REVIEW','Student or relationship link changed; review attribution again','学生或关系关联已变更，请重新核对归属');
 if(!context.billing.valid||!context.approvals.valid)return result('REVIEW','Billing or approval records could not be verified','账单或审批记录无法核实');
 const matches=context.billing.invoices.filter(i=>i.id===link.documentId);
 if(matches.length!==1)return matches.length===0&&context.billing.deleted.some(i=>i.invoiceId===link.documentId)?result('INACTIVE','Invoice deleted; excluded from totals','发票已删除，不计入统计'):result('REVIEW','Invoice missing or duplicate invoice ID','发票不存在或编号重复');
 const invoice=matches[0];
 if(context.billing.deleted.some(i=>i.invoiceId===link.documentId))return result('REVIEW','Invoice also appears in deletion history','发票同时存在于删除历史，请核对');
 if(typeof invoice.partnerId!=='string'||!context.partnerIds.has(invoice.partnerId)||!['ONLINE_PACKAGE_END','OFFLINE_MONTHLY'].includes(String(invoice.mode)))return result('REVIEW','Partner identity or billing mode needs review','合作方身份或结算方式需要核对');
 if(!link.sourceFingerprint||link.sourceFingerprint!==salesInvoiceFingerprint(invoice))return result('REVIEW','Invoice changed; review attribution again','发票内容已变化，请重新核对归属');
 const header=invoice.settlementIds;
 if(!Array.isArray(header)||!header.length||!header.every(id=>typeof id==='string'&&id.trim())||new Set(header).size!==header.length)return result('REVIEW','Settlement references are missing or duplicated','结算关联缺失或重复');
 const settlements=header.map(id=>context.settlements.find(s=>s.id===id));
 if(settlements.some(s=>!s||s.revertedAt||s.partnerId!==invoice.partnerId||s.mode!==invoice.mode))return result('REVIEW','Settlement is missing, reverted or belongs to another partner or mode','结算记录缺失、已撤销或属于其他合作方及结算方式');
 if(settlements.some(s=>s!.studentId!==link.studentId))return result('REVIEW','Consolidated invoice covers other students; no automatic allocation','合并发票包含其他学生，不自动分摊');
 if(invoice.mode==='OFFLINE_MONTHLY'&&(typeof invoice.monthKey!=='string'||!/^\d{4}-\d{2}$/.test(invoice.monthKey)||settlements.some(s=>s!.monthKey!==invoice.monthKey)))return result('REVIEW','Monthly settlement periods differ','月结账期不一致');
 const rawLines=invoice.lines;
 if(!Array.isArray(rawLines)||!rawLines.length||rawLines.some(l=>!l||typeof l!=='object'||Array.isArray(l)))return result('REVIEW','Invoice lines cannot be verified','发票明细无法核实');
 const lines=rawLines as RawRecord[];
 if(lines.some(l=>l.type!=='SETTLEMENT'))return result('REVIEW','Manual invoice lines need allocation review','手工发票明细需要核对归属');
 if(lines.some(l=>typeof l.id!=='string'||!l.id)||new Set(lines.map(l=>l.id)).size!==lines.length)return result('REVIEW','Invoice line IDs are missing or duplicated','发票明细编号缺失或重复');
 const monthlySummary=invoice.mode==='OFFLINE_MONTHLY'&&lines.length===1&&lines[0].settlementId===null;
 if(!monthlySummary&&(lines.length!==header.length||new Set(lines.map(l=>l.settlementId)).size!==header.length||lines.some(l=>typeof l.settlementId!=='string'||!header.includes(l.settlementId))))return result('REVIEW','Invoice header and settlement lines disagree','发票表头与结算明细关联不一致');
 const total=salesMoneyCents(invoice.totalAmount),amount=salesMoneyCents(invoice.amount),gst=salesMoneyCents(invoice.gstAmount);
 if(total===null||amount===null||gst===null||amount+gst!==total)return result('REVIEW','Invoice totals are invalid or inconsistent','发票合计无效或不一致');
 let lineTotal=0,lineGst=0;
 for(const line of lines){
  const lt=salesMoneyCents(line.totalAmount),lg=salesMoneyCents(line.gstAmount);
  // Existing settlement lines store a rounded unit price; total is the settlement amount.
  if(lt===null||lg===null||lg>lt||salesMoneyCents(line.amount)===null||typeof line.quantity!=='number'||!Number.isFinite(line.quantity)||line.quantity<=0)return result('REVIEW','Invoice line amounts cannot be verified','发票明细金额无法核实');
  const expected=monthlySummary?settlements.reduce((n,s)=>n+(salesMoneyCents(s!.amount)??NaN),0):salesMoneyCents(settlements.find(s=>s!.id===line.settlementId)!.amount);
  if(expected===null||!Number.isSafeInteger(expected)||expected!==lt-lg)return result('REVIEW','Invoice line differs from the actual settlement amount','发票明细与实际结算金额不一致');
  lineTotal+=lt;lineGst+=lg;
 }
 if(lineTotal!==total||lineGst!==gst)return result('REVIEW','Invoice line totals differ from the header','发票明细合计与表头不一致');
 let creditCents=0,creditAmount=0,creditGst=0;
 for(const credit of context.credits.filter(c=>c.sourceInvoiceId===link.documentId&&c.status==='ISSUED')){
  const ct=salesMoneyCents(credit.totalAmount),ca=salesMoneyCents(credit.amount),cg=salesMoneyCents(credit.gstAmount);
  if(!credit.issuedAt||credit.voidedAt||credit.currency!=='SGD'||credit.sourceInvoiceNo!==invoice.invoiceNo||salesMoneyCents(credit.originalInvoiceTotal)!==total||ct===null||ca===null||cg===null||ca+cg!==ct)return result('REVIEW','Issued credit note evidence is inconsistent','已开贷项通知单凭据不一致');
  creditCents+=ct;creditAmount+=ca;creditGst+=cg;
 }
 if(!Number.isSafeInteger(creditCents)||creditCents>total||creditAmount>amount||creditGst>gst)return result('REVIEW','Issued credits exceed the original invoice','已开贷项超过原发票金额');
 const receipts=evaluateSalesReceipts(link.documentId,context,r=>r.partnerId===invoice.partnerId&&r.mode===invoice.mode);
 if('error' in receipts)return {...receipts.error,creditCents:null,adjustedInvoiceCents:null};
 return {state:'VERIFIED',en:'Partner invoice attribution verified',zh:'合作方发票归属已核实',invoiceCents:total,creditCents,adjustedInvoiceCents:total-creditCents,...receipts};
}
export function summarizePartnerInvoiceEvidence(rows:Array<PartnerInvoiceResult&{documentId:string}>){
 const verified=[...new Map(rows.filter(r=>r.state==='VERIFIED').map(r=>[r.documentId,r])).values()];
 return {...summarizeInvoiceEvidence(rows),creditCents:verified.reduce((n,r)=>n+r.creditCents!,0),adjustedInvoiceCents:verified.reduce((n,r)=>n+r.adjustedInvoiceCents!,0)};
}

import {canReadSalesEvidence,summarizeContractEvidence} from './sales-evidence-policy';
import {readSalesContractEvidence} from './sales-evidence';
import {readParentInvoiceEvidence} from './sales-invoice-evidence';
import {readPartnerInvoiceEvidence} from './sales-partner-invoice-evidence';
import {summarizeInvoiceEvidence} from './sales-invoice-policy';
import type {RelationshipActor} from './sales-relationship-policy';
/** Batch the exact same evidence readers used on detail pages; never infer financial success from pipeline status. */
export async function readRelationshipFinancialComparison(actor:RelationshipActor,ids:string[]):Promise<Map<string,RelationshipFinancialMetrics>|null>{
 if(!canReadSalesEvidence(actor))return null;
 if(!ids.length)return new Map<string,RelationshipFinancialMetrics>();
 const scope={relationshipId:{in:[...new Set(ids)]}};
 const [contracts,parent,partner]=await Promise.all([readSalesContractEvidence(actor,scope),readParentInvoiceEvidence(actor,scope),readPartnerInvoiceEvidence(actor,scope)]);
 return new Map(ids.map(id=>{
  const c=summarizeContractEvidence(contracts.rows.filter(row=>row.relationshipId===id));
  const p=summarizeInvoiceEvidence(parent.rows.filter(row=>row.relationshipId===id));
  const b=summarizeInvoiceEvidence(partner.rows.filter(row=>row.relationshipId===id));
  return [id,{signed:c.assigned?c.signedContracts:null,parentApproved:p.verifiedInvoices?p.approvedCents:null,partnerApproved:b.verifiedInvoices?b.approvedCents:null,parentInvoices:p.verifiedInvoices,partnerInvoices:b.verifiedInvoices,review:c.review+p.review+b.review}];
 }));
}
export type RelationshipFinancialMetrics={signed:number|null;parentApproved:number|null;partnerApproved:number|null;parentInvoices:number;partnerInvoices:number;review:number};

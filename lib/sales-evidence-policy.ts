import type {RelationshipActor} from './sales-relationship-policy';

// Keep financial evidence inside the existing full administrator scope.
export function canReadSalesEvidence(actor:RelationshipActor) {
  return actor.role==='ADMIN' && !actor.operationsAdmin;
}
export function assertSalesEvidenceAccess(actor:RelationshipActor,write=false) {
  if(!canReadSalesEvidence(actor)||(write&&actor.isObserver)) throw new Error('Financial attribution requires an authorized administrator / 财务归属核对需要具备权限的管理员');
}
export type ContractEvidenceSource={id:string;studentId:string;status:string;signedAt:Date|null;voidedAt:Date|null};
export type EvidenceLink={kind:string;documentId:string;leadId:string;relationshipId:string;studentId:string;status:string;leadRelationshipLinkedAt:Date|null};
export type EvidenceLead={id:string;relationshipId:string|null;convertedStudentId:string|null;recordKind:string;relationshipLinkedAt:Date|null};
export type EvidenceState='SIGNED'|'PENDING'|'INACTIVE'|'REVIEW'|'REVOKED';
export type EvidenceResult={state:EvidenceState;en:string;zh:string};
export function evaluateContractEvidence(link:EvidenceLink,lead:EvidenceLead|null,source:ContractEvidenceSource|null):EvidenceResult {
  if(link.status==='REVOKED')return {state:'REVOKED',en:'Attribution revoked; history retained',zh:'已撤销归属，保留历史'};
  if(link.status!=='ACTIVE'||link.kind!=='CONTRACT')return {state:'REVIEW',en:'Unsupported evidence requires review',zh:'凭据类型或状态需要核对'};
  if(!lead||lead.id!==link.leadId||lead.recordKind!=='STUDENT'||lead.relationshipId!==link.relationshipId||lead.convertedStudentId!==link.studentId||lead.relationshipLinkedAt?.getTime()!==link.leadRelationshipLinkedAt?.getTime())return {state:'REVIEW',en:'Student or relationship link changed; review attribution again',zh:'学生或关系关联已变更，请重新核对归属'};
  if(!source||source.id!==link.documentId||source.studentId!==link.studentId)return {state:'REVIEW',en:'Contract is missing or belongs to another student',zh:'合同不存在或不属于该学生'};
  if(source.voidedAt||['VOID','EXPIRED'].includes(source.status))return {state:'INACTIVE',en:'Void or expired contract excluded',zh:'已作废或失效的合同不计入签约'};
  if(['SIGNED','INVOICE_CREATED'].includes(source.status))return source.signedAt?{state:'SIGNED',en:'Signed contract verified',zh:'已核实签署合同'}:{state:'REVIEW',en:'Signed status has no signature date',zh:'签署状态缺少签署时间'};
  if(source.signedAt)return {state:'REVIEW',en:'Signature date conflicts with contract status',zh:'签署时间与合同状态不一致'};
  if(['DRAFT','INTAKE_PENDING','INTAKE_SUBMITTED','CONTRACT_DRAFT','INFO_PENDING','INFO_SUBMITTED','READY_TO_SIGN'].includes(source.status))return {state:'PENDING',en:'Not signed yet',zh:'尚未签署'};
  return {state:'REVIEW',en:'Unknown contract status',zh:'合同状态需要核对'};
}
export function summarizeContractEvidence(rows:Array<EvidenceResult & {documentId:string}>) {
  return {signedContracts:new Set(rows.filter(r=>r.state==='SIGNED').map(r=>r.documentId)).size,pending:rows.filter(r=>r.state==='PENDING').length,review:rows.filter(r=>r.state==='REVIEW').length,assigned:rows.filter(r=>r.state!=='REVOKED').length};
}

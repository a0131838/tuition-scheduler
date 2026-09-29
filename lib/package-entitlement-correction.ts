import {Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {prisma} from './prisma';
import {readPackageCorrectionInTransaction} from './package-correction-evidence';
import {previewPackageCorrection} from './package-correction-policy';
import {salesInvoiceFingerprint} from './sales-invoice-policy';
import {buildAbnormalLedgerNote} from './package-ledger-guard';
export type CorrectionActor={id:string;email:string;role:string;isObserver?:boolean;operationsAdmin?:boolean};
export function canApplyEntitlementCorrection(actor:CorrectionActor|null|undefined){return !!actor&&actor.role==='ADMIN'&&actor.email.trim().toLowerCase()==='zhaohongwei0880@gmail.com'&&!actor.isObserver&&!actor.operationsAdmin;}
export class EntitlementCorrectionError extends Error{constructor(message:string,public status=409){super(message);}}
export type EntitlementCorrectionInput={packageId:string;sourceTxnId:string;requestKey:string;fingerprint:string;target:string;reason:string;evidence:string;acknowledged:boolean};
function normalize(input:EntitlementCorrectionInput){
 const value={...input,reason:typeof input.reason==='string'?input.reason.trim():'',evidence:typeof input.evidence==='string'?input.evidence.trim():''};
 if(![value.packageId,value.sourceTxnId,value.requestKey].every(x=>typeof x==='string'&&/^[a-zA-Z0-9-]{10,100}$/.test(x))||typeof value.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(value.fingerprint)||typeof value.target!=='string'||value.target.length>40)throw new EntitlementCorrectionError('Invalid correction request / 更正请求无效',400);
 if(value.reason.length<10||value.reason.length>2000||value.evidence.length<10||value.evidence.length>4000||value.acknowledged!==true)throw new EntitlementCorrectionError('Record the reason and source evidence and acknowledge the scope / 请填写原因、原始凭据并确认处理范围',400);
 return value;
}
export async function applyEntitlementCorrectionInTransaction(db:Prisma.TransactionClient,actor:CorrectionActor,raw:EntitlementCorrectionInput){
 if(!canApplyEntitlementCorrection(actor))throw new EntitlementCorrectionError('Only the owner can record entitlement corrections / 仅老板可登记权益更正',403);
 const user=await db.user.findUnique({where:{id:actor.id},select:{email:true,role:true,isObserver:true}});
 if(!user||user.email.toLowerCase()!==actor.email.toLowerCase()||!canApplyEntitlementCorrection({...user,id:actor.id}))throw new EntitlementCorrectionError('Permission changed / 权限已变更',403);
 const input=normalize(raw),requestHash=salesInvoiceFingerprint(input);
 await db.$queryRaw`SELECT id FROM "CoursePackage" WHERE id=${input.packageId} FOR UPDATE`;
 const prior=await db.packageEntitlementCorrection.findUnique({where:{requestKey:input.requestKey}});
 if(prior){if(prior.packageId!==input.packageId||prior.requestHash!==requestHash)throw new EntitlementCorrectionError('Request key already belongs to another correction / 请求编号已用于其他更正');return prior;}
 const data=await readPackageCorrectionInTransaction(input.packageId,db);
 if(!data)throw new EntitlementCorrectionError('Package not found / 课包不存在',404);
 if(data.fingerprint!==input.fingerprint)throw new EntitlementCorrectionError('Evidence changed; reload and preview again / 凭据已变化，请刷新并重新预览');
 const preview=previewPackageCorrection(data.facts,input.target);
 if(!preview?.ready||preview.target===null||preview.delta===null||preview.remaining===null||preview.delta>=0)throw new EntitlementCorrectionError('Correction is blocked or has no cancelled entitlement; review the preview / 更正被阻断或没有取消权益，请核对预览');
 const source=data.txns.find(t=>t.id===input.sourceTxnId&&t.kind==='PURCHASE');
 const priorDelta=data.corrections.filter(c=>c.sourceTxnId===input.sourceTxnId).reduce((n,c)=>n+c.deltaUnits,0);
 if(!source||source.deltaMinutes+priorDelta+preview.delta<0)throw new EntitlementCorrectionError('Select the exact purchase with enough uncancelled entitlement / 请选择有足够未取消权益的原始购入流水');
 const id=randomUUID();
 const adjustment=await db.packageTxn.create({data:{packageId:input.packageId,kind:'ADJUST',deltaMinutes:preview.delta,note:buildAbnormalLedgerNote({reasonCategory:'DATA_FIX',approver:actor.email,evidenceNote:input.evidence,detailNote:`${input.reason}\npackage-entitlement-correction:${id}`})}});
 await db.coursePackage.update({where:{id:input.packageId},data:{totalMinutes:preview.target,remainingMinutes:preview.remaining}});
 const saved=await db.packageEntitlementCorrection.create({data:{id,packageId:input.packageId,sourceTxnId:source.id,adjustmentTxnId:adjustment.id,requestKey:input.requestKey,requestHash,sourceFingerprint:data.fingerprint,sourceUnits:source.deltaMinutes,unit:data.facts.unit,beforeTotal:data.pkg.totalMinutes!,afterTotal:preview.target,beforeBalance:data.facts.balance,afterBalance:preview.remaining,deltaUnits:preview.delta,reason:input.reason,evidence:input.evidence,actorUserId:actor.id,actorEmail:actor.email}});
 await db.auditLog.create({data:{actorEmail:actor.email,actorRole:actor.role,module:'PACKAGE_LEDGER',action:'APPLY_ENTITLEMENT_CORRECTION',entityType:'PackageEntitlementCorrection',entityId:saved.id,meta:{requestHash,packageId:input.packageId,sourceTxnId:source.id,adjustmentTxnId:adjustment.id,before:{total:data.pkg.totalMinutes,remaining:data.facts.balance},after:{total:preview.target,remaining:preview.remaining},deltaUnits:preview.delta,unit:data.facts.unit,reason:input.reason,evidence:input.evidence,billingContractsAttendanceUnchanged:true}}});
 return saved;
}
export async function applyEntitlementCorrection(actor:CorrectionActor,input:EntitlementCorrectionInput){
 try{return await prisma.$transaction(db=>applyEntitlementCorrectionInTransaction(db,actor,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:15000});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&(['P2034','P2002'].includes(error.code)||(error.code==='P2010'&&['40001','40P01'].includes(String(error.meta?.code)))))throw new EntitlementCorrectionError('Concurrent change; reload before retrying / 同时发生变更，请刷新后重试');throw error;}
}

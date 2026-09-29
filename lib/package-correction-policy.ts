import {renewalEntitlementUnit} from './renewal-entitlement-policy';
export type CorrectionIssue={en:string;zh:string};
export type CorrectionPackage={type:string;note:string|null;totalMinutes:number|null;remainingMinutes:number|null;sharedStudentIds:string[];settlementMode:string|null};
export type CorrectionTxn={id:string;kind:string;deltaMinutes:number;sessionId:string|null;note:string|null};
export type CorrectionProof={id:string;sourceTxnId:string;adjustmentTxnId:string;sourceUnits:number;unit:string;deltaUnits:number;beforeTotal:number;afterTotal:number;beforeBalance:number;afterBalance:number;audited:boolean};
export function verifiedCorrectionMovements(unit:string,txns:CorrectionTxn[],records:CorrectionProof[]){
 const valid=new Set<string>();let cancelled=0,invalid=false;
 const sourceDeltas=new Map<string,number>();
 for(const r of records){
  const source=txns.find(t=>t.id===r.sourceTxnId),adjustment=txns.find(t=>t.id===r.adjustmentTxnId);
  const ok=r.audited&&r.unit===unit&&source?.kind==='PURCHASE'&&source.deltaMinutes===r.sourceUnits&&r.sourceUnits>0&&adjustment?.kind==='ADJUST'&&adjustment.deltaMinutes===r.deltaUnits&&adjustment.sessionId===null&&r.deltaUnits<0&&r.afterTotal>=0&&r.afterBalance>=0&&r.beforeTotal+r.deltaUnits===r.afterTotal&&r.beforeBalance+r.deltaUnits===r.afterBalance&&!valid.has(r.adjustmentTxnId);
  if(!ok){invalid=true;continue;}valid.add(r.adjustmentTxnId);cancelled+=r.deltaUnits;sourceDeltas.set(r.sourceTxnId,(sourceDeltas.get(r.sourceTxnId)||0)+r.deltaUnits);
 }
 for(const [id,delta] of sourceDeltas)if((txns.find(t=>t.id===id)?.deltaMinutes||0)+delta<0)invalid=true;
 return {valid,cancelled,invalid};
}
/** Package-level accounting facts, never a claim about one shared student's attendance or payment. */
export function packageCorrectionFacts(pkg:CorrectionPackage,txns:CorrectionTxn[],corrections:CorrectionProof[]=[]){
 const issues:CorrectionIssue[]=[],unit=renewalEntitlementUnit(pkg);
 const add=(en:string,zh:string)=>{if(!issues.some(i=>i.en===en))issues.push({en,zh});};
 const verified=verifiedCorrectionMovements(unit,txns,corrections);
 if(verified.invalid)add("Correction history or audit evidence is inconsistent","更正历史或审计凭据不一致");
 const sums={purchase:0,gift:0,deduct:0,rollback:0,adjust:0,other:0};
 let balance=0;
 for(const txn of txns){
  if(!Number.isSafeInteger(txn.deltaMinutes)){add('Invalid ledger quantity','流水数量无效');continue;}
  balance+=txn.deltaMinutes;
  const key=txn.kind.toLowerCase() as keyof typeof sums;
  sums[Object.hasOwn(sums,key)?key:'other']+=txn.deltaMinutes;
  if(!['PURCHASE','GIFT','DEDUCT','ROLLBACK','ADJUST'].includes(txn.kind))add('Unknown ledger movement needs review','存在未知流水类型，需要核对');
  if((['PURCHASE','GIFT','ROLLBACK'].includes(txn.kind)&&txn.deltaMinutes<0)||(txn.kind==='DEDUCT'&&txn.deltaMinutes>0))add('Ledger direction needs review','流水增减方向异常，需要核对');
 }
 const netDeducted=-(sums.deduct+sums.rollback);
 if(!Object.values(sums).every(Number.isSafeInteger)||!Number.isSafeInteger(balance))add('Ledger total exceeds supported range','流水合计超出支持范围');
 if(unit==='PERIOD')add('Monthly entitlement uses validity dates; do not subtract hours','月包按有效期管理，不能按课时相减');
 else {
  if(!txns.some(x=>x.kind==='PURCHASE'))add('Purchase ledger evidence is missing','缺少购入流水凭据');
  if(pkg.remainingMinutes!==balance)add('Stored balance differs from the ledger','系统余额与流水合计不一致');
  if(pkg.totalMinutes!==sums.purchase+verified.cancelled)add('Recorded total differs from purchase entries','登记总量与购入流水不一致');
  if(netDeducted<0)add('Rollbacks exceed recorded deductions','退课流水超过已记扣减，需要核对');
 }
 if(txns.some(x=>x.kind==='ADJUST'&&!verified.valid.has(x.id)))add('Historical adjustments need source review','存在历史调整，请先核对来源');
 // A shared package's total may be reconciled, but a student's cancellation cannot be inferred from it.
 if(pkg.sharedStudentIds.length)add('Shared entitlement needs an explicit allocation review','共享课包需明确核对权益归属');
 if(['ONLINE_PACKAGE_END','OFFLINE_MONTHLY'].includes(pkg.settlementMode||''))add('Partner settlement and credits need Finance review','合作方结算及贷项需由财务核对');
 return {unit,recordedTotal:pkg.totalMinutes,storedRemaining:pkg.remainingMinutes,...sums,verifiedCorrection:verified.cancelled,netDeducted,balance,issues};
}
export function previewPackageCorrection(facts:ReturnType<typeof packageCorrectionFacts>,rawTarget:string|undefined){
 if(rawTarget===undefined||rawTarget.trim()==='')return null;
 const issues=[...facts.issues];const raw=rawTarget.trim();
 const n=/^\d+(?:\.\d+)?$/.test(raw)?Number(raw):NaN;
 const value=facts.unit==='MINUTES'?n*60:n;const target=Math.round(value);
 if(!Number.isFinite(value)||!Number.isSafeInteger(target)||Math.abs(target-value)>0.000001||target<0)issues.push({en:'Enter a nonnegative quantity in whole minutes or whole lessons',zh:'请输入非负数量，小时必须折合整分钟，次数必须为整数'});
 if(facts.recordedTotal===null||target>facts.recordedTotal)issues.push({en:'This cancellation preview cannot increase purchased entitlement',zh:'此取消预览不能增加购入权益'});
 const delta=target-(facts.recordedTotal??NaN),remaining=facts.balance+delta;
 if(remaining<0)issues.push({en:'Proposed cancellation exceeds the recorded remaining balance',zh:'拟取消权益超过流水余额，不能继续'});
 return {target:Number.isSafeInteger(target)?target:null,delta:Number.isSafeInteger(delta)?delta:null,remaining:Number.isSafeInteger(remaining)?remaining:null,issues,ready:issues.length===0};
}

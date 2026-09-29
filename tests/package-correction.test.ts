import assert from 'node:assert/strict';
import test from 'node:test';
import {packageCorrectionFacts,previewPackageCorrection,type CorrectionPackage,type CorrectionTxn} from '../lib/package-correction-policy';
const pkg:CorrectionPackage={type:'HOURS',note:null,totalMinutes:6000,remainingMinutes:2130,sharedStudentIds:[],settlementMode:null};
const txn=(kind:string,deltaMinutes:number):CorrectionTxn=>({id:kind,kind,deltaMinutes,sessionId:null,note:null});
const rows=[txn('PURCHASE',6000),txn('DEDUCT',-3870)];
test('100 purchased /64.5 consumed can preview cancelled35.5 with zero remaining without inferring money',()=>{const facts=packageCorrectionFacts(pkg,rows),p=previewPackageCorrection(facts,'64.5')!;assert.equal(p.ready,true);assert.equal(p.delta,-2130);assert.equal(p.remaining,0);assert.equal(facts.netDeducted,3870);});
test('gifts remain separate from purchase correction and rollbacks offset recorded deductions',()=>{const facts=packageCorrectionFacts({...pkg,remainingMinutes:2310},[...rows,txn('GIFT',120),txn('ROLLBACK',60)]);const p=previewPackageCorrection(facts,'64.5')!;assert.equal(p.ready,true);assert.equal(p.remaining,180);assert.equal(facts.netDeducted,3810);});
test('spent entitlement cannot be cancelled into a negative balance and increases are not cancellations',()=>{const f=packageCorrectionFacts(pkg,rows);assert.equal(previewPackageCorrection(f,'50')?.ready,false);assert.equal(previewPackageCorrection(f,'101')?.ready,false);});
test('ledger mismatch, missing purchase and legacy adjustment block confident preview',()=>{for(const f of [packageCorrectionFacts({...pkg,remainingMinutes:2200},rows),packageCorrectionFacts(pkg,[txn('ADJUST',2130)]),packageCorrectionFacts(pkg,[...rows,txn('ADJUST',0)]),packageCorrectionFacts({...pkg,totalMinutes:5900},rows)])assert.equal(previewPackageCorrection(f,'64.5')?.ready,false);});
test('shared and partner packages require allocation or settlement review',()=>{for(const p of [{...pkg,sharedStudentIds:['shared']},{...pkg,settlementMode:'ONLINE_PACKAGE_END'},{...pkg,settlementMode:'OFFLINE_MONTHLY'}])assert.equal(previewPackageCorrection(packageCorrectionFacts(p,rows),'64.5')?.ready,false);});
test('monthly does not calculate hours and group packs use count rather than60minutes',()=>{assert.equal(previewPackageCorrection(packageCorrectionFacts({...pkg,type:'MONTHLY'},rows),'50')?.ready,false);const f=packageCorrectionFacts({...pkg,note:'[GROUP_PACK]',totalMinutes:10,remainingMinutes:4},[txn('PURCHASE',10),txn('DEDUCT',-6)]);assert.equal(f.unit,'COUNT');assert.equal(previewPackageCorrection(f,'6')?.remaining,0);assert.equal(previewPackageCorrection(f,'6.5')?.ready,false);});
test('invalid targets, fractional minutes, ledger direction and unknown movements are rejected',()=>{const f=packageCorrectionFacts(pkg,rows);for(const v of ['-1','abc','1e2','Infinity','1.0001'])assert.equal(previewPackageCorrection(f,v)?.ready,false);assert.equal(previewPackageCorrection(f,''),null);for(const entry of [txn('constructor',1),txn('DEDUCT',10),txn('ROLLBACK',-5),txn('ROLLBACK',5000)])assert.equal(previewPackageCorrection(packageCorrectionFacts(pkg,[...rows,entry]),'64.5')?.ready,false);});

test('only audited matching correction entries reconcile purchase totals; unknown adjustments remain blocked',()=>{
 const source=txn('PURCHASE',6000),adjust={...txn('ADJUST',-2130),id:'correction-adjustment'},deduct=txn('DEDUCT',-3870);
 const proof={id:'correction',sourceTxnId:source.id,adjustmentTxnId:adjust.id,sourceUnits:6000,unit:'MINUTES',deltaUnits:-2130,beforeTotal:6000,afterTotal:3870,beforeBalance:2130,afterBalance:0,audited:true};
 const changed={...pkg,totalMinutes:3870,remainingMinutes:0};
 assert.equal(packageCorrectionFacts(changed,[source,deduct,adjust],[proof]).issues.length,0);
 for(const bad of [{...proof,audited:false},{...proof,unit:'COUNT'},{...proof,sourceUnits:5000},{...proof,afterBalance:60}])assert.ok(packageCorrectionFacts(changed,[source,deduct,adjust],[bad]).issues.length>0);
 assert.ok(packageCorrectionFacts(changed,[source,deduct,adjust,txn('ADJUST',0)],[proof]).issues.length>0);
});

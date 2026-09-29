'use client';
import {useState,type FormEvent} from 'react';
import type {Lang} from '@/lib/i18n';
const t=(lang:Lang,en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;
export default function PackageCorrectionForm({packageId,lang,target,fingerprint,requestKey,purchases,backHref}:{packageId:string;lang:Lang;target:string;fingerprint:string;requestKey:string;purchases:Array<{id:string;label:string}>;backHref:string}){
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending)return;const form=new FormData(event.currentTarget);setPending(true);setError('');
  try{const response=await fetch(`/api/admin/packages/${encodeURIComponent(packageId)}/corrections`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey,fingerprint,target,sourceTxnId:form.get('sourceTxnId'),reason:form.get('reason'),evidence:form.get('evidence'),acknowledged:form.get('acknowledged')==='on'})});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.message||t(lang,'Correction could not be recorded','未能登记更正'));
   const url=new URL(backHref,window.location.origin);url.searchParams.set('view','correction');url.searchParams.set('correction',result.id);window.location.assign(url.toString());
  }catch(e){const message=e instanceof Error?e.message:t(lang,'Reload and verify the result before retrying','重试前请刷新并核对处理结果');const parts=message.split(' / ');setError(parts.length===2?t(lang,parts[0],parts[1]):message);setPending(false);}
 }
 return <form onSubmit={submit} style={{marginTop:18}}><fieldset disabled={pending} style={{border:'1px solid #cbd5e1',borderRadius:10,padding:16,display:'grid',gap:12}}><legend>{t(lang,'Owner: record the reviewed correction','老板：登记已核对的更正')}</legend>
  <p>{t(lang,"Each correction refers to one original purchase. Review multiple purchases separately.","每次更正对应一条原始购入，多笔购入请分别核对。")}</p>
  <label>{t(lang,'Original purchase entry','原始购入流水')}<br/><select name="sourceTxnId" required defaultValue="" style={{maxWidth:'100%',padding:10}}><option value="">{t(lang,'Select the exact original entry','选择对应的原始记录')}</option>{purchases.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
  <label>{t(lang,'Correction reason','更正原因')}<br/><textarea name="reason" required minLength={10} maxLength={2000} rows={2} style={{width:'100%'}}/></label>
  <label>{t(lang,'Source evidence and review basis','原始凭据及核对依据')}<br/><textarea name="evidence" required minLength={10} maxLength={4000} rows={3} style={{width:'100%'}}/></label>
  <label><input type="checkbox" name="acknowledged" required/> {t(lang,'I reviewed the purchase, contract, invoice and upcoming lessons. Record entitlement cancellation only; no refund or invoice/contract change is included.','我已核对购入、合同、发票及后续课程。本次仅登记权益取消，不包括退款或发票、合同变更。')}</label>
  <button type="submit" style={{padding:12,justifySelf:'start'}}>{pending?t(lang,'Recording…','正在登记…'):t(lang,'Record entitlement cancellation only','仅登记权益取消')}</button>
 </fieldset>{error?<p role="alert" style={{color:'#b91c1c'}}>{error}</p>:null}</form>;
}

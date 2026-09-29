'use client';
import {useState,type CSSProperties,type ReactNode} from 'react';
import {type Lang} from '@/lib/i18n';
/** Open the committed invoice result and prevent duplicate in-flight submissions. */
export default function InvoiceArchiveForm({action,lang,packageId,view,children,style}:{action:(formData:FormData)=>Promise<string>;lang:Lang;packageId:string;view:'billing'|'contract';children:ReactNode;style?:CSSProperties}){
 const [pending,setPending]=useState(false),[failed,setFailed]=useState(false);
 const label=(en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;
 return <form action={async formData=>{
  if(pending)return;
  setPending(true);setFailed(false);
  try {
   const result=await action(formData),url=new URL(result,window.location.origin);
   if(url.origin!==window.location.origin||url.pathname!==`/admin/packages/${encodeURIComponent(packageId)}/${view}`)throw new Error('Invalid result location');
   window.location.assign(result);
  }catch {setFailed(true);setPending(false);}
 }}>
 <fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0,...style}}>{children}</fieldset>
 {pending?<p role="status">{label('Saving invoice result…','正在保存发票处理结果…')}</p>:null}
 {failed?<p role="alert">{label('The result could not be opened. Reload and check the invoice before retrying.','未能打开处理结果，请刷新并核对发票后再重试。')}</p>:null}
 </form>;
}

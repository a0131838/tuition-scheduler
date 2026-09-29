'use client';
import {useState,type CSSProperties,type ReactNode} from 'react';
import type {Lang} from '@/lib/i18n';
/** Navigate to the committed result; do not leave a saved form showing stale state. */
export default function MonthlyStatusForm({action,lang,children,style}:{action:(data:FormData)=>Promise<string>;lang:Lang;children:ReactNode;style?:CSSProperties}) {
 const [pending,setPending]=useState(false),[failed,setFailed]=useState(false);
 const label=(en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;
 return <form action={async data=>{
  if(pending)return;setPending(true);setFailed(false);
  try {const result=await action(data),url=new URL(result,window.location.origin);
   if(url.origin!==window.location.origin||url.pathname!=='/admin/monthly-scheduling')throw Error('Invalid result location');
   window.location.assign(result);
  }catch {setPending(false);setFailed(true);}
 }}>
  <fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0,...style}}>{children}</fieldset>
  {pending&&<p role="status">{label('Saving verification result…','正在保存核验结果…')}</p>}
  {failed&&<p role="alert">{label('Could not open the result. Reload and check the current record before retrying.','未能打开处理结果，请刷新核对当前记录后再重试。')}</p>}
 </form>;
}

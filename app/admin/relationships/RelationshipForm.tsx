'use client';
import {useState,type CSSProperties,type ReactNode} from 'react';
import {type Lang} from '@/lib/i18n';

/** A completed mutation opens its saved result, avoiding a stale client route cache. */
export default function RelationshipForm({action,lang,children,style}:{action:(formData:FormData)=>Promise<string>;lang:Lang;children:ReactNode;style?:CSSProperties}){
 const [pending,setPending]=useState(false),[failed,setFailed]=useState(false);
 const label=(en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;
 return <form action={async formData=>{
  if(pending)return;
  setPending(true);setFailed(false);
  try {const result=await action(formData);if(!/^\/admin\/(relationships|leads|students)(\/|\?)/.test(result)&&result!=='/admin/relationships')throw new Error('Invalid result location');window.location.assign(result);}
  catch {setFailed(true);setPending(false);}
 }}>
  <fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0,...style}}>{children}</fieldset>
  {pending?<p role="status">{label('Saving…','保存中…')}</p>:null}
  {failed?<p role="alert">{label('The result could not be opened. Reload and check the record before retrying.','未能打开处理结果。请刷新并核对记录后再重试。')}</p>:null}
 </form>;
}

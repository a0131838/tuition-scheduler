"use client";

import React, { useState, type ReactNode } from "react";
import { submitTrainingPractical, submitTrainingPracticalForm } from "./actions";

export default function TrainingPracticalForm({moduleCode,children}:{moduleCode:string;children:ReactNode}) {
  const [pending,setPending]=useState(false);
  const [result,setResult]=useState<{ok:boolean;message:string}|null>(null);
  return <form action={submitTrainingPractical} onSubmit={async event=>{
    event.preventDefault();
    if(pending)return;
    const data=new FormData(event.currentTarget);
    setPending(true);setResult(null);
    try{setResult(await submitTrainingPracticalForm(data));}
    catch{setResult({ok:false,message:'Unable to confirm submission. Your entries are still here; refresh and check the saved status before trying again. / 暂时无法确认提交结果，填写内容已保留；请刷新核对保存状态后再决定是否重试。'});}
    finally{setPending(false);}
  }} style={{display:'grid',gap:8}}>
    <input type="hidden" name="moduleCode" value={moduleCode}/>
    <fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0,display:'grid',gap:8}}>{children}</fieldset>
    {pending?<p role="status">Submitting / 正在提交…</p>:null}
    {result?<p role={result.ok?'status':'alert'} style={{margin:0,color:result.ok?'#166534':'#b91c1c'}}>{result.message}</p>:null}
  </form>;
}

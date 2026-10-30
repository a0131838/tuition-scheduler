"use client";
import { useState } from "react";
type Rule = {maxContinuousMinutes:number;minBreakMinutes:number;exemptFromBreakRule:boolean;updatedAt:string;reason:string};
export default function TeachingRuleEditor({teacherId,initial,canEdit}:{teacherId:string;initial:Rule|null;canEdit:boolean}){
 const [row,setRow]=useState(initial),[exempt,setExempt]=useState(initial?.exemptFromBreakRule??false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <details style={{padding:12,border:'1px solid #ddd',marginBottom:12}}>
  <summary>Continuous teaching / 连续授课与休息：{row?.exemptFromBreakRule?'Exempt / 本规则已豁免':`${row?.maxContinuousMinutes??240} min / 分钟；break / 休息 ${row?.minBreakMinutes??15} min / 分钟`}</summary>
  <p>{row?.exemptFromBreakRule?'Confirmed exemption from continuous teaching and break limits / 已确认不适用本条连续授课及休息限制':row?'Confirmed individual rule / 已确认个人规则':'Inherited default: 4 hours, then at least 15 minutes break / 沿用默认：连续4小时后至少休息15分钟'}</p>
  {canEdit?<form onSubmit={async e=>{
   e.preventDefault();setBusy(true);const data=new FormData(e.currentTarget);
   try{
    const response=await fetch(`/api/admin/teachers/${teacherId}/teaching-rule`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({exemptFromBreakRule:exempt,maxContinuousMinutes:exempt?(row?.maxContinuousMinutes??240):Number(data.get('max')),minBreakMinutes:exempt?(row?.minBreakMinutes??15):Number(data.get('rest')),reason:data.get('reason'),updatedAt:row?.updatedAt||''})});
    const result=await response.json();if(!response.ok)throw new Error(result.message);setRow(result.rule);setExempt(result.rule.exemptFromBreakRule);setMessage('Saved / 已保存');
   }catch(e){setMessage(e instanceof Error?e.message:'Failed');}finally{setBusy(false);}
  }} style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <label><input name="exempt" type="checkbox" checked={exempt} onChange={e=>setExempt(e.target.checked)}/>Exempt from this teaching/break rule / 豁免本条连续授课及休息限制</label>
   <label>Maximum consecutive minutes / 连续上限分钟 <input name="max" type="number" min={15} max={720} defaultValue={row?.maxContinuousMinutes??240} disabled={exempt} required={!exempt}/></label>
   <label>Minimum break / 最短休息分钟 <input name="rest" type="number" min={15} max={120} defaultValue={row?.minBreakMinutes??15} disabled={exempt} required={!exempt}/></label>
   <label>Teacher agreement and reason / 老师确认及依据 <input name="reason" minLength={5} maxLength={1000} required defaultValue={row?.reason||''}/></label>
   <button disabled={busy}>Confirm rule / 确认规则</button>
  </form>:<p>Only the owner or an authorized manager may confirm an exception. / 仅老板或授权主管可确认例外。</p>}
  <p role="status">{message}</p>
 </details>;
}

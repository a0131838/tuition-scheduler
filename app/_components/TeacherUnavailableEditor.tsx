'use client';
import {useEffect,useState} from 'react';
import type {Lang} from '@/lib/i18n';
type Block={id:string;date:string;startMin:number;endMin:number;note?:string|null;updatedAt:string};
export default function TeacherUnavailableEditor({endpoint,month,lang}:{endpoint:string;month:string;lang:Lang}){
  const [date,setDate]=useState(month+'-01'),[fullDay,setFullDay]=useState(true),[start,setStart]=useState('09:00'),[end,setEnd]=useState('18:00'),[note,setNote]=useState(''),[rows,setRows]=useState<Block[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const tr=(en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;
  const fmt=(min:number)=>`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
  const min=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
  useEffect(()=>setDate(month+'-01'),[month]);
  async function load(){const res=await fetch(`${endpoint}?month=${date.slice(0,7)}`,{cache:'no-store'});if(!res.ok)throw Error(await res.text());setRows((await res.json()).blocks);}
  useEffect(()=>{let current=true;fetch(`${endpoint}?month=${date.slice(0,7)}`,{cache:'no-store'}).then(async res=>{if(!res.ok)throw Error(await res.text());return res.json();}).then(data=>{if(current)setRows(data.blocks);}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};},[endpoint,date]);
  async function act(method:string,body:object){setBusy(true);setError('');setMessage('');try{const res=await fetch(endpoint,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok)throw Error(await res.text());const data=await res.json();await load();setMessage(data.existingLessons?tr(`Saved. ${data.existingLessons} existing lesson(s) overlap; review them separately.`,`已保存；有 ${data.existingLessons} 条已有课程与不可用时段重叠，请单独核对。`):tr('Saved. Existing lessons are retained.','已保存，现有课程保留。'));}catch(e){setError(e instanceof Error?e.message:'Error');}finally{setBusy(false);}}
  return <section style={{border:'1px solid #fecaca',borderRadius:12,padding:16,margin:'16px 0',display:'grid',gap:10}}>
    <h3 style={{margin:0}}>{tr('Unavailable dates and times','不可用日期与时段')}</h3>
    <p style={{margin:0,color:'#475569'}}>{tr('Unavailable intervals take priority over date slots and weekly templates. Existing lessons need a separate review.','不可用时段优先于日期可用时间和每周模板；已有课程需要单独核对。')}</p>
    {error&&<div role="alert" style={{color:'#b91c1c'}}>{error}</div>}{message&&<div role="status">{message}</div>}
    <form onSubmit={e=>{e.preventDefault();void act('POST',{date,fullDay,startMin:min(start),endMin:min(end),note});}} style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
      <label>{tr('Date','日期')}<input type="date" required value={date} onChange={e=>setDate(e.target.value)} style={{display:'block',minHeight:40}}/></label>
      <label><input type="checkbox" checked={fullDay} onChange={e=>setFullDay(e.target.checked)}/>{tr('Unavailable all day','全天不可用')}</label>
      {!fullDay&&<><label>{tr('From','开始')}<input type="time" required value={start} onChange={e=>setStart(e.target.value)} style={{display:'block',minHeight:40}}/></label><label>{tr('To','结束')}<input type="time" required value={end} onChange={e=>setEnd(e.target.value)} style={{display:'block',minHeight:40}}/></label></>}
      <label>{tr('Note (optional)','备注（可选）')}<input value={note} maxLength={500} onChange={e=>setNote(e.target.value)} style={{display:'block',minHeight:40}}/></label>
      <button disabled={busy} style={{minHeight:40}}>{tr('Save unavailable time','保存不可用时间')}</button>
    </form>
    {rows.length?rows.map(row=><div key={row.id} style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',padding:8,background:'#fff1f2'}}><b>{row.date} · {row.startMin===0&&row.endMin===1440?tr('All day unavailable','全天不可用'):`${fmt(row.startMin)}–${fmt(row.endMin)}`}</b><span>{row.note}</span><button disabled={busy} onClick={()=>void act('DELETE',{id:row.id,updatedAt:row.updatedAt})}>{tr('Remove restriction','移除限制')}</button></div>):<div style={{color:'#64748b'}}>{tr('No unavailable intervals recorded this month. Empty dates still need confirmed date availability.','本月暂无不可用记录；没有日期可用时段的日期仍需先确认。')}</div>}
  </section>;
}

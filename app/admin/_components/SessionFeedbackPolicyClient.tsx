'use client';
import {useState} from 'react';
import {type Lang} from '@/lib/i18n';
import {type FeedbackActivity} from '@/lib/session-feedback-policy';
export default function SessionFeedbackPolicyClient({studentSummary,sessionId,fingerprint,activity,reason,stale,canManage,lang,reviewedBy,reviewedAt}:{studentSummary:string;sessionId:string;fingerprint:string;activity:FeedbackActivity;reason:string;stale:boolean;canManage:boolean;lang:Lang;reviewedBy?:string;reviewedAt?:string}){
 const [value,setValue]=useState(activity),[basis,setBasis]=useState(''),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const label=(en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;
 return <details style={{border:'1px solid #cbd5e1',borderRadius:12,padding:14,marginBottom:16}}><summary style={{fontWeight:700}}>{label('Feedback requirement review','课后反馈适用范围核对')}</summary>
 <p>{label("Student(s)","学生")}: {studentSummary||label("Needs review","待核对")}</p>
 <p>{stale?label('The session has changed. Earlier exemption is no longer valid; review it again.','课次已变更，旧豁免已失效，请重新核对。'):activity==='TEACHING'?label('Teaching: feedback is required, including free or waived lessons.','正常教学：仍需反馈，包括免费或免扣课时的课程。'):label('Reviewed non-teaching activity: lesson feedback is not required.','已核对为非教学活动：无需课后教学反馈。')}</p>
 {reviewedBy&&reviewedAt?<p>{label("Reviewed by","核对人")}: {reviewedBy} · {new Date(reviewedAt).toLocaleString(lang==="ZH"?"zh-CN":"en-SG",{timeZone:"Asia/Singapore"})}</p>:null}
 {reason?<p>{label('Previous review basis','上次核对依据')}: {reason}</p>:null}
 <p>{label('This review changes feedback tasks only. Attendance, lesson deductions and teacher pay require their own checks. Do not use this to hide an incorrect teacher assignment or missing teaching feedback.','此核对仅调整反馈任务；点名、扣课和老师费用须分别核对。不能用此功能掩盖老师安排错误或实际教学缺失反馈。')}</p>
 {canManage?<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{const r=await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/feedback-policy`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fingerprint,requestKey:crypto.randomUUID(),activity:value,reason:basis,acknowledged:ack})});const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.message);window.location.reload();}catch(e){const text=e instanceof Error?e.message:label('Save failed','保存失败');const parts=text.split(' / ');setError(parts.length===2?label(parts[0],parts[1]):text);setBusy(false);}}}>
 <fieldset disabled={busy} style={{border:0,padding:0,display:'grid',gap:10}}>
 <label>{label('Actual activity','实际活动类型')} <select value={value} onChange={e=>setValue(e.target.value as FeedbackActivity)}><option value="TEACHING">{label('Teaching — feedback required','正常教学，需反馈')}</option><option value="EXAM_ONLY">{label('Exam only — no teaching','仅考试安排，未教学')}</option><option value="NON_TEACHING">{label('Other non-teaching activity','其他非教学活动')}</option></select></label>
 <label>{label('Review basis (at least10 characters)','核对依据（至少10字）')}<textarea required minLength={10} maxLength={2000} value={basis} onChange={e=>setBasis(e.target.value)} style={{display:'block',width:'100%',minHeight:70}}/></label>
 <label><input type="checkbox" required checked={ack} onChange={e=>setAck(e.target.checked)}/>{label('I checked this exact session and all involved students. A waiver applies only when no teaching took place.','我已核对此课次及全部涉及学生；只有未开展教学时才可豁免反馈。')}</label>
 <button type="submit">{busy?label('Saving…','正在保存…'):label('Save reviewed requirement','保存已核对的反馈要求')}</button></fieldset>
 {error?<p role="alert" style={{color:'#b91c1c'}}>{error}</p>:null}</form>:<p>{label('Read only. Ask teaching management to review any change.','当前只读；需要变更时请教学管理核对。')}</p>}
 </details>;
}

import {getSessionTraceability} from '@/lib/session-traceability';
import {explicitSessionReferences,traceSnapshotLabel} from '@/lib/session-traceability-evidence';
import {formatBusinessDateTime} from '@/lib/date-only';
import {t,type Lang} from '@/lib/i18n';

export default async function SessionTraceabilityPanel({sessionId,lang}:{sessionId:string;lang:Lang}){
 const data=await getSessionTraceability(sessionId),byId=new Map(data.sessions.map(s=>[s.id,s]));
 const labels:Record<string,[string,string]>={
  APPLIED:['Applied','已处理'],READY:['Ready','待执行'],NEED_INFO:['Needs information','待补资料'],CANCELLED:['Cancelled','已取消'],
  SESSION_CREATED:['Session created','新建课次'],SESSION_DELETED:['Session removed','移除课次'],SESSION_RESCHEDULED:['Time changed','调整时间'],SESSION_CANCELLED:['Session cancelled','取消课次'],SESSION_TEACHER_REPLACED:['Teacher changed','更换老师'],SESSION_STUDENT_CHANGED:['Student changed','更换学生'],SESSION_LOCATION_CHANGED:['Location changed','调整地点'],
  delete_safe:['Historical removal','历史删除'],REVIEW_FEEDBACK_POLICY:['Feedback requirement reviewed','核对反馈要求'],ADMIN_LINK_EXISTING_SCHEDULING_RESULT:['Existing result linked','关联已有处理结果'],
 };
 const label=(code:string)=>labels[code]?t(lang,...labels[code]):`${t(lang,'Historical operation','历史操作')} (${code})`;
 const lesson=(id:string)=>{const s=byId.get(id);return <span style={{overflowWrap:'anywhere'}}>{s?<a href={`/admin/sessions/${encodeURIComponent(id)}/attendance`}>{formatBusinessDateTime(s.startAt)} · {s.class.course.name} · {s.teacher?.name??s.class.teacher.name} · {s.student?.name??''}</a>:<span>{t(lang,'Original record unavailable; review required','原记录不可用，需核对')} · <a href={`/admin/sessions/${encodeURIComponent(id)}/attendance`}>{t(lang,'View recorded history','查看已保存历史')}</a></span>} <small>({id})</small></span>;};
 const snap=(value:unknown)=>{const v=traceSnapshotLabel(value);if(!v)return t(lang,'Not recorded','未记录');return [v.startAt?formatBusinessDateTime(new Date(v.startAt)):null,v.endAt?formatBusinessDateTime(new Date(v.endAt)):null,v.teacherName,v.studentName,v.campusName,v.roomName].filter(Boolean).join(' · ')||t(lang,'Not recorded','未记录');};
 return <details style={{padding:14,border:'1px solid #dbe4f0',borderRadius:10,background:'#fff'}}>
  <summary style={{fontWeight:750,cursor:'pointer'}}>{t(lang,'Original lessons, results & history','原课、结果课与历史')}</summary>
  <p style={{color:'#64748b',fontSize:13}}>{t(lang,'Only explicit lesson IDs and recorded changes are shown. A link is not proof of attendance, payment or deduction. Missing historical relationships require review.','这里只显示明确的课次编号关联及已记录的变更。有关联不代表已出勤、已收款或已扣课；缺少证据的历史关系仍需核对。')}</p>
  {!data.actions.length?<p>{t(lang,'No current work-order link. Any recorded historical references appear below. Do not infer a replacement from names or dates.','目前没有工单关联；如有历史关联证据，会在下方列出。不能因姓名或日期相同就认定为重建课程。')}</p>:<div style={{display:'grid',gap:10}}>{data.actions.map(a=><div key={a.id} style={{borderTop:'1px solid #e2e8f0',paddingTop:8}}>
   <a href={`/admin/tickets/${encodeURIComponent(a.ticket.id)}#scheduling-actions`}>{t(lang,'Work order','工单')} {a.ticket.ticketNo}</a>
   <div>{t(lang,'Original lesson','原课')}: {a.sourceSessionId?lesson(a.sourceSessionId):t(lang,'Not recorded / not applicable','未记录或不适用')}</div>
   <div>{t(lang,'Result lessons','结果课')}: {[...new Set([a.resultSessionId,...a.resultSessionIds].filter((v):v is string=>!!v))].map(id=><div key={id}>{lesson(id)}</div>)}</div>
   <small>{t(lang,'Recorded action status','已记录动作状态')}: {label(a.status)} {a.appliedAt?formatBusinessDateTime(a.appliedAt):''}</small>
  </div>)}</div>}
  <h4>{t(lang,'Recorded changes','已记录变更')}</h4>
  {!data.audits.length?<p>{t(lang,'No historical evidence was recorded. This does not confirm that no changes occurred.','没有已保存的历史证据；不能据此认定从未发生变更。')}</p>:data.audits.map(a=>{const meta=a.meta&&typeof a.meta==='object'&&!Array.isArray(a.meta)?a.meta as Record<string,unknown>:{};const refs=explicitSessionReferences(meta);return <div key={a.id} style={{borderTop:'1px solid #e2e8f0',padding:'8px 0',fontSize:13}}>
   <div>{formatBusinessDateTime(a.createdAt)} · {a.actorName||a.actorEmail}</div>
   <div>{t(lang,'Record type','记录类型')}: {label(a.action)} · {t(lang,'Record ID','记录编号')}: {a.id}</div>
   {refs.sourceSessionId?<div>{t(lang,'Recorded original lesson','历史原课')}: {lesson(refs.sourceSessionId)}</div>:null}
   {refs.resultSessionIds.map(id=><div key={id}>{t(lang,'Recorded result lesson','历史结果课')}: {lesson(id)}</div>)}
   {('before' in meta||'after' in meta)?<><div>{t(lang,'Before','修改前')}: {snap(meta.before)}</div><div>{t(lang,'After','修改后')}: {snap(meta.after)}</div></>:null}
   {typeof meta.reason==='string'?<div>{t(lang,'Reason','原因')}: {meta.reason}</div>:null}
  </div>;})}
  {data.truncated?<p>{t(lang,'Recent records shown; use the linked work order and audit records for earlier evidence.','此处显示最近记录；更早证据请查看关联工单和审计记录。')}</p>:null}
 </details>;
}

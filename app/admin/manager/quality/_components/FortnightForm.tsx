"use client";
import { useState, type FormEvent } from "react";
import { checks, stages, checkLabels, actionLabels, type Content, type Review } from "@/lib/fortnightly-reflection";
import { saveFortnight } from "../reflection-actions";

type Props = { due: string; start: string; anchor: string; today: string; completed: string; revision: number; canConfigure: boolean; content?: Content; previous: Review[] };
const options = (labels: Record<string,string>) => Object.entries(labels).map(([key,label]) => <option key={key} value={key}>{label}</option>);

export default function FortnightForm({due,start,anchor,today,completed,revision,canConfigure,content,previous}: Props) {
  const [count,setCount] = useState(content?.action_plan.length || 1);
  const [selected,setSelected] = useState<Record<string,string>>(Object.fromEntries(checks.map(([key]) => [key,content?.checks[key]?.status || ""])));
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget);
    form.set("intent",button?.value || "draft");
    setBusy(true);
    try {
      const result = await saveFortnight(form);
      if (result.error) {
        setMessage(result.error);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("reflectionSaved", button?.value === "configure" ? "schedule" : button?.value === "submit" ? "submitted" : "draft");
        url.hash = "fortnightly";
        window.history.replaceState(null, "", url);
        window.location.reload();
      }
    } catch { setMessage("Could not save. Keep this page open and retry / 保存失败，请保留本页并重试"); }
    finally { setBusy(false); }
  }
  return <div className="fortnight">
    <style>{`
      .fortnight form,.fortnight fieldset,.fortnight label,.fortnight .group {display:grid;gap:8px;min-width:0}
      .fortnight fieldset {border:0;margin:0;padding:0;gap:18px}
      .fortnight .group {border-top:1px solid #dbe4ed;padding:14px 0;gap:12px}
      .fortnight :is(input,select,textarea,button) {font:inherit;color:#172d42;border:1px solid #b7c7d7;border-radius:6px;padding:8px;background:white;max-width:100%;box-sizing:border-box}
      .fortnight textarea {width:100%;resize:vertical}
      .fortnight button {cursor:pointer;font-weight:650}
      .fortnight button[value=submit] {background:#145baa;color:white}
      .fortnight button:disabled {opacity:.55;cursor:default}
      .fortnight fieldset:disabled :is(input,textarea,select) {opacity:1;color:#34465a;background:#f6f8fa}
      .fortnight small {color:#465b70}.fortnight h3,.fortnight p {margin:0}
    `}</style>
    <p>A fortnightly check of operational follow-ups and a deeper reflection on one significant management or leadership experience. / 每两周检查运营跟进事项，并深入反思一件重要的管理或领导经历。</p>
    {canConfigure && <details><summary>Set first due date / 设置首次截止日</summary>
      <form onSubmit={save}><input type="hidden" name="anchor" value={anchor}/><label>First due date (SGT) / 首次截止日（新加坡时间）<input required name="firstDue" type="date" min={today} defaultValue={anchor}/></label><button disabled={busy} value="configure">Save schedule / 保存周期</button></form>
    </details>}
    <p><strong>Reflection period / 复盘周期</strong> {start} – {due}<br/>Due / 截止日 {due} · Asia/Singapore<br/>Date completed / 填写日期 {completed || "—"}</p>
    <form onSubmit={save}>
      <input type="hidden" name="anchor" value={anchor}/><input type="hidden" name="revision" value={revision}/><input type="hidden" name="due" value={due}/>
      <fieldset disabled={!!completed || busy}>
        <div className="group"><h3>1. Operational follow-up / 运营事项跟进</h3>
        {checks.map(([key,label]) => <div key={key}><label>{label}<select name={key} value={selected[key]} onChange={e=>setSelected({...selected,[key]:e.target.value})}><option value="">Select / 请选择</option>{options(checkLabels)}</select></label>
          <label><small>{selected[key]==="follow" ? "Follow-up details / 待跟进事项" : "Optional note / 备注（选填）"}</small><textarea name={key+"Note"} rows={1} maxLength={1000} defaultValue={content?.checks[key]?.note}/></label></div>)}</div>
        <p>Choose one significant management or leadership experience—or a recurring pattern—from this fortnight. Keep the reflection focused on that experience. / 从这两周中选择一件重要的管理或领导经历，或一个反复出现的情况，并围绕它进行反思。</p>
        {stages.map(([key,title,prompt]) => <label className="group" key={key}><strong>{title}</strong><small>{prompt}</small><textarea rows={3} name={key} maxLength={6000} defaultValue={content?.narrative[key]}/></label>)}
        <div className="group"><h3>7. Action plan / 行动计划</h3>
          <p>What one to three specific actions will you take? Include a deadline and how you will know whether each action helped. / 接下来你会采取哪一至三项具体行动？请注明期限，以及你会如何判断行动是否有效？</p>
          <input type="hidden" name="actionCount" value={count}/>
          {Array.from({length:count},(_,i) => { const item=content?.action_plan[i]; return <div key={i} className="group">
            <label>Action / 行动 {i+1}<textarea rows={2} name={"action"+i} defaultValue={item?.text} maxLength={2000}/></label>
            <label>Deadline / 期限<input type="date" name={"deadline"+i} defaultValue={item?.deadline}/></label>
            <label>Evidence of progress / 进展依据<textarea rows={2} name={"evidence"+i} defaultValue={item?.evidence} maxLength={2000}/></label>
            <label>Status / 状态<select name={"status"+i} defaultValue={item?.status || "open"}>{options(actionLabels)}</select></label></div>})}
          {!completed && <div>{count<3 && <button type="button" onClick={()=>setCount(count+1)}>Add action / 添加行动</button>} {count>1 && <button type="button" onClick={()=>setCount(count-1)}>Remove last action / 移除末项</button>}</div>}
        </div>
        <div className="group"><h3>Review of previous actions / 上期行动回顾</h3><p>Which previous actions were completed? What remains, and what got in the way? / 上期哪些行动已完成？哪些仍未完成？过程中遇到了什么阻碍？</p>
          {!previous.length && <small>No open actions from earlier periods / 此前没有待跟进行动</small>}
          {previous.map(a=><div className="group" key={a.id}><strong>{a.text}</strong><small>{a.id.split("/")[0]} · Deadline / 期限 {a.deadline} · Evidence / 进展依据 {a.evidence}</small>
            <label>Status / 状态<select name={"reviewStatus"+a.id} defaultValue={a.status}>{options(actionLabels)}</select></label>
            <label>Review note / 跟进备注<textarea rows={2} name={"reviewNote"+a.id} maxLength={1000} defaultValue={a.note}/></label></div>)}
        </div>
        {!completed && <div><button value="draft">Save draft / 保存草稿</button>{" "}<button value="submit" disabled={today<start}>Submit reflection / 提交复盘</button>{today<start && <p><small>Submission opens / 开放提交 {start}</small></p>}</div>}
      </fieldset>
      <div role="status" aria-live="polite">{message}</div>
    </form>
  </div>;
}

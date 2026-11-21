"use client";

import { CANCELLATION_REQUESTERS, cancellationRequesterLabel } from "@/lib/lesson-cancellation-policy";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreStudentDetailHashAfterRefresh } from "./studentDetailHash";
import TransferCancelledLesson, { type TransferLesson } from "./TransferCancelledLesson";

async function jsonOrNull(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function applySessionVisualState(sessionId: string, cancelled: boolean) {
  if (typeof document === "undefined") return;
  const nodes = document.querySelectorAll<HTMLElement>(`[data-session-ui="${sessionId}"]`);
  nodes.forEach((node) => {
    node.style.color = cancelled ? "#888" : "";
    node.style.opacity = cancelled ? "0.7" : "1";
    const strikeNodes = node.querySelectorAll<HTMLElement>('[data-session-strike="1"]');
    strikeNodes.forEach((item) => {
      item.style.textDecoration = cancelled ? "line-through" : "none";
      if (cancelled) item.style.color = "#888";
      else item.style.color = "";
    });

    const cancelOnlyNodes = node.querySelectorAll<HTMLElement>('[data-session-cancel-only="1"]');
    cancelOnlyNodes.forEach((item) => {
      item.style.display = cancelled ? "inline-block" : "none";
    });

    const cancelSuffixNodes = node.querySelectorAll<HTMLElement>('[data-session-cancel-suffix="1"]');
    cancelSuffixNodes.forEach((item) => {
      item.style.display = cancelled ? "inline" : "none";
    });

    const statusTextNodes = node.querySelectorAll<HTMLElement>('[data-session-status-text="1"]');
    statusTextNodes.forEach((item) => {
      const cancelledText = item.dataset.cancelledText ?? "Cancelled";
      const activeText = item.dataset.activeText ?? "Scheduled";
      item.textContent = cancelled ? cancelledText : activeText;
    });

    const statusPills = node.querySelectorAll<HTMLElement>('[data-session-status-pill="1"]');
    statusPills.forEach((item) => {
      item.style.background = cancelled ? "#fef2f2" : "#ecfdf3";
      item.style.color = cancelled ? "#b42318" : "#027a48";
    });
  });
}

export default function SessionCancelRestoreClient(props: {
  studentId: string;
  sessionId: string;
  initialCancelled: boolean;
  initialCharge?: boolean;
  initialRequestedBy?: string | null;
  initialNote?: string | null;
  durationMinutes: number;
  sessionLabel: string;
  lang: string;
  parentCancellationCount: number;
  variant: "compact" | "full";
  labels: {
    cancel: string;
    restore: string;
    restoreConfirm: string;
    delete: string;
    deleteConfirm: string;
    charge: string;
    note: string;
  };
  returnHash?: string;
  transferLesson?: TransferLesson;
  ticketExecutionContext?: {
    ticketId: string;
    actionId: string;
    returnHref: string;
  } | null;
}) {
  const router = useRouter();
  const { studentId, sessionId, initialCancelled, initialCharge, variant, labels, returnHash, ticketExecutionContext } = props;
  const [cancelled, setCancelled] = useState(initialCancelled);
  const [charge, setCharge] = useState(Boolean(initialCharge));
  const [note, setNote] = useState(props.initialNote || "");
  const [requestedBy, setRequestedBy] = useState(props.initialRequestedBy || "");
  const [editing, setEditing] = useState(false);
  const tr = (en: string, zh: string) => props.lang === "EN" ? en : props.lang === "ZH" ? zh : `${en} / ${zh}`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  const doCancel = async () => {
    if (loading) return;
    if (!requestedBy || !note.trim()) { setError(tr("Select requester and enter a reason", "请选择发起方并填写原因")); return; }
    setLoading(true);
    setError("");
    setDoneMsg("");
    try {
      const previewRes = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/sessions/cancel`, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId,charge,note,requestedBy,mode:"preview"})});
      const preview = await jsonOrNull(previewRes);
      if(!previewRes.ok || !preview?.ok) throw new Error(String(preview?.message || "Preview failed"));
      const impact = tr(`Deduct ${preview.deductedMinutes} minutes / ${preview.deductedCount} lessons`, `扣除 ${preview.deductedMinutes} 分钟／${preview.deductedCount} 次`);
      if(!window.confirm(`${props.sessionLabel}\n${cancellationRequesterLabel(requestedBy,props.lang)}\n${impact}\n${note}`)) return;
      const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/sessions/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          charge,
          note,
          requestedBy,
          expectedDeductedMinutes: preview.deductedMinutes,
          expectedDeductedCount: preview.deductedCount,
          ticketId: ticketExecutionContext?.ticketId,
          ticketActionId: ticketExecutionContext?.actionId,
        }),
      });
      const data = await jsonOrNull(res);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Cancel failed"));
      setCancelled(true);
      setEditing(false);
      applySessionVisualState(sessionId, true);
      setDoneMsg("OK");
      if (ticketExecutionContext?.returnHref) {
        router.push(ticketExecutionContext.returnHref);
        return;
      }
      restoreStudentDetailHashAfterRefresh(returnHash);
      router.refresh();
    } catch (e: any) {
      setError(String(e?.message ?? "Cancel failed"));
    } finally {
      setLoading(false);
    }
  };

  const doRestore = async () => {
    if (loading) return;
    if (!window.confirm(labels.restoreConfirm)) return;
    setLoading(true);
    setError("");
    setDoneMsg("");
    try {
      const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/sessions/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await jsonOrNull(res);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Restore failed"));
      setCancelled(false);
      setCharge(false);
      setRequestedBy("");
      setNote("");
      applySessionVisualState(sessionId, false);
      setDoneMsg("OK");
      restoreStudentDetailHashAfterRefresh(returnHash);
      router.refresh();
    } catch (e: any) {
      setError(String(e?.message ?? "Restore failed"));
    } finally {
      setLoading(false);
    }
  };

  const doDelete = async () => {
    if (loading) return;
    if (!window.confirm(labels.deleteConfirm)) return;
    setLoading(true);
    setError("");
    setDoneMsg("");
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      const data = await jsonOrNull(res);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Delete failed"));
      setDoneMsg("OK");
      restoreStudentDetailHashAfterRefresh(returnHash);
      router.refresh();
    } catch (e: any) {
      setError(String(e?.message ?? "Delete failed"));
    } finally {
      setLoading(false);
    }
  };

  const deletion = <details><summary style={{cursor:"pointer",fontSize:12}}>{tr("More", "更多")}</summary><p style={{fontSize:12,maxWidth:260}}>{tr("Delete only mistaken, unused future lessons. Recorded history stays available.", "仅删除误建、未使用的未来课次，历史仍可追溯。")}</p><button type="button" onClick={doDelete} disabled={loading}>{tr("Delete mistaken lesson", "删除误建课次")}</button></details>;
  return <span style={{display:"inline-flex",gap:8,flexWrap:"wrap",alignItems:"start"}}>
    {cancelled ? <>
      <span style={{fontSize:12}}>{cancellationRequesterLabel(requestedBy, props.lang)} · {charge ? tr("Hours deducted", "已扣课时") : tr("No deduction", "不扣课时")}{note ? ` · ${note}` : ""}</span>
      <button type="button" onClick={doRestore} disabled={loading}>{labels.restore}</button>
      {!charge && props.transferLesson ? <TransferCancelledLesson lesson={props.transferLesson} /> : null}
    </> : <>
      <button type="button" onClick={() => {setEditing(!editing);setError("");}} disabled={loading}>{tr("Cancel lesson", "取消课次")}</button>
      {editing ? <span style={{display:"grid",gap:8,padding:12,border:"1px solid #fed7aa",borderRadius:8,background:"#fffaf0",maxWidth:360}}>
        <strong>{props.sessionLabel}</strong>
        <label>{tr("Requested by", "取消发起方")}<select aria-label={tr("Requested by", "取消发起方")} value={requestedBy} onChange={e=>{setRequestedBy(e.target.value);setCharge(false);}} style={{width:"100%"}}>
          <option value="">{tr("Please select", "请选择")}</option>
          {CANCELLATION_REQUESTERS.map(v=><option key={v} value={v}>{cancellationRequesterLabel(v,props.lang)}</option>)}
        </select></label>
        <label><input type="checkbox" checked={charge} disabled={requestedBy!=="PARENT"} onChange={e=>setCharge(e.target.checked)}/>{tr("Deduct this lesson", "扣除本节课时")}</label>
        <small>{requestedBy && requestedBy!=="PARENT" ? tr("Teacher and school cancellations are always free of deduction.", "老师及校方取消固定免扣。") : tr("Select deduction only under the approved cancellation policy. Counts never trigger a charge.", "仅按已批准规则人工选择扣课，次数不会自动触发扣课。")}</small>
        <small>{tr(`Recorded parent cancellations: ${props.parentCancellationCount}. Historical unclassified reasons are excluded.`, `已分类家长取消：${props.parentCancellationCount}次；历史未分类记录不计入。`)}</small>
        {requestedBy==="PARENT" && props.parentCancellationCount>=3 ? <strong style={{color:"#9a3412",fontSize:12}}>{tr("Repeated cancellations: review the policy with the parent; no automatic deduction.", "家长取消已较多，请核对规则并沟通；不会自动扣课。")}</strong> : null}
        <label>{tr("Reason (required)", "取消原因（必填）")}<textarea value={note} maxLength={500} onChange={e=>setNote(e.target.value)} rows={2} style={{width:"100%"}}/></label>
        <strong>{charge ? tr("The confirmation shows the actual deduction for the selected package.", "确认页显示所选课包的实际扣课数量。") : tr("After confirmation: deduct 0 minutes", "确认后扣除0分钟")}</strong>
        <button type="button" onClick={doCancel} disabled={loading}>{loading ? "..." : tr("Confirm cancellation", "确认取消")}</button>
        <button type="button" onClick={()=>setEditing(false)} disabled={loading}>{tr("Keep lesson", "暂不取消")}</button>
      </span> : null}
      {deletion}
    </>}
    {doneMsg ? <span role="status" style={{color:"#166534"}}>{tr("Saved", "已保存")}</span> : null}
    {error ? <span role="alert" style={{color:"#b00"}}>{error}</span> : null}
  </span>;
}

"use client";

import {
  TICKET_MODE_OPTIONS,
  TICKET_OWNER_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_SOURCE_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_SYSTEM_UPDATED_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TICKET_VERSION_OPTIONS,
} from "@/lib/tickets";
import { useMemo, useState } from "react";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 700,
  fontSize: 13,
};

function OptionList({
  options,
  placeholder,
}: {
  options: { value: string; zh: string; en: string }[];
  placeholder: string;
}) {
  return (
    <>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.zh} / {opt.en}
        </option>
      ))}
    </>
  );
}

export default function IntakeForm({
  apiPath,
  uploadPath,
}: {
  apiPath: string;
  uploadPath: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [dupes, setDupes] = useState<Array<{ ticketNo: string; status: string; createdAt: string; summary: string }>>([]);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [proofText, setProofText] = useState("");
  const proofLines = useMemo(
    () => proofText.split("\n").map((x) => x.trim()).filter(Boolean),
    [proofText]
  );

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 12px 24px" }}>
      <h2 style={{ margin: "8px 0 4px" }}>工单录入 / Ticket Intake</h2>
      <div style={{ color: "#475569", marginBottom: 12 }}>
        客服快速录入（免登录）/ Quick no-login intake for customer service
      </div>
      {msg ? <div style={{ color: "#166534", marginBottom: 10 }}>{msg}</div> : null}
      {err ? <div style={{ color: "#b91c1c", marginBottom: 10 }}>{err}</div> : null}
      <details style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: "8px 10px", marginBottom: 10 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>快速流程 / Quick SOP</summary>
        <ol style={{ margin: "8px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
          <li>先录入工单，再在群里同步。/ Create ticket first, then notify in chat.</li>
          <li>每单都要有状态与下一步截止时间。/ Every ticket needs status and next deadline.</li>
          <li>负责人按角色写清楚（CS/Ops/Mgmt）。/ Set owner role clearly (CS/Ops/Mgmt).</li>
          <li>有证据就上传文件或图片，不放在口头。/ Upload proof files/images instead of verbal-only notes.</li>
          <li>完成定义：家长已通知 + 系统已更新。/ Done means parent informed + system updated.</li>
        </ol>
      </details>

      {dupes.length > 0 ? (
        <div style={{ marginBottom: 10, border: "1px solid #f59e0b", background: "#fffbeb", padding: 10, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>可能重复工单 / Potential Duplicates</div>
          {dupes.map((d) => (
            <div key={d.ticketNo} style={{ fontSize: 12, color: "#92400e" }}>
              {d.ticketNo} | {d.status} | {new Date(d.createdAt).toLocaleString()} | {d.summary || "-"}
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12 }}>
            勾选后可继续提交 / Check to continue anyway
          </div>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <input type="checkbox" checked={forceDuplicate} onChange={(e) => setForceDuplicate(e.target.checked)} />
            确认继续提交 / Force Submit
          </label>
        </div>
      ) : null}

      <form
        style={{ display: "grid", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting) return;
          const form = e.currentTarget;
          const fd = new FormData(form);
          setSubmitting(true);
          setMsg("");
          setErr("");
          const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
          payload.proof = proofText.trim();
          if (forceDuplicate) payload.forceDuplicate = "1";
          try {
            const res = await fetch(apiPath, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
              if (data?.code === "DUPLICATE" && Array.isArray(data?.duplicates)) {
                setDupes(data.duplicates);
                setErr("检测到重复工单，请确认后再提交 / Potential duplicates detected");
                return;
              }
              setErr(String(data?.message ?? "提交失败 / Submit failed"));
              return;
            }
            setMsg(`提交成功 / Submitted: ${data.ticketNo}`);
            setDupes([]);
            setForceDuplicate(false);
            setProofText("");
            form.reset();
          } catch (e2: any) {
            setErr(String(e2?.message ?? "提交失败 / Submit failed"));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <label style={labelStyle}>
            学生姓名* / Student*
            <input name="studentName" required style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            来源* / Source*
            <select name="source" required style={fieldStyle}>
              <OptionList options={TICKET_SOURCE_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            工单类型* / Type*
            <select name="type" required style={fieldStyle}>
              <OptionList options={TICKET_TYPE_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            优先级* / Priority*
            <select name="priority" required style={fieldStyle}>
              <OptionList options={TICKET_PRIORITY_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            状态 / Status
            <select name="status" defaultValue="Need Info" style={fieldStyle}>
              <OptionList options={TICKET_STATUS_OPTIONS} placeholder="默认待补信息 / Default Need Info" />
            </select>
          </label>
          <label style={labelStyle}>
            负责人 / Owner
            <select name="owner" style={fieldStyle} defaultValue="">
              <OptionList options={TICKET_OWNER_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            年级 / Grade
            <input name="grade" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            课程 / Course
            <input name="course" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            老师 / Teacher
            <input name="teacher" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            对接人 / POC
            <input name="poc" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            当前微信群名称 / Current WeChat Group Name
            <input name="wechat" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            时长(分钟) / Duration(min)
            <input name="durationMin" type="number" min={1} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            授课形式 / Mode
            <select name="mode" style={fieldStyle}>
              <OptionList options={TICKET_MODE_OPTIONS} placeholder="可选 / Optional" />
            </select>
          </label>
          <label style={labelStyle}>
            版本 / Version
            <select name="version" style={fieldStyle}>
              <OptionList options={TICKET_VERSION_OPTIONS} placeholder="可选 / Optional" />
            </select>
          </label>
          <label style={labelStyle}>
            系统已更新 / System Updated
            <select name="systemUpdated" style={fieldStyle}>
              <OptionList options={TICKET_SYSTEM_UPDATED_OPTIONS} placeholder="可选 / Optional" />
            </select>
          </label>
          <label style={labelStyle}>
            确认截止 / Confirm Deadline
            <DateTimeSplitInput name="confirmDeadline" wrapperStyle={{ width: "100%" }} dateStyle={fieldStyle} />
          </label>
          <label style={labelStyle}>
            SLA截止 / SLA Due
            <DateTimeSplitInput name="slaDue" wrapperStyle={{ width: "100%" }} dateStyle={fieldStyle} />
          </label>
          <label style={labelStyle}>
            下步截止 / Next Action Due
            <DateTimeSplitInput name="nextActionDue" wrapperStyle={{ width: "100%" }} dateStyle={fieldStyle} />
          </label>
          <label style={labelStyle}>
            录入人 / Intake Agent
            <input name="createdByName" style={fieldStyle} />
          </label>
        </div>

        <label style={labelStyle}>
          家长可约({">="}3) / Parent Availability ({">="}3)
          <textarea name="parentAvailability" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          老师可约({">="}2) / Teacher Availability ({">="}2)
          <textarea name="teacherAvailability" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          地址或链接 / Address or Meeting Link
          <textarea name="addressOrLink" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          最终排课 / Final Schedule
          <textarea name="finalSchedule" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          摘要 / Summary
          <textarea name="summary" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          风险备注 / Risks & Notes
          <textarea name="risksNotes" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          下一步动作 / Next Action
          <textarea name="nextAction" rows={2} style={fieldStyle} />
        </label>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            证据上传（支持多文件）/ Evidence Upload (multiple files)
          </div>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={async (e) => {
              const files = e.currentTarget.files;
              if (!files || files.length === 0) return;
              setErr("");
              setUploading(true);
              try {
                const uploadFd = new FormData();
                Array.from(files).forEach((f) => uploadFd.append("files", f));
                const res = await fetch(uploadPath, { method: "POST", body: uploadFd });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.ok || !Array.isArray(data?.urls)) {
                  setErr(String(data?.message ?? "上传失败 / Upload failed"));
                  return;
                }
                setProofText((prev) => {
                  const oldLines = prev.split("\n").map((x) => x.trim()).filter(Boolean);
                  const merged = [...oldLines, ...data.urls];
                  return merged.join("\n");
                });
              } catch (e2: any) {
                setErr(String(e2?.message ?? "上传失败 / Upload failed"));
              } finally {
                setUploading(false);
                e.currentTarget.value = "";
              }
            }}
          />
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
            单文件上限 10MB / Max 10MB per file
          </div>
        </div>

        <label style={labelStyle}>
          证据链接/文本 / Proof URLs or Notes
          <textarea
            name="proofTextOnlyView"
            rows={4}
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            style={fieldStyle}
          />
        </label>
        {proofLines.length > 0 ? (
          <div style={{ fontSize: 12, color: "#334155" }}>
            已上传 / Uploaded: {proofLines.length}
          </div>
        ) : null}

        <button type="submit" disabled={submitting || uploading || (dupes.length > 0 && !forceDuplicate)} style={{ width: "100%", minHeight: 44 }}>
          {submitting ? "提交中... / Submitting..." : "提交工单 / Submit Ticket"}
        </button>
      </form>
    </div>
  );
}

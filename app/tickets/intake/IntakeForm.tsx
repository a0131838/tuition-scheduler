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
import { useState } from "react";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
};

const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 700, fontSize: 13 };

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

export default function IntakeForm({ apiPath }: { apiPath: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [dupes, setDupes] = useState<Array<{ ticketNo: string; status: string; createdAt: string; summary: string }>>([]);
  const [forceDuplicate, setForceDuplicate] = useState(false);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 12px 24px" }}>
      <h2 style={{ margin: "8px 0 4px" }}>工单录入 / Ticket Intake</h2>
      <div style={{ color: "#475569", marginBottom: 12 }}>
        客服快速录入（免登录）/ Quick no-login intake for customer service
      </div>
      {msg ? <div style={{ color: "#166534", marginBottom: 10 }}>{msg}</div> : null}
      {err ? <div style={{ color: "#b91c1c", marginBottom: 10 }}>{err}</div> : null}
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
            <select name="owner" style={fieldStyle}>
              <OptionList options={TICKET_OWNER_OPTIONS} placeholder="可选 / Optional" />
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
            微信 / WeChat
            <input name="wechat" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            电话 / Phone
            <input name="phone" style={fieldStyle} />
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
            <input name="confirmDeadline" type="date" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            SLA截止 / SLA Due
            <input name="slaDue" type="date" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            下步截止 / Next Action Due
            <input name="nextActionDue" type="date" style={fieldStyle} />
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
        <label style={labelStyle}>
          证据链接/文本 / Proof
          <textarea name="proof" rows={2} style={fieldStyle} />
        </label>

        <button type="submit" disabled={submitting || (dupes.length > 0 && !forceDuplicate)} style={{ width: "100%", minHeight: 44 }}>
          {submitting ? "提交中... / Submitting..." : "提交工单 / Submit Ticket"}
        </button>
      </form>
    </div>
  );
}


"use client";

import { useState } from "react";

export default function ConsultForm({ assessmentSummary }: { assessmentSummary: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/public/school-guide/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      setStatus("error");
      setMessage(data.message || "提交失败，请稍后再试。");
      return;
    }
    setStatus("success");
    setMessage(data.duplicate ? "我们已把这次需求补充到原有咨询记录。" : `已收到，咨询编号：${data.leadNo}`);
    event.currentTarget.reset();
  }

  return (
    <form className="sg-assessment" onSubmit={submit}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
      <input type="hidden" name="assessmentSummary" value={assessmentSummary} />
      <div className="sg-form-grid">
        <label className="sg-field">家长称呼<input name="parentName" required maxLength={80} /></label>
        <label className="sg-field">孩子称呼或昵称<input name="studentName" required maxLength={80} /></label>
        <label className="sg-field">微信号<input name="parentWechat" required maxLength={80} /></label>
      </div>
      <label className="sg-field" style={{ marginTop: 14 }}>
        目前最想解决的问题
        <textarea name="needs" required maxLength={1800} placeholder="例如：孩子现在国内五年级，希望2027年进入新加坡政府中学，不确定年龄和AEIS准备时间。" />
      </label>
      <label className="sg-consent" style={{ marginTop: 14 }}>
        <input name="consent" type="checkbox" value="yes" required />
        <span>
          我同意GT Educational Institute Pte. Ltd.使用以上资料联系我并进行择校评估；资料只用于本次咨询和后续服务跟进。
          <a href="/school-guide/privacy" target="_blank" rel="noreferrer"> 查看隐私说明</a>
        </span>
      </label>
      <div className="sg-actions">
        <button className="sg-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "正在提交…" : "提交人工评估"}
        </button>
      </div>
      {message ? <div className="sg-notice" aria-live="polite">{message}</div> : null}
    </form>
  );
}

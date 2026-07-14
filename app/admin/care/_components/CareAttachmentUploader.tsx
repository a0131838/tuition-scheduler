"use client";

import { FormEvent, useState } from "react";
import styles from "../care.module.css";

type Option = { value: string; label: string };

export default function CareAttachmentUploader({
  engagementId,
  english,
  categories,
  activities,
  tasks,
}: {
  engagementId: string;
  english: boolean;
  categories: Option[];
  activities: Option[];
  tasks: Option[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    const form = event.currentTarget;
    try {
      const response = await fetch(`/api/admin/care/engagements/${encodeURIComponent(engagementId)}/attachments`, {
        method: "POST",
        body: new FormData(form),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Upload failed");
      form.reset();
      setMessage(english ? "Evidence uploaded." : "证据已上传。 ");
      window.location.assign(`/admin/care/${encodeURIComponent(engagementId)}?msg=${encodeURIComponent("Evidence uploaded")}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : english ? "Upload failed" : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.formGrid} onSubmit={submit} encType="multipart/form-data">
      <label className={styles.label}>
        {english ? "Category" : "资料类型"}
        <select className={styles.select} name="category" defaultValue="SCHOOL_EMAIL">
          {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className={styles.label}>
        {english ? "Document date" : "资料日期"}
        <input className={styles.field} name="occurredAt" type="date" />
      </label>
      <label className={`${styles.label} ${styles.full}`}>
        {english ? "Title" : "标题"}
        <input className={styles.field} name="title" maxLength={180} required />
      </label>
      <label className={styles.label}>
        {english ? "Source" : "来源"}
        <input className={styles.field} name="sourceLabel" maxLength={240} placeholder={english ? "School, teacher or organisation" : "学校、老师或机构"} />
      </label>
      <label className={styles.label}>
        {english ? "Visibility" : "使用范围"}
        <select className={styles.select} name="audience" defaultValue="INTERNAL_ONLY">
          <option value="INTERNAL_ONLY">{english ? "Internal only" : "仅内部"}</option>
          <option value="PARENT">{english ? "Eligible for reviewed parent report" : "可用于审核后的家长报告"}</option>
        </select>
      </label>
      <label className={styles.label}>
        {english ? "Link to update" : "关联跟进"}
        <select className={styles.select} name="activityId" defaultValue="">
          <option value="">-</option>
          {activities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className={styles.label}>
        {english ? "Link to task" : "关联待办"}
        <select className={styles.select} name="taskId" defaultValue="">
          <option value="">-</option>
          {tasks.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className={`${styles.label} ${styles.full}`}>
        {english ? "Note" : "说明"}
        <textarea className={styles.textarea} name="note" maxLength={2000} />
      </label>
      <label className={`${styles.label} ${styles.full}`}>
        {english ? "File (max 25MB)" : "文件（最大 25MB）"}
        <input
          className={styles.field}
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.eml,.msg,.jpg,.jpeg,.png,.webp,.gif"
          required
        />
      </label>
      {error ? <div className={`${styles.noticeError} ${styles.full}`}>{error}</div> : null}
      {message ? <div className={`${styles.noticeSuccess} ${styles.full}`}>{message}</div> : null}
      <button className={styles.button} type="submit" disabled={busy}>
        {busy ? (english ? "Uploading..." : "上传中...") : (english ? "Upload evidence" : "上传证据")}
      </button>
    </form>
  );
}

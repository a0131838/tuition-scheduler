"use client";

import { useMemo, useState } from "react";
import styles from "./renewals.module.css";

type HistoryRow = { action: string; actorName: string; createdAt: string; meta: unknown };
type RenewalTask = {
  id: string;
  packageId: string;
  packageType: string;
  studentId: string;
  studentName: string;
  cohort: "BOSS_OTHER" | "XDF";
  sourceLabel: string;
  communicationAudience: string;
  courseName: string;
  status: string;
  statusLabel: string;
  riskLevel: string;
  remainingMinutes: number;
  scheduledMinutes: number;
  recentWeeklyMinutes: number;
  lessonsRemaining: number | null;
  expectedDepletionAt: string | null;
  packageValidTo: string | null;
  ownerName: string | null;
  parentWechatGroupName: string | null;
  parentMessage: string | null;
  parentResponse: string | null;
  nextFollowUpAt: string | null;
  evidenceUrl: string | null;
  note: string | null;
  history: HistoryRow[];
};

const statuses = [
  ["PENDING_CONTACT", "待联系家长"],
  ["PARENT_NOTIFIED", "已提醒家长"],
  ["PARENT_CONSIDERING", "家长考虑中"],
  ["RENEWAL_CONFIRMED", "已确认续费"],
  ["CONTRACT_BILLING", "合同/账单处理中"],
  ["PAYMENT_PENDING", "待确认付款"],
  ["PAYMENT_CONFIRMED", "已付款·待开通课包"],
  ["PACKAGE_ACTIVE", "新课包已生效"],
  ["NOT_RENEWING", "暂不续费"],
  ["PAUSED_SPECIAL", "停课/特殊处理"],
];

const xdfStatuses = statuses.map(([value, label]) => [
  value,
  {
    PENDING_CONTACT: "待联系新东方",
    PARENT_NOTIFIED: "已通知新东方",
    PARENT_CONSIDERING: "新东方确认中",
    RENEWAL_CONFIRMED: "已确认续课",
  }[value] || label,
]);

const riskLabels: Record<string, string> = {
  YELLOW: "黄色·提前关注",
  ORANGE: "橙色·尽快联系",
  RED: "红色·优先处理",
  EXHAUSTED: "已不足·立即处理",
};

function fmtMinutes(value: number) {
  if (value <= 0) return "0 小时";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours ? `${hours}小时` : ""}${minutes ? `${minutes}分钟` : ""}`;
}

function fmtDate(value: string | null) {
  if (!value) return "未计算";
  return new Intl.DateTimeFormat("zh-SG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function RenewalWorkbenchClient({
  initialTasks,
  initialCohortCounts,
}: {
  initialTasks: RenewalTask[];
  initialCohortCounts: { BOSS_OTHER: number; XDF: number };
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [cohort, setCohort] = useState<"BOSS_OTHER" | "XDF">("BOSS_OTHER");
  const [cohortCounts, setCohortCounts] = useState(initialCohortCounts);
  const [filter, setFilter] = useState("OPEN");
  const [expanded, setExpanded] = useState(initialTasks[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<RenewalTask>>>({});

  const summary = useMemo(
    () => ({
      total: tasks.length,
      urgent: tasks.filter((row) => ["RED", "EXHAUSTED"].includes(row.riskLevel)).length,
      due: tasks.filter((row) => row.nextFollowUpAt && new Date(row.nextFollowUpAt) <= new Date()).length,
      confirmed: tasks.filter((row) => ["RENEWAL_CONFIRMED", "CONTRACT_BILLING", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"].includes(row.status)).length,
    }),
    [tasks]
  );

  async function load(status = filter, nextCohort = cohort) {
    setFilter(status);
    setCohort(nextCohort);
    const response = await fetch(`/api/admin/renewals?status=${encodeURIComponent(status)}&cohort=${nextCohort}&limit=300`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "加载失败");
    setTasks(data.tasks || []);
    setCohortCounts(data.cohortCounts || { BOSS_OTHER: 0, XDF: 0 });
    setExpanded(data.tasks?.[0]?.id || "");
  }

  async function scan() {
    setBusyId("scan");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/renewals?cohort=${cohort}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "扫描失败");
      setFilter("OPEN");
      setTasks(data.tasks || []);
      setCohortCounts(data.cohortCounts || cohortCounts);
      setMessage(`扫描完成：新增 ${data.sync.created}，更新 ${data.sync.updated}，自动解除 ${data.sync.resolved}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "扫描失败");
    } finally {
      setBusyId("");
    }
  }

  function draftFor(row: RenewalTask) {
    return { ...row, ...(drafts[row.id] || {}) };
  }

  function setDraft(id: string, key: keyof RenewalTask, value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), [key]: value } }));
  }

  async function save(row: RenewalTask, statusOverride?: string) {
    const draft = draftFor(row);
    const status = statusOverride || draft.status;
    if (status === "PARENT_NOTIFIED" && !draft.evidenceUrl && !row.evidenceUrl) {
      setMessage(`确认已通知${row.communicationAudience}前，请先上传微信群发送截图。`);
      return;
    }
    setBusyId(row.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/renewals/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          ownerName: draft.ownerName,
          parentWechatGroupName: draft.parentWechatGroupName,
          parentResponse: draft.parentResponse,
          nextFollowUpAt: draft.nextFollowUpAt,
          note: draft.note,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "保存失败");
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await load(filter);
      setMessage("续费任务已保存，操作日志已记录。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusyId("");
    }
  }

  async function upload(row: RenewalTask, file: File | null) {
    if (!file) return;
    setBusyId(row.id);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/admin/renewals/${row.id}/evidence`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "上传失败");
      setTasks((current) => current.map((item) => item.id === row.id ? { ...item, evidenceUrl: data.evidenceUrl } : item));
      setDrafts((current) => ({ ...current, [row.id]: { ...(current[row.id] || {}), evidenceUrl: data.evidenceUrl } }));
      setMessage("微信发送截图已上传。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setBusyId("");
    }
  }

  async function copy(text: string | null, audience: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setMessage(`${audience}沟通文案已复制，请核对后发送到对应微信群。`);
  }

  return (
    <>
      <section className={styles.metrics}>
        <div><span>开放任务</span><strong>{summary.total}</strong></div>
        <div data-tone="danger"><span>红色/已不足</span><strong>{summary.urgent}</strong></div>
        <div data-tone="warning"><span>已到跟进时间</span><strong>{summary.due}</strong></div>
        <div data-tone="success"><span>已进入续费流程</span><strong>{summary.confirmed}</strong></div>
      </section>

      <section className={styles.cohorts} aria-label="学生来源队列">
        <button data-active={cohort === "BOSS_OTHER"} onClick={() => load(filter, "BOSS_OTHER").catch((error) => setMessage(error.message))}>
          <span>博思及其他</span><strong>{cohortCounts.BOSS_OTHER}</strong>
        </button>
        <button data-active={cohort === "XDF"} onClick={() => load(filter, "XDF").catch((error) => setMessage(error.message))}>
          <span>新东方学生</span><strong>{cohortCounts.XDF}</strong>
        </button>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.filters}>
          {[["OPEN", "待跟进"], ["COMPLETED", "已结束"], ...statuses.slice(0, 7)].map(([value, label]) => (
            <button key={value} data-active={filter === value} onClick={() => load(value).catch((error) => setMessage(error.message))}>{label}</button>
          ))}
        </div>
        <button className={styles.scan} disabled={busyId === "scan"} onClick={scan}>
          {busyId === "scan" ? "扫描中…" : "重新扫描课时风险"}
        </button>
      </section>
      {message ? <div className={styles.message}>{message}</div> : null}

      <section className={styles.list}>
        {tasks.length === 0 ? <div className={styles.empty}>当前筛选下没有续费任务。</div> : null}
        {tasks.map((row) => {
          const draft = draftFor(row);
          const open = expanded === row.id;
          return (
            <article key={row.id} className={styles.task} data-risk={row.riskLevel}>
              <button className={styles.taskHeader} onClick={() => setExpanded(open ? "" : row.id)}>
                <div>
                  <span className={styles.risk}>{riskLabels[row.riskLevel] || row.riskLevel}</span>
                  <span className={styles.source}>{row.cohort === "XDF" ? "新东方" : row.sourceLabel}</span>
                  <h2>{row.studentName} · {row.courseName}</h2>
                  <p>{row.statusLabel} · 负责人：{row.ownerName || "未分配"} · 下次跟进：{fmtDate(row.nextFollowUpAt)}</p>
                </div>
                <div className={styles.balance}>
                  <strong>{row.packageType === "MONTHLY" ? "有效期预警" : fmtMinutes(row.remainingMinutes)}</strong>
                  <span>约 {row.lessonsRemaining ?? "-"} 节</span>
                </div>
              </button>
              {open ? (
                <div className={styles.detail}>
                  <div className={styles.forecast}>
                    <div><span>未来已排</span><strong>{fmtMinutes(row.scheduledMinutes)}</strong></div>
                    <div><span>近四周周均消耗</span><strong>{fmtMinutes(row.recentWeeklyMinutes)}</strong></div>
                    <div><span>预计用完</span><strong>{fmtDate(row.expectedDepletionAt)}</strong></div>
                    <div><span>课包有效期</span><strong>{fmtDate(row.packageValidTo)}</strong></div>
                  </div>

                  <div className={styles.columns}>
                    <div className={styles.workflow}>
                      <label>当前状态
                        <select value={String(draft.status || "")} onChange={(event) => setDraft(row.id, "status", event.target.value)}>
                          {(row.cohort === "XDF" ? xdfStatuses : statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label>负责人
                        <input value={String(draft.ownerName || "")} onChange={(event) => setDraft(row.id, "ownerName", event.target.value)} placeholder="Emily / Eva / Jasmine" />
                      </label>
                      <label>下次跟进时间
                        <input type="datetime-local" value={draft.nextFollowUpAt ? String(draft.nextFollowUpAt).slice(0, 16) : ""} onChange={(event) => setDraft(row.id, "nextFollowUpAt", event.target.value)} />
                      </label>
                      <label>{row.cohort === "XDF" ? "新东方对接群" : "家长微信群"}
                        <input value={String(draft.parentWechatGroupName || "")} onChange={(event) => setDraft(row.id, "parentWechatGroupName", event.target.value)} placeholder={row.cohort === "XDF" ? "填写新东方项目对接群" : "填写实际家长群名"} />
                      </label>
                      <label>{row.cohort === "XDF" ? "新东方回复" : "家长回复"}
                        <textarea value={String(draft.parentResponse || "")} onChange={(event) => setDraft(row.id, "parentResponse", event.target.value)} placeholder={row.cohort === "XDF" ? "记录项目负责人回复和下一步" : "记录家长原意、顾虑和下一步"} />
                      </label>
                      <label>内部备注
                        <textarea value={String(draft.note || "")} onChange={(event) => setDraft(row.id, "note", event.target.value)} placeholder="折扣、停课、共享课包等特殊情况" />
                      </label>
                      <button className={styles.primary} disabled={busyId === row.id} onClick={() => save(row)}>
                        {busyId === row.id ? "保存中…" : "保存进度"}
                      </button>
                    </div>

                    <div className={styles.communication}>
                      <h3>发到{row.cohort === "XDF" ? "新东方对接群" : "家长群"}的微信文案</h3>
                      <pre>{row.parentMessage || "暂无文案"}</pre>
                      <button onClick={() => copy(row.parentMessage, row.communicationAudience)}>复制文案</button>
                      <label className={styles.upload}>微信群发送截图
                        <input type="file" accept="image/*" onChange={(event) => upload(row, event.target.files?.[0] || null)} />
                      </label>
                      {row.evidenceUrl ? <a href={row.evidenceUrl} target="_blank">查看已上传截图</a> : <span className={styles.required}>确认已发送前必须上传截图</span>}
                      <div className={styles.quickActions}>
                        <button disabled={!row.evidenceUrl} onClick={() => save(row, "PARENT_NOTIFIED")}>确认已通知{row.communicationAudience}</button>
                        <a href={`/admin/packages/${row.packageId}/contract`}>创建/查看续费合同</a>
                        <a href={`/admin/packages/${row.packageId}/billing`}>进入账单与收款</a>
                        <a href={`/admin/students/${row.studentId}`}>查看学生详情</a>
                      </div>
                    </div>
                  </div>

                  <details className={styles.history}>
                    <summary>操作记录（{row.history.length}）</summary>
                    {row.history.map((entry, index) => (
                      <div key={`${entry.createdAt}-${index}`}>
                        <strong>{entry.actorName}</strong> · {entry.action} · {fmtDate(entry.createdAt)}
                      </div>
                    ))}
                    {!row.history.length ? <div>暂无操作记录</div> : null}
                  </details>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </>
  );
}

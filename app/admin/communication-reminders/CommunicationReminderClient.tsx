"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./communication-reminders.module.css";

type Reminder = {
  key: string; category: string; categoryLabel: string; title: string; subject: string;
  recipientType: string; recipientName: string; recipientPhone?: string; studentName?: string;
  dueText: string; urgency: "OVERDUE" | "TODAY" | "UPCOMING"; status: string; statusLabel: string;
  sourceHref: string; sourceLabel: string; copyZh: string; copyEn: string; copyBilingual: string;
};

type Summary = { total: number; overdue: number; today: number; waitingReply: number; escalated: number };
const FILTERS = [
  ["ACTION", "现在处理"], ["OVERDUE", "已逾期"], ["TODAY", "今天"], ["WAITING_REPLY", "等待回复"], ["ALL", "全部"],
] as const;

export default function CommunicationReminderClient() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, overdue: 0, today: 0, waitingReply: 0, escalated: 0 });
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("ACTION");
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communication-reminders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "加载失败");
      setItems(data.items || []);
      setSummary(data.summary || {});
      setSelected((current) => current && (data.items || []).some((item: Reminder) => item.key === current) ? current : (data.items?.[0]?.key || ""));
    } catch (error: any) {
      setMessage(error.message || "加载失败");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "ACTION") return !["WAITING_REPLY", "SNOOZED"].includes(item.status);
    if (filter === "WAITING_REPLY") return item.status === "WAITING_REPLY";
    return item.urgency === filter;
  }), [items, filter]);
  const current = items.find((item) => item.key === selected) || visible[0];

  async function act(item: Reminder, status: string, language = "") {
    const res = await fetch("/api/admin/communication-reminders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: item.key, status, language }) });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || "操作失败");
    await load();
  }

  async function copy(item: Reminder, language: "ZH" | "EN" | "BILINGUAL") {
    const text = language === "ZH" ? item.copyZh : language === "EN" ? item.copyEn : item.copyBilingual;
    await navigator.clipboard.writeText(text);
    await act(item, "COPIED", language);
    setMessage(language === "ZH" ? "已复制中文" : language === "EN" ? "English copied" : "已复制中英双语");
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>客服与教务 · 同一份待办</p><h1>AI 沟通提醒中心</h1><p>系统读取课表、考勤、反馈、报告和工单；Emily 只处理现在该发的一条。</p></div>
      <button className={styles.refresh} onClick={() => void load()} disabled={loading}>{loading ? "正在核对…" : "刷新数据"}</button>
    </header>
    <section className={styles.metrics}>
      <div><span>需处理</span><strong>{summary.total}</strong></div><div className={styles.danger}><span>已逾期</span><strong>{summary.overdue}</strong></div><div><span>今天</span><strong>{summary.today}</strong></div><div><span>等待回复</span><strong>{summary.waitingReply}</strong></div>
    </section>
    <nav className={styles.filters}>{FILTERS.map(([value, label]) => <button key={value} className={filter === value ? styles.activeFilter : ""} onClick={() => setFilter(value)}>{label}</button>)}</nav>
    {message ? <div className={styles.message}>{message}<button onClick={() => setMessage("")}>关闭</button></div> : null}
    <div className={styles.workspace}>
      <aside className={styles.queue}>
        <div className={styles.queueTitle}><strong>{visible.length} 项工作</strong><span>按截止时间排列</span></div>
        {visible.map((item) => <button key={item.key} className={`${styles.queueItem} ${current?.key === item.key ? styles.selected : ""}`} onClick={() => setSelected(item.key)}>
          <span className={`${styles.dot} ${styles[item.urgency.toLowerCase()]}`} /><span><strong>{item.title}</strong><small>{item.categoryLabel} · {item.recipientName}</small><small>{item.dueText} · {item.statusLabel}</small></span>
        </button>)}
        {!loading && visible.length === 0 ? <p className={styles.empty}>这个分类暂无待办</p> : null}
      </aside>
      <section className={styles.detail}>
        {current ? <>
          <div className={styles.detailTop}><div><span className={styles.category}>{current.categoryLabel}</span><h2>{current.title}</h2><p>{current.subject}</p></div><span className={`${styles.urgency} ${styles[current.urgency.toLowerCase()]}`}>{current.urgency === "OVERDUE" ? "已逾期" : current.urgency === "TODAY" ? "今天完成" : "即将到期"}</span></div>
          <div className={styles.facts}><div><span>发给</span><strong>{current.recipientName}</strong></div><div><span>完成前</span><strong>{current.dueText}</strong></div><div><span>来源</span><a href={current.sourceHref}>{current.sourceLabel}</a></div></div>
          <div className={styles.copyBlock}><div className={styles.copyHeading}><div><span>AI 已按正式数据准备</span><h3>中英对照沟通稿</h3></div><button onClick={() => void copy(current, "BILINGUAL")}>复制中英双语</button></div><pre>{current.copyBilingual}</pre><div className={styles.copyActions}><button onClick={() => void copy(current, "ZH")}>只复制中文</button><button onClick={() => void copy(current, "EN")}>Copy English</button></div></div>
          <div className={styles.nextAction}><div><span>复制不等于已发送</span><strong>发出后选择真实状态</strong></div><div><button onClick={() => void act(current, "SENT")}>标记已发送</button><button onClick={() => void act(current, "WAITING_REPLY")}>等待回复</button><button onClick={() => void act(current, "REPLIED")}>已收到回复</button><button onClick={() => void act(current, "SNOOZED")}>两小时后提醒</button><button className={styles.complete} onClick={() => void act(current, "COMPLETED")}>完成</button><button className={styles.escalate} onClick={() => void act(current, "ESCALATED")}>升级给教务/管理</button></div></div>
        </> : <div className={styles.empty}>选择一项工作查看文案</div>}
      </section>
    </div>
  </main>;
}

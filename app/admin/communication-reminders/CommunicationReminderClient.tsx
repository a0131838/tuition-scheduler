"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./communication-reminders.module.css";

type Reminder = {
  key: string; category: string; categoryLabel: string; title: string; subject: string;
  recipientType: string; recipientName: string; recipientPhone?: string; studentName?: string;
  dueText: string; urgency: "OVERDUE" | "TODAY" | "UPCOMING"; status: string; statusLabel: string;
  sourceHref: string; sourceLabel: string; copyZh: string; copyEn: string; copyBilingual: string;
  priority: "P0" | "P1" | "P2" | "P3"; priorityLabel: string; priorityReason: string;
  group: "COURSE" | "TEACHING" | "REPORT" | "TICKET"; groupLabel: string;
  reportDeliveryReady?: boolean; reportKind?: "MIDTERM" | "FINAL"; reportId?: string;
  reportAdminPdfPath?: string; approvedByName?: string; approvedAt?: string;
};

type Summary = {
  total: number; overdue: number; today: number; waitingReply: number; escalated: number;
  priority?: Record<"P0" | "P1" | "P2" | "P3", number>;
  groups?: Record<"COURSE" | "TEACHING" | "REPORT" | "TICKET", number>;
};
const FILTERS = [
  ["ACTION", "待处理"], ["P0", "P0 立即处理"], ["P1", "P1 今天"], ["P2", "P2 等待回复"], ["P3", "P3 后续"], ["ALL", "全部"],
] as const;
const GROUPS = [
  ["ALL", "全部类别"], ["COURSE", "课程提醒"], ["TEACHING", "教学跟进"], ["REPORT", "学习报告"], ["TICKET", "工单确认"],
] as const;
const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"] as const;

export default function CommunicationReminderClient() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, overdue: 0, today: 0, waitingReply: 0, escalated: 0 });
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("ACTION");
  const [group, setGroup] = useState<(typeof GROUPS)[number][0]>("ALL");
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
    const priorityMatches = filter === "ALL"
      || (filter === "ACTION" ? !["P2"].includes(item.priority) && item.status !== "SNOOZED" : item.priority === filter);
    return priorityMatches && (group === "ALL" || item.group === group);
  }), [items, filter, group]);
  const grouped = useMemo(() => PRIORITY_ORDER.map((priority) => ({
    priority,
    label: items.find((item) => item.priority === priority)?.priorityLabel || ({ P0: "立即处理", P1: "今天处理", P2: "等待回复", P3: "后续跟进" } as const)[priority],
    items: visible.filter((item) => item.priority === priority),
  })).filter((section) => section.items.length), [items, visible]);
  const current = visible.find((item) => item.key === selected) || visible[0];

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

  async function deliverReport(item: Reminder) {
    if (!window.confirm(`请确认已将${item.studentName || "该学生"}的报告真实发给家长。确认后会写入正式交付记录。`)) return;
    await act(item, "SENT");
    setMessage("已记录正式交付");
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>客服与教务 · 同一份待办</p><h1>AI 沟通提醒中心</h1><p>系统读取课表、考勤、反馈、报告和工单；Emily 只处理现在该发的一条。</p></div>
      <button className={styles.refresh} onClick={() => void load()} disabled={loading}>{loading ? "正在核对…" : "刷新数据"}</button>
    </header>
    <section className={styles.metrics}>
      <div className={styles.p0}><span>P0 · 立即处理</span><strong>{summary.priority?.P0 ?? summary.overdue}</strong><small>逾期、已回复或已升级</small></div>
      <div className={styles.p1}><span>P1 · 今天处理</span><strong>{summary.priority?.P1 ?? summary.today}</strong><small>今天必须完成</small></div>
      <div className={styles.p2}><span>P2 · 等待回复</span><strong>{summary.priority?.P2 ?? summary.waitingReply}</strong><small>已经联系，等待对方</small></div>
      <div className={styles.p3}><span>P3 · 后续跟进</span><strong>{summary.priority?.P3 ?? 0}</strong><small>尚未到截止时间</small></div>
    </section>
    <div className={styles.filterArea}>
      <nav className={styles.filters} aria-label="按紧急程度筛选">{FILTERS.map(([value, label]) => <button key={value} className={filter === value ? styles.activeFilter : ""} onClick={() => setFilter(value)}>{label}</button>)}</nav>
      <nav className={`${styles.filters} ${styles.groupFilters}`} aria-label="按工作类别筛选">{GROUPS.map(([value, label]) => <button key={value} className={group === value ? styles.activeGroup : ""} onClick={() => setGroup(value)}>{label}<span>{value === "ALL" ? summary.total : summary.groups?.[value] ?? 0}</span></button>)}</nav>
    </div>
    {message ? <div className={styles.message}>{message}<button onClick={() => setMessage("")}>关闭</button></div> : null}
    <div className={styles.workspace}>
      <aside className={styles.queue}>
        <div className={styles.queueTitle}><strong>{visible.length} 项工作</strong><span>先看轻重，再看类别</span></div>
        {grouped.map((section) => <div className={styles.prioritySection} key={section.priority}>
          <div className={`${styles.priorityHeading} ${styles[section.priority.toLowerCase()]}`}><strong>{section.priority} · {section.label}</strong><span>{section.items.length}</span></div>
          {section.items.map((item) => <button key={item.key} className={`${styles.queueItem} ${current?.key === item.key ? styles.selected : ""}`} onClick={() => setSelected(item.key)}>
            <span className={`${styles.priorityBar} ${styles[item.priority.toLowerCase()]}`} />
            <span><span className={styles.itemMeta}><em>{item.groupLabel}</em><small>{item.categoryLabel}</small></span><strong>{item.title}</strong><small>{item.recipientName} · {item.dueText}</small><small>{item.statusLabel} · {item.priorityReason}</small></span>
          </button>)}
        </div>)}
        {!loading && visible.length === 0 ? <p className={styles.empty}>这个分类暂无待办</p> : null}
      </aside>
      <section className={styles.detail}>
        {current ? <>
          <div className={styles.detailTop}><div><span className={styles.category}>{current.groupLabel} · {current.categoryLabel}</span><h2>{current.title}</h2><p>{current.subject}</p></div><span className={`${styles.urgency} ${styles[current.priority.toLowerCase()]}`}>{current.priority} · {current.priorityLabel}</span></div>
          <div className={`${styles.priorityNotice} ${styles[current.priority.toLowerCase()]}`}><strong>{current.priorityReason}</strong><span>系统依据截止时间和当前处理状态自动判断；员工仍可升级或稍后提醒。</span></div>
          {current.reportDeliveryReady ? <div className={styles.reportApproval}><strong>已审核确认，可由 Emily 发送</strong><span>{current.approvedByName || "-"} · 发送前可查看 PDF，不能修改报告。</span></div> : null}
          <div className={styles.facts}><div><span>发给</span><strong>{current.recipientName}</strong></div><div><span>完成前</span><strong>{current.dueText}</strong></div><div><span>来源</span><a href={current.sourceHref}>{current.sourceLabel}</a></div></div>
          <div className={styles.copyBlock}><div className={styles.copyHeading}><div><span>AI 已按正式数据准备</span><h3>中英对照沟通稿</h3></div><button onClick={() => void copy(current, "BILINGUAL")}>复制中英双语</button></div><pre>{current.copyBilingual}</pre><div className={styles.copyActions}>{current.reportDeliveryReady && current.reportAdminPdfPath ? <a className={styles.pdfLink} href={current.reportAdminPdfPath} target="_blank">查看 / 下载 PDF</a> : null}<button onClick={() => void copy(current, "ZH")}>只复制中文</button><button onClick={() => void copy(current, "EN")}>Copy English</button></div></div>
          {current.reportDeliveryReady ? <div className={styles.nextAction}><div><span>只有真实发出后才确认</span><strong>确认后同步正式报告交付状态</strong></div><div><button className={styles.complete} onClick={() => void deliverReport(current)}>已发送给家长</button><button onClick={() => void act(current, "SNOOZED")}>两小时后提醒</button><button className={styles.escalate} onClick={() => void act(current, "ESCALATED")}>升级给教务/管理</button></div></div> : <div className={styles.nextAction}><div><span>复制不等于已发送</span><strong>发出后选择真实状态</strong></div><div><button onClick={() => void act(current, "SENT")}>标记已发送</button><button onClick={() => void act(current, "WAITING_REPLY")}>等待回复</button><button onClick={() => void act(current, "REPLIED")}>已收到回复</button><button onClick={() => void act(current, "SNOOZED")}>两小时后提醒</button><button className={styles.complete} onClick={() => void act(current, "COMPLETED")}>完成</button><button className={styles.escalate} onClick={() => void act(current, "ESCALATED")}>升级给教务/管理</button></div></div>}
        </> : <div className={styles.empty}>选择一项工作查看文案</div>}
      </section>
    </div>
  </main>;
}

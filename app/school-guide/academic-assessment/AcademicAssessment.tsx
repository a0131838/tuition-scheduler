"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ConsultForm from "../consult/ConsultForm";
import styles from "./AcademicAssessment.module.css";

type Product = "INTERNATIONAL_ENGLISH" | "AEIS_PRIMARY_ENGLISH" | "AEIS_SECONDARY_ENGLISH" | "AEIS_PRIMARY_MATH" | "AEIS_SECONDARY_MATH";
type Question = { id: string; domain: string; subskill: string; prompt: string; type: string; options?: Array<{ key: string; text: string }>; stimulus?: string; audioUrl?: string; requiresReviewer?: boolean };
type Report = { productTitle?: string; scorecards?: Array<{ label: string; scoreLabel: string; band: string }>; skillScores?: Record<string, number>; moduleScores?: Record<string, number>; strengths?: string[]; priorities?: string[]; improvementPlan?: Array<{ stage: string; title: string; detail: string }>; standard?: string; nextStep?: string; unmeasuredSkills?: string[] };
type Session = { studentCode: string; studentNickname?: string | null; ageBand: string; targetPath: Product; status: string; question: Question | null; section?: { label?: string; remainingSeconds: number; instructions?: string; expired?: boolean } | null; currentIndex: number; currentAnswer: string; answeredCount: number; totalQuestions: number; progressPercent: number; canSubmit: boolean; report?: Report | null; notice?: string };
type ApiResult = { ok: boolean; message?: string; session?: Session; sessionToken?: string; name?: string };

const products: Array<{ value: Product; label: string; detail: string; ages: string[] }> = [
  { value: "INTERNATIONAL_ENGLISH", label: "国际学校英语", detail: "英语学习诊断；12岁以上包含分区计时和听力。", ages: ["6–8岁", "9–11岁", "12–14岁", "15–17岁"] },
  { value: "AEIS_PRIMARY_ENGLISH", label: "小学 AEIS 英语", detail: "先看英语基础与学习重点。", ages: ["6–8岁", "9–11岁"] },
  { value: "AEIS_SECONDARY_ENGLISH", label: "中学 AEIS 英语", detail: "先看英语基础与学习重点。", ages: ["12–14岁", "15–17岁"] },
  { value: "AEIS_PRIMARY_MATH", label: "小学 AEIS 数学", detail: "独立选择题卷；不评价书面解题步骤。", ages: ["6–8岁", "9–11岁"] },
  { value: "AEIS_SECONDARY_MATH", label: "中学 AEIS 数学", detail: "独立选择题卷；不评价书面解题步骤。", ages: ["12–14岁", "15–17岁"] },
];

async function post(url: string, body: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const data = await response.json().catch(() => ({})) as ApiResult;
  if (!response.ok || !data.ok) throw new Error(data.message || "请求失败，请稍后再试。");
  return data;
}

export default function AcademicAssessment({ partnerCode }: { partnerCode: string }) {
  const [partnerName, setPartnerName] = useState("");
  const [partnerState, setPartnerState] = useState<"checking" | "valid" | "invalid">(partnerCode ? "checking" : "valid");
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState("9–11岁");
  const [product, setProduct] = useState<Product>("INTERNATIONAL_ENGLISH");
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [seconds, setSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previousToken, setPreviousToken] = useState("");
  const questionStartedAt = useRef(Date.now());
  const expiring = useRef(false);
  const storageKey = `sg-academic-assessment:${partnerCode || "direct"}`;
  const previousKey = `${storageKey}:previous`;

  const updateSession = useCallback((next: Session) => {
    setSession(next);
    setAnswer(next.currentAnswer || "");
    setSeconds(next.section?.remainingSeconds ?? null);
    questionStartedAt.current = Date.now();
    expiring.current = false;
  }, []);

  useEffect(() => {
    let active = true;
    if (!partnerCode) return;
    fetch(`/api/public/school-guide/academic-assessment/partner-link?code=${encodeURIComponent(partnerCode)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json() as ApiResult; if (!response.ok || !data.ok) throw new Error(data.message || "合作方入口无效"); return data; })
      .then((data) => { if (active) { setPartnerName(data.name || ""); setPartnerState("valid"); } })
      .catch((error) => { if (active) { setMessage(error instanceof Error ? error.message : "合作方入口无效"); setPartnerState("invalid"); } });
    return () => { active = false; };
  }, [partnerCode]);

  useEffect(() => {
    setPreviousToken(window.localStorage.getItem(previousKey) || "");
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    let active = true;
    post("/api/public/school-guide/academic-assessment/session", { action: "load", sessionToken: saved })
      .then((data) => { if (active && data.session) { setToken(saved); updateSession(data.session); } })
      .catch(() => { window.localStorage.removeItem(storageKey); });
    return () => { active = false; };
  }, [storageKey, previousKey, updateSession]);

  const act = useCallback(async (action: "expire_section" | "submit" | "answer", payload: Record<string, unknown> = {}) => {
    if (!token) return;
    setBusy(true); setMessage("");
    try {
      const data = await post("/api/public/school-guide/academic-assessment/session", { action, sessionToken: token, ...payload });
      if (data.session) updateSession(data.session);
      if (data.message) setMessage(data.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作失败，请重试。"); if (action === "expire_section") setSeconds(null); }
    finally { setBusy(false); expiring.current = false; }
  }, [token, updateSession]);

  useEffect(() => {
    if (!session?.section || !["STARTED", "IN_PROGRESS", "READY_TO_SUBMIT"].includes(session.status)) return;
    const id = window.setInterval(() => setSeconds((value) => value == null ? null : Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [session?.question?.id, session?.section?.remainingSeconds, session?.status]);

  useEffect(() => {
    if (seconds === 0 && session?.section && !session.canSubmit && !busy && !expiring.current) {
      expiring.current = true;
      void act("expire_section");
    }
  }, [seconds, session, busy, act]);

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (partnerState !== "valid") return;
    setBusy(true); setMessage("");
    try {
      const data = await post("/api/public/school-guide/academic-assessment/start", { studentNickname: nickname.trim(), ageBand, targetPath: product, partnerCode, consent: consent ? "yes" : "no" });
      if (data.session && data.sessionToken) {
        window.localStorage.setItem(storageKey, data.sessionToken);
        setToken(data.sessionToken);
        updateSession(data.session);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "开始失败，请重试。"); }
    finally { setBusy(false); }
  }

  function chooseProduct(value: Product) {
    setProduct(value);
    const selected = products.find((item) => item.value === value);
    if (selected && !selected.ages.includes(ageBand)) setAgeBand(selected.ages[0]);
  }

  function chooseAge(value: string) {
    setAgeBand(value);
    if (!products.find((item) => item.value === product)?.ages.includes(value)) {
      setProduct(products.find((item) => item.ages.includes(value))?.value || "INTERNATIONAL_ENGLISH");
    }
  }

  function newPaper(value?: Product) {
    if (session?.studentNickname) setNickname(session.studentNickname);
    if (session?.ageBand) setAgeBand(session.ageBand);
    if (value) chooseProduct(value);
    if (token) { window.localStorage.setItem(previousKey, token); setPreviousToken(token); }
    window.localStorage.removeItem(storageKey);
    setToken(""); setSession(null); setAnswer(""); setConsent(false); setMessage("");
  }

  async function showPrevious() {
    if (!previousToken) return;
    setBusy(true); setMessage("");
    try {
      const data = await post("/api/public/school-guide/academic-assessment/session", { action: "load", sessionToken: previousToken });
      if (data.session) {
        const current = token;
        window.localStorage.setItem(storageKey, previousToken);
        if (current) { window.localStorage.setItem(previousKey, current); setPreviousToken(current); }
        else { window.localStorage.removeItem(previousKey); setPreviousToken(""); }
        setToken(previousToken); updateSession(data.session);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "上份测评无法打开。"); }
    finally { setBusy(false); }
  }

  const submitted = session && ["COMPLETED", "AWAITING_REVIEW"].includes(session.status);
  const optionalMath: Product | null = session?.targetPath === "AEIS_PRIMARY_ENGLISH" ? "AEIS_PRIMARY_MATH" : session?.targetPath === "AEIS_SECONDARY_ENGLISH" ? "AEIS_SECONDARY_MATH" : null;
  const question = session?.question;
  const report = session?.report;

  return <div className={styles.wrap}>
    {partnerCode && <div className={styles.partner}>{partnerState === "checking" ? "正在核验合作方入口…" : partnerState === "valid" ? `合作方专属入口：${partnerName}` : "合作方入口已失效"}</div>}
    {message && <p className={styles.notice} role="status">{message}</p>}
    {partnerState !== "invalid" && !session && <form className={styles.card} onSubmit={start}>
      <h2>选择测评</h2>
      <p className={styles.muted}>建议先做英语。数学是独立卷，可在英语提交后再做。</p>
      <div className={styles.grid}>
        <label>学生昵称<input required maxLength={60} autoComplete="off" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="例如：小明" /></label>
        <label>年龄段<select value={ageBand} onChange={(event) => chooseAge(event.target.value)}>{["6–8岁", "9–11岁", "12–14岁", "15–17岁"].map((age) => <option key={age}>{age}</option>)}</select></label>
      </div>
      <fieldset className={styles.paperList}><legend>选择试卷</legend>{products.filter((item) => item.ages.includes(ageBand)).map((item) => <label key={item.value} className={styles.paper}>
        <input type="radio" name="product" checked={product === item.value} onChange={() => chooseProduct(item.value)} />
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
      </label>)}</fieldset>
      <label className={styles.consent}><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>我作为家长或监护人，同意 GT Educational Institute Pte. Ltd. 保存学生昵称、答题和测评结果，用于学习诊断与后续咨询；若从合作方入口进入，也记录入口来源。<a href="/school-guide/privacy" target="_blank" rel="noreferrer">查看隐私说明</a></span></label>
      <p className={styles.muted}>这是内部学习诊断，不能代替学校、CEQ、MOE 或 AEIS 官方考试。写作可能需要老师复核。</p>
      <button className={styles.primary} disabled={busy || partnerState !== "valid"} type="submit">{busy ? "正在创建试卷…" : "开始测评"}</button>
      {previousToken && <button type="button" disabled={busy} onClick={() => void showPrevious()}>查看上一份测评</button>}
    </form>}

    {session && !submitted && <div className={styles.card}>
      <div className={styles.topline}><div><small>学生编号 {session.studentCode}</small><h2>{products.find((item) => item.value === session.targetPath)?.label || "学习测评"}</h2></div><strong>{session.answeredCount} / {session.totalQuestions}</strong></div>
      <div className={styles.progress}><div style={{ width: `${session.progressPercent}%` }} /></div>
      {session.section && <div className={styles.section}><strong>{session.section.label || "计时部分"} · {Math.floor((seconds ?? 0) / 60)}:{String((seconds ?? 0) % 60).padStart(2, "0")}</strong><span>{session.section.instructions}</span></div>}
      {session.canSubmit ? <div><h3>答题完成</h3><p>提交后会生成内部诊断结果；写作若需人工复核，页面会提示等待老师完成。</p><button className={styles.primary} disabled={busy} onClick={() => void act("submit")}>{busy ? "正在提交…" : "提交试卷并查看结果"}</button></div> : question && <div>
        <div className={styles.questionMeta}>第 {session.currentIndex + 1} 题 · {question.subskill || question.domain}</div>
        {question.stimulus && <div className={styles.stimulus}>{question.stimulus}</div>}
        {question.audioUrl && <audio className={styles.audio} controls src={question.audioUrl}>浏览器不支持音频播放。</audio>}
        <h3 className={styles.prompt}>{question.prompt}</h3>
        {question.options?.length ? <div className={styles.options}>{question.options.map((option) => <label className={styles.option} key={option.key}><input type="radio" name={`answer-${question.id}`} value={option.key} checked={answer === option.key} onChange={() => setAnswer(option.key)} /><span>{option.key}. {option.text}</span></label>)}</div> : <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={8000} rows={8} placeholder="在这里输入答案" />}
        {question.requiresReviewer && <p className={styles.muted}>这道题需要评分或老师复核，提交后可能暂不显示最终分数。</p>}
        <button className={styles.primary} disabled={busy || !answer.trim() || seconds === 0} onClick={() => void act("answer", { questionId: question.id, answer: answer.trim(), durationSeconds: Math.min(900, Math.round((Date.now() - questionStartedAt.current) / 1000)) })}>{busy ? "正在保存…" : "保存并进入下一题"}</button>
      </div>}
      <p className={styles.muted}>进度会保存在当前浏览器。请保留本页面，完成前不要清除浏览器数据。</p>
      {previousToken && <button type="button" disabled={busy} onClick={() => void showPrevious()}>切换至上一份测评</button>}
    </div>}

    {submitted && session && <div className={styles.card}>
      <div className={styles.topline}><div><small>学生编号 {session.studentCode}</small><h2>{report?.productTitle || "测评结果"}</h2></div><strong>{session.status === "AWAITING_REVIEW" ? "待复核" : "已完成"}</strong></div>
      {session.status === "AWAITING_REVIEW" && <p className={styles.notice}>试卷已提交。写作评分尚待老师复核；请稍后点击“刷新结果”。当前分数不应作为最终结论。</p>}
      {session.status === "COMPLETED" && <div className={styles.scores}>{report?.scorecards?.map((card) => <div className={styles.score} key={card.label}><span>{card.label}</span><strong>{card.scoreLabel}</strong><small>{card.band}</small></div>)}</div>}
      {session.status === "COMPLETED" && report && <>
        {Object.keys(report.moduleScores || {}).length > 0 && <section><h3>分项表现</h3><div className={styles.metrics}>{Object.entries(report.moduleScores || {}).map(([name, score]) => <span key={name}>{name}：{score}/100</span>)}</div></section>}
        {Object.keys(report.skillScores || {}).length > 0 && <section><h3>技能观察</h3><div className={styles.metrics}>{Object.entries(report.skillScores || {}).map(([name, score]) => <span key={name}>{name}：{score}/100</span>)}</div></section>}
        {!!report.strengths?.length && <section><h3>已体现的表现</h3><ul>{report.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {!!report.priorities?.length && <section><h3>建议先复核</h3><ul>{report.priorities.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {!!report.improvementPlan?.length && <section><h3>参考学习安排</h3><div className={styles.plan}>{report.improvementPlan.map((item) => <article key={item.stage}><small>{item.stage}</small><strong>{item.title}</strong><p>{item.detail}</p></article>)}</div></section>}
        {report.nextStep && <p className={styles.notice}>{report.nextStep}</p>}
        <details><summary>查看测评标准与局限</summary><p>{report.standard}</p>{!!report.unmeasuredSkills?.length && <p>未覆盖：{report.unmeasuredSkills.join("、")}</p>}</details>
      </>}
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void act("submit")}>刷新结果</button>{optionalMath && <button type="button" onClick={() => newPaper(optionalMath)}>另做数学独立卷</button>}{previousToken && <button type="button" disabled={busy} onClick={() => void showPrevious()}>切换至上一份测评</button>}<button type="button" onClick={() => newPaper()}>开始另一份测评</button></div>
      <section className={styles.consult}><h3>需要老师结合目标学校解读？</h3><p>提交咨询时会附上这份测评编号，并在系统内记录合作方来源。</p><ConsultForm assessmentSummary={`测评编号：${session.studentCode}；${report?.productTitle || "待复核"}`} assessmentSessionToken={token} /></section>
      <p className={styles.muted}>{session.notice}</p>
    </div>}
  </div>;
}

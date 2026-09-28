"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { getRenewalEntitlementEvidence } from "@/lib/renewal-entitlement-evidence";
type Evidence = Awaited<ReturnType<typeof getRenewalEntitlementEvidence>>;
export function RenewalEntitlementEvidence({ taskId, packageId, contractId, ids, note, lang, onScope, onIds, onNote }: {
  taskId: string; packageId: string; contractId: string | null; ids?: string[]; note: string; lang: Lang;
  onScope: (packageId: string, contractId: string) => void; onIds: (ids: string[]) => void; onNote: (note: string) => void;
}) {
  const t = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError("");
    const query = new URLSearchParams({ packageId, contractId: contractId || "" });
    fetch(`/api/admin/renewals/${taskId}?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async r => { const result = await r.json(); if (!r.ok) throw new Error(result.message); return result.entitlement; })
      .then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [taskId, packageId, contractId, revision]);
  const selected = ids ?? data?.automaticIds ?? [];
  const blocker = (key: string) => ({ USED: t("Used in another renewal", "已用于其他续费"), CONTRACT: t("Contract is invalid", "合同无效"), CORRECTION: t("Later corrections need review", "有后续冲正，需核对"), PERIOD: t("Period no longer matches", "有效期不匹配") }[key] || key);
  return <details><summary>{t("New entitlement verification", "新增权益核验")}</summary>
    <p>{t("Before completing a renewal, select the actual purchase or monthly extension. Payment and an existing balance alone do not prove new entitlement. This check does not change the package or its ledger.", "完成续费前，请核对实际购入或月包续期记录。收款和已有余额不能单独证明新增权益；此核验不会修改课包或流水。")}</p>
    {error && <p role="alert">{error}</p>}
    {data && <>
      <label>{t("Package receiving this renewal", "本次续费生效课包")}<select value={packageId} onChange={e => onScope(e.target.value, "")}>
        {data.packages.map(p => <option key={p.id} value={p.id}>{p.createdAt.slice(0,10)} · {p.id.slice(-8)} · {p.validTo ? p.validTo.slice(0,10) : t("No end date", "无到期日")}</option>)}
      </select></label>
      <label>{t("Contract for this renewal", "本次续费合同")}<select value={contractId || ""} onChange={e => onScope(packageId, e.target.value)}>
        <option value="">{t("Manual purchase / no linked contract", "手动购买／无关联合同")}</option>
        {contractId && !data.contracts.some(c => c.id === contractId) && <option value={contractId}>{t("Linked contract needs review", "关联合同需核对")}</option>}
        {data.contracts.map(c => <option key={c.id} value={c.id}>{c.invoiceNo || c.id.slice(-8)} · {c.createdAt.slice(0,10)}</option>)}
      </select></label>
      {!data.packageReady && <p role="alert">{t("Package is not currently active, within validity and cleared for use. Review its dates and Finance status.", "课包尚未满足有效期、生效状态或财务门槛，请核对。")}</p>}
      {!data.candidates.length && <p>{t("No qualifying purchase or recorded period extension. Keep this renewal pending review; do not add hours merely to clear it.", "未找到实际购入或已记录的续期凭据，请保留待核对，不要为了清除待办而增加课时。")}</p>}
      {data.candidates.map(c => <label key={c.id} style={{ display: "block" }}><input type="checkbox" disabled={Boolean(c.blocker)} checked={selected.includes(c.id)} onChange={e => onIds(e.target.checked ? data.unit === "PERIOD" ? [c.id] : [...selected, c.id] : selected.filter(id => id !== c.id))}/>
        {c.createdAt.slice(0,10)} · {c.unit === "PERIOD" ? t("Monthly validity", "月包有效期") : c.unit === "COUNT" ? `${c.quantity} ${t("sessions", "次")}` : `${(c.quantity || 0) / 60} ${t("hours", "小时")}`} · {c.id.slice(-8)}
        {c.blocker ? ` · ${blocker(c.blocker)}` : c.requiresReview ? ` · ${t("Scope review required", "需核对本次归属")}` : ""}
      </label>)}
      <label>{t("Entitlement review basis", "权益归属核对依据")}<textarea value={note} maxLength={1000} onChange={e => onNote(e.target.value)} placeholder={t("For manual purchases, earlier records or monthly extensions, describe the evidence checked (at least 10 characters).", "手动购入、较早记录或月包续期，请填写已核对的依据（至少10个字符）。")}/></label>
    </>}
    <button type="button" onClick={() => setRevision(r => r + 1)}>{t("Refresh entitlement evidence", "刷新权益凭据")}</button>
  </details>;
}

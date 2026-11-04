"use client";
import { useEffect, useState } from "react";
import type {
  ParentReportSource,
  ParentReportContent,
} from "@/lib/learning-report-parent-content";
type Edition = {
  id: string;
  status: string;
  reviewedAt: string | null;
  updatedAt: string;
  errorCode: string | null;
  content: ParentReportContent | null;
};
type State = {
  source: ParentReportSource;
  edition: Edition | null;
  configured: boolean;
};
export default function ParentReportEditionPanel({
  kind,
  id,
  lang = "BILINGUAL",
  autoPrepare = false,
  allowFinalDownload = true,
}: {
  kind: "MIDTERM" | "FINAL" | "RENEWAL";
  id: string;
  lang?: "ZH" | "EN" | "BILINGUAL";
  autoPrepare?: boolean;
  allowFinalDownload?: boolean;
}) {
  const t = (en: string, zh: string) =>
    lang === "EN" ? en : lang === "ZH" ? zh : `${zh} / ${en}`;
  const [state, setState] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ack, setAck] = useState(false);
  const base = `/api/teacher/learning-reports/${kind.toLowerCase()}/${encodeURIComponent(id)}/parent-edition`;
  async function load() {
    const r = await fetch(base, { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw Error(data.code || "REQUEST_FAILED");
    setState(data);
  }
  useEffect(() => {
    load().catch(() =>
      setError(
        t(
          "Could not load the saved report. Refresh and try again.",
          "暂时无法读取已保存报告，请刷新重试。",
        ),
      ),
    );
  }, [base]);
  useEffect(() => {
    if (state?.edition?.status !== "GENERATING") return;
    const timer = setInterval(() => load().catch(() => {}), 4000);
    return () => clearInterval(timer);
  }, [state?.edition?.status, base]);
  async function action(action: "generate" | "regenerate" | "review") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          editionId: state?.edition?.id,
          acknowledged: ack,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.code);
      setAck(false);
      await load();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(
        code === "SOURCE_CHANGED"
          ? t(
              "The saved report changed. Generate and review the latest version.",
              "已保存的原文有变化，请生成并确认最新版本。",
            )
          : code === "SAVE_AND_SUBMIT_FIRST"
            ? t(
                "Save and submit the teacher report first.",
                "请先保存并提交老师报告。",
              )
            : t(
                "The request could not be completed. Your teacher report is saved; refresh and retry.",
                "操作未完成，老师原文已保存，请刷新后重试。",
              ),
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (autoPrepare && state?.configured && !state.edition && !busy)
      void action("generate");
  }, [autoPrepare, Boolean(state), state?.configured]);
  const edition = state?.edition,
    ready = edition?.status === "READY",
    confirmed = ready && !!edition.reviewedAt;
  const generating =
    edition?.status === "GENERATING" &&
    Date.now() - Date.parse(edition.updatedAt) < 180000;
  const btn = {
    padding: "9px 14px",
    border: "1px solid #b9ced0",
    borderRadius: 8,
    background: "#fff",
    color: "#174d52",
    fontWeight: 700,
    textDecoration: "none",
  } as const;
  return (
    <section
      style={{
        border: "1px solid #c5dedc",
        borderRadius: 14,
        padding: 18,
        background: "#f4f9f8",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 19, fontWeight: 800, color: "#173d46" }}>
        {t("Parent-ready report", "家长阅读版报告")}
      </div>
      <p style={{ margin: 0, lineHeight: 1.7 }}>
        {kind === "RENEWAL" ? t(
          "After the teacher submits, generate the Chinese translation and family summary. Check every paragraph against the original and confirm. The coordinator must then approve the report before the family PDF is released and delivery is recorded.",
          "老师提交后生成中文译文和家长摘要，逐段对照原文并确认；教务批准后才能下载正式家长版，并登记送达。",
        ) : t(
          "Save and submit the teacher report below first. Generate a complete Chinese translation and a concise family summary, review them alongside the original, then confirm and download. The existing academic approval and delivery process still applies.",
          "先保存并提交下方老师报告，再生成完整中文译文和家长重点摘要；对照原文检查、确认后即可下载。正式审核与家长送达继续使用现有流程。",
        )}
      </p>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          style={btn}
          disabled={busy || generating || !state?.configured}
          onClick={() => action("generate")}
        >
          {busy || generating
            ? t("Preparing, please wait…", "正在生成，请稍候…")
            : ready
              ? t("Saved version ready", "本版本已生成")
              : t("Generate parent report / Retry", "生成家长版／重试")}
        </button>
        <a
          style={btn}
          href={`${base}/pdf?lang=EN${kind === "RENEWAL" && !allowFinalDownload ? "&preview=1" : ""}`}
          target="_blank"
          rel="noreferrer"
        >
          {kind === "RENEWAL" && !allowFinalDownload ? t("Original draft PDF", "原文内部预览 PDF") : t("Full original PDF", "原文完整版 PDF")}
        </a>
        {ready ? (
          <a
            style={btn}
            href={`${base}/pdf?lang=BILINGUAL&preview=1`}
            target="_blank"
            rel="noreferrer"
          >
            {t("Preview bilingual PDF", "预览中英 PDF")}
          </a>
        ) : null}
      </div>
      {state && !state.configured ? (
        <p role="status">
          {t(
            "AI translation is not configured. The full original report remains available; ask the administrator to configure the service.",
            "AI 翻译服务尚未配置；原文完整版仍可下载，请联系管理员完成配置。",
          )}
        </p>
      ) : null}
      {edition?.status === "FAILED" ? (
        <p role="alert" style={{ color: "#9c4323" }}>
          {t(
            "The translation was not saved as complete. Retry after a moment; no incomplete translation will be used.",
            "此次译文未通过完整性检查或服务暂不可用，请稍后重试；系统不会使用不完整译文。",
          )}
          {edition.errorCode === "AI_INPUT_LIMIT"
            ? t(
                " This report exceeds the translation input limit; contact the administrator.",
                " 本报告超出翻译处理长度，请联系管理员。",
              )
            : ""}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {ready && !confirmed ? (
        <button
          type="button"
          style={btn}
          disabled={busy}
          onClick={() => action("regenerate")}
        >
          {t(
            "Regenerate unconfirmed translation",
            "重新翻译（尚未确认的版本）",
          )}
        </button>
      ) : null}
      {ready && edition.content && state ? (
        <>
          <div style={{ fontWeight: 700 }}>
            {confirmed
              ? t(
                  "Translation confirmed for this saved version",
                  "本次保存版本的译文已确认",
                )
              : t(
                  "Review the complete translation before confirming",
                  "请核对完整译文后确认",
                )}
          </div>
          {edition.content.summary.length ? (
            <div style={{ padding: 12, background: "#fff", borderRadius: 8 }}>
              <strong>
                {t(
                  "Key points for families (AI summary)",
                  "家长重点（AI 归纳）",
                )}
              </strong>
              <ul>
                {edition.content.summary.map((s, i) => (
                  <li key={i} style={{ marginTop: 8 }}>
                    {s.zh}
                    <div style={{ color: "#596d76" }}>{s.en}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {t(
                "Compare all original comments and Chinese translations",
                "展开核对全部原文与中文译文",
              )}
            </summary>
            <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
              {state.source.fields.map((f) => (
                <div
                  key={f.key}
                  style={{
                    padding: 14,
                    border: "1px solid #dae4e7",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <strong>
                    {f.sectionZh} · {f.labelZh} / {f.labelEn}
                  </strong>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.8,
                      marginTop: 8,
                    }}
                  >
                    {edition.content!.translations[f.key]}
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                      marginTop: 8,
                      color: "#5a6974",
                    }}
                  >
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </details>
          {!confirmed ? (
            <div style={{ display: "grid", gap: 10 }}>
              <label>
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />{" "}
                {t(
                  "I checked the translation against the saved teacher comments, including scores and target levels.",
                  "我已对照保存的教师原文核对译文，包括成绩与目标等级。",
                )}
              </label>
              <button
                type="button"
                disabled={!ack || busy}
                style={{ ...btn, justifySelf: "start" }}
                onClick={() => action("review")}
              >
                {t(
                kind === "RENEWAL" ? "Confirm translation for coordinator approval" : "Confirm translation and enable downloads",
                  kind === "RENEWAL" ? "确认译文，交教务审批" : "确认译文，启用家长版下载",
                )}
              </button>
            </div>
          ) : allowFinalDownload ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                ["BILINGUAL", "Bilingual parent PDF", "中英对照家长版"],
                ["ZH", "Chinese parent PDF", "中文家长版"],
                ["EN", "Full original PDF", "原文完整版"],
              ].map(([code, en, zh]) => (
                <a
                  key={code}
                  style={btn}
                  href={`${base}/pdf?lang=${code}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(en, zh)}
                </a>
              ))}
            </div>
          ) : <p>{t("Waiting for coordinator approval before the family PDF can be downloaded.", "家长版 PDF 须经教务批准后方可下载。")}</p>}
        </>
      ) : null}
    </section>
  );
}

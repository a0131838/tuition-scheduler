import type {
  ParentReportContent,
  ParentReportSource,
} from "@/lib/learning-report-parent-content";
export default function ParentReportReadView({
  source,
  content,
}: {
  source: ParentReportSource;
  content: ParentReportContent;
}) {
  const style = {
    border: "1px solid #d7e5e4",
    borderRadius: 12,
    padding: 20,
    background: "#fff",
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {content.summary.length ? (
        <section style={{ ...style, background: "#edf6f3" }}>
          <h2 style={{ marginTop: 0 }}>
            家长先看这几件事 / Key points for families
          </h2>
          <p style={{ color: "#59716f" }}>
            AI 根据教师评语整理 / AI summary of teacher comments
          </p>
          {content.summary.map((s, i) => (
            <div key={i} style={{ marginTop: 14, lineHeight: 1.8 }}>
              {s.zh}
              <div style={{ color: "#586976" }}>{s.en}</div>
            </div>
          ))}
        </section>
      ) : null}
      {source.fields.map((f) => (
        <section key={f.key} style={style}>
          <h2 style={{ fontSize: 18, marginTop: 0, color: "#205b60" }}>
            {f.sectionZh} · {f.labelZh}
            <span
              style={{
                display: "block",
                fontSize: 14,
                color: "#586976",
                marginTop: 6,
              }}
            >
              {f.sectionEn} · {f.labelEn}
            </span>
          </h2>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
            {content.translations[f.key]}
          </div>
          {content.translations[f.key] !== f.value ? (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", color: "#526b78" }}>
                查看教师原文 / Teacher original
              </summary>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  marginTop: 10,
                }}
              >
                {f.value}
              </div>
            </details>
          ) : null}
        </section>
      ))}
      <p style={{ color: "#61707a", lineHeight: 1.7 }}>
        中文为 AI
        辅助译文，已与本次教师原文版本对应确认。下一阶段目标不代表已经取得的成绩。
        / Chinese is AI-assisted translation confirmed against this
        teacher-report version. Targets are future goals.
      </p>
    </div>
  );
}

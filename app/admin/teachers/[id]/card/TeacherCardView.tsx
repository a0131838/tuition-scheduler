"use client";

import { useEffect } from "react";

type Props = {
  name: string;
  subjectText: string;
  teachingLanguage: string;
  yearsExperienceText: string;
  nationality: string;
  almaMater: string;
  intro: string;
  autoPrint?: boolean;
};

function introLines(intro: string) {
  return intro
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function toYears(text: string) {
  if (!text || text === "-") return "-";
  return /年|years?/i.test(text) ? text : `${text} 年`;
}

function formatAlmaMater(text: string) {
  const parts = String(text || "")
    .split(/[，,]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts.join("\n") : "暂无";
}

export default function TeacherCardView(props: Props) {
  useEffect(() => {
    if (!props.autoPrint) return;
    const id = window.setTimeout(() => window.print(), 120);
    return () => window.clearTimeout(id);
  }, [props.autoPrint]);

  const lines = introLines(props.intro);

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "20px auto",
        fontFamily: "system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
        padding: "0 12px",
      }}
    >
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "30% 70%",
          minHeight: 520,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
          border: "1px solid #e6e6e6",
          background: "#efefef",
        }}
      >
        <aside
          style={{
            background: "#f5b700",
            color: "#fff",
            padding: "52px 24px 30px",
          }}
        >
          <div style={{ fontSize: "clamp(23px, 2.57vw, 35px)", lineHeight: 1.1, fontWeight: 900, marginBottom: 10 }}>{props.name}</div>
          <div style={{ fontSize: "clamp(13px, 1.4vw, 18px)", fontWeight: 800, marginBottom: 6 }}>教授</div>
          <div style={{ fontSize: "clamp(12px, 1.12vw, 16px)", fontWeight: 800, lineHeight: 1.35, whiteSpace: "pre-line" }}>
            {props.subjectText || "课程"}
          </div>

          <div
            style={{
              marginTop: 44,
              borderRadius: 14,
              background: "#f2f2f2",
              color: "#4b4b4b",
              padding: "10px 14px",
              fontSize: "clamp(14px, 1.56vw, 21px)",
              fontWeight: 900,
            }}
          >
            基本信息
          </div>

          <ul
            style={{
              margin: "14px 0 0",
              paddingLeft: 0,
              listStyle: "none",
              fontSize: "clamp(12px, 1.24vw, 17px)",
              lineHeight: 1.7,
              fontWeight: 800,
            }}
          >
            <li style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: "1em" }}>◆</span>
              <span>教学语言：{props.teachingLanguage || "-"}</span>
            </li>
            <li style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: "1em" }}>◆</span>
              <span>国籍：{props.nationality || "-"}</span>
            </li>
            <li style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: "1em" }}>◆</span>
              <span>教龄：{toYears(props.yearsExperienceText)}</span>
            </li>
          </ul>
        </aside>

        <main style={{ padding: "40px 44px", color: "#1f1f1f" }}>
          <div
            style={{
              display: "inline-block",
              background: "#f5b700",
              color: "#fff",
              fontSize: "clamp(9px, 0.9vw, 13px)",
              lineHeight: "1.1",
              fontWeight: 800,
              borderRadius: 16,
              padding: "10px 22px",
              marginBottom: 16,
            }}
          >
            教育背景
          </div>

          <div style={{ fontSize: "clamp(12px, 1.21vw, 18px)", fontWeight: 700, marginBottom: 14, whiteSpace: "pre-line" }}>
            {formatAlmaMater(props.almaMater)}
          </div>

          <div
            style={{
              display: "inline-block",
              background: "#f5b700",
              color: "#fff",
              fontSize: "clamp(9px, 0.9vw, 13px)",
              lineHeight: "1.1",
              fontWeight: 800,
              borderRadius: 16,
              padding: "10px 22px",
              marginBottom: 16,
            }}
          >
            自我介绍
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {lines.length > 0 ? (
              lines.map((line, i) => (
                <div key={`${i}-${line.slice(0, 8)}`} style={{ fontSize: "clamp(10px, 1.05vw, 16px)", fontWeight: 700, lineHeight: 1.45 }}>
                  ◆ {line}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: "#666" }}>暂无介绍</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

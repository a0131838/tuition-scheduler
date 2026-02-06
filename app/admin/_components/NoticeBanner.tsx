"use client";

import { useEffect, useRef } from "react";

export default function NoticeBanner({
  type,
  title,
  message,
  children,
}: {
  type: "error" | "success" | "info" | "warn";
  title?: string;
  message: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const styles =
    type === "error"
      ? { border: "#f2b3b3", bg: "#fff5f5", color: "#b42318" }
      : type === "success"
      ? { border: "#b9e6c3", bg: "#f2fff5", color: "#027a48" }
      : type === "warn"
      ? { border: "#fde68a", bg: "#fffbeb", color: "#b45309" }
      : { border: "#c7d2fe", bg: "#eef2ff", color: "#3730a3" };

  return (
    <div
      ref={ref}
      style={{
        padding: 12,
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
        marginBottom: 12,
        borderRadius: 10,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {title ? <b>{title}:</b> : null}
      <span style={{ color: "#111" }}>{message}</span>
      {children ? <span style={{ marginLeft: 8 }}>{children}</span> : null}
    </div>
  );
}

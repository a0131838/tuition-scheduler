import type { CSSProperties } from "react";

type HeroTone = "indigo" | "amber" | "blue";
type MetricTone = "indigo" | "amber" | "rose" | "blue" | "emerald" | "slate";

const heroBackgrounds: Record<HeroTone, string> = {
  indigo: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #fff7ed 100%)",
  amber: "linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #eff6ff 100%)",
  blue: "linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #f0fdf4 100%)",
};

const metricTones: Record<MetricTone, { border: string; label: string; value: string }> = {
  indigo: { border: "#c7d2fe", label: "#3730a3", value: "#3730a3" },
  amber: { border: "#fdba74", label: "#9a3412", value: "#c2410c" },
  rose: { border: "#fda4af", label: "#9f1239", value: "#be123c" },
  blue: { border: "#93c5fd", label: "#1d4ed8", value: "#1d4ed8" },
  emerald: { border: "#86efac", label: "#166534", value: "#166534" },
  slate: { border: "#cbd5e1", label: "#475569", value: "#0f172a" },
};

export function workbenchHeroStyle(tone: HeroTone = "indigo"): CSSProperties {
  return {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: heroBackgrounds[tone],
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
    display: "grid",
    gap: 12,
  };
}

export const workbenchFilterPanelStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  background: "#fcfcfd",
};

export const workbenchInfoBarStyle: CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
};

export function workbenchMetricCardStyle(tone: MetricTone): CSSProperties {
  const config = metricTones[tone];
  return {
    border: `1px solid ${config.border}`,
    borderRadius: 14,
    padding: 12,
    background: "#ffffff",
  };
}

export function workbenchMetricLabelStyle(tone: MetricTone): CSSProperties {
  return {
    fontSize: 12,
    color: metricTones[tone].label,
  };
}

export function workbenchMetricValueStyle(tone: MetricTone): CSSProperties {
  return {
    fontWeight: 800,
    fontSize: 24,
    color: metricTones[tone].value,
  };
}

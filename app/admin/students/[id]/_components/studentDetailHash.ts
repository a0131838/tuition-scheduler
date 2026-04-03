"use client";

export function normalizeStudentDetailHash(hash?: string | null, fallback = "#student-workbench-bar") {
  const raw = String(hash ?? "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("#") && raw.length > 1) return raw;
  return `#${raw.replace(/^#+/, "")}`;
}

export function restoreStudentDetailHashAfterRefresh(hash?: string | null, fallback = "#student-workbench-bar") {
  if (typeof window === "undefined") return;
  const normalized = normalizeStudentDetailHash(hash, fallback);
  const targetId = normalized.slice(1);

  const applyHash = () => {
    const nextUrl = `${window.location.pathname}${window.location.search}${normalized}`;
    if (window.location.hash !== normalized) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ block: "start", behavior: "auto" });
    }
  };

  requestAnimationFrame(applyHash);
  window.setTimeout(applyHash, 80);
  window.setTimeout(applyHash, 220);
}

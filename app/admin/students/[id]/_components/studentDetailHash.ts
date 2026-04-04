"use client";

export function normalizeStudentDetailHash(hash?: string | null, fallback = "#student-workbench-bar") {
  const raw = String(hash ?? "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("#") && raw.length > 1) return raw;
  return `#${raw.replace(/^#+/, "")}`;
}

function escapeStudentDetailHashTarget(id: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function findStudentDetailHashTargets(hash?: string | null, fallback = "#student-workbench-bar") {
  if (typeof window === "undefined") {
    return {
      normalized: fallback,
      target: null as HTMLElement | null,
      detailsTarget: null as HTMLDetailsElement | null,
    };
  }

  const normalized = normalizeStudentDetailHash(hash, fallback);
  const targetId = normalized.slice(1);
  const escapedId = escapeStudentDetailHashTarget(targetId);
  const detailsTarget = targetId
    ? (window.document.querySelector(`details#${escapedId}`) as HTMLDetailsElement | null)
    : null;
  const target = targetId ? window.document.getElementById(targetId) : null;

  return { normalized, target, detailsTarget };
}

export function ensureStudentDetailSectionOpen(hash?: string | null, fallback = "#student-workbench-bar") {
  if (typeof window === "undefined") return;
  const { target, detailsTarget } = findStudentDetailHashTargets(hash, fallback);
  if (detailsTarget) detailsTarget.open = true;
  if (target instanceof HTMLDetailsElement) target.open = true;
  const parentDetails = target?.closest("details");
  if (parentDetails instanceof HTMLDetailsElement) {
    parentDetails.open = true;
  }
}

export function restoreStudentDetailHashAfterRefresh(hash?: string | null, fallback = "#student-workbench-bar") {
  if (typeof window === "undefined") return;

  const applyHash = () => {
    const { normalized, target, detailsTarget } = findStudentDetailHashTargets(hash, fallback);
    ensureStudentDetailSectionOpen(normalized, fallback);
    const nextUrl = `${window.location.pathname}${window.location.search}${normalized}`;
    if (window.location.hash !== normalized) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
    const scrollTarget = target ?? detailsTarget;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ block: "start", behavior: "auto" });
    }
  };

  requestAnimationFrame(applyHash);
  window.setTimeout(applyHash, 80);
  window.setTimeout(applyHash, 220);
}

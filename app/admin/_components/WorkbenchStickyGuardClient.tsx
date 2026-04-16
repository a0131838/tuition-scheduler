"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GUARDED_ATTR = "data-workbench-sticky-guard";
const COMPACT_BAR_ATTR = "data-workbench-sticky-guard-compact";
const LARGE_STICKY_MIN_HEIGHT = 120;
const LARGE_STICKY_MAX_TOP = 140;

function restoreDowngradedSticky(main: Element) {
  main.querySelectorAll<HTMLElement>(`[${COMPACT_BAR_ATTR}="generated"]`).forEach((element) => element.remove());
  main.querySelectorAll<HTMLElement>(`[${GUARDED_ATTR}="downgraded"]`).forEach((element) => {
    element.style.position = element.dataset.stickyGuardPosition || "";
    element.style.top = element.dataset.stickyGuardTop || "";
    element.style.zIndex = element.dataset.stickyGuardZIndex || "";
    delete element.dataset.stickyGuardPosition;
    delete element.dataset.stickyGuardTop;
    delete element.dataset.stickyGuardZIndex;
    element.setAttribute(GUARDED_ATTR, "restored");
  });
}

function shouldDowngradeSticky(element: HTMLElement, main: HTMLElement) {
  if (element.matches("[data-workbench-detail-pane='1'], th, [data-workbench-sticky-guard='compact']")) return false;

  const style = window.getComputedStyle(element);
  if (style.position !== "sticky") return false;

  const rect = element.getBoundingClientRect();
  const mainWidth = main.clientWidth;
  const minWideWidth = Math.max(520, Math.round(mainWidth * 0.72));
  const topValue = Number.parseFloat(style.top || "0");

  if (rect.width < minWideWidth) return false;
  if (rect.height < LARGE_STICKY_MIN_HEIGHT) return false;
  if (Number.isFinite(topValue) && topValue > LARGE_STICKY_MAX_TOP) return false;

  return true;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getCompactTitle(element: HTMLElement) {
  const candidates = Array.from(element.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, strong, summary, div, span"))
    .map((node) => {
      const text = normalizeText(node.textContent || "");
      return {
        text,
        weight: Number.parseInt(window.getComputedStyle(node).fontWeight || "400", 10) || 400,
      };
    })
    .filter((item) => item.text && item.text.length <= 64)
    .sort((a, b) => b.weight - a.weight);

  return candidates[0]?.text || "Quick jumps";
}

function getCompactLinks(element: HTMLElement) {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => {
      const headingLike = normalizeText(
        anchor.querySelector("strong, span, b")?.textContent || ""
      );
      const fullText = normalizeText(anchor.textContent || "");
      const label = headingLike || fullText;
      return {
        href: anchor.getAttribute("href") || "",
        label,
      };
    })
    .filter((item) => item.href && item.label && item.label.length <= 48)
    .filter((item) => {
      const key = `${item.href}::${item.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function createCompactBar(source: HTMLElement) {
  const compactTitle = getCompactTitle(source);
  const compactLinks = getCompactLinks(source);
  if (!compactLinks.length) return null;

  const wrapper = document.createElement("div");
  wrapper.setAttribute(GUARDED_ATTR, "compact");
  wrapper.setAttribute(COMPACT_BAR_ATTR, "generated");
  Object.assign(wrapper.style, {
    position: "sticky",
    top: "12px",
    zIndex: "4",
    display: "grid",
    gap: "8px",
    marginTop: "8px",
    marginBottom: "12px",
    padding: "10px 12px",
    border: "1px solid #dbe4f0",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    backdropFilter: "blur(12px)",
  } satisfies Partial<CSSStyleDeclaration>);

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  } satisfies Partial<CSSStyleDeclaration>);

  const title = document.createElement("div");
  title.textContent = compactTitle;
  Object.assign(title.style, {
    fontWeight: "800",
    color: "#0f172a",
    fontSize: "13px",
  } satisfies Partial<CSSStyleDeclaration>);

  const hint = document.createElement("div");
  hint.textContent = "Quick jumps / 快捷跳转";
  Object.assign(hint.style, {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "700",
  } satisfies Partial<CSSStyleDeclaration>);

  header.append(title, hint);

  const linksWrap = document.createElement("div");
  Object.assign(linksWrap.style, {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
  } satisfies Partial<CSSStyleDeclaration>);

  compactLinks.forEach((item) => {
    const anchor = document.createElement("a");
    anchor.href = item.href;
    anchor.textContent = item.label;
    Object.assign(anchor.style, {
      display: "inline-flex",
      alignItems: "center",
      minHeight: "34px",
      padding: "6px 10px",
      borderRadius: "999px",
      border: "1px solid #bfdbfe",
      background: "#eff6ff",
      color: "#1d4ed8",
      textDecoration: "none",
      fontSize: "12px",
      fontWeight: "700",
    } satisfies Partial<CSSStyleDeclaration>);
    linksWrap.appendChild(anchor);
  });

  wrapper.append(header, linksWrap);
  return wrapper;
}

function downgradeLargeStickyPanels() {
  const main = document.querySelector<HTMLElement>(".app-main");
  if (!main) return;

  restoreDowngradedSticky(main);

  main.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (!shouldDowngradeSticky(element, main)) return;

    element.dataset.stickyGuardPosition = element.style.position || "";
    element.dataset.stickyGuardTop = element.style.top || "";
    element.dataset.stickyGuardZIndex = element.style.zIndex || "";
    element.style.position = "static";
    element.style.top = "auto";
    element.style.zIndex = "auto";
    element.setAttribute(GUARDED_ATTR, "downgraded");

    const compactBar = createCompactBar(element);
    if (compactBar) {
      element.insertAdjacentElement("afterend", compactBar);
    }
  });
}

export default function WorkbenchStickyGuardClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | null = null;
    let observer: MutationObserver | null = null;

    const rerun = () => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) downgradeLargeStickyPanels();
        });
      });
    };

    rerun();
    const lateTimer = window.setTimeout(rerun, 600);

    const main = document.querySelector(".app-main");
    if (main) {
      observer = new MutationObserver((mutations) => {
        const onlyCompactMutations = mutations.every((mutation) =>
          [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].every((node) => {
            if (!(node instanceof HTMLElement)) return true;
            return node.getAttribute(COMPACT_BAR_ATTR) === "generated";
          })
        );
        if (!onlyCompactMutations) rerun();
      });
      observer.observe(main, { childList: true, subtree: true });
    }

    const handleResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rerun, 120);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelled = true;
      window.clearTimeout(lateTimer);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [pathname, searchParamsKey]);

  return null;
}

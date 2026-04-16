"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GUARDED_ATTR = "data-workbench-sticky-guard";
const COMPACT_BAR_ATTR = "data-workbench-sticky-guard-compact";
const LARGE_STICKY_MIN_HEIGHT = 120;
const LARGE_STICKY_MAX_TOP = 140;
const COMPACT_VISIBLE_LINKS = 3;

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

function collapseCompactLabel(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const countMatch = normalized.match(/^(.+?)(?:\s+\d[\d\s/:%A-Za-z\u4e00-\u9fff-]*)$/);
  const withoutCounts = countMatch?.[1] ? normalizeText(countMatch[1]) : normalized;
  return withoutCounts.replace(/[|·•:：-]\s*$/, "").trim();
}

function getCompactLinks(element: HTMLElement) {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => {
      const headingLike = Array.from(anchor.children)
        .map((child) => ({
          text: normalizeText(child.textContent || ""),
          weight: Number.parseInt(window.getComputedStyle(child).fontWeight || "400", 10) || 400,
        }))
        .find((child) => child.text && child.weight >= 650)?.text
        || normalizeText(anchor.querySelector("strong, span, b")?.textContent || "");
      const fullText = normalizeText(anchor.textContent || "");
      const label = collapseCompactLabel(headingLike || fullText);
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
  const compactLinks = getCompactLinks(source);
  if (!compactLinks.length) return null;
  const primaryLinks = compactLinks.slice(0, COMPACT_VISIBLE_LINKS);
  const moreLinks = compactLinks.slice(COMPACT_VISIBLE_LINKS);

  const wrapper = document.createElement("div");
  wrapper.setAttribute(GUARDED_ATTR, "compact");
  wrapper.setAttribute(COMPACT_BAR_ATTR, "generated");
  Object.assign(wrapper.style, {
    position: "sticky",
    top: "12px",
    zIndex: "4",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "8px",
    marginBottom: "12px",
    padding: "8px 10px",
    border: "1px solid #dbe4f0",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
    backdropFilter: "blur(12px)",
  } satisfies Partial<CSSStyleDeclaration>);

  const label = document.createElement("div");
  label.textContent = "Jump / 跳转";
  Object.assign(label.style, {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "700",
    whiteSpace: "nowrap",
    paddingInline: "4px",
  } satisfies Partial<CSSStyleDeclaration>);

  const linksWrap = document.createElement("div");
  Object.assign(linksWrap.style, {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  } satisfies Partial<CSSStyleDeclaration>);

  primaryLinks.forEach((item) => {
    const anchor = document.createElement("a");
    anchor.href = item.href;
    anchor.textContent = item.label;
    Object.assign(anchor.style, {
      display: "inline-flex",
      alignItems: "center",
      minHeight: "28px",
      padding: "4px 10px",
      borderRadius: "999px",
      border: "1px solid #dbe4f0",
      background: "#f8fafc",
      color: "#334155",
      textDecoration: "none",
      fontSize: "12px",
      fontWeight: "700",
      whiteSpace: "nowrap",
    } satisfies Partial<CSSStyleDeclaration>);
    linksWrap.appendChild(anchor);
  });

  if (moreLinks.length) {
    const moreWrap = document.createElement("details");
    Object.assign(moreWrap.style, {
      position: "relative",
    } satisfies Partial<CSSStyleDeclaration>);

    const summary = document.createElement("summary");
    summary.textContent = "More / 更多";
    Object.assign(summary.style, {
      display: "inline-flex",
      alignItems: "center",
      minHeight: "28px",
      padding: "4px 10px",
      borderRadius: "999px",
      border: "1px dashed #cbd5e1",
      background: "#ffffff",
      color: "#475569",
      fontSize: "12px",
      fontWeight: "700",
      cursor: "pointer",
      listStyle: "none",
      whiteSpace: "nowrap",
    } satisfies Partial<CSSStyleDeclaration>);
    summary.addEventListener("click", (event) => event.stopPropagation());

    const menu = document.createElement("div");
    Object.assign(menu.style, {
      position: "absolute",
      top: "calc(100% + 8px)",
      right: "0",
      minWidth: "200px",
      display: "grid",
      gap: "6px",
      padding: "8px",
      border: "1px solid #dbe4f0",
      borderRadius: "14px",
      background: "rgba(255, 255, 255, 0.98)",
      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
    } satisfies Partial<CSSStyleDeclaration>);

    moreLinks.forEach((item) => {
      const anchor = document.createElement("a");
      anchor.href = item.href;
      anchor.textContent = item.label;
      Object.assign(anchor.style, {
        display: "flex",
        alignItems: "center",
        minHeight: "32px",
        padding: "6px 10px",
        borderRadius: "10px",
        background: "#f8fafc",
        color: "#334155",
        textDecoration: "none",
        fontSize: "12px",
        fontWeight: "600",
      } satisfies Partial<CSSStyleDeclaration>);
      anchor.addEventListener("click", () => {
        moreWrap.open = false;
      });
      menu.appendChild(anchor);
    });

    moreWrap.append(summary, menu);
    linksWrap.appendChild(moreWrap);
  }

  wrapper.append(label, linksWrap);
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

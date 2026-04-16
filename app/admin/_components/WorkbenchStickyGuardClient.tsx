"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GUARDED_ATTR = "data-workbench-sticky-guard";
const LARGE_STICKY_MIN_HEIGHT = 120;
const LARGE_STICKY_MAX_TOP = 140;

function restoreDowngradedSticky(main: Element) {
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
  if (element.matches("[data-workbench-detail-pane='1'], th")) return false;

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
      observer = new MutationObserver(() => rerun());
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

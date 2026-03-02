"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

function keyForPath(pathname: string) {
  // Only key by pathname so redirects that add/remove query params still restore scroll.
  return `tuition-scheduler:scroll:${pathname || "/"}`;
}

export default function ScrollManager() {
  const pathname = usePathname();

  const getMainScrollTop = () => {
    const main = document.querySelector(".app-main") as HTMLElement | null;
    if (main) return main.scrollTop || 0;
    return window.scrollY || 0;
  };

  const applyScrollTop = (y: number) => {
    const top = Math.max(0, y);
    const main = document.querySelector(".app-main") as HTMLElement | null;
    if (main) {
      main.scrollTop = top;
      requestAnimationFrame(() => {
        main.scrollTop = top;
      });
      setTimeout(() => {
        main.scrollTop = top;
      }, 120);
      return;
    }
    window.scrollTo({ top, left: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      window.scrollTo({ top, left: 0, behavior: "auto" });
    });
  };

  useLayoutEffect(() => {
    try {
      const key = keyForPath(pathname);
      const raw = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      if (!raw) {
        // Cross-page navigation should start from top by default.
        applyScrollTop(0);
        return;
      }
      const y = Number(raw);
      if (!Number.isFinite(y)) {
        applyScrollTop(0);
        return;
      }
      applyScrollTop(y);
    } catch {
      // ignore
    }
  }, [pathname]);

  useEffect(() => {
    const saveForPath = (path: string) => {
      try {
        sessionStorage.setItem(keyForPath(path), String(getMainScrollTop()));
      } catch {
        // ignore
      }
    };

    const onSubmit = () => saveForPath(pathname);

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      // Restore only when navigating within the same pathname (e.g. toggle query params on the same page).
      // That matches "stay where I am" expectations, and avoids surprising behavior across pages.
      let destPath = "";
      try {
        const dest = new URL(a.href, window.location.href);
        if (dest.origin !== window.location.origin) return;
        destPath = dest.pathname;
      } catch {
        return;
      }

      // Same-path interactions (query toggles, in-page actions) should keep position.
      if (destPath === pathname) {
        saveForPath(pathname);
      }
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [pathname]);

  return null;
}

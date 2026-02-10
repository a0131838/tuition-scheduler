"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

function keyForPath(pathname: string) {
  // Only key by pathname so redirects that add/remove query params still restore scroll.
  return `tuition-scheduler:scroll:${pathname || "/"}`;
}

export default function ScrollManager() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    try {
      const key = keyForPath(pathname);
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      sessionStorage.removeItem(key);
      const y = Number(raw);
      if (!Number.isFinite(y)) return;
      window.scrollTo({ top: Math.max(0, y), left: 0, behavior: "auto" });
    } catch {
      // ignore
    }
  }, [pathname]);

  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(keyForPath(pathname), String(window.scrollY || 0));
      } catch {
        // ignore
      }
    };

    const onSubmit = () => save();

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
        destPath = new URL(a.href, window.location.href).pathname;
      } catch {
        return;
      }
      if (destPath !== pathname) return;
      save();
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


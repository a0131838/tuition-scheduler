"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "sgt-admin-sidebar-scroll";

export default function SidebarScrollMemoryClient() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    try {
      const sidebar = document.querySelector(".app-sidebar") as HTMLElement | null;
      if (!sidebar) return;
      const raw = window.sessionStorage.getItem(KEY);
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      sidebar.scrollTop = Math.max(0, value);
      requestAnimationFrame(() => {
        sidebar.scrollTop = Math.max(0, value);
      });
    } catch {
      // Best-effort only.
    }
  }, [pathname]);

  useEffect(() => {
    const sidebar = document.querySelector(".app-sidebar") as HTMLElement | null;
    if (!sidebar) return;
    let ticking = false;
    const persist = () => {
      try {
        window.sessionStorage.setItem(KEY, String(Math.max(0, Math.round(sidebar.scrollTop || 0))));
      } catch {
        // Ignore storage failures.
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        persist();
        ticking = false;
      });
    };
    persist();
    sidebar.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    return () => {
      persist();
      sidebar.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
    };
  }, [pathname]);

  return null;
}

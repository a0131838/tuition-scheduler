"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function safeRead(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, String(Math.max(0, Math.round(value))));
  } catch {
    // Ignore storage failures; scroll restore is best-effort only.
  }
}

export default function WorkbenchScrollMemoryClient({
  storageKey,
}: {
  storageKey: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${storageKey}:${pathname}`;
    const restoreY = safeRead(key);
    if (restoreY != null) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            window.scrollTo({ top: restoreY, left: 0, behavior: "auto" });
          } catch {
            window.scrollTo(0, restoreY);
          }
        });
      });
    }

    let ticking = false;
    const persist = () => safeWrite(key, window.scrollY || 0);
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        persist();
        ticking = false;
      });
    };

    persist();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    return () => {
      persist();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
    };
  }, [pathname, query, storageKey]);

  return null;
}

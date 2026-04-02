"use client";

import { useEffect } from "react";

export default function RememberedWorkbenchQueryClient({
  cookieKey,
  storageKey,
  value,
}: {
  cookieKey: string;
  storageKey: string;
  value: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(storageKey, value);
      document.cookie = `${cookieKey}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
      return;
    }
    window.localStorage.removeItem(storageKey);
    document.cookie = `${cookieKey}=; path=/; max-age=0; SameSite=Lax`;
  }, [cookieKey, storageKey, value]);

  return null;
}

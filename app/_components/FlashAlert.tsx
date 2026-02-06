"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function FlashAlert() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (pathname.startsWith("/booking")) return;
    const err = searchParams.get("err");
    const msg = searchParams.get("msg");
    const popup = searchParams.get("popup") === "1";
    const keep = searchParams.get("keep") === "1";
    if (!err && !msg) return;

    const key = `${pathname}?${searchParams.toString()}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (popup && !pathname.startsWith("/admin")) {
      if (err) {
        window.alert(`Error: ${decodeURIComponent(err)}`);
      }
      if (msg) {
        window.alert(decodeURIComponent(msg));
      }
    }

    const isAdmin = pathname.startsWith("/admin");
    if (!keep && !isAdmin) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("err");
      next.delete("msg");
      next.delete("popup");
      next.delete("keep");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [pathname, router, searchParams]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function FlashAlert() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastKeyRef = useRef("");

  useEffect(() => {
    const err = searchParams.get("err");
    const msg = searchParams.get("msg");
    if (!err && !msg) return;

    const key = `${pathname}?${searchParams.toString()}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (err) {
      window.alert(`Error: ${decodeURIComponent(err)}`);
    }
    if (msg) {
      window.alert(decodeURIComponent(msg));
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("err");
    next.delete("msg");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return null;
}


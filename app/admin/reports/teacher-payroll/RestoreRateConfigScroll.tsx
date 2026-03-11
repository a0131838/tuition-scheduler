"use client";

import { useEffect } from "react";

export default function RestoreRateConfigScroll({
  targetId,
}: {
  targetId: string | null;
}) {
  useEffect(() => {
    if (!targetId) return;
    const run = () => {
      const target = document.getElementById(targetId) ?? document.getElementById("rate-config");
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const timer = window.setTimeout(run, 80);
    return () => window.clearTimeout(timer);
  }, [targetId]);

  return null;
}

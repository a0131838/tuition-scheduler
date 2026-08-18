"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function TicketFilterSubmitButton() {
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    setPending(false);
  }, [searchKey]);

  function handleClick() {
    // Keep the native GET submission enabled until the click's default action runs.
    window.setTimeout(() => setPending(true), 0);
  }

  return (
    <button type="submit" disabled={pending} aria-busy={pending} onClick={handleClick}>
      {pending ? "正在筛选…" : "筛选"}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function TicketFilterSubmitButton() {
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setPending(false);
  }, [searchParams]);

  return (
    <button type="submit" disabled={pending} aria-busy={pending} onClick={() => setPending(true)}>
      {pending ? "正在筛选…" : "筛选"}
    </button>
  );
}

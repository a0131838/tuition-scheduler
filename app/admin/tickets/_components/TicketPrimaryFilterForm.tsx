"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useTransition } from "react";

export default function TicketPrimaryFilterForm({
  children,
  showClear,
}: {
  children: ReactNode;
  showClear: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const formData = new FormData(event.currentTarget);

    for (const [key, value] of formData.entries()) {
      const normalized = String(value).trim();
      if (normalized) params.set(key, normalized);
    }

    // This marker distinguishes an intentionally empty filter from a first visit,
    // where the workbench is allowed to restore the employee's saved filters.
    params.set("applyDesk", "1");
    startTransition(() => {
      router.replace(`/admin/tickets?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={pending}
      style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", alignItems: "center" }}
    >
      {children}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="submit" disabled={pending}>
          {pending ? "正在筛选…" : "筛选"}
        </button>
        {showClear ? <Link scroll={false} href="/admin/tickets?clearDesk=1">清空</Link> : null}
      </div>
    </form>
  );
}

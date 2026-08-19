import Link from "next/link";
import type { ReactNode } from "react";

export default function TicketPrimaryFilterForm({
  children,
  showClear,
}: {
  children: ReactNode;
  showClear: boolean;
}) {
  return (
    <form
      action="/admin/tickets"
      method="get"
      style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", alignItems: "center" }}
    >
      {/* Distinguish an intentionally empty filter from the first visit, where saved filters may be restored. */}
      <input type="hidden" name="applyDesk" value="1" />
      {children}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="submit">筛选</button>
        {showClear ? <Link scroll={false} href="/admin/tickets?clearDesk=1">清空</Link> : null}
      </div>
    </form>
  );
}

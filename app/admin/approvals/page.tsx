import Link from "next/link";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getApprovalInboxData, type ApprovalInboxItem } from "@/lib/approval-inbox";

type Focus = "ALL" | "MANAGER" | "FINANCE" | "EXPENSE" | "OVERDUE";

function normalizeFocus(raw: string | undefined): Focus {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "MANAGER" || value === "FINANCE" || value === "EXPENSE" || value === "OVERDUE") return value;
  return "ALL";
}

function money(amount: number, currency: string) {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function filterItems(items: ApprovalInboxItem[], focus: Focus) {
  if (focus === "MANAGER") return items.filter((item) => item.lane === "MANAGER");
  if (focus === "FINANCE") return items.filter((item) => item.lane === "FINANCE");
  if (focus === "EXPENSE") return items.filter((item) => item.lane === "EXPENSE");
  if (focus === "OVERDUE") return items.filter((item) => item.overdue);
  return items;
}

function filterChip(active: boolean) {
  return {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1d4ed8" : "#334155",
    textDecoration: "none",
    fontWeight: 700,
  } as const;
}

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const current = await getCurrentUser();
  const focus = normalizeFocus((await searchParams)?.focus);
  const inbox = await getApprovalInboxData(current?.email, current?.role);
  const visibleItems = filterItems(inbox.items, focus);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid #dbeafe",
          background: "#f8fbff",
          borderRadius: 16,
          padding: "18px 20px",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.3 }}>
          {t(lang, "Unified Approval Desk", "统一审批工作台")}
        </div>
        <h1 style={{ margin: "6px 0 0" }}>{t(lang, "Approval Inbox", "审批提醒中心")}</h1>
        <div style={{ marginTop: 8, color: "#475569", maxWidth: 880, lineHeight: 1.55 }}>
          {t(
            lang,
            "This page only shows approvals that still need action. Start here first, then jump into the detailed workflow for the selected item.",
            "这里只显示还需要审批动作的项目。先从这里开始，再跳进对应详细流程处理。"
          )}
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Needs action", "待处理")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{inbox.summary.total}</div>
          </div>
          <div style={{ border: "1px solid #fcd34d", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Overdue", "超时")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>{inbox.summary.overdue}</div>
          </div>
          <div style={{ border: "1px solid #c7d2fe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Manager approvals", "管理审批")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#3730a3" }}>{inbox.summary.manager}</div>
          </div>
          <div style={{ border: "1px solid #fdba74", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Finance approvals", "财务审批")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#9a3412" }}>{inbox.summary.finance}</div>
          </div>
          <div style={{ border: "1px solid #86efac", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Expense approvals", "报销审批")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}>{inbox.summary.expense}</div>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/approvals" scroll={false} style={filterChip(focus === "ALL")}>
            {t(lang, "All", "全部")}
          </Link>
          {inbox.visibility.manager ? (
            <Link href="/admin/approvals?focus=manager" scroll={false} style={filterChip(focus === "MANAGER")}>
              {t(lang, "Needs manager", "待管理审批")}
            </Link>
          ) : null}
          {inbox.visibility.finance ? (
            <Link href="/admin/approvals?focus=finance" scroll={false} style={filterChip(focus === "FINANCE")}>
              {t(lang, "Needs finance", "待财务审批")}
            </Link>
          ) : null}
          {inbox.visibility.expense ? (
            <Link href="/admin/approvals?focus=expense" scroll={false} style={filterChip(focus === "EXPENSE")}>
              {t(lang, "Expense", "报销")}
            </Link>
          ) : null}
          <Link href="/admin/approvals?focus=overdue" scroll={false} style={filterChip(focus === "OVERDUE")}>
            {t(lang, "Overdue", "超时")}
          </Link>
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 18, color: "#64748b" }}>
          {t(lang, "No approval items match the current filter.", "当前筛选下没有待审批项目。")}
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {visibleItems.map((item) => (
            <article key={item.key} style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 16, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{item.subtitle}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{money(item.amount, item.currency)}</div>
                  <div style={{ fontSize: 12, color: item.overdue ? "#b45309" : "#64748b", marginTop: 4 }}>
                    {item.overdue
                      ? `${t(lang, "Overdue", "超时")} · ${item.waitingHours}h`
                      : `${t(lang, "Waiting", "等待")} · ${item.waitingHours}h`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700 }}>
                  {item.type === "PARENT_RECEIPT"
                    ? t(lang, "Parent receipt", "家长收据")
                    : item.type === "PARTNER_RECEIPT"
                    ? t(lang, "Partner receipt", "合作方收据")
                    : t(lang, "Expense claim", "报销单")}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}>
                  {item.lane === "MANAGER"
                    ? t(lang, "Manager approval", "管理审批")
                    : item.lane === "FINANCE"
                    ? t(lang, "Finance approval", "财务审批")
                    : t(lang, "Expense approval", "报销审批")}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", color: "#475569", fontWeight: 600 }}>
                  {item.statusText}
                </span>
              </div>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {t(lang, "Submitted", "提交时间")}: {formatBusinessDateTime(new Date(item.createdAt))}
                {item.riskText ? ` · ${t(lang, "Risk", "风险")}: ${item.riskText}` : ""}
              </div>
              <div>
                <Link href={item.href} style={{ color: "#1d4ed8", fontWeight: 700 }}>
                  {t(lang, "Open now", "立即处理")}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

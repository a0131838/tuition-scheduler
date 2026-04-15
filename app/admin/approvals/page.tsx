import Link from "next/link";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getLang, t, type Lang } from "@/lib/i18n";
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

function getFocusCount(items: ApprovalInboxItem[], focus: Focus) {
  return filterItems(items, focus).length;
}

function laneLabel(lang: Lang, lane: ApprovalInboxItem["lane"]) {
  if (lane === "MANAGER") return t(lang, "Manager approval", "管理审批");
  if (lane === "FINANCE") return t(lang, "Finance approval", "财务审批");
  return t(lang, "Expense approval", "报销审批");
}

function typeLabel(lang: Lang, type: ApprovalInboxItem["type"]) {
  if (type === "PARENT_RECEIPT") return t(lang, "Parent receipt", "家长收据");
  if (type === "PARTNER_RECEIPT") return t(lang, "Partner receipt", "合作方收据");
  if (type === "TEACHER_PAYROLL") return t(lang, "Teacher payroll", "老师工资");
  return t(lang, "Expense claim", "报销单");
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

function withApprovalSource(href: string, focus: Focus) {
  const url = new URL(href, "https://sgtmanage.com");
  url.searchParams.set("source", "approvals");
  if (focus === "ALL") url.searchParams.delete("sourceFocus");
  else url.searchParams.set("sourceFocus", focus.toLowerCase());
  return `${url.pathname}${url.search}`;
}

function compactSubtitle(value: string) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 88 ? `${normalized.slice(0, 85)}...` : normalized;
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
  const allCount = getFocusCount(inbox.items, "ALL");
  const managerCount = getFocusCount(inbox.items, "MANAGER");
  const financeCount = getFocusCount(inbox.items, "FINANCE");
  const expenseCount = getFocusCount(inbox.items, "EXPENSE");
  const overdueCount = getFocusCount(inbox.items, "OVERDUE");
  const currentScopeLabel =
    focus === "MANAGER"
      ? t(lang, "Manager approvals only", "仅管理审批")
      : focus === "FINANCE"
        ? t(lang, "Finance approvals only", "仅财务审批")
        : focus === "EXPENSE"
          ? t(lang, "Expense approvals only", "仅报销审批")
          : focus === "OVERDUE"
            ? t(lang, "Overdue items only", "仅超时项目")
            : t(lang, "All open approvals", "全部待处理审批");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style>{`
        @media (max-width: 720px) {
          .approval-inbox-grid-header {
            display: none !important;
          }
          .approval-inbox-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .approval-inbox-action {
            text-align: left !important;
          }
          .approval-inbox-action a {
            display: inline-flex;
            min-height: 40px;
            align-items: center;
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            padding: 8px 12px;
            background: #eff6ff;
          }
        }
      `}</style>
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
        <div style={{ marginTop: 8, color: "#475569", maxWidth: 880, lineHeight: 1.5 }}>
          {t(
            lang,
            "Use this as the triage desk: pick the next item here, then jump into the matching workflow only after you know why it matters.",
            "把这里当成审批分诊台：先在这里决定下一条最该处理的项目，再跳进对应工作流。"
          )}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid #bfdbfe", fontSize: 12, color: "#1d4ed8", fontWeight: 700 }}>
            {t(lang, "Current scope", "当前范围")}: {currentScopeLabel}
          </span>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid #e2e8f0", fontSize: 12, color: "#334155" }}>
            {t(lang, "Visible items", "当前项目")}: <b>{visibleItems.length}</b>
          </span>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
            {t(lang, "Overdue", "超时")}: <b>{overdueCount}</b>
          </span>
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Needs action", "待处理")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{allCount}</div>
          </div>
          <div style={{ border: "1px solid #fcd34d", borderRadius: 12, background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Overdue", "超时")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>{overdueCount}</div>
          </div>
          <div style={{ border: "1px solid #c7d2fe", borderRadius: 12, background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Manager approvals", "管理审批")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#3730a3" }}>{managerCount}</div>
          </div>
          <div style={{ border: "1px solid #fdba74", borderRadius: 12, background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Finance approvals", "财务审批")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#9a3412" }}>{financeCount}</div>
          </div>
          <div style={{ border: "1px solid #86efac", borderRadius: 12, background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Expense approvals", "报销审批")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}>{expenseCount}</div>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/approvals" scroll={false} style={filterChip(focus === "ALL")}>
            {t(lang, "All", "全部")} ({allCount})
          </Link>
          {inbox.visibility.manager ? (
            <Link href="/admin/approvals?focus=manager" scroll={false} style={filterChip(focus === "MANAGER")}>
              {t(lang, "Needs manager", "待管理审批")} ({managerCount})
            </Link>
          ) : null}
          {inbox.visibility.finance ? (
            <Link href="/admin/approvals?focus=finance" scroll={false} style={filterChip(focus === "FINANCE")}>
              {t(lang, "Needs finance", "待财务审批")} ({financeCount})
            </Link>
          ) : null}
          {inbox.visibility.expense ? (
            <Link href="/admin/approvals?focus=expense" scroll={false} style={filterChip(focus === "EXPENSE")}>
              {t(lang, "Expense", "报销")} ({expenseCount})
            </Link>
          ) : null}
          <Link href="/admin/approvals?focus=overdue" scroll={false} style={filterChip(focus === "OVERDUE")}>
            {t(lang, "Overdue", "超时")} ({overdueCount})
          </Link>
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 18, color: "#64748b", display: "grid", gap: 10 }}>
          <div>{t(lang, "No approval items match the current filter.", "当前筛选下没有待审批项目。")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin/approvals" scroll={false} style={{ color: "#1d4ed8", fontWeight: 700 }}>
              {t(lang, "Show all approvals", "查看全部审批")}
            </Link>
            <Link href="/admin" style={{ color: "#475569", fontWeight: 700 }}>
              {t(lang, "Back to dashboard", "返回总览")}
            </Link>
          </div>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          <div
            className="approval-inbox-grid-header"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 2.2fr) minmax(130px, 1fr) minmax(120px, 0.9fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr) auto",
              gap: 12,
              padding: "0 12px",
              fontSize: 12,
              color: "#64748b",
              fontWeight: 700,
              alignItems: "center",
            }}
          >
            <div>{t(lang, "Item", "项目")}</div>
            <div>{t(lang, "Lane", "审批道")}</div>
            <div>{t(lang, "Waiting", "等待")}</div>
            <div>{t(lang, "Risk", "风险")}</div>
            <div>{t(lang, "Amount", "金额")}</div>
            <div>{t(lang, "Action", "操作")}</div>
          </div>
          {visibleItems.map((item) => (
            <article
              key={item.key}
              className="approval-inbox-row"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#fff",
                padding: 12,
                display: "grid",
                gridTemplateColumns: "minmax(260px, 2.2fr) minmax(130px, 1fr) minmax(120px, 0.9fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr) auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.title}</div>
                  {item.subtitle ? (
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{compactSubtitle(item.subtitle)}</div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#475569" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700 }}>
                    {typeLabel(lang, item.type)}
                  </span>
                  <span>{t(lang, "Submitted", "提交")}: {formatBusinessDateTime(new Date(item.createdAt))}</span>
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 12, width: "fit-content" }}>
                  {laneLabel(lang, item.lane)}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 12, width: "fit-content" }}>
                  {item.statusText}
                </span>
              </div>
              <div style={{ fontSize: 13, color: item.overdue ? "#b45309" : "#475569", fontWeight: item.overdue ? 700 : 600 }}>
                {item.overdue
                  ? `${t(lang, "Overdue", "超时")} · ${item.waitingHours}h`
                  : `${t(lang, "Waiting", "等待")} · ${item.waitingHours}h`}
              </div>
              <div style={{ fontSize: 13, color: item.riskText ? "#9f1239" : "#64748b" }}>
                {item.riskText ? item.riskText : t(lang, "No risk", "无风险")}
              </div>
              <div style={{ fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                {item.amountText ?? money(item.amount, item.currency)}
              </div>
              <div className="approval-inbox-action" style={{ textAlign: "right" }}>
                <Link href={withApprovalSource(item.href, focus)} style={{ color: "#1d4ed8", fontWeight: 700 }}>
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

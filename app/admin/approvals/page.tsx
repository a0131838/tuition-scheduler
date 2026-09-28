import Link from "next/link";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getLang, t, type Lang } from "@/lib/i18n";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getApprovalInboxData, type ApprovalInboxItem } from "@/lib/approval-inbox";
import ApprovalCoverage from "./ApprovalCoverage";
import { cookies } from "next/headers";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import WorkbenchActionBanner from "../_components/WorkbenchActionBanner";
import WorkbenchScrollMemoryClient from "../_components/WorkbenchScrollMemoryClient";
import WorkbenchStatusChip from "../_components/WorkbenchStatusChip";
import { workbenchStickyPanelStyle, workbenchTableHeaderCellStyle, workbenchTableCellSecondaryStyle } from "../_components/workbenchStyles";

type Focus = "ALL" | "MANAGER" | "FINANCE" | "EXPENSE" | "OVERDUE";
const APPROVAL_FOCUS_COOKIE = "adminApprovalInboxFocus";

function normalizeFocus(raw: string | undefined): Focus {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "MANAGER" || value === "FINANCE" || value === "EXPENSE" || value === "OVERDUE") return value;
  return "ALL";
}

function parseRememberedApprovalFocus(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const focus = normalizeFocus(String(params.get("focus") ?? "").trim());
  const normalized = new URLSearchParams();
  if (focus !== "ALL") normalized.set("focus", focus.toLowerCase());
  return {
    focus,
    value: normalized.toString(),
  };
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
  if (type === "PACKAGE_INVOICE") return t(lang, "Package invoice", "课包发票");
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

function approvalSummaryCardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 6,
    alignContent: "start",
  } as const;
}

function approvalSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
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
  const sp = await searchParams;
  const hasFocusParam = typeof sp?.focus === "string";
  const cookieStore = await cookies();
  const rememberedFocus = hasFocusParam
    ? { focus: "ALL" as Focus, value: "" }
    : parseRememberedApprovalFocus(cookieStore.get(APPROVAL_FOCUS_COOKIE)?.value ?? "");
  const focus = hasFocusParam ? normalizeFocus(sp?.focus) : rememberedFocus.focus;
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
            : t(lang, "All visible items in this inbox", "本中心全部可见待处理项");
  const approvalFocusTitle =
    overdueCount > 0 && focus === "ALL"
      ? t(lang, "Start with overdue items", "先处理超时项")
      : focus === "MANAGER"
      ? t(lang, "Manager queue in progress", "当前正在处理管理审批")
      : focus === "FINANCE"
      ? t(lang, "Finance queue in progress", "当前正在处理财务审批")
      : focus === "EXPENSE"
      ? t(lang, "Expense queue in progress", "当前正在处理报销审批")
      : focus === "OVERDUE"
      ? t(lang, "Overdue queue in progress", "当前正在处理超时队列")
      : managerCount > 0
      ? t(lang, "Manager queue is the next likely stop", "下一步大概率先看管理审批")
      : financeCount > 0
      ? t(lang, "Finance queue is the next likely stop", "下一步大概率先看财务审批")
      : expenseCount > 0
      ? t(lang, "Expense queue is the next likely stop", "下一步大概率先看报销审批")
      : t(lang, "No visible pending items in this inbox", "本中心暂无可见待处理项");
  const approvalFocusDetail =
    overdueCount > 0 && focus === "ALL"
      ? t(lang, "There are overdue items mixed into the full inbox, so clear those first before working normal waiting items.", "全部队列里已经混入超时项，建议先把超时的清掉，再处理普通等待项。")
      : focus === "OVERDUE"
      ? t(lang, "This view is for the most time-sensitive approvals. Once it is clear, go back to the lane queues.", "这个视图只看最着急的审批；清掉后再回到各条审批道。")
      : focus === "ALL"
      ? t(lang, "Use All only as the overview. Pick a lane after you know what is actually blocking progress.", "全部视图更适合总览；看清阻塞点后，最好切回具体审批道处理。")
      : t(lang, "Stay in one lane until it is reasonably clear, then come back here for the next lane.", "建议一次专注清一条审批道，差不多清掉之后再回来切下一条。");
  const approvalSummaryCards = [
    {
      title: t(lang, "Current focus", "当前建议起点"),
      value: approvalFocusTitle,
      detail: approvalFocusDetail,
      background: overdueCount > 0 ? "#fff7ed" : "#eff6ff",
      border: overdueCount > 0 ? "#fdba74" : "#bfdbfe",
    },
    {
      title: t(lang, "Current scope", "当前范围"),
      value: currentScopeLabel,
      detail: t(lang, `${visibleItems.length} visible item(s) in this view.`, `当前视图里有 ${visibleItems.length} 条可见项目。`),
      background: "#f8fafc",
      border: "#dbe4f0",
    },
    {
      title: t(lang, "Queue balance", "队列分布"),
      value: t(lang, `${managerCount} manager · ${financeCount} finance · ${expenseCount} expense`, `${managerCount} 管理 · ${financeCount} 财务 · ${expenseCount} 报销`),
      detail: t(lang, `${overdueCount} item(s) are already overdue.`, `已有 ${overdueCount} 条进入超时。`),
      background: "#fffaf0",
      border: "#fde68a",
    },
  ];
  const approvalSectionLinks = [
    {
      href: "/admin/approvals?focus=overdue",
      label: t(lang, "Overdue queue", "超时队列"),
      detail: t(lang, `${overdueCount} overdue`, `${overdueCount} 条超时`),
      background: overdueCount > 0 ? "#fff7ed" : "#ffffff",
      border: overdueCount > 0 ? "#fdba74" : "#dbe4f0",
    },
    {
      href: "#approval-focus-filters",
      label: t(lang, "Queue filters", "队列筛选"),
      detail: t(lang, "Switch lanes and narrow the inbox before diving into rows", "先切审批道，再下钻到具体条目"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#approval-items",
      label: t(lang, "Approval rows", "审批条目"),
      detail: t(lang, `${visibleItems.length} visible rows`, `${visibleItems.length} 条当前可见`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "/admin",
      label: t(lang, "Dashboard", "返回总览"),
      detail: t(lang, "Back out after you clear the blocking lane", "清掉阻塞审批道后回到总览"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
  ];
  const rememberedFocusValue = (() => {
    const params = new URLSearchParams();
    if (focus !== "ALL") params.set("focus", focus.toLowerCase());
    return params.toString();
  })();
  const resumedRememberedFocus = !hasFocusParam && Boolean(rememberedFocus.value);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <RememberedWorkbenchQueryClient
        cookieKey={APPROVAL_FOCUS_COOKIE}
        storageKey="adminApprovalInboxFocus"
        value={rememberedFocusValue}
      />
      <WorkbenchScrollMemoryClient storageKey="adminApprovalInboxScroll" />
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
          {t(lang, "Approval work queues", "审批工作队列")}
        </div>
        <h1 style={{ margin: "6px 0 0" }}>{t(lang, "Approval Inbox", "审批提醒中心")}</h1>
        <div style={{ marginTop: 8, color: "#475569", maxWidth: 880, lineHeight: 1.5 }}>
          {t(
            lang,
            "Review pending items from the workflows listed below, then open their source page to act. Counts reflect this account’s visible queues; an empty inbox does not mean all business approvals are complete.",
            "这里汇总下方已接入流程的待处理项，办理时进入原业务页面。数量只代表当前账号可见的队列；本中心为空不代表所有业务审批均已完成。"
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

      <ApprovalCoverage lang={lang} visibility={inbox.visibility} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {approvalSummaryCards.map((card) => (
          <div key={card.title} style={approvalSummaryCardStyle(card.background, card.border)}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.2 }}>{card.title}</div>
            <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{card.detail}</div>
          </div>
        ))}
      </div>

      {resumedRememberedFocus ? (
        <WorkbenchActionBanner
          tone="info"
          title={t(lang, "Resumed your last approval lane.", "已恢复你上次查看的审批道。")}
          description={t(lang, "Use the action on the right to return to the full inbox.", "如果要回到全部收件箱，可直接用右侧入口。")}
          actions={[{ href: "/admin/approvals?focus=all", nativeNavigation: true, label: t(lang, "Back to full inbox", "回到全部审批") }]}
        />
      ) : null}

      <section id="approval-focus-filters" style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 14, scrollMarginTop: 104, ...workbenchStickyPanelStyle(4) }}>
        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", letterSpacing: 0.2 }}>
            {t(lang, "Jump by section", "按区块跳转")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {approvalSectionLinks.map((link) => (
              <a key={link.href + link.label} href={link.href} style={approvalSectionLinkStyle(link.background, link.border)}>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{link.label}</span>
                <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{link.detail}</span>
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/approvals?focus=all" style={filterChip(focus === "ALL")}>
            {t(lang, "All", "全部")} ({allCount})
          </a>
          {inbox.visibility.manager ? (
            <a href="/admin/approvals?focus=manager" style={filterChip(focus === "MANAGER")}>
              {t(lang, "Needs manager", "待管理审批")} ({managerCount})
            </a>
          ) : null}
          {inbox.visibility.finance ? (
            <a href="/admin/approvals?focus=finance" style={filterChip(focus === "FINANCE")}>
              {t(lang, "Needs finance", "待财务审批")} ({financeCount})
            </a>
          ) : null}
          {inbox.visibility.expense ? (
            <a href="/admin/approvals?focus=expense" style={filterChip(focus === "EXPENSE")}>
              {t(lang, "Expense", "报销")} ({expenseCount})
            </a>
          ) : null}
          <a href="/admin/approvals?focus=overdue" style={filterChip(focus === "OVERDUE")}>
            {t(lang, "Overdue", "超时")} ({overdueCount})
          </a>
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <section id="approval-empty-state">
          <WorkbenchActionBanner
            tone="info"
            title={t(lang, "No approval items match the current filter.", "当前筛选下没有待审批项目。")}
            description={t(lang, "Check the filter and coverage above. Drafts, rejected receipts and workflows outside this inbox must be reviewed on their source pages. Visibility here does not grant approval permission.", "请核对筛选条件和上方覆盖范围。草稿、已驳回收据及未接入本中心的流程，仍需在原业务页面查看；队列可见不等于具备审批权限。")}
            actions={[
              { href: "/admin/approvals?focus=all", nativeNavigation: true, label: t(lang, "Show this inbox", "查看本中心全部项目"), emphasis: "primary" },
              { href: "/admin", label: t(lang, "Back to dashboard", "返回总览") },
            ]}
          />
        </section>
      ) : (
        <section id="approval-items" style={{ display: "grid", gap: 12, scrollMarginTop: 104 }}>
          <div
            className="approval-inbox-grid-header"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 2fr) minmax(104px, 0.9fr) minmax(92px, 0.75fr) minmax(92px, 0.75fr) minmax(100px, 0.8fr) auto",
              gap: 12,
              padding: "0 8px",
              alignItems: "center",
            }}
          >
            <div style={workbenchTableHeaderCellStyle}>{t(lang, "Item", "项目")}</div>
            <div style={workbenchTableHeaderCellStyle}>{t(lang, "Lane", "审批道")}</div>
            <div style={workbenchTableHeaderCellStyle}>{t(lang, "Waiting", "等待")}</div>
            <div style={workbenchTableHeaderCellStyle}>{t(lang, "Risk", "风险")}</div>
            <div style={workbenchTableHeaderCellStyle}>{t(lang, "Amount", "金额")}</div>
            <div style={workbenchTableHeaderCellStyle}>{t(lang, "Action", "操作")}</div>
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
                gridTemplateColumns: "minmax(220px, 2fr) minmax(104px, 0.9fr) minmax(92px, 0.75fr) minmax(92px, 0.75fr) minmax(100px, 0.8fr) auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.title}</div>
                  {item.subtitle ? (
                    <div style={{ ...workbenchTableCellSecondaryStyle, fontSize: 13 }}>{compactSubtitle(item.subtitle)}</div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <WorkbenchStatusChip label={typeLabel(lang, item.type)} tone="neutral" />
                  <span>{t(lang, "Submitted", "提交")}: {formatBusinessDateTime(new Date(item.createdAt))}</span>
                </div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <WorkbenchStatusChip label={laneLabel(lang, item.lane)} tone={item.lane === "MANAGER" ? "accent" : item.lane === "FINANCE" ? "warn" : "success"} strong />
                <WorkbenchStatusChip label={item.statusText} tone="neutral" />
              </div>
              <div>
                <WorkbenchStatusChip
                  label={item.overdue ? t(lang, "Overdue", "超时") : t(lang, "Waiting", "等待")}
                  detail={`${item.waitingHours}h`}
                  tone={item.overdue ? "warn" : "neutral"}
                />
              </div>
              <div style={{ fontSize: 13, color: item.riskText ? "#9f1239" : "#64748b" }}>
                {item.riskText ? (
                  <WorkbenchStatusChip label={item.riskText} tone="error" />
                ) : (
                  <WorkbenchStatusChip label={t(lang, "No listed warning", "无已列警示")} tone="success" />
                )}
              </div>
              <div style={{ fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                {item.amountText ?? money(item.amount, item.currency)}
              </div>
              <div className="approval-inbox-action" style={{ textAlign: "right" }}>
                <Link href={withApprovalSource(item.href, focus)} scroll={false} style={{ color: "#1d4ed8", fontWeight: 700 }}>
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

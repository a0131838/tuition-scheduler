import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { listDeletedParentInvoices } from "@/lib/student-parent-billing";
import { listDeletedPartnerInvoices } from "@/lib/partner-billing";
import { normalizeDateOnly } from "@/lib/date-only";
import { workbenchFilterPanelStyle, workbenchHeroStyle } from "@/app/admin/_components/workbenchStyles";

type HistoryRow = {
  id: string;
  channel: "PARENT" | "PARTNER";
  invoiceNo: string;
  issueDate: string;
  deletedAt: string;
  deletedBy: string;
  partyLabel: string;
  contextLabel: string;
  openHref: string;
};

function includesQuery(parts: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  return parts.some((part) => String(part ?? "").toLowerCase().includes(normalized));
}

export default async function FinanceDeletedInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    channel?: string;
    q?: string;
    packageId?: string;
    month?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const channelFilter = String(sp?.channel ?? "").trim().toUpperCase();
  const q = String(sp?.q ?? "").trim();
  const packageIdFilter = String(sp?.packageId ?? "").trim();
  const monthFilter = String(sp?.month ?? "").trim();

  const [parentDeleted, partnerDeleted] = await Promise.all([
    listDeletedParentInvoices(packageIdFilter || null),
    listDeletedPartnerInvoices(monthFilter || null),
  ]);

  const packageIds = Array.from(new Set(parentDeleted.map((x) => x.packageId).filter(Boolean)));
  const packages = packageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIds } },
        include: { student: true, course: true },
      })
    : [];
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg] as const));

  const rows: HistoryRow[] = [
    ...parentDeleted.map((row) => {
      const pkg = packageMap.get(row.packageId);
      return {
        id: row.id,
        channel: "PARENT" as const,
        invoiceNo: row.invoiceNo,
        issueDate: row.issueDate,
        deletedAt: row.deletedAt,
        deletedBy: row.deletedBy,
        partyLabel: row.billTo || pkg?.student.name || "-",
        contextLabel: pkg ? `${pkg.student.name} · ${pkg.course.name}` : row.packageId,
        openHref: `/admin/packages/${encodeURIComponent(row.packageId)}/billing`,
      };
    }),
    ...partnerDeleted.map((row) => ({
      id: row.id,
      channel: "PARTNER" as const,
      invoiceNo: row.invoiceNo,
      issueDate: row.issueDate,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      partyLabel: row.billTo || row.partnerName,
      contextLabel: `${row.partnerName} · ${row.mode}${row.monthKey ? ` · ${row.monthKey}` : ""}`,
      openHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(row.mode)}${row.monthKey ? `&month=${encodeURIComponent(row.monthKey)}` : ""}&tab=invoices`,
    })),
  ]
    .filter((row) => {
      if (channelFilter && row.channel !== channelFilter) return false;
      return includesQuery(
        [row.invoiceNo, row.partyLabel, row.contextLabel, row.deletedBy, row.issueDate, row.deletedAt],
        q,
      );
    })
    .sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#b45309", letterSpacing: 0.4 }}>
            {t(lang, "Deleted Draft History", "已删除草稿历史")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Deleted Invoice Draft History", "已删除发票草稿历史")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Use this page to trace which draft invoice number was deleted, by whom, and from which package or partner billing lane.",
              "这个页面用来追踪哪张发票草稿被删除、由谁删除，以及它来自哪个课包或合作方账单工作台。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/finance/workbench">{t(lang, "Back to finance workbench", "返回财务工作台")}</a>
          <a href="/admin/finance/documents">{t(lang, "Open full invoices & receipts", "打开完整发票与收据")}</a>
        </div>
      </section>

      <form style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "History filters", "历史筛选")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(lang, "Search by invoice number, package, partner, or deleted-by user.", "按发票号、课包、合作方或删除人来查历史。")}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Channel", "渠道")}</span>
            <select name="channel" defaultValue={channelFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <option value="">{t(lang, "All", "全部")}</option>
              <option value="PARENT">{t(lang, "Parent", "直客")}</option>
              <option value="PARTNER">{t(lang, "Partner", "合作方")}</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Package ID (optional)", "课包 ID（可选）")}</span>
            <input name="packageId" defaultValue={packageIdFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Partner month (optional)", "合作方月份（可选）")}</span>
            <input name="month" defaultValue={monthFilter} placeholder="YYYY-MM" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Keyword", "关键词")}</span>
            <input name="q" defaultValue={q} placeholder={t(lang, "Invoice no., user, context...", "发票号、删除人、上下文...")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit">{t(lang, "Apply filters", "应用筛选")}</button>
          <a href="/admin/finance/deleted-invoices">{t(lang, "Reset", "重置")}</a>
        </div>
      </form>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 800 }}>{t(lang, "Deleted draft list", "已删除草稿列表")}</div>
        {rows.length === 0 ? (
          <div style={{ padding: "0 14px 14px", color: "#475569" }}>{t(lang, "No deleted draft invoices matched this filter.", "当前筛选下没有已删除的发票草稿。")}</div>
        ) : (
          <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                <th align="left">{t(lang, "Channel", "渠道")}</th>
                <th align="left">{t(lang, "Invoice no.", "发票号")}</th>
                <th align="left">{t(lang, "Issue date", "开票日期")}</th>
                <th align="left">{t(lang, "Deleted at", "删除时间")}</th>
                <th align="left">{t(lang, "Deleted by", "删除人")}</th>
                <th align="left">{t(lang, "Party", "对象")}</th>
                <th align="left">{t(lang, "Context", "上下文")}</th>
                <th align="left">{t(lang, "Source", "来源")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.channel}-${row.id}`} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td>{row.channel === "PARENT" ? t(lang, "Parent", "直客") : t(lang, "Partner", "合作方")}</td>
                  <td style={{ fontWeight: 700 }}>{row.invoiceNo}</td>
                  <td>{normalizeDateOnly(row.issueDate) ?? "-"}</td>
                  <td>{new Date(row.deletedAt).toLocaleString(lang === "ZH" ? "zh-CN" : "en-SG")}</td>
                  <td>{row.deletedBy || "-"}</td>
                  <td>{row.partyLabel}</td>
                  <td>{row.contextLabel}</td>
                  <td><a href={row.openHref}>{t(lang, "Open source page", "打开来源页面")}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { LEAD_INTENT_LEVELS, LEAD_SOURCE_TYPES, LEAD_STATUSES, LEAD_STATUS_LABELS, summarizeLeadRows } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function first(v?: string | string[]) {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string) {
  const item = LEAD_STATUS_LABELS[status];
  if (!item) return status;
  return t(lang, item.en, item.zh);
}

function pillStyle(tone: "green" | "amber" | "red" | "blue" | "slate") {
  const map = {
    green: ["#dcfce7", "#166534", "#86efac"],
    amber: ["#fef3c7", "#92400e", "#fcd34d"],
    red: ["#fee2e2", "#991b1b", "#fecaca"],
    blue: ["#dbeafe", "#1d4ed8", "#93c5fd"],
    slate: ["#f1f5f9", "#334155", "#cbd5e1"],
  }[tone];
  return { display: "inline-flex", borderRadius: 999, padding: "4px 8px", background: map[0], color: map[1], border: `1px solid ${map[2]}`, fontSize: 12, fontWeight: 800 } as const;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; sourceType?: string; owner?: string; intent?: string; focus?: string; archived?: string; ok?: string }>;
}) {
  const user = await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const q = first(sp?.q).trim();
  const status = first(sp?.status).trim();
  const sourceType = first(sp?.sourceType).trim();
  const owner = first(sp?.owner).trim();
  const intent = first(sp?.intent).trim();
  const focus = first(sp?.focus).trim();
  const archived = first(sp?.archived).trim() === "1";
  const ok = first(sp?.ok).trim();
  const effectiveOwner = focus === "mine" ? user.name : owner;
  const now = new Date();
  const overdueWhere =
    focus === "overdue"
      ? {
          nextActionDue: { lt: now },
          status: { notIn: ["Won", "Lost"] },
        }
      : {};

  const [rows, owners, allForSummary, pendingAssessmentCount] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { leadNo: { contains: q, mode: "insensitive" } },
                { studentName: { contains: q, mode: "insensitive" } },
                { parentName: { contains: q, mode: "insensitive" } },
                { parentWechat: { contains: q, mode: "insensitive" } },
                { parentPhone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(sourceType ? { sourceType } : {}),
        ...(effectiveOwner ? { ownerName: effectiveOwner } : {}),
        ...(intent ? { intentLevel: intent } : {}),
        isArchived: archived,
        ...overdueWhere,
      },
      include: { assessmentRequests: { select: { status: true, dueAt: true } } },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    }),
    prisma.leadResourceOwner.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({ where: { isArchived: false }, select: { status: true, intentLevel: true, nextActionDue: true } }),
    prisma.leadAssessmentRequest.count({ where: { status: { in: ["Pending", "Revision Requested"] } } }),
  ]);
  const summary = summarizeLeadRows(allForSummary, now);
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (sourceType) params.set("sourceType", sourceType);
  if (owner) params.set("owner", owner);
  if (intent) params.set("intent", intent);
  if (focus) params.set("focus", focus);
  if (archived) params.set("archived", "1");
  const exportHref = `/admin/leads/export${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#1d4ed8", fontWeight: 900, fontSize: 12 }}>{t(lang, "Sales resource pipeline", "销售资源管道")}</div>
            <h2 style={{ margin: "4px 0" }}>{t(lang, "Resource Follow-up", "资源跟进")}</h2>
            <div style={{ color: "#475569" }}>{t(lang, "Track new inquiries from source to assessment, proposal, and student conversion.", "从来源、跟进、老师评估、方案到转学生，统一追踪咨询资源。")}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/admin/leads/new" style={{ border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#fff", borderRadius: 8, padding: "9px 12px", textDecoration: "none", fontWeight: 900 }}>
              {t(lang, "New Resource", "新增资源")}
            </Link>
            <Link href="/admin/leads/dashboard" style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "9px 12px", textDecoration: "none", fontWeight: 900 }}>
              {t(lang, "Dashboard", "资源看板")}
            </Link>
            <Link href="/admin/leads/owners" style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "9px 12px", textDecoration: "none", fontWeight: 900 }}>
              {t(lang, "Owners", "负责人名单")}
            </Link>
            <a href={exportHref} style={{ border: "1px solid #16a34a", background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "9px 12px", textDecoration: "none", fontWeight: 900 }}>
              {t(lang, "Export CSV", "导出 CSV")}
            </a>
          </div>
        </div>
      </section>
      {ok === "deleted-test" ? <div style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: 10 }}>{t(lang, "Test resource deleted.", "测试资源已删除。")}</div> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {[
          [t(lang, "Total", "总资源"), summary.total],
          [t(lang, "Open", "未结束"), summary.open],
          [t(lang, "Hot", "高意向"), summary.hot],
          [t(lang, "Overdue", "逾期未跟进"), summary.overdue],
          [t(lang, "Pending assessment", "待老师评估"), pendingAssessmentCount],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: 12 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: 12 }}>
        <form style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input name="q" defaultValue={q} placeholder={t(lang, "Search name, WeChat, phone", "搜索姓名、微信、电话")} style={{ minHeight: 38, minWidth: 220 }} />
          <select name="status" defaultValue={status} style={{ minHeight: 38 }}>
            <option value="">{t(lang, "All statuses", "全部状态")}</option>
            {LEAD_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(lang, item)}</option>)}
          </select>
          <select name="sourceType" defaultValue={sourceType} style={{ minHeight: 38 }}>
            <option value="">{t(lang, "All sources", "全部来源")}</option>
            {LEAD_SOURCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="owner" defaultValue={owner} style={{ minHeight: 38 }}>
            <option value="">{t(lang, "All owners", "全部负责人")}</option>
            {owners.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
          <select name="intent" defaultValue={intent} style={{ minHeight: 38 }}>
            <option value="">{t(lang, "All intent", "全部意向")}</option>
            {LEAD_INTENT_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="focus" defaultValue={focus} style={{ minHeight: 38 }}>
            <option value="">{t(lang, "Normal view", "普通视图")}</option>
            <option value="mine">{t(lang, "My resources", "我的资源")}</option>
            <option value="overdue">{t(lang, "Only overdue", "只看逾期")}</option>
          </select>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, fontWeight: 800 }}>
            <input type="checkbox" name="archived" value="1" defaultChecked={archived} />
            {t(lang, "Archived", "已归档")}
          </label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
          <Link href="/admin/leads">{t(lang, "Clear", "清除")}</Link>
        </form>
      </section>

      <section style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Lead", "Student / Parent", "Source", "Status", "Intent", "Owner", "Next Action", "Updated", "Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, color: "#64748b" }}>{t(lang, "No resources match this filter.", "当前筛选下没有资源。")}</td></tr>
              ) : rows.map((row) => {
                const overdue = row.nextActionDue && row.nextActionDue.getTime() < now.getTime() && row.status !== "Won" && row.status !== "Lost";
                const waitingAssessment = row.assessmentRequests.some((item) => item.status === "Pending" || item.status === "Revision Requested");
                return (
                  <tr key={row.id}>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}><b>{row.leadNo}</b></td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ fontWeight: 900 }}>{row.studentName}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{row.parentName || "-"} · {row.parentWechat || row.parentPhone || "-"}</div>
                    </td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>{row.sourceType}{row.sourcePlatform ? ` / ${row.sourcePlatform}` : ""}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>
                      <span style={pillStyle(row.status === "Won" ? "green" : row.status === "Lost" ? "red" : waitingAssessment ? "amber" : "blue")}>{statusLabel(lang, row.status)}</span>
                    </td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}><span style={pillStyle(row.intentLevel === "Hot" ? "red" : row.intentLevel === "Warm" ? "amber" : "slate")}>{row.intentLevel}</span></td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>{row.ownerName || "-"}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9", color: overdue ? "#991b1b" : "#334155" }}>
                      <div style={{ fontWeight: overdue ? 900 : 600 }}>{row.nextAction || "-"}</div>
                      <div style={{ fontSize: 12 }}>{row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "-"}</div>
                    </td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9", fontSize: 12 }}>{formatBusinessDateTime(row.updatedAt)}</td>
                    <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}><Link href={`/admin/leads/${row.id}`}>{t(lang, "Open", "打开")}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

import { requireResourceUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, summarizeLeadRows } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function pct(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string) {
  const item = LEAD_STATUS_LABELS[status];
  if (!item) return status;
  return t(lang, item.en, item.zh);
}

export default async function LeadDashboardPage() {
  await requireResourceUser();
  const lang = await getLang();
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [leads, assessments] = await Promise.all([
    prisma.lead.findMany({
      where: { createdAt: { gte: since7 } },
      select: { status: true, intentLevel: true, nextActionDue: true, sourceType: true, ownerName: true, lostReason: true },
    }),
    prisma.leadAssessmentRequest.findMany({
      where: { createdAt: { gte: since7 } },
      select: { status: true, dueAt: true, teacherName: true },
    }),
  ]);
  const summary = summarizeLeadRows(leads, now);
  const byStatus = LEAD_STATUSES.map((status) => ({ status, count: leads.filter((lead) => lead.status === status).length }));
  const bySource = Array.from(
    leads.reduce((map, lead) => map.set(lead.sourceType, (map.get(lead.sourceType) ?? 0) + 1), new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);
  const byOwner = Array.from(
    leads.reduce((map, lead) => map.set(lead.ownerName || "Unassigned", (map.get(lead.ownerName || "Unassigned") ?? 0) + 1), new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);
  const assessmentPending = assessments.filter((item) => item.status === "Pending" || item.status === "Revision Requested");
  const assessmentSubmitted = assessments.filter((item) => item.status === "Submitted");
  const assessmentOverdue = assessmentPending.filter((item) => item.dueAt && item.dueAt.getTime() < now.getTime());

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <p><Link href="/admin/leads">{t(lang, "Back to resources", "返回资源列表")}</Link></p>
      <section style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: "0 0 6px" }}>{t(lang, "Resource Dashboard", "资源看板")}</h2>
        <div style={{ color: "#475569" }}>{t(lang, "Last 7 days source, conversion, owner, and teacher assessment view.", "近 7 天来源、转化、负责人和老师评估视图。")}</div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {[
          [t(lang, "New resources", "新增资源"), summary.total],
          [t(lang, "Open", "未结束"), summary.open],
          [t(lang, "Hot", "高意向"), summary.hot],
          [t(lang, "Overdue", "逾期"), summary.overdue],
          [t(lang, "Won", "成交"), summary.won],
          [t(lang, "Lost", "流失"), summary.lost],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: 12 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>{t(lang, "Status Funnel", "状态漏斗")}</h3>
          {byStatus.map((item) => (
            <div key={item.status} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><b>{statusLabel(lang, item.status)}</b><span>{item.count}</span></div>
              <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct(item.count, Math.max(summary.total, 1))}%`, background: "#2563eb" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>{t(lang, "Source Ranking", "来源排行")}</h3>
          {bySource.length === 0 ? <div style={{ color: "#64748b" }}>-</div> : bySource.map(([name, count]) => <div key={name} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "6px 0" }}><b>{name}</b><span>{count}</span></div>)}
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>{t(lang, "Owner Ranking", "负责人排行")}</h3>
          {byOwner.length === 0 ? <div style={{ color: "#64748b" }}>-</div> : byOwner.map(([name, count]) => <div key={name} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "6px 0" }}><b>{name}</b><span>{count}</span></div>)}
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>{t(lang, "Teacher Assessment", "老师评估")}</h3>
          <div>{t(lang, "Submitted", "已提交")}: <b>{assessmentSubmitted.length}</b></div>
          <div>{t(lang, "Pending", "待处理")}: <b>{assessmentPending.length}</b></div>
          <div>{t(lang, "Overdue", "超时")}: <b style={{ color: assessmentOverdue.length ? "#991b1b" : "#166534" }}>{assessmentOverdue.length}</b></div>
          <div>{t(lang, "Completion rate", "完成率")}: <b>{pct(assessmentSubmitted.length, assessments.length)}%</b></div>
        </div>
      </section>
    </main>
  );
}

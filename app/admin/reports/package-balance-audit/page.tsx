import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { getPackageBalanceAudit } from "@/lib/package-balance-audit";
import { formatPackageLedgerMinutes } from "@/lib/package-ledger-format";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../_components/workbenchStyles";

function fmtMinutes(v: number) {
  return formatPackageLedgerMinutes(v);
}

function riskStyle(level: string) {
  if (level === "HIGH") return { background: "#fff1f2", border: "1px solid #fda4af", color: "#be123c" };
  if (level === "MEDIUM") return { background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e" };
  return { background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569" };
}

function badge(text: string, level = "LOW") {
  return (
    <span style={{ ...riskStyle(level), borderRadius: 999, padding: "3px 8px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

export default async function PackageBalanceAuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const rawDays = Number(sp?.days ?? 120);
  const days = Number.isFinite(rawDays) ? Math.max(1, Math.min(Math.floor(rawDays), 365)) : 120;
  const audit = await getPackageBalanceAudit(days);
  const highRiskCount = audit.rollbackReviewRows.filter((row) => row.riskLevel === "HIGH").length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#be123c" }}>
            {t(lang, "Package balance guardrail", "课包余额防错护栏")}
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Package Balance Audit", "课包余额与回滚复核")}</h2>
          <div style={{ color: "#475569", fontSize: 13, maxWidth: 960 }}>
            {t(
              lang,
              "Review balance mismatches and high-risk rollback or adjustment records before they block attendance deductions.",
              "在课包无法扣减之前，先复核余额不同步、回滚和手动调整等高风险记录。",
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
            <Link href="/admin/packages">{t(lang, "Open packages", "打开课包列表")}</Link>
            <Link href="/admin/reports/undeducted-completed">{t(lang, "Undeducted completed", "已完成未减扣")}</Link>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("rose")}>
            <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Balance mismatches", "余额不同步")}</div>
            <div style={workbenchMetricValueStyle("rose")}>{audit.mismatchRows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fffbeb" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Rollback review", "回滚待复核")}</div>
            <div style={{ ...workbenchMetricValueStyle("amber"), fontSize: 22 }}>{audit.rollbackReviewRows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fef2f2" }}>
            <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "High risk", "高风险")}</div>
            <div style={{ ...workbenchMetricValueStyle("rose"), fontSize: 22 }}>{highRiskCount}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Lookback days", "回看天数")}</div>
            <div style={{ ...workbenchMetricValueStyle("slate"), fontSize: 22 }}>{days}</div>
          </div>
        </div>
      </section>

      <section style={{ ...workbenchFilterPanelStyle, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4, fontWeight: 700 }}>
            {t(lang, "Rollback lookback days", "回滚复核天数")}
            <input name="days" type="number" min={1} max={365} defaultValue={days} style={{ width: 120 }} />
          </label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
        </form>
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {t(lang, "Generated at", "生成时间")}: {formatBusinessDateTime(audit.generatedAt)}
        </div>
      </section>

      <section style={{ border: "1px solid #fecdd3", borderRadius: 8, background: "#fff1f2", padding: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>{t(lang, "Balance mismatch queue", "余额不同步队列")} ({audit.mismatchRows.length})</div>
        <div style={{ fontSize: 12, color: "#9f1239" }}>
          {t(
            lang,
            "If this table is not empty, attendance deduction may read a different balance from the PDF ledger. Review before operating.",
            "如果这里不为空，点名扣减读取的余额可能和 PDF 流水余额不同，操作前必须先复核。",
          )}
        </div>
        {audit.mismatchRows.length === 0 ? (
          <div style={{ color: "#15803d", fontWeight: 800 }}>{t(lang, "No balance mismatch found.", "未发现余额不同步。")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#ffe4e6" }}>
                  <th align="left">{t(lang, "Student", "学生")}</th>
                  <th align="left">{t(lang, "Course", "课程")}</th>
                  <th align="left">{t(lang, "Current", "当前余额")}</th>
                  <th align="left">{t(lang, "Ledger", "流水余额")}</th>
                  <th align="left">{t(lang, "Diff", "差异")}</th>
                  <th align="left">{t(lang, "Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {audit.mismatchRows.map((row) => (
                  <tr key={row.packageId} style={{ borderTop: "1px solid #fecdd3" }}>
                    <td>{row.studentName}</td>
                    <td>{row.courseName}</td>
                    <td>{fmtMinutes(row.currentRemainingMinutes)}</td>
                    <td>{fmtMinutes(row.ledgerRemainingMinutes)}</td>
                    <td>{fmtMinutes(row.diffMinutes)}</td>
                    <td><Link href={`/admin/packages/${row.packageId}/ledger`}>{t(lang, "Open ledger", "打开流水")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #fde68a", borderRadius: 8, background: "#fffbeb", padding: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>{t(lang, "Rollback and adjustment review", "回滚与调整复核")} ({audit.rollbackReviewRows.length})</div>
        <div style={{ fontSize: 12, color: "#92400e" }}>
          {t(
            lang,
            "These rows are not automatically wrong. They are operations that must have clear evidence before Academic relies on the resulting balance.",
            "这些记录不一定错误，但属于必须有明确证据后才能作为余额依据的操作。",
          )}
        </div>
        {audit.rollbackReviewRows.length === 0 ? (
          <div style={{ color: "#15803d", fontWeight: 800 }}>{t(lang, "No risky rollback or adjustment found.", "未发现高风险回滚或调整。")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table cellPadding={8} style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#fef3c7" }}>
                  <th align="left">{t(lang, "Risk", "风险")}</th>
                  <th align="left">{t(lang, "Student", "学生")}</th>
                  <th align="left">{t(lang, "Txn", "流水")}</th>
                  <th align="left">{t(lang, "Session", "课次")}</th>
                  <th align="left">{t(lang, "Reason", "原因")}</th>
                  <th align="left">{t(lang, "Note", "备注")}</th>
                  <th align="left">{t(lang, "Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {audit.rollbackReviewRows.map((row) => (
                  <tr key={row.txnId} style={{ borderTop: "1px solid #fde68a", verticalAlign: "top" }}>
                    <td>{badge(row.riskLevel, row.riskLevel)}</td>
                    <td>
                      <div style={{ fontWeight: 800 }}>{row.studentName}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{row.courseName}</div>
                    </td>
                    <td>
                      <div>{formatBusinessDateTime(row.createdAt)}</div>
                      <div style={{ fontWeight: 800 }}>{row.kind} {fmtMinutes(row.deltaMinutes)}</div>
                    </td>
                    <td>
                      {row.sessionStartAt ? (
                        <>
                          <div>{formatBusinessDateTime(row.sessionStartAt)} - {row.sessionEndAt ? formatBusinessDateTime(row.sessionEndAt).slice(11) : "-"}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{row.subjectName} / {row.teacherName}</div>
                        </>
                      ) : (
                        <span style={{ color: "#be123c", fontWeight: 800 }}>{t(lang, "No session", "无课次")}</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 260 }}>{row.riskReason}</td>
                    <td style={{ maxWidth: 320, whiteSpace: "pre-wrap", color: "#475569", fontSize: 12 }}>{row.note || "-"}</td>
                    <td><Link href={`/admin/packages/${row.packageId}/ledger`}>{t(lang, "Open ledger", "打开流水")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

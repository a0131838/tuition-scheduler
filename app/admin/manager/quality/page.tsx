import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { requireManager } from "@/lib/auth";
import {
  loadManagerQualityWorkspace,
  MANAGER_REFLECTION_CHECKLIST,
  saveManagerReflectionEntry,
  type ManagerReflectionChecklistKey,
} from "@/lib/manager-quality-workspace";
import ManagerQualityPrintButton from "./_components/ManagerQualityPrintButton";

const panelStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  borderRadius: 8,
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
  fontSize: 13,
  color: "#0f172a",
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function saveReflectionAction(formData: FormData) {
  "use server";
  const user = await requireManager();
  const date = readString(formData, "date") || formatBusinessDateOnly(new Date());
  const checklist = MANAGER_REFLECTION_CHECKLIST.reduce(
    (acc, item) => {
      acc[item.key] = formData.get(item.key) === "on";
      return acc;
    },
    {} as Record<ManagerReflectionChecklistKey, boolean>,
  );

  await saveManagerReflectionEntry({
    date,
    managerEmail: user.email,
    checklist,
    wentWell: readString(formData, "wentWell"),
    didNotGoWell: readString(formData, "didNotGoWell"),
    couldBeBetter: readString(formData, "couldBeBetter"),
    followUpActions: readString(formData, "followUpActions"),
  });

  revalidatePath("/admin/manager/quality");
  redirect(`/admin/manager/quality?date=${encodeURIComponent(date)}&saved=1`);
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 16,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 900, color: "#1e293b" }}>{value}</div>
      {detail ? <div style={mutedStyle}>{detail}</div> : null}
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "danger" | "success" }) {
  const colors = {
    neutral: { bg: "#f1f5f9", fg: "#334155", bd: "#cbd5e1" },
    warning: { bg: "#fef3c7", fg: "#92400e", bd: "#fde68a" },
    danger: { bg: "#fee2e2", fg: "#991b1b", bd: "#fecaca" },
    success: { bg: "#dcfce7", fg: "#166534", bd: "#bbf7d0" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 8px",
        border: `1px solid ${colors.bd}`,
        background: colors.bg,
        color: colors.fg,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function TextAreaField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={4}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: 10,
          font: "inherit",
          color: "#0f172a",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

export default async function ManagerQualityPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; saved?: string }>;
}) {
  const user = await requireManager();
  const lang = await getLang();
  const sp = await searchParams;
  const data = await loadManagerQualityWorkspace({
    managerEmail: user.email,
    managerRole: user.role,
    date: sp?.date,
  });
  const entry = data.currentEntry;

  return (
    <main style={{ padding: "24px 24px 48px", display: "grid", gap: 18 }}>
      <style>{`
        @media print {
          body { background: #ffffff !important; }
          .no-print, aside, nav, header { display: none !important; }
          .print-only { display: block !important; }
          .lead-desk-print { box-shadow: none !important; border: none !important; }
          main { padding: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <section
        className="no-print"
        style={{
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          padding: 18,
          background: "#eff6ff",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>
              {t(lang, "Manager Quality Desk", "管理者质量工作台")}
            </h1>
            <p style={{ ...mutedStyle, margin: "6px 0 0" }}>
              {t(
                lang,
                "Print the daily teacher schedule and keep the daily manager reflection in one place.",
                "集中打印老师当日课表，并记录每日管理检查和复盘。",
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {sp?.saved === "1" ? <StatusPill tone="success">{t(lang, "Saved", "已保存")}</StatusPill> : null}
            <Link
              href="/admin/manager"
              style={{
                textDecoration: "none",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                borderRadius: 8,
                padding: "10px 14px",
                fontWeight: 800,
              }}
            >
              {t(lang, "Back to Manager Console", "返回管理者驾驶舱")}
            </Link>
          </div>
        </div>

        <form action="/admin/manager/quality" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#334155", fontWeight: 800 }}>{t(lang, "Schedule date", "课表日期")}</span>
            <input
              type="date"
              name="date"
              defaultValue={data.date}
              style={{ border: "1px solid #93c5fd", borderRadius: 8, padding: "10px 12px", font: "inherit" }}
            />
          </label>
          <button
            type="submit"
            style={{
              border: "1px solid #1d4ed8",
              background: "#1d4ed8",
              color: "#ffffff",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {t(lang, "Apply", "应用")}
          </button>
          <ManagerQualityPrintButton />
        </form>
      </section>

      <section className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <MetricCard label={t(lang, "Lead Desk sessions", "Lead Desk 课次")} value={data.leadDeskTotals.sessions} detail={`${data.leadDeskTotals.teachers} teachers / 老师`} />
        <MetricCard label={t(lang, "Students scheduled", "当日学生")} value={data.leadDeskTotals.students} detail={data.date} />
        <MetricCard label={t(lang, "Feedback issues", "反馈质量提醒")} value={data.feedbackSummary.issueCount} detail={`${data.feedbackSummary.recentCount} recent feedbacks / 近 7 天反馈`} />
        <MetricCard label={t(lang, "Reflection completion", "复盘完成率")} value={`${data.kpiSummary.completionRate}%`} detail={`${data.kpiSummary.completedLogDays}/${data.kpiSummary.logDays} days / 近 14 天`} />
      </section>

      <section className="lead-desk-print" style={{ ...panelStyle, overflow: "hidden" }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h2 style={sectionTitleStyle}>{t(lang, "Lead Desk Daily Schedule", "Lead Desk 当日课表")}</h2>
            <p style={{ ...mutedStyle, margin: "4px 0 0" }}>
              {data.date} · {data.leadDeskTotals.sessions} {t(lang, "sessions", "课次")} · {data.leadDeskTotals.teachers} {t(lang, "teachers", "老师")}
            </p>
          </div>
          <div className="print-only" style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>
            SGT Lead Desk
          </div>
        </div>

        {data.leadDeskGroups.length === 0 ? (
          <div style={{ padding: 18, ...mutedStyle }}>{t(lang, "No sessions scheduled for this date.", "这个日期没有已安排课次。")}</div>
        ) : (
          <div style={{ display: "grid" }}>
            {data.leadDeskGroups.map((group) => (
              <div key={group.teacherName} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ padding: "12px 16px", background: "#f8fafc", fontWeight: 900, color: "#1e293b" }}>{group.teacherName}</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t(lang, "Time", "时间")}</th>
                        <th style={thStyle}>{t(lang, "Course", "课程")}</th>
                        <th style={thStyle}>{t(lang, "Students", "学生")}</th>
                        <th style={thStyle}>{t(lang, "Campus", "校区")}</th>
                        <th style={thStyle}>{t(lang, "Room", "教室")}</th>
                        <th style={thStyle}>{t(lang, "Mode", "模式")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.id}>
                          <td style={{ ...tdStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{row.timeRange}</td>
                          <td style={tdStyle}>{row.course || "-"}</td>
                          <td style={tdStyle}>{row.students}</td>
                          <td style={tdStyle}>{row.campus}</td>
                          <td style={tdStyle}>{row.room || "-"}</td>
                          <td style={tdStyle}>{row.mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="no-print" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 16 }}>
        <form action={saveReflectionAction} style={{ ...panelStyle, padding: 18, display: "grid", gap: 16 }}>
          <div>
            <h2 style={sectionTitleStyle}>{t(lang, "Daily Manager Reflection Log", "每日管理复盘")}</h2>
            <p style={{ ...mutedStyle, margin: "4px 0 0" }}>
              {t(lang, "Use this as the daily workflow checklist and short operations reflection.", "用于每日流程检查和运营复盘。")}
            </p>
          </div>
          <input type="hidden" name="date" value={data.date} />

          <div style={{ display: "grid", gap: 10 }}>
            {MANAGER_REFLECTION_CHECKLIST.map((item) => (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                <input type="checkbox" name={item.key} defaultChecked={Boolean(entry?.checklist[item.key])} style={{ marginTop: 3 }} />
                <span style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{item.en}</span>
                  <span style={mutedStyle}>{item.zh}</span>
                </span>
              </label>
            ))}
          </div>

          <TextAreaField name="wentWell" label={t(lang, "What went well in operations?", "今天运营做得好的地方")} defaultValue={entry?.wentWell} />
          <TextAreaField name="didNotGoWell" label={t(lang, "What did not go well?", "今天哪里不顺")} defaultValue={entry?.didNotGoWell} />
          <TextAreaField name="couldBeBetter" label={t(lang, "What could be better?", "可以改进什么")} defaultValue={entry?.couldBeBetter} />
          <TextAreaField name="followUpActions" label={t(lang, "Follow-up actions", "后续跟进行动")} defaultValue={entry?.followUpActions} />

          <button
            type="submit"
            style={{
              justifySelf: "start",
              border: "1px solid #16a34a",
              background: "#16a34a",
              color: "#ffffff",
              borderRadius: 8,
              padding: "11px 16px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {t(lang, "Save Reflection", "保存复盘")}
          </button>
        </form>

        <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <section style={{ ...panelStyle, padding: 16, display: "grid", gap: 12 }}>
            <h2 style={sectionTitleStyle}>{t(lang, "Quality Snapshot", "质量快照")}</h2>
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>{t(lang, "Approval inbox", "审批提醒")}: <strong>{data.approvalInboxSummary.total}</strong> total, <strong>{data.approvalInboxSummary.overdue}</strong> overdue</div>
              <div>{t(lang, "Active mid-term reports", "中期报告跟进")}: <strong>{data.reportSummary.midtermActive}</strong></div>
              <div>{t(lang, "Active end-term reports", "结课报告跟进")}: <strong>{data.reportSummary.finalActive}</strong></div>
              <div>{t(lang, "Checklist completion", "检查项完成率")}: <strong>{data.kpiSummary.checklistCompletionRate}%</strong></div>
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 16, display: "grid", gap: 12 }}>
            <h2 style={sectionTitleStyle}>{t(lang, "Feedback Quality", "反馈质量")}</h2>
            {data.feedbackRows.length === 0 ? (
              <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, "No recent feedback found.", "最近没有课后反馈。")}</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {data.feedbackRows.slice(0, 8).map((row) => (
                  <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#0f172a" }}>{row.teacherName}</strong>
                      <StatusPill tone={row.issues.length ? "warning" : "success"}>{row.issues.length ? row.issues.length : "OK"}</StatusPill>
                    </div>
                    <div style={mutedStyle}>{row.submittedAt} · {row.course || "-"}</div>
                    {row.issues.length ? <div style={{ marginTop: 6, color: "#92400e", fontSize: 12 }}>{row.issues.join(", ")}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ ...panelStyle, padding: 16, display: "grid", gap: 12 }}>
            <h2 style={sectionTitleStyle}>{t(lang, "Report Follow-up", "报告跟进")}</h2>
            {data.reportRows.length === 0 ? (
              <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, "No active report follow-up items.", "暂无需要跟进的报告。")}</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {data.reportRows.slice(0, 10).map((row) => (
                  <div key={`${row.type}-${row.id}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#0f172a" }}>{row.studentName}</strong>
                      <StatusPill tone={row.status === "ASSIGNED" ? "warning" : "neutral"}>{row.status}</StatusPill>
                    </div>
                    <div style={mutedStyle}>{row.type} · {row.teacherName} · {row.assignedAt}</div>
                    <div style={mutedStyle}>{row.course || "-"}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

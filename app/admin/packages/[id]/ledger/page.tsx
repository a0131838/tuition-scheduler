import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import NoticeBanner from "../../../_components/NoticeBanner";
import { packageModeFromNote, stripGroupPackTag } from "@/lib/package-mode";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import PackageLedgerGiftClient from "./PackageLedgerGiftClient";
import PackageLedgerEditTxnClient from "./PackageLedgerEditTxnClient";
import { parseAbnormalLedgerNote } from "@/lib/package-ledger-guard";
import { formatBusinessDateTime } from "@/lib/date-only";
import { formatLedgerNoteForDisplay } from "@/lib/package-ledger-note";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../../_components/workbenchStyles";

function ledgerSectionLinkStyle(background: string, border: string) {
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

function fmtMinutes(min: number) {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min % 60);
  const sign = min < 0 ? "-" : "";
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

function fmtCount(v: number) {
  return `${v} cls`;
}

function fmtAmount(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "-";
  return `SGD ${Number(v).toFixed(2)}`;
}

export default async function PackageLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const admin = await requireAdmin();
  const lang = await getLang();
  const { id: packageId } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const canEditTxn = admin.email.trim().toLowerCase() === "zhaohongwei0880@gmail.com";

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });
  if (!pkg) {
    return (
      <div>
        <h2>{t(lang, "Package Not Found", "课包不存在")}</h2>
        <a href="/admin/packages">- {t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const txns = await prisma.packageTxn.findMany({
    where: { packageId },
    orderBy: { createdAt: "asc" },
  });

  const sessionIds = txns.map((x) => x.sessionId).filter(Boolean) as string[];
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        include: { class: { include: { course: true, subject: true, level: true, teacher: true } } },
      })
    : [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  let running = 0;
  const rows = txns.map((txn) => {
    running += txn.deltaMinutes;
    return { txn, running, session: txn.sessionId ? sessionMap.get(txn.sessionId) : null };
  });
  const opening = rows.length ? rows[0].running - rows[0].txn.deltaMinutes : 0;
  const closing = rows.length ? rows[rows.length - 1].running : opening;
  const isGroupPack = packageModeFromNote(pkg.note) === "GROUP_COUNT";
  const fmtUnit = (v: number) => (isGroupPack ? fmtCount(v) : fmtMinutes(v));

  return (
    <div>
      <section style={workbenchHeroStyle("indigo")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{t(lang, "Package ledger view", "课包流水视图")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Package Ledger", "课包对账单")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Use this page to verify the full package movement history before editing or gifting. Start with the balance summary, then scan the transaction table below.",
              "这里用于核对课包完整流水。建议先看余额摘要，再往下看流水表，最后再决定是否赠送或修正。"
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/admin/packages">{t(lang, "Back to Packages", "返回课包列表")}</a>
            <a href={`/api/exports/package-ledger/${packageId}`}>{t(lang, "Export PDF", "导出PDF")}</a>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Opening", "期初余额")}</div>
            <div style={{ ...workbenchMetricValueStyle("indigo"), fontSize: 18 }}>{fmtUnit(opening)}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("blue"), background: "#eff6ff" }}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Closing", "期末余额")}</div>
            <div style={{ ...workbenchMetricValueStyle("blue"), fontSize: 18 }}>{fmtUnit(closing)}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Current remaining", "当前余额")}</div>
            <div style={{ ...workbenchMetricValueStyle("emerald"), fontSize: 18 }}>
              {pkg.remainingMinutes != null ? fmtUnit(pkg.remainingMinutes) : "-"}
            </div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Transactions", "流水条数")}</div>
            <div style={workbenchMetricValueStyle("slate")}>{rows.length}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Ledger map", "流水地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Start with package summary, then use gift/edit tools, and finally audit the full transaction table.", "建议先看课包摘要，再使用赠送/修正工具，最后核对完整流水表。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#ledger-summary" style={ledgerSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Package summary", "课包摘要")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Check owner, type, and balances", "先核对学生、类型和余额")}</span>
          </a>
          <a href="#ledger-gift" style={ledgerSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "Gift tool", "赠送工具")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Add gifted minutes or counts", "增加赠送分钟/次数")}</span>
          </a>
          <a href="#ledger-table" style={ledgerSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Transactions", "流水表")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Audit or edit historical rows", "核对或修正历史流水")}</span>
          </a>
        </div>
      </section>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div id="ledger-summary" style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div><b>{t(lang, "Student", "学生")}:</b> {pkg.student?.name ?? "-"}</div>
        <div><b>{t(lang, "Course", "课程")}:</b> {pkg.course?.name ?? "-"}</div>
        <div><b>{t(lang, "Type", "类型")}:</b> {isGroupPack ? t(lang, "GROUP", "班课包") : pkg.type}</div>
        <div><b>{t(lang, "Status", "状态")}:</b> {pkg.status}</div>
        <div><b>{t(lang, "Note", "备注")}:</b> {stripGroupPackTag(pkg.note) || "-"}</div>
        <div style={{ marginTop: 8 }}><b>{t(lang, "Opening Balance", "期初余额")}:</b> {fmtUnit(opening)}</div>
        <div><b>{t(lang, "Closing Balance", "期末余额")}:</b> {fmtUnit(closing)}</div>
        <div><b>{t(lang, "Current Remaining", "当前余额")}:</b> {pkg.remainingMinutes != null ? fmtUnit(pkg.remainingMinutes) : "-"}</div>
      </div>

      <div id="ledger-gift" style={{ padding: 12, border: "1px dashed #f0b266", borderRadius: 8, marginBottom: 16, background: "#fff7ed" }}>
        <b>{isGroupPack ? t(lang, "Gift Count", "赠送次数") : t(lang, "Gift Minutes", "赠送分钟")}</b>
        <PackageLedgerGiftClient
          packageId={packageId}
          isGroupPack={isGroupPack}
          labels={{
            count: t(lang, "Count", "次数"),
            minutes: t(lang, "Minutes", "分钟"),
            note: t(lang, "Note", "备注"),
            add: t(lang, "Add", "增加"),
            saving: t(lang, "Saving...", "保存中..."),
            errorPrefix: t(lang, "Error", "错误"),
          }}
        />
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No transactions yet.", "暂无流水")}</div>
      ) : (
        <table id="ledger-table" cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Time", "时间")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
              <th align="left">{t(lang, "Delta", "变动")}</th>
              <th align="left">{t(lang, "Balance", "余额")}</th>
              <th align="left">{t(lang, "Session", "课次")}</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.txn.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{formatBusinessDateTime(new Date(r.txn.createdAt))}</td>
                <td>{r.txn.kind}</td>
                <td>{r.txn.kind === "PURCHASE" ? fmtAmount(r.txn.deltaAmount) : "-"}</td>
                <td style={{ color: r.txn.deltaMinutes < 0 ? "#b00" : "#0a0" }}>{fmtUnit(r.txn.deltaMinutes)}</td>
                <td>{fmtUnit(r.running)}</td>
                <td>
                  {r.session ? (
                    <div>
                      <div>{formatBusinessDateTime(new Date(r.session.startAt))}</div>
                      <div style={{ color: "#999", fontSize: 12 }}>
                        <ClassTypeBadge capacity={r.session.class.capacity} compact />{" "}
                        {r.session.class.course.name} / {r.session.class.subject?.name ?? "-"} / {r.session.class.level?.name ?? "-"} |{" "}
                        {r.session.class.teacher.name}
                      </div>
                    </div>
                  ) : "-"}
                </td>
                <td style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{formatLedgerNoteForDisplay(r.txn.note)}</td>
                <td>
                  {canEditTxn ? (
                    (() => {
                      const abnormal = parseAbnormalLedgerNote(r.txn.note ?? "");
                      return (
                    <PackageLedgerEditTxnClient
                      packageId={packageId}
                      txnId={r.txn.id}
                      txnKind={r.txn.kind}
                      defaultDelta={r.txn.deltaMinutes}
                      defaultAmount={r.txn.deltaAmount}
                      defaultNote={abnormal.detailNote}
                      defaultReasonCategory={abnormal.reasonCategory}
                      defaultApprover={abnormal.approver}
                      defaultEvidenceNote={abnormal.evidenceNote}
                      labels={{
                        delta: t(lang, "Delta", "变动"),
                        amount: t(lang, "Amount", "金额"),
                        note: t(lang, "Note", "备注"),
                        save: t(lang, "Save", "保存"),
                        saving: t(lang, "Saving...", "保存中..."),
                        remove: t(lang, "Delete", "删除"),
                        removing: t(lang, "Deleting...", "删除中..."),
                        confirmRemove: t(lang, "Delete this ledger row?", "确认删除这条流水记录？"),
                        undoRemove: t(lang, "Undo Delete", "撤销删除"),
                        undoing: t(lang, "Undoing...", "撤销中..."),
                        removedHint: t(lang, "Deleted. You can undo now.", "已删除，可以立即撤销。"),
                        errorPrefix: t(lang, "Error", "错误"),
                      }}
                    />
                      );
                    })()
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

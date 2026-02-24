import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import NoticeBanner from "../../../_components/NoticeBanner";
import { packageModeFromNote, stripGroupPackTag } from "@/lib/package-mode";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import PackageLedgerGiftClient from "./PackageLedgerGiftClient";
import PackageLedgerEditTxnClient from "./PackageLedgerEditTxnClient";

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
      <h2>{t(lang, "Package Ledger", "课包对账单")}</h2>
      <p>
        <a href="/admin/packages">- {t(lang, "Back to Packages", "返回课包列表")}</a>
      </p>
      <p style={{ marginTop: -4 }}>
        <a
          href={`/api/exports/package-ledger/${packageId}`}
          style={{ display: "inline-block", padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}
        >
          {t(lang, "Export PDF", "导出PDF")}
        </a>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div><b>{t(lang, "Student", "学生")}:</b> {pkg.student?.name ?? "-"}</div>
        <div><b>{t(lang, "Course", "课程")}:</b> {pkg.course?.name ?? "-"}</div>
        <div><b>{t(lang, "Type", "类型")}:</b> {isGroupPack ? t(lang, "GROUP", "班课包") : pkg.type}</div>
        <div><b>{t(lang, "Status", "状态")}:</b> {pkg.status}</div>
        <div><b>{t(lang, "Note", "备注")}:</b> {stripGroupPackTag(pkg.note) || "-"}</div>
        <div style={{ marginTop: 8 }}><b>{t(lang, "Opening Balance", "期初余额")}:</b> {fmtUnit(opening)}</div>
        <div><b>{t(lang, "Closing Balance", "期末余额")}:</b> {fmtUnit(closing)}</div>
        <div><b>{t(lang, "Current Remaining", "当前余额")}:</b> {pkg.remainingMinutes != null ? fmtUnit(pkg.remainingMinutes) : "-"}</div>
      </div>

      <div style={{ padding: 12, border: "1px dashed #f0b266", borderRadius: 8, marginBottom: 16, background: "#fff7ed" }}>
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
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Time", "时间")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
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
                <td>{new Date(r.txn.createdAt).toLocaleString()}</td>
                <td>{r.txn.kind}</td>
                <td style={{ color: r.txn.deltaMinutes < 0 ? "#b00" : "#0a0" }}>{fmtUnit(r.txn.deltaMinutes)}</td>
                <td>{fmtUnit(r.running)}</td>
                <td>
                  {r.session ? (
                    <div>
                      <div>{new Date(r.session.startAt).toLocaleString()}</div>
                      <div style={{ color: "#999", fontSize: 12 }}>
                        <ClassTypeBadge capacity={r.session.class.capacity} compact />{" "}
                        {r.session.class.course.name} / {r.session.class.subject?.name ?? "-"} / {r.session.class.level?.name ?? "-"} |{" "}
                        {r.session.class.teacher.name}
                      </div>
                    </div>
                  ) : "-"}
                </td>
                <td>{r.txn.note ?? "-"}</td>
                <td>
                  {canEditTxn ? (
                    <PackageLedgerEditTxnClient
                      packageId={packageId}
                      txnId={r.txn.id}
                      defaultDelta={r.txn.deltaMinutes}
                      defaultNote={r.txn.note ?? ""}
                      labels={{
                        delta: t(lang, "Delta", "变动"),
                        note: t(lang, "Note", "备注"),
                        save: t(lang, "Save", "保存"),
                        saving: t(lang, "Saving...", "保存中..."),
                        remove: t(lang, "Delete", "删除"),
                        removing: t(lang, "Deleting...", "删除中..."),
                        confirmRemove: t(lang, "Delete this ledger row?", "确认删除这条流水记录？"),
                        errorPrefix: t(lang, "Error", "错误"),
                      }}
                    />
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

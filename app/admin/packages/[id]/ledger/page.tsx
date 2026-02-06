import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import NoticeBanner from "../../_components/NoticeBanner";

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.abs(min % 60);
  if (h === 0) return `${min}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

async function addGiftMinutes(packageId: string, formData: FormData) {
  "use server";
  const minutesRaw = String(formData.get("minutes") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    redirect(`/admin/packages/${packageId}/ledger?err=Invalid+minutes`);
  }

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: { type: true, remainingMinutes: true },
  });
  if (!pkg) {
    redirect(`/admin/packages/${packageId}/ledger?err=Package+not+found`);
  }
  if (pkg.type !== "HOURS") {
    redirect(`/admin/packages/${packageId}/ledger?err=Only+HOURS+package+can+gift+minutes`);
  }

  const nextRemaining = (pkg.remainingMinutes ?? 0) + minutes;

  await prisma.$transaction([
    prisma.coursePackage.update({
      where: { id: packageId },
      data: { remainingMinutes: nextRemaining },
    }),
    prisma.packageTxn.create({
      data: {
        packageId,
        kind: "GIFT",
        deltaMinutes: minutes,
        note: note || null,
      },
    }),
  ]);

  redirect(`/admin/packages/${packageId}/ledger?msg=Gift+added`);
}

export default async function PackageLedgerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { msg?: string; err?: string };
}) {
  const lang = await getLang();
  const packageId = params.id;
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });

  if (!pkg) {
    return (
      <div>
        <h2>{t(lang, "Package Not Found", "课包不存在")}</h2>
        <a href="/admin/packages">← {t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const txns = await prisma.packageTxn.findMany({
    where: { packageId },
    orderBy: { createdAt: "asc" },
  });

  const sessionIds = txns.map((t) => t.sessionId).filter(Boolean) as string[];
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        include: { class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } } },
      })
    : [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  let running = 0;
  const rows = txns.map((t) => {
    running += t.deltaMinutes;
    const sess = t.sessionId ? sessionMap.get(t.sessionId) : null;
    return { txn: t, running, sess };
  });

  const openingBalance = txns.length > 0 ? rows[0].running - rows[0].txn.deltaMinutes : 0;
  const closingBalance = rows.length ? rows[rows.length - 1].running : openingBalance;

  return (
    <div>
      <h2>{t(lang, "Package Ledger", "课包对账单")}</h2>
      <p>
        <a href="/admin/packages">← {t(lang, "Back to Packages", "返回课包列表")}</a>
      </p>
      <p>
        <a href={`/api/exports/package-ledger/${packageId}`}>{t(lang, "Download PDF", "导出PDF")}</a>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div>
          <b>{t(lang, "Student", "学生")}:</b> {pkg.student?.name ?? "-"}
        </div>
        <div>
          <b>{t(lang, "Course", "课程")}:</b> {pkg.course?.name ?? "-"}
        </div>
        <div>
          <b>{t(lang, "Type", "类型")}:</b> {pkg.type}
        </div>
        <div>
          <b>{t(lang, "Status", "状态")}:</b> {pkg.status}
        </div>
        <div>
          <b>{t(lang, "Valid", "有效期")}:</b> {new Date(pkg.validFrom).toLocaleDateString()} ~{" "}
          {pkg.validTo ? new Date(pkg.validTo).toLocaleDateString() : "(open)"}
        </div>
        <div style={{ marginTop: 8 }}>
          <b>{t(lang, "Opening Balance", "期初余额")}:</b> {fmtMinutes(openingBalance)}
        </div>
        <div>
          <b>{t(lang, "Closing Balance", "期末余额")}:</b> {fmtMinutes(closingBalance)}
        </div>
        <div>
          <b>{t(lang, "Current Remaining", "当前余额")}:</b> {pkg.remainingMinutes != null ? fmtMinutes(pkg.remainingMinutes) : "-"}
        </div>
      </div>

      <div style={{ padding: 12, border: "1px dashed #f0b266", borderRadius: 8, marginBottom: 16, background: "#fff7ed" }}>
        <b>{t(lang, "Gift Minutes", "赠送课时")}</b>
        <form action={addGiftMinutes.bind(null, packageId)} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input name="minutes" type="number" min={1} step={1} placeholder={t(lang, "Minutes", "分钟数")} />
          <input name="note" type="text" placeholder={t(lang, "Note", "备注")} style={{ minWidth: 220 }} />
          <button type="submit">{t(lang, "Add Gift", "添加赠送")}</button>
        </form>
        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
          {t(lang, "Only HOURS packages support gifting minutes.", "仅课时包支持赠送分钟")}
        </div>
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.txn.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(r.txn.createdAt).toLocaleString()}</td>
                <td>{r.txn.kind}</td>
                <td style={{ color: r.txn.deltaMinutes < 0 ? "#b00" : "#0a0" }}>{fmtMinutes(r.txn.deltaMinutes)}</td>
                <td>{fmtMinutes(r.running)}</td>
                <td>
                  {r.sess ? (
                    <div>
                      <div>
                        {new Date(r.sess.startAt).toLocaleString()} - {new Date(r.sess.endAt).toLocaleTimeString()}
                      </div>
                      <div style={{ color: "#999", fontSize: 12 }}>
                        {r.sess.class.course.name} / {r.sess.class.subject?.name ?? "-"} / {r.sess.class.level?.name ?? "-"} |{" "}
                        {r.sess.class.teacher.name}
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{r.txn.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

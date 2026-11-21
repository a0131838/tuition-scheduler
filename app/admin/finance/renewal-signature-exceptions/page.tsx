import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { coerceSnapshot } from "@/lib/student-contract";

export default async function PendingRenewalSignaturesPage() {
  await requireAdmin();
  const lang = await getLang();
  const rows = await prisma.studentContract.findMany({
    where: { flowType: "RENEWAL", contractMode: "TUITION_AGREEMENT", signedAt: null, voidedAt: null, status: "READY_TO_SIGN", renewalOrder: { is: null }, renewalSignatureException: { isNot: null }, package: { status: "ACTIVE", type: "HOURS", settlementMode: null } },
    include: { student: { select: { name: true } }, renewalSignatureException: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <main style={{ maxWidth: 1050, margin: "24px auto", padding: 18, display: "grid", gap: 14 }}>
    <a href="/admin/renewals/orders">Same-term renewal orders / 同条件续费确认与限额续课 →</a>
    <a href="/admin/finance/workbench#paid-renewals-awaiting-signature">
      {t(lang, "PayNow and other non-cash renewals awaiting signature →", "PayNow 等非现金续费待签署 →")}
    </a>
    <h1>{t(lang, "Cash renewal exceptions", "现金续费例外")}</h1>
    <p>{t(lang, "Track existing cash exception requests and follow up on parent signatures. To start a request, open the student’s Package Billing page.", "在此跟进已提交的现金例外和家长补签。新申请请从学生的课包账单进入。")}</p>
    {rows.map(row => {
      const exception = row.renewalSignatureException;
      const snapshot = coerceSnapshot(row.contractSnapshotJson);
      const fee = exception ? exception.feeCents / 100 : Number(snapshot?.package?.feeAmount);
      const minutes = exception?.topUpMinutes ?? Number(snapshot?.package?.totalMinutes);
      const status = exception?.status === "ACTIVATED" ? t(lang, "Activated · parent signature pending", "已激活 · 家长待补签")
        : exception?.status === "APPROVED" ? t(lang, "Manager approved · Finance activation pending", "管理已批准 · 待财务激活")
        : exception?.status === "REQUESTED" ? t(lang, "Requested · management review pending", "已申请 · 待管理审核")
        : exception?.status === "REJECTED" ? t(lang, "Rejected · Finance review needed", "已退回 · 待财务核对")
        : t(lang, "Not requested · open to review evidence", "未申请 · 打开核对凭据");
      return <article key={row.id} style={{ background: "white", border: "1px solid #dbe3ed", borderRadius: 12, padding: 16 }}>
        <strong>{row.student.name}</strong> · {Number.isFinite(fee) ? `SGD ${fee.toFixed(2)}` : "—"} · {Number.isFinite(minutes) ? `${minutes / 60}h` : "—"}
        <p>{status}</p>
        {exception?.status === "ACTIVATED" ? <p>{t(lang, "Activated", "激活时间")}: {exception.activatedAt?.toLocaleString("en-SG")} · {t(lang, "Follow-up due", "补签跟进期限")}: {exception.signatureFollowUpDueAt?.toLocaleDateString("en-SG")}</p> : null}
        <a href={`/admin/packages/${encodeURIComponent(row.packageId)}/contract/renewal-exception?contractId=${encodeURIComponent(row.id)}`}>{t(lang, "Open renewal exception", "打开续费例外申请")}</a>
      </article>;
    })}
    {!rows.length ? <p>{t(lang, "No open cash exception requests.", "目前没有待处理的现金例外。")}</p> : null}
    {rows.length === 200 ? <p>{t(lang, "Showing the 200 most recent cash exceptions. For earlier requests, open the student’s package.", "显示最近 200 笔现金例外。更早的申请请打开学生课包查看。")}</p> : null}
  </main>;
}

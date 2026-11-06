import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { coerceSnapshot } from "@/lib/student-contract";

export default async function PendingRenewalSignaturesPage() {
  await requireAdmin();
  const lang = await getLang();
  const rows = await prisma.studentContract.findMany({
    where: { flowType: "RENEWAL", contractMode: "TUITION_AGREEMENT", signedAt: null, voidedAt: null, status: "READY_TO_SIGN", renewalOrder: { is: null }, package: { status: "ACTIVE", type: "HOURS", settlementMode: null } },
    include: { student: { select: { name: true } }, renewalSignatureException: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <main style={{ maxWidth: 1050, margin: "24px auto", padding: 18, display: "grid", gap: 14 }}>
    <a href="/admin/renewals/orders">Same-term renewal orders / 同条件续费确认与限额续课 →</a>
    <h1>{t(lang, "Renewal exceptions & parent signatures", "续费例外与家长补签")}</h1>
    <p>{t(lang, "Open the current unsigned tuition renewal to request an exception, review its approval, or follow up after activation. Appearing here does not mean payment is verified or the renewal is activated; the exception page checks the exact invoice, approved full cash receipts and your authorisation.", "从本次待签的普通课时续费进入，提交例外申请、查看审批或跟进激活后的补签。出现在此处不代表已核款或已激活；例外页会核对本次发票、足额已审批现金收据和账号权限。")}</p>
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
    {!rows.length ? <p>{t(lang, "No current unsigned tuition-hour renewals.", "目前没有待签的普通课时续费。")}</p> : null}
    {rows.length === 200 ? <p>{t(lang, "Showing the 200 most recent unsigned renewals. Open older packages through Package Workspace.", "显示最近200笔待签续费；更早记录请从课包财务工作区进入。")}</p> : null}
  </main>;
}

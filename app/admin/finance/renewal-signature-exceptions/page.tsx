import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function PendingRenewalSignaturesPage() {
  await requireAdmin();
  const lang = await getLang();
  const rows = await prisma.renewalSignatureException.findMany({
    where: { status: "ACTIVATED", contract: { signedAt: null, status: "READY_TO_SIGN" } },
    include: { contract: { include: { student: { select: { name: true } } } } },
    orderBy: { signatureFollowUpDueAt: "asc" },
    take: 200,
  });
  return <main style={{ maxWidth: 1050, margin: "24px auto", padding: 18, display: "grid", gap: 14 }}>
    <h1>{t(lang, "Renewals activated while parent signature is pending", "已激活、待家长补签的续费")}</h1>
    <p>{t(lang, "These packages were activated after management approval and verified full cash payment. The agreements are still unsigned; follow up with the parent.", "这些课包已在管理审批及足额现金核验后激活，合同仍未由家长签署，请继续跟进。")}</p>
    {rows.map(row => <article key={row.id} style={{ background: "white", border: "1px solid #dbe3ed", borderRadius: 12, padding: 16 }}>
      <strong>{row.contract.student.name}</strong> · SGD {(row.feeCents / 100).toFixed(2)} · {row.topUpMinutes / 60}h
      <p>{t(lang, "Activated", "激活时间")}: {row.activatedAt?.toLocaleString("en-SG")} · {t(lang, "Follow-up due", "补签跟进期限")}: {row.signatureFollowUpDueAt?.toLocaleDateString("en-SG")}</p>
      <Link href={`/admin/packages/${encodeURIComponent(row.contract.packageId)}/contract/renewal-exception?contractId=${encodeURIComponent(row.contractId)}`}>{t(lang, "Open and follow up", "打开并跟进")}</Link>
    </article>)}
    {!rows.length ? <p>{t(lang, "No outstanding parent signatures for activated exceptions.", "目前没有此类待补签合同。")}</p> : null}
  </main>;
}

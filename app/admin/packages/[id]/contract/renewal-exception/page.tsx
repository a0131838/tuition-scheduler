import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";
import { getLang, t } from "@/lib/i18n";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { prisma } from "@/lib/prisma";
import { getReceiptApprovalStatus } from "@/lib/receipt-approval-policy";
import { hasDedicatedCashPaymentRecord, isCashReceipt, renewalExceptionSnapshot } from "@/lib/renewal-signature-exception";
import { listParentBillingForPackage } from "@/lib/student-parent-billing";
import { buildStudentContractSignPath } from "@/lib/student-contract";
import { activateExceptionAction, requestExceptionAction, resendExceptionSignLinkAction, reviewExceptionAction } from "./actions";
import ManagementReviewForm from "./ManagementReviewForm";

const card = { border: "1px solid #dbe3ed", borderRadius: 12, background: "#fff", padding: 18, display: "grid", gap: 10 } as const;

export default async function RenewalSignatureExceptionPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contractId?: string; msg?: string; err?: string }>;
}) {
  const actor = await requireAdmin();
  const lang = await getLang();
  const { id: packageId } = await params;
  const { contractId, msg, err } = await searchParams;
  const [contract, roles, billing] = await Promise.all([
    contractId ? prisma.studentContract.findFirst({ where: { id: contractId, packageId }, include: { package: { include: { student: { select: { name: true } } } }, renewalSignatureException: true } }) : prisma.studentContract.findFirst({ where: { packageId, flowType: "RENEWAL", contractMode: "TUITION_AGREEMENT", status: "READY_TO_SIGN" }, orderBy: { createdAt: "desc" }, include: { package: { include: { student: { select: { name: true } } } }, renewalSignatureException: true } }),
    getApprovalRoleConfig(),
    listParentBillingForPackage(packageId),
  ]);
  if (!contract) notFound();
  if (!contract.contractSnapshotJson) return <main style={{ maxWidth: 800, margin: "24px auto", padding: 18 }}><Link href={`/admin/packages/${encodeURIComponent(packageId)}/contract`}>← {t(lang, "Back to contract", "返回合同")}</Link><p>{t(lang, "Prepare the formal renewal sign link before requesting this exception.", "请先完成合同草稿并生成正式续费签署链接，再申请例外。")}</p></main>;
  const canFinance = actor.role === "FINANCE" && isRoleApprover(actor.email, roles.financeApproverEmails);
  const canManager = isRoleApprover(actor.email, roles.managerApproverEmails);
  const exception = contract.renewalSignatureException;
  const details = renewalExceptionSnapshot(contract.contractSnapshotJson);
  const otherLinks = await prisma.studentContract.findMany({ where: { packageId, invoiceId: { in: billing.invoices.map(item => item.id) }, id: { not: contract.id }, status: { not: "VOID" } }, select: { invoiceId: true } });
  const linkedIds = new Set(otherLinks.map(item => item.invoiceId));
  const candidates = billing.invoices.filter(item => item.studentId === contract.studentId &&
    Math.round(item.totalAmount * 100) === details.feeCents &&
    new Date(item.createdAt).getTime() >= contract.createdAt.getTime() - 7 * 86400000 &&
    !linkedIds.has(item.id));
  const receiptIds = billing.receipts.map(item => item.id);
  const approvals = await getParentReceiptApprovalMap(receiptIds);
  const invoiceCashReady = (invoiceId: string) => {
    const rows = billing.receipts.filter(item => item.invoiceId === invoiceId && getReceiptApprovalStatus(approvals.get(item.id), roles) === "COMPLETED");
    return rows.length > 0 && rows.every(item => isCashReceipt(item.paidBy) && hasDedicatedCashPaymentRecord({ receipt: item, paymentRecords: billing.paymentRecords, allReceipts: billing.receipts, packageId, studentId: contract.studentId, contractCreatedAt: contract.createdAt })) && rows.reduce((sum, item) => sum + Math.round(item.amountReceived * 100), 0) === details.feeCents;
  };
  const approvedCash = billing.receipts.filter(item => item.invoiceId === exception?.invoiceId && isCashReceipt(item.paidBy) && getReceiptApprovalStatus(approvals.get(item.id), roles) === "COMPLETED");
  const approvedCashCents = approvedCash.reduce((sum, item) => sum + Math.round(item.amountReceived * 100), 0);
  const cashReady = Boolean(exception && invoiceCashReady(exception.invoiceId));
  const readyCandidates = candidates.filter(item => invoiceCashReady(item.id));
  const signed = Boolean(contract.signedAt);
  const signPath = contract.signToken ? buildStudentContractSignPath(contract.signToken) : null;
  const signExpired = Boolean(contract.signExpiresAt && contract.signExpiresAt.getTime() < Date.now());
  const managerView = canManager && !canFinance;
  const canReview = exception?.status === "REQUESTED" && canManager && actor.email.toLowerCase() !== exception.requestedBy;
  const fields = <><input type="hidden" name="packageId" value={packageId} /><input type="hidden" name="contractId" value={contract.id} /></>;
  return <main style={{ maxWidth: 1040, margin: "20px auto", padding: 16, display: "grid", gap: 16 }}>
    <section style={card}>
      <a href={`/admin/packages/${encodeURIComponent(packageId)}/${actor.role === "FINANCE" ? "billing" : "contract"}`}>← {actor.role === "FINANCE" ? t(lang, "Back to Package Billing", "返回课包账单") : t(lang, "Back to contract", "返回合同")}</a>
      <h1 style={{ margin: 0 }}>{t(lang, "Paid renewal with parent signature pending", "已核款、待家长补签的续费例外")}</h1>
      <p>{contract.package.student.name} · {details.topUpMinutes / 60}h · SGD {(details.feeCents / 100).toFixed(2)} · {t(lang, "Contract", "合同")} {contract.id}</p>
      <p>{t(lang, "Agreement status", "合同状态")}: {signed ? t(lang, "Parent signed", "家长已签署") : t(lang, "Parent e-signature pending", "家长电子签名待完成")} · {t(lang, "Exception status", "例外状态")}: {exception?.status || t(lang, "Not requested", "未申请")}</p>
      <p>{t(lang, "Payment does not mark the agreement as signed. Only the authorised Finance account can activate this exceptional renewal after current management approval and verified full cash receipts.", "付款不会把合同标记为已签署。只有指定财务账号在本次管理审批和足额现金收据核准后，才能例外激活续费。")}</p>
      {managerView && !signed && exception?.status !== "ACTIVATED" ? <div role="status" style={{ borderLeft: "4px solid #2563eb", background: "#eff6ff", padding: 12 }}>
        <strong>{exception?.status === "REQUESTED"
          ? canReview
            ? t(lang, "Finance has submitted this request. Your next step is management approval.", "财务已提交本次申请，下一步由您进行管理审批。")
            : t(lang, "Another authorised manager must review your request.", "您提交的申请须由另一位指定管理审批人审核。")
          : exception?.status === "APPROVED"
            ? t(lang, "Management approval is complete. Finance must now activate the renewal.", "管理审批已完成，下一步由财务激活续费。")
            : t(lang, "Finance must submit the renewal request before management can review it.", "请财务先提交本次续费申请，再由管理者审核。")}</strong>
        <p style={{ marginBottom: 0 }}>{t(lang, "Keep using your management account. You do not need a Finance account for management approval.", "请继续使用您的管理账号，管理审批不需要财务账号。")}</p>
        {canReview ? <a href="#management-review" style={{ display: "inline-block", marginTop: 10 }}>{t(lang, "Go to management approval below", "前往下方管理审批")}</a> : null}
      </div> : null}
      {msg ? <p id="renewal-result" role="status" style={{ color: "#166534", scrollMarginTop: 24 }}>{msg}</p> : null}
      {err ? <p id="renewal-result" role="alert" style={{ color: "#b91c1c", scrollMarginTop: 24 }}>{err}</p> : null}
    </section>

    {exception?.status !== "ACTIVATED" ? <section style={card}>
      <details open={!managerView}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t(lang, "1. Finance requests approval", "1. 财务提交例外申请")}{managerView ? ` — ${exception && exception.status !== "REJECTED" ? t(lang, "Submitted · view details", "已提交 · 查看详情") : t(lang, "Awaiting Finance · view details", "等待财务提交 · 查看详情")}` : ""}</summary>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <p>{t(lang, "Choose a new invoice for this exact renewal. Old invoices already linked to earlier signed contracts cannot be used. Create the invoice and cash receipt in Package Billing first.", "请选择本次续费的新发票。已关联旧签约合同的发票不能重复使用；请先在课包账单建立本次发票与现金收据。")}</p>
      {exception?.status === "APPROVED" ? <p style={{ color: "#92400e" }}>{t(lang, "Submitting a revised request cancels the previous management approval.", "重新提交申请会撤销上一次管理审批，须重新审核。")}</p> : null}
      <Link href={`/admin/packages/${encodeURIComponent(packageId)}/billing`}>{t(lang, "Open Package Billing", "打开课包账单")}</Link>
      {!canFinance && !canManager && !signed ? <div role="status" style={{ border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 8, padding: 12 }}>
        <strong>{t(lang, "A configured Finance account is required to submit this request", "提交此申请需要本人指定的 Finance 财务账号")}</strong>
        <p>{t(lang, "Current account", "当前账号")}: {actor.name} · {actor.role}</p>
        <p>{t(lang, "The request form is hidden because this account does not have both the Finance role and configured Finance-approver authorisation. Log out and sign in with your own authorised Finance account. Managers can review after Finance submits the request.", "此账号未同时满足 Finance 财务角色和指定财务审批资格，所以不显示申请表。请退出后使用本人已授权的财务账号登录；管理者在财务提交后进行审核。")}</p>
        <Link href="/admin/logout">{t(lang, "Log out to switch account", "退出并切换账号")}</Link>
      </div> : null}
      {canFinance && !signed ? <form action={requestExceptionAction} style={{ display: "grid", gap: 10 }}>{fields}
        <select name="invoiceId" required defaultValue={exception?.invoiceId || ""}><option value="">{t(lang, "Select current renewal invoice", "选择本次续费发票")}</option>{candidates.map(item => <option key={item.id} value={item.id} disabled={!invoiceCashReady(item.id)}>{item.invoiceNo} · SGD {item.totalAmount.toFixed(2)}{invoiceCashReady(item.id) ? "" : ` · ${t(lang, "cash verification pending", "现金核验未完成")}`}</option>)}</select>
        <textarea name="reason" required minLength={20} maxLength={2000} rows={4} placeholder={t(lang, "Explain the cash payment, why signing is pending, and how the parent will be followed up.", "写明本次现金付款、未签原因，以及家长补签安排。")}/>
        <button disabled={!readyCandidates.length}>{t(lang, "Submit or update management request", "提交或更新管理审批申请")}</button>
      </form> : null}
      {!candidates.length ? <p role="status" style={{ color: "#b45309" }}>{t(lang, "No eligible invoice for this renewal has been found.", "目前没有找到属于这次续费的合格发票。")}</p> : null}
      {exception?.managerRejectReason ? <p>{t(lang, "Previous rejection", "上次退回原因")}: {exception.managerRejectReason}</p> : null}
      </div>
      </details>
    </section> : null}

    {exception && exception.status !== "REJECTED" ? <section id="management-review" style={{ ...card, scrollMarginTop: 24 }}>
      <h2>{t(lang, "2. Management approval and payment check", "2. 管理审批与收款核验")}</h2>
      <p>{t(lang, "Requested by", "申请人")}: {exception.requestedBy} · {t(lang, "Invoice", "发票")}: {billing.invoices.find(item => item.id === exception.invoiceId)?.invoiceNo || exception.invoiceId}</p>
      <p>{t(lang, "Request reason", "申请原因")}: {exception.requestReason}</p>
      <p>{t(lang, "Approved cash receipts", "已审批现金收据")}: {approvedCash.map(item => item.receiptNo).join(", ") || "—"} · SGD {(approvedCashCents / 100).toFixed(2)} / {(details.feeCents / 100).toFixed(2)}</p>
      {!cashReady && exception.status !== "ACTIVATED" ? <p role="status" style={{ color: "#b45309" }}>{t(lang, "Activation waits for exact full cash receipts and matching cash payment records for this invoice.", "激活前须完成本次发票的足额现金收据审批，并关联对应现金付款记录。")}</p> : null}
      {exception.managerApprovedAt ? <p>{t(lang, "Manager approved", "管理已批准")}: {exception.managerApprovedBy} · {exception.managerApprovedAt.toLocaleString("en-SG")}</p> : null}
      {canReview ? <ManagementReviewForm action={reviewExceptionAction} lang={lang} reviewPath={`/admin/packages/${encodeURIComponent(packageId)}/contract/renewal-exception`} contractId={contract.id}>{fields}
        <textarea name="note" maxLength={2000} rows={3} placeholder={t(lang, "Manager note, or reason for rejection", "管理备注，或退回原因")}/>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}><button name="decision" value="APPROVE">{t(lang, "Approve this renewal exception", "批准本次续费例外")}</button><button name="decision" value="REJECT">{t(lang, "Reject with reason", "填写原因并退回")}</button></div>
      </ManagementReviewForm> : null}
      {exception.status === "APPROVED" && managerView ? <p role="status" style={{ color: "#166534" }}>{t(lang, "Your management step is complete. Ask authorised Finance to activate this renewal; management approval alone does not add lesson hours.", "管理审批步骤已完成。请指定财务激活本次续费；管理批准本身不会增加课时。")}</p> : null}
      {exception.status === "APPROVED" && canFinance ? <form action={activateExceptionAction} style={{ display: "grid", gap: 10 }}>{fields}
        <textarea name="reason" required minLength={20} maxLength={2000} rows={4} defaultValue="E-Service Agreement – Parent's e-signature pending. Renewal activated by Finance upon verification of full cash payment and prior management approval." />
        <p>{t(lang, "Check the invoice, approved cash receipts and parent follow-up before activating. The server checks all evidence again.", "激活前请核对本次发票、已审批现金收据与家长补签安排。服务器会重新核验全部凭据。")}</p>
        <button disabled={!cashReady}>{t(lang, "Activate renewal with signature pending", "待家长补签，财务例外激活续费")}</button>
      </form> : null}
    </section> : null}

    {exception?.status === "ACTIVATED" ? <section style={card}>
      <h2>{t(lang, "3. Follow up on the parent's signature", "3. 跟进家长补签")}</h2>
      <p>{t(lang, "Renewal activated on verified payment; parent e-signature remains outstanding", "续费已按核实收款例外激活；家长电子签名仍待完成")} · {exception.activatedAt?.toLocaleString("en-SG")}</p>
      <p>{t(lang, "Activated by", "激活人")}: {exception.activatedBy} · {t(lang, "Signature follow-up due", "补签跟进期限")}: {exception.signatureFollowUpDueAt?.toLocaleDateString("en-SG")}</p>
      <p>{t(lang, "Activation reason", "激活备注")}: {exception.activationReason}</p>
      {!cashReady ? <p role="alert" style={{ color: "#b91c1c" }}>{t(lang, "Payment evidence has changed since activation. Finance must reconcile the invoice, receipts and lesson ledger immediately.", "激活后的收款凭据已发生变化，财务须立即核对发票、收据及课时流水。")}</p> : null}
      {signed ? <p style={{ color: "#166534" }}>{t(lang, "Parent signature completed; no additional hours were added.", "家长已补签；系统未重复增加课时。")}</p> : <><p>{t(lang, "Send the formal sign link to the parent and keep following up.", "请向家长发送正式签署链接并继续跟进。")}</p>{signPath && !signExpired ? <a href={signPath} target="_blank" rel="noreferrer">{t(lang, "Open parent sign link", "打开家长签署链接")}</a> : null}{signExpired && (canFinance || canManager) ? <form action={resendExceptionSignLinkAction}>{fields}<button>{t(lang, "Refresh expired sign link", "刷新过期签署链接")}</button></form> : null}</>}
    </section> : null}
  </main>;
}

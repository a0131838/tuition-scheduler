"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";
import { activateRenewalSignatureException, requestRenewalSignatureException, reviewRenewalSignatureException } from "@/lib/renewal-signature-exception";
import { refreshStudentContractSignLink } from "@/lib/student-contract";
import { prisma } from "@/lib/prisma";

function path(packageId: string, contractId: string, message: string, error = false) {
  const params = new URLSearchParams({ contractId, [error ? "err" : "msg"]: message });
  return `/admin/packages/${encodeURIComponent(packageId)}/contract/renewal-exception?${params}`;
}

async function run(formData: FormData, callback: (input: { packageId: string; contractId: string; actor: Awaited<ReturnType<typeof requireAdmin>> }) => Promise<unknown>, successMessage = "Saved / 已保存") {
  const actor = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  if (!packageId || !contractId) redirect("/admin/packages");
  try {
    await callback({ packageId, contractId, actor });
  } catch (error) {
    return path(packageId, contractId, error instanceof Error ? error.message : "Action failed / 操作未完成", true);
  }
  return path(packageId, contractId, successMessage);
}

export async function requestExceptionAction(formData: FormData) {
  redirect(await run(formData, async ({ packageId, contractId, actor }) => {
    if (!contractId || !packageId) throw new Error("Missing contract / 缺少合同");
    await requestRenewalSignatureException({ contractId, invoiceId: String(formData.get("invoiceId") ?? ""), reason: String(formData.get("reason") ?? ""), actor });
  }));
}

export async function reviewExceptionAction(formData: FormData) {
  const approve = formData.get("decision") === "APPROVE";
  return run(formData, async ({ contractId, actor }) => {
    await reviewRenewalSignatureException({ contractId, approve, note: String(formData.get("note") ?? ""), actor });
  }, approve
    ? "Management approval recorded. Finance must now verify and activate the renewal; lesson hours have not been added yet. / 管理审批已完成。下一步由财务复核并激活续费；尚未增加课时。"
    : "Request returned to Finance. Finance must revise and resubmit it before management can review again. / 申请已退回财务，请财务修改并重新提交后再进行管理审批。");
}

export async function activateExceptionAction(formData: FormData) {
  redirect(await run(formData, async ({ contractId, actor }) => {
    await activateRenewalSignatureException({ contractId, reason: String(formData.get("reason") ?? ""), actor });
  }));
}

export async function resendExceptionSignLinkAction(formData: FormData) {
  redirect(await run(formData, async ({ contractId, packageId, actor }) => {
    const roles = await getApprovalRoleConfig();
    const allowed = (actor.role === "FINANCE" && isRoleApprover(actor.email, roles.financeApproverEmails)) || isRoleApprover(actor.email, roles.managerApproverEmails);
    if (!allowed) throw new Error("Only the assigned Finance or management approver can refresh this sign link / 仅指定财务或管理审批人可刷新签署链接");
    const exception = await prisma.renewalSignatureException.findUnique({ where: { contractId }, include: { contract: { select: { packageId: true, signedAt: true } } } });
    if (exception?.status !== "ACTIVATED" || exception.contract.packageId !== packageId || exception.contract.signedAt) {
      throw new Error("This renewal is not awaiting a parent signature / 本次续费并非待家长补签状态");
    }
    await refreshStudentContractSignLink({ contractId, actorUserId: actor.id, actorLabel: actor.email });
  }));
}

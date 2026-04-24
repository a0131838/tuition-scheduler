import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkbenchStatusChip from "@/app/admin/_components/WorkbenchStatusChip";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";
import {
  buildStudentContractIntakePath,
  buildStudentContractSignPath,
  createStudentContractDraft,
  deleteVoidStudentContractDraft,
  detachDeletedInvoiceFromStudentContract,
  hasReusableStudentContractParentInfo,
  listStudentContractsForPackage,
  prepareStudentContractForSigning,
  refreshStudentContractIntakeLink,
  saveStudentContractBusinessDraft,
  studentContractFlowLabel,
  studentContractFlowLabelZh,
  studentContractStatusLabel,
  studentContractStatusLabelZh,
  voidStudentContract,
} from "@/lib/student-contract";
import { isPartnerSettlementPackage } from "@/lib/package-finance-gate";
import {
  deleteParentInvoice,
  listDeletedParentInvoicesForPackage,
  listParentBillingForPackage,
} from "@/lib/student-parent-billing";

function normalizePackageBillingSource(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "receipts" ? "receipts" : "";
}

function sanitizeReceiptsBack(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/admin/receipts-approvals")) return "/admin/receipts-approvals";
  return normalized.slice(0, 2000);
}

function buildPackageBillingHref(
  packageId: string,
  options?: {
    sourceWorkflow?: string;
    receiptsBack?: string;
    msg?: string;
    err?: string;
  }
) {
  const params = new URLSearchParams();
  if (options?.sourceWorkflow === "receipts") {
    params.set("source", "receipts");
    params.set("receiptsBack", sanitizeReceiptsBack(options.receiptsBack));
  }
  if (options?.msg) params.set("msg", options.msg);
  if (options?.err) params.set("err", options.err);
  const query = params.toString();
  return `/admin/packages/${encodeURIComponent(packageId)}/billing${query ? `?${query}` : ""}`;
}

function buildPackageContractHref(
  packageId: string,
  options?: {
    sourceWorkflow?: string;
    receiptsBack?: string;
    msg?: string;
    err?: string;
  }
) {
  const params = new URLSearchParams();
  if (options?.sourceWorkflow === "receipts") {
    params.set("source", "receipts");
    params.set("receiptsBack", sanitizeReceiptsBack(options.receiptsBack));
  }
  if (options?.msg) params.set("msg", options.msg);
  if (options?.err) params.set("err", options.err);
  const query = params.toString();
  return `/admin/packages/${encodeURIComponent(packageId)}/contract${query ? `?${query}` : ""}`;
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
}

function contractTone(status: string): "neutral" | "warn" | "success" | "error" {
  switch (status) {
    case "INFO_PENDING":
    case "INTAKE_PENDING":
    case "INTAKE_SUBMITTED":
    case "CONTRACT_DRAFT":
      return "warn";
    case "READY_TO_SIGN":
    case "SIGNED":
    case "INVOICE_CREATED":
      return "success";
    case "EXPIRED":
    case "VOID":
      return "error";
    default:
      return "neutral";
  }
}

function contractNeedsParentInfo(status: string) {
  return status === "INFO_PENDING" || status === "INTAKE_PENDING";
}

function contractCanEditDraft(status: string) {
  return (
    status === "INTAKE_SUBMITTED" ||
    status === "INFO_SUBMITTED" ||
    status === "CONTRACT_DRAFT" ||
    status === "READY_TO_SIGN" ||
    status === "EXPIRED"
  );
}

function contractIsTerminal(status: string) {
  return status === "SIGNED" || status === "INVOICE_CREATED" || status === "VOID";
}

function contractCanDeleteVoidDraft(contract: {
  status: string;
  signedAt: Date | null;
  invoiceId: string | null;
  invoiceNo: string | null;
  invoiceCreatedAt: Date | null;
}) {
  return (
    contract.status === "VOID" &&
    !contract.signedAt &&
    !contract.invoiceId &&
    !contract.invoiceNo &&
    !contract.invoiceCreatedAt
  );
}

async function deleteInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !invoiceId) {
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing invoice id" }));
  }
  try {
    await deleteParentInvoice({ invoiceId, actorEmail: admin.email });
    await detachDeletedInvoiceFromStudentContract({
      invoiceId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete invoice failed";
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageContractHref(packageId, {
    sourceWorkflow,
    receiptsBack,
    msg: "Old invoice draft deleted. You can now create a replacement contract version.",
  }));
}

async function createContractDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const flowTypeRaw = String(formData.get("flowType") ?? "").trim();
  const replacementFromContractId = String(formData.get("replacementFromContractId") ?? "").trim() || null;
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !studentId) {
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract target" }));
  }
  try {
    await createStudentContractDraft({
      packageId,
      studentId,
      createdByUserId: admin.id,
      flowType: flowTypeRaw === "RENEWAL" ? "RENEWAL" : "NEW_PURCHASE",
      replacementFromContractId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Create contract draft failed";
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(
    buildPackageContractHref(packageId, {
      sourceWorkflow,
      receiptsBack,
      msg: replacementFromContractId
        ? "Replacement contract draft created"
        : flowTypeRaw === "RENEWAL"
          ? "Renewal contract draft created"
          : "Parent info link created",
    })
  );
}

async function resendContractIntakeAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await refreshStudentContractIntakeLink({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Refresh intake link failed";
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, msg: "Parent info link refreshed" }));
}

async function prepareContractSignAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await saveStudentContractBusinessDraft({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
      businessInfo: {
        totalMinutes: Number(String(formData.get("totalMinutes") ?? "").trim() || 0),
        feeAmount: Number(String(formData.get("feeAmount") ?? "").trim() || 0),
        billTo: String(formData.get("billTo") ?? "").trim(),
        agreementDateIso: String(formData.get("agreementDateIso") ?? "").trim(),
      },
    });
    await prepareStudentContractForSigning({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Prepare sign link failed";
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, msg: "Contract details saved and sign link is ready" }));
}

async function voidContractAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await voidStudentContract({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
      reason,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Void contract failed";
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, msg: "Contract marked as void" }));
}

async function deleteVoidContractDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await deleteVoidStudentContractDraft({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Delete void contract draft failed";
    redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageContractHref(packageId, { sourceWorkflow, receiptsBack, msg: "Void draft deleted" }));
}

export default async function PackageContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string; source?: string; receiptsBack?: string }>;
}) {
  await requireAdmin();
  const { id: packageId } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const sourceWorkflow = normalizePackageBillingSource(sp?.source);
  const receiptsBack = sanitizeReceiptsBack(sp?.receiptsBack);
  const lang = await getLang();

  const [pkg, data, packageContracts, hasRenewalContractParentInfo, latestParentIntakeForPackage, deletedInvoiceHistory] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: { student: true, course: true },
    }),
    listParentBillingForPackage(packageId),
    listStudentContractsForPackage(packageId),
    prisma.coursePackage
      .findUnique({ where: { id: packageId }, select: { studentId: true } })
      .then((row) => (row ? hasReusableStudentContractParentInfo(row.studentId, packageId) : false)),
    prisma.studentParentIntake.findFirst({
      where: { packageId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    listDeletedParentInvoicesForPackage(packageId),
  ]);

  if (!pkg) redirect("/admin/packages?err=Package+not+found");

  const usesStudentContractFlow = !isPartnerSettlementPackage(pkg.settlementMode);
  const latestContract = packageContracts.find((contract) => contract.status !== "VOID") ?? null;
  const voidContracts = packageContracts.filter((contract) => contract.status === "VOID");
  const deletableVoidContracts = voidContracts.filter((contract) => contractCanDeleteVoidDraft(contract));
  const archivedVoidContracts = voidContracts.filter((contract) => !contractCanDeleteVoidDraft(contract));
  const invoiceMap = new Map(data.invoices.map((x) => [x.id, x]));
  const latestContractInvoice = latestContract?.invoiceId ? invoiceMap.get(latestContract.invoiceId) ?? null : null;
  const latestContractInvoiceReceipts = latestContractInvoice
    ? data.receipts.filter((receipt) => receipt.invoiceId === latestContractInvoice.id)
    : [];
  const canDeleteLatestContractInvoiceDraft = Boolean(latestContractInvoice) && latestContractInvoiceReceipts.length === 0;
  const baseUrl = appBaseUrl();
  const contractIntakePath = latestContract?.intakeToken ? buildStudentContractIntakePath(latestContract.intakeToken) : "";
  const contractSignPath = latestContract?.signToken ? buildStudentContractSignPath(latestContract.signToken) : "";
  const contractIntakeShare = contractIntakePath ? `${baseUrl}${contractIntakePath}` || contractIntakePath : "";
  const contractSignShare = contractSignPath ? `${baseUrl}${contractSignPath}` || contractSignPath : "";
  const contractBusinessInfo = latestContract?.businessInfo ?? null;
  const contractParentInfo = latestContract?.parentInfo ?? null;
  const likelyLegacyNoContract =
    usesStudentContractFlow &&
    !latestContract &&
    Boolean(
      data.invoices.length > 0 ||
        data.receipts.length > 0 ||
        pkg.paid ||
        pkg.paidAt ||
        (pkg.totalMinutes ?? 0) > (pkg.remainingMinutes ?? 0)
    );
  const contractFromParentIntake =
    Boolean(latestContract && latestParentIntakeForPackage && latestParentIntakeForPackage.contractId === latestContract.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h2>{t(lang, "Package Contract Workspace", "课包合同工作台")}</h2>
      <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a href={buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack })}>← {t(lang, "Back to Package Billing", "返回课包账单")}</a>
        <span style={{ color: "#94a3b8" }}>·</span>
        <a href="/admin/packages">{t(lang, "Back to Packages", "返回课包列表")}</a>
      </div>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      {!usesStudentContractFlow ? (
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 14, background: "#f8fafc", padding: 16, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Contract flow not used", "当前不使用合同流程")}</div>
          <div style={{ color: "#475569", fontSize: 14 }}>
            {t(lang, "Partner settlement packages stay outside the student contract workflow, so there is no separate contract workspace for this package.", "合作方课包不走学生合同流程，因此这个课包没有单独的合同工作台。")}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ border: "1px solid #dbeafe", borderRadius: 14, background: "#f8fbff", padding: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 800 }}>{t(lang, "Contract flow", "合同流程")}</div>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  {t(lang, "This page keeps parent links, draft details, signed history, and replacement versions together so package billing can stay focused on invoices and receipts.", "这个页面集中处理家长链接、合同草稿、已签历史和更正版本，课包账单页则聚焦发票与收据。")}
                </div>
              </div>
              {latestContract ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <WorkbenchStatusChip
                    label={`${studentContractStatusLabel(latestContract.status)} / ${studentContractStatusLabelZh(latestContract.status)}`}
                    tone={contractTone(latestContract.status)}
                    strong={contractNeedsParentInfo(latestContract.status) || latestContract.status === "READY_TO_SIGN"}
                  />
                  <WorkbenchStatusChip
                    label={`${studentContractFlowLabel(latestContract.flowType)} / ${studentContractFlowLabelZh(latestContract.flowType)}`}
                    tone="neutral"
                  />
                </div>
              ) : (
                <WorkbenchStatusChip label={t(lang, "No contract yet / 尚无合同", "No contract yet / 尚无合同")} tone="neutral" />
              )}
            </div>

            {latestContract ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Current stage", "当前阶段")}</div>
                    <div style={{ fontWeight: 800 }}>
                      {studentContractStatusLabel(latestContract.status)} / {studentContractStatusLabelZh(latestContract.status)}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      {contractNeedsParentInfo(latestContract.status)
                        ? t(lang, "Waiting for the parent to submit their profile details.", "正在等待家长提交资料。")
                        : latestContract.status === "INTAKE_SUBMITTED"
                          ? t(lang, "Parent details are in. The school team should complete fee and hours before sending the formal contract.", "家长资料已到位，接下来请教务补充课时与费用，再发送正式合同。")
                          : latestContract.status === "CONTRACT_DRAFT"
                            ? t(lang, "Commercial details are editable here. Save changes, then generate the formal sign link.", "课时和费用可以在这里修改。保存后再生成正式签字链接。")
                            : latestContract.status === "READY_TO_SIGN"
                              ? t(lang, "The formal sign link is ready. If you change the draft below, the sign link will be regenerated.", "正式签字链接已准备好。如果修改下方合同内容，需要重新生成签字链接。")
                              : latestContract.status === "INVOICE_CREATED"
                                ? latestContract.flowType === "RENEWAL"
                                  ? t(lang, "Parent signing is complete. The renewal hours have been added to the package and the linked invoice draft is ready for billing.", "家长签字已完成，续费课时已经加回课包，对应发票草稿也已生成，可以继续后续收费流程。")
                                  : t(lang, "Parent signing is complete and the linked invoice draft is ready for the billing workflow.", "家长签字已完成，对应发票草稿也已生成，可以继续后续收费流程。")
                                : t(lang, "This contract is archived or closed. Create a new one only if a new contract version is truly needed.", "当前合同已经完成或关闭。只有确实需要新版本时，才重新创建。")}
                    </div>
                  </div>

                  {latestContract.flowType === "NEW_PURCHASE" ? (
                    <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {contractFromParentIntake ? t(lang, "Parent intake record", "家长资料记录") : t(lang, "Parent info link", "家长资料链接")}
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {contractFromParentIntake
                          ? t(lang, "Submitted before student creation", "已在建学生前提交")
                          : latestContract.intakeExpiresAt
                            ? t(lang, `Expires ${latestContract.intakeExpiresAt.toLocaleString("en-SG")}`, `有效至 ${latestContract.intakeExpiresAt.toLocaleString("zh-CN")}`)
                            : t(lang, "No expiry", "无过期时间")}
                      </div>
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        {contractNeedsParentInfo(latestContract.status)
                          ? t(lang, "Waiting for the parent to finish the profile form. Resend only if the link expires or the parent cannot find it.", "正在等待家长完成资料表。只有链接过期或家长找不到时才需要重发。")
                          : t(lang, "Parent details are already on file, so the school team can move on to lesson hours and fee details.", "家长资料已经在系统里，教务现在可以继续补课时和费用。")}
                      </div>
                      {!contractFromParentIntake && contractIntakePath ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <a href={contractIntakePath} target="_blank" rel="noreferrer">
                            {t(lang, "Open info link", "打开资料链接")}
                          </a>
                          <CopyTextButton
                            text={contractIntakeShare}
                            label={t(lang, "Copy info link", "复制资料链接")}
                            copiedLabel={t(lang, "Copied", "已复制")}
                            style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 10px", fontWeight: 700 }}
                          />
                        </div>
                      ) : null}
                      {contractParentInfo ? (
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                          {contractParentInfo.parentFullNameEn} · {contractParentInfo.phone} · {contractParentInfo.email}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Renewal contract mode", "续费合同模式")}</div>
                      <div style={{ fontWeight: 700 }}>{t(lang, "Parent profile reused", "复用家长资料")}</div>
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        {contractParentInfo
                          ? `${contractParentInfo.parentFullNameEn} · ${contractParentInfo.phone} · ${contractParentInfo.email}`
                          : t(lang, "This renewal contract reuses the latest signed parent profile on the student record.", "当前续费合同会复用该学生最近一次已确认的家长资料。")}
                        <br />
                        {t(lang, "After the parent signs, the system will auto-create the invoice draft and add the renewal hours to this package.", "家长签字后，系统会自动生成发票草稿，并把这次续费课时加入当前课包。")}
                      </div>
                    </div>
                  )}

                  <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Formal sign link", "正式签字链接")}</div>
                    <div style={{ fontWeight: 700 }}>
                      {latestContract.signToken
                        ? latestContract.signExpiresAt
                          ? t(lang, `Expires ${latestContract.signExpiresAt.toLocaleString("en-SG")}`, `有效至 ${latestContract.signExpiresAt.toLocaleString("zh-CN")}`)
                          : t(lang, "Ready to sign", "可签署")
                        : t(lang, "Not generated yet", "尚未生成")}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      {latestContract.status === "READY_TO_SIGN"
                        ? latestContract.signViewedAt
                          ? t(
                              lang,
                              `Viewed by parent on ${latestContract.signViewedAt.toLocaleString("en-SG")}. Resend only if the link has expired or the business details changed.`,
                              `家长已于 ${latestContract.signViewedAt.toLocaleString("zh-CN")} 打开过签字链接。只有链接过期或商务信息变化时，才需要重发。`
                            )
                          : t(lang, "Waiting for the parent to open and sign the formal agreement.", "正在等待家长打开并签署正式合同。")
                        : latestContract.signToken
                          ? t(lang, "This contract version already has a formal sign link attached.", "这份合同版本已经带有正式签字链接。")
                          : t(lang, "Generate the formal sign link after the school checks lesson hours and fee details.", "教务确认课时和费用后，再生成正式签字链接。")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {contractSignPath ? (
                        <>
                          <a href={contractSignPath} target="_blank" rel="noreferrer">
                            {t(lang, "Open sign link", "打开签字链接")}
                          </a>
                          <CopyTextButton
                            text={contractSignShare}
                            label={t(lang, "Copy sign link", "复制签字链接")}
                            copiedLabel={t(lang, "Copied", "已复制")}
                            style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 10px", fontWeight: 700 }}
                          />
                        </>
                      ) : null}
                      {latestContract.contractSnapshot ? (
                        <a href={`/api/exports/student-contract/${encodeURIComponent(latestContract.id)}`} target="_blank" rel="noreferrer">
                          {t(lang, "Preview contract PDF", "预览合同 PDF")}
                        </a>
                      ) : null}
                      {latestContract.signedPdfPath ? (
                        <a href={`/api/exports/student-contract/${encodeURIComponent(latestContract.id)}?download=1`}>
                          {t(lang, "Download signed PDF", "下载已签署 PDF")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                {contractCanEditDraft(latestContract.status) && (latestContract.flowType === "RENEWAL" || contractParentInfo) ? (
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: 14, display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 800 }}>{t(lang, "Contract draft details", "合同草稿信息")}</div>
                      <div style={{ color: "#475569", fontSize: 13 }}>
                        {t(lang, "Keep only the business fields here: lesson hours, fee amount, bill-to, and agreement date. Save once and the system will prepare the latest sign link for you.", "这里只保留教务需要补充的业务字段：课时、费用、开票对象和合同日期。保存一次，系统就会按最新内容生成签字链接。")}
                      </div>
                    </div>
                    <form action={prepareContractSignAction} style={{ display: "grid", gap: 12 }}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="contractId" value={latestContract.id} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Total minutes / 总课时分钟", "Total minutes / 总课时分钟")}</span>
                          <input name="totalMinutes" type="number" min={0} defaultValue={contractBusinessInfo?.totalMinutes ?? pkg.totalMinutes ?? ""} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Fee amount / 合同金额", "Fee amount / 合同金额")}</span>
                          <input name="feeAmount" type="number" min={0} step="0.01" defaultValue={contractBusinessInfo?.feeAmount ?? pkg.paidAmount ?? ""} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Bill to / 开票对象", "Bill to / 开票对象")}</span>
                          <input name="billTo" defaultValue={contractBusinessInfo?.billTo ?? pkg.student.name} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Agreement date / 合同日期", "Agreement date / 合同日期")}</span>
                          <input name="agreementDateIso" type="date" defaultValue={contractBusinessInfo?.agreementDateIso ?? today} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 700 }}>
                          {latestContract.status === "READY_TO_SIGN"
                            ? t(lang, "Save and refresh sign link", "保存并刷新签字链接")
                            : t(lang, "Save and generate sign link", "保存并生成签字链接")}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {latestContract.signedAt || latestContract.invoiceNo || latestContract.status === "INVOICE_CREATED" ? (
                  <div style={{ border: "1px solid #bbf7d0", borderRadius: 12, background: "#f0fdf4", padding: 14, display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 800, color: "#166534" }}>{t(lang, "Signed result", "签署完成结果")}</div>
                    <div style={{ color: "#166534", fontSize: 13 }}>
                      {t(
                        lang,
                        latestContract.invoiceId
                          ? "The parent has finished signing. The billing lane now has a linked invoice draft for the next finance steps."
                          : "The parent has finished signing. The old invoice draft has already been removed, so this signed version now stays in history while you prepare the corrected contract version.",
                        latestContract.invoiceId
                          ? "家长已经完成签字，系统也已经把对应发票草稿接回当前课包的收费流程。"
                          : "家长已经完成签字。旧发票草稿已删除，这份已签版本会保留在历史里，接下来请创建更正合同版本。"
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#166534" }}>
                      <span>{t(lang, "Invoice", "发票")}: {latestContract.invoiceNo ?? "-"}</span>
                      {latestContract.invoiceCreatedAt ? (
                        <span>{t(lang, "Created", "创建于")}: {latestContract.invoiceCreatedAt.toLocaleString(lang === "ZH" ? "zh-CN" : "en-SG")}</span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {latestContract.invoiceId ? (
                        <a href={`/api/exports/parent-invoice/${encodeURIComponent(latestContract.invoiceId)}`} target="_blank" rel="noreferrer">
                          {t(lang, "Open invoice PDF", "打开对应发票 PDF")}
                        </a>
                      ) : null}
                      <a href={buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack }) + "#invoices"}>
                        {t(lang, "Open invoice lane", "打开发票区")}
                      </a>
                      {canDeleteLatestContractInvoiceDraft && latestContractInvoice ? (
                        <form action={deleteInvoiceAction}>
                          <input type="hidden" name="packageId" value={packageId} />
                          <input type="hidden" name="invoiceId" value={latestContractInvoice.id} />
                          <input type="hidden" name="source" value={sourceWorkflow} />
                          <input type="hidden" name="receiptsBack" value={receiptsBack} />
                          <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #b45309", background: "#fff7ed", color: "#9a3412", fontWeight: 700 }}>
                            {t(lang, "Delete old invoice draft", "删除旧发票草稿")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {latestContract.flowType === "NEW_PURCHASE" && !contractIsTerminal(latestContract.status) && !contractFromParentIntake ? (
                    <form action={resendContractIntakeAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="contractId" value={latestContract.id} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#fff", color: "#2563eb", fontWeight: 700 }}>
                        {t(lang, "Resend parent info link", "重发资料链接")}
                      </button>
                    </form>
                  ) : null}
                  {!contractIsTerminal(latestContract.status) ? (
                    <form action={voidContractAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="contractId" value={latestContract.id} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <input name="reason" placeholder={t(lang, "Void reason", "作废原因")} style={{ minWidth: 220, padding: "8px 10px", borderRadius: 10, border: "1px solid #fca5a5" }} />
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #dc2626", background: "#fff1f2", color: "#b91c1c", fontWeight: 700 }}>
                        {t(lang, "Void contract", "作废合同")}
                      </button>
                    </form>
                  ) : null}
                </div>

                {contractIsTerminal(latestContract.status) ? (
                  <div style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fff7f7", padding: 14, display: "grid", gap: 10 }}>
                    <div style={{ fontWeight: 800, color: "#991b1b" }}>{t(lang, "Need a corrected contract version?", "需要更正这份合同吗？")}</div>
                    <div style={{ color: "#7f1d1d", fontSize: 13, lineHeight: 1.6 }}>
                      {t(lang, "Signed or invoiced contracts stay in history, so the Void button is no longer available here. Instead of editing or voiding the old one, stop using the old invoice draft and create a replacement version for the parent to sign.", "已经签过或开过票的合同会保留在历史中，所以这里不会再显示作废按钮。不要继续修改或作废旧合同，请先停用旧发票草稿，再创建一份更正版本给家长重新签字。")}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <a href={buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack }) + "#invoices"}>
                        {t(lang, "Open old invoice lane first", "先打开旧发票区")}
                      </a>
                      <form action={createContractDraftAction}>
                        <input type="hidden" name="packageId" value={packageId} />
                        <input type="hidden" name="studentId" value={pkg.studentId} />
                        <input type="hidden" name="flowType" value={latestContract.flowType} />
                        <input type="hidden" name="replacementFromContractId" value={latestContract.id} />
                        <input type="hidden" name="source" value={sourceWorkflow} />
                        <input type="hidden" name="receiptsBack" value={receiptsBack} />
                        <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #991b1b", background: "#991b1b", color: "#fff", fontWeight: 700 }}>
                          {latestContract.flowType === "RENEWAL"
                            ? t(lang, "Create replacement renewal contract", "创建新的续费合同版本")
                            : t(lang, "Create replacement first-purchase contract", "创建新的首购合同版本")}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  {t(lang, "Use first-purchase flow when the parent still needs to submit profile details. Use renewal only when the student already has a confirmed parent profile from an earlier contract.", "如果家长资料还没收集，请走首购流程；只有学生已经有上一份确认过的家长资料时，才直接走续费合同。")}
                </div>
                {likelyLegacyNoContract ? (
                  <div style={{ border: "1px solid #fed7aa", borderRadius: 12, background: "#fff7ed", padding: 12, color: "#9a3412", fontSize: 13, lineHeight: 1.6 }}>
                    {t(lang, "Legacy direct-billing package without contract history detected. The current package can continue, but the next renewal should use the renewal contract flow instead of manual top-up.", "系统识别到这像是一条历史存量直客课包，目前还没有合同历史。当前课包可继续使用，但下一次续费应改走续费合同流程，而不是手工 top-up。")}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <form action={createContractDraftAction}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="studentId" value={pkg.studentId} />
                    <input type="hidden" name="flowType" value="NEW_PURCHASE" />
                    <input type="hidden" name="source" value={sourceWorkflow} />
                    <input type="hidden" name="receiptsBack" value={receiptsBack} />
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 700 }}>
                      {t(lang, "Send parent info link", "发送家长资料链接")}
                    </button>
                  </form>
                  {hasRenewalContractParentInfo ? (
                    <form action={createContractDraftAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="studentId" value={pkg.studentId} />
                      <input type="hidden" name="flowType" value="RENEWAL" />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #16a34a", background: "#fff", color: "#166534", fontWeight: 700 }}>
                        {t(lang, "Create renewal contract", "创建续费合同")}
                      </button>
                    </form>
                  ) : (
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      {t(lang, "No reusable parent profile yet, so renewal contract is hidden until the first purchase intake has been completed once.", "当前还没有可复用的家长资料，所以在首购资料流程至少完成一次前，不展示续费合同入口。")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {deletedInvoiceHistory.length > 0 ? (
            <details style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {t(lang, `Deleted invoice draft history (${deletedInvoiceHistory.length})`, `已删发票草稿记录（${deletedInvoiceHistory.length}）`)}
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                  {t(
                    lang,
                    "Use this log to check which draft number was removed. Later invoice numbers now stay unchanged after a delete; only deleting the month-end tail number lets the next new draft reuse that tail slot.",
                    "这里会记录被删掉的是哪一张草稿发票。删除后，后面已经存在的发票号现在不会再改；只有删掉当月尾号时，下一张新草稿才会自然补回这个尾号。"
                  )}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th align="left">{t(lang, "Deleted invoice no.", "已删发票号")}</th>
                        <th align="left">{t(lang, "Issue date", "开票日期")}</th>
                        <th align="left">{t(lang, "Bill to", "开票对象")}</th>
                        <th align="left">{t(lang, "Deleted by", "删除人")}</th>
                        <th align="left">{t(lang, "Deleted at", "删除时间")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedInvoiceHistory.map((row) => (
                        <tr key={row.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                          <td style={{ fontWeight: 700 }}>{row.invoiceNo}</td>
                          <td>{row.issueDate || "-"}</td>
                          <td>{row.billTo || "-"}</td>
                          <td>{row.deletedBy}</td>
                          <td>{new Date(row.deletedAt).toLocaleString(lang === "ZH" ? "zh-CN" : "en-SG")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ) : null}

          {voidContracts.length > 0 ? (
            <details style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {t(lang, `Void history (${voidContracts.length})`, `作废历史（${voidContracts.length}）`)}
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {t(lang, "Only void drafts that were never signed and never generated an invoice can be deleted. Signed or invoiced void contracts stay here as history.", "只有未签字、未开票的作废草稿可以删除。已经签过或开过票的作废合同会保留在这里作为历史记录。")}
                </div>
                {deletableVoidContracts.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#991b1b" }}>{t(lang, "Void drafts you can delete", "可删除的作废草稿")}</div>
                    {deletableVoidContracts.map((contract) => (
                      <div key={contract.id} style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fff7f7", padding: 12, display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <WorkbenchStatusChip
                            label={`${studentContractFlowLabel(contract.flowType)} / ${studentContractFlowLabelZh(contract.flowType)}`}
                            tone="neutral"
                          />
                          <WorkbenchStatusChip
                            label={`${studentContractStatusLabel(contract.status)} / ${studentContractStatusLabelZh(contract.status)}`}
                            tone="error"
                            strong
                          />
                        </div>
                        <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>
                          {t(lang, "This void draft never reached signature or invoice creation, so it can be safely deleted.", "这份作废草稿还没进入签字和开票阶段，因此可以安全删除。")}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {contract.contractSnapshot ? (
                            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}`} target="_blank" rel="noreferrer">
                              {t(lang, "Preview PDF", "预览 PDF")}
                            </a>
                          ) : null}
                          <form action={deleteVoidContractDraftAction}>
                            <input type="hidden" name="packageId" value={packageId} />
                            <input type="hidden" name="contractId" value={contract.id} />
                            <input type="hidden" name="source" value={sourceWorkflow} />
                            <input type="hidden" name="receiptsBack" value={receiptsBack} />
                            <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #dc2626", background: "#fff1f2", color: "#b91c1c", fontWeight: 700 }}>
                              {t(lang, "Delete void draft", "删除作废草稿")}
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {archivedVoidContracts.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#475569" }}>{t(lang, "Archived contract history", "已归档的合同历史")}</div>
                    {archivedVoidContracts.map((contract) => (
                      <div key={contract.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc", padding: 12, display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <WorkbenchStatusChip
                            label={`${studentContractFlowLabel(contract.flowType)} / ${studentContractFlowLabelZh(contract.flowType)}`}
                            tone="neutral"
                          />
                          <WorkbenchStatusChip
                            label={`${studentContractStatusLabel(contract.status)} / ${studentContractStatusLabelZh(contract.status)}`}
                            tone="error"
                            strong
                          />
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                          {contract.signedAt
                            ? t(lang, `Signed on ${contract.signedAt.toLocaleString("en-SG")} and kept here as history.`, `已于 ${contract.signedAt.toLocaleString("zh-CN")} 签署，作为历史保留。`)
                            : contract.invoiceNo
                              ? t(lang, `Linked invoice ${contract.invoiceNo} keeps this void record in history.`, `已关联发票 ${contract.invoiceNo}，因此这条作废记录会保留在历史中。`)
                              : t(lang, "This contract stays here for audit or later renewal reference.", "这条记录会保留在这里，供审计或后续续费参考。")}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {contract.contractSnapshot ? (
                            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}`} target="_blank" rel="noreferrer">
                              {t(lang, "Preview PDF", "预览 PDF")}
                            </a>
                          ) : null}
                          {contract.signedPdfPath ? (
                            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}?download=1`}>
                              {t(lang, "Download signed PDF", "下载已签署 PDF")}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}

import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { listAllParentBilling } from "@/lib/student-parent-billing";
import {
  financeApproveParentReceipt,
  financeRejectParentReceipt,
  getParentReceiptApprovalMap,
  managerApproveParentReceipt,
  managerRejectParentReceipt,
} from "@/lib/parent-receipt-approval";
import {
  areAllApproversConfirmed,
  getApprovalRoleConfig,
  isRoleApprover,
} from "@/lib/approval-flow";

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function withQuery(base: string, packageId?: string) {
  if (!packageId) return base;
  const q = `packageId=${encodeURIComponent(packageId)}`;
  return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
}

async function managerApproveReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Not allowed")}`, packageId));
  }
  await managerApproveParentReceipt(receiptId, actorEmail);
  redirect(withQuery("/admin/receipts-approvals?msg=Manager+approved", packageId));
}

async function managerRejectReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Reject reason required")}`, packageId));
  }
  await managerRejectParentReceipt(receiptId, actorEmail, reason);
  redirect(withQuery("/admin/receipts-approvals?msg=Manager+rejected", packageId));
}

async function financeApproveReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Not allowed")}`, packageId));
  }
  const approvalMap = await getParentReceiptApprovalMap([receiptId]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  if (!managerReady) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Manager approval is required first")}`, packageId));
  }
  await financeApproveParentReceipt(receiptId, actorEmail);
  redirect(withQuery("/admin/receipts-approvals?msg=Finance+approved", packageId));
}

async function financeRejectReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Reject reason required")}`, packageId));
  }
  await financeRejectParentReceipt(receiptId, actorEmail, reason);
  redirect(withQuery("/admin/receipts-approvals?msg=Finance+rejected", packageId));
}

export default async function ReceiptsApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; packageId?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const packageIdFilter = sp?.packageId ? String(sp.packageId).trim() : "";

  const [current, roleCfg, all] = await Promise.all([
    getCurrentUser(),
    getApprovalRoleConfig(),
    listAllParentBilling(),
  ]);
  const actorEmail = current?.email ?? "";
  const isManagerApprover = isRoleApprover(actorEmail, roleCfg.managerApproverEmails);
  const isFinanceApprover = isRoleApprover(actorEmail, roleCfg.financeApproverEmails);

  const invoiceMap = new Map(all.invoices.map((x) => [x.id, x]));
  const packageIds = Array.from(new Set(all.receipts.map((x) => x.packageId)));
  const packages = packageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIds } },
        include: { student: true, course: true },
      })
    : [];
  const packageMap = new Map(packages.map((x) => [x.id, x]));

  const rows = packageIdFilter
    ? all.receipts.filter((x) => x.packageId === packageIdFilter)
    : all.receipts;
  const approvalMap = await getParentReceiptApprovalMap(rows.map((x) => x.id));

  return (
    <div>
      <h2>{t(lang, "Parent Receipt Approvals", "家长收据审批")}</h2>
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/packages">{t(lang, "Back to Packages", "返回课时包列表")}</a>
      </div>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <form method="get" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Package ID
          <input name="packageId" defaultValue={packageIdFilter} style={{ marginLeft: 6, minWidth: 260 }} />
        </label>
        <button type="submit">Filter</button>
        <a href="/admin/receipts-approvals">Reset</a>
      </form>

      {rows.length === 0 ? (
        <div style={{ color: "#666" }}>{t(lang, "No receipts found.", "暂无收据")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Receipt No.</th>
              <th align="left">Invoice No.</th>
              <th align="left">Student</th>
              <th align="left">Package</th>
              <th align="left">Amount Received</th>
              <th align="left">Manager</th>
              <th align="left">Finance</th>
              <th align="left">Actions</th>
              <th align="left">PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pkg = packageMap.get(r.packageId);
              const invoice = r.invoiceId ? invoiceMap.get(r.invoiceId) : null;
              const approval = approvalMap.get(r.id) ?? {
                managerApprovedBy: [],
                financeApprovedBy: [],
                managerRejectReason: null,
                financeRejectReason: null,
              };
              const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
              const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
              const exportReady = managerReady && financeReady;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{r.receiptNo}</td>
                  <td>{invoice?.invoiceNo ?? "-"}</td>
                  <td>{pkg?.student?.name ?? "-"}</td>
                  <td>
                    <a href={`/admin/packages/${encodeURIComponent(r.packageId)}/billing`}>{r.packageId.slice(0, 8)}...</a>
                  </td>
                  <td>{money(r.amountReceived)}</td>
                  <td>
                    {roleCfg.managerApproverEmails.length === 0
                      ? "No approver config"
                      : `${approval.managerApprovedBy.length}/${roleCfg.managerApproverEmails.length}`}
                    {approval.managerRejectReason ? <div style={{ color: "#b00" }}>Rejected: {approval.managerRejectReason}</div> : null}
                  </td>
                  <td>
                    {roleCfg.financeApproverEmails.length === 0
                      ? "No approver config"
                      : `${approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`}
                    {approval.financeRejectReason ? <div style={{ color: "#b00" }}>Rejected: {approval.financeRejectReason}</div> : null}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {isManagerApprover ? (
                        <>
                          <form action={managerApproveReceiptAction}>
                            <input type="hidden" name="packageId" value={r.packageId} />
                            <input type="hidden" name="receiptId" value={r.id} />
                            <button type="submit">Manager Approve</button>
                          </form>
                          <form action={managerRejectReceiptAction} style={{ display: "flex", gap: 6 }}>
                            <input type="hidden" name="packageId" value={r.packageId} />
                            <input type="hidden" name="receiptId" value={r.id} />
                            <input name="reason" placeholder="Manager reject reason" />
                            <button type="submit">Manager Reject</button>
                          </form>
                        </>
                      ) : null}
                      {isFinanceApprover ? (
                        <>
                          <form action={financeApproveReceiptAction}>
                            <input type="hidden" name="packageId" value={r.packageId} />
                            <input type="hidden" name="receiptId" value={r.id} />
                            <button type="submit">Finance Approve</button>
                          </form>
                          <form action={financeRejectReceiptAction} style={{ display: "flex", gap: 6 }}>
                            <input type="hidden" name="packageId" value={r.packageId} />
                            <input type="hidden" name="receiptId" value={r.id} />
                            <input name="reason" placeholder="Finance reject reason" />
                            <button type="submit">Finance Reject</button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {exportReady ? (
                      <a href={`/api/exports/parent-receipt/${encodeURIComponent(r.id)}`}>Export PDF</a>
                    ) : (
                      <span style={{ color: "#b45309" }}>Pending approval</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

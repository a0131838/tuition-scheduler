import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import {
  createParentInvoice,
  deleteParentInvoice,
  deleteParentReceipt,
  getParentInvoiceById,
  listParentBillingForPackage,
} from "@/lib/student-parent-billing";
import {
  assertGlobalInvoiceNoAvailable,
  getNextGlobalInvoiceNo,
  parseInvoiceNoParts,
  resequenceGlobalInvoiceNumbersForMonth,
} from "@/lib/global-invoice-sequence";
import {
  deleteParentReceiptApproval,
  getParentReceiptApprovalMap,
} from "@/lib/parent-receipt-approval";
import {
  areAllApproversConfirmed,
  getApprovalRoleConfig,
} from "@/lib/approval-flow";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";

function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function roundMoney(v: number | null | undefined) {
  return Math.round((Number(v ?? 0) + Number.EPSILON) * 100) / 100;
}

function nextParentReceiptNo(invoiceNo: string, receiptNos: string[]) {
  const normalizedInvoiceNo = String(invoiceNo ?? "").trim();
  if (!normalizedInvoiceNo) return "RC";
  const escapedInvoiceNo = normalizedInvoiceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let maxOrdinal = 0;
  for (const receiptNo of receiptNos) {
    const normalizedReceiptNo = String(receiptNo ?? "").trim();
    if (!normalizedReceiptNo) continue;
    if (normalizedReceiptNo === `${normalizedInvoiceNo}-RC`) {
      maxOrdinal = Math.max(maxOrdinal, 1);
      continue;
    }
    const match = normalizedReceiptNo.match(new RegExp(`^${escapedInvoiceNo}-RC([2-9]\\d*)$`));
    if (!match) continue;
    const ordinal = Number(match[1]);
    if (Number.isInteger(ordinal) && ordinal >= 2) {
      maxOrdinal = Math.max(maxOrdinal, ordinal);
    }
  }
  return maxOrdinal + 1 <= 1 ? `${normalizedInvoiceNo}-RC` : `${normalizedInvoiceNo}-RC${maxOrdinal + 1}`;
}

function displayCreator(
  creatorRaw: string | null | undefined,
  userMap: Map<string, { name: string | null; email: string }>
) {
  const creator = String(creatorRaw ?? "").trim().toLowerCase();
  if (!creator) return "-";
  const user = userMap.get(creator);
  if (!user) return creatorRaw ?? "-";
  if (user.name && user.name.trim() && user.name.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return `${user.name} (${user.email})`;
  }
  return user.email;
}

async function createInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) redirect("/admin/packages?err=Missing+package+id");
  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });
  if (!pkg) redirect(`/admin/packages?err=Package+not+found`);

  const amount = parseNum(formData.get("amount"), 0);
  const gstAmount = parseNum(formData.get("gstAmount"), 0);
  const totalAmountRaw = parseNum(formData.get("totalAmount"), NaN);
  const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : amount + gstAmount;
  const issueDate = normalizeDateOnly(String(formData.get("issueDate") ?? "").trim(), new Date()) ?? formatDateOnly(new Date());
  const invoiceNoInput = String(formData.get("invoiceNo") ?? "").trim();
  const invoiceNo = invoiceNoInput || (await getNextGlobalInvoiceNo(issueDate));

  try {
    await assertGlobalInvoiceNoAvailable(invoiceNo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invoice No. already exists";
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
  }

  try {
    await createParentInvoice({
      packageId,
      studentId: pkg.studentId,
      invoiceNo,
      issueDate,
      dueDate: normalizeDateOnly(String(formData.get("dueDate") ?? "").trim(), new Date()) ?? issueDate,
      courseStartDate: String(formData.get("courseStartDate") ?? "").trim() || null,
      courseEndDate: String(formData.get("courseEndDate") ?? "").trim() || null,
      billTo: String(formData.get("billTo") ?? "").trim() || pkg.student.name,
      quantity: Math.max(1, Math.floor(parseNum(formData.get("quantity"), 1))),
      description:
        String(formData.get("description") ?? "").trim() ||
        `Course Fees for ${pkg.student.name} (${Math.floor((pkg.totalMinutes ?? 0) / 60)} hours)`,
      amount,
      gstAmount,
      totalAmount,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim() || "Immediate",
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create invoice failed";
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
  }

  redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Invoice+created`);
}


async function deleteInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!packageId || !invoiceId) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Missing+invoice+id`);
  }
  try {
    const existing = await getParentInvoiceById(invoiceId);
    await deleteParentInvoice({ invoiceId, actorEmail: admin.email });
    const mk = existing ? parseInvoiceNoParts(existing.invoiceNo)?.monthKey : null;
    if (mk) {
      await resequenceGlobalInvoiceNumbersForMonth(mk);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete invoice failed";
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
  }
  redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Invoice+deleted`);
}

async function deleteReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  if (!packageId || !receiptId) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Missing+receipt+id`);
  }
  try {
    await deleteParentReceipt({ receiptId, actorEmail: admin.email });
    await deleteParentReceiptApproval(receiptId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete receipt failed";
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
  }
  redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Receipt+deleted`);
}

export default async function PackageBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const { id: packageId } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const lang = await getLang();

  const [pkg, data, roleCfg] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: { student: true, course: true },
    }),
    listParentBillingForPackage(packageId),
    getApprovalRoleConfig(),
  ]);
  if (!pkg) redirect("/admin/packages?err=Package+not+found");
  const approvalMap = await getParentReceiptApprovalMap(data.receipts.map((x) => x.id));
  const linkedPaymentRecordIdSet = new Set(
    data.receipts.map((receipt) => String(receipt.paymentRecordId ?? "").trim()).filter(Boolean)
  );
  const unlinkedPaymentRecords = data.paymentRecords
    .filter((record) => !linkedPaymentRecordIdSet.has(record.id))
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  const soleSuggestedPaymentRecord = unlinkedPaymentRecords.length === 1 ? unlinkedPaymentRecords[0] : null;
  const today = formatDateOnly(new Date());
  const defaultInvoiceNo = await getNextGlobalInvoiceNo(today);
  const invoiceMap = new Map(data.invoices.map((x) => [x.id, x]));
  const receiptProgressMap = new Map(
    data.invoices.map((invoice) => {
      const linkedReceipts = data.receipts.filter((receipt) => receipt.invoiceId === invoice.id);
      let approvedAmount = 0;
      let pendingAmount = 0;
      let rejectedAmount = 0;
      for (const receipt of linkedReceipts) {
        const approval = approvalMap.get(receipt.id) ?? {
          managerApprovedBy: [],
          financeApprovedBy: [],
          managerRejectReason: null,
          financeRejectReason: null,
        };
        const amount = roundMoney(receipt.amountReceived);
        const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
        const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
        if (approval.managerRejectReason || approval.financeRejectReason) {
          rejectedAmount += amount;
        } else if (managerReady && financeReady) {
          approvedAmount += amount;
        } else {
          pendingAmount += amount;
        }
      }
      const createdAmount = roundMoney(linkedReceipts.reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0));
      const remainingAmount = Math.max(0, roundMoney(invoice.totalAmount - createdAmount));
      return [
        invoice.id,
        {
          receiptCount: linkedReceipts.length,
          createdAmount,
          approvedAmount: roundMoney(approvedAmount),
          pendingAmount: roundMoney(pendingAmount),
          rejectedAmount: roundMoney(rejectedAmount),
          remainingAmount,
          nextReceiptNo: nextParentReceiptNo(invoice.invoiceNo, linkedReceipts.map((receipt) => receipt.receiptNo)),
          status:
            linkedReceipts.length === 0
              ? t(lang, "No receipts yet", "还没有收据")
              : remainingAmount > 0.01
                ? t(lang, "Partially receipted", "部分已开收据")
                : t(lang, "Fully receipted", "已全部开收据"),
        },
      ] as const;
    })
  );
  const creatorEmails = Array.from(
    new Set(
      data.invoices
        .map((invoice) => String(invoice.createdBy ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const creatorUserMap = creatorEmails.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { email: { in: creatorEmails } },
            select: { name: true, email: true },
          })
        ).map((user) => [user.email.trim().toLowerCase(), { name: user.name, email: user.email }] as const)
      )
    : new Map<string, { name: string | null; email: string }>();

  return (
    <div>
      <h2>{t(lang, "Package Billing", "课包账单")}</h2>
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/packages">← {t(lang, "Back to Packages", "返回课包列表")}</a>
      </div>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 14 }}>
        <div><b>{t(lang, "Student", "学生")}:</b> {pkg.student.name}</div>
        <div><b>{t(lang, "Course", "课程")}:</b> {pkg.course.name}</div>
        <div><b>{t(lang, "Package Id", "课包ID")}:</b> {pkg.id}</div>
        <div><b>{t(lang, "Paid", "已付款")}:</b> {pkg.paid ? t(lang, "Yes", "是") : t(lang, "No", "否")} / {money(pkg.paidAmount)}</div>
        <div style={{ marginTop: 8 }}>
          <a href={`/api/exports/parent-statement/${encodeURIComponent(packageId)}`}>
            {t(lang, "Export Statement of Account PDF", "导出对账单 PDF")}
          </a>
        </div>
      </div>

      <h3>{t(lang, "Create Invoice", "创建 Invoice")}</h3>
      <form action={createInvoiceAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <input type="hidden" name="packageId" value={packageId} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
          <label>Invoice No.
            <input name="invoiceNo" defaultValue={defaultInvoiceNo} style={{ width: "100%" }} />
            <div style={{ fontSize: 12, color: "#666" }}>Format: RGT-yyyymm-xxxx (editable)</div>
          </label>
          <label>Issue Date<input name="issueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>Due Date<input name="dueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>Payment Terms<input name="paymentTerms" defaultValue="Immediate" style={{ width: "100%" }} /></label>
          <label>Course Start<input name="courseStartDate" type="date" style={{ width: "100%" }} /></label>
          <label>Course End<input name="courseEndDate" type="date" style={{ width: "100%" }} /></label>
          <label>Quantity<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
          <label>Bill To<input name="billTo" defaultValue={pkg.student.name} style={{ width: "100%" }} /></label>
          <label>Amount<input name="amount" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
          <label>GST<input name="gstAmount" type="number" step="0.01" defaultValue={0} style={{ width: "100%" }} /></label>
          <label>Total<input name="totalAmount" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 4" }}>Description
            <input name="description" defaultValue={`Course Fees for ${pkg.student.name}`} style={{ width: "100%" }} />
          </label>
          <label style={{ gridColumn: "span 4" }}>Note
            <input name="note" style={{ width: "100%" }} />
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">{t(lang, "Create Invoice", "创建 Invoice")}</button>
        </div>
      </form>

      <h3>{t(lang, "Receipt Finance Processing", "收据财务处理")}</h3>
      <div style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
        <div style={{ marginBottom: 8, color: "#374151" }}>
          Payment records and receipt creation are handled in the finance center with receipt approvals.
        </div>
        {soleSuggestedPaymentRecord ? (
          <div style={{ marginBottom: 8, color: "#1e40af", fontSize: 12 }}>
            {t(lang, "Only one unlinked payment proof is currently available, so the next-receipt shortcut will carry it automatically.", "当前只有一条未绑定付款凭证，下一张收据快捷入口会自动带上它。")}
            {" "}
            {soleSuggestedPaymentRecord.originalFileName} {soleSuggestedPaymentRecord.paymentAmount == null ? "" : `(${money(soleSuggestedPaymentRecord.paymentAmount)})`}
          </div>
        ) : null}
        <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(packageId)}`}>
          Open Finance Receipt Center
        </a>
      </div>

      <h3>{t(lang, "Invoices", "Invoices")}</h3>
      {data.invoices.length === 0 ? (
        <div style={{ color: "#666", marginBottom: 16 }}>{t(lang, "No invoices yet.", "暂无 Invoice")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Invoice No.</th>
              <th align="left">Issue</th>
              <th align="left">Due</th>
              <th align="left">Total</th>
              <th align="left">{t(lang, "Receipt progress", "收据进度")}</th>
              <th align="left">{t(lang, "Approval snapshot", "审批快照")}</th>
              <th align="left">By</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
              <th align="left">PDF</th>
              <th align="left">Delete</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((r) => {
              const progress = receiptProgressMap.get(r.id) ?? {
                receiptCount: 0,
                createdAmount: 0,
                approvedAmount: 0,
                pendingAmount: 0,
                rejectedAmount: 0,
                remainingAmount: roundMoney(r.totalAmount),
                nextReceiptNo: `${r.invoiceNo}-RC`,
                status: t(lang, "No receipts yet", "还没有收据"),
              };
              const nextReceiptLabel = progress.nextReceiptNo.split("-").pop() ?? progress.nextReceiptNo;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{r.invoiceNo}</td>
                  <td>{normalizeDateOnly(r.issueDate) ?? "-"}</td>
                  <td>{normalizeDateOnly(r.dueDate) ?? "-"}</td>
                  <td>{money(r.totalAmount)}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{progress.status}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {progress.receiptCount} {t(lang, "receipt(s)", "张收据")} · {t(lang, "created", "已建")}: {money(progress.createdAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: progress.remainingAmount > 0.01 ? "#b45309" : "#166534" }}>
                      {t(lang, "remaining", "剩余")}: {money(progress.remainingAmount)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: "#334155" }}>
                      {t(lang, "approved", "已批")}: {money(progress.approvedAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: progress.pendingAmount > 0.01 ? "#92400e" : "#64748b" }}>
                      {t(lang, "pending", "待批")}: {money(progress.pendingAmount)}
                    </div>
                    {progress.rejectedAmount > 0.01 ? (
                      <div style={{ fontSize: 12, color: "#b91c1c" }}>
                        {t(lang, "rejected", "已驳回")}: {money(progress.rejectedAmount)}
                      </div>
                    ) : null}
                  </td>
                  <td>{displayCreator(r.createdBy, creatorUserMap)}</td>
                  <td>
                    <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(packageId)}&step=create&invoiceId=${encodeURIComponent(r.id)}${soleSuggestedPaymentRecord && progress.remainingAmount > 0.01 ? `&paymentRecordId=${encodeURIComponent(soleSuggestedPaymentRecord.id)}` : ""}`}>
                      {progress.remainingAmount > 0.01
                        ? t(lang, `Create ${nextReceiptLabel}`, `创建 ${nextReceiptLabel}`)
                        : t(lang, "Review receipts", "查看收据")}
                    </a>
                    {progress.remainingAmount > 0.01 ? (
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4, display: "grid", gap: 2 }}>
                        <div>
                        {t(lang, "Next receipt", "下一张收据")}: {progress.nextReceiptNo}
                        </div>
                        {soleSuggestedPaymentRecord ? (
                          <div>
                            {t(lang, "Suggested proof", "推荐凭证")}: {soleSuggestedPaymentRecord.originalFileName} {soleSuggestedPaymentRecord.paymentAmount == null ? "" : `(${money(soleSuggestedPaymentRecord.paymentAmount)})`}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td><a href={`/api/exports/parent-invoice/${encodeURIComponent(r.id)}`}>Export PDF</a></td>
                  <td>
                    <form action={deleteInvoiceAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="invoiceId" value={r.id} />
                      <button type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Receipts", "收据")}</h3>
      <div style={{ marginBottom: 8 }}>
        <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(packageId)}`}>
          {t(lang, "Open Receipt Approval Center", "打开收据审批中心")}
        </a>
      </div>
      {data.receipts.length === 0 ? (
        <div style={{ color: "#666" }}>{t(lang, "No receipts yet.", "暂无 Receipt")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Receipt No.</th>
              <th align="left">Invoice No.</th>
              <th align="left">Date</th>
              <th align="left">Received From</th>
              <th align="left">Amount Received</th>
              <th align="left">{t(lang, "Invoice progress", "发票进度")}</th>
              <th align="left">Manager</th>
              <th align="left">Finance</th>
              <th align="left">Approval</th>
              <th align="left">PDF</th>
              <th align="left">Delete</th>
            </tr>
          </thead>
          <tbody>
            {data.receipts.map((r) => {
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
                  <td>{r.invoiceId ? (invoiceMap.get(r.invoiceId)?.invoiceNo ?? "-") : "-"}</td>
                  <td>{normalizeDateOnly(r.receiptDate) ?? "-"}</td>
                  <td>{r.receivedFrom}</td>
                  <td>{money(r.amountReceived)}</td>
                  <td>
                    {r.invoiceId ? (() => {
                      const progress = receiptProgressMap.get(r.invoiceId);
                      if (!progress) return "-";
                      return (
                        <>
                          <div style={{ fontSize: 12, color: "#334155" }}>
                            {progress.receiptCount} {t(lang, "receipt(s)", "张收据")} · {t(lang, "created", "已建")}: {money(progress.createdAmount)}
                          </div>
                          <div style={{ fontSize: 12, color: progress.remainingAmount > 0.01 ? "#b45309" : "#166534" }}>
                            {t(lang, "remaining", "剩余")}: {money(progress.remainingAmount)}
                          </div>
                        </>
                      );
                    })() : "-"}
                  </td>
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
                    <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(packageId)}`}>Go to Approval</a>
                  </td>
                  <td>
                    {exportReady ? (
                      <a href={`/api/exports/parent-receipt/${encodeURIComponent(r.id)}`}>Export PDF</a>
                    ) : (
                      <span style={{ color: "#b45309" }}>
                        {t(lang, "Receipt PDF available after manager and finance approval", "收据 PDF 需经理和财务审批完成后导出")}
                      </span>
                    )}
                  </td>
                  <td>
                    <form action={deleteReceiptAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="receiptId" value={r.id} />
                      <button type="submit">Delete</button>
                    </form>
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

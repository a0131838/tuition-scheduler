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

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
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
  const issueDate = String(formData.get("issueDate") ?? "").trim() || new Date().toISOString();
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
      dueDate: String(formData.get("dueDate") ?? "").trim() || new Date().toISOString(),
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
  const today = ymd(new Date());
  const defaultInvoiceNo = await getNextGlobalInvoiceNo(today);
  const invoiceMap = new Map(data.invoices.map((x) => [x.id, x]));

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
              <th align="left">By</th>
              <th align="left">PDF</th>
              <th align="left">Delete</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{r.invoiceNo}</td>
                <td>{new Date(r.issueDate).toLocaleDateString()}</td>
                <td>{new Date(r.dueDate).toLocaleDateString()}</td>
                <td>{money(r.totalAmount)}</td>
                <td>{r.createdBy}</td>
                <td><a href={`/api/exports/parent-invoice/${encodeURIComponent(r.id)}`}>Export PDF</a></td>
                <td>
                  <form action={deleteInvoiceAction}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="invoiceId" value={r.id} />
                    <button type="submit">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
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
                  <td>{new Date(r.receiptDate).toLocaleDateString()}</td>
                  <td>{r.receivedFrom}</td>
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
                    <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(packageId)}`}>Go to Approval</a>
                  </td>
                  <td>
                    {exportReady ? (
                      <a href={`/api/exports/parent-receipt/${encodeURIComponent(r.id)}`}>Export PDF</a>
                    ) : (
                      <span style={{ color: "#b45309" }}>Pending approval</span>
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

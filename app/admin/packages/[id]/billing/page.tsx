import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import path from "path";
import { mkdir, unlink, writeFile } from "fs/promises";
import crypto from "crypto";
import {
  addParentPaymentRecord,
  buildParentReceiptNoForInvoice,
  deleteParentPaymentRecord,
  getParentInvoiceById,
  createParentInvoice,
  createParentReceipt,
  deleteParentInvoice,
  deleteParentReceipt,
  getNextParentInvoiceNo,
  listParentBillingForPackage,
  replaceParentPaymentRecord,
} from "@/lib/student-parent-billing";
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
  const invoiceNo = invoiceNoInput || (await getNextParentInvoiceNo(issueDate));

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

async function uploadPaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) redirect("/admin/packages?err=Missing+package+id");

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true },
  });
  if (!pkg) redirect(`/admin/packages?err=Package+not+found`);

  const file = formData.get("paymentProof");
  if (!(file instanceof File) || !file.size) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Please+choose+a+file`);
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=File+too+large+(max+10MB)`);
  }

  const ext = path.extname(file.name || "").slice(0, 10) || ".bin";
  const safeExt = /^[.a-zA-Z0-9]+$/.test(ext) ? ext : ".bin";
  const storeName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${safeExt}`;
  const relDir = path.join("uploads", "payment-proofs", packageId);
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, storeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);
  const relPath = `/${path.posix.join("uploads", "payment-proofs", packageId, storeName)}`;
  const paymentDate = String(formData.get("paymentDate") ?? "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim() || null;
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;
  const paymentNote = String(formData.get("paymentNote") ?? "").trim() || null;
  const replaceRecordId = String(formData.get("replacePaymentRecordId") ?? "").trim();

  if (replaceRecordId) {
    try {
      const { oldItem } = await replaceParentPaymentRecord({
        recordId: replaceRecordId,
        packageId,
        paymentDate,
        paymentMethod,
        referenceNo,
        originalFileName: file.name || "payment-proof",
        storedFileName: storeName,
        relativePath: relPath,
        note: paymentNote,
        uploadedBy: admin.email,
      });
      if (oldItem.relativePath?.startsWith("/")) {
        const oldAbsPath = path.join(process.cwd(), "public", oldItem.relativePath.replace(/^\//, "").replace(/\//g, path.sep));
        await unlink(oldAbsPath).catch(() => {});
      }
      redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Payment+record+replaced`);
    } catch (e) {
      await unlink(absPath).catch(() => {});
      const msg = e instanceof Error ? e.message : "Replace payment record failed";
      redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
    }
  }

  await addParentPaymentRecord({
    packageId,
    studentId: pkg.studentId,
    paymentDate,
    paymentMethod,
    referenceNo,
    originalFileName: file.name || "payment-proof",
    storedFileName: storeName,
    relativePath: relPath,
    note: paymentNote,
    uploadedBy: admin.email,
  });

  redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Payment+record+uploaded`);
}

async function createReceiptAction(formData: FormData) {
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
  const amountReceivedRaw = parseNum(formData.get("amountReceived"), NaN);
  const amountReceived = Number.isFinite(amountReceivedRaw) ? amountReceivedRaw : totalAmount;
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Please+select+an+invoice+for+this+receipt`);
  }
  const linkedInvoice = await getParentInvoiceById(invoiceId);
  if (!linkedInvoice) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Selected+invoice+not+found`);
  }
  const receiptNoInput = String(formData.get("receiptNo") ?? "").trim();
  let receiptNo = receiptNoInput;
  if (!receiptNo) {
    try {
      receiptNo = await buildParentReceiptNoForInvoice(invoiceId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate receipt no";
      redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
    }
  }
  const receivedFrom = String(formData.get("receivedFrom") ?? "").trim();
  const paidBy = String(formData.get("paidBy") ?? "").trim();
  if (!receivedFrom) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Received+From+is+required`);
  }
  if (!paidBy) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Paid+By+is+required`);
  }

  try {
    await createParentReceipt({
      packageId,
      studentId: pkg.studentId,
      invoiceId,
      paymentRecordId: String(formData.get("paymentRecordId") ?? "").trim() || null,
      receiptNo,
      receiptDate: String(formData.get("receiptDate") ?? "").trim() || new Date().toISOString(),
      receivedFrom,
      paidBy,
      quantity: Math.max(1, Math.floor(parseNum(formData.get("quantity"), 1))),
      description: `For Invoice no. ${linkedInvoice.invoiceNo}`,
      amount,
      gstAmount,
      totalAmount,
      amountReceived,
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create receipt failed";
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
  }

  redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Receipt+created`);
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
    await deleteParentInvoice({ invoiceId, actorEmail: admin.email });
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

async function deletePaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const recordId = String(formData.get("recordId") ?? "").trim();
  if (!packageId || !recordId) {
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=Missing+payment+record+id`);
  }
  try {
    const row = await deleteParentPaymentRecord({ recordId, actorEmail: admin.email });
    if (row.relativePath?.startsWith("/")) {
      const absPath = path.join(process.cwd(), "public", row.relativePath.replace(/^\//, "").replace(/\//g, path.sep));
      await unlink(absPath).catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete payment record failed";
    redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?err=${encodeURIComponent(msg)}`);
  }
  redirect(`/admin/packages/${encodeURIComponent(packageId)}/billing?msg=Payment+record+deleted`);
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
  const defaultInvoiceNo = await getNextParentInvoiceNo(today);
  const invoiceMap = new Map(data.invoices.map((x) => [x.id, x]));
  const usedInvoiceIds = new Set(data.receipts.map((x) => x.invoiceId).filter((x): x is string => Boolean(x)));
  const availableInvoices = data.invoices.filter((x) => !usedInvoiceIds.has(x.id));

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

      <h3>{t(lang, "Payment Records", "缴费记录")}</h3>
      <form
        action={uploadPaymentRecordAction}
        encType="multipart/form-data"
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}
      >
        <input type="hidden" name="packageId" value={packageId} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(160px, 1fr))", gap: 8 }}>
          <label>Payment Proof<input name="paymentProof" type="file" required style={{ width: "100%" }} /></label>
          <label>Payment Date<input name="paymentDate" type="date" style={{ width: "100%" }} /></label>
          <label>Payment Method
            <select name="paymentMethod" defaultValue="" style={{ width: "100%" }}>
              <option value="">(optional)</option>
              <option value="Paynow">Paynow</option>
              <option value="Cash">Cash</option>
              <option value="Bank transfer">Bank transfer</option>
            </select>
          </label>
          <label>Reference No.<input name="referenceNo" placeholder="UTR / Txn Id" style={{ width: "100%" }} /></label>
          <label>Replace Existing
            <select name="replacePaymentRecordId" defaultValue="" style={{ width: "100%" }}>
              <option value="">(new record)</option>
              {data.paymentRecords.map((r) => (
                <option key={r.id} value={r.id}>{new Date(r.uploadedAt).toLocaleDateString()} - {r.originalFileName}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "span 5" }}>Note
            <input name="paymentNote" placeholder={t(lang, "Note", "备注")} style={{ width: "100%" }} />
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">{t(lang, "Upload", "上传")}</button>
        </div>
      </form>

      {data.paymentRecords.length === 0 ? (
        <div style={{ color: "#666", marginBottom: 16 }}>{t(lang, "No payment records yet.", "暂无缴费记录")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Time</th>
              <th align="left">Payment Date</th>
              <th align="left">Method</th>
              <th align="left">Reference</th>
              <th align="left">File</th>
              <th align="left">Note</th>
              <th align="left">By</th>
              <th align="left">Delete</th>
            </tr>
          </thead>
          <tbody>
            {data.paymentRecords.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(r.uploadedAt).toLocaleString()}</td>
                <td>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "-"}</td>
                <td>{r.paymentMethod || "-"}</td>
                <td>{r.referenceNo || "-"}</td>
                <td><a href={r.relativePath} target="_blank">{r.originalFileName}</a></td>
                <td>{r.note ?? "-"}</td>
                <td>{r.uploadedBy}</td>
                <td>
                  <form action={deletePaymentRecordAction}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="recordId" value={r.id} />
                    <button type="submit">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Create Receipt", "创建 Receipt")}</h3>
      <form action={createReceiptAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <input type="hidden" name="packageId" value={packageId} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
          <label>Source Invoice
            <select name="invoiceId" defaultValue={availableInvoices[0]?.id ?? ""} required style={{ width: "100%" }}>
              <option value="" disabled>{availableInvoices.length === 0 ? "(No available invoice)" : "Select an invoice"}</option>
              {availableInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.invoiceNo} / {money(inv.totalAmount)}</option>
              ))}
            </select>
          </label>
          <label>Receipt No.
            <input
              name="receiptNo"
              placeholder="Leave blank to auto-generate: InvoiceNo-RC"
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>Must match selected invoice number + "-RC"</div>
          </label>
          <label>Receipt Date<input name="receiptDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>Received From<input name="receivedFrom" required placeholder="Please enter payer name" style={{ width: "100%" }} /></label>
          <label>Paid By
            <select name="paidBy" required defaultValue="Bank transfer" style={{ width: "100%" }}>
              <option value="Paynow">Paynow</option>
              <option value="Cash">Cash</option>
              <option value="Bank transfer">Bank transfer</option>
            </select>
          </label>
          <label>Quantity<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
          <label>Amount<input name="amount" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
          <label>GST<input name="gstAmount" type="number" step="0.01" defaultValue={0} style={{ width: "100%" }} /></label>
          <label>Total<input name="totalAmount" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
          <label>Amount Received<input name="amountReceived" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
          <label>Payment Record
            <select name="paymentRecordId" defaultValue="" style={{ width: "100%" }}>
              <option value="">(none)</option>
              {data.paymentRecords.map((r) => (
                <option key={r.id} value={r.id}>{new Date(r.uploadedAt).toLocaleDateString()} - {r.originalFileName}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "span 4" }}>Description
            <input
              value={availableInvoices[0] ? `For Invoice no. ${availableInvoices[0].invoiceNo}` : "Auto generated from linked invoice number"}
              readOnly
              style={{ width: "100%", color: "#666", background: "#f9fafb" }}
            />
          </label>
          <label style={{ gridColumn: "span 4" }}>Note
            <input name="note" style={{ width: "100%" }} />
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={availableInvoices.length === 0}>{t(lang, "Create Receipt", "创建 Receipt")}</button>
          {availableInvoices.length === 0 ? (
            <span style={{ marginLeft: 8, color: "#92400e" }}>All invoices already have linked receipts.</span>
          ) : null}
        </div>
      </form>

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

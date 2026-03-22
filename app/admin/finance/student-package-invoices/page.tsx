import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { createParentInvoice, listParentBillingForPackage } from "@/lib/student-parent-billing";
import { assertGlobalInvoiceNoAvailable, getNextGlobalInvoiceNo } from "@/lib/global-invoice-sequence";
import PackageSelectAutoSubmit from "./_components/PackageSelectAutoSubmit";

function parseNum(v: string | null | undefined, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

async function issueInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) {
    redirect("/admin/finance/student-package-invoices?err=Missing+package");
  }

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });
  if (!pkg) {
    redirect("/admin/finance/student-package-invoices?err=Package+not+found");
  }

  const issueDate = normalizeDateOnly(String(formData.get("issueDate") ?? "").trim(), new Date()) ?? formatDateOnly(new Date());
  const invoiceNoInput = String(formData.get("invoiceNo") ?? "").trim();
  const invoiceNo = invoiceNoInput || (await getNextGlobalInvoiceNo(issueDate));
  const amount = parseNum(String(formData.get("amount") ?? ""), 0);
  const gstAmount = parseNum(String(formData.get("gstAmount") ?? ""), 0);
  const totalAmountRaw = parseNum(String(formData.get("totalAmount") ?? ""), NaN);
  const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : amount + gstAmount;

  try {
    await assertGlobalInvoiceNoAvailable(invoiceNo);
    await createParentInvoice({
      packageId,
      studentId: pkg.studentId,
      invoiceNo,
      issueDate,
      dueDate: normalizeDateOnly(String(formData.get("dueDate") ?? "").trim(), new Date()) ?? issueDate,
      courseStartDate: String(formData.get("courseStartDate") ?? "").trim() || null,
      courseEndDate: String(formData.get("courseEndDate") ?? "").trim() || null,
      billTo: String(formData.get("billTo") ?? "").trim() || pkg.student.name,
      quantity: Math.max(1, Math.floor(parseNum(String(formData.get("quantity") ?? ""), 1))),
      description:
        String(formData.get("description") ?? "").trim() ||
        `Course package invoice for ${pkg.student.name} (${pkg.course.name})`,
      amount,
      gstAmount,
      totalAmount,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim() || "Immediate",
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create invoice failed";
    redirect(`/admin/finance/student-package-invoices?packageId=${encodeURIComponent(packageId)}&err=${encodeURIComponent(msg)}`);
  }

  redirect(`/admin/finance/student-package-invoices?packageId=${encodeURIComponent(packageId)}&msg=Invoice+created`);
}

export default async function FinanceStudentPackageInvoicePage({
  searchParams,
}: {
  searchParams?: Promise<{
    packageId?: string;
    issueDate?: string;
    dueDate?: string;
    quantity?: string;
    amount?: string;
    gstAmount?: string;
    totalAmount?: string;
    billTo?: string;
    description?: string;
    paymentTerms?: string;
    note?: string;
    courseStartDate?: string;
    courseEndDate?: string;
    msg?: string;
    err?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const selectedPackageId = String(sp?.packageId ?? "").trim();
  const today = formatDateOnly(new Date());

  const packages = await prisma.coursePackage.findMany({
    where: { status: "ACTIVE" },
    include: { student: true, course: true },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });
  const selectedPackage = selectedPackageId
    ? packages.find((x) => x.id === selectedPackageId) ??
      (await prisma.coursePackage.findUnique({
        where: { id: selectedPackageId },
        include: { student: true, course: true },
      }))
    : null;
  const packageOptions = [
    { value: "", label: t(lang, "Select package", "请选择课时包") },
    ...packages.map((p) => ({
      value: p.id,
      label: `${p.student.name} · ${p.course.name} · ${p.id.slice(0, 8)}`,
    })),
  ];

  const issueDate = normalizeDateOnly(String(sp?.issueDate ?? "").trim(), new Date()) ?? today;
  const dueDate = normalizeDateOnly(String(sp?.dueDate ?? "").trim(), new Date()) ?? issueDate;
  const quantity = Math.max(1, Math.floor(parseNum(sp?.quantity, 1)));
  const amountDefault = selectedPackage ? Number(selectedPackage.paidAmount ?? 0) : 0;
  const amount = parseNum(sp?.amount, amountDefault);
  const gstAmount = parseNum(sp?.gstAmount, 0);
  const totalAmountRaw = parseNum(sp?.totalAmount, NaN);
  const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : amount + gstAmount;
  const billTo = String(sp?.billTo ?? "").trim() || selectedPackage?.student.name || "";
  const description =
    String(sp?.description ?? "").trim() ||
    (selectedPackage
      ? `Course package invoice for ${selectedPackage.student.name} (${selectedPackage.course.name})`
      : "");
  const paymentTerms = String(sp?.paymentTerms ?? "").trim() || "Immediate";
  const note = String(sp?.note ?? "").trim();
  const courseStartDate = normalizeDateOnly(String(sp?.courseStartDate ?? "").trim(), null);
  const courseEndDate = normalizeDateOnly(String(sp?.courseEndDate ?? "").trim(), null);
  const previewInvoiceNo = await getNextGlobalInvoiceNo(issueDate);

  const selectedBilling = selectedPackage ? await listParentBillingForPackage(selectedPackage.id) : null;
  const packagePaidAmount = Number(selectedPackage?.paidAmount ?? 0);
  const invoicedAmount = selectedBilling
    ? selectedBilling.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0)
    : 0;
  const pendingToInvoice = Math.max(0, packagePaidAmount - invoicedAmount);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2 style={{ marginBottom: 0 }}>{t(lang, "Student Package Invoice Desk", "学生课时包发票台")}</h2>
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {t(
          lang,
          "Step 1 preview (read-only), Step 2 confirm issue. No deduction/receipt/approval logic is changed here.",
          "先预览（只读），再确认开票。此页面不会改动扣课、收据、审批逻辑。",
        )}
      </div>
      <div style={{ fontSize: 12 }}>
        <a href="/admin/finance/workbench">{t(lang, "Back to Finance Workbench", "返回财务工作台")}</a>
      </div>

      {err ? <div style={{ color: "#b91c1c" }}>{err}</div> : null}
      {msg ? <div style={{ color: "#166534" }}>{msg}</div> : null}
      <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, background: "#f8fafc", display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>
          {t(lang, "Payment & Invoice Summary", "缴费与开票摘要")}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
            <b>{t(lang, "Paid Amount", "已缴费金额")}</b>: SGD {money(packagePaidAmount)}
          </div>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
            <b>{t(lang, "Invoiced Amount", "已开票金额")}</b>: SGD {money(invoicedAmount)}
          </div>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
            <b>{t(lang, "Pending Invoice Amount", "待开票金额")}</b>: SGD {money(pendingToInvoice)}
          </div>
        </div>
        {!selectedPackage ? (
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Select a package to load actual amounts.", "请选择课时包以加载实际金额。")}
          </div>
        ) : null}
      </div>

      <form method="get" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
        <label>
          {t(lang, "Package", "课时包")}{" "}
          <PackageSelectAutoSubmit
            name="packageId"
            defaultValue={selectedPackageId}
            options={packageOptions}
          />
        </label>
        <div style={{ fontSize: 12, color: "#475569" }}>
          {t(lang, "Selecting a package auto-loads paid/invoiced amounts.", "选择课时包后会自动加载已缴费/已开票金额。")}
          <button type="submit" style={{ marginLeft: 8 }}>
            {t(lang, "Load Summary", "加载金额")}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
          <label>Issue Date<input name="issueDate" type="date" defaultValue={issueDate} style={{ width: "100%" }} /></label>
          <label>Due Date<input name="dueDate" type="date" defaultValue={dueDate} style={{ width: "100%" }} /></label>
          <label>Quantity<input name="quantity" type="number" min={1} defaultValue={quantity} style={{ width: "100%" }} /></label>
          <label>Payment Terms<input name="paymentTerms" defaultValue={paymentTerms} style={{ width: "100%" }} /></label>
          <label>Amount<input name="amount" type="number" step="0.01" defaultValue={amount} style={{ width: "100%" }} /></label>
          <label>GST<input name="gstAmount" type="number" step="0.01" defaultValue={gstAmount} style={{ width: "100%" }} /></label>
          <label>Total<input name="totalAmount" type="number" step="0.01" defaultValue={totalAmount} style={{ width: "100%" }} /></label>
          <label>Bill To<input name="billTo" defaultValue={billTo} style={{ width: "100%" }} /></label>
          <label>Course Start<input name="courseStartDate" type="date" defaultValue={courseStartDate ?? ""} style={{ width: "100%" }} /></label>
          <label>Course End<input name="courseEndDate" type="date" defaultValue={courseEndDate ?? ""} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 2" }}>Description<input name="description" defaultValue={description} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 2" }}>Note<input name="note" defaultValue={note} style={{ width: "100%" }} /></label>
        </div>
        <div>
          <button type="submit">{t(lang, "Preview Draft", "预览草稿")}</button>
        </div>
      </form>

      {selectedPackage ? (
        <div style={{ border: "1px solid #dbeafe", borderRadius: 8, padding: 12, background: "#eff6ff", display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Preview", "预览")}</div>
          <div style={{ fontSize: 12 }}>
            {t(lang, "Invoice No. (suggested)", "建议发票号")}: <b>{previewInvoiceNo}</b>
          </div>
          <div style={{ fontSize: 12 }}>
            {selectedPackage.student.name} · {selectedPackage.course.name} · {t(lang, "Package", "课时包")} {selectedPackage.id}
          </div>
          <div style={{ fontSize: 12 }}>
            {t(lang, "Issue / Due", "开票/到期")}: {issueDate} / {dueDate} · {t(lang, "Total", "总额")}: SGD {money(totalAmount)}
          </div>
          <form action={issueInvoiceAction} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="packageId" value={selectedPackage.id} />
            <input type="hidden" name="issueDate" value={issueDate} />
            <input type="hidden" name="dueDate" value={dueDate} />
            <input type="hidden" name="quantity" value={String(quantity)} />
            <input type="hidden" name="amount" value={String(amount)} />
            <input type="hidden" name="gstAmount" value={String(gstAmount)} />
            <input type="hidden" name="totalAmount" value={String(totalAmount)} />
            <input type="hidden" name="billTo" value={billTo} />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="paymentTerms" value={paymentTerms} />
            <input type="hidden" name="note" value={note} />
            <input type="hidden" name="courseStartDate" value={courseStartDate ?? ""} />
            <input type="hidden" name="courseEndDate" value={courseEndDate ?? ""} />
            <label>
              {t(lang, "Invoice No. override (optional)", "发票号覆盖（可选）")}{" "}
              <input name="invoiceNo" defaultValue={previewInvoiceNo} style={{ minWidth: 260 }} />
            </label>
            <div>
              <button type="submit">{t(lang, "Confirm & Issue Invoice", "确认并开票")}</button>
              <a href={`/admin/packages/${encodeURIComponent(selectedPackage.id)}/billing`} style={{ marginLeft: 10 }}>
                {t(lang, "Open package billing page", "打开课包账单原页面")}
              </a>
            </div>
          </form>
        </div>
      ) : null}

      {selectedPackage && selectedBilling ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {t(lang, "Latest invoices for selected package", "该课包最近发票")}
          </div>
          {selectedBilling.invoices.length === 0 ? (
            <div style={{ color: "#64748b" }}>{t(lang, "No invoices yet.", "暂无发票。")}</div>
          ) : (
            <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th align="left">Invoice No.</th>
                  <th align="left">Issue</th>
                  <th align="left">Due</th>
                  <th align="left">Total</th>
                  <th align="left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {selectedBilling.invoices.slice(0, 8).map((inv) => (
                  <tr key={inv.id} style={{ borderTop: "1px solid #eee" }}>
                    <td>{inv.invoiceNo}</td>
                    <td>{normalizeDateOnly(inv.issueDate) ?? "-"}</td>
                    <td>{normalizeDateOnly(inv.dueDate) ?? "-"}</td>
                    <td>SGD {money(inv.totalAmount)}</td>
                    <td><a href={`/api/exports/parent-invoice/${encodeURIComponent(inv.id)}`}>Export PDF</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

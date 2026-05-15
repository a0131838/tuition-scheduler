import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatDateOnly } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import {
  createTransportInvoice,
  listTransportBillingRows,
  listTransportBillingStudentOptions,
  saveTransportBillingEntry,
} from "@/lib/transport-billing";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";

function money(v: number) {
  return `SGD ${Number(v || 0).toFixed(2)}`;
}

function currentMonth() {
  return formatDateOnly(new Date()).slice(0, 7);
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseAmount(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function redirectBack(month: string, studentId: string, extra: Record<string, string>) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (studentId) params.set("studentId", studentId);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  redirect(`/admin/finance/transport-billing?${params.toString()}`);
}

async function saveTransportRowAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const month = readString(formData, "month") || currentMonth();
  const studentId = readString(formData, "studentId");
  try {
    await saveTransportBillingEntry({
      sessionId: readString(formData, "sessionId"),
      studentId,
      amount: parseAmount(readString(formData, "amount")),
      billable: formData.get("billable") === "on",
      note: readString(formData, "note"),
      actorEmail: admin.email,
    });
  } catch (e) {
    redirectBack(month, studentId, { err: e instanceof Error ? e.message : "Save failed" });
  }
  redirectBack(month, studentId, { msg: "Transport row saved" });
}

async function createTransportInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const month = readString(formData, "month") || currentMonth();
  const studentId = readString(formData, "studentId");
  try {
    const invoice = await createTransportInvoice({
      month,
      studentId,
      issueDate: readString(formData, "issueDate"),
      dueDate: readString(formData, "dueDate"),
      actorEmail: admin.email,
    });
    redirectBack(month, studentId, { msg: `Transport invoice created: ${invoice.invoiceNo}` });
  } catch (e) {
    redirectBack(month, studentId, { err: e instanceof Error ? e.message : "Create invoice failed" });
  }
}

export default async function TransportBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; studentId?: string; msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(String(sp?.month ?? "")) ? String(sp?.month) : currentMonth();
  const selectedStudentId = String(sp?.studentId ?? "").trim();
  const msg = String(sp?.msg ?? "").trim();
  const err = String(sp?.err ?? "").trim();
  const today = formatDateOnly(new Date());

  const [studentOptions, workbench] = await Promise.all([
    listTransportBillingStudentOptions(month),
    listTransportBillingRows({ month, studentId: selectedStudentId || null }),
  ]);
  const rows = workbench.rows;
  const billableRows = rows.filter((row) => row.billable);
  const uninvoicedBillableRows = billableRows.filter((row) => !row.invoiceId);
  const invoicedRows = rows.filter((row) => row.invoiceId);
  const totalUninvoiced = uninvoicedBillableRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#047857" }}>
            {t(lang, "Parent transport reimbursement", "家长交通费报销账单")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Transport Billing", "交通费月结")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Mark home lessons that parents agreed to reimburse, then create a parent invoice from the month-end session list.",
              "把家长同意支付交通费的上门课标记出来，月底从课次列表直接生成家长发票。",
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Visible held lessons", "当前可见已上课次")}</div>
            <div style={workbenchMetricValueStyle("slate")}>{rows.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Billable not invoiced", "待开票交通课次")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{uninvoicedBillableRows.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("emerald")}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Uninvoiced total", "待开票金额")}</div>
            <div style={{ ...workbenchMetricValueStyle("emerald"), fontSize: 22 }}>{money(totalUninvoiced)}</div>
          </div>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Already invoiced", "已开票课次")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{invoicedRows.length}</div>
          </div>
        </div>
      </section>

      {msg ? <div style={{ padding: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8, color: "#166534", fontWeight: 800 }}>{decodeURIComponent(msg)}</div> : null}
      {err ? <div style={{ padding: 12, border: "1px solid #fecdd3", background: "#fff1f2", borderRadius: 8, color: "#be123c", fontWeight: 800 }}>{decodeURIComponent(err)}</div> : null}

      <section style={workbenchFilterPanelStyle}>
        <form method="get" style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(160px, 220px) minmax(220px, 360px) auto", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4, fontWeight: 800 }}>
            {t(lang, "Month", "月份")}
            <input name="month" type="month" defaultValue={month} />
          </label>
          <label style={{ display: "grid", gap: 4, fontWeight: 800 }}>
            {t(lang, "Student", "学生")}
            <select name="studentId" defaultValue={selectedStudentId}>
              <option value="">{t(lang, "All students", "全部学生")}</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
        </form>
      </section>

      <section style={{ border: "1px solid #dbeafe", borderRadius: 8, background: "#fff", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{t(lang, "Month-end invoice trigger", "月底开票触发")}</h2>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {t(lang, "Select one student before creating an invoice. The invoice uses marked, uninvoiced rows only.", "创建发票前请选择一个学生。系统只会使用已标记且未开票的课次。")}
            </div>
          </div>
          <form action={createTransportInvoiceAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="studentId" value={selectedStudentId} />
            <label style={{ display: "grid", gap: 3, fontSize: 12, fontWeight: 800 }}>
              {t(lang, "Issue date", "开票日期")}
              <input name="issueDate" type="date" defaultValue={today} />
            </label>
            <label style={{ display: "grid", gap: 3, fontSize: 12, fontWeight: 800 }}>
              {t(lang, "Due date", "到期日")}
              <input name="dueDate" type="date" defaultValue={today} />
            </label>
            <button type="submit" disabled={!selectedStudentId || uninvoicedBillableRows.length === 0}>
              {t(lang, "Create Transport Invoice", "创建交通费发票")}
            </button>
          </form>
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 900 }}>
          {t(lang, "Held lesson list", "已上课次列表")} ({rows.length})
        </div>
        <div style={{ overflowX: "auto" }}>
          <table cellPadding={8} style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left">{t(lang, "Date / Time", "日期 / 时间")}</th>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Teacher", "老师")}</th>
                <th align="left">{t(lang, "Course", "课程")}</th>
                <th align="left">{t(lang, "Campus / Room", "校区 / 教室")}</th>
                <th align="left">{t(lang, "Transport billing", "交通费账单")}</th>
                <th align="left">{t(lang, "Invoice", "发票")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} style={{ color: "#64748b" }}>{t(lang, "No held lessons found for this filter.", "当前筛选下没有已上课次。")}</td></tr>
              ) : rows.map((row) => (
                <tr key={row.key} style={{ borderTop: "1px solid #e2e8f0", verticalAlign: "top" }}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{row.dateText}</div>
                    <div style={{ color: "#475569" }}>{row.timeText}</div>
                  </td>
                  <td>{row.studentName}</td>
                  <td>{row.teacherName}</td>
                  <td>
                    <div>{row.courseName}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{row.subjectName}</div>
                  </td>
                  <td>
                    <div>{row.campusName}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{row.roomName}</div>
                  </td>
                  <td>
                    <form action={saveTransportRowAction} style={{ display: "grid", gap: 6, minWidth: 260 }}>
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="studentId" value={row.studentId} />
                      <input type="hidden" name="sessionId" value={row.sessionId} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}>
                        <input name="billable" type="checkbox" defaultChecked={row.billable} disabled={Boolean(row.invoiceId)} />
                        {t(lang, "Bill parent", "向家长收费")}
                      </label>
                      <input name="amount" type="number" min="0" step="0.01" defaultValue={row.amount.toFixed(2)} disabled={Boolean(row.invoiceId)} />
                      <input name="note" placeholder={t(lang, "Note, e.g. parent agreed", "备注，例如家长已同意")} defaultValue={row.note} disabled={Boolean(row.invoiceId)} />
                      {!row.invoiceId ? <button type="submit">{t(lang, "Save", "保存")}</button> : null}
                    </form>
                  </td>
                  <td>
                    {row.invoiceId ? (
                      <a href={`/api/exports/parent-invoice/${encodeURIComponent(row.invoiceId)}`} target="_blank" rel="noreferrer">
                        {row.invoiceNo}
                      </a>
                    ) : row.billable ? (
                      <span style={{ color: "#92400e", fontWeight: 800 }}>{t(lang, "Ready", "待开票")}</span>
                    ) : (
                      <span style={{ color: "#64748b" }}>-</span>
                    )}
                  </td>
                  <td>
                    <a href={`/admin/sessions/${encodeURIComponent(row.sessionId)}/attendance`}>
                      {t(lang, "Open attendance", "打开点名")}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

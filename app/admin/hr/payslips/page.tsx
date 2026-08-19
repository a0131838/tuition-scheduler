import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HrPayslipStatus } from "@prisma/client";
import { isStrictSuperAdmin, requireAdminAreaUser } from "@/lib/auth";
import { canManageHr } from "@/lib/hr-access";
import { formatHrMoney, saveDraftHrPayslip, transitionHrPayslip } from "@/lib/hr-payslip";
import { prisma } from "@/lib/prisma";

const fieldStyle = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", background: "#fff" } as const;
const buttonStyle = { minHeight: 40, border: "1px solid #1d4ed8", borderRadius: 6, padding: "8px 13px", background: "#2563eb", color: "#fff", fontWeight: 800 } as const;
const cents = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);

function isFinanceOperator(actor: { role: string; email: string; name: string }) {
  return actor.role === "FINANCE" || isStrictSuperAdmin(actor as Parameters<typeof isStrictSuperAdmin>[0]);
}

function allowedTransition(actor: { role: string; email: string; name: string }, hrManager: boolean, current: HrPayslipStatus, next: HrPayslipStatus) {
  if (next === "HR_VERIFIED" || next === "DIRECTOR_APPROVED") return hrManager;
  if (next === "FINANCE_CONFIRMED" || next === "PAID") return isFinanceOperator(actor);
  if (next === "DRAFT" || next === "VOID") return hrManager || isFinanceOperator(actor);
  return false;
}

export default async function HrPayslipsPage({ searchParams }: { searchParams?: Promise<{ month?: string; msg?: string; err?: string }> }) {
  const actor = await requireAdminAreaUser();
  const hrManager = await canManageHr(actor);
  if (!hrManager && actor.role !== "FINANCE") redirect("/admin?err=Payroll+access+required");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp?.month || "") ? sp!.month! : new Date().toISOString().slice(0, 7);

  async function save(formData: FormData) {
    "use server";
    const user = await requireAdminAreaUser();
    if (!(await canManageHr(user)) && user.role !== "FINANCE") redirect("/admin?err=Payroll+access+required");
    try {
      await saveDraftHrPayslip({
        employeeId: String(formData.get("employeeId") || ""), month: String(formData.get("month") || ""),
        basicSalaryCents: cents(formData.get("basicSalary")), allowanceCents: cents(formData.get("allowance")),
        deductionCents: cents(formData.get("deduction")), employeeCpfCents: cents(formData.get("employeeCpf")),
        employerCpfCents: cents(formData.get("employerCpf")), reimbursementCents: cents(formData.get("reimbursement")),
        note: String(formData.get("note") || ""), preparedBy: user,
      });
    } catch (error) { redirect(`/admin/hr/payslips?month=${month}&err=${encodeURIComponent(error instanceof Error ? error.message : "Payslip save failed")}`); }
    revalidatePath("/admin/hr/payslips"); redirect(`/admin/hr/payslips?month=${month}&msg=Draft+payslip+saved`);
  }

  async function transition(formData: FormData) {
    "use server";
    const user = await requireAdminAreaUser();
    const manager = await canManageHr(user);
    const payslipId = String(formData.get("payslipId") || "");
    const nextStatus = String(formData.get("nextStatus") || "") as HrPayslipStatus;
    const row = await prisma.hrPayslip.findUnique({ where: { id: payslipId }, select: { status: true } });
    if (!row || !Object.values(HrPayslipStatus).includes(nextStatus) || !allowedTransition(user, manager || isStrictSuperAdmin(user), row.status, nextStatus)) redirect(`/admin/hr/payslips?month=${month}&err=This+approval+step+is+not+assigned+to+your+role`);
    try { await transitionHrPayslip({ payslipId, nextStatus, paymentReference: String(formData.get("paymentReference") || ""), actor: user }); }
    catch (error) { redirect(`/admin/hr/payslips?month=${month}&err=${encodeURIComponent(error instanceof Error ? error.message : "Transition failed")}`); }
    revalidatePath("/admin/hr/payslips"); redirect(`/admin/hr/payslips?month=${month}&msg=Payslip+status+updated`);
  }

  const [employees, payslips] = await Promise.all([
    prisma.employeeProfile.findMany({ where: { employmentStatus: "ACTIVE", payrollEligible: true }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.hrPayslip.findMany({ where: { month }, include: { employee: { include: { user: true } }, legalEntity: true }, orderBy: { employee: { user: { name: "asc" } } } }),
  ]);
  const byEmployee = new Map(payslips.map(row => [row.employeeId, row]));

  return <main style={{ display: "grid", gap: 18 }}>
    <section style={{ border: "1px solid #bfdbfe", background: "#f8fbff", padding: 20, borderRadius: 8 }}><Link href={hrManager ? "/admin/hr" : "/admin"}>Back / 返回</Link><h1 style={{ margin: "8px 0 4px" }}>Monthly payslips / 月度工资单</h1><p style={{ margin: 0, color: "#475569" }}>Draft → HR verified → Finance confirmed → Director approved → Paid. Employees see only director-approved or paid payslips.</p></section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534" }}>{sp.msg}</div> : null}{sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c" }}>{sp.err}</div> : null}
    <form method="get" style={{ display: "flex", gap: 8, alignItems: "end" }}><label>Payroll month / 工资月份<input name="month" type="month" defaultValue={month} style={{ ...fieldStyle, display: "block" }}/></label><button style={buttonStyle}>Apply / 应用</button></form>
    <section><h2>Payroll preparation / 工资准备</h2><div style={{ display: "grid", gap: 14 }}>{employees.map(employee => { const row = byEmployee.get(employee.id); return <article key={employee.id} style={{ border: "1px solid #dbe4f0", borderRadius: 8, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><h3 style={{ margin: 0 }}>{employee.user.name}</h3><span>{employee.jobTitle || "-"} · {employee.employeeNo || "-"}</span></div><b>{row ? `${row.status} · ${formatHrMoney(row.netPayCents, row.currencyCode)}` : "NOT PREPARED / 未创建"}</b></div>
        {(!row || row.status === "DRAFT") ? <form action={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginTop: 12, alignItems: "end" }}><input type="hidden" name="employeeId" value={employee.id}/><input type="hidden" name="month" value={month}/>{[["basicSalary","Basic salary / 基本工资",row?.basicSalaryCents],["allowance","Allowance / 津贴",row?.allowanceCents],["deduction","Deduction / 扣款",row?.deductionCents],["employeeCpf","Employee CPF / 员工CPF",row?.employeeCpfCents],["employerCpf","Employer CPF / 雇主CPF",row?.employerCpfCents],["reimbursement","Reimbursement / 报销",row?.reimbursementCents]].map(([name,label,value]) => <label key={String(name)}>{label}<input name={String(name)} type="number" min="0" step="0.01" defaultValue={value == null ? "" : Number(value)/100} style={{ ...fieldStyle, width: "100%" }}/></label>)}<label style={{ gridColumn: "1/-1" }}>Note / 备注<input name="note" defaultValue={row?.note || ""} style={{ ...fieldStyle, width: "100%" }}/></label><button style={buttonStyle}>Save draft / 保存草稿</button></form> : null}
        {row ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><a href={`/api/hr/payslips/${row.id}/pdf`} style={{ ...buttonStyle, background: "#fff", color: "#1d4ed8" }}>Preview PDF / 查看 PDF</a>{row.status === "DRAFT" && hrManager ? <form action={transition}><input type="hidden" name="payslipId" value={row.id}/><button name="nextStatus" value="HR_VERIFIED" style={buttonStyle}>HR verify / HR 核验</button></form> : null}{row.status === "HR_VERIFIED" && isFinanceOperator(actor) ? <form action={transition}><input type="hidden" name="payslipId" value={row.id}/><button name="nextStatus" value="FINANCE_CONFIRMED" style={buttonStyle}>Finance confirm / 财务确认</button></form> : null}{row.status === "FINANCE_CONFIRMED" && hrManager ? <form action={transition}><input type="hidden" name="payslipId" value={row.id}/><button name="nextStatus" value="DIRECTOR_APPROVED" style={buttonStyle}>Director approve / Jasmine 批准</button></form> : null}{row.status === "DIRECTOR_APPROVED" && isFinanceOperator(actor) ? <form action={transition} style={{ display: "flex", gap: 6 }}><input type="hidden" name="payslipId" value={row.id}/><input name="paymentReference" required placeholder="Payment reference / 付款编号" style={fieldStyle}/><button name="nextStatus" value="PAID" style={buttonStyle}>Mark paid / 已付款</button></form> : null}</div> : null}
      </article>; })}</div></section>
  </main>;
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HrChecklistStatus, HrLeaveLedgerEntryType, HrLeaveType } from "@prisma/client";
import { requireHrManager } from "@/lib/hr-access";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getEmployeeLeaveBalances, hrLeaveTypeLabel } from "@/lib/hr-leave";

const inputStyle = { minHeight: 38, border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 9px", background: "#fff" } as const;
const buttonStyle = { minHeight: 38, border: "1px solid #1d4ed8", borderRadius: 6, padding: "7px 12px", color: "#fff", background: "#2563eb", fontWeight: 800 } as const;

export default async function EmployeeHrPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ msg?: string; err?: string }> }) {
  await requireHrManager();
  const { id } = await params;
  const sp = await searchParams;

  async function updateChecklist(formData: FormData) {
    "use server";
    const actor = await requireHrManager();
    const itemId = String(formData.get("itemId") || "");
    const status = String(formData.get("status") || "PENDING") as HrChecklistStatus;
    if (!Object.values(HrChecklistStatus).includes(status)) redirect(`/admin/hr/employees/${id}?err=Invalid+checklist+status`);
    const row = await prisma.hrChecklistItem.update({
      where: { id: itemId },
      data: {
        status,
        dueDate: formData.get("dueDate") ? new Date(`${String(formData.get("dueDate"))}T00:00:00+08:00`) : null,
        note: String(formData.get("note") || "").trim() || null,
        verifiedById: status === "VERIFIED" ? actor.id : null,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
      },
    });
    await logAudit({ actor, module: "hr", action: "CHECKLIST_UPDATED", entityType: "HrChecklistItem", entityId: row.id, meta: { status } });
    revalidatePath(`/admin/hr/employees/${id}`);
    redirect(`/admin/hr/employees/${id}?msg=Checklist+updated`);
  }

  async function addLeaveBalance(formData: FormData) {
    "use server";
    const actor = await requireHrManager();
    const leaveType = String(formData.get("leaveType") || "ANNUAL") as HrLeaveType;
    const minutes = Math.round(Number(formData.get("days") || 0) * 8 * 60);
    if (!Object.values(HrLeaveType).includes(leaveType) || !minutes) redirect(`/admin/hr/employees/${id}?err=Enter+a+non-zero+leave+adjustment`);
    const row = await prisma.hrLeaveLedgerEntry.create({
      data: {
        employeeId: id,
        leaveType,
        entryType: HrLeaveLedgerEntryType.ADJUSTMENT,
        minutes,
        source: String(formData.get("source") || "MANUAL_HR_ADJUSTMENT").trim(),
        note: String(formData.get("note") || "").trim() || null,
        expiresAt: formData.get("expiresAt") ? new Date(`${String(formData.get("expiresAt"))}T23:59:59+08:00`) : null,
        createdById: actor.id,
      },
    });
    await logAudit({ actor, module: "hr", action: "LEAVE_BALANCE_ADJUSTED", entityType: "HrLeaveLedgerEntry", entityId: row.id, meta: { leaveType, minutes } });
    revalidatePath(`/admin/hr/employees/${id}`);
    redirect(`/admin/hr/employees/${id}?msg=Leave+balance+updated`);
  }

  async function grantAnnualEntitlement(formData: FormData) {
    "use server";
    const actor = await requireHrManager();
    const year = Math.max(2020, Math.min(2100, Number(formData.get("year") || new Date().getFullYear())));
    const profile = await prisma.employeeProfile.findUnique({ where: { id }, select: { legalEntityId: true } });
    if (!profile) redirect(`/admin/hr/employees/${id}?err=Employee+not+found`);
    const policies = await prisma.hrLeavePolicy.findMany({ where: { legalEntityId: profile.legalEntityId, isActive: true, annualEntitlementMinutes: { gt: 0 } } });
    if (!policies.length) redirect(`/admin/hr/employees/${id}?err=Configure+leave+policy+entitlements+first`);
    for (const policy of policies) {
      const source = `POLICY_ENTITLEMENT:${year}:${policy.leaveType}`;
      const exists = await prisma.hrLeaveLedgerEntry.findFirst({ where: { employeeId: id, leaveType: policy.leaveType, source } });
      if (!exists) await prisma.hrLeaveLedgerEntry.create({ data: { employeeId: id, leaveType: policy.leaveType, entryType: HrLeaveLedgerEntryType.ACCRUAL, minutes: policy.annualEntitlementMinutes, source, note: `Annual entitlement ${year}`, createdById: actor.id } });
    }
    await logAudit({ actor, module: "hr", action: "ANNUAL_ENTITLEMENT_GRANTED", entityType: "EmployeeProfile", entityId: id, meta: { year } });
    revalidatePath(`/admin/hr/employees/${id}`); redirect(`/admin/hr/employees/${id}?msg=Annual+entitlement+granted`);
  }

  const employee = await prisma.employeeProfile.findUnique({
    where: { id },
    include: {
      user: true,
      legalEntity: true,
      manager: true,
      checklist: { orderBy: [{ stage: "asc" }, { code: "asc" }] },
      documents: { where: { archivedAt: null }, orderBy: { createdAt: "desc" } },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 20 },
      leaveLedger: { orderBy: { createdAt: "desc" }, take: 50 },
      payslips: { orderBy: { month: "desc" }, take: 12 },
    },
  });
  if (!employee) notFound();
  const balances = await getEmployeeLeaveBalances(employee.id);

  return <main style={{ display: "grid", gap: 18 }}>
    <section style={{ border: "1px solid #bfdbfe", background: "#f8fbff", padding: 20, borderRadius: 8 }}>
      <Link href="/admin/hr">Back to HR / 返回 HR</Link>
      <h1 style={{ margin: "8px 0 4px" }}>{employee.user.name} · {employee.employeeNo || "No employee number"}</h1>
      <div>{employee.user.email} · {employee.jobTitle || "-"} · {employee.department || "-"}</div>
      <div style={{ color: "#64748b", marginTop: 4 }}>{employee.legalEntity.name} · {employee.employmentType} · Start {employee.startDate.toLocaleDateString("en-SG")} · Approver {employee.manager?.name || "system fallback"}</div>
    </section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534" }}>{sp.msg}</div> : null}
    {sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c" }}>{sp.err}</div> : null}

    <section>
      <h2>Leave balances / 假期余额</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{Object.values(HrLeaveType).map(type => <div key={type} style={{ padding: 12, border: "1px solid #dbe4f0", borderRadius: 6 }}><b>{hrLeaveTypeLabel(type)}</b><div style={{ fontSize: 24, fontWeight: 900 }}>{((balances.get(type) || 0) / 480).toFixed(1)} days</div></div>)}</div>
      <form action={addLeaveBalance} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginTop: 12, alignItems: "end" }}>
        <select name="leaveType" style={inputStyle}>{Object.values(HrLeaveType).map(type => <option key={type}>{type}</option>)}</select>
        <input name="days" type="number" step="0.5" required placeholder="Days (+/-) / 天数" style={inputStyle}/>
        <input name="source" defaultValue="MANUAL_HR_ADJUSTMENT" placeholder="Source / 来源" style={inputStyle}/>
        <input name="expiresAt" type="date" title="Expiry / 到期日" style={inputStyle}/>
        <input name="note" placeholder="Approved reason / 依据" style={inputStyle}/>
        <button style={buttonStyle}>Adjust balance / 调整余额</button>
      </form>
      <form action={grantAnnualEntitlement} style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "end" }}><label>Policy year / 政策年度<input name="year" type="number" defaultValue={new Date().getFullYear()} style={{ ...inputStyle, display: "block" }}/></label><button style={{ ...buttonStyle, background: "#fff", color: "#1d4ed8" }}>Grant configured entitlement once / 按政策发放余额</button></form>
    </section>

    <section>
      <h2>Employee lifecycle checklist / 员工全周期清单</h2>
      <div style={{ display: "grid", gap: 8 }}>{employee.checklist.map(item => <form key={item.id} action={updateChecklist} style={{ display: "grid", gridTemplateColumns: "minmax(220px,2fr) minmax(140px,1fr) minmax(140px,1fr) minmax(200px,2fr) auto", gap: 8, alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "8px 0" }}>
        <input type="hidden" name="itemId" value={item.id}/><div><b>{item.labelEn} / {item.labelZh}</b><br/><span style={{ color: "#64748b", fontSize: 12 }}>{item.stage} · {item.code}</span></div>
        <select name="status" defaultValue={item.status} style={inputStyle}>{Object.values(HrChecklistStatus).map(status => <option key={status}>{status}</option>)}</select>
        <input name="dueDate" type="date" defaultValue={item.dueDate?.toISOString().slice(0, 10)} style={inputStyle}/>
        <input name="note" defaultValue={item.note || ""} placeholder="Note / 备注" style={inputStyle}/>
        <button style={buttonStyle}>Save</button>
      </form>)}</div>
    </section>

    <section>
      <h2>Private HR documents / 私密人事文件</h2>
      <form action="/api/hr/documents" method="post" encType="multipart/form-data" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, alignItems: "end" }}>
        <input type="hidden" name="employeeId" value={employee.id}/><input type="hidden" name="legalEntityId" value={employee.legalEntityId}/><input type="hidden" name="returnTo" value={`/admin/hr/employees/${employee.id}`}/>
        <input name="category" required placeholder="Category / 文件类别" style={inputStyle}/>
        <select name="sensitivity" style={inputStyle}><option>RESTRICTED</option><option>STANDARD</option><option>HIGHLY_RESTRICTED</option></select>
        <input name="expiresAt" type="date" title="Expiry / 到期日" style={inputStyle}/>
        <input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" style={inputStyle}/>
        <button style={buttonStyle}>Upload privately / 私密上传</button>
      </form>
      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>{employee.documents.map(doc => <div key={doc.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", padding: 10, borderBottom: "1px solid #e2e8f0" }}><span><b>{doc.category}</b> · {doc.originalName} · {doc.sensitivity}{doc.expiresAt ? ` · expires ${doc.expiresAt.toLocaleDateString("en-SG")}` : ""}</span><a href={`/api/hr/documents/${doc.id}`}>Open / 打开</a></div>)}</div>
    </section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
      <div><h2>Leave history / 假期历史</h2>{employee.leaveRequests.map(row => <div key={row.id} style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}><b>{hrLeaveTypeLabel(row.leaveType)}</b> · {row.status}<br/>{row.startAt.toLocaleDateString("en-SG")} - {row.endAt.toLocaleDateString("en-SG")} · {(row.durationMinutes / 480).toFixed(1)} days · schedule conflicts {row.scheduleConflictCount}</div>)}</div>
      <div><h2>Balance ledger / 余额流水</h2>{employee.leaveLedger.map(row => <div key={row.id} style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}><b>{row.leaveType}</b> · {row.entryType} · {(row.minutes / 480).toFixed(1)} days<br/><span style={{ color: "#64748b" }}>{row.source} · {row.note || "-"}</span></div>)}</div>
      <div><h2>Payslips / 工资单</h2>{employee.payslips.map(row => <div key={row.id} style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}><b>{row.month}</b> · {row.status} · {row.currencyCode} {(row.netPayCents / 100).toFixed(2)} · <a href={`/api/hr/payslips/${row.id}/pdf`}>PDF</a></div>)}</div>
    </section>
  </main>;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HrLeaveType } from "@prisma/client";
import { requireHrManager } from "@/lib/hr-access";
import { ensureEmployeeChecklist } from "@/lib/hr-checklist";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

const fieldStyle = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", background: "#fff" } as const;
const buttonStyle = { minHeight: 40, border: "1px solid #1d4ed8", borderRadius: 6, padding: "8px 14px", background: "#2563eb", color: "#fff", fontWeight: 800 } as const;

function minutesFromDays(value: FormDataEntryValue | null) {
  return Math.max(0, Math.round(Number(value || 0) * 8 * 60));
}

export default async function HrDashboardPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  const actor = await requireHrManager();
  const sp = await searchParams;

  async function createLegalEntity(formData: FormData) {
    "use server";
    const user = await requireHrManager();
    const name = String(formData.get("name") || "").trim();
    if (!name) redirect("/admin/hr?err=Legal+entity+name+is+required");
    const row = await prisma.hrLegalEntity.upsert({
      where: { name },
      create: {
        name,
        registrationNumber: String(formData.get("registrationNumber") || "").trim() || null,
        countryCode: String(formData.get("countryCode") || "SG").trim().toUpperCase(),
      },
      update: {
        registrationNumber: String(formData.get("registrationNumber") || "").trim() || null,
        countryCode: String(formData.get("countryCode") || "SG").trim().toUpperCase(),
        isActive: true,
      },
    });
    await logAudit({ actor: user, module: "hr", action: "LEGAL_ENTITY_SAVED", entityType: "HrLegalEntity", entityId: row.id });
    revalidatePath("/admin/hr");
    redirect("/admin/hr?msg=Legal+entity+saved");
  }

  async function saveEmployee(formData: FormData) {
    "use server";
    const user = await requireHrManager();
    const userId = String(formData.get("userId") || "");
    const legalEntityId = String(formData.get("legalEntityId") || "");
    const startDate = new Date(`${String(formData.get("startDate") || "")}T00:00:00+08:00`);
    if (!userId || !legalEntityId || Number.isNaN(startDate.getTime())) redirect("/admin/hr?err=Employee,+entity+and+start+date+are+required");
    const account = await prisma.user.findUnique({ where: { id: userId }, select: { teacherId: true } });
    if (!account) redirect("/admin/hr?err=User+not+found");
    const isLocal = String(formData.get("employeeCategory") || "LOCAL") === "LOCAL";
    const row = await prisma.employeeProfile.upsert({
      where: { userId },
      create: {
        userId,
        teacherId: account.teacherId,
        legalEntityId,
        employeeNo: String(formData.get("employeeNo") || "").trim() || null,
        employmentType: String(formData.get("employmentType") || "FULL_TIME"),
        department: String(formData.get("department") || "").trim() || null,
        jobTitle: String(formData.get("jobTitle") || "").trim() || null,
        managerUserId: String(formData.get("managerUserId") || "").trim() || null,
        startDate,
        nationality: String(formData.get("nationality") || "").trim() || null,
        workPassType: isLocal ? null : String(formData.get("workPassType") || "").trim() || null,
        payrollEligible: formData.get("payrollEligible") === "on",
        leaveEligible: formData.get("leaveEligible") === "on",
        workPattern: { workDays: [1, 2, 3, 4, 5], dailyMinutes: 480 },
        createdByUserId: user.id,
        updatedByUserId: user.id,
      },
      update: {
        teacherId: account.teacherId,
        legalEntityId,
        employeeNo: String(formData.get("employeeNo") || "").trim() || null,
        employmentType: String(formData.get("employmentType") || "FULL_TIME"),
        department: String(formData.get("department") || "").trim() || null,
        jobTitle: String(formData.get("jobTitle") || "").trim() || null,
        managerUserId: String(formData.get("managerUserId") || "").trim() || null,
        startDate,
        nationality: String(formData.get("nationality") || "").trim() || null,
        workPassType: isLocal ? null : String(formData.get("workPassType") || "").trim() || null,
        payrollEligible: formData.get("payrollEligible") === "on",
        leaveEligible: formData.get("leaveEligible") === "on",
        updatedByUserId: user.id,
      },
    });
    await ensureEmployeeChecklist(row.id, user.id);
    await logAudit({ actor: user, module: "hr", action: "EMPLOYEE_PROFILE_SAVED", entityType: "EmployeeProfile", entityId: row.id });
    revalidatePath("/admin/hr");
    redirect(`/admin/hr/employees/${row.id}?msg=Employee+profile+saved`);
  }

  async function savePolicy(formData: FormData) {
    "use server";
    const user = await requireHrManager();
    const legalEntityId = String(formData.get("legalEntityId") || "");
    const leaveType = String(formData.get("leaveType") || "ANNUAL") as HrLeaveType;
    if (!legalEntityId || !Object.values(HrLeaveType).includes(leaveType)) redirect("/admin/hr?err=Invalid+leave+policy");
    const row = await prisma.hrLeavePolicy.upsert({
      where: { legalEntityId_leaveType: { legalEntityId, leaveType } },
      create: {
        legalEntityId,
        leaveType,
        annualEntitlementMinutes: minutesFromDays(formData.get("annualDays")),
        carryForwardMinutes: minutesFromDays(formData.get("carryDays")),
        requiresAttachment: formData.get("requiresAttachment") === "on",
        allowHalfDay: formData.get("allowHalfDay") === "on",
        allowHourly: formData.get("allowHourly") === "on",
      },
      update: {
        annualEntitlementMinutes: minutesFromDays(formData.get("annualDays")),
        carryForwardMinutes: minutesFromDays(formData.get("carryDays")),
        requiresAttachment: formData.get("requiresAttachment") === "on",
        allowHalfDay: formData.get("allowHalfDay") === "on",
        allowHourly: formData.get("allowHourly") === "on",
        isActive: true,
      },
    });
    await logAudit({ actor: user, module: "hr", action: "LEAVE_POLICY_SAVED", entityType: "HrLeavePolicy", entityId: row.id });
    revalidatePath("/admin/hr");
    redirect("/admin/hr?msg=Leave+policy+saved");
  }

  const [entities, accounts, employees, pendingLeave, incompleteChecklist, expiringDocuments] = await Promise.all([
    prisma.hrLegalEntity.findMany({ where: { isActive: true }, include: { leavePolicies: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "FINANCE", "TEACHER", "CS", "SALES"] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
    prisma.employeeProfile.findMany({ include: { user: true, legalEntity: true, manager: true, checklist: true }, orderBy: { user: { name: "asc" } } }),
    prisma.hrLeaveRequest.count({ where: { status: "SUBMITTED" } }),
    prisma.hrChecklistItem.count({ where: { status: { in: ["NOT_STARTED", "PENDING", "EXPIRED"] } } }),
    prisma.hrDocument.count({ where: { archivedAt: null, expiresAt: { lte: new Date(Date.now() + 90 * 86400000), gte: new Date() } } }),
  ]);

  return <main style={{ display: "grid", gap: 18 }}>
    <section style={{ border: "1px solid #bfdbfe", background: "#f8fbff", padding: 20, borderRadius: 8 }}>
      <div style={{ color: "#1d4ed8", fontWeight: 800 }}>HRIS / 人力资源系统</div>
      <h1 style={{ margin: "6px 0" }}>Employee lifecycle, leave and payroll / 员工全周期、假期与工资单</h1>
      <p style={{ color: "#475569", margin: 0 }}>Jasmine is the leave and director approval owner. HR files are private and finance cannot access employee files.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <Link href="/admin/hr/leave" style={buttonStyle}>Leave approvals / 假期审批</Link>
        <Link href="/admin/hr/payslips" style={{ ...buttonStyle, background: "#fff", color: "#1d4ed8" }}>Payslips / 工资单</Link>
        <Link href="/admin/hr/my" style={{ ...buttonStyle, background: "#fff", color: "#1d4ed8" }}>My HR / 我的 HR</Link>
      </div>
    </section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534", border: "1px solid #86efac" }}>{sp.msg}</div> : null}
    {sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c", border: "1px solid #fda4af" }}>{sp.err}</div> : null}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
      {[["Employees / 员工", employees.length], ["Pending leave / 待审批", pendingLeave], ["Checklist gaps / 清单待补", incompleteChecklist], ["Documents expiring / 即将到期", expiringDocuments]].map(([label, value]) => <div key={String(label)} style={{ border: "1px solid #dbe4f0", padding: 16, borderRadius: 8, background: "#fff" }}><div style={{ color: "#64748b" }}>{label}</div><div style={{ fontSize: 30, fontWeight: 900 }}>{value}</div></div>)}
    </section>

    <section style={{ borderTop: "1px solid #cbd5e1", paddingTop: 18 }}>
      <h2>Employees / 员工档案</h2>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Employee / 员工", "Entity / 雇主", "Employment / 雇佣", "Manager / 审批人", "Checklist / 清单", "Action / 操作"].map(x => <th key={x} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #cbd5e1" }}>{x}</th>)}</tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}><b>{employee.user.name}</b><br/><span style={{ color: "#64748b" }}>{employee.user.email}</span></td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{employee.legalEntity.name}</td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{employee.employmentType}<br/>{employee.startDate.toLocaleDateString("en-SG")}</td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{employee.manager?.name || "-"}</td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{employee.checklist.filter(item => item.status === "VERIFIED" || item.status === "NOT_APPLICABLE").length}/{employee.checklist.length}</td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}><Link href={`/admin/hr/employees/${employee.id}`}>Open / 打开</Link></td></tr>)}</tbody></table></div>
    </section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
      <form action={createLegalEntity} style={{ display: "grid", gap: 10, border: "1px solid #dbe4f0", padding: 16, borderRadius: 8 }}>
        <h2 style={{ margin: 0 }}>1. Legal entity / 法律雇主</h2>
        <input name="name" required placeholder="GT Educational Institute Pte. Ltd." style={fieldStyle}/>
        <input name="registrationNumber" placeholder="Registration / UEN" style={fieldStyle}/>
        <input name="countryCode" defaultValue="SG" style={fieldStyle}/>
        <button style={buttonStyle}>Save entity / 保存雇主</button>
      </form>
      <form action={saveEmployee} style={{ display: "grid", gap: 10, border: "1px solid #dbe4f0", padding: 16, borderRadius: 8 }}>
        <h2 style={{ margin: 0 }}>2. Employee profile / 员工档案</h2>
        <select name="userId" required style={fieldStyle}><option value="">Select system account / 选择账号</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.email} · {account.role}</option>)}</select>
        <select name="legalEntityId" required style={fieldStyle}><option value="">Select legal entity / 选择雇主</option>{entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><input name="employeeNo" placeholder="Employee No. / 员工号" style={fieldStyle}/><input name="startDate" type="date" required style={fieldStyle}/></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><select name="employmentType" style={fieldStyle}><option value="FULL_TIME">Full time / 全职</option><option value="PART_TIME">Part time / 兼职</option><option value="CONTRACT">Contract / 合同制</option></select><select name="employeeCategory" style={fieldStyle}><option value="LOCAL">Local / 本地员工</option><option value="FOREIGN">Foreign / 外籍员工</option></select></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><input name="department" placeholder="Department / 部门" style={fieldStyle}/><input name="jobTitle" placeholder="Job title / 职位" style={fieldStyle}/></div>
        <select name="managerUserId" style={fieldStyle}><option value="">Select approver / 选择审批人</option>{accounts.filter(x => x.role === "ADMIN").map(account => <option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}</select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><input name="nationality" placeholder="Nationality / 国籍" style={fieldStyle}/><input name="workPassType" placeholder="Work pass / 准证类型" style={fieldStyle}/></div>
        <label><input name="payrollEligible" type="checkbox" defaultChecked/> Payroll eligible / 纳入工资</label>
        <label><input name="leaveEligible" type="checkbox" defaultChecked/> Leave eligible / 可申请假期</label>
        <button style={buttonStyle} disabled={!entities.length}>Save and create checklist / 保存并生成清单</button>
      </form>
      <form action={savePolicy} style={{ display: "grid", gap: 10, border: "1px solid #dbe4f0", padding: 16, borderRadius: 8 }}>
        <h2 style={{ margin: 0 }}>3. Leave policy / 假期政策</h2>
        <select name="legalEntityId" required style={fieldStyle}><option value="">Select legal entity / 选择雇主</option>{entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select>
        <select name="leaveType" style={fieldStyle}>{Object.values(HrLeaveType).map(type => <option key={type} value={type}>{type}</option>)}</select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><input name="annualDays" type="number" min="0" step="0.5" placeholder="Entitlement days / 年度天数" style={fieldStyle}/><input name="carryDays" type="number" min="0" step="0.5" placeholder="Carry forward days / 可结转天数" style={fieldStyle}/></div>
        <label><input name="requiresAttachment" type="checkbox"/> Require attachment / 需要附件</label>
        <label><input name="allowHalfDay" type="checkbox" defaultChecked/> Allow half day / 允许半天</label>
        <label><input name="allowHourly" type="checkbox"/> Allow hourly / 允许按小时</label>
        <button style={buttonStyle} disabled={!entities.length}>Save policy / 保存政策</button>
      </form>
    </section>
    <p style={{ color: "#64748b" }}>Configured entities: {entities.map(entity => `${entity.name} (${entity.leavePolicies.length} policies)`).join(" · ") || "None"}. Signed HR documents are retained in private storage with access logs.</p>
  </main>;
}

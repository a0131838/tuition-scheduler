import { HrLeaveType } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentEmployee } from "@/lib/hr-access";
import { cancelLeaveRequest, getEmployeeLeaveBalances, hrLeaveTypeLabel, submitLeaveRequest } from "@/lib/hr-leave";
import { storePrivateHrFile } from "@/lib/hr-private-files";
import { prisma } from "@/lib/prisma";

const fieldStyle = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", background: "#fff" } as const;
const buttonStyle = { minHeight: 42, border: "1px solid #1d4ed8", borderRadius: 6, padding: "8px 14px", color: "#fff", background: "#2563eb", fontWeight: 800 } as const;

export default async function HrSelfService({ returnPath, searchParams }: { returnPath: string; searchParams?: Promise<{ msg?: string; err?: string }> }) {
  const { user, employee } = await requireCurrentEmployee();
  const sp = await searchParams;

  async function submit(formData: FormData) {
    "use server";
    const current = await requireCurrentEmployee();
    const leaveType = String(formData.get("leaveType") || "ANNUAL") as HrLeaveType;
    const startDate = String(formData.get("startDate") || "");
    const endDate = String(formData.get("endDate") || startDate);
    const startAt = new Date(`${startDate}T00:00:00+08:00`);
    const endAt = new Date(`${endDate}T23:59:59.999+08:00`);
    if (!Object.values(HrLeaveType).includes(leaveType) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) redirect(`${returnPath}?err=Valid+leave+dates+are+required`);
    const policy = await prisma.hrLeavePolicy.findUnique({ where: { legalEntityId_leaveType: { legalEntityId: current.employee.legalEntityId, leaveType } } });
    const attachmentValue = formData.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.size > 0
      ? await storePrivateHrFile(attachmentValue, current.employee.id, "leave")
      : null;
    if (policy?.requiresAttachment && !attachment) redirect(`${returnPath}?err=This+leave+type+requires+an+attachment`);
    try {
      await submitLeaveRequest({
        employeeId: current.employee.id,
        leaveType,
        startAt,
        endAt,
        portion: String(formData.get("portion") || "FULL_DAY") as "FULL_DAY" | "HALF_DAY" | "HOURLY",
        hourlyMinutes: Math.round(Number(formData.get("hours") || 0) * 60),
        reason: String(formData.get("reason") || ""),
        attachment: attachment ? { privatePath: attachment.privatePath, originalName: attachment.originalName, mimeType: attachment.mimeType } : null,
        actor: current.user,
      });
    } catch (error) {
      redirect(`${returnPath}?err=${encodeURIComponent(error instanceof Error ? error.message : "Leave submission failed")}`);
    }
    revalidatePath(returnPath);
    redirect(`${returnPath}?msg=Leave+request+submitted`);
  }

  async function cancel(formData: FormData) {
    "use server";
    const current = await requireCurrentEmployee();
    try {
      await cancelLeaveRequest({ requestId: String(formData.get("requestId") || ""), employeeUserId: current.user.id, reason: String(formData.get("reason") || ""), actor: current.user });
    } catch (error) {
      redirect(`${returnPath}?err=${encodeURIComponent(error instanceof Error ? error.message : "Cancellation failed")}`);
    }
    revalidatePath(returnPath);
    redirect(`${returnPath}?msg=Leave+request+cancelled`);
  }

  const [requests, balances, policies, payslips] = await Promise.all([
    prisma.hrLeaveRequest.findMany({ where: { employeeId: employee.id }, include: { approver: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    getEmployeeLeaveBalances(employee.id),
    prisma.hrLeavePolicy.findMany({ where: { legalEntityId: employee.legalEntityId, isActive: true } }),
    prisma.hrPayslip.findMany({ where: { employeeId: employee.id, status: { in: ["DIRECTOR_APPROVED", "PAID"] } }, orderBy: { month: "desc" }, take: 24 }),
  ]);
  const policyMap = new Map(policies.map(policy => [policy.leaveType, policy]));

  return <main style={{ display: "grid", gap: 18 }}>
    <section style={{ padding: 20, border: "1px solid #bfdbfe", borderRadius: 8, background: "#f8fbff" }}>
      <div style={{ color: "#1d4ed8", fontWeight: 800 }}>Employee self-service / 员工自助</div>
      <h1 style={{ margin: "6px 0" }}>{user.name} · My HR / 我的 HR</h1>
      <div style={{ color: "#475569" }}>{employee.jobTitle || "-"} · {employee.legalEntity.name} · Approver {employee.manager?.name || "HR manager"}</div>
    </section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534" }}>{sp.msg}</div> : null}
    {sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c" }}>{sp.err}</div> : null}
    <section><h2>Leave balance / 假期余额</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{Object.values(HrLeaveType).map(type => <div key={type} style={{ border: "1px solid #dbe4f0", borderRadius: 6, padding: 12 }}><b>{hrLeaveTypeLabel(type)}</b><div style={{ fontSize: 26, fontWeight: 900 }}>{((balances.get(type) || 0) / 480).toFixed(1)} days</div><small>{policyMap.has(type) ? "Policy active / 政策已配置" : "No balance policy / 未配置余额政策"}</small></div>)}</div></section>
    <section style={{ borderTop: "1px solid #cbd5e1", paddingTop: 16 }}>
      <h2>Apply for leave / 提交请假</h2>
      <form action={submit} encType="multipart/form-data" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        <label>Leave type / 假期类型<select name="leaveType" style={{ ...fieldStyle, width: "100%" }}>{Object.values(HrLeaveType).map(type => <option key={type} value={type}>{hrLeaveTypeLabel(type)}</option>)}</select></label>
        <label>Start / 开始<input name="startDate" type="date" required style={{ ...fieldStyle, width: "100%" }}/></label>
        <label>End / 结束<input name="endDate" type="date" required style={{ ...fieldStyle, width: "100%" }}/></label>
        <label>Portion / 时段<select name="portion" style={{ ...fieldStyle, width: "100%" }}><option value="FULL_DAY">Full day / 全天</option><option value="HALF_DAY">Half day / 半天</option><option value="HOURLY">Hourly / 小时</option></select></label>
        <label>Hours (hourly only) / 小时<input name="hours" type="number" min="0.5" max="8" step="0.5" style={{ ...fieldStyle, width: "100%" }}/></label>
        <label>MC / supporting file / 附件<input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.heic" style={{ ...fieldStyle, width: "100%" }}/></label>
        <label style={{ gridColumn: "1/-1" }}>Reason / 原因<textarea name="reason" rows={3} style={{ ...fieldStyle, width: "100%" }}/></label>
        <button style={buttonStyle}>Submit to approver / 提交审批</button>
      </form>
    </section>
    <section><h2>Requests / 申请记录</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Period / 日期", "Type / 类型", "Duration / 时长", "Status / 状态", "Approver / 审批人", "Schedule / 课表", "Action / 操作"].map(x => <th key={x} style={{ textAlign: "left", padding: 9, borderBottom: "1px solid #cbd5e1" }}>{x}</th>)}</tr></thead><tbody>{requests.map(row => <tr key={row.id}><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.startAt.toLocaleDateString("en-SG")} - {new Date(row.endAt.getTime() - 1).toLocaleDateString("en-SG")}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{hrLeaveTypeLabel(row.leaveType)}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{(row.durationMinutes / 480).toFixed(1)} days</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}><b>{row.status}</b>{row.decisionNote ? <><br/><small>{row.decisionNote}</small></> : null}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.approver?.name || "HR"}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.scheduleConflictCount ? `${row.scheduleConflictCount} conflict(s)` : "Clear"}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.attachmentOriginalName ? <><a href={`/api/hr/leave/${row.id}/attachment`} target="_blank" rel="noreferrer">Attachment / 附件</a><br/></> : null}{row.status === "SUBMITTED" || row.status === "APPROVED" ? <form action={cancel}><input type="hidden" name="requestId" value={row.id}/><input type="hidden" name="reason" value="Cancelled by employee"/><button style={{ ...buttonStyle, color: "#be123c", background: "#fff", borderColor: "#fda4af" }}>Cancel / 取消</button></form> : "-"}</td></tr>)}</tbody></table></div></section>
    <section><h2>Payslips / 工资单</h2>{payslips.length ? payslips.map(row => <div key={row.id} style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}><b>{row.month}</b> · {row.currencyCode} {(row.netPayCents / 100).toFixed(2)} · {row.status} · <a href={`/api/hr/payslips/${row.id}/pdf`}>Open PDF / 打开 PDF</a></div>) : <p>No approved payslips yet / 暂无已批准工资单</p>}</section>
  </main>;
}

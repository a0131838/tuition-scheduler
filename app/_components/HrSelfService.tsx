import { HrLeaveType } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentEmployee } from "@/lib/hr-access";
import { cancelLeaveRequest, getEmployeeLeaveBalances, hrLeaveTypeLabel, submitLeaveRequest } from "@/lib/hr-leave";
import { storePrivateHrFile } from "@/lib/hr-private-files";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {getLang,t} from "@/lib/i18n";

const fieldStyle = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", background: "#fff" } as const;
const buttonStyle = { minHeight: 42, border: "1px solid #1d4ed8", borderRadius: 6, padding: "8px 14px", color: "#fff", background: "#2563eb", fontWeight: 800 } as const;

export default async function HrSelfService({ returnPath, searchParams }: { returnPath: string; searchParams?: Promise<{ msg?: string; err?: string }> }) {
  const { user, employee } = await requireCurrentEmployee();
  const sp = await searchParams;
  const lang = await getLang();
  const statusLabel = (status: string) => { const labels: Record<string,[string,string]> = { SUBMITTED:["Pending approval","待审批"], APPROVED:["Approved","已批准"], REJECTED:["Rejected","已驳回"], CANCELLED:["Cancelled","已取消"], DIRECTOR_APPROVED:["Director approved","主管已批准"], PAID:["Paid","已付款"] }; return labels[status] ? t(lang,...labels[status]) : status; };

  async function submit(formData: FormData) {
    "use server";
    const current = await requireCurrentEmployee();
    const leaveType = String(formData.get("leaveType") || "ANNUAL") as HrLeaveType;
    const startDate = String(formData.get("startDate") || "");
    const endDate = String(formData.get("endDate") || startDate);
    const startAt = new Date(`${startDate}T00:00:00+08:00`);
    const endAt = new Date(`${endDate}T23:59:59.999+08:00`);
    if (!Object.values(HrLeaveType).includes(leaveType) || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) redirect(`${returnPath}?err=${encodeURIComponent(t(lang,"Valid leave dates are required","请选择有效的请假日期"))}`);
    const policy = await prisma.hrLeavePolicy.findUnique({ where: { legalEntityId_leaveType: { legalEntityId: current.employee.legalEntityId, leaveType } } });
    const attachmentValue = formData.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.size > 0
      ? await storePrivateHrFile(attachmentValue, current.employee.id, "leave")
      : null;
    if (policy?.requiresAttachment && !attachment) redirect(`${returnPath}?err=${encodeURIComponent(t(lang,"This leave type requires an attachment","此假期类型需要证明附件"))}`);
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
    redirect(`${returnPath}?msg=${encodeURIComponent(t(lang,"Leave request submitted","请假申请已提交"))}`);
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
    redirect(`${returnPath}?msg=${encodeURIComponent(t(lang,"Leave request cancelled","请假申请已取消"))}`);
  }

  const [requests, balances, policies, payslips] = await Promise.all([
    prisma.hrLeaveRequest.findMany({ where: { employeeId: employee.id }, include: { approver: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    getEmployeeLeaveBalances(employee.id),
    prisma.hrLeavePolicy.findMany({ where: { legalEntityId: employee.legalEntityId, isActive: true } }),
    prisma.hrPayslip.findMany({ where: { employeeId: employee.id, status: { in: ["DIRECTOR_APPROVED", "PAID"] } }, orderBy: { month: "desc" }, take: 24 }),
  ]);
  const policyMap = new Map(policies.map(policy => [policy.leaveType, policy]));
  const homePath = user.role === "TEACHER" ? "/teacher" : "/admin";

  return <main style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: 18 }}>
    <section style={{ padding: 20, border: "1px solid #bfdbfe", borderRadius: 8, background: "#f8fbff" }}>
      <div style={{ color: "#1d4ed8", fontWeight: 800 }}>{t(lang,"Employee self-service","员工自助")}</div>
      <h1 style={{ margin: "6px 0" }}>{user.name} · {t(lang,"My HR","我的 HR")}</h1>
      <div style={{ color: "#475569" }}>{employee.jobTitle || "-"} · {employee.legalEntity.name} · {t(lang,"Approver","审批人")} {employee.manager?.name || t(lang,"HR manager","HR 负责人")}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <Link href={homePath} style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>{t(lang,"Back to workspace","返回工作台")}</Link>
        <span style={{ alignSelf: "center", color: "#64748b" }}>{t(lang,"One employee entry across admin, teacher and finance roles","所有员工角色统一使用此入口")}</span>
      </div>
    </section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534" }}>{sp.msg}</div> : null}
    {sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c" }}>{sp.err}</div> : null}
    <section><h2>{t(lang,"Leave balance","假期余额")}</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{Object.values(HrLeaveType).map(type => <div key={type} style={{ border: "1px solid #dbe4f0", borderRadius: 6, padding: 12 }}><b>{hrLeaveTypeLabel(type,lang)}</b><div style={{ fontSize: 26, fontWeight: 900 }}>{((balances.get(type) || 0) / 480).toFixed(1)}</div><div>{t(lang,"days (8h/day)","天（8小时/天）")}</div><small>{policyMap.has(type) ? t(lang,"Policy active","政策已配置") : t(lang,"No balance policy","未配置余额政策")}</small></div>)}</div></section>
    {!user.isObserver && <section style={{ borderTop: "1px solid #cbd5e1", paddingTop: 16 }}>
      <h2>{t(lang,"Apply for leave","提交请假")}</h2>
      <form action={submit} encType="multipart/form-data" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        <label>{t(lang,"Leave type","假期类型")}<select name="leaveType" style={{ ...fieldStyle, width: "100%" }}>{Object.values(HrLeaveType).map(type => <option key={type} value={type}>{hrLeaveTypeLabel(type,lang)}</option>)}</select></label>
        <label>{t(lang,"Start","开始")}<input name="startDate" type="date" required style={{ ...fieldStyle, width: "100%" }}/></label>
        <label>{t(lang,"End","结束")}<input name="endDate" type="date" required style={{ ...fieldStyle, width: "100%" }}/></label>
        <label>{t(lang,"Portion","时段")}<select name="portion" style={{ ...fieldStyle, width: "100%" }}><option value="FULL_DAY">{t(lang,"Full day","全天")}</option><option value="HALF_DAY">{t(lang,"Half day","半天")}</option><option value="HOURLY">{t(lang,"Hourly","小时")}</option></select></label>
        <label>{t(lang,"Hours (hourly only)","小时")}<input name="hours" type="number" min="0.5" max="8" step="0.5" style={{ ...fieldStyle, width: "100%" }}/></label>
        <label>{t(lang,"MC","supporting file / 附件")}<input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.heic" style={{ ...fieldStyle, width: "100%" }}/></label>
        <label style={{ gridColumn: "1/-1" }}>{t(lang,"Reason","原因")}<textarea name="reason" rows={3} style={{ ...fieldStyle, width: "100%" }}/></label>
        <button style={buttonStyle}>{t(lang,"Submit to approver","提交审批")}</button>
      </form>
    </section>}
    <section><h2>{t(lang,"Requests","申请记录")}</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{[t(lang,"Period","日期"),t(lang,"Type","类型"),t(lang,"Duration","时长"),t(lang,"Status","状态"),t(lang,"Approver","审批人"),t(lang,"Schedule","课表"),t(lang,"Action","操作")].map(x => <th key={x} style={{ textAlign: "left", padding: 9, borderBottom: "1px solid #cbd5e1" }}>{x}</th>)}</tr></thead><tbody>{requests.map(row => <tr key={row.id}><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.startAt.toLocaleDateString("en-SG")} - {new Date(row.endAt.getTime() - 1).toLocaleDateString("en-SG")}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{hrLeaveTypeLabel(row.leaveType,lang)}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{(row.durationMinutes / 480).toFixed(1)} {t(lang,"days (8h/day)","天（8小时/天）")}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}><b>{statusLabel(row.status)}</b>{row.decisionNote ? <><br/><small>{row.decisionNote}</small></> : null}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.approver?.name || "HR"}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.scheduleConflictCount ? t(lang,`${row.scheduleConflictCount} conflict(s)`,`${row.scheduleConflictCount} 个课表冲突`) : t(lang,"Clear","无冲突")}</td><td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{row.attachmentOriginalName ? <><a href={`/api/hr/leave/${row.id}/attachment`} target="_blank" rel="noreferrer">{t(lang,"Attachment","附件")}</a><br/></> : null}{!user.isObserver && (row.status === "SUBMITTED" || row.status === "APPROVED") ? <form action={cancel}><input type="hidden" name="requestId" value={row.id}/><input type="hidden" name="reason" value="Cancelled by employee"/><button style={{ ...buttonStyle, color: "#be123c", background: "#fff", borderColor: "#fda4af" }}>{t(lang,"Cancel","取消")}</button></form> : "-"}</td></tr>)}</tbody></table></div></section>
    <section><h2>{t(lang,"Payslips","工资单")}</h2>{payslips.length ? payslips.map(row => <div key={row.id} style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}><b>{row.month}</b> · {row.currencyCode} {(row.netPayCents / 100).toFixed(2)} · {statusLabel(row.status)} · <a href={`/api/hr/payslips/${row.id}/pdf`}>{t(lang,"Open PDF","打开 PDF")}</a></div>) : <p>{t(lang,"No approved payslips yet","暂无已批准工资单")}</p>}</section>
  </main>;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireHrManager } from "@/lib/hr-access";
import { decideLeaveRequest, hrLeaveTypeLabel } from "@/lib/hr-leave";
import { prisma } from "@/lib/prisma";

const buttonStyle = { minHeight: 38, border: "1px solid #1d4ed8", borderRadius: 6, padding: "7px 12px", color: "#fff", background: "#2563eb", fontWeight: 800 } as const;

export default async function HrLeaveApprovalPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  const actor = await requireHrManager();
  const sp = await searchParams;

  async function decide(formData: FormData) {
    "use server";
    const user = await requireHrManager();
    try {
      await decideLeaveRequest({
        requestId: String(formData.get("requestId") || ""),
        decision: String(formData.get("decision")) === "REJECT" ? "REJECT" : "APPROVE",
        decisionNote: String(formData.get("decisionNote") || ""),
        actor: user,
      });
    } catch (error) {
      redirect(`/admin/hr/leave?err=${encodeURIComponent(error instanceof Error ? error.message : "Decision failed")}`);
    }
    revalidatePath("/admin/hr/leave");
    redirect("/admin/hr/leave?msg=Leave+decision+saved");
  }

  const [pending, calendar] = await Promise.all([
    prisma.hrLeaveRequest.findMany({
      where: { status: "SUBMITTED", OR: [{ approverUserId: actor.id }, { approverUserId: null }] },
      include: { employee: { include: { user: true, legalEntity: true } } },
      orderBy: [{ startAt: "asc" }, { submittedAt: "asc" }],
    }),
    prisma.hrLeaveRequest.findMany({
      where: { status: "APPROVED", endAt: { gte: new Date(Date.now() - 30 * 86400000) }, startAt: { lte: new Date(Date.now() + 120 * 86400000) } },
      include: { employee: { include: { user: true } } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return <main style={{ display: "grid", gap: 18 }}>
    <section style={{ border: "1px solid #bfdbfe", background: "#f8fbff", padding: 20, borderRadius: 8 }}><Link href="/admin/hr">Back to HR / 返回 HR</Link><h1 style={{ margin: "8px 0 4px" }}>Leave approvals and calendar / 假期审批与日历</h1><p style={{ margin: 0, color: "#475569" }}>Self-approval is blocked. Any scheduled lessons during the requested period are shown before approval.</p></section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534" }}>{sp.msg}</div> : null}{sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c" }}>{sp.err}</div> : null}
    <section><h2>Pending approvals / 待审批</h2>{pending.length ? <div style={{ display: "grid", gap: 12 }}>{pending.map(row => <article key={row.id} style={{ border: `1px solid ${row.scheduleConflictCount ? "#fdba74" : "#cbd5e1"}`, borderRadius: 8, padding: 14, background: row.scheduleConflictCount ? "#fff7ed" : "#fff" }}><div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}><div><h3 style={{ margin: 0 }}>{row.employee.user.name} · {hrLeaveTypeLabel(row.leaveType)}</h3><div>{row.startAt.toLocaleDateString("en-SG")} - {new Date(row.endAt.getTime() - 1).toLocaleDateString("en-SG")} · {(row.durationMinutes / 480).toFixed(1)} days</div><div style={{ color: row.scheduleConflictCount ? "#c2410c" : "#166534", fontWeight: 800 }}>{row.scheduleConflictCount ? `${row.scheduleConflictCount} scheduled lesson conflict(s) require handover` : "No lesson conflict detected"}</div><p>{row.reason || "No reason provided"}</p>{row.attachmentOriginalName ? <a href={`/api/hr/leave/${row.id}/attachment`} target="_blank" rel="noreferrer">Open supporting file / 打开附件: {row.attachmentOriginalName}</a> : null}</div><form action={decide} style={{ display: "grid", gap: 8, minWidth: 280 }}><input type="hidden" name="requestId" value={row.id}/><textarea name="decisionNote" rows={3} placeholder="Decision or handover note / 审批或交接备注" style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}/><div style={{ display: "flex", gap: 8 }}><button name="decision" value="APPROVE" style={buttonStyle}>Approve / 批准</button><button name="decision" value="REJECT" style={{ ...buttonStyle, background: "#fff", color: "#be123c", borderColor: "#fda4af" }}>Reject / 驳回</button></div></form></div></article>)}</div> : <p>No pending leave / 暂无待审批假期</p>}</section>
    <section><h2>Approved leave calendar / 已批准假期日历</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>{calendar.map(row => <div key={row.id} style={{ borderLeft: "4px solid #16a34a", background: "#f0fdf4", padding: 12 }}><b>{row.employee.user.name}</b><br/>{hrLeaveTypeLabel(row.leaveType)}<br/>{row.startAt.toLocaleDateString("en-SG")} - {new Date(row.endAt.getTime() - 1).toLocaleDateString("en-SG")}{row.scheduleConflictCount ? <><br/><span style={{ color: "#c2410c" }}>{row.scheduleConflictCount} lesson handover(s)</span></> : null}</div>)}</div></section>
  </main>;
}

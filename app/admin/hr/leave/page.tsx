import Link from "next/link";
import {getLang,t} from "@/lib/i18n";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireHrManager } from "@/lib/hr-access";
import { decideLeaveRequest, hrLeaveTypeLabel } from "@/lib/hr-leave";
import { prisma } from "@/lib/prisma";

const buttonStyle = { minHeight: 38, border: "1px solid #1d4ed8", borderRadius: 6, padding: "7px 12px", color: "#fff", background: "#2563eb", fontWeight: 800 } as const;

export default async function HrLeaveApprovalPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  const actor = await requireHrManager();
  const sp = await searchParams;
  const lang = await getLang();

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
    redirect(`/admin/hr/leave?msg=${encodeURIComponent(t(lang,"Leave decision saved","请假审批已保存"))}`);
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

  return <main style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: 18 }}>
    <section style={{ border: "1px solid #bfdbfe", background: "#f8fbff", padding: 20, borderRadius: 8 }}><Link href="/admin/hr">{t(lang,"Back to HR","返回 HR")}</Link><h1 style={{ margin: "8px 0 4px" }}>{t(lang,"Leave approvals and calendar","假期审批与日历")}</h1><p style={{ margin: 0, color: "#475569" }}>{t(lang,"Self-approval is blocked. Review lesson handovers separately before approval.","不能审批本人的请假；批准前请另行核对课程交接安排。")}</p></section>
    {sp?.msg ? <div style={{ padding: 12, background: "#ecfdf5", color: "#166534" }}>{sp.msg}</div> : null}{sp?.err ? <div style={{ padding: 12, background: "#fff1f2", color: "#be123c" }}>{sp.err}</div> : null}
    <section><h2>{t(lang,"Pending approvals","待审批")}</h2>{pending.length ? <div style={{ display: "grid", gap: 12 }}>{pending.map(row => <article key={row.id} style={{ border: `1px solid ${row.scheduleConflictCount ? "#fdba74" : "#cbd5e1"}`, borderRadius: 8, padding: 14, background: row.scheduleConflictCount ? "#fff7ed" : "#fff" }}><div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}><div><h3 style={{ margin: 0 }}>{row.employee.user.name} · {hrLeaveTypeLabel(row.leaveType,lang)}</h3><div>{row.startAt.toLocaleDateString("en-SG")} - {new Date(row.endAt.getTime() - 1).toLocaleDateString("en-SG")} · {(row.durationMinutes / 480).toFixed(1)} {t(lang,"days (8h/day)","天（8小时/天）")}</div><div style={{ color: row.scheduleConflictCount ? "#c2410c" : "#166534", fontWeight: 800 }}>{row.scheduleConflictCount ? t(lang,`${row.scheduleConflictCount} lesson conflict(s) recorded at submission; review handover`, `提交时记录 ${row.scheduleConflictCount} 个课程冲突，请核对交接`) : t(lang,"No conflict recorded at submission; check the current schedule","提交时未记录冲突，请核对当前课表")}</div><p>{row.reason || t(lang,"No reason provided","未填写原因")}</p>{row.attachmentOriginalName ? <a href={`/api/hr/leave/${row.id}/attachment`} target="_blank" rel="noreferrer">{t(lang,"Open supporting file","打开附件")}: {row.attachmentOriginalName}</a> : null}</div>{!actor.isObserver && <form action={decide} style={{ display: "grid", gap: 8, minWidth: 280 }}><input type="hidden" name="requestId" value={row.id}/><textarea name="decisionNote" rows={3} placeholder={t(lang,"Decision or handover note","审批或交接备注")} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}/><div style={{ display: "flex", gap: 8 }}><button name="decision" value="APPROVE" style={buttonStyle}>{t(lang,"Approve","批准")}</button><button name="decision" value="REJECT" style={{ ...buttonStyle, background: "#fff", color: "#be123c", borderColor: "#fda4af" }}>{t(lang,"Reject","驳回")}</button></div></form>}</div></article>)}</div> : <p>{t(lang,"No pending leave","暂无待审批假期")}</p>}</section>
    <section><h2>{t(lang,"Approved leave calendar","已批准假期日历")}</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>{calendar.map(row => <div key={row.id} style={{ borderLeft: "4px solid #16a34a", background: "#f0fdf4", padding: 12 }}><b>{row.employee.user.name}</b><br/>{hrLeaveTypeLabel(row.leaveType,lang)}<br/>{row.startAt.toLocaleDateString("en-SG")} - {new Date(row.endAt.getTime() - 1).toLocaleDateString("en-SG")}{row.scheduleConflictCount ? <><br/><span style={{ color: "#c2410c" }}>{t(lang,`${row.scheduleConflictCount} recorded lesson handover(s)`,`${row.scheduleConflictCount} 项已记录课程交接`)}</span></> : null}</div>)}</div></section>
  </main>;
}

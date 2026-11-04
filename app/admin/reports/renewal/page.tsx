import Link from "next/link";
import ParentReportEditionPanel from "@/app/_components/ParentReportEditionPanel";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireRenewalReportCoordinator } from "@/lib/renewal-progress-access";
import { parseRenewalSnapshot } from "@/lib/renewal-progress-report";
import { RENEWAL_OPEN_STATUSES } from "@/lib/renewal-management";
import { assignRenewalProgressReport, approveRenewalProgressReport, deliverRenewalProgressReport, returnRenewalProgressReport } from "./actions";

const card = { background: "white", padding: 18, borderRadius: 14, border: "1px solid #d8e3e7", display: "grid", gap: 9 } as const;

export default async function RenewalReportsDesk({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const user = await requireRenewalReportCoordinator();
  const lang = await getLang();
  const { report: selectedId } = await searchParams;
  const [tasks, teachers, selected] = await Promise.all([
    prisma.renewalTask.findMany({
      where: { OR: [{ status: { in: [...RENEWAL_OPEN_STATUSES] } }, { progressReport: { isNot: null } }] },
      include: { student: { select: { name: true } }, package: { include: { course: { select: { name: true } } } }, progressReport: { include: { teacher: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" }, take: 250,
    }),
    prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    selectedId ? prisma.renewalProgressReport.findUnique({ where: { id: selectedId }, include: { teacher: { select: { name: true } }, student: { select: { name: true } } } }) : Promise.resolve(null),
  ]);
  return <main style={{ maxWidth: 1180, margin: "0 auto", padding: 20, display: "grid", gap: 16 }}>
    <section style={card}><h1 style={{ margin: 0 }}>{t(lang, "Renewal Progress Reports", "续费前学习进展报告")}</h1><p style={{ margin: 0 }}>{t(lang, "Assign the actual teacher before speaking with parents. The report remains attached to this renewal task even when the package is topped up.", "续费沟通前指派实际授课老师。报告绑定这一次续费跟进，即使之后课包加课时也会保留。")}</p><Link href="/admin/renewals">{t(lang, "Back to renewal follow-up", "返回续费跟进")}</Link></section>
    {selected ? <section style={card} id="selected-report">
      <h2 style={{ margin: 0 }}>{t(lang, "Selected report", "当前报告")}: {selected.student.name}</h2>
      <p>{t(lang, "Status", "状态")}: {selected.status} · {t(lang, "Teacher", "任课老师")}: {selected.teacher.name}</p>
      {(() => { const snapshot = parseRenewalSnapshot(selected.snapshotJson); return <p>{t(lang, "Frozen package snapshot", "固定课包快照")}: {snapshot.packageType === "MONTHLY" ? `${t(lang, "Valid to", "有效至")} ${snapshot.validTo || "-"}` : `${(snapshot.remainingMinutes / 60).toFixed(2)}h / ${(snapshot.totalMinutes / 60).toFixed(2)}h`} · {t(lang, "Attended sessions", "实际出勤课次")}: {snapshot.sessionCount}</p>; })()}
      {selected.status !== "ASSIGNED" ? <ParentReportEditionPanel kind="RENEWAL" id={selected.id} lang={lang} allowFinalDownload={["APPROVED", "DELIVERED"].includes(selected.status)} /> : <p>{t(lang, "Waiting for the assigned teacher to submit.", "等待任课老师提交。")}</p>}
      {selected.status === "SUBMITTED" && !user.isObserver ? <form action={approveRenewalProgressReport} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="hidden" name="reportId" value={selected.id} /><button>{t(lang, "Approve after confirming bilingual PDF", "核对中英 PDF 后批准")}</button></form> : null}
      {selected.status === "SUBMITTED" && !user.isObserver ? <form action={returnRenewalProgressReport} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="hidden" name="reportId" value={selected.id} /><input name="reason" required minLength={5} maxLength={1000} placeholder={t(lang, "Revision requested (at least 5 characters)", "退回原因（至少5字）")} style={{ flex: 1 }} /><button>{t(lang, "Return to teacher", "退回老师修改")}</button></form> : null}
      {selected.status === "APPROVED" && !user.isObserver ? <form action={deliverRenewalProgressReport} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="hidden" name="reportId" value={selected.id} /><select name="channel" required defaultValue=""><option value="">{t(lang, "Select delivery channel", "选择送达方式")}</option><option value="WECHAT">WeChat / 微信</option><option value="EMAIL">Email / 邮件</option><option value="WHATSAPP">WhatsApp</option><option value="PRINTED">Printed / 纸质</option><option value="OTHER">Other / 其他</option></select><button>{t(lang, "Mark delivered", "登记已送达")}</button></form> : null}
      {selected.status === "DELIVERED" ? <p>{t(lang, "Delivered", "已送达")} · {selected.deliveryChannel} · {selected.deliveredAt?.toLocaleString("en-SG")}</p> : null}
    </section> : null}
    <section style={{ display: "grid", gap: 12 }}><h2>{t(lang, "Renewal cases", "续费跟进记录")}</h2>
      {tasks.map(task => <article key={task.id} style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>{task.student.name} · {task.package.course.name}</strong><span>{task.riskLevel} · {task.status}</span></div>
        <div>{task.package.type === "MONTHLY" ? `${t(lang, "Valid to", "有效至")}: ${task.package.validTo?.toLocaleDateString("en-SG") || "-"}` : `${t(lang, "Current balance", "当前余额")}: ${((task.package.remainingMinutes ?? task.remainingMinutes) / 60).toFixed(2)}h`}</div>
        {task.progressReport ? <div>{t(lang, "Report", "报告")}: {task.progressReport.status} · {task.progressReport.teacher.name} · <Link href={`?report=${task.progressReport.id}#selected-report`}>{t(lang, "Open report and approval", "打开报告与审核")}</Link></div>
        : !user.isObserver && RENEWAL_OPEN_STATUSES.includes(task.status as typeof RENEWAL_OPEN_STATUSES[number]) ? <form action={assignRenewalProgressReport} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input type="hidden" name="renewalTaskId" value={task.id} /><select name="teacherId" required defaultValue=""><option value="">{t(lang, "Select the actual teaching teacher", "选择实际授课老师")}</option>{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><button>{t(lang, "Assign report", "指派报告")}</button></form> : null}
      </article>)}
      {!tasks.length ? <p>{t(lang, "No renewal follow-up cases. Open Renewal Follow-up to refresh candidates.", "暂无续费跟进记录。请先打开“续费跟进”刷新候选。")}</p> : null}
    </section>
  </main>;
}

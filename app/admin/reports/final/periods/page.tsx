import { isManagerUser, requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { assignClosedFinalReportPeriod, creditedMinutes, finalReportPeriodsUrl, loadFinalReportPeriodPackages, parseFinalReportPeriodTime } from "@/lib/final-report-periods";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import "../final-desk.css";

const field = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 100) : "";

async function requirePeriodCoordinator() {
  const user = await requireAdmin();
  if (user.isObserver || !(user.role === "ADMIN" || user.operationsAdmin || await isManagerUser(user))) {
    redirect("/admin/reports/final");
  }
  return user;
}

const errorText = {
  dates: ["Enter a valid start and end in Singapore time. The period must already have ended.", "请输入有效的新加坡时间，且本期已经结束。"],
  package: ["This package is unavailable for this student.", "该课包不属于此学生或当前不可用。"],
  confirmed: ["These dates have already been confirmed. Reopen the period to use its saved dates.", "该期次已确认，请重新打开并使用已保存的日期。"],
  duplicate: ["This teacher already has a report for this period. The selected draft was left in place.", "该老师本期已有报告，所选草稿仍保留。"],
  teacher: ["Select the responsible teacher.", "请选择负责老师。"],
  purchase: ["The selected purchase no longer has credited hours for this package.", "所选记录在此课包下已无有效入账课时。"],
  overlap: ["The selected dates overlap another confirmed period for this package and student.", "日期与该学生在此课包下的另一已确认期次重叠。"],
  draft: ["The draft must be an active, unsubmitted record for this student, package and teacher.", "请选择该学生、课包及老师对应的未提交且未归档的草稿。"],
  "choose-draft": ["This teacher has an unlinked draft. Select it to continue with the existing report.", "该老师已有未绑定期次的草稿，请选中原草稿继续。"],
  crossing: ["A lesson crosses one of the selected boundaries. Choose a time between lessons.", "有一节课跨越所选边界，请把分界时间放在两次课之间。"],
  "no-attendance": ["No matching attended lesson was found. Check the dates, teacher and attendance records.", "未找到匹配的出勤，请核对日期、老师和点名记录。"],
  stale: ["The draft changed while you were working. Open the latest version and try again.", "草稿刚被更新，请重新打开最新版本后再确认。"],
  confirm: ["Confirm that you checked the purchase and actual teaching dates.", "请确认已核对入账记录和实际教学日期。"],
  failed: ["The period could not be saved. Reopen the record and try again.", "期次未能保存，请重新打开后重试。"],
} as const;

async function confirmPeriod(formData: FormData) {
  "use server";
  const actor = await requirePeriodCoordinator();
  const studentId = field(formData.get("studentId"));
  const packageId = field(formData.get("packageId"));
  const purchaseTxnId = field(formData.get("purchaseTxnId"));
  const teacherId = field(formData.get("teacherId"));
  const draftId = field(formData.get("draftId"));
  const startsAt = parseFinalReportPeriodTime(field(formData.get("startsAt")));
  const endsAt = parseFinalReportPeriodTime(field(formData.get("endsAt")));
  const retry = new URLSearchParams({ studentId, packageId, purchaseTxnId });
  let reportId: string;
  try {
    if (!startsAt || !endsAt) throw new Error("dates");
    if (formData.get("checked") !== "yes") throw new Error("confirm");
    reportId = await assignClosedFinalReportPeriod({ studentId, packageId, purchaseTxnId, teacherId, draftId, startsAt, endsAt, actor });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (!Object.hasOwn(errorText, code)) console.error("Unable to assign closed final report period", error);
    retry.set("err", Object.hasOwn(errorText, code) ? code : "failed");
    redirect(`/admin/reports/final/periods?${retry}`);
  }
  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  revalidatePath(`/teacher/final-reports/${reportId}`);
  redirect(`/admin/reports/final?view=writing&reportId=${encodeURIComponent(reportId)}`);
}

export default async function FinalReportPeriodsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePeriodCoordinator();
  const lang = await getLang();
  const params = await searchParams;
  const q = field(params.q);
  const studentId = field(params.studentId);
  const packageId = field(params.packageId);
  const purchaseId = field(params.purchaseTxnId);
  const err = field(params.err);
  const message = Object.hasOwn(errorText, err) ? errorText[err as keyof typeof errorText] : undefined;
  const [matches, student, packages] = await Promise.all([
    q && !studentId ? prisma.student.findMany({
      where: { name: { contains: q, mode: "insensitive" } }, select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }], take: 25,
    }) : [],
    studentId ? prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true } }) : null,
    studentId ? loadFinalReportPeriodPackages(studentId) : [],
  ]);
  const selectedPackage = packages.find(row => row.id === packageId);
  const selectedPeriod = selectedPackage?.finalReportPeriods.find(row => row.purchaseTxnId === purchaseId);
  const selectedPurchase = selectedPackage?.txns.find(row => row.id === purchaseId && creditedMinutes(row) > 0);
  const teachers = selectedPeriod || selectedPurchase
    ? await prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
  const formatTime = (date: Date) => formatBusinessDateTime(date).replace(" ", "T");
  const periodHref = (pkgId: string, txnId: string) =>
    `${finalReportPeriodsUrl(studentId, pkgId)}&purchaseTxnId=${encodeURIComponent(txnId)}#confirm-period`;
  const reportHref = (reportId: string) => `/admin/reports/final?view=all&reportId=${encodeURIComponent(reportId)}`;

  return <main className="final-desk">
    <header className="final-desk-heading">
      <div><a href="/admin/reports/final">{t(lang, "Back to Final Reports", "返回结课报告")}</a>
        <h2>{t(lang, "Final reports by learning period", "按学习期次管理结课报告")}</h2>
        <p>{t(lang, "Search for a student, choose a purchase or renewal credit, then confirm the actual teaching dates when that period ends.", "搜索学生，选择首购或续费入账记录，再在该期结束后确认实际教学日期。")}</p>
      </div>
    </header>
    <section className="final-desk-detail">
      <form method="get" className="final-desk-filters">
        <label>{t(lang, "Student name", "学生姓名")} <input name="q" defaultValue={q} maxLength={100} required /></label>
        <button type="submit">{t(lang, "Search", "搜索")}</button>
      </form>
      {matches.map(row => <p key={row.id}><a href={finalReportPeriodsUrl(row.id)}>{row.name}</a></p>)}
      {q && !studentId && !matches.length ? <p>{t(lang, "No matching student.", "没有匹配的学生。")}</p> : null}
    </section>
    {message ? <p role="alert" className="final-desk-notice">{t(lang, message[0], message[1])}</p> : null}
    {student ? <h3>{student.name}</h3> : null}
    {student && !packages.length ? <p>{t(lang, "No hours packages found.", "没有找到课时包。")}</p> : null}
    {packages.map(pkg => {
      const periods = new Map(pkg.finalReportPeriods.map(period => [period.purchaseTxnId, period]));
      const purchases = pkg.txns.filter(purchase => creditedMinutes(purchase) > 0);
      const closedWithoutSource = pkg.finalReportPeriods.filter(period => !purchases.some(purchase => purchase.id === period.purchaseTxnId));
      const legacyReports = pkg.finalReports.filter(report => !report.reportPeriodId);
      return <section className="final-desk-detail" key={pkg.id}>
        <h3>{pkg.course.name} <small>· {pkg.id.slice(0, 8)}</small></h3>
        {legacyReports.length ? <details>
          <summary>{t(lang, "Existing reports without a confirmed period", "未绑定期次的现有报告")}</summary>
          {legacyReports.map(report => <p key={report.id}><a href={reportHref(report.id)}>{report.teacher.name}</a> · {report.reportPeriodLabel || report.status}</p>)}
        </details> : null}
        {!purchases.length && !closedWithoutSource.length ? <p>{t(lang, "No traceable purchase credit was found. Existing reports are available in the Final Reports desk.", "没有找到可追踪的入账记录，现有报告仍可在结课报告工作台查看。")}</p> : null}
        {purchases.map(purchase => {
          const period = periods.get(purchase.id);
          return <div key={purchase.id} className="final-desk-summary">
            <span>{formatBusinessDateTime(purchase.createdAt)} · {formatMinutesToHours(creditedMinutes(purchase))}h <small>· {purchase.id.slice(0, 8)}</small></span>
            <span>{period ? `${formatBusinessDateTime(period.startsAt)} → ${formatBusinessDateTime(period.endsAt)}` : t(lang, "Awaiting teaching dates", "待确认教学日期")}</span>
            <a href={periodHref(pkg.id, purchase.id)}>{period ? t(lang, "View period / assign another teacher", "查看期次或分配其他老师") : t(lang, "Set learning period", "设置学习期次")}</a>
          </div>;
        })}
        {closedWithoutSource.map(period => <div key={period.id} className="final-desk-summary">
          <span>{formatBusinessDateTime(period.startsAt)} → {formatBusinessDateTime(period.endsAt)}</span>
          <a href={periodHref(pkg.id, period.purchaseTxnId)}>{t(lang, "View confirmed period", "查看已确认期次")}</a>
        </div>)}
        {selectedPackage?.id === pkg.id && (selectedPeriod || selectedPurchase) ? <div id="confirm-period" className="final-desk-existing">
          <h4>{t(lang, "Confirm dates and link or assign a report", "确认日期并关联或分配报告")}</h4>
          <p>{t(lang, "Use actual teaching dates in Singapore time. Set the end at a lesson end or between lessons. If two periods meet, the next can start at the previous end. Review the existing reports before confirming.", "请按实际教学安排填写新加坡时间。结束时间可设在一节课结束时或两次课之间。两期衔接时，下一期可从上一期结束时间开始。确认前请查看现有报告。")}</p>
          {pkg.finalReports.filter(report => selectedPeriod && report.reportPeriodId === selectedPeriod.id).map(report =>
            <p key={report.id}><a href={reportHref(report.id)}>{report.teacher.name} · {report.status}</a></p>,
          )}
          <form action={confirmPeriod} className="final-desk-filters">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="packageId" value={pkg.id} />
            <input type="hidden" name="purchaseTxnId" value={purchaseId} />
            <label>{t(lang, "Start (SGT)", "开始时间（新加坡）")} <input name="startsAt" type="datetime-local" required readOnly={Boolean(selectedPeriod)} defaultValue={selectedPeriod ? formatTime(selectedPeriod.startsAt) : undefined} /></label>
            <label>{t(lang, "End (SGT)", "结束时间（新加坡）")} <input name="endsAt" type="datetime-local" required readOnly={Boolean(selectedPeriod)} defaultValue={selectedPeriod ? formatTime(selectedPeriod.endsAt) : undefined} /></label>
            <label>{t(lang, "Responsible teacher", "负责老师")} <select name="teacherId" required defaultValue="">
              <option value="">{t(lang, "Select teacher", "选择老师")}</option>
              {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select></label>
            <label>{t(lang, "Report draft", "报告草稿")} <select name="draftId" defaultValue="">
              <option value="">{t(lang, "Create a draft if no existing draft applies", "没有可关联的草稿时，新建草稿")}</option>
              {legacyReports.filter(report => !report.archivedAt && report.status === "ASSIGNED").map(report =>
                <option key={report.id} value={report.id}>{report.teacher.name} · {report.reportPeriodLabel || report.id.slice(0, 8)}</option>,
              )}
            </select></label>
            <label><input type="checkbox" name="checked" value="yes" required /> {t(lang, "I checked the credit, dates and existing reports.", "我已核对入账、日期和现有报告。")}</label>
            <button className="final-desk-primary" type="submit">{t(lang, "Confirm and open report", "确认并打开报告")}</button>
          </form>
        </div> : null}
      </section>;
    })}
  </main>;
}

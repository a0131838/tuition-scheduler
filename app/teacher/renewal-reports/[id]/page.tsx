import Link from "next/link";
import { notFound } from "next/navigation";
import ParentReportEditionPanel from "@/app/_components/ParentReportEditionPanel";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { parseRenewalReportDraft, parseRenewalSnapshot, renewalReportFields } from "@/lib/renewal-progress-report";
import { saveRenewalProgressReport } from "../actions";

export default async function TeacherRenewalReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { teacher } = await requireTeacherProfile();
  const lang = await getLang();
  const { id } = await params;
  const { saved } = await searchParams;
  const row = await prisma.renewalProgressReport.findFirst({ where: { id, teacherId: teacher.id }, include: { student: { select: { name: true } }, package: { include: { course: { select: { name: true } } } } } });
  if (!row) notFound();
  const draft = parseRenewalReportDraft(row.reportJson);
  const snapshot = parseRenewalSnapshot(row.snapshotJson);
  const editable = row.status === "ASSIGNED";
  const card = { padding: 20, borderRadius: 14, background: "white", border: "1px solid #d8e3e7" } as const;
  return <main style={{ maxWidth: 1050, margin: "24px auto", padding: 16, display: "grid", gap: 16 }}>
    <Link href="/teacher/renewal-reports">← {t(lang, "All renewal reports", "返回续费报告列表")}</Link>
    <section style={card}><h1>{t(lang, "Learning Progress Before Renewal", "续费前学习进展报告")}</h1><p>{row.student.name} · {row.package.course.name} · {row.status}</p><p>{t(lang, "Package at assignment", "指派时课包情况")}: {snapshot.packageType === "MONTHLY" ? `${t(lang, "Valid to", "有效至")} ${snapshot.validTo || "-"}` : `${(snapshot.remainingMinutes / 60).toFixed(2)}h / ${(snapshot.totalMinutes / 60).toFixed(2)}h`} · {t(lang, "Attended lessons", "实际出勤课次")}: {snapshot.sessionCount}</p><p>{t(lang, "This snapshot is fixed. Later renewals or top-ups do not change it.", "此快照已固定，后续续费或充值不会改动。")}</p></section>
    {row.reviewNote ? <section style={{ ...card, borderColor: "#f59e0b" }}><strong>{t(lang, "Coordinator requested changes", "教务退回修改")}</strong><p>{row.reviewNote}</p></section> : null}
    <form action={saveRenewalProgressReport} style={{ ...card, display: "grid", gap: 15 }}>
      <input type="hidden" name="reportId" value={row.id} />
      <h2>{t(lang, "Teacher's observations", "老师的实际观察")}</h2>
      {renewalReportFields.map(field => <label key={field.key} style={{ display: "grid", gap: 6, fontWeight: 700 }}>{t(lang, field.en, field.zh)}{field.key !== "familyNote" ? " *" : ""}<textarea name={field.key} defaultValue={draft[field.key]} readOnly={!editable} rows={5} maxLength={8000} style={{ width: "100%", padding: 10, font: "inherit", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 400 }} /></label>)}
      {editable ? <div style={{ display: "flex", gap: 12 }}><button name="mode" value="save">{t(lang, "Save draft", "保存草稿")}</button><button name="mode" value="submit" style={{ background: "#166534", color: "white" }}>{t(lang, "Submit to coordinator", "提交给教务审核")}</button></div> : null}
      {saved ? <p role="status">{saved === "submit" ? t(lang, "Submitted successfully.", "已提交。") : t(lang, "Draft saved.", "草稿已保存。")}</p> : null}
    </form>
    {row.status !== "ASSIGNED" ? <ParentReportEditionPanel kind="RENEWAL" id={row.id} lang={lang} allowFinalDownload={["APPROVED", "DELIVERED"].includes(row.status)} /> : null}
  </main>;
}

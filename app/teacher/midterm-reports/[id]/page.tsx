import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { EMPTY_REPORT_DRAFT, parseDraftFromFormData, parseReportDraft } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const LEVEL_OPTIONS = ["", "A1", "A2", "B1", "B2", "C1"] as const;

function asScore(v: string) {
  const text = v.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 9.99) return null;
  return Number(n.toFixed(2));
}

export default async function TeacherMidtermReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const ok = String(sp.ok ?? "");
  const { teacher } = await requireTeacherProfile();
  const { id } = await params;
  if (!teacher) {
    return <div style={{ color: "#b91c1c" }}>{t(lang, "Teacher profile not linked.", "老师账号未绑定档案。")}</div>;
  }

  const report = await prisma.midtermReport.findUnique({
    where: { id },
    include: {
      student: true,
      teacher: true,
      course: true,
      subject: true,
    },
  });
  if (!report || report.teacherId !== teacher.id) {
    return <div style={{ color: "#b91c1c" }}>{t(lang, "Report not found.", "报告不存在或无权限访问。")}</div>;
  }
  const reportId = report.id;
  const ownerTeacherId = report.teacherId;
  const currentStatus = report.status;
  const currentSubmittedAt = report.submittedAt;

  async function saveReport(formData: FormData) {
    "use server";
    const { teacher: currentTeacher } = await requireTeacherProfile();
    if (!currentTeacher || currentTeacher.id !== ownerTeacherId) {
      redirect("/teacher/midterm-reports?err=forbidden");
    }
    const intent = String(formData.get("intent") ?? "save");
    const draft = parseDraftFromFormData(formData);
    const examTargetStatus = String(formData.get("examTargetStatus") ?? "").trim();
    const periodLabel = String(formData.get("reportPeriodLabel") ?? "").trim();
    const score = asScore(String(formData.get("overallScore") ?? ""));

    await prisma.midtermReport.update({
      where: { id: reportId },
      data: {
        reportJson: draft as any,
        examTargetStatus: examTargetStatus || null,
        reportPeriodLabel: periodLabel || null,
        overallScore: score,
        status: intent === "submit" ? "SUBMITTED" : currentStatus,
        submittedAt: intent === "submit" ? new Date() : currentSubmittedAt,
      },
    });

    revalidatePath("/teacher/midterm-reports");
    revalidatePath(`/teacher/midterm-reports/${reportId}`);
    revalidatePath("/admin/reports/midterm");
    redirect(`/teacher/midterm-reports/${encodeURIComponent(reportId)}?ok=${intent === "submit" ? "submitted" : "saved"}`);
  }

  const draft = parseReportDraft(report.reportJson ?? EMPTY_REPORT_DRAFT);

  return (
    <div>
      <a href="/teacher/midterm-reports">{t(lang, "Back", "返回中期报告列表")}</a>
      <h2 style={{ marginBottom: 4 }}>{t(lang, "Midterm Report Form", "中期报告填写")}</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        {report.student.name} | {report.course.name}
        {report.subject ? ` / ${report.subject.name}` : ""}
      </div>

      {ok ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {ok === "submitted" ? t(lang, "Report submitted.", "报告已提交。") : t(lang, "Draft saved.", "草稿已保存。")}
        </div>
      ) : null}

      <form action={saveReport} style={{ display: "grid", gap: 10 }}>
        <div style={{ border: "1px solid #dbeafe", borderRadius: 10, background: "#eff6ff", padding: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{t(lang, "Basic", "基础信息")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(180px, 1fr))", gap: 8 }}>
            <label>
              {t(lang, "Period Label", "报告周期")}
              <input name="reportPeriodLabel" defaultValue={report.reportPeriodLabel ?? ""} placeholder="e.g. 1/29/2026 Midterm" style={{ width: "100%" }} />
            </label>
            <label>
              {t(lang, "Exam Readiness", "考试准备状态")}
              <input name="examTargetStatus" defaultValue={report.examTargetStatus ?? ""} placeholder="e.g. 中 / Ready for A2" style={{ width: "100%" }} />
            </label>
            <label>
              {t(lang, "Overall Score", "总分")}
              <input name="overallScore" defaultValue={report.overallScore?.toString() ?? ""} placeholder="4.2" style={{ width: "100%" }} />
            </label>
          </div>
          <label style={{ display: "block", marginTop: 8 }}>
            {t(lang, "Important Note", "重要免责声明")}
            <textarea name="warningNote" defaultValue={draft.warningNote} rows={2} style={{ width: "100%" }} />
          </label>
        </div>

        <div style={{ border: "1px solid #fde68a", borderRadius: 10, background: "#fffbeb", padding: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{t(lang, "Overall Evaluation", "总评")}</div>
          <textarea name="overallComment" defaultValue={draft.overallComment} rows={5} style={{ width: "100%" }} />
        </div>

        {[
          ["listeningLevel", "listeningComment", t(lang, "Listening", "听力")],
          ["vocabularyLevel", "vocabularyComment", t(lang, "Vocabulary & Grammar", "词汇与语法")],
          ["readingLevel", "readingComment", t(lang, "Reading", "阅读")],
          ["writingLevel", "writingComment", t(lang, "Writing", "写作")],
          ["speakingLevel", "speakingComment", t(lang, "Speaking", "口语")],
        ].map(([levelKey, commentKey, title]) => (
          <div key={String(levelKey)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8 }}>
              <label>
                {t(lang, "Level", "等级")}
                <select name={String(levelKey)} defaultValue={(draft as any)[levelKey]}>
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt || "-"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t(lang, "Comment", "评语")}
                <textarea name={String(commentKey)} defaultValue={(draft as any)[commentKey]} rows={3} style={{ width: "100%" }} />
              </label>
            </div>
          </div>
        ))}

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Summary", "总结")}</div>
          <textarea name="summaryComment" defaultValue={draft.summaryComment} rows={4} style={{ width: "100%" }} />
        </div>

        <div style={{ border: "1px solid #fbcfe8", borderRadius: 10, background: "#fdf2f8", padding: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "iTEP Predicted", "iTEP 预估分")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(100px, 1fr))", gap: 8 }}>
            <label>
              Grammar
              <input name="itepGrammar" defaultValue={draft.itepGrammar} />
            </label>
            <label>
              Vocab
              <input name="itepVocab" defaultValue={draft.itepVocab} />
            </label>
            <label>
              Listening
              <input name="itepListening" defaultValue={draft.itepListening} />
            </label>
            <label>
              Reading
              <input name="itepReading" defaultValue={draft.itepReading} />
            </label>
            <label>
              Writing
              <input name="itepWriting" defaultValue={draft.itepWriting} />
            </label>
            <label>
              Speaking
              <input name="itepSpeaking" defaultValue={draft.itepSpeaking} />
            </label>
            <label>
              Total
              <input name="itepTotal" defaultValue={draft.itepTotal} />
            </label>
          </div>
        </div>

        <div style={{ border: "1px solid #c7d2fe", borderRadius: 10, background: "#eef2ff", padding: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(lang, "Class Discipline", "课堂纪律")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 8 }}>
            <label>
              {t(lang, "Subject", "科目")}
              <input name="disciplineSubject" defaultValue={draft.disciplineSubject} />
            </label>
            <label>
              {t(lang, "Pages / Unit", "学习范围")}
              <input name="disciplinePages" defaultValue={draft.disciplinePages} />
            </label>
            <label>
              {t(lang, "Progress", "进度表现")}
              <textarea name="disciplineProgress" defaultValue={draft.disciplineProgress} rows={3} style={{ width: "100%" }} />
            </label>
            <label>
              {t(lang, "Strengths", "课堂优点")}
              <textarea name="disciplineStrengths" defaultValue={draft.disciplineStrengths} rows={3} style={{ width: "100%" }} />
            </label>
            <label>
              {t(lang, "Class Behavior", "课堂纪律表现")}
              <textarea name="disciplineClassBehavior" defaultValue={draft.disciplineClassBehavior} rows={3} style={{ width: "100%" }} />
            </label>
            <label>
              {t(lang, "Next Steps", "改进建议")}
              <textarea name="disciplineNextStep" defaultValue={draft.disciplineNextStep} rows={3} style={{ width: "100%" }} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" name="intent" value="save">
            {t(lang, "Save Draft", "保存草稿")}
          </button>
          <button type="submit" name="intent" value="submit">
            {t(lang, "Submit Report", "提交报告")}
          </button>
          {report.status === "SUBMITTED" ? (
            <span style={{ color: "#166534", fontWeight: 700 }}>{t(lang, "Submitted", "已提交")}</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

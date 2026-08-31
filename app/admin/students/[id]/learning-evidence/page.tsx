import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLearningEvidenceUser } from "@/lib/student-learning-evidence-access";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { loadStudentLearningEvidence } from "@/lib/student-learning-evidence-data";
import { labelLearningEvidenceAttendance } from "@/lib/student-learning-evidence";
import LearningPlanDraftForm from "./LearningPlanDraftForm";
import LearningPlanApprovalButton from "./LearningPlanApprovalButton";

function metric(label: string, value: string | number, detail: string, tone = "#0f766e") {
  return (
    <div style={{ border: "1px solid #dbe4f0", borderRadius: 12, background: "#fff", padding: "13px 14px", display: "grid", gap: 5 }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 24, color: tone, fontWeight: 850 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>{detail}</div>
    </div>
  );
}

function bar(value: number, label: string, detail: string, color = "#0f766e") {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}><strong>{label}</strong><span>{safe}%</span></div>
      <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}><div style={{ height: "100%", width: `${safe}%`, background: color, borderRadius: 999 }} /></div>
      <div style={{ color: "#64748b", fontSize: 12 }}>{detail}</div>
    </div>
  );
}

export default async function StudentLearningEvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; courseId?: string }>;
}) {
  await requireLearningEvidenceUser();
  const { id: studentId } = await params;
  const query = await searchParams;
  const evidence = await loadStudentLearningEvidence({ studentId, from: query.from, to: query.to, courseId: query.courseId });
  if (!evidence) notFound();
  const plans = await prisma.studentLearningPlan.findMany({
    where: { studentId },
    include: { createdBy: { select: { name: true, email: true } }, approvedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const from = formatBusinessDateOnly(evidence.range.from);
  const to = formatBusinessDateOnly(evidence.range.to);
  const selectedCourseId = query.courseId || "";
  const pdfHref = `/api/admin/students/${encodeURIComponent(studentId)}/learning-evidence/pdf?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${selectedCourseId ? `&courseId=${encodeURIComponent(selectedCourseId)}` : ""}`;
  const homeworkTrackingPercent = evidence.snapshot.feedbackCount ? Math.round((evidence.snapshot.homeworkTrackingCount / evidence.snapshot.feedbackCount) * 100) : 0;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 18px 48px", display: "grid", gap: 16 }}>
      <section style={{ borderRadius: 18, padding: "20px", background: "linear-gradient(135deg, #ecfdf5, #eff6ff)", border: "1px solid #a7f3d0", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>INTERNAL TEACHING WORKSPACE / 内部教学工作台</div>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: 28 }}>Student learning evidence / 学生学习证据</h1>
            <div style={{ color: "#334155" }}><strong>{evidence.student.name}</strong> · {evidence.student.school || "School not recorded / 未记录学校"} · {evidence.student.grade || "Grade not recorded / 未记录年级"}</div>
            <div style={{ color: "#475569", fontSize: 13 }}>Only published, non-draft feedback from the student's formal sessions is included. This is an internal evidence pack, not a parent-facing report.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/admin/students/${encodeURIComponent(studentId)}`} style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", textDecoration: "none" }}>Back to student / 返回学生</Link>
            <a href={pdfHref} style={{ padding: "9px 12px", borderRadius: 9, background: "#0f766e", color: "#fff", textDecoration: "none", fontWeight: 800 }}>Download evidence PDF / 下载证据 PDF</a>
          </div>
        </div>
        <form method="get" style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "end", borderTop: "1px solid #bbf7d0", paddingTop: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>From / 开始<input type="date" name="from" defaultValue={from} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>To / 结束<input type="date" name="to" defaultValue={to} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>Course / 课程<select name="courseId" defaultValue={selectedCourseId} style={{ minWidth: 200, padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}><option value="">All courses / 全部课程</option>{evidence.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
          <button type="submit" style={{ padding: "9px 13px", border: 0, borderRadius: 8, background: "#1d4ed8", color: "#fff", fontWeight: 800 }}>Apply / 应用</button>
        </form>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        {metric("Formal lessons / 正式课次", evidence.snapshot.sessionCount, `${from} – ${to}`)}
        {metric("Published feedback / 已发布反馈", evidence.snapshot.feedbackCount, `${evidence.snapshot.feedbackSessionCount} lesson(s) covered`)}
        {metric("Feedback coverage / 反馈覆盖", `${evidence.snapshot.feedbackCoveragePercent}%`, "Published feedback ÷ formal lessons", evidence.snapshot.feedbackCoveragePercent >= 80 ? "#166534" : "#b45309")}
        {metric("Homework tracked / 作业已追踪", evidence.snapshot.homeworkTrackingCount, `of ${evidence.snapshot.feedbackCount} feedback entries`, homeworkTrackingPercent >= 70 ? "#166534" : "#b45309")}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.85fr)", gap: 16 }}>
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 14, background: "#fff", padding: 16, display: "grid", gap: 16 }}>
          <div><h2 style={{ margin: 0, fontSize: 18 }}>Evidence trends / 证据趋势</h2><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>These show recorded coverage, not an AI assessment of ability.</p></div>
          {bar(evidence.snapshot.feedbackCoveragePercent, "Feedback coverage / 反馈覆盖", `${evidence.snapshot.feedbackSessionCount} of ${evidence.snapshot.sessionCount} formal lessons have published feedback.`)}
          {bar(homeworkTrackingPercent, "Homework follow-through / 作业跟进", `${evidence.snapshot.homeworkTrackingCount} feedback entries record whether previous homework was completed.`, "#2563eb")}
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}><strong>Attendance / 点名：</strong>{Object.entries(evidence.snapshot.attendance).map(([status, count]) => `${labelLearningEvidenceAttendance(status)} ${count}`).join(" · ") || "No attendance record / 暂无点名记录"}</div>
        </div>
        <div style={{ border: "1px solid #fde68a", borderRadius: 14, background: "#fffbeb", padding: 16, display: "grid", gap: 10 }}>
          <div><h2 style={{ margin: 0, fontSize: 18 }}>Data to collect next / 下一步补充数据</h2><p style={{ margin: "6px 0 0", color: "#92400e", fontSize: 13 }}>The system blocks unsupported progress claims by showing missing evidence.</p></div>
          {evidence.snapshot.gaps.length ? evidence.snapshot.gaps.map((gap) => <div key={gap.key} style={{ borderTop: "1px solid #fde68a", paddingTop: 8 }}><strong>{gap.label}</strong><div style={{ color: "#92400e", fontSize: 13, marginTop: 3 }}>{gap.detail}</div></div>) : <div style={{ color: "#166534" }}>No system-detected gap in this range. Human review is still required.</div>}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 14, background: "#fff", padding: 16 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Repeated focus / 重复出现的学习重点</h2>{evidence.snapshot.focusAreas.length ? <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.65 }}>{evidence.snapshot.focusAreas.map((item) => <li key={item}>{item}</li>)}</ul> : <p style={{ margin: 0, color: "#64748b" }}>Not enough verified feedback to state a repeated focus.</p>}</div>
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 14, background: "#fff", padding: 16 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Teacher-recorded next steps / 老师已记录的下一步</h2>{evidence.snapshot.nextSteps.length ? <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.65 }}>{evidence.snapshot.nextSteps.map((item) => <li key={item}>{item}</li>)}</ul> : <p style={{ margin: 0, color: "#64748b" }}>No repeated next step can be derived from the selected evidence.</p>}</div>
      </section>

      <section style={{ border: "1px solid #bfdbfe", borderRadius: 14, background: "#f8fbff", padding: 16, display: "grid", gap: 14 }}>
        <div><h2 style={{ margin: 0, fontSize: 20 }}>Create learning-plan draft / 创建学习计划草稿</h2><p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.55 }}>The selected evidence snapshot is saved with the draft. It stays internal and requires academic review before any external sharing. AI may assist later, but it must cite the evidence and cannot invent missing facts.</p></div>
        <LearningPlanDraftForm studentId={studentId} from={from} to={to} courseId={selectedCourseId} />
      </section>

      <section style={{ border: "1px solid #dbe4f0", borderRadius: 14, background: "#fff", padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Saved learning-plan drafts / 已保存学习计划草稿</h2>
        {!plans.length ? <p style={{ color: "#64748b", marginBottom: 0 }}>No plan draft has been saved yet.</p> : <div style={{ display: "grid", gap: 10 }}>{plans.map((plan) => <article key={plan.id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, display: "grid", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong>{plan.title}</strong><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 12, padding: "2px 7px", borderRadius: 999, background: plan.status === "APPROVED" ? "#dcfce7" : "#fef3c7" }}>{plan.status}</span>{plan.status !== "APPROVED" ? <LearningPlanApprovalButton studentId={studentId} planId={plan.id} /> : null}</div></div><div style={{ color: "#475569", fontSize: 13 }}>{formatBusinessDateOnly(plan.periodStart)} – {formatBusinessDateOnly(plan.periodEnd)} · created by {plan.createdBy.name || plan.createdBy.email} · {formatBusinessDateTime(plan.createdAt)}</div><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{plan.goals}</div>{plan.reviewDueAt ? <div style={{ color: "#1d4ed8", fontSize: 13 }}>Review due / 复核日期: {formatBusinessDateOnly(plan.reviewDueAt)}</div> : null}</article>)}</div>}
      </section>
    </main>
  );
}

import { requireTeacherLead } from "@/lib/auth";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import {
  categoryLabel,
  createManagerTeacherFeedback,
  getRecentManagerTeacherFeedback,
  MANAGER_TEACHER_FEEDBACK_CATEGORIES,
} from "@/lib/manager-teacher-feedback";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

const panel = { border: "1px solid #dbe5ef", borderRadius: 8, background: "#fff", padding: 16 };

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function sendTeacherFeedbackAction(formData: FormData) {
  "use server";
  const user = await requireTeacherLead();
  const date = read(formData, "date") || formatBusinessDateOnly(new Date());
  try {
    await createManagerTeacherFeedback({
      teacherId: read(formData, "teacherId"),
      managerUserId: user.id,
      sessionId: read(formData, "sessionId") || null,
      category: read(formData, "category"),
      body: read(formData, "body"),
      requiresAck: formData.get("requiresAck") === "on",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save feedback";
    redirect(`/teacher/lead/quality?date=${encodeURIComponent(date)}&err=${encodeURIComponent(message)}`);
  }
  revalidatePath("/teacher/lead/quality");
  revalidatePath("/teacher/manager-feedback");
  redirect(`/teacher/lead/quality?date=${encodeURIComponent(date)}&saved=1`);
}

export default async function TeacherLeadQualityPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; teacherId?: string; sessionId?: string; saved?: string; err?: string }>;
}) {
  await requireTeacherLead();
  const lang = await getLang();
  const sp = await searchParams;
  const today = formatBusinessDateOnly(new Date());
  const date = String(sp?.date || today);
  const start = parseBusinessDateStart(date) ?? parseBusinessDateStart(today)!;
  const end = parseBusinessDateEnd(date) ?? parseBusinessDateEnd(today)!;

  const [teachers, sessions, recentFeedback] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, tutorCode: true } }),
    prisma.session.findMany({
      where: { startAt: { gte: start, lte: end } },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        teacherId: true,
        teacher: { select: { id: true, name: true } },
        student: { select: { name: true } },
        feedbacks: { select: { id: true } },
        class: {
          select: {
            teacher: { select: { id: true, name: true } },
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            oneOnOneStudent: { select: { name: true } },
            enrollments: { select: { student: { select: { name: true } } } },
          },
        },
      },
    }),
    getRecentManagerTeacherFeedback(20),
  ]);

  const rows = sessions.map((session) => {
    const teacher = session.teacher ?? session.class.teacher;
    const students = session.student?.name
      ? [session.student.name]
      : session.class.oneOnOneStudent?.name
        ? [session.class.oneOnOneStudent.name]
        : session.class.enrollments.map((item) => item.student.name);
    return {
      ...session,
      effectiveTeacherId: teacher.id,
      teacherName: teacher.name,
      students: students.join(", ") || "-",
      course: [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / "),
      feedbackComplete: session.feedbacks.length > 0,
    };
  });
  const selectedSession = rows.find((row) => row.id === sp?.sessionId);
  const selectedTeacherId = selectedSession?.effectiveTeacherId || (teachers.some((teacher) => teacher.id === sp?.teacherId) ? String(sp?.teacherId) : teachers[0]?.id || "");
  const missingFeedback = rows.filter((row) => !row.feedbackComplete).length;

  return (
    <main style={{ padding: 24, display: "grid", gap: 16, color: "#172033" }}>
      <section style={{ ...panel, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)" }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>TEACHER QUALITY / 老师质量管理</div>
        <h1>{t(lang, "Teacher Quality and Feedback Desk", "老师质量与反馈工作台")}</h1>
        <p>{t(lang, "Review teaching completion and send internal quality feedback. Payroll, rates, bank details and finance records are not available here.", "核对教学反馈完成情况并发送内部质量意见。本页面不提供工资、费率、银行资料或财务记录。")}</p>
        <Link href="/teacher/lead">{t(lang, "Back to Lead Desk", "返回主管工作台")}</Link>
      </section>

      {sp?.saved ? <section style={{ ...panel, borderColor: "#86efac", background: "#f0fdf4" }}>{t(lang, "Feedback saved and sent to the teacher portal.", "反馈已保存，并发送到对应老师端。")}</section> : null}
      {sp?.err ? <section style={{ ...panel, borderColor: "#fca5a5", background: "#fff1f2", color: "#991b1b" }}>{sp.err}</section> : null}

      <section style={{ ...panel, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <form style={{ display: "flex", gap: 8, alignItems: "end" }}>
          <label>{t(lang, "Schedule date", "课表日期")}<input type="date" name="date" defaultValue={date} style={{ display: "block" }} /></label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
        </form>
        <strong>{t(lang, "Sessions", "课次")}：{rows.length}</strong>
        <strong style={{ color: missingFeedback ? "#b91c1c" : "#047857" }}>{t(lang, "Without feedback", "尚无课后反馈")}：{missingFeedback}</strong>
      </section>

      <section style={{ ...panel, overflowX: "auto" }}>
        <h2>{t(lang, "Daily teaching overview", "当日教学概览")}</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead><tr><th align="left">{t(lang, "Time", "时间")}</th><th align="left">{t(lang, "Teacher", "老师")}</th><th align="left">{t(lang, "Course", "课程")}</th><th align="left">{t(lang, "Students", "学生")}</th><th align="left">{t(lang, "Feedback", "课后反馈")}</th><th /></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: "9px 4px" }}>{formatBusinessTimeOnly(row.startAt)}-{formatBusinessTimeOnly(row.endAt)}</td>
              <td>{row.teacherName}</td><td>{row.course}</td><td>{row.students}</td>
              <td style={{ color: row.feedbackComplete ? "#047857" : "#b91c1c", fontWeight: 700 }}>{row.feedbackComplete ? t(lang, "Submitted", "已提交") : t(lang, "Missing", "缺失")}</td>
              <td><Link href={`/teacher/lead/quality?date=${date}&teacherId=${row.effectiveTeacherId}&sessionId=${row.id}#give-feedback`}>{t(lang, "Give feedback", "给反馈")}</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <section id="give-feedback" style={{ ...panel, scrollMarginTop: 20 }}>
        <h2>{t(lang, "Internal feedback to teacher", "给老师的内部反馈")}</h2>
        <form action={sendTeacherFeedbackAction} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="date" value={date} />
          <label>{t(lang, "Teacher", "老师")}<select name="teacherId" defaultValue={selectedTeacherId} required style={{ display: "block", width: "100%" }}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.tutorCode ? `${teacher.tutorCode} · ` : ""}{teacher.name}</option>)}</select></label>
          <label>{t(lang, "Related session", "关联课次")}<select name="sessionId" defaultValue={selectedSession?.id || ""} style={{ display: "block", width: "100%" }}><option value="">{t(lang, "No specific session", "不关联具体课次")}</option>{rows.filter((row) => row.effectiveTeacherId === selectedTeacherId).map((row) => <option key={row.id} value={row.id}>{formatBusinessTimeOnly(row.startAt)} · {row.course} · {row.students}</option>)}</select></label>
          <label>{t(lang, "Category", "类型")}<select name="category" defaultValue="OBSERVATION" style={{ display: "block", width: "100%" }}>{MANAGER_TEACHER_FEEDBACK_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{categoryLabel(category.value, lang)}</option>)}</select></label>
          <label>{t(lang, "Comment", "反馈内容")}<textarea name="body" minLength={3} maxLength={3000} rows={5} required style={{ display: "block", width: "100%" }} /></label>
          <label><input type="checkbox" name="requiresAck" defaultChecked /> {t(lang, "Require teacher acknowledgement", "需要老师确认已读")}</label>
          <button type="submit">{t(lang, "Send feedback", "发送反馈")}</button>
        </form>
      </section>

      <section style={panel}>
        <h2>{t(lang, "Recent management feedback", "最近管理反馈")}</h2>
        <div style={{ display: "grid", gap: 10 }}>{recentFeedback.map((item) => <article key={item.id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}><strong>{item.teacherName} · {categoryLabel(item.category, lang)}</strong><p>{item.body}</p><small>{item.managerName} · {item.createdAt}{item.requiresAck ? ` · ${item.acknowledgedAt ? t(lang, "Acknowledged", "已确认") : t(lang, "Awaiting acknowledgement", "待老师确认")}` : ""}</small></article>)}</div>
      </section>
    </main>
  );
}

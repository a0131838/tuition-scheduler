import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { AttendanceStatus, FeedbackStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function decode(v: string | undefined) {
  return v ? decodeURIComponent(v) : "";
}

function toInputDateTimeValue(value: Date | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: Date) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

async function saveAttendanceForTeacher(sessionId: string, teacherId: string, formData: FormData) {
  "use server";
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true, attendances: true },
  });
  if (!session) redirect("/teacher/sessions?err=Session+not+found");

  const allowed = session.teacherId === teacherId || (!session.teacherId && session.class.teacherId === teacherId);
  if (!allowed) redirect("/teacher/sessions?err=No+permission");

  const enrollments = await prisma.enrollment.findMany({ where: { classId: session.classId } });
  const attendanceEnrollments =
    session.class.capacity === 1 && session.studentId
      ? enrollments.filter((e) => e.studentId === session.studentId)
      : enrollments;

  for (const e of attendanceEnrollments) {
    const statusRaw = String(formData.get(`status:${e.studentId}`) ?? "UNMARKED");
    const note = String(formData.get(`note:${e.studentId}`) ?? "").trim() || null;
    const status = (Object.values(AttendanceStatus) as string[]).includes(statusRaw)
      ? (statusRaw as AttendanceStatus)
      : "UNMARKED";
    const existing = session.attendances.find((a) => a.studentId === e.studentId);

    await prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: e.studentId } },
      update: {
        status,
        note,
        deductedCount: existing?.deductedCount ?? 0,
        deductedMinutes: existing?.deductedMinutes ?? 0,
        packageId: existing?.packageId ?? null,
      },
      create: {
        sessionId,
        studentId: e.studentId,
        status,
        note,
        deductedCount: 0,
        deductedMinutes: 0,
      },
    });
  }

  redirect(`/teacher/sessions/${sessionId}?msg=Attendance+saved`);
}

async function saveSessionFeedback(sessionId: string, teacherId: string, submittedByUserId: string, formData: FormData) {
  "use server";
  const focusStudentName = String(formData.get("focusStudentName") ?? "").trim() || null;
  const actualStartRaw = String(formData.get("actualStartAt") ?? "").trim();
  const actualEndRaw = String(formData.get("actualEndAt") ?? "").trim();
  const classPerformance = String(formData.get("classPerformance") ?? "").trim();
  const homework = String(formData.get("homework") ?? "").trim();
  const previousHomeworkDoneRaw = String(formData.get("previousHomeworkDone") ?? "").trim();
  const previousHomeworkDone =
    previousHomeworkDoneRaw === "yes" ? true : previousHomeworkDoneRaw === "no" ? false : null;

  if (!classPerformance) redirect(`/teacher/sessions/${sessionId}?err=Class+performance+is+required`);
  if (!homework) redirect(`/teacher/sessions/${sessionId}?err=Homework+is+required`);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: { include: { course: true, subject: true } } },
  });
  if (!session) redirect("/teacher/sessions?err=Session+not+found");

  const allowed = session.teacherId === teacherId || (!session.teacherId && session.class.teacherId === teacherId);
  if (!allowed) redirect("/teacher/sessions?err=No+permission");

  const deadline = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
  const now = new Date();
  const status: FeedbackStatus = now <= deadline ? "ON_TIME" : "LATE";

  const actualStartAt = actualStartRaw ? new Date(actualStartRaw) : null;
  const actualEndAt = actualEndRaw ? new Date(actualEndRaw) : null;
  if (actualStartAt && Number.isNaN(actualStartAt.getTime())) {
    redirect(`/teacher/sessions/${sessionId}?err=Invalid+actual+start+time`);
  }
  if (actualEndAt && Number.isNaN(actualEndAt.getTime())) {
    redirect(`/teacher/sessions/${sessionId}?err=Invalid+actual+end+time`);
  }
  if (actualStartAt && actualEndAt && actualEndAt <= actualStartAt) {
    redirect(`/teacher/sessions/${sessionId}?err=Actual+end+must+be+later+than+start`);
  }

  const subjectName = session.class.subject?.name || session.class.course.name;
  const plannedStart = formatDateTime(new Date(session.startAt));
  const plannedEnd = new Date(session.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const actualTimeLine =
    actualStartAt && actualEndAt
      ? `${formatDateTime(actualStartAt)} - ${actualEndAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : actualStartAt
      ? `${formatDateTime(actualStartAt)} - Not set`
      : "Not set";

  const previousHomeworkText =
    previousHomeworkDone === true ? "yes" : previousHomeworkDone === false ? "no" : "not set";
  const feedbackTitle = focusStudentName || "Whole Class";
  const content = [
    `[Class Feedback / 课堂反馈 - ${feedbackTitle}]`,
    `1. Subject / 科目: ${subjectName}`,
    `2. Time / 时间: Planned / 计划 ${plannedStart} - ${plannedEnd}; Actual / 实际 ${actualTimeLine}`,
    `3. Class performance / 课堂表现: ${classPerformance}`,
    `4. Homework / 作业: ${homework}`,
    `5. Previous homework done / 之前作业完成情况: ${previousHomeworkText}`,
  ].join("\n");

  await prisma.sessionFeedback.upsert({
    where: { sessionId_teacherId: { sessionId, teacherId } },
    update: {
      content,
      focusStudentName,
      actualStartAt,
      actualEndAt,
      classPerformance,
      homework,
      previousHomeworkDone,
      status,
      dueAt: deadline,
      submittedByRole: "TEACHER",
      submittedByUserId,
      isProxyDraft: false,
      proxyNote: null,
      submittedAt: now,
    },
    create: {
      sessionId,
      teacherId,
      content,
      focusStudentName,
      actualStartAt,
      actualEndAt,
      classPerformance,
      homework,
      previousHomeworkDone,
      status,
      dueAt: deadline,
      submittedByRole: "TEACHER",
      submittedByUserId,
      isProxyDraft: false,
      proxyNote: null,
      submittedAt: now,
    },
  });

  redirect(`/teacher/sessions/${sessionId}?msg=${status === "LATE" ? "Feedback+saved+(late)" : "Feedback+saved"}`);
}

export default async function TeacherSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { user, teacher } = await requireTeacherProfile();
  if (!teacher || !user) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const { id: sessionId } = await params;
  const sp = await searchParams;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      student: true,
      class: { include: { course: true, subject: true, level: true, campus: true, room: true } },
      attendances: true,
      feedbacks: { where: { teacherId: teacher.id } },
    },
  });
  if (!session) return <div>{t(lang, "Session not found.", "课次不存在。")}</div>;

  const allowed = session.teacherId === teacher.id || (!session.teacherId && session.class.teacherId === teacher.id);
  if (!allowed) return <div style={{ color: "#b00" }}>{t(lang, "No permission.", "无权访问此课次。")}</div>;

  const enrollments = await prisma.enrollment.findMany({
    where: { classId: session.classId },
    include: { student: true },
    orderBy: { student: { name: "asc" } },
  });
  const attendanceEnrollments =
    session.class.capacity === 1 && session.studentId
      ? enrollments.filter((e) => e.studentId === session.studentId)
      : enrollments;

  const attMap = new Map(session.attendances.map((a) => [a.studentId, a]));
  const feedback = session.feedbacks[0] ?? null;
  const deadline = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
  const feedbackOverdue = new Date() > deadline;
  const lastAttendanceSavedAt =
    session.attendances.length > 0
      ? new Date(Math.max(...session.attendances.map((a) => new Date(a.updatedAt).getTime())))
      : null;

  const msg = decode(sp?.msg);
  const err = decode(sp?.err);

  return (
    <div>
      <h2>{t(lang, "Session Detail", "课次详情")}</h2>
      <p>
        <a href="/teacher/sessions">{t(lang, "Back", "返回")}</a>
      </p>
      {err && <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div>}
      {feedback ? (
        <div style={{ color: "#087", marginBottom: 10 }}>
          {t(lang, "Last saved", "最近保存")}: {new Date(feedback.submittedAt).toLocaleString()} (
          {feedback.status === "ON_TIME"
            ? t(lang, "On time", "准时")
            : feedback.status === "LATE"
            ? t(lang, "Late", "迟交")
            : t(lang, "Proxy draft", "代填草稿")}
          )
        </div>
      ) : null}
      {lastAttendanceSavedAt ? (
        <div style={{ color: "#087", marginBottom: 10 }}>
          {t(lang, "Last attendance save", "最近点名保存")}: {lastAttendanceSavedAt.toLocaleString()}
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <b>
          {new Date(session.startAt).toLocaleString()} - {new Date(session.endAt).toLocaleTimeString()}
        </b>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <ClassTypeBadge capacity={session.class.capacity} compact />
          <span>
            {session.class.course.name}
            {session.class.subject ? ` / ${session.class.subject.name}` : ""}
            {session.class.level ? ` / ${session.class.level.name}` : ""}
          </span>
        </div>
        {session.class.capacity === 1 && (
          <div>
            {t(lang, "Student", "学生")}: {session.student?.name ?? t(lang, "Not assigned", "未选择学生")}
          </div>
        )}
        <div>
          {session.class.campus.name}
          {session.class.room ? ` / ${session.class.room.name}` : ""}
        </div>
      </div>

      <h3>{t(lang, "Attendance", "点名")}</h3>
      <form action={saveAttendanceForTeacher.bind(null, session.id, teacher.id)}>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
            </tr>
          </thead>
          <tbody>
            {attendanceEnrollments.map((e) => {
              const a = attMap.get(e.studentId);
              return (
                <tr key={e.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{e.student.name}</td>
                  <td>
                    <select name={`status:${e.studentId}`} defaultValue={a?.status ?? "UNMARKED"}>
                      <option value="UNMARKED">UNMARKED</option>
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="LATE">LATE</option>
                      <option value="EXCUSED">EXCUSED</option>
                    </select>
                  </td>
                  <td>
                    <input name={`note:${e.studentId}`} defaultValue={a?.note ?? ""} style={{ width: "100%" }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="submit">{t(lang, "Save Attendance", "保存点名")}</button>
      </form>

      <h3 style={{ marginTop: 20 }}>{t(lang, "After-class Feedback", "课后反馈")}</h3>
      <div style={{ color: feedbackOverdue ? "#b00" : "#666", marginBottom: 6 }}>
        {feedbackOverdue
          ? t(
              lang,
              "Overdue: please submit now. This feedback will be marked as Late.",
              "已超时：请尽快补交，提交后会标记为迟交。"
            )
          : `${t(lang, "Deadline", "截止")}: ${deadline.toLocaleString()}`}
      </div>
      {feedback?.isProxyDraft ? (
        <div style={{ color: "#92400e", background: "#fff7ed", border: "1px solid #fed7aa", padding: 8, borderRadius: 6, marginBottom: 8 }}>
          {t(lang, "Admin created a temporary draft. Please complete and resubmit.", "教务已代填临时草稿，请补全后重新提交。")}
        </div>
      ) : null}
      <form action={saveSessionFeedback.bind(null, session.id, teacher.id, user.id)}>
        <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
          <div style={{ color: "#666", fontSize: 13 }}>
            {t(lang, "Planned time", "计划上课时间")}: {new Date(session.startAt).toLocaleString()} - {" "}
            {new Date(session.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <label>
            {t(lang, "Focus student (optional)", "重点学生(选填)")}
            <input
              name="focusStudentName"
              defaultValue={feedback?.focusStudentName ?? ""}
              style={{ width: "100%" }}
              placeholder={t(lang, "e.g. Wang Xiaoming", "例如：王小明")}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              {t(lang, "Actual start", "实际上课开始")}
              <input
                type="datetime-local"
                name="actualStartAt"
                defaultValue={toInputDateTimeValue(feedback?.actualStartAt)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              {t(lang, "Actual end", "实际上课结束")}
              <input
                type="datetime-local"
                name="actualEndAt"
                defaultValue={toInputDateTimeValue(feedback?.actualEndAt)}
                style={{ width: "100%" }}
              />
            </label>
          </div>
          <label>
            {t(lang, "Class performance", "课堂表现")}
            <textarea
              name="classPerformance"
              defaultValue={feedback?.classPerformance ?? ""}
              rows={4}
              style={{ width: "100%" }}
              placeholder={t(lang, "What was covered and how the student performed", "本节课内容和学生表现")}
            />
          </label>
          <label>
            {t(lang, "Homework", "作业")}
            <textarea
              name="homework"
              defaultValue={feedback?.homework ?? ""}
              rows={3}
              style={{ width: "100%" }}
              placeholder={t(lang, "Homework assigned after class", "课后作业")}
            />
          </label>
          <label>
            {t(lang, "Previous homework done", "之前作业完成情况")}
            <select
              name="previousHomeworkDone"
              defaultValue={
                feedback?.previousHomeworkDone === true
                  ? "yes"
                  : feedback?.previousHomeworkDone === false
                  ? "no"
                  : ""
              }
            >
              <option value="">{t(lang, "Not set", "未填写")}</option>
              <option value="yes">{t(lang, "Yes", "是")}</option>
              <option value="no">{t(lang, "No", "否")}</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">{t(lang, "Submit Feedback", "提交反馈")}</button>
        </div>
      </form>
    </div>
  );
}





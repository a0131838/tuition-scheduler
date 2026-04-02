import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { getCancelledSessionStudentIds, getVisibleSessionStudentNames } from "@/lib/session-students";
import TeacherAttendanceClient from "./TeacherAttendanceClient";
import TeacherFeedbackClient from "./TeacherFeedbackClient";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";

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
  return formatBusinessDateTime(value);
}

// Attendance and feedback are handled via client fetch to avoid page jump/flash.

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
      class: { include: { course: true, subject: true, level: true, campus: true, room: true, oneOnOneStudent: true } },
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
  const cancelledSet = getCancelledSessionStudentIds(session);
  const attendanceEnrollments =
    session.class.capacity === 1 && session.studentId
      ? enrollments.filter((e) => e.studentId === session.studentId)
      : enrollments;
  const visibleAttendanceEnrollments = attendanceEnrollments.filter((e) => !cancelledSet.has(e.studentId));
  const visibleStudentNames = getVisibleSessionStudentNames({
    studentId: session.studentId,
    student: session.student,
    attendances: session.attendances,
    class: {
      capacity: session.class.capacity,
      oneOnOneStudentId: session.class.oneOnOneStudentId,
      oneOnOneStudent: session.class.oneOnOneStudent,
      enrollments,
    },
  });

  const attMap = new Map(session.attendances.map((a) => [a.studentId, a]));
  const feedback = session.feedbacks[0] ?? null;
  const deadline = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
  const feedbackOverdue = new Date() > deadline;
  const attendanceRows = visibleAttendanceEnrollments.map((e) => {
    const attendance = attMap.get(e.studentId);
    return {
      studentId: e.studentId,
      studentName: e.student.name,
      status: attendance?.status ?? "UNMARKED",
      note: attendance?.note ?? "",
    };
  });
  const pendingAttendanceCount = attendanceRows.filter((row) => row.status === "UNMARKED").length;
  const attendanceDoneCount = attendanceRows.length - pendingAttendanceCount;
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
          {t(lang, "Last saved", "最近保存")}: {formatBusinessDateTime(new Date(feedback.submittedAt))} (
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
          {t(lang, "Last attendance save", "最近点名保存")}: {formatBusinessDateTime(lastAttendanceSavedAt)}
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <b>
          {formatBusinessDateTime(new Date(session.startAt))} - {formatBusinessTimeOnly(new Date(session.endAt))}
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
            {t(lang, "Student", "学生")}:{" "}
            {visibleStudentNames[0] ?? t(lang, "Cancelled / hidden", "已取消 / 已隐藏")}
          </div>
        )}
        <div>
          {session.class.campus.name}
          {session.class.room ? ` / ${session.class.room.name}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          marginBottom: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div
          style={{
            border: "1px solid #bae6fd",
            background: "#f0f9ff",
            borderRadius: 12,
            padding: 12,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "#0369a1", letterSpacing: 0.2 }}>
            {t(lang, "Step 1", "步骤 1")}
          </div>
          <div style={{ fontWeight: 700 }}>{t(lang, "Finish attendance first", "先完成点名")}</div>
          <div style={{ color: "#0f172a", fontSize: 13 }}>
            {pendingAttendanceCount > 0
              ? t(
                  lang,
                  `${pendingAttendanceCount} students still need a status before you move on to feedback.`,
                  `还有 ${pendingAttendanceCount} 位学生未点名，建议先补齐状态再继续填写反馈。`
                )
              : t(
                  lang,
                  `Attendance is complete for ${attendanceDoneCount} students. You can move on to feedback now.`,
                  `已完成 ${attendanceDoneCount} 位学生的点名，现在可以继续填写反馈。`
                )}
          </div>
        </div>
        <div
          style={{
            border: "1px solid #ddd6fe",
            background: "#f5f3ff",
            borderRadius: 12,
            padding: 12,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9", letterSpacing: 0.2 }}>
            {t(lang, "Step 2", "步骤 2")}
          </div>
          <div style={{ fontWeight: 700 }}>{t(lang, "Then submit after-class feedback", "然后提交课后反馈")}</div>
          <div style={{ color: "#0f172a", fontSize: 13 }}>
            {t(
              lang,
              "Once attendance is settled, record what was covered, how the student performed, and the homework assigned.",
              "点名确认后，再补充本节课内容、学生表现和课后作业。"
            )}
          </div>
        </div>
      </div>

      <h3>{t(lang, "Attendance", "点名")}</h3>
      <TeacherAttendanceClient
        sessionId={session.id}
        initialRows={attendanceRows}
        labels={{
          save: t(lang, "Save Attendance", "保存点名"),
          saved: t(lang, "Saved", "已保存"),
          errorPrefix: t(lang, "Error", "错误"),
          colStudent: t(lang, "Student", "学生"),
          colStatus: t(lang, "Status", "状态"),
          colNote: t(lang, "Note", "备注"),
        }}
      />

      <h3 style={{ marginTop: 20 }}>{t(lang, "After-class Feedback", "课后反馈")}</h3>
      {pendingAttendanceCount > 0 ? (
        <div
          style={{
            color: "#92400e",
            background: "#fff7ed",
            border: "1px solid #fdba74",
            padding: 8,
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          {t(
            lang,
            `${pendingAttendanceCount} students are still unmarked. You can continue writing feedback, but it is safer to finish attendance first.`,
            `还有 ${pendingAttendanceCount} 位学生未点名。你仍可继续填写反馈，但更建议先完成点名。`
          )}
        </div>
      ) : null}
      <div style={{ color: feedbackOverdue ? "#b00" : "#666", marginBottom: 6 }}>
        {feedbackOverdue
          ? t(
              lang,
              "Overdue: please submit now. This feedback will be marked as Late.",
              "已超时：请尽快补交，提交后会标记为迟交。"
            )
          : `${t(lang, "Deadline", "截止")}: ${formatBusinessDateTime(deadline)}`}
      </div>
      {feedback?.isProxyDraft ? (
        <div style={{ color: "#92400e", background: "#fff7ed", border: "1px solid #fed7aa", padding: 8, borderRadius: 6, marginBottom: 8 }}>
          {t(lang, "Admin created a temporary draft. Please complete and resubmit.", "教务已代填临时草稿，请补全后重新提交。")}
        </div>
      ) : null}
      <TeacherFeedbackClient
        sessionId={session.id}
        initial={{
          focusStudentName: feedback?.focusStudentName ?? "",
          actualStartAt: toInputDateTimeValue(feedback?.actualStartAt),
          actualEndAt: toInputDateTimeValue(feedback?.actualEndAt),
          classPerformance: feedback?.classPerformance ?? "",
          homework: feedback?.homework ?? "",
          previousHomeworkDone:
            feedback?.previousHomeworkDone === true ? "yes" : feedback?.previousHomeworkDone === false ? "no" : "",
        }}
        labels={{
          submit: t(lang, "Submit Feedback", "提交反馈"),
          saved: t(lang, "Saved", "已保存"),
          errorPrefix: t(lang, "Error", "错误"),
          requiredPerformance: t(lang, "Class performance is required", "课堂表现为必填"),
          requiredHomework: t(lang, "Homework is required", "作业为必填"),
          focusStudent: t(lang, "Focus student (optional)", "重点学生(选填)"),
          focusStudentPlaceholder: t(lang, "e.g. Wang Xiaoming", "例如：王小明"),
          actualStart: t(lang, "Actual start", "实际上课开始"),
          actualEnd: t(lang, "Actual end", "实际上课结束"),
          classPerformance: t(lang, "Class performance", "课堂表现"),
          classPerformancePlaceholder: t(lang, "What was covered and how the student performed", "本节课内容和学生表现"),
          homework: t(lang, "Homework", "作业"),
          homeworkPlaceholder: t(lang, "Homework assigned after class", "课后作业"),
          previousHomeworkDone: t(lang, "Previous homework done", "之前作业完成情况"),
          notSet: t(lang, "Not set", "未填写"),
          yes: t(lang, "Yes", "是"),
          no: t(lang, "No", "否"),
        }}
      />
    </div>
  );
}

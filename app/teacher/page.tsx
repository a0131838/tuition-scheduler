import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import TeacherConfirmCoursesButton from "./TeacherConfirmCoursesButton";
import { getVisibleSessionStudentNames } from "@/lib/session-students";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { ExpenseClaimStatus } from "@prisma/client";
import { getTeacherPayrollPublishForTeacher } from "@/lib/teacher-payroll";

const TEACHER_SELF_CONFIRM_TODAY = "TEACHER_SELF_CONFIRM_TODAY";
const TEACHER_SELF_CONFIRM_TOMORROW = "TEACHER_SELF_CONFIRM_TOMORROW";

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sessionStudentNames(s: any) {
  return getVisibleSessionStudentNames(s);
}

function cardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 18,
    padding: 16,
    background,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  } as const;
}

// Teacher self-confirm is handled via client fetch to avoid page jump/flash.

export default async function TeacherHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { teacher, user } = await requireTeacherProfile();

  if (!teacher) {
    return (
      <div>
        <h2>{t(lang, "Teacher Profile Not Linked", "老师资料未关联")}</h2>
        <p style={{ color: "#b00" }}>
          {t(
            lang,
            "Cannot find a linked Teacher profile for this account. Ask admin to link your teacher account.",
            "未找到与当前账号绑定的老师档案，请联系教务在老师详情页完成账号绑定。"
          )}
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(todayEnd.getDate() + 1);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const currentMonthKey = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, "0")}`;
  const [todaySessions, tomorrowSessions, todayConfirmed, tomorrowConfirmed, riskStudentCount, rejectedExpenseClaims, payrollPublish] = await Promise.all([
    prisma.session.findMany({
      where: {
        startAt: { gte: todayStart, lte: todayEnd },
        OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      },
      include: {
        attendances: { select: { studentId: true, status: true } },
        student: { select: { id: true, name: true } },
        class: {
          include: {
            course: true,
            subject: true,
            level: true,
            campus: true,
            room: true,
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: { include: { student: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.session.findMany({
      where: {
        startAt: { gte: tomorrowStart, lte: tomorrowEnd },
        OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      },
      include: {
        attendances: { select: { studentId: true, status: true } },
        student: { select: { id: true, name: true } },
        class: {
          include: {
            course: true,
            subject: true,
            level: true,
            campus: true,
            room: true,
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: { include: { student: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.todoReminderConfirm.findFirst({
      where: { type: TEACHER_SELF_CONFIRM_TODAY, targetId: teacher.id, date: toDateOnly(todayStart) },
      select: { createdAt: true },
    } as any),
    prisma.todoReminderConfirm.findFirst({
      where: { type: TEACHER_SELF_CONFIRM_TOMORROW, targetId: teacher.id, date: toDateOnly(tomorrowStart) },
      select: { createdAt: true },
    } as any),
    (async () => {
      const taughtRows = await prisma.attendance.findMany({
        where: {
          session: {
            OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
          },
        },
        select: { studentId: true },
        distinct: ["studentId"],
      });
      const taughtStudentIds = taughtRows.map((x) => x.studentId);
      if (taughtStudentIds.length === 0) return 0;

      const recentOtherFeedbacks = await prisma.sessionFeedback.findMany({
        where: {
          teacherId: { not: teacher.id },
          session: {
            startAt: { gte: sevenDaysAgo },
            attendances: { some: { studentId: { in: taughtStudentIds } } },
          },
        },
        select: {
          id: true,
          session: {
            select: {
              attendances: {
                where: { studentId: { in: taughtStudentIds } },
                select: { studentId: true },
              },
            },
          },
        },
        take: 2000,
      });

      if (recentOtherFeedbacks.length === 0) return 0;
      const feedbackIds = recentOtherFeedbacks.map((x) => x.id);
      const readRows = await prisma.teacherFeedbackRead.findMany({
        where: { userId: user.id, feedbackId: { in: feedbackIds } },
        select: { feedbackId: true },
      });
      const readSet = new Set(readRows.map((x) => x.feedbackId));
      const riskStudents = new Set<string>();
      for (const f of recentOtherFeedbacks) {
        if (readSet.has(f.id)) continue;
        for (const a of f.session.attendances) riskStudents.add(a.studentId);
      }
      return riskStudents.size;
    })(),
    prisma.expenseClaim.count({
      where: {
        submitterUserId: user.id,
        status: ExpenseClaimStatus.REJECTED,
      },
    }),
    getTeacherPayrollPublishForTeacher({ teacherId: teacher.id, month: currentMonthKey, scope: "all" }),
  ]);
  const todaySessionsVisible = todaySessions.filter((s) => sessionStudentNames(s).length > 0);
  const tomorrowSessionsVisible = tomorrowSessions.filter((s) => sessionStudentNames(s).length > 0);
  const attendanceTodoCount = todaySessionsVisible.length;
  const tomorrowPreviewCount = tomorrowSessionsVisible.length;
  const workCards = [
    {
      href: "/teacher/sessions",
      title: t(lang, "Attendance to submit", "待点名"),
      value: attendanceTodoCount,
      note: t(lang, "Use My Sessions to mark attendance and submit feedback.", "去我的课次处理点名和反馈。"),
      background: "#fff7ed",
      border: "#fdba74",
    },
    {
      href: "/teacher/student-feedbacks?handoffRisk=1&onlyUnreadOthers=1",
      title: t(lang, "Handoff risk students", "交接风险学生"),
      value: riskStudentCount,
      note: t(lang, "Unread cross-teacher feedback in the last 7 days.", "近7天未读的跨老师反馈。"),
      background: "#fff1f2",
      border: "#fda4af",
    },
    {
      href: "/teacher/expense-claims?status=REJECTED",
      title: t(lang, "Expense claims to fix", "待补件报销"),
      value: rejectedExpenseClaims,
      note: t(lang, "Rejected claims that need updates or re-submission.", "需要补件或重提的已驳回报销。"),
      background: "#fef2f2",
      border: "#fecaca",
    },
    {
      href: "/teacher/payroll",
      title: t(lang, "Payroll to confirm", "待确认工资"),
      value: payrollPublish ? 1 : 0,
      note: payrollPublish
        ? t(lang, "There is a payroll waiting for your confirmation this month.", "本月有一张工资单等待你确认。")
        : t(lang, "No payroll action is waiting from you right now.", "你这边目前没有待确认工资。"),
      background: "#eff6ff",
      border: "#bfdbfe",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          ...cardStyle("linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)", "#bfdbfe"),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{t(lang, "Teacher Dashboard", "老师工作台")}</div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              {t(lang, "Welcome back", "欢迎回来")} {teacher.name}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="/teacher/sessions">{t(lang, "Open today sessions", "打开今日课次")}</a>
            <a href="/teacher/expense-claims">{t(lang, "Open finance", "打开财务")}</a>
          </div>
        </div>
        <div style={{ color: "#334155" }}>
          {t(
            lang,
            "Start with today, then clear your action queue, then review schedule and finance.",
            "先处理今天，再清空你的待办，然后查看课表和财务。"
          )}
        </div>
      </section>

      {err ? <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 8 }}>{msg}</div> : null}

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{t(lang, "Today", "今天")}</h3>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Focus on your classes and confirmations for today and tomorrow.", "先处理今天和明天的课程与确认。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div style={cardStyle("#fffbeb", "#fde68a")}>
            <div style={{ fontSize: 12, color: "#92400e", fontWeight: 800 }}>{t(lang, "Today's classes", "今日课程")}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#92400e", marginTop: 8 }}>{todaySessionsVisible.length}</div>
            <div style={{ color: "#92400e", marginTop: 6 }}>{t(lang, "Classes scheduled for today.", "今天已安排的课程。")}</div>
          </div>
          <div style={cardStyle("#eff6ff", "#bfdbfe")}>
            <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 800 }}>{t(lang, "Tomorrow preview", "明日预览")}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#1d4ed8", marginTop: 8 }}>{tomorrowPreviewCount}</div>
            <div style={{ color: "#1e40af", marginTop: 6 }}>{t(lang, "Classes visible for tomorrow.", "明天可见的课程数量。")}</div>
          </div>
          <div style={cardStyle("#f0fdf4", "#bbf7d0")}>
            <div style={{ fontSize: 12, color: "#166534", fontWeight: 800 }}>{t(lang, "Today confirm status", "今日确认状态")}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#166534", marginTop: 8 }}>
              {todayConfirmed ? t(lang, "Confirmed", "已确认") : t(lang, "Pending confirmation", "待确认")}
            </div>
            <div style={{ color: "#166534", marginTop: 6, fontSize: 13 }}>
              {todayConfirmed
                ? `${t(lang, "Confirmed at", "确认时间")}: ${formatBusinessTimeOnly(new Date((todayConfirmed as any).createdAt))}`
                : t(lang, "Please confirm today's teaching plan before class.", "请在上课前确认今天的教学安排。")}
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{t(lang, "My Work", "我的任务")}</h3>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Open the task cards below to work through attendance, finance, and handoff items.", "从下面这些任务卡进入，依次处理点名、财务和交接事项。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {workCards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              style={{
                ...cardStyle(card.background, card.border),
                textDecoration: "none",
                color: "#0f172a",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800 }}>{card.title}</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{card.value}</div>
              <div style={{ color: "#475569", fontSize: 13 }}>{card.note}</div>
              <div style={{ color: "#1d4ed8", fontWeight: 700 }}>{t(lang, "Open", "打开")}</div>
            </a>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{t(lang, "Schedule", "课表安排")}</h3>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Review your classes and availability from one place.", "从一个地方查看你的课次和可上课时间。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <a href="/teacher/sessions" style={{ ...cardStyle("#ffffff", "#dbeafe"), textDecoration: "none", color: "#0f172a", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "My Sessions", "我的课次")}</div>
            <div style={{ color: "#475569" }}>{t(lang, "Timeline view for today, recent classes, and the next 30 days.", "查看今天、最近以及未来30天的课次时间线。")}</div>
          </a>
          <a href="/teacher/availability" style={{ ...cardStyle("#ffffff", "#dbeafe"), textDecoration: "none", color: "#0f172a", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "My Availability", "我的可上课时间")}</div>
            <div style={{ color: "#475569" }}>{t(lang, "Update the next 30 days of bookable time and clear-day changes.", "更新未来30天的可约课时间和清空当日变更。")}</div>
          </a>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{t(lang, "Finance", "财务")}</h3>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Keep your payroll and expense claims visible without mixing them into teaching tasks.", "把工资和报销放在独立区块里，不和教学任务混在一起。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <a href="/teacher/payroll" style={{ ...cardStyle("#ffffff", "#bfdbfe"), textDecoration: "none", color: "#0f172a", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "My Payroll", "我的工资单")}</div>
            <div style={{ color: "#475569" }}>{t(lang, "Check the current payroll owner, timeline, and whether you need to confirm now.", "查看当前处理方、工资时间线，以及你现在是否需要确认。")}</div>
          </a>
          <a href="/teacher/expense-claims" style={{ ...cardStyle("#ffffff", "#bfdbfe"), textDecoration: "none", color: "#0f172a", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>{t(lang, "My Expense Claims", "我的报销")}</div>
            <div style={{ color: "#475569" }}>{t(lang, "Submit new claims, fix rejected ones, and follow payment batch updates.", "提交新报销、补件重提、查看付款批次进度。")}</div>
          </a>
        </div>
      </section>

      <div style={{ display: "grid", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: 12,
            background: "#fff1f2",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#9f1239" }}>
              {t(lang, "Handoff Risk Students", "交接风险学生")}: {riskStudentCount}
            </div>
            <div style={{ color: "#881337", fontSize: 12 }}>
              {t(lang, "Unread cross-teacher feedbacks in last 7 days.", "近7天其他老师反馈未读。")}
            </div>
          </div>
          <a href="/teacher/student-feedbacks?handoffRisk=1&onlyUnreadOthers=1">
            {t(lang, "Open Risk Queue", "打开风险队列")}
          </a>
        </div>

        <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: 12, background: "#fffbeb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Today's Courses", "今日课程")} ({todaySessionsVisible.length})</h3>
            {todayConfirmed ? (
                <span style={{ color: "#166534", fontWeight: 700 }}>
                {t(lang, "Confirmed", "已确认")}: {formatBusinessTimeOnly(new Date((todayConfirmed as any).createdAt))}
              </span>
            ) : (
              <TeacherConfirmCoursesButton
                dayKind="today"
                date={toDateInputValue(todayStart)}
                initialConfirmedAt={(todayConfirmed as any)?.createdAt ? (todayConfirmed as any).createdAt.toISOString() : null}
                labels={{
                  confirm: t(lang, "Confirm Today's Courses", "确认今日课程"),
                  confirmed: t(lang, "Confirmed", "已确认"),
                  errorPrefix: t(lang, "Error", "错误"),
                }}
              />
            )}
          </div>
          {todaySessionsVisible.length === 0 ? (
            <div style={{ color: "#666", marginTop: 8 }}>{t(lang, "No courses today.", "今天没有课程。")}</div>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {todaySessionsVisible.map((s) => {
                const students = sessionStudentNames(s);
                return (
                <div key={s.id} style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 8, background: "#fff" }}>
                  <div>
                    {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={s.class.capacity} compact />
                    <span>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                      {s.class.level ? ` / ${s.class.level.name}` : ""}
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </div>
                  <div style={{ color: "#0f766e", fontSize: 12 }}>
                    {t(lang, "Students", "学生")}: {students.length > 0 ? students.join(", ") : "-"}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, padding: 12, background: "#eff6ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Tomorrow's Courses", "明日课程")} ({tomorrowSessionsVisible.length})</h3>
            {tomorrowConfirmed ? (
                <span style={{ color: "#166534", fontWeight: 700 }}>
                {t(lang, "Confirmed", "已确认")}: {formatBusinessTimeOnly(new Date((tomorrowConfirmed as any).createdAt))}
              </span>
            ) : (
              <TeacherConfirmCoursesButton
                dayKind="tomorrow"
                date={toDateInputValue(tomorrowStart)}
                initialConfirmedAt={(tomorrowConfirmed as any)?.createdAt ? (tomorrowConfirmed as any).createdAt.toISOString() : null}
                labels={{
                  confirm: t(lang, "Confirm Tomorrow's Courses", "确认明日课程"),
                  confirmed: t(lang, "Confirmed", "已确认"),
                  errorPrefix: t(lang, "Error", "错误"),
                }}
              />
            )}
          </div>
          {tomorrowSessionsVisible.length === 0 ? (
            <div style={{ color: "#666", marginTop: 8 }}>{t(lang, "No courses tomorrow.", "明天没有课程。")}</div>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {tomorrowSessionsVisible.map((s) => {
                const students = sessionStudentNames(s);
                return (
                <div key={s.id} style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 8, background: "#fff" }}>
                  <div>
                    {formatBusinessDateTime(new Date(s.startAt))} - {formatBusinessTimeOnly(new Date(s.endAt))}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={s.class.capacity} compact />
                    <span>
                      {s.class.course.name}
                      {s.class.subject ? ` / ${s.class.subject.name}` : ""}
                      {s.class.level ? ` / ${s.class.level.name}` : ""}
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {s.class.campus.name}
                    {s.class.room ? ` / ${s.class.room.name}` : ""}
                  </div>
                  <div style={{ color: "#0f766e", fontSize: 12 }}>
                    {t(lang, "Students", "学生")}: {students.length > 0 ? students.join(", ") : "-"}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <section style={cardStyle("#f8fafc", "#e2e8f0")}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{t(lang, "Teacher profile", "老师资料")}</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ color: "#334155", whiteSpace: "pre-wrap" }}>
            {teacher.intro || t(lang, "No intro yet. You can update it in My Teacher Card.", "暂无介绍，可在我的老师名片中自行完善。")}
          </div>
          <a href="/teacher/card" style={{ fontSize: 12 }}>
            {t(lang, "Edit Intro", "编辑介绍")}
          </a>
        </div>
      </section>
    </div>
  );
}

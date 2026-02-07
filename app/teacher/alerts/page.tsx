import { getCurrentUser, requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  ALERT_TYPE_FEEDBACK,
  ALERT_TYPE_STUDENT,
  ALERT_TYPE_TEACHER,
  getTeacherVisibleSignInAlerts,
  syncSignInAlerts,
} from "@/lib/signin-alerts";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString()}`;
}

function classLabel(cls: any) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function decode(v: string | undefined) {
  return v ? decodeURIComponent(v) : "";
}

function badgeStyle(kind: "danger" | "warn" | "ok" | "muted") {
  if (kind === "danger") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      background: "#fff1f2",
      color: "#9f1239",
      border: "1px solid #fecdd3",
      fontSize: 12,
      fontWeight: 700,
    } as const;
  }
  if (kind === "warn") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      background: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fde68a",
      fontSize: 12,
      fontWeight: 700,
    } as const;
  }
  if (kind === "ok") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      background: "#f0fdf4",
      color: "#166534",
      border: "1px solid #bbf7d0",
      fontSize: 12,
      fontWeight: 700,
    } as const;
  }
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #e2e8f0",
    fontSize: 12,
  } as const;
}

async function quickMarkMissingStudents(
  status: "ABSENT" | "EXCUSED",
  sessionId: string,
  studentIdsCsv: string,
  showResolved: string | undefined
) {
  "use server";
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    redirect("/teacher/alerts?err=Teacher+profile+not+linked");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });
  if (!session) {
    redirect("/teacher/alerts?err=Session+not+found");
  }

  const allowed = session.teacherId === teacher.id || (!session.teacherId && session.class.teacherId === teacher.id);
  if (!allowed) {
    redirect("/teacher/alerts?err=No+permission");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { classId: session.classId },
    select: { studentId: true },
  });
  const expectedSet = new Set(
    session.class.capacity === 1 && session.studentId ? [session.studentId] : enrollments.map((e) => e.studentId)
  );

  const targetIds = studentIdsCsv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && expectedSet.has(s));

  const base = showResolved === "1" ? "/teacher/alerts?showResolved=1" : "/teacher/alerts";
  if (targetIds.length === 0) {
    redirect(`${base}${base.includes("?") ? "&" : "?"}err=No+target+students`);
  }

  const autoNote = `[Quick mark from alerts @ ${new Date().toLocaleString()}]`;
  await prisma.$transaction(
    targetIds.map((studentId) =>
      prisma.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        update: { status: status as AttendanceStatus, note: autoNote },
        create: {
          sessionId,
          studentId,
          status: status as AttendanceStatus,
          note: autoNote,
          deductedCount: 0,
          deductedMinutes: 0,
        },
      })
    )
  );

  redirect(`${base}${base.includes("?") ? "&" : "?"}msg=Updated`);
}

export default async function TeacherAlertsPage({
  searchParams,
}: {
  searchParams?: { showResolved?: string; msg?: string; err?: string };
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  const user = await getCurrentUser();
  if (!teacher || !user) {
    return <div style={{ color: "#999" }}>{t(lang, "Teacher profile is not linked.", "老师资料未绑定。")}</div>;
  }

  const showResolved = searchParams?.showResolved === "1";
  const msg = decode(searchParams?.msg);
  const err = decode(searchParams?.err);

  await syncSignInAlerts();
  const alerts = await getTeacherVisibleSignInAlerts(user.id, { limit: 500, keepResolvedHours: 72 });

  const studentIds = Array.from(new Set(alerts.map((a) => a.studentId).filter(Boolean))) as string[];
  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true } })
    : [];
  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  const grouped = new Map<string, { session: any; items: (typeof alerts)[number][] }>();
  for (const a of alerts) {
    const g = grouped.get(a.sessionId) ?? { session: a.session, items: [] };
    g.items.push(a);
    grouped.set(a.sessionId, g);
  }

  const rows = Array.from(grouped.values()).map((g) => {
    const pending = g.items.filter((x) => !x.resolvedAt);
    const resolved = g.items.filter((x) => !!x.resolvedAt);
    const sourceItems = pending.length > 0 ? pending : resolved;

    const missingStudentIds = Array.from(
      new Set(
        sourceItems
          .filter((x) => x.alertType === ALERT_TYPE_STUDENT)
          .map((x) => x.studentId)
          .filter(Boolean)
      )
    ) as string[];

    const missingStudentNames = missingStudentIds.map((sid) => studentMap.get(sid) ?? sid);
    const hasTeacherAlert = sourceItems.some((x) => x.alertType === ALERT_TYPE_TEACHER);
    const hasFeedbackAlert = sourceItems.some((x) => x.alertType === ALERT_TYPE_FEEDBACK);

    const resolvedAt =
      resolved.length > 0
        ? new Date(Math.max(...resolved.map((x) => new Date(x.resolvedAt as Date).getTime())))
        : null;

    const severity = hasFeedbackAlert || hasTeacherAlert ? 2 : missingStudentIds.length > 0 ? 1 : 0;

    return {
      sessionId: g.session.id,
      session: g.session,
      pendingCount: pending.length,
      isPending: pending.length > 0,
      resolvedAt,
      missingStudentIds,
      missingStudentNames,
      hasTeacherAlert,
      hasFeedbackAlert,
      severity,
    };
  });

  const pendingRows = rows.filter((r) => r.isPending).sort((a, b) => b.severity - a.severity || +new Date(a.session.startAt) - +new Date(b.session.startAt));
  const resolvedRows = rows
    .filter((r) => !r.isPending)
    .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0));

  const visibleRows = showResolved ? rows : pendingRows;

  const pendingTeacher = pendingRows.filter((r) => r.hasTeacherAlert).length;
  const pendingFeedback = pendingRows.filter((r) => r.hasFeedbackAlert).length;
  const pendingStudent = pendingRows.reduce((sum, r) => sum + r.missingStudentIds.length, 0);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{t(lang, "Sign-in Alerts", "签到告警")}</h2>
        <a
          href={showResolved ? "/teacher/alerts" : "/teacher/alerts?showResolved=1"}
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
          }}
        >
          {showResolved ? t(lang, "Show pending only", "只看待处理") : t(lang, "Show resolved too", "显示已处理")}
        </a>
      </div>

      <div style={{ color: "#64748b", fontSize: 12 }}>
        {t(lang, "Optimized flow: process by session card, one click to open session or quick mark students.", "流程优化：按课次卡片处理，一键打开课次或快速标记学生状态。")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", padding: 10 }}>
          <div style={{ fontSize: 12, color: "#9f1239" }}>{t(lang, "Pending Sessions", "待处理课次")}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{pendingRows.length}</div>
        </div>
        <div style={{ border: "1px solid #fde68a", borderRadius: 10, background: "#fffbeb", padding: 10 }}>
          <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Teacher Not Signed", "老师未签到")}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{pendingTeacher}</div>
        </div>
        <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#eff6ff", padding: 10 }}>
          <div style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Students Not Signed", "学生未签到")}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{pendingStudent}</div>
        </div>
        <div style={{ border: "1px solid #ddd6fe", borderRadius: 10, background: "#f5f3ff", padding: 10 }}>
          <div style={{ fontSize: 12, color: "#6d28d9" }}>{t(lang, "Feedback Overdue", "反馈超时")}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{pendingFeedback}</div>
        </div>
      </div>

      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087" }}>{msg}</div> : null}

      {visibleRows.length === 0 ? (
        <div style={{ color: "#999" }}>
          {showResolved
            ? t(lang, "No alerts in the selected range.", "当前范围内没有告警。")
            : t(lang, "No pending alerts.", "暂无待处理告警。")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {(showResolved ? visibleRows : pendingRows).map((r) => {
            const sessionUrl = `/teacher/sessions/${r.sessionId}`;
            const primaryLabel = r.hasFeedbackAlert
              ? t(lang, "Fill Feedback", "去补反馈")
              : t(lang, "Open Session", "打开课次");
            const studentPreview =
              r.missingStudentNames.length > 3
                ? `${r.missingStudentNames.slice(0, 3).join(", ")} +${r.missingStudentNames.length - 3}`
                : r.missingStudentNames.join(", ");

            return (
              <div
                key={r.sessionId}
                style={{
                  border: `1px solid ${r.isPending ? "#fecaca" : "#bbf7d0"}`,
                  borderLeft: `6px solid ${r.isPending ? (r.severity >= 2 ? "#dc2626" : "#f59e0b") : "#22c55e"}`,
                  borderRadius: 12,
                  background: r.isPending ? "#fff" : "#f8fff9",
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{fmtRange(r.session.startAt, r.session.endAt)}</div>
                  <span style={badgeStyle(r.isPending ? "danger" : "ok")}>
                    {r.isPending
                      ? `${t(lang, "Pending", "待处理")} (${r.pendingCount})`
                      : `${t(lang, "Processed", "已处理")} ${r.resolvedAt ? `@ ${r.resolvedAt.toLocaleString()}` : ""}`}
                  </span>
                </div>

                <div style={{ color: "#0f172a", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><ClassTypeBadge capacity={r.session.class.capacity} compact /><span>{classLabel(r.session.class)}</span></div>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  {r.session.class.campus.name}
                  {r.session.class.room ? ` / ${r.session.class.room.name}` : ""}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {r.hasTeacherAlert ? <span style={badgeStyle(r.isPending ? "danger" : "muted")}>{t(lang, "Teacher not signed", "老师未签到")}</span> : null}
                  {r.missingStudentIds.length > 0 ? (
                    <span style={badgeStyle(r.isPending ? "warn" : "muted")}>
                      {t(lang, "Student not signed", "学生未签到")} ({r.missingStudentIds.length})
                    </span>
                  ) : null}
                  {r.hasFeedbackAlert ? <span style={badgeStyle(r.isPending ? "warn" : "muted")}>{t(lang, "Feedback overdue (12h)", "课后反馈超时(12小时)")}</span> : null}
                </div>

                {r.missingStudentIds.length > 0 ? (
                  <div style={{ color: "#334155", fontSize: 13 }}>
                    <b>{t(lang, "Students", "学生")}: </b>
                    {studentPreview}
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <a
                    href={sessionUrl}
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {primaryLabel}
                  </a>

                  {r.isPending && r.missingStudentIds.length > 0 ? (
                    <>
                      <form
                        action={quickMarkMissingStudents.bind(
                          null,
                          "ABSENT",
                          r.sessionId,
                          r.missingStudentIds.join(","),
                          showResolved ? "1" : undefined
                        )}
                      >
                        <button type="submit" style={{ padding: "6px 10px" }}>{t(lang, "Mark Absent", "一键标缺勤")}</button>
                      </form>
                      <form
                        action={quickMarkMissingStudents.bind(
                          null,
                          "EXCUSED",
                          r.sessionId,
                          r.missingStudentIds.join(","),
                          showResolved ? "1" : undefined
                        )}
                      >
                        <button type="submit" style={{ padding: "6px 10px" }}>{t(lang, "Mark Excused", "一键标请假")}</button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showResolved && resolvedRows.length > 0 ? (
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {t(lang, "Resolved in last 72 hours", "最近72小时已处理")}: {resolvedRows.length}
        </div>
      ) : null}
    </div>
  );
}




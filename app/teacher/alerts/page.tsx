import { getCurrentUser, requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  ALERT_TYPE_FEEDBACK,
  ALERT_TYPE_STUDENT,
  ALERT_TYPE_TEACHER,
  getTeacherVisibleSignInAlerts,
  syncSignInAlerts,
} from "@/lib/signin-alerts";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import TeacherAlertsQuickMarkClient from "./TeacherAlertsQuickMarkClient";

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString()}`;
}

function classLabel(cls: any) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function sessionStudentNames(session: any) {
  if (session.class?.capacity === 1) {
    const one = session.student?.name ?? session.class?.oneOnOneStudent?.name ?? session.class?.enrollments?.[0]?.student?.name ?? null;
    return one ? [one] : [];
  }
  return (session.class?.enrollments ?? []).map((e: any) => e.student?.name).filter(Boolean);
}

function sessionStudentNameMap(session: any) {
  const m = new Map<string, string>();
  if (session?.student?.id && session?.student?.name) m.set(session.student.id, session.student.name);
  if (session?.class?.oneOnOneStudent?.id && session?.class?.oneOnOneStudent?.name) {
    m.set(session.class.oneOnOneStudent.id, session.class.oneOnOneStudent.name);
  }
  for (const e of session?.class?.enrollments ?? []) {
    if (e?.student?.id && e?.student?.name) m.set(e.student.id, e.student.name);
  }
  return m;
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

// Quick mark is handled via client fetch to avoid page jump/flash.

export default async function TeacherAlertsPage({
  searchParams,
}: {
  searchParams?: Promise<{ showResolved?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  const user = await getCurrentUser();
  if (!teacher || !user) {
    return <div style={{ color: "#999" }}>{t(lang, "Teacher profile is not linked.", "老师资料未绑定。")}</div>;
  }

  const sp = await searchParams;
  const showResolved = sp?.showResolved === "1";
  const msg = decode(sp?.msg);
  const err = decode(sp?.err);

  let syncDegraded = false;
  let syncDegradedText = "";
  try {
    await syncSignInAlerts();
  } catch (e: any) {
    syncDegraded = true;
    syncDegradedText = String(e?.code ?? e?.name ?? "SYNC_FAILED");
  }

  const alerts = await getTeacherVisibleSignInAlerts(user.id, { limit: 500, keepResolvedHours: 72 });

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

    const sessionStudentMap = sessionStudentNameMap(g.session);
    const missingStudentNames = missingStudentIds.map((sid) => sessionStudentMap.get(sid) ?? sid);
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

      <div
        style={{
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          borderRadius: 10,
          padding: "8px 10px",
          color: "#1e3a8a",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {t(
          lang,
          "Tip: Teacher not signed = teacher has not handled this session yet. Student not signed = one or more students are still UNMARKED. Open session and complete attendance (PRESENT/ABSENT/LATE/EXCUSED) or submit feedback.",
          "说明：老师未签到 = 该课次老师还未处理；学生未签到 = 还有学生是未点名（UNMARKED）。请打开课次，完成点名（出勤/缺勤/迟到/请假）或提交反馈。"
        )}
      </div>

      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087" }}>{msg}</div> : null}
      {syncDegraded ? (
        <div
          style={{
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            color: "#92400e",
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 13,
          }}
        >
          {t(
            lang,
            "Alert sync is temporarily unavailable. Showing existing records in read-only mode; please refresh later.",
            "告警同步暂时不可用，当前以只读模式显示已有记录，请稍后刷新重试。"
          )}
          {syncDegradedText ? ` (${syncDegradedText})` : ""}
        </div>
      ) : null}

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
            const allStudentNames = sessionStudentNames(r.session);
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
                <div style={{ color: "#0f766e", fontSize: 13 }}>
                  <b>{t(lang, "Students", "学生")}: </b>
                  {allStudentNames.length > 0 ? allStudentNames.join(", ") : "-"}
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
                      <TeacherAlertsQuickMarkClient
                        sessionId={r.sessionId}
                        studentIds={r.missingStudentIds}
                        labels={{
                          absent: t(lang, "Mark Absent", "一键标缺勤"),
                          excused: t(lang, "Mark Excused", "一键标请假"),
                          errorPrefix: t(lang, "Error", "错误"),
                          saved: t(lang, "Saved", "已保存"),
                        }}
                      />
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




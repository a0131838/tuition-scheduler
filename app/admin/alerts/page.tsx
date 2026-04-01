import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import NoticeBanner from "../_components/NoticeBanner";
import AlertsThresholdClient from "./AlertsThresholdClient";
import {
  ALERT_TYPE_FEEDBACK,
  ALERT_TYPE_STUDENT,
  ALERT_TYPE_TEACHER,
  getAdminOpenSignInAlerts,
  getSignInAlertThresholdMin,
  syncSignInAlerts,
} from "@/lib/signin-alerts";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";

function fmtRange(startAt: Date, endAt: Date) {
  return `${formatBusinessDateTime(new Date(startAt))} - ${formatBusinessTimeOnly(new Date(endAt))}`;
}

function calcSignInOverdueMin(startAt: Date, thresholdMin: number) {
  const ms = Date.now() - new Date(startAt).getTime() - thresholdMin * 60 * 1000;
  return Math.max(0, Math.floor(ms / 60000));
}

function calcFeedbackOverdueMin(endAt: Date) {
  const feedbackDueAt = new Date(new Date(endAt).getTime() + 12 * 60 * 60 * 1000);
  const ms = Date.now() - feedbackDueAt.getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function severityFromOverdue(overdueMin: number) {
  if (overdueMin >= 120) return "critical";
  if (overdueMin >= 60) return "high";
  return "normal";
}

function severityChip(lang: Lang, overdueMin: number) {
  const sev = severityFromOverdue(overdueMin);
  if (sev === "critical") {
    return (
      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #ef4444", background: "#fee2e2", color: "#991b1b", fontSize: 12, fontWeight: 700 }}>
        {t(lang, "Critical", "严重")}
      </span>
    );
  }
  if (sev === "high") {
    return (
      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #f59e0b", background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700 }}>
        {t(lang, "High", "高")}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #93c5fd", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>
      {t(lang, "Normal", "普通")}
    </span>
  );
}

function issueBadge(lang: Lang, kind: "teacher" | "student" | "feedback", count?: number) {
  if (kind === "teacher") {
    return (
      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", fontSize: 12, fontWeight: 700 }}>
        {t(lang, "Teacher not signed", "老师未签到")}
      </span>
    );
  }
  if (kind === "student") {
    return (
      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 12, fontWeight: 700 }}>
        {t(lang, "Student not signed", "学生未签到")}
        {count ? ` (${count})` : ""}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#6d28d9", fontSize: 12, fontWeight: 700 }}>
      {t(lang, "Feedback overdue", "反馈超时")}
    </span>
  );
}

function focusButtonStyle(active: boolean) {
  return {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1d4ed8" : "#0f172a",
    fontWeight: active ? 700 : 500,
    textDecoration: "none",
  } as const;
}

function classLabel(cls: {
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

type AlertFocus = "all" | "urgent" | "attendance" | "feedback";

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; focus?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const focus = (sp?.focus ?? "all") as AlertFocus;

  const [{ thresholdMin }, threshold] = await Promise.all([
    syncSignInAlerts(),
    getSignInAlertThresholdMin(),
  ]);

  const alerts = await getAdminOpenSignInAlerts(300);

  const grouped = new Map<string, { session: (typeof alerts)[number]["session"]; items: (typeof alerts)[number][] }>();
  for (const alert of alerts) {
    const current = grouped.get(alert.sessionId) ?? { session: alert.session, items: [] };
    current.items.push(alert);
    grouped.set(alert.sessionId, current);
  }

  const rows = Array.from(grouped.values())
    .filter((group) => !isSessionFullyCancelled(group.session))
    .map((group) => {
      const session = group.session;
      const items = group.items;
      const missingStudentIds = Array.from(
        new Set(
          items
            .filter((item) => item.alertType === ALERT_TYPE_STUDENT)
            .map((item) => item.studentId)
            .filter(Boolean)
        )
      ) as string[];
      const visibleStudentNames = getVisibleSessionStudentNames(session);
      const missingStudentNames = missingStudentIds.map((id) => {
        const match =
          session.student?.id === id
            ? session.student.name
            : session.class.oneOnOneStudent?.id === id
            ? session.class.oneOnOneStudent.name
            : session.class.enrollments.find((enrollment) => enrollment.student?.id === id)?.student?.name;
        return match ?? id;
      });
      const hasTeacherAlert = items.some((item) => item.alertType === ALERT_TYPE_TEACHER);
      const hasFeedbackAlert = items.some((item) => item.alertType === ALERT_TYPE_FEEDBACK);
      const highestOverdueMin = Math.max(
        ...items.map((item) =>
          item.alertType === ALERT_TYPE_FEEDBACK
            ? calcFeedbackOverdueMin(item.session.endAt)
            : calcSignInOverdueMin(item.session.startAt, item.thresholdMin)
        )
      );
      const severity = severityFromOverdue(highestOverdueMin);
      const needsAttendance = hasTeacherAlert || missingStudentIds.length > 0;
      const primaryHref = needsAttendance ? `/admin/sessions/${group.session.id}/attendance` : "/admin/feedbacks";
      const primaryLabel = needsAttendance
        ? t(lang, "Open Attendance", "去点名")
        : t(lang, "Open Feedback Desk", "去反馈处理");
      const secondaryHref = needsAttendance && hasFeedbackAlert ? "/admin/feedbacks" : null;
      const nextStep = hasFeedbackAlert && needsAttendance
        ? t(lang, "Fix attendance first, then confirm feedback submission.", "先补点名，再确认课后反馈。")
        : hasFeedbackAlert
        ? t(lang, "Check the teacher feedback desk for this session.", "去反馈工作台核对这节课的反馈。")
        : hasTeacherAlert
        ? t(lang, "Open attendance and confirm the teacher sign-in state.", "打开点名页，先确认老师签到状态。")
        : t(lang, "Open attendance and finish the remaining student marks.", "打开点名页，完成剩余学生点名。");

      return {
        sessionId: group.session.id,
        session,
        issueCount: items.length,
        hasTeacherAlert,
        hasFeedbackAlert,
        missingStudentIds,
        missingStudentNames,
        visibleStudentNames,
        highestOverdueMin,
        severity,
        primaryHref,
        primaryLabel,
        secondaryHref,
        nextStep,
      };
    })
    .sort((a, b) => b.highestOverdueMin - a.highestOverdueMin || +new Date(a.session.startAt) - +new Date(b.session.startAt));

  const filteredRows = rows.filter((row) => {
    if (focus === "urgent") return row.severity !== "normal";
    if (focus === "attendance") return row.hasTeacherAlert || row.missingStudentIds.length > 0;
    if (focus === "feedback") return row.hasFeedbackAlert;
    return true;
  });

  const urgentRows = filteredRows.filter((row) => row.severity !== "normal");
  const normalRows = filteredRows.filter((row) => row.severity === "normal");
  const activeCount = filteredRows.reduce((sum, row) => sum + row.issueCount, 0);
  const teacherMissCount = filteredRows.filter((row) => row.hasTeacherAlert).length;
  const studentMissCount = filteredRows.reduce((sum, row) => sum + row.missingStudentIds.length, 0);
  const feedbackMissCount = filteredRows.filter((row) => row.hasFeedbackAlert).length;
  const criticalCount = filteredRows.filter((row) => row.severity === "critical").length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ marginBottom: 0 }}>{t(lang, "Sign-in Alerts", "签到告警")}</h2>
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {t(lang, "One card = one session, with all related issues combined.", "一张卡片 = 一节课，相关问题会合并显示。")}
        </div>
      </div>

      <div style={{ border: "2px solid #ef4444", background: "#fef2f2", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 800 }}>
          {t(lang, "Urgent board: unresolved sign-in and feedback issues", "紧急看板：未处理签到与反馈问题")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 8 }}>
            <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff", padding: 8 }}>
              <div style={{ fontSize: 12, color: "#991b1b" }}>{t(lang, "Alert rows", "告警条目")}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>{activeCount}</div>
            </div>
          <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#991b1b" }}>{t(lang, "Affected sessions", "受影响课次")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>{filteredRows.length}</div>
          </div>
          <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#991b1b" }}>{t(lang, "Critical", "严重")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>{criticalCount}</div>
          </div>
          <div style={{ border: "1px solid #fde68a", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Teacher not signed", "老师未签到")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>{teacherMissCount}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Students not signed", "学生未签到")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{studentMissCount}</div>
          </div>
          <div style={{ border: "1px solid #ddd6fe", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#6d28d9" }}>{t(lang, "Feedback overdue", "反馈超时")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#6d28d9" }}>{feedbackMissCount}</div>
          </div>
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
          lineHeight: 1.6,
        }}
      >
        {t(
          lang,
          "How to read: teacher not signed = the teacher has not touched attendance yet; student not signed = one or more students still remain UNMARKED; feedback overdue = 12 hours have passed after class end and teacher feedback is still missing.",
          "阅读方式：老师未签到 = 老师还没有处理点名；学生未签到 = 还有学生是未点名（UNMARKED）；反馈超时 = 课后超过 12 小时仍未提交反馈。"
        )}
      </div>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>{t(lang, "Quick focus", "快速聚焦")}</span>
        <a href="/admin/alerts" style={focusButtonStyle(focus === "all")}>
          {t(lang, "All open sessions", "全部待处理课次")}
        </a>
        <a href="/admin/alerts?focus=urgent" style={focusButtonStyle(focus === "urgent")}>
          {t(lang, "Urgent first", "先看紧急")}
        </a>
        <a href="/admin/alerts?focus=attendance" style={focusButtonStyle(focus === "attendance")}>
          {t(lang, "Attendance only", "只看点名")}
        </a>
        <a href="/admin/alerts?focus=feedback" style={focusButtonStyle(focus === "feedback")}>
          {t(lang, "Feedback only", "只看反馈")}
        </a>
      </div>

      <details style={{ border: "1px solid #fca5a5", borderRadius: 10, padding: 12, background: "#fffafa" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Alert settings", "告警设置")}
        </summary>
        <div style={{ marginTop: 12 }}>
          <AlertsThresholdClient
            initialThreshold={threshold}
            currentThresholdMin={thresholdMin}
            labels={{
              label: t(lang, "Alert Threshold (minutes)", "告警阈值(分钟)"),
              save: t(lang, "Save", "保存"),
              saved: t(lang, "Saved", "已保存"),
              current: t(lang, "Current threshold", "当前阈值"),
              errorPrefix: t(lang, "Error", "错误"),
            }}
          />
        </div>
      </details>

      {filteredRows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No active alerts in this focus.", "当前聚焦范围内没有活动告警。")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {urgentRows.length > 0 ? (
            <section style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800, color: "#991b1b" }}>
                {t(lang, "Immediate queue", "立即处理队列")} ({urgentRows.length})
              </div>
              {urgentRows.map((row) => {
                const studentPreview =
                  row.missingStudentNames.length > 3
                    ? `${row.missingStudentNames.slice(0, 3).join(", ")} +${row.missingStudentNames.length - 3}`
                    : row.missingStudentNames.join(", ");
                return (
                  <div
                    key={row.sessionId}
                    style={{
                      border: "1px solid #fecaca",
                      borderLeft: `6px solid ${row.severity === "critical" ? "#dc2626" : "#f59e0b"}`,
                      borderRadius: 12,
                      background: "#fff",
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{fmtRange(row.session.startAt, row.session.endAt)}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {severityChip(lang, row.highestOverdueMin)}
                        <span style={{ fontSize: 12, color: row.severity === "critical" ? "#b91c1c" : "#92400e", fontWeight: 700 }}>
                          {row.highestOverdueMin} {t(lang, "min overdue", "分钟超时")}
                        </span>
                      </div>
                    </div>

                    <div style={{ color: "#0f172a", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={row.session.class.capacity} compact />
                      <span>{classLabel(row.session.class)}</span>
                    </div>
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      {row.session.class.teacher.name} · {row.session.class.campus.name}
                      {row.session.class.room ? ` / ${row.session.class.room.name}` : ""}
                    </div>
                    <div style={{ color: "#0f766e", fontSize: 13 }}>
                      <b>{t(lang, "Students", "学生")}: </b>
                      {row.visibleStudentNames.length > 0 ? row.visibleStudentNames.join(", ") : "-"}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {row.hasTeacherAlert ? issueBadge(lang, "teacher") : null}
                      {row.missingStudentIds.length > 0 ? issueBadge(lang, "student", row.missingStudentIds.length) : null}
                      {row.hasFeedbackAlert ? issueBadge(lang, "feedback") : null}
                    </div>

                    {row.missingStudentIds.length > 0 ? (
                      <div style={{ color: "#334155", fontSize: 13 }}>
                        <b>{t(lang, "Students still unmarked", "仍未点名学生")}: </b>
                        {studentPreview}
                      </div>
                    ) : null}

                    <div
                      style={{
                        border: "1px solid #fde68a",
                        background: "#fffbeb",
                        borderRadius: 10,
                        padding: "8px 10px",
                        color: "#92400e",
                        fontSize: 13,
                      }}
                    >
                      <b>{t(lang, "Next step", "下一步")}: </b>
                      {row.nextStep}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <a
                        href={row.primaryHref}
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {row.primaryLabel}
                      </a>
                      {row.secondaryHref ? (
                        <a
                          href={row.secondaryHref}
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                          }}
                        >
                          {t(lang, "Open Feedback Desk", "去反馈处理")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          {normalRows.length > 0 ? (
            <section style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800, color: "#1d4ed8" }}>
                {t(lang, "Other open sessions", "其他待处理课次")} ({normalRows.length})
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {normalRows.map((row) => (
                  <div
                    key={row.sessionId}
                    style={{
                      border: "1px solid #dbeafe",
                      borderLeft: "6px solid #60a5fa",
                      borderRadius: 12,
                      background: "#fff",
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{fmtRange(row.session.startAt, row.session.endAt)}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {severityChip(lang, row.highestOverdueMin)}
                        <span style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 700 }}>
                          {row.highestOverdueMin} {t(lang, "min overdue", "分钟超时")}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: "#0f172a", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={row.session.class.capacity} compact />
                      <span>{classLabel(row.session.class)}</span>
                    </div>
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      {row.session.class.teacher.name} · {row.session.class.campus.name}
                      {row.session.class.room ? ` / ${row.session.class.room.name}` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {row.hasTeacherAlert ? issueBadge(lang, "teacher") : null}
                      {row.missingStudentIds.length > 0 ? issueBadge(lang, "student", row.missingStudentIds.length) : null}
                      {row.hasFeedbackAlert ? issueBadge(lang, "feedback") : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <a
                        href={row.primaryHref}
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {row.primaryLabel}
                      </a>
                      {row.secondaryHref ? (
                        <a
                          href={row.secondaryHref}
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                          }}
                        >
                          {t(lang, "Open Feedback Desk", "去反馈处理")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

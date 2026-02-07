import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import NoticeBanner from "../_components/NoticeBanner";
import {
  ALERT_TYPE_FEEDBACK,
  ALERT_TYPE_STUDENT,
  ALERT_TYPE_TEACHER,
  getAdminOpenSignInAlerts,
  getSignInAlertThresholdMin,
  setSignInAlertThresholdMin,
  syncSignInAlerts,
} from "@/lib/signin-alerts";
import { prisma } from "@/lib/prisma";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString()}`;
}

function calcOverdueMin(startAt: Date, thresholdMin: number) {
  const ms = Date.now() - new Date(startAt).getTime() - thresholdMin * 60 * 1000;
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

async function updateThreshold(formData: FormData) {
  "use server";
  await requireAdmin();
  const min = Number(String(formData.get("thresholdMin") ?? "10"));
  await setSignInAlertThresholdMin(Number.isFinite(min) ? Math.max(1, Math.floor(min)) : 10);
  redirect("/admin/alerts?msg=Threshold+updated");
}

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams?: { msg?: string; err?: string };
}) {
  await requireAdmin();
  const lang = await getLang();
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const [{ thresholdMin, activeCount }, threshold] = await Promise.all([
    syncSignInAlerts(),
    getSignInAlertThresholdMin(),
  ]);

  const alerts = await getAdminOpenSignInAlerts(300);
  const teacherMissCount = alerts.filter((a) => a.alertType === ALERT_TYPE_TEACHER).length;
  const studentMissCount = alerts.filter((a) => a.alertType === ALERT_TYPE_STUDENT).length;
  const feedbackMissCount = alerts.filter((a) => a.alertType === ALERT_TYPE_FEEDBACK).length;
  const criticalCount = alerts.filter((a) => calcOverdueMin(a.session.startAt, a.thresholdMin) >= 120).length;
  const studentIds = Array.from(new Set(alerts.map((a) => a.studentId).filter(Boolean))) as string[];
  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true } })
    : [];
  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2 style={{ marginBottom: 0 }}>{t(lang, "Sign-in Alerts", "签到告警")}</h2>
      <div style={{ border: "2px solid #ef4444", background: "#fef2f2", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 800 }}>
          {t(lang, "Urgent board: unresolved sign-in/feedback issues", "紧急看板：未处理签到/反馈问题")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 8 }}>
          <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#991b1b" }}>{t(lang, "Active alerts", "活动告警")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>{activeCount}</div>
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
            <div style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Student not signed", "学生未签到")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{studentMissCount}</div>
          </div>
          <div style={{ border: "1px solid #ddd6fe", borderRadius: 10, background: "#fff", padding: 8 }}>
            <div style={{ fontSize: 12, color: "#6d28d9" }}>{t(lang, "Feedback overdue", "反馈超时")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#6d28d9" }}>{feedbackMissCount}</div>
          </div>
        </div>
      </div>
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {t(
          lang,
          "Trigger rule: class starts + threshold minutes and teacher/student still not signed in.",
          "触发规则：开课后达到阈值分钟，老师/学生仍未签到。"
        )}
      </div>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ border: "1px solid #fca5a5", borderRadius: 10, padding: 12, background: "#fffafa" }}>
        <form action={updateThreshold} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>
            {t(lang, "Alert Threshold (minutes)", "告警阈值(分钟)")}:
            <input
              name="thresholdMin"
              type="number"
              min={1}
              defaultValue={String(threshold)}
              style={{ marginLeft: 6, width: 100 }}
            />
          </label>
          <button type="submit">{t(lang, "Save", "保存")}</button>
          <span style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Current threshold", "当前阈值")}: {thresholdMin} min
          </span>
        </form>
      </div>

      {alerts.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No active alerts.", "暂无活动告警。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#fff1f2" }}>
              <th align="left">{t(lang, "When", "时间")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Severity", "级别")}</th>
              <th align="left">{t(lang, "Overdue", "超时")}</th>
              <th align="left">{t(lang, "Class", "班级")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Location", "校区/教室")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => {
              const cls = a.session.class;
              const overdueMin = calcOverdueMin(a.session.startAt, a.thresholdMin);
              const sev = severityFromOverdue(overdueMin);
              return (
                <tr
                  key={a.id}
                  style={{
                    borderTop: "1px solid #eee",
                    background: sev === "critical" ? "#fff7f7" : sev === "high" ? "#fffdf5" : "#fff",
                  }}
                >
                  <td>{fmtRange(a.session.startAt, a.session.endAt)}</td>
                  <td>
                    {a.alertType === ALERT_TYPE_TEACHER
                      ? t(lang, "Teacher not signed", "老师未签到")
                      : a.alertType === ALERT_TYPE_STUDENT
                      ? t(lang, "Student not signed", "学生未签到")
                      : t(lang, "Feedback overdue (12h)", "课后反馈超时(12小时)")}
                  </td>
                  <td>{severityChip(lang, overdueMin)}</td>
                  <td>
                    <b style={{ color: sev === "critical" ? "#b91c1c" : sev === "high" ? "#b45309" : "#1d4ed8" }}>
                      {overdueMin} min
                    </b>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={cls.capacity} compact />
                      <span>
                        {cls.course.name}
                        {cls.subject ? ` / ${cls.subject.name}` : ""}
                        {cls.level ? ` / ${cls.level.name}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>
                    {a.alertType === ALERT_TYPE_STUDENT ? studentMap.get(a.studentId ?? "") ?? a.studentId ?? "-" : "-"}
                  </td>
                  <td>{cls.teacher.name}</td>
                  <td>
                    {cls.campus.name}
                    {cls.room ? ` / ${cls.room.name}` : ""}
                  </td>
                  <td>
                    {a.alertType === ALERT_TYPE_FEEDBACK ? (
                      <a href="/admin/feedbacks">{t(lang, "Open Feedback Desk", "去反馈处理")}</a>
                    ) : (
                      <a href={`/admin/sessions/${a.sessionId}/attendance`}>
                        {t(lang, "Open Attendance", "去点名")}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}




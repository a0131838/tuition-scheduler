import crypto from "crypto";
import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  FINAL_REPORT_DELIVERY_CHANNELS,
  FINAL_REPORT_SHARE_DURATION_DAYS,
  loadFinalReportCandidates,
  parseDeliveryChannel,
  parseFinalReportDraft,
  parseFinalReportMeta,
  parseShareDurationDays,
} from "@/lib/final-report";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string) {
  if (status === "FORWARDED") return t(lang, "Forwarded", "已转发");
  if (status === "SUBMITTED") return t(lang, "Submitted", "已提交");
  return t(lang, "Assigned", "待老师填写");
}

function recommendationLabel(lang: "BILINGUAL" | "ZH" | "EN", value: string) {
  switch (value) {
    case "CONTINUE_CURRENT":
      return t(lang, "Continue current course", "继续当前课程");
    case "MOVE_TO_NEXT_LEVEL":
      return t(lang, "Move to next level", "进入下一阶段");
    case "CHANGE_FOCUS":
      return t(lang, "Change subject or focus", "调整课程方向");
    case "PAUSE_AFTER_COMPLETION":
      return t(lang, "Pause after completion", "结课后暂缓继续");
    case "COURSE_COMPLETED":
      return t(lang, "Course completed", "课程已完成");
    default:
      return value || "-";
  }
}

function deliveryChannelLabel(lang: "BILINGUAL" | "ZH" | "EN", value: string) {
  switch (value) {
    case "WECHAT":
      return t(lang, "WeChat", "微信");
    case "EMAIL":
      return t(lang, "Email", "邮件");
    case "WHATSAPP":
      return t(lang, "WhatsApp", "WhatsApp");
    case "PRINTED":
      return t(lang, "Printed copy", "纸质版");
    case "OTHER":
      return t(lang, "Other", "其他");
    default:
      return "-";
  }
}

function normalizeView(raw: string) {
  const value = raw.trim().toLowerCase();
  if (value === "submitted") return value;
  if (value === "pending-delivery") return value;
  if (value === "delivered") return value;
  if (value === "shared") return value;
  if (value === "expired-shares") return value;
  return "all";
}

function shareDurationLabel(lang: "BILINGUAL" | "ZH" | "EN", days: number) {
  if (lang === "ZH") return `${days}天有效`;
  if (lang === "EN") return `${days}-day expiry`;
  return `${days}-day expiry / ${days}天有效`;
}

function isShareActive(report: {
  shareToken: string | null;
  shareEnabledAt: Date | null;
  shareExpiresAt: Date | null;
  shareRevokedAt: Date | null;
}) {
  if (!report.shareToken || !report.shareEnabledAt || report.shareRevokedAt) return false;
  if (!report.shareExpiresAt) return true;
  return report.shareExpiresAt.getTime() > Date.now();
}

function isShareExpired(report: {
  shareToken: string | null;
  shareEnabledAt: Date | null;
  shareExpiresAt: Date | null;
  shareRevokedAt: Date | null;
}) {
  if (!report.shareToken || !report.shareEnabledAt || report.shareRevokedAt || !report.shareExpiresAt) return false;
  return report.shareExpiresAt.getTime() <= Date.now();
}

function shareAuditSummary(
  report: {
    shareViewCount: number;
    shareFirstViewedAt: Date | null;
    shareLastViewedAt: Date | null;
  },
  lang: "BILINGUAL" | "ZH" | "EN"
) {
  if (!report.shareViewCount) {
    return t(lang, "Not opened yet", "尚未被打开");
  }
  const countLabel =
    lang === "ZH"
      ? `已打开 ${report.shareViewCount} 次`
      : lang === "EN"
        ? `Opened ${report.shareViewCount} times`
        : `Opened ${report.shareViewCount} times / 已打开 ${report.shareViewCount} 次`;
  const lastLabel = report.shareLastViewedAt
    ? `${t(lang, "Last viewed", "最近打开")}: ${formatBusinessDateTime(new Date(report.shareLastViewedAt))}`
    : "";
  return [countLabel, lastLabel].filter(Boolean).join(" · ");
}

async function resolveOriginFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

async function assignFinalReport(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  if (!packageId || !teacherId) redirect("/admin/reports/final?err=missing");

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
  });
  if (!pkg || pkg.type !== "HOURS") redirect("/admin/reports/final?err=pkg");

  const latestAttendance = await prisma.attendance.findFirst({
    where: { packageId, session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } },
    orderBy: { session: { startAt: "desc" } },
    include: { session: { include: { class: { select: { subjectId: true } } } } },
  });
  const subjectId = latestAttendance?.session.class.subjectId ?? null;

  const latestForTeacher = await prisma.finalReport.findFirst({
    where: { packageId, teacherId },
    orderBy: { createdAt: "desc" },
  });

  if (latestForTeacher?.status === "SUBMITTED" || latestForTeacher?.status === "FORWARDED") {
    redirect("/admin/reports/final?ok=exists");
  }

  if (latestForTeacher?.status === "ASSIGNED") {
    await prisma.finalReport.update({
      where: { id: latestForTeacher.id },
      data: {
        subjectId,
        assignedByUserId: user.id,
        assignedAt: new Date(),
        submittedAt: null,
        forwardedAt: null,
      },
    });
  } else {
    await prisma.finalReport.create({
      data: {
        status: "ASSIGNED",
        studentId: pkg.studentId,
        teacherId,
        courseId: pkg.courseId,
        subjectId,
        packageId: pkg.id,
        assignedByUserId: user.id,
        reportPeriodLabel: `${formatMinutesToHours(Math.max(0, Number(pkg.totalMinutes ?? 0)))}h package completed`,
      },
    });
  }

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  redirect("/admin/reports/final?ok=assigned");
}

async function markFinalReportForwarded(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) redirect("/admin/reports/final?err=missing");

  const row = await prisma.finalReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, reportJson: true },
  });
  if (!row || row.status !== "SUBMITTED") redirect("/admin/reports/final?err=status");

  const prev = row.reportJson && typeof row.reportJson === "object" ? (row.reportJson as Record<string, unknown>) : {};
  const prevMeta = prev._meta && typeof prev._meta === "object" ? (prev._meta as Record<string, unknown>) : {};

  await prisma.finalReport.update({
    where: { id: row.id },
    data: {
      status: "FORWARDED",
      forwardedAt: new Date(),
      reportJson: {
        ...prev,
        _meta: {
          ...prevMeta,
          forwardedByUserId: user.id,
          forwardedByName: user.name,
        },
      } as any,
    },
  });

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  redirect("/admin/reports/final?ok=forwarded");
}

async function markFinalReportDelivered(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const deliveryChannel = parseDeliveryChannel(formData.get("deliveryChannel"));
  const deliveryNote = String(formData.get("deliveryNote") ?? "").trim();
  if (!reportId) redirect("/admin/reports/final?err=missing");

  const row = await prisma.finalReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, reportJson: true, forwardedAt: true },
  });
  if (!row || (row.status !== "SUBMITTED" && row.status !== "FORWARDED")) {
    redirect("/admin/reports/final?err=status");
  }

  const prev = row.reportJson && typeof row.reportJson === "object" ? (row.reportJson as Record<string, unknown>) : {};
  const prevMeta = prev._meta && typeof prev._meta === "object" ? (prev._meta as Record<string, unknown>) : {};
  const now = new Date();
  const autoForward = row.status === "SUBMITTED";

  await prisma.finalReport.update({
    where: { id: row.id },
    data: {
      status: autoForward ? "FORWARDED" : row.status,
      forwardedAt: autoForward ? now : row.forwardedAt,
      deliveredAt: now,
      deliveredByUserId: user.id,
      deliveryChannel: deliveryChannel || null,
      reportJson: {
        ...prev,
        _meta: {
          ...prevMeta,
          forwardedByUserId: autoForward ? user.id : prevMeta.forwardedByUserId,
          forwardedByName: autoForward ? user.name : prevMeta.forwardedByName,
          deliveryNote,
        },
      } as any,
    },
  });

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  redirect("/admin/reports/final?ok=delivered");
}

async function enableFinalReportShare(formData: FormData) {
  "use server";
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const shareDurationDays = parseShareDurationDays(formData.get("shareDurationDays"));
  if (!reportId) redirect("/admin/reports/final?err=missing");

  const row = await prisma.finalReport.findUnique({
    where: { id: reportId },
    select: { status: true },
  });
  if (!row || row.status === "ASSIGNED") redirect("/admin/reports/final?err=status");

  const now = new Date();
  const shareExpiresAt = new Date(now.getTime() + shareDurationDays * 24 * 60 * 60 * 1000);

  await prisma.finalReport.update({
    where: { id: reportId },
    data: {
      shareToken: crypto.randomBytes(24).toString("hex"),
      shareEnabledAt: now,
      shareExpiresAt,
      shareRevokedAt: null,
    },
  });

  revalidatePath("/admin/reports/final");
  redirect("/admin/reports/final?ok=share-enabled");
}

async function disableFinalReportShare(formData: FormData) {
  "use server";
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) redirect("/admin/reports/final?err=missing");

  await prisma.finalReport.update({
    where: { id: reportId },
    data: {
      shareRevokedAt: new Date(),
    },
  });

  revalidatePath("/admin/reports/final");
  redirect("/admin/reports/final?ok=share-disabled");
}

export default async function AdminFinalReportCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const origin = await resolveOriginFromHeaders();
  const sp = await searchParams;
  const ok = String(sp.ok ?? "");
  const err = String(sp.err ?? "");
  const view = normalizeView(String(sp.view ?? ""));

  const [candidates, reports] = await Promise.all([
    loadFinalReportCandidates(),
    prisma.finalReport.findMany({
      include: {
        student: true,
        teacher: true,
        course: true,
        subject: true,
        package: true,
        deliveredByUser: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
      take: 300,
    }),
  ]);

  const filteredReports = reports.filter((report) => {
    const hasActiveShare = isShareActive(report);
    const hasExpiredShare = isShareExpired(report);
    if (view === "submitted") return report.status === "SUBMITTED";
    if (view === "pending-delivery") return !report.deliveredAt && (report.status === "SUBMITTED" || report.status === "FORWARDED");
    if (view === "delivered") return Boolean(report.deliveredAt);
    if (view === "shared") return hasActiveShare;
    if (view === "expired-shares") return hasExpiredShare;
    return true;
  });

  const stats = {
    total: reports.length,
    submitted: reports.filter((report) => report.status === "SUBMITTED").length,
    pendingDelivery: reports.filter((report) => !report.deliveredAt && (report.status === "SUBMITTED" || report.status === "FORWARDED")).length,
    delivered: reports.filter((report) => Boolean(report.deliveredAt)).length,
    shared: reports.filter((report) => isShareActive(report)).length,
    expiredShares: reports.filter((report) => isShareExpired(report)).length,
  };

  const filterLinks = [
    { key: "all", label: t(lang, "All reports", "全部报告"), count: stats.total },
    { key: "submitted", label: t(lang, "Submitted", "已提交"), count: stats.submitted },
    { key: "pending-delivery", label: t(lang, "Submitted not delivered", "已提交未交付"), count: stats.pendingDelivery },
    { key: "delivered", label: t(lang, "Delivered", "已交付"), count: stats.delivered },
    { key: "shared", label: t(lang, "Share links active", "分享链接生效中"), count: stats.shared },
    { key: "expired-shares", label: t(lang, "Expired links", "已过期链接"), count: stats.expiredShares },
  ] as const;

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>{t(lang, "Final Report Center", "结课报告中心")}</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        {t(
          lang,
          "Detect completed hour packages, assign one final report per package, and track teacher submission, parent delivery, and read-only share links in one desk.",
          "系统会识别已完成的课时包，教务可按课包推送结课报告，并在同一工作台里跟踪老师提交、家长交付和只读分享链接。"
        )}
      </div>

      {ok === "assigned" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Assigned successfully.", "已成功推送给老师。")}
        </div>
      ) : ok === "exists" ? (
        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "This teacher already submitted or forwarded this final report.", "该老师已提交或已完成转发，无需重复推送。")}
        </div>
      ) : ok === "forwarded" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Marked as forwarded to parent follow-up.", "已标记为已转发给家长跟进。")}
        </div>
      ) : ok === "delivered" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Delivery record saved.", "家长交付记录已保存。")}
        </div>
      ) : ok === "share-enabled" ? (
        <div style={{ background: "#eff6ff", border: "1px solid #60a5fa", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Share link is ready.", "只读分享链接已生成。")}
        </div>
      ) : ok === "share-disabled" ? (
        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Share link has been disabled.", "只读分享链接已停用。")}
        </div>
      ) : null}

      {err ? (
        <div style={{ background: "#fff1f2", border: "1px solid #fb7185", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Operation failed. Please retry.", "操作失败，请重试。")}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #dbeafe",
          background: "#f8fbff",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        <div><b>{t(lang, "Total reports", "全部报告")}</b><div style={{ fontSize: 24, fontWeight: 800 }}>{stats.total}</div></div>
        <div><b>{t(lang, "Submitted not delivered", "已提交未交付")}</b><div style={{ fontSize: 24, fontWeight: 800, color: "#b45309" }}>{stats.pendingDelivery}</div></div>
        <div><b>{t(lang, "Delivered", "已交付")}</b><div style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}>{stats.delivered}</div></div>
        <div><b>{t(lang, "Share links active", "分享链接生效中")}</b><div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{stats.shared}</div></div>
        <div><b>{t(lang, "Expired links", "已过期链接")}</b><div style={{ fontSize: 24, fontWeight: 800, color: "#b45309" }}>{stats.expiredShares}</div></div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {filterLinks.map((link) => {
          const active = view === link.key;
          return (
            <a
              key={link.key}
              href={link.key === "all" ? "/admin/reports/final" : `/admin/reports/final?view=${encodeURIComponent(link.key)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 36,
                padding: "0 12px",
                borderRadius: 999,
                border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                background: active ? "#eff6ff" : "#ffffff",
                color: active ? "#1d4ed8" : "#0f172a",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <span>{link.label}</span>
              <span style={{ fontSize: 12, color: active ? "#1d4ed8" : "#64748b" }}>{link.count}</span>
            </a>
          );
        })}
      </div>

      <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 8 }}>{t(lang, "Completed Packages Ready To Assign", "可推送结课报告的已完成课包")}</div>
        {candidates.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No candidates for now.", "当前没有候选课包。")}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff" }}>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Student", "学生")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Course", "课程")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Completed package", "完成课包")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Teacher", "推送老师")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((row) => (
                <tr key={row.packageId} style={{ borderTop: "1px solid #fde68a" }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>{row.studentName}</td>
                  <td style={{ padding: 6 }}>{row.courseName}</td>
                  <td style={{ padding: 6 }}>
                    <b>{formatMinutesToHours(row.usedMinutes)}h</b> / {formatMinutesToHours(row.totalMinutes)}h
                  </td>
                  <td style={{ padding: 6 }}>
                    <form action={assignFinalReport} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="hidden" name="packageId" value={row.packageId} />
                      <select name="teacherId" defaultValue={row.defaultTeacherId}>
                        {row.teacherOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                            {opt.subjectName ? ` (${opt.subjectName})` : ""}
                            {opt.latestReportStatus === "ASSIGNED"
                              ? " - Assigned"
                              : opt.latestReportStatus === "SUBMITTED"
                                ? " - Submitted"
                                : opt.latestReportStatus === "FORWARDED"
                                  ? " - Forwarded"
                                  : ""}
                          </option>
                        ))}
                      </select>
                      <button type="submit">{t(lang, "Assign", "推送")}</button>
                    </form>
                  </td>
                  <td style={{ padding: 6 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {row.teacherOptions.map((opt) => (
                        <span key={`${row.packageId}-${opt.id}`} style={{ fontSize: 12, color: "#334155" }}>
                          {opt.name}: {opt.latestReportStatus === "ASSIGNED"
                            ? t(lang, "Assigned", "已推送")
                            : opt.latestReportStatus === "SUBMITTED"
                              ? t(lang, "Submitted", "已提交")
                              : opt.latestReportStatus === "FORWARDED"
                                ? t(lang, "Forwarded", "已转发")
                                : t(lang, "Not pushed", "未推送")}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 8 }}>{t(lang, "Assigned, Submitted, and Forwarded Reports", "已推送、已提交与已转发报告")}</div>
        {filteredReports.length === 0 ? (
          <div style={{ color: "#999" }}>
            {view === "pending-delivery"
              ? t(lang, "No submitted reports are waiting for parent delivery.", "当前没有待交付给家长的已提交报告。")
              : view === "delivered"
                ? t(lang, "No delivered final reports yet.", "暂时还没有已交付的结课报告。")
                : view === "shared"
                  ? t(lang, "No active share links yet.", "当前还没有生效中的分享链接。")
                  : view === "expired-shares"
                    ? t(lang, "No expired share links right now.", "当前还没有已过期的分享链接。")
                  : t(lang, "No report records yet.", "暂无结课报告记录。")}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff" }}>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Student", "学生")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Teacher", "老师")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Course", "课程")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Status", "状态")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Summary", "摘要")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const draft = parseFinalReportDraft({
                  ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}),
                  recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep,
                });
                const meta = parseFinalReportMeta(report.reportJson);
                const hasActiveShare = isShareActive(report);
                const hasExpiredShare = isShareExpired(report);
                const canShare = report.status === "SUBMITTED" || report.status === "FORWARDED";
                const shareHref = hasActiveShare
                  ? `${origin}/final-report/${encodeURIComponent(report.id)}?token=${encodeURIComponent(report.shareToken!)}`
                  : "";
                return (
                  <tr key={report.id} style={{ borderTop: "1px solid #dbeafe" }}>
                    <td style={{ padding: 6, fontWeight: 700 }}>{report.student.name}</td>
                    <td style={{ padding: 6 }}>{report.teacher.name}</td>
                    <td style={{ padding: 6 }}>{report.course.name}{report.subject ? ` / ${report.subject.name}` : ""}</td>
                    <td style={{ padding: 6, minWidth: 180 }}>
                      <span
                        style={{
                          color: report.status === "FORWARDED" ? "#4338ca" : report.status === "SUBMITTED" ? "#166534" : "#92400e",
                          fontWeight: 700,
                        }}
                      >
                        {statusLabel(lang, report.status)}
                      </span>
                      {report.forwardedAt ? (
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Forwarded", "已转发")}: {formatBusinessDateTime(new Date(report.forwardedAt))}
                          {meta.forwardedByName ? ` (${meta.forwardedByName})` : ""}
                        </div>
                      ) : null}
                      {report.deliveredAt ? (
                        <div style={{ color: "#166534", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Delivered", "已交付")}: {formatBusinessDateTime(new Date(report.deliveredAt))}
                          {report.deliveredByUser?.name ? ` (${report.deliveredByUser.name})` : ""}
                          {report.deliveryChannel ? ` · ${deliveryChannelLabel(lang, report.deliveryChannel)}` : ""}
                        </div>
                      ) : null}
                      {report.shareEnabledAt ? (
                        <div style={{ color: hasActiveShare ? "#1d4ed8" : hasExpiredShare ? "#b45309" : "#64748b", fontSize: 12, marginTop: 4 }}>
                          {hasActiveShare
                            ? t(lang, "Share active until", "分享链接有效至")
                            : hasExpiredShare
                              ? t(lang, "Share expired at", "分享链接已于以下时间过期")
                              : t(lang, "Share disabled at", "分享链接已停用")}
                          {": "}
                          {formatBusinessDateTime(new Date((report.shareExpiresAt ?? report.shareRevokedAt ?? report.shareEnabledAt)!))}
                        </div>
                      ) : null}
                      {report.shareEnabledAt ? (
                        <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                          {shareAuditSummary(report, lang)}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: 6, minWidth: 260 }}>
                      <div style={{ fontWeight: 700 }}>{draft.finalSummary || t(lang, "No final summary yet", "暂未填写最终总结")}</div>
                      {draft.parentNote ? (
                        <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Parent note", "给家长的话")}: {draft.parentNote}
                        </div>
                      ) : null}
                      {draft.recommendedNextStep ? (
                        <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Next step", "下一步建议")}: {recommendationLabel(lang, draft.recommendedNextStep)}
                        </div>
                      ) : null}
                      {meta.deliveryNote ? (
                        <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Delivery note", "交付备注")}: {meta.deliveryNote}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: 6, minWidth: 360 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <a href={`/api/admin/final-reports/${encodeURIComponent(report.id)}/pdf`}>{t(lang, "Download PDF", "下载PDF")}</a>
                          {report.status === "SUBMITTED" ? (
                            <form action={markFinalReportForwarded}>
                              <input type="hidden" name="reportId" value={report.id} />
                              <button type="submit">{t(lang, "Mark forwarded to parent", "标记已转发给家长")}</button>
                            </form>
                          ) : null}
                        </div>

                        {(report.status === "SUBMITTED" || report.status === "FORWARDED") ? (
                          <form action={markFinalReportDelivered} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <select name="deliveryChannel" defaultValue={report.deliveryChannel ?? "WECHAT"}>
                              {FINAL_REPORT_DELIVERY_CHANNELS.map((channel) => (
                                <option key={channel} value={channel}>{deliveryChannelLabel(lang, channel)}</option>
                              ))}
                            </select>
                            <input
                              name="deliveryNote"
                              defaultValue={meta.deliveryNote}
                              placeholder={t(lang, "Optional delivery note", "可选交付备注")}
                              style={{ minWidth: 180 }}
                            />
                            <button type="submit">
                              {report.deliveredAt ? t(lang, "Update delivery record", "更新交付记录") : t(lang, "Mark delivered", "标记已交付")}
                            </button>
                          </form>
                        ) : null}

                        <div style={{ display: "grid", gap: 6 }}>
                          {hasActiveShare ? (
                            <>
                              <div style={{ fontSize: 12, color: "#334155" }}>
                                {t(lang, "Parent read-only link", "家长只读链接")}:{" "}
                                <a href={shareHref} target="_blank" rel="noreferrer">{t(lang, "Open share page", "打开分享页")}</a>
                              </div>
                              {report.shareExpiresAt ? (
                                <div style={{ fontSize: 12, color: "#1d4ed8" }}>
                                  {t(lang, "Link expires", "链接过期时间")}: {formatBusinessDateTime(new Date(report.shareExpiresAt))}
                                </div>
                              ) : null}
                              <div style={{ fontSize: 12, color: "#64748b", wordBreak: "break-all" }}>{shareHref}</div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <form action={enableFinalReportShare}>
                                  <input type="hidden" name="reportId" value={report.id} />
                                  <select name="shareDurationDays" defaultValue="30">
                                    {FINAL_REPORT_SHARE_DURATION_DAYS.map((days) => (
                                      <option key={days} value={String(days)}>{shareDurationLabel(lang, days)}</option>
                                    ))}
                                  </select>
                                  <button type="submit">{t(lang, "Refresh share link", "刷新分享链接")}</button>
                                </form>
                                <form action={disableFinalReportShare}>
                                  <input type="hidden" name="reportId" value={report.id} />
                                  <button type="submit">{t(lang, "Disable share link", "停用分享链接")}</button>
                                </form>
                              </div>
                            </>
                          ) : canShare ? (
                            <form action={enableFinalReportShare}>
                              <input type="hidden" name="reportId" value={report.id} />
                              <select name="shareDurationDays" defaultValue="30">
                                {FINAL_REPORT_SHARE_DURATION_DAYS.map((days) => (
                                  <option key={days} value={String(days)}>{shareDurationLabel(lang, days)}</option>
                                ))}
                              </select>
                              <button type="submit">{t(lang, "Create parent share link", "生成家长分享链接")}</button>
                            </form>
                          ) : (
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              {t(lang, "Share link becomes available after the teacher submits the final report.", "老师提交结课报告后，才能生成家长分享链接。")}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import FinalReportAssignmentForm from "@/app/admin/_components/FinalReportAssignmentForm";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime, formatBusinessDateOnly } from "@/lib/date-only";
import { approveLearningReportForDelivery, deliverApprovedLearningReport, learningReportDeliveryApproval, revokeLearningReportDeliveryApproval } from "@/lib/learning-report-delivery";
import { FINAL_REPORT_DELIVERY_CHANNELS, FINAL_REPORT_EXEMPT_REASONS, FINAL_REPORT_SHARE_DURATION_DAYS, loadFinalReportCandidates, parseDeliveryChannel, parseExemptReason, parseFinalReportDraft, parseFinalReportMeta, parseShareDurationDays } from "@/lib/final-report";
import { getLang, t, type Lang } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { isFinalReportPreparationDue, isFinalReportSubmissionDue, packageUsagePercent } from "@/lib/report-package-progress";
import { parseFinalDeskParams, finalDeskUrl, finalDeskResultUrl, finalDeskReportWhere, filterFinalDeskCandidates, finalDeskPagination, type FinalDeskParams } from "@/lib/final-report-desk";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import "./final-desk.css";

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string) {
  if (status === "EXEMPT") return t(lang, "Exempt", "无需报告");
  if (status === "FORWARDED") return t(lang, "Forwarded", "已转发");
  if (status === "SUBMITTED") return t(lang, "Submitted", "已提交");
  return t(lang, "Assigned", "待老师填写");
}

function exemptReasonLabel(lang: "BILINGUAL" | "ZH" | "EN", value: string) {
  switch (value) {
    case "TRIAL_ONLY":
      return t(lang, "Trial only", "仅试课");
    case "ASSESSMENT_ONLY":
      return t(lang, "Assessment only", "仅评估课");
    case "EARLY_WITHDRAWAL":
      return t(lang, "Early withdrawal", "中途停课");
    case "OPS_NOT_REQUIRED":
      return t(lang, "Not required by operations", "教务确认无需报告");
    case "DUPLICATE_ASSIGNMENT":
      return t(lang, "Duplicate assignment", "重复推送");
    case "OTHER":
      return t(lang, "Other", "其他");
    default:
      return "-";
  }
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

async function assignFinalReport(formData: FormData): Promise<string> {
  "use server";
  const user = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const stage = String(formData.get("stage") ?? "READY");
  if (!packageId || !studentId || !teacherId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { sharedStudents: { select: { studentId: true } } },
  });
  if (!pkg || pkg.type !== "HOURS" || pkg.status !== "ACTIVE") return finalDeskResultUrl(formData.get("_returnTo"), "err", "pkg");
  if (stage === "PREPARATION") {
    if (!isFinalReportPreparationDue(pkg.totalMinutes, pkg.remainingMinutes)) return finalDeskResultUrl(formData.get("_returnTo"), "err", "not-due");
  } else if (stage !== "READY" || !isFinalReportSubmissionDue(pkg.remainingMinutes)) {
    return finalDeskResultUrl(formData.get("_returnTo"), "err", "not-due");
  }
  const teacherExists = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
  if (!teacherExists) return finalDeskResultUrl(formData.get("_returnTo"), "err", "teacher");
  const accessibleStudentIds = new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)]);
  if (!accessibleStudentIds.has(studentId)) return finalDeskResultUrl(formData.get("_returnTo"), "err", "student");

  const latestAttendance = await prisma.attendance.findFirst({
    where: { packageId, studentId, session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } },
    orderBy: { session: { startAt: "desc" } },
    include: { session: { include: { class: { select: { subjectId: true } } } } },
  });
  const subjectId = latestAttendance?.session.class.subjectId ?? null;

  const latestForTeacher = await prisma.finalReport.findFirst({
    where: { packageId, teacherId, studentId },
    orderBy: { createdAt: "desc" },
  });

  if (latestForTeacher?.status === "SUBMITTED" || latestForTeacher?.status === "FORWARDED") {
    return finalDeskResultUrl(formData.get("_returnTo"), "ok", "exists");
  }

  if (latestForTeacher?.status === "EXEMPT") {
    return finalDeskResultUrl(formData.get("_returnTo"), "ok", "exempt");
  }

  let assignedReportId: string;
  if (latestForTeacher?.status === "ASSIGNED") {
    const assigned = await prisma.finalReport.update({
      where: { id: latestForTeacher.id },
      data: {
        subjectId,
        assignedByUserId: user.id,
        assignedAt: new Date(),
        submittedAt: null,
        forwardedAt: null,
      },
    });
    assignedReportId = assigned.id;
  } else {
    const assigned = await prisma.finalReport.create({
      data: {
        status: "ASSIGNED",
        studentId,
        teacherId,
        courseId: pkg.courseId,
        subjectId,
        packageId: pkg.id,
        assignedByUserId: user.id,
        reportPeriodLabel: null,
      },
    });
    assignedReportId = assigned.id;
  }

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "assigned", assignedReportId);
}

async function approveFinalReportForDelivery(formData: FormData): Promise<string> {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");
  try {
    await approveLearningReportForDelivery({ kind: "FINAL", reportId, actor: user });
  } catch {
    return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");
  }
  revalidatePath("/admin/reports/final");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "approved");
}

async function revokeFinalReportDeliveryApproval(formData: FormData): Promise<string> {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");
  try {
    await revokeLearningReportDeliveryApproval({ kind: "FINAL", reportId, actor: user });
  } catch {
    return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");
  }
  revalidatePath("/admin/reports/final");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "approval-revoked");
}

async function exemptFinalReport(formData: FormData): Promise<string> {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const exemptReason = parseExemptReason(formData.get("exemptReason"));
  if (!exemptReason) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  const now = new Date();

  if (reportId) {
    const row = await prisma.finalReport.findUnique({
      where: { id: reportId },
      select: { id: true, deliveredAt: true },
    });
    if (!row || row.deliveredAt) return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");

    await prisma.finalReport.update({
      where: { id: row.id },
      data: {
        status: "EXEMPT",
        exemptReason,
        exemptedAt: now,
        exemptedByUserId: user.id,
        forwardedAt: null,
        deliveredAt: null,
        deliveredByUserId: null,
        deliveryChannel: null,
        shareToken: null,
        shareEnabledAt: null,
        shareExpiresAt: null,
        shareRevokedAt: null,
        shareFirstViewedAt: null,
        shareLastViewedAt: null,
        shareViewCount: 0,
      },
    });
  } else {
    if (!packageId || !studentId || !teacherId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");
    const pkg = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: { sharedStudents: { select: { studentId: true } } },
    });
    if (!pkg || pkg.type !== "HOURS") return finalDeskResultUrl(formData.get("_returnTo"), "err", "pkg");
    const accessibleStudentIds = new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)]);
    if (!accessibleStudentIds.has(studentId)) return finalDeskResultUrl(formData.get("_returnTo"), "err", "student");

    const latestAttendance = await prisma.attendance.findFirst({
      where: { packageId, studentId, session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } },
      orderBy: { session: { startAt: "desc" } },
      include: { session: { include: { class: { select: { subjectId: true } } } } },
    });
    const subjectId = latestAttendance?.session.class.subjectId ?? null;

    const latestForTeacher = await prisma.finalReport.findFirst({
      where: { packageId, teacherId, studentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, deliveredAt: true },
    });

    if (latestForTeacher?.id) {
      if (latestForTeacher.deliveredAt) return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");
      await prisma.finalReport.update({
        where: { id: latestForTeacher.id },
        data: {
          status: "EXEMPT",
          exemptReason,
          exemptedAt: now,
          exemptedByUserId: user.id,
          forwardedAt: null,
          deliveredAt: null,
          deliveredByUserId: null,
          deliveryChannel: null,
          shareToken: null,
          shareEnabledAt: null,
          shareExpiresAt: null,
          shareRevokedAt: null,
          shareFirstViewedAt: null,
          shareLastViewedAt: null,
          shareViewCount: 0,
        },
      });
    } else {
      await prisma.finalReport.create({
        data: {
          status: "EXEMPT",
          studentId,
          teacherId,
          courseId: pkg.courseId,
          subjectId,
          packageId: pkg.id,
          assignedByUserId: user.id,
          reportPeriodLabel: null,
          exemptReason,
          exemptedAt: now,
          exemptedByUserId: user.id,
        },
      });
    }
  }

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "exempt");
}

async function markFinalReportDelivered(formData: FormData): Promise<string> {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const deliveryChannel = parseDeliveryChannel(formData.get("deliveryChannel"));
  const deliveryNote = String(formData.get("deliveryNote") ?? "").trim();
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  const row = await prisma.finalReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, reportJson: true, forwardedAt: true, deliveredAt: true },
  });
  if (!row || row.deliveredAt || (row.status !== "SUBMITTED" && row.status !== "FORWARDED")) {
    return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");
  }

  if (row.status === "SUBMITTED") {
    try {
      await deliverApprovedLearningReport({ kind: "FINAL", reportId, actor: user, channel: deliveryChannel || "WECHAT", note: deliveryNote });
    } catch {
      return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");
    }
    revalidatePath("/admin/reports/final");
    revalidatePath("/teacher/final-reports");
    return finalDeskResultUrl(formData.get("_returnTo"), "ok", "delivered");
  }

  const prev = row.reportJson && typeof row.reportJson === "object" ? (row.reportJson as Record<string, unknown>) : {};
  const prevMeta = prev._meta && typeof prev._meta === "object" ? (prev._meta as Record<string, unknown>) : {};
  const now = new Date();

  await prisma.finalReport.update({
    where: { id: row.id },
    data: {
      status: row.status,
      forwardedAt: row.forwardedAt,
      deliveredAt: now,
      deliveredByUserId: user.id,
      deliveryChannel: deliveryChannel || null,
      reportJson: {
        ...prev,
        _meta: {
          ...prevMeta,
          forwardedByUserId: prevMeta.forwardedByUserId,
          forwardedByName: prevMeta.forwardedByName,
          deliveryNote,
        },
      } as any,
    },
  });

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "delivered");
}

async function enableFinalReportShare(formData: FormData): Promise<string> {
  "use server";
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const shareDurationDays = parseShareDurationDays(formData.get("shareDurationDays"));
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  const row = await prisma.finalReport.findUnique({
    where: { id: reportId },
    select: { status: true },
  });
  if (!row || row.status === "ASSIGNED") return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");

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
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "share-enabled");
}

async function disableFinalReportShare(formData: FormData): Promise<string> {
  "use server";
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  await prisma.finalReport.update({
    where: { id: reportId },
    data: {
      shareRevokedAt: new Date(),
    },
  });

  revalidatePath("/admin/reports/final");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "share-disabled");
}

async function archiveFinalReport(formData: FormData): Promise<string> {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  const row = await prisma.finalReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, deliveredAt: true, archivedAt: true, shareEnabledAt: true, shareRevokedAt: true },
  });
  if (!row || row.archivedAt || (row.status !== "EXEMPT" && !row.deliveredAt)) {
    return finalDeskResultUrl(formData.get("_returnTo"), "err", "status");
  }

  await prisma.finalReport.update({
    where: { id: row.id },
    data: {
      archivedAt: new Date(),
      archivedByUserId: user.id,
      shareRevokedAt: row.shareEnabledAt && !row.shareRevokedAt ? new Date() : row.shareRevokedAt,
    },
  });

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "archived");
}

async function restoreFinalReport(formData: FormData): Promise<string> {
  "use server";
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) return finalDeskResultUrl(formData.get("_returnTo"), "err", "missing");

  await prisma.finalReport.update({
    where: { id: reportId },
    data: {
      archivedAt: null,
      archivedByUserId: null,
    },
  });

  revalidatePath("/admin/reports/final");
  revalidatePath("/teacher/final-reports");
  return finalDeskResultUrl(formData.get("_returnTo"), "ok", "restored");
}

const detailInclude = {
  student: true, teacher: true, course: true, subject: true, package: true,
  assignedByUser: { select: { name: true } }, deliveredByUser: { select: { name: true } },
  exemptedByUser: { select: { name: true } }, archivedByUser: { select: { name: true } },
} satisfies Prisma.FinalReportInclude;
type DeskReport = Prisma.FinalReportGetPayload<{ include: typeof detailInclude }>;
const clearDetail = { reportId: "", packageId: "", studentId: "" };

function phaseLabel(report: { status: string; archivedAt: Date | null; deliveredAt: Date | null; reportJson: unknown; package: { remainingMinutes: number | null } }, lang: Lang) {
  if (report.archivedAt) return t(lang, "Archived", "已归档");
  if (report.status === "EXEMPT") return t(lang, "Exempt", "无需报告");
  if (report.deliveredAt) return t(lang, "Delivered", "已交付");
  if (report.status === "ASSIGNED") return Number(report.package.remainingMinutes ?? 0) > 0
    ? t(lang, "Draft in progress", "草稿准备中") : t(lang, "Awaiting teacher submission", "待老师提交");
  return report.status === "FORWARDED" || learningReportDeliveryApproval(report.reportJson).approvedAt
    ? t(lang, "Ready for delivery", "待记录交付") : t(lang, "Awaiting review", "待审核");
}

function DeskAction({ action, lang, params, children }: { action: (data: FormData) => Promise<string>; lang: Lang; params: FinalDeskParams; children: ReactNode }) {
  return <FinalReportAssignmentForm action={action} lang={lang} returnTo={finalDeskUrl(params)}
    pendingLabel={t(lang, "Saving… Please wait.", "正在保存，请稍候…")} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>{children}</FinalReportAssignmentForm>;
}

export default async function AdminFinalReportCenterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const lang = await getLang(), sp = await searchParams, p = parseFinalDeskParams(sp);
  const ok = String(sp.ok ?? ""), err = String(sp.err ?? "");
  const countParams = { ...p, status: "all" };
  const [ready, preparation, teachers, courses, writingCount, reviewCount, allCount] = await Promise.all([
    loadFinalReportCandidates(), loadFinalReportCandidates("PREPARATION"),
    prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.finalReport.count({ where: finalDeskReportWhere(countParams, "writing") }),
    prisma.finalReport.count({ where: finalDeskReportWhere(countParams, "review") }),
    prisma.finalReport.count({ where: finalDeskReportWhere(countParams, "all") }),
  ]);
  const candidates = [...ready.map(row => ({ ...row, stage: "READY" as const })), ...preparation.map(row => ({ ...row, stage: "PREPARATION" as const }))];
  const pendingCount = filterFinalDeskCandidates(candidates, { ...p, showAssigned: false }).length;
  const filteredCandidates = filterFinalDeskCandidates(candidates, p);
  const selectedCandidate = p.packageId && p.studentId ? candidates.find(row => row.packageId === p.packageId && row.studentId === p.studentId) : undefined;
  const selectedReport = p.reportId ? await prisma.finalReport.findUnique({ where: { id: p.reportId }, include: detailInclude }) : null;
  const noticeReport = ok === "assigned" && typeof sp.assignedReportId === "string" ? await prisma.finalReport.findUnique({
    where: { id: sp.assignedReportId }, select: { id: true, status: true, student: { select: { name: true } }, teacher: { select: { name: true } } },
  }) : null;
  const detailOpen = Boolean(p.reportId || (p.packageId && p.studentId));
  const total = p.view === "unassigned" ? filteredCandidates.length : await prisma.finalReport.count({ where: finalDeskReportWhere(p) });
  const pagination = finalDeskPagination(total, p.page);
  p.page = pagination.page;
  const reports = !detailOpen && p.view !== "unassigned" ? await prisma.finalReport.findMany({
    where: finalDeskReportWhere(p), orderBy: [{ assignedAt: "desc" }, { id: "asc" }], skip: pagination.skip, take: pagination.take,
    select: { id: true, status: true, archivedAt: true, deliveredAt: true, reportJson: true, assignedAt: true,
      student: { select: { name: true } }, teacher: { select: { name: true } }, course: { select: { name: true } },
      package: { select: { totalMinutes: true, remainingMinutes: true, validFrom: true } } },
  }) : [];
  const tabs = [
    { key: "unassigned" as const, label: t(lang, "To assign", "待分配"), count: pendingCount },
    { key: "writing" as const, label: t(lang, "Teacher working", "老师填写中"), count: writingCount },
    { key: "review" as const, label: t(lang, "Review & delivery", "待审核与发送"), count: reviewCount },
    { key: "all" as const, label: t(lang, "All records", "全部记录"), count: allCount },
  ];
  const messages: Record<string, string> = {
    exists: t(lang, "This report is already submitted. Open its record to continue.", "该报告已经提交，请打开原记录继续处理。"),
    exempt: t(lang, "Marked as exempt from final report follow-up.", "已标记为无需结课报告。"),
    approved: t(lang, "Confirmed for Emily to send.", "已确认可由 Emily 发送。"),
    "approval-revoked": t(lang, "Sending approval revoked.", "已撤回发送确认。"),
    delivered: t(lang, "Delivery record saved.", "已保存交付记录。"),
    "share-enabled": t(lang, "Share link is ready.", "分享链接已生成。"),
    "share-disabled": t(lang, "Share link has been disabled.", "分享链接已停用。"),
    archived: t(lang, "Report archived.", "报告已归档。"), restored: t(lang, "Report restored.", "报告已恢复。"),
  };
  return <div className="final-desk">
    <header className="final-desk-heading"><div><h2>{t(lang, "Final Reports", "结课报告")}</h2><p>{t(lang, "Assign, review and follow up one report at a time.", "分配、审核和跟进，每次处理一份报告。")}</p></div>
      <details className="final-desk-help"><summary>{t(lang, "Report guidance", "报告说明")}</summary><div>
        <p>{t(lang, "Prepare a draft when an active package has 8 hours or less, or 10% or less, remaining. The teacher can submit only once its balance reaches zero.", "课包剩余不超过 8 小时或总量 10% 时，可先安排草稿；余额归零后老师才可正式提交。")}</p>
        <p>{t(lang, "For parent discussions before renewal, use the separate renewal progress report.", "续费前需要向家长展示学习进展，请使用独立的续费前学习进展报告。")}</p>
        <a href="/admin/reports/renewal">{t(lang, "Renewal progress reports", "续费前学习进展报告")}</a>
      </div></details>
    </header>
    {ok === "assigned" ? <div id="final-report-assignment-result" role="status" className="final-desk-notice"><strong>{t(lang, "Assigned successfully.", "已成功分配。")}</strong>{noticeReport ? <div>{noticeReport.student.name} → {noticeReport.teacher.name} · {statusLabel(lang, noticeReport.status)}{" "}<a href={finalDeskUrl(p, { ...clearDetail, reportId: noticeReport.id, view: "writing" })}>{t(lang, "View report record", "查看报告记录")}</a></div> : null}</div> : null}
    {ok && messages[ok] ? <div id="final-report-operation-result" role="status" className="final-desk-notice">{messages[ok]}</div> : null}
    {err ? <div id="final-report-operation-result" role="alert" className="final-desk-error">{err === "not-due" ? t(lang, "The package stage changed. Review its current balance before assigning.", "课包阶段已变化，请核对当前余额后再安排。") : t(lang, "This operation could not be completed. Check the current record before trying again.", "本次操作未完成，请先核对当前记录再重试。")}</div> : null}
    {detailOpen ? <>
      <a className="final-desk-back" href={finalDeskUrl(p, clearDetail, p.reportId ? `final-report-${p.reportId}` : `final-candidate-${p.packageId}-${p.studentId}`)}>← {t(lang, "Back to results", "返回原列表")}</a>
      {selectedReport ? <ReportDetail report={selectedReport} params={p} lang={lang} origin={await resolveOriginFromHeaders()} />
        : selectedCandidate ? <CandidateDetail row={selectedCandidate} teachers={teachers} params={p} lang={lang} />
        : <section className="final-desk-panel"><p>{t(lang, "This item is no longer available at this stage. Return to the list to check its latest status.", "该项目当前已不在这个阶段，请返回列表查看最新状态。")}</p></section>}
    </> : <>
      <nav className="final-desk-tabs" aria-label={t(lang, "Report stages", "报告阶段")}>
        {tabs.map(tab => <a key={tab.key} aria-current={p.view === tab.key ? "page" : undefined} href={finalDeskUrl(p, { ...clearDetail, view: tab.key, page: 1 })}><span>{tab.label}</span><b>{tab.count}</b></a>)}
      </nav>
      <form method="get" action="/admin/reports/final" data-native-submit="1" className="final-desk-filters">
        <input type="hidden" name="view" value={p.view} />
        <label className="final-desk-search">{t(lang, "Search", "搜索")}<input name="q" defaultValue={p.q} placeholder={t(lang, "Student, teacher or course", "学生、老师或课程")} /></label>
        <label>{t(lang, "Teacher", "老师")}<select name="teacherId" defaultValue={p.teacherId}><option value="">{t(lang, "All teachers", "全部老师")}</option>{teachers.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label>{t(lang, "Course", "课程")}<select name="courseId" defaultValue={p.courseId}><option value="">{t(lang, "All courses", "全部课程")}</option>{courses.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        {p.view === "all" ? <label>{t(lang, "Status", "状态")}<select name="status" defaultValue={p.status}>{[
          ["all", "All statuses", "全部状态"], ["active", "Active", "当前记录"], ["submitted", "Submitted", "已提交"], ["pending-delivery", "Pending delivery", "待交付"], ["delivered", "Delivered", "已交付"], ["exempt", "Exempt", "无需报告"], ["archived", "Archived", "已归档"], ["shared", "Share active", "分享中"], ["expired-shares", "Share expired", "分享已过期"],
        ].map(([value,en,zh]) => <option key={value} value={value}>{t(lang,en,zh)}</option>)}</select></label> : null}
        <button type="submit">{t(lang, "Search", "查询")}</button><a href={finalDeskUrl(parseFinalDeskParams({ view: p.view }))}>{t(lang, "Reset", "重置")}</a>
        {p.view === "unassigned" ? <label className="final-desk-check"><input type="checkbox" name="showAssigned" value="1" defaultChecked={p.showAssigned} />{t(lang, "Include already assigned", "同时查看已安排项目")}</label> : null}
      </form>
      <section id="final-report-records" className="final-desk-list">
        <div className="final-desk-list-heading"><h3>{tabs.find(tab => tab.key === p.view)?.label}</h3><span>{t(lang, `${total} results · 20 per page`, `共 ${total} 项 · 每页 20 项`)}</span></div>
        {total === 0 ? <div className="final-desk-empty">{p.q || p.teacherId || p.courseId ? t(lang, "No matching results. Adjust the search or filters.", "没有匹配结果，可调整搜索或筛选条件。") : t(lang, "Nothing to handle in this stage.", "这个阶段暂时没有需要处理的项目。")}</div> : <table><thead><tr><th>{t(lang, "Student / course", "学生／课程")}</th><th>{t(lang, "Teacher", "负责老师")}</th><th>{t(lang, "Package balance", "课包余额")}</th><th>{t(lang, "Stage", "当前阶段")}</th><th>{t(lang, "Next step", "下一步")}</th></tr></thead><tbody>
          {p.view === "unassigned" ? filteredCandidates.slice(pagination.skip, pagination.skip + pagination.take).map(row => {
            const pending = row.teacherOptions.filter(opt => !opt.latestReportStatus);
            return <tr key={row.candidateKey} id={`final-candidate-${row.packageId}-${row.studentId}`}>
              <td data-label={t(lang, "Student / course", "学生／课程")}><strong>{row.studentName}</strong><small>{row.courseName} · {formatMinutesToHours(row.totalMinutes)}h · {t(lang, "Starts", "起始")} {formatBusinessDateOnly(row.validFrom)}</small></td>
              <td data-label={t(lang, "Recorded teachers", "记录中的老师")}>{(pending.length ? pending : row.teacherOptions).map(opt => opt.name).join(", ")}<small>{t(lang, "Confirm the responsible teacher", "需确认实际负责老师")}</small></td>
              <td data-label={t(lang, "Package balance", "课包余额")}>{formatMinutesToHours(row.remainingMinutes)}h<small>{packageUsagePercent(row.totalMinutes, row.remainingMinutes)}% {t(lang, "used", "已使用")}</small></td>
              <td data-label={t(lang, "Stage", "当前阶段")}><span className="final-desk-badge">{pending.length ? row.stage === "READY" ? t(lang, "Ready for final report", "可安排正式报告") : t(lang, "Prepare draft first", "可先准备草稿") : t(lang, "Already assigned", "已安排")}</span></td>
              <td><a className="final-desk-primary" href={finalDeskUrl(p, { packageId: row.packageId, studentId: row.studentId })}>{pending.length ? t(lang, "Assign teacher", "分配老师") : t(lang, "View arrangements", "查看安排")}</a></td>
            </tr>;
          }) : reports.map(report => <tr key={report.id} id={`final-report-${report.id}`}>
            <td data-label={t(lang, "Student / course", "学生／课程")}><strong>{report.student.name}</strong><small>{report.course.name} · {formatMinutesToHours(Number(report.package.totalMinutes ?? 0))}h · {t(lang,"Starts","起始")} {formatBusinessDateOnly(report.package.validFrom)}</small></td>
            <td data-label={t(lang, "Teacher", "负责老师")}>{report.teacher.name}</td>
            <td data-label={t(lang, "Package balance", "课包余额")}>{formatMinutesToHours(Number(report.package.remainingMinutes ?? 0))}h<small>{packageUsagePercent(report.package.totalMinutes, report.package.remainingMinutes)}% {t(lang, "used", "已使用")}</small></td>
            <td data-label={t(lang, "Stage", "当前阶段")}><span className="final-desk-badge">{phaseLabel(report,lang)}</span></td>
            <td><a className="final-desk-primary" href={finalDeskUrl(p, { reportId: report.id })}>{p.view === "writing" ? t(lang, "View progress", "查看进度") : p.view === "review" ? t(lang, "Review report", "核对报告") : t(lang, "View details", "查看详情")}</a></td>
          </tr>)}
        </tbody></table>}
        {pagination.pages > 1 ? <nav className="final-desk-pagination" aria-label={t(lang, "Pagination", "分页")}>
          {pagination.page > 1 ? <a href={finalDeskUrl(p,{page:pagination.page-1},"final-report-records")}>← {t(lang,"Previous","上一页")}</a> : <span />}
          <span>{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages ? <a href={finalDeskUrl(p,{page:pagination.page+1},"final-report-records")}>{t(lang,"Next","下一页")} →</a> : <span />}
        </nav> : null}
      </section>
    </>}
  </div>;
}

type CandidateRow = Awaited<ReturnType<typeof loadFinalReportCandidates>>[number] & { stage: "READY" | "PREPARATION" };
async function CandidateDetail({ row, teachers, params, lang }: { row: CandidateRow; teachers: Array<{ id: string; name: string }>; params: FinalDeskParams; lang: Lang }) {
  const existing = await prisma.finalReport.findMany({ where: { packageId: row.packageId, studentId: row.studentId }, orderBy: { createdAt: "desc" }, select: { id: true, teacherId: true, status: true, archivedAt: true, teacher: { select: { name: true } } } });
  const handled = new Map<string, typeof existing[number]>();
  for (const report of existing) if (!handled.has(report.teacherId)) handled.set(report.teacherId, report);
  const recorded = new Set(row.teacherOptions.map(opt => opt.id));
  const orderedTeachers = [...teachers].sort((a,b) => Number(recorded.has(b.id)) - Number(recorded.has(a.id)) || a.name.localeCompare(b.name));
  return <section className="final-desk-panel" aria-labelledby="assignment-heading">
    <h3 id="assignment-heading">{row.studentName} · {row.courseName}</h3>
    <p>{t(lang, "Package balance", "课包余额")}: <strong>{formatMinutesToHours(row.remainingMinutes)}h</strong> / {formatMinutesToHours(row.totalMinutes)}h · {packageUsagePercent(row.totalMinutes,row.remainingMinutes)}% {t(lang,"used","已使用")}</p>
    <p className="final-desk-hint">{row.stage === "PREPARATION" ? t(lang, "Assign a draft now. The teacher can save it; formal submission waits until the balance reaches zero.", "现在可安排老师准备草稿，老师可保存；课包余额归零后才能正式提交。") : t(lang, "The package balance has reached zero. Confirm the responsible teacher for the final report.", "课包余额已归零，请确认结课报告的实际负责老师。")}</p>
    <FinalReportAssignmentForm action={assignFinalReport} lang={lang} returnTo={finalDeskUrl(params)} style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
      <input type="hidden" name="stage" value={row.stage} /><input type="hidden" name="packageId" value={row.packageId} /><input type="hidden" name="studentId" value={row.studentId} />
      <label>{t(lang,"Responsible teacher","负责老师")}<select name="teacherId" defaultValue="" required><option value="">{t(lang,"Select after confirmation","确认后选择老师")}</option>{orderedTeachers.map(teacher => <option key={teacher.id} value={teacher.id} disabled={handled.has(teacher.id)}>{teacher.name}{handled.has(teacher.id) ? ` · ${t(lang,"Already has a report","已有报告任务")}` : recorded.has(teacher.id) ? ` · ${t(lang,"Recorded teacher","有授课记录")}` : ""}</option>)}</select></label>
      <button className="final-desk-primary" type="submit">{row.stage === "PREPARATION" ? t(lang,"Assign draft","分配草稿") : t(lang,"Assign final report","分配结课报告")}</button>
    </FinalReportAssignmentForm>
    {existing.length ? <div className="final-desk-existing"><h4>{t(lang,"Existing arrangements","已有安排")}</h4>{Array.from(handled.values()).map(report => <p key={report.id}>{report.teacher.name} · {report.archivedAt ? t(lang,"Archived","已归档") : statusLabel(lang,report.status)}{" "}<a href={finalDeskUrl(params,{...clearDetail,reportId:report.id})}>{t(lang,"View original record","查看原记录")}</a></p>)}</div> : null}
    <details className="final-desk-more"><summary>{t(lang,"More actions","更多操作")}</summary><div>
      <h4>{t(lang,"No report required","无需报告")}</h4>
      <DeskAction action={exemptFinalReport} params={params} lang={lang}>
        <input type="hidden" name="packageId" value={row.packageId} /><input type="hidden" name="studentId" value={row.studentId} />
        <label>{t(lang,"Teacher","老师")}<select name="teacherId" defaultValue="" required><option value="">{t(lang,"Select teacher","选择老师")}</option>{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
        <label>{t(lang,"Reason","原因")}<select name="exemptReason" defaultValue="" required><option value="">{t(lang,"Select reason","选择原因")}</option>{FINAL_REPORT_EXEMPT_REASONS.map(reason => <option key={reason} value={reason}>{exemptReasonLabel(lang,reason)}</option>)}</select></label><button>{t(lang,"Mark exempt","标记无需报告")}</button>
      </DeskAction>
    </div></details>
  </section>;
}

function ReportDetail({ report, params, lang, origin }: { report: DeskReport; params: FinalDeskParams; lang: Lang; origin: string }) {
  const draft = parseFinalReportDraft({ ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}), recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep });
  const meta = parseFinalReportMeta(report.reportJson), approval = learningReportDeliveryApproval(report.reportJson);
  const canShare = report.status === "SUBMITTED" || report.status === "FORWARDED", activeShare = isShareActive(report);
  const shareHref = activeShare ? `${origin}/final-report/${encodeURIComponent(report.id)}?token=${encodeURIComponent(report.shareToken!)}` : "";
  const parentHref = `/admin/reports/final/${encodeURIComponent(report.id)}/parent-edition?returnTo=${encodeURIComponent(finalDeskUrl(params))}`;
  const fields = [
    [t(lang,"Initial learning goals","初始学习目标"),draft.initialGoals], [t(lang,"Final summary","结课总结"),draft.finalSummary],
    [t(lang,"Strengths","优势与进步"),draft.strengths], [t(lang,"Areas to continue","仍需加强的方面"),draft.areasToContinue],
    [t(lang,"Parent note","给家长的话"),draft.parentNote], [t(lang,"Attendance","出勤情况"),draft.attendanceComment],
    [t(lang,"Homework","作业情况"),draft.homeworkComment], [t(lang,"Next step","下一阶段建议"),draft.recommendedNextStep ? recommendationLabel(lang,draft.recommendedNextStep) : ""],
  ];
  const recordId = <input type="hidden" name="reportId" value={report.id} />;
  return <article className="final-desk-detail">
    <section className="final-desk-panel">
      <h3>{report.student.name} · {report.course.name}{report.subject ? ` · ${report.subject.name}` : ""}</h3>
      <div className="final-desk-summary"><span>{t(lang,"Teacher","负责老师")}: <strong>{report.teacher.name}</strong></span><span>{t(lang,"Package balance","课包余额")}: <strong>{formatMinutesToHours(Number(report.package.remainingMinutes ?? 0))}h</strong> / {formatMinutesToHours(Number(report.package.totalMinutes ?? 0))}h</span><span className="final-desk-badge">{phaseLabel(report,lang)}</span></div>
      {report.status === "ASSIGNED" ? <p className="final-desk-hint">{Number(report.package.remainingMinutes ?? 0) > 0 ? t(lang,"The teacher can work on the draft now. Formal submission becomes available at zero balance.","老师现在可填写并保存草稿，课包余额归零后才能正式提交。") : t(lang,"The teacher can now complete and submit this report from their Final Reports page.","老师现在可从本人结课报告列表进入并正式提交。")}</p> : null}
    </section>
    <section className="final-desk-panel"><h3>{t(lang,"Teacher report","老师报告")}</h3>
      {fields.some(([,value])=>Boolean(value)) ? fields.filter(([,value])=>Boolean(value)).map(([label,value])=><div className="final-desk-report-field" key={label}><h4>{label}</h4><p>{value}</p></div>) : <p>{t(lang,"The teacher has not saved the report text yet.","老师尚未保存报告正文。")}</p>}
      {report.finalLevel || report.overallScore ? <p>{t(lang,"Final level / score","最终水平／分数")}: {report.finalLevel || "—"} / {report.overallScore?.toString() || "—"}</p> : null}
    </section>
    {canShare ? <section className="final-desk-panel"><h3>{t(lang,"Parent report & delivery","家长报告与交付")}</h3>
      <div className="final-desk-actions"><a className="final-desk-primary" href={parentHref}>{t(lang,"Review parent bilingual report","核对家长双语报告")}</a><a href={`/api/admin/final-reports/${encodeURIComponent(report.id)}/pdf`} target="_blank" rel="noreferrer">{t(lang,"Download PDF","下载 PDF")}</a></div>
      {!report.archivedAt && !report.deliveredAt && report.status === "SUBMITTED" && !approval.approvedAt ? <div className="final-desk-step"><p>{t(lang,"Review the report and parent version before confirming it for delivery.","请先核对报告和家长版本，再确认可发送。")}</p><DeskAction action={approveFinalReportForDelivery} params={params} lang={lang}>{recordId}<button>{t(lang,"Confirm for Emily to send","确认可由 Emily 发送")}</button></DeskAction></div> : null}
      {!report.archivedAt && !report.deliveredAt && ((report.status === "SUBMITTED" && Boolean(approval.approvedAt)) || report.status === "FORWARDED") ? <div className="final-desk-step"><p>{t(lang,"Record delivery after the report has actually been sent to the parent.","实际发送给家长后，再记录交付结果。")}</p><DeskAction action={markFinalReportDelivered} params={params} lang={lang}>{recordId}
        <label>{t(lang,"Channel","发送渠道")}<select name="deliveryChannel" defaultValue={report.deliveryChannel ?? "WECHAT"}>{FINAL_REPORT_DELIVERY_CHANNELS.map(channel => <option key={channel} value={channel}>{deliveryChannelLabel(lang,channel)}</option>)}</select></label>
        <label>{t(lang,"Note (optional)","备注（选填）")}<input name="deliveryNote" defaultValue={meta.deliveryNote} /></label><button>{t(lang,"Record delivered","记录已交付")}</button>
      </DeskAction></div> : null}
      {report.deliveredAt ? <p>{t(lang,"Delivered","已交付")}: {formatBusinessDateTime(report.deliveredAt)} · {report.deliveredByUser?.name || "—"} · {deliveryChannelLabel(lang,report.deliveryChannel || "")}{meta.deliveryNote ? ` · ${meta.deliveryNote}` : ""}</p> : null}
    </section> : null}
    <details className="final-desk-more"><summary>{t(lang,"More actions: share, exemption and archive","更多操作：分享、无需报告与归档")}</summary><div>
      {!report.archivedAt && canShare ? <section><h4>{t(lang,"Parent read-only share link","家长只读分享链接")}</h4>
        {activeShare ? <><a href={shareHref} target="_blank" rel="noreferrer">{t(lang,"Open share page","打开分享页")}</a><p className="final-desk-url">{shareHref}</p><p>{report.shareExpiresAt ? `${t(lang,"Expires","有效至")}: ${formatBusinessDateTime(report.shareExpiresAt)}` : ""}</p></> : <p>{isShareExpired(report) ? t(lang,"The previous link has expired.","原分享链接已过期。") : t(lang,"No active share link.","当前没有生效的分享链接。")}</p>}
        <DeskAction action={enableFinalReportShare} params={params} lang={lang}>{recordId}<label>{t(lang,"Validity","有效期")}<select name="shareDurationDays" defaultValue="30">{FINAL_REPORT_SHARE_DURATION_DAYS.map(days => <option key={days} value={days}>{shareDurationLabel(lang,days)}</option>)}</select></label><button>{activeShare ? t(lang,"Refresh share link","刷新分享链接") : t(lang,"Create parent share link","生成家长分享链接")}</button></DeskAction>
        {activeShare ? <DeskAction action={disableFinalReportShare} params={params} lang={lang}>{recordId}<button>{t(lang,"Disable share link","停用分享链接")}</button></DeskAction> : null}
      </section> : null}
      {!report.archivedAt && !report.deliveredAt && report.status === "SUBMITTED" && approval.approvedAt ? <section><h4>{t(lang,"Sending approval","发送确认")}</h4><DeskAction action={revokeFinalReportDeliveryApproval} params={params} lang={lang}>{recordId}<button>{t(lang,"Revoke sending approval","撤回发送确认")}</button></DeskAction></section> : null}
      {!report.archivedAt && !report.deliveredAt && report.status !== "EXEMPT" ? <section><h4>{t(lang,"No report required","无需报告")}</h4><DeskAction action={exemptFinalReport} params={params} lang={lang}>{recordId}<label>{t(lang,"Reason","原因")}<select name="exemptReason" required defaultValue=""><option value="">{t(lang,"Select reason","选择原因")}</option>{FINAL_REPORT_EXEMPT_REASONS.map(reason => <option key={reason} value={reason}>{exemptReasonLabel(lang,reason)}</option>)}</select></label><button>{t(lang,"Mark exempt","标记无需报告")}</button></DeskAction></section> : null}
      {report.archivedAt ? <section><DeskAction action={restoreFinalReport} params={params} lang={lang}>{recordId}<button>{t(lang,"Restore to active records","恢复到当前记录")}</button></DeskAction></section>
        : report.status === "EXEMPT" || report.deliveredAt ? <section><DeskAction action={archiveFinalReport} params={params} lang={lang}>{recordId}<button>{t(lang,"Archive report","归档报告")}</button></DeskAction></section> : null}
    </div></details>
    <details className="final-desk-more"><summary>{t(lang,"History & internal notes","关键时间与内部记录")}</summary><div>
      <p>{t(lang,"Assigned","分配时间")}: {formatBusinessDateTime(report.assignedAt)} · {report.assignedByUser?.name || "—"}</p>
      {report.submittedAt ? <p>{t(lang,"Submitted","提交时间")}: {formatBusinessDateTime(report.submittedAt)}</p> : null}
      {report.forwardedAt ? <p>{t(lang,"Forwarded","转发时间")}: {formatBusinessDateTime(report.forwardedAt)} · {meta.forwardedByName || "—"}</p> : null}
      {approval.approvedAt ? <p>{t(lang,"Sending approved","发送确认")}: {formatBusinessDateTime(new Date(approval.approvedAt))} · {approval.approvedByName || "—"}</p> : null}
      {report.exemptedAt ? <p>{t(lang,"Exempted","豁免时间")}: {formatBusinessDateTime(report.exemptedAt)} · {report.exemptedByUser?.name || "—"} · {exemptReasonLabel(lang,report.exemptReason || "")}</p> : null}
      {report.archivedAt ? <p>{t(lang,"Archived","归档时间")}: {formatBusinessDateTime(report.archivedAt)} · {report.archivedByUser?.name || "—"}</p> : null}
      {report.shareEnabledAt ? <p>{t(lang,"Share views","分享访问")}: {shareAuditSummary(report,lang)}</p> : null}
      {draft.teacherComment ? <div className="final-desk-report-field"><h4>{t(lang,"Teacher internal note","老师内部备注")}</h4><p>{draft.teacherComment}</p></div> : null}
    </div></details>
  </article>;
}

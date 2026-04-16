import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  formatMinutesToHours,
  loadMidtermCandidates,
  MIDTERM_REPORT_EXEMPT_REASONS,
  parseMidtermExemptReason,
} from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatBusinessDateTime } from "@/lib/date-only";

function readForwardMeta(raw: unknown): { forwardedAt: string | null; forwardedByName: string | null; locked: boolean } {
  if (!raw || typeof raw !== "object") return { forwardedAt: null, forwardedByName: null, locked: false };
  const meta = (raw as any)?._meta;
  if (!meta || typeof meta !== "object") return { forwardedAt: null, forwardedByName: null, locked: false };
  const forwardedAt = typeof meta.forwardedAt === "string" && meta.forwardedAt.trim() ? meta.forwardedAt.trim() : null;
  const forwardedByName = typeof meta.forwardedByName === "string" && meta.forwardedByName.trim() ? meta.forwardedByName.trim() : null;
  const locked = Boolean(meta.lockedAfterForwarded);
  return { forwardedAt, forwardedByName, locked };
}

function statusLabel(lang: "BILINGUAL" | "ZH" | "EN", status: string, locked: boolean) {
  if (status === "EXEMPT") return t(lang, "Exempt", "无需报告");
  if (locked) return t(lang, "Forwarded & Locked", "已转发并锁定");
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

async function assignMidtermReport(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  if (!packageId || !studentId || !teacherId) redirect("/admin/reports/midterm?err=missing");

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: {
      txns: { where: { kind: "DEDUCT" }, select: { id: true } },
      sharedStudents: { select: { studentId: true } },
    },
  });
  if (!pkg || pkg.type !== "HOURS") redirect("/admin/reports/midterm?err=pkg");
  const accessibleStudentIds = new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)]);
  if (!accessibleStudentIds.has(studentId)) redirect("/admin/reports/midterm?err=student");

  const total = Math.max(0, Number(pkg.totalMinutes ?? 0));
  const remaining = Math.max(0, Number(pkg.remainingMinutes ?? 0));
  const consumed = Math.max(0, total - remaining);
  const progress = total > 0 ? Math.round((consumed / total) * 100) : 0;

  const latestAttendance = await prisma.attendance.findFirst({
    where: { packageId, studentId, session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } },
    orderBy: { session: { startAt: "desc" } },
    include: { session: { include: { class: { select: { subjectId: true } } } } },
  });
  const subjectId = latestAttendance?.session.class.subjectId ?? null;

  const latestForTeacher = await prisma.midtermReport.findFirst({
    where: { packageId, teacherId, studentId },
    orderBy: { createdAt: "desc" },
  });

  if (latestForTeacher?.status === "SUBMITTED") {
    redirect("/admin/reports/midterm?ok=exists");
  }

  if (latestForTeacher?.status === "EXEMPT") {
    redirect("/admin/reports/midterm?ok=exempt");
  }

  if (latestForTeacher?.status === "ASSIGNED") {
    await prisma.midtermReport.update({
      where: { id: latestForTeacher.id },
      data: {
        subjectId,
        assignedByUserId: user.id,
        assignedAt: new Date(),
        progressPercent: progress,
        consumedMinutes: consumed,
        totalMinutes: total,
      },
    });
  } else {
    await prisma.midtermReport.create({
      data: {
        status: "ASSIGNED",
        studentId,
        teacherId,
        courseId: pkg.courseId,
        subjectId,
        packageId: pkg.id,
        assignedByUserId: user.id,
        progressPercent: progress,
        consumedMinutes: consumed,
        totalMinutes: total,
        reportPeriodLabel: `${pkg.txns.length} sessions completed`,
      },
    });
  }

  revalidatePath("/admin/reports/midterm");
  revalidatePath("/teacher/midterm-reports");
  redirect("/admin/reports/midterm?ok=assigned");
}

async function exemptMidtermReport(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const exemptReason = parseMidtermExemptReason(formData.get("exemptReason"));
  if (!exemptReason) redirect("/admin/reports/midterm?err=missing");

  const now = new Date();

  if (reportId) {
    const row = await prisma.midtermReport.findUnique({
      where: { id: reportId },
      select: { id: true, reportJson: true },
    });
    if (!row || readForwardMeta(row.reportJson).locked) redirect("/admin/reports/midterm?err=status");

    await prisma.midtermReport.update({
      where: { id: row.id },
      data: {
        status: "EXEMPT",
        exemptReason,
        exemptedAt: now,
        exemptedByUserId: user.id,
        submittedAt: null,
      },
    });
  } else {
    if (!packageId || !studentId || !teacherId) redirect("/admin/reports/midterm?err=missing");

    const pkg = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: {
        txns: { where: { kind: "DEDUCT" }, select: { id: true } },
        sharedStudents: { select: { studentId: true } },
      },
    });
    if (!pkg || pkg.type !== "HOURS") redirect("/admin/reports/midterm?err=pkg");
    const accessibleStudentIds = new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)]);
    if (!accessibleStudentIds.has(studentId)) redirect("/admin/reports/midterm?err=student");

    const total = Math.max(0, Number(pkg.totalMinutes ?? 0));
    const remaining = Math.max(0, Number(pkg.remainingMinutes ?? 0));
    const consumed = Math.max(0, total - remaining);
    const progress = total > 0 ? Math.round((consumed / total) * 100) : 0;

    const latestAttendance = await prisma.attendance.findFirst({
      where: { packageId, studentId, session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } },
      orderBy: { session: { startAt: "desc" } },
      include: { session: { include: { class: { select: { subjectId: true } } } } },
    });
    const subjectId = latestAttendance?.session.class.subjectId ?? null;

    const latestForTeacher = await prisma.midtermReport.findFirst({
      where: { packageId, teacherId, studentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, reportJson: true },
    });

    if (latestForTeacher?.id) {
      if (readForwardMeta(latestForTeacher.reportJson).locked) redirect("/admin/reports/midterm?err=status");
      await prisma.midtermReport.update({
        where: { id: latestForTeacher.id },
        data: {
          status: "EXEMPT",
          exemptReason,
          exemptedAt: now,
          exemptedByUserId: user.id,
          submittedAt: null,
        },
      });
    } else {
      await prisma.midtermReport.create({
        data: {
          status: "EXEMPT",
          studentId,
          teacherId,
          courseId: pkg.courseId,
          subjectId,
          packageId: pkg.id,
          assignedByUserId: user.id,
          progressPercent: progress,
          consumedMinutes: consumed,
          totalMinutes: total,
          reportPeriodLabel: `${pkg.txns.length} sessions completed`,
          exemptReason,
          exemptedAt: now,
          exemptedByUserId: user.id,
        },
      });
    }
  }

  revalidatePath("/admin/reports/midterm");
  revalidatePath("/teacher/midterm-reports");
  redirect("/admin/reports/midterm?ok=exempt");
}

async function markForwardedAndLock(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) redirect("/admin/reports/midterm?err=missing");

  const row = await prisma.midtermReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, reportJson: true },
  });
  if (!row || row.status !== "SUBMITTED") redirect("/admin/reports/midterm?err=status");

  const nowIso = new Date().toISOString();
  const prev = row.reportJson && typeof row.reportJson === "object" ? (row.reportJson as Record<string, unknown>) : {};
  const prevMeta = prev._meta && typeof prev._meta === "object" ? (prev._meta as Record<string, unknown>) : {};

  await prisma.midtermReport.update({
    where: { id: row.id },
    data: {
      reportJson: {
        ...prev,
        _meta: {
          ...prevMeta,
          forwardedAt: nowIso,
          forwardedByUserId: user.id,
          forwardedByName: user.name,
          lockedAfterForwarded: true,
        },
      } as any,
    },
  });

  revalidatePath("/admin/reports/midterm");
  revalidatePath("/teacher/midterm-reports");
  redirect("/admin/reports/midterm?ok=forwarded");
}

async function archiveMidtermReport(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) redirect("/admin/reports/midterm?err=missing");

  const row = await prisma.midtermReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, reportJson: true, archivedAt: true },
  });
  if (!row || row.archivedAt) redirect("/admin/reports/midterm?err=status");

  const locked = readForwardMeta(row.reportJson).locked;
  if (!(locked || row.status === "EXEMPT")) redirect("/admin/reports/midterm?err=status");

  await prisma.midtermReport.update({
    where: { id: row.id },
    data: {
      archivedAt: new Date(),
      archivedByUserId: user.id,
    },
  });

  revalidatePath("/admin/reports/midterm");
  revalidatePath("/teacher/midterm-reports");
  redirect("/admin/reports/midterm?ok=archived");
}

async function restoreMidtermReport(formData: FormData) {
  "use server";
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) redirect("/admin/reports/midterm?err=missing");

  await prisma.midtermReport.update({
    where: { id: reportId },
    data: {
      archivedAt: null,
      archivedByUserId: null,
    },
  });

  revalidatePath("/admin/reports/midterm");
  revalidatePath("/teacher/midterm-reports");
  redirect("/admin/reports/midterm?ok=restored");
}

export default async function AdminMidtermReportCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const ok = String(sp.ok ?? "");
  const err = String(sp.err ?? "");
  const rawView = String(sp.view ?? "").trim().toLowerCase();
  const view = rawView === "exempt" ? "exempt" : rawView === "archived" ? "archived" : "active";

  const [candidates, reports] = await Promise.all([
    loadMidtermCandidates(),
    prisma.midtermReport.findMany({
      include: {
        student: true,
        teacher: true,
        course: true,
        subject: true,
        exemptedByUser: { select: { name: true } },
        archivedByUser: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
      take: 300,
    }),
  ]);

  const filteredReports = reports.filter((r) => {
    if (view === "archived") return Boolean(r.archivedAt);
    if (r.archivedAt) return false;
    if (view === "exempt") return r.status === "EXEMPT";
    return true;
  });
  const activeCount = reports.filter((r) => !r.archivedAt).length;
  const exemptCount = reports.filter((r) => !r.archivedAt && r.status === "EXEMPT").length;
  const archivedCount = reports.filter((r) => Boolean(r.archivedAt)).length;

  return (
    <div>
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Midterm Report Desk / 中期报告工作台</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Midterm Report Center", "中期报告中心")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(
              lang,
              "Detect students near half-package progress and assign report writing to the subject teacher.",
              "系统会识别接近课时包中点的学生，教务可按任课老师分别推送中期报告。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Candidates", "候选学生")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{candidates.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Active reports", "当前报告")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{activeCount}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Exempt", "无需报告")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{exemptCount}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Archived", "已归档")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{archivedCount}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #dbeafe",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#midterm-report-candidates">{t(lang, "Candidates", "候选学生")}</a>
        <a href="#midterm-report-filters">{t(lang, "Views", "视图")}</a>
        <a href="#midterm-report-records">{t(lang, "Records", "报告记录")}</a>
      </div>

      {ok === "assigned" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Assigned successfully.", "已成功推送给老师。")}
        </div>
      ) : ok === "exists" ? (
        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "This teacher already submitted this midterm report.", "该老师已提交此中期报告，无需重复推送。")}
        </div>
      ) : ok === "forwarded" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Marked as forwarded and locked.", "已标记为已转发并锁定。")}
        </div>
      ) : ok === "exempt" ? (
        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Marked as exempt from midterm-report follow-up.", "已标记为无需中期报告。")}
        </div>
      ) : ok === "archived" ? (
        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Report archived.", "报告已归档。")}
        </div>
      ) : ok === "restored" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Report restored to the active desk.", "报告已恢复到当前工作台。")}
        </div>
      ) : null}

      {err ? (
        <div style={{ background: "#fff1f2", border: "1px solid #fb7185", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Operation failed. Please retry.", "操作失败，请重试。")}
        </div>
      ) : null}

      <div
        id="midterm-report-candidates"
        style={{
          border: "1px solid #fecaca",
          background: "#fff7ed",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          scrollMarginTop: 96,
        }}
      >
        <div style={{ fontWeight: 800, color: "#9a3412", marginBottom: 8 }}>{t(lang, "Candidates Near Midpoint", "接近中期报告节点")}</div>
        {candidates.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No candidates for now.", "当前没有候选学生。")}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff" }}>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Student", "学生")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Course", "课程")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Progress", "进度")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Teacher", "推送老师")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((row) => (
                <tr key={row.candidateKey} style={{ borderTop: "1px solid #fed7aa" }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>{row.studentName}</td>
                  <td style={{ padding: 6 }}>{row.courseName}</td>
                  <td style={{ padding: 6 }}>
                    <b>{row.progressPercent}%</b> ({formatMinutesToHours(row.consumedMinutes)}h / {formatMinutesToHours(row.totalMinutes)}h)
                  </td>
                  <td style={{ padding: 6 }}>
                    <form action={assignMidtermReport} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="hidden" name="packageId" value={row.packageId} />
                      <input type="hidden" name="studentId" value={row.studentId} />
                      <select name="teacherId" defaultValue={row.defaultTeacherId}>
                        {row.teacherOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                            {opt.subjectName ? ` (${opt.subjectName})` : ""}
                            {opt.latestReportStatus === "ASSIGNED"
                              ? " - Assigned"
                              : opt.latestReportStatus === "SUBMITTED"
                                ? " - Submitted"
                                : opt.latestReportStatus === "EXEMPT"
                                  ? " - Exempt"
                                  : ""}
                          </option>
                        ))}
                      </select>
                      <button type="submit">{t(lang, "Push", "推送")}</button>
                    </form>
                  </td>
                  <td style={{ padding: 6 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <form action={exemptMidtermReport} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="hidden" name="packageId" value={row.packageId} />
                        <input type="hidden" name="studentId" value={row.studentId} />
                        <select name="teacherId" defaultValue={row.defaultTeacherId}>
                          {row.teacherOptions.map((opt) => (
                            <option key={`${row.candidateKey}-${opt.id}-exempt`} value={opt.id}>
                              {opt.name}
                              {opt.subjectName ? ` (${opt.subjectName})` : ""}
                            </option>
                          ))}
                        </select>
                        <select name="exemptReason" defaultValue="ASSESSMENT_ONLY">
                          {MIDTERM_REPORT_EXEMPT_REASONS.map((reason) => (
                            <option key={reason} value={reason}>{exemptReasonLabel(lang, reason)}</option>
                          ))}
                        </select>
                        <button type="submit">{t(lang, "Mark exempt", "标记无需报告")}</button>
                      </form>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {row.teacherOptions.map((opt) => (
                          <span key={`${row.candidateKey}-${opt.id}`} style={{ fontSize: 12, color: "#334155" }}>
                            {opt.name}: {opt.latestReportStatus === "ASSIGNED"
                              ? t(lang, "Assigned", "已推送")
                              : opt.latestReportStatus === "SUBMITTED"
                                ? t(lang, "Submitted", "已提交")
                                : opt.latestReportStatus === "EXEMPT"
                                  ? t(lang, "Exempt", "无需报告")
                                  : t(lang, "Not pushed", "未推送")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div id="midterm-report-filters" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, scrollMarginTop: 96 }}>
        <a
          href="/admin/reports/midterm"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 36,
            padding: "0 12px",
            borderRadius: 999,
            border: view === "active" ? "1px solid #2563eb" : "1px solid #cbd5e1",
            background: view === "active" ? "#eff6ff" : "#ffffff",
            color: view === "active" ? "#1d4ed8" : "#0f172a",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t(lang, "Active reports", "当前报告")}
          <span style={{ fontSize: 12, color: view === "active" ? "#1d4ed8" : "#64748b" }}>{activeCount}</span>
        </a>
        <a
          href="/admin/reports/midterm?view=exempt"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 36,
            padding: "0 12px",
            borderRadius: 999,
            border: view === "exempt" ? "1px solid #2563eb" : "1px solid #cbd5e1",
            background: view === "exempt" ? "#eff6ff" : "#ffffff",
            color: view === "exempt" ? "#1d4ed8" : "#0f172a",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t(lang, "Exempt", "无需报告")}
          <span style={{ fontSize: 12, color: view === "exempt" ? "#1d4ed8" : "#64748b" }}>{exemptCount}</span>
        </a>
        <a
          href="/admin/reports/midterm?view=archived"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 36,
            padding: "0 12px",
            borderRadius: 999,
            border: view === "archived" ? "1px solid #2563eb" : "1px solid #cbd5e1",
            background: view === "archived" ? "#eff6ff" : "#ffffff",
            color: view === "archived" ? "#1d4ed8" : "#0f172a",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t(lang, "Archived", "已归档")}
          <span style={{ fontSize: 12, color: view === "archived" ? "#1d4ed8" : "#64748b" }}>{archivedCount}</span>
        </a>
      </div>

      <div id="midterm-report-records" style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 12, scrollMarginTop: 96 }}>
        <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 8 }}>{t(lang, "Midterm Report Records", "中期报告记录")}</div>
        {filteredReports.length === 0 ? (
          <div style={{ color: "#999" }}>
            {view === "exempt"
              ? t(lang, "No exempt midterm reports yet.", "暂时还没有无需中期报告的记录。")
              : view === "archived"
                ? t(lang, "No archived midterm reports yet.", "暂时还没有已归档的中期报告。")
                : t(lang, "No report records.", "暂无报告记录。")}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff" }}>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Student", "学生")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Teacher", "老师")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Course", "课程")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Progress", "进度快照")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Status", "状态")}</th>
                <th align="left" style={{ padding: 6 }}>{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r) => {
                const forwardMeta = readForwardMeta(r.reportJson);
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #dbeafe" }}>
                    <td style={{ padding: 6, fontWeight: 700 }}>{r.student.name}</td>
                    <td style={{ padding: 6 }}>{r.teacher.name}</td>
                    <td style={{ padding: 6 }}>{r.course.name}{r.subject ? ` / ${r.subject.name}` : ""}</td>
                    <td style={{ padding: 6 }}>{r.progressPercent}% ({formatMinutesToHours(r.consumedMinutes)}h / {formatMinutesToHours(r.totalMinutes)}h)</td>
                    <td style={{ padding: 6 }}>
                      <span style={{ color: r.status === "EXEMPT" ? "#475569" : forwardMeta.locked ? "#1d4ed8" : r.status === "SUBMITTED" ? "#166534" : "#92400e", fontWeight: 700 }}>
                        {statusLabel(lang, r.status, forwardMeta.locked)}
                      </span>
                      {r.status === "EXEMPT" ? (
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Exempted", "已豁免")}: {r.exemptedAt ? formatBusinessDateTime(new Date(r.exemptedAt)) : "-"}
                          {r.exemptedByUser?.name ? ` (${r.exemptedByUser.name})` : ""}
                          {r.exemptReason ? ` · ${exemptReasonLabel(lang, r.exemptReason)}` : ""}
                        </div>
                      ) : null}
                      {r.archivedAt ? (
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                          {t(lang, "Archived", "已归档")}: {formatBusinessDateTime(new Date(r.archivedAt))}
                          {r.archivedByUser?.name ? ` (${r.archivedByUser.name})` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {r.status !== "EXEMPT" ? <a href={`/api/admin/midterm-reports/${encodeURIComponent(r.id)}/pdf`}>{t(lang, "Download PDF", "下载PDF")}</a> : null}
                        {r.archivedAt ? (
                          <form action={restoreMidtermReport}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button type="submit">{t(lang, "Restore", "恢复")}</button>
                          </form>
                        ) : null}
                        {forwardMeta.locked ? (
                          <span style={{ color: "#1d4ed8", fontSize: 12 }}>
                            {t(lang, "Forwarded", "已转发")}: {forwardMeta.forwardedAt ? formatBusinessDateTime(new Date(forwardMeta.forwardedAt)) : "-"} ({forwardMeta.forwardedByName || "-"})
                          </span>
                        ) : r.status === "SUBMITTED" ? (
                          <form action={markForwardedAndLock}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button type="submit">{t(lang, "Mark Forwarded + Lock", "标记已转发并锁定")}</button>
                          </form>
                        ) : null}
                        {!r.archivedAt && !forwardMeta.locked && r.status !== "EXEMPT" ? (
                          <form action={exemptMidtermReport} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <select name="exemptReason" defaultValue="OPS_NOT_REQUIRED">
                              {MIDTERM_REPORT_EXEMPT_REASONS.map((reason) => (
                                <option key={reason} value={reason}>{exemptReasonLabel(lang, reason)}</option>
                              ))}
                            </select>
                            <button type="submit">{t(lang, "Mark exempt", "标记无需报告")}</button>
                          </form>
                        ) : null}
                        {!r.archivedAt && (forwardMeta.locked || r.status === "EXEMPT") ? (
                          <form action={archiveMidtermReport}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button type="submit">{t(lang, "Archive", "归档")}</button>
                          </form>
                        ) : null}
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

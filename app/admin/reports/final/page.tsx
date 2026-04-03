import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { loadFinalReportCandidates, parseFinalReportDraft } from "@/lib/final-report";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
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

function readForwardMeta(raw: unknown): { forwardedByName: string | null } {
  if (!raw || typeof raw !== "object") return { forwardedByName: null };
  const meta = (raw as any)?._meta;
  if (!meta || typeof meta !== "object") return { forwardedByName: null };
  const forwardedByName = typeof meta.forwardedByName === "string" && meta.forwardedByName.trim() ? meta.forwardedByName.trim() : null;
  return { forwardedByName };
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

export default async function AdminFinalReportCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const ok = String(sp.ok ?? "");
  const err = String(sp.err ?? "");

  const [candidates, reports] = await Promise.all([
    loadFinalReportCandidates(),
    prisma.finalReport.findMany({
      include: { student: true, teacher: true, course: true, subject: true, package: true },
      orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
      take: 300,
    }),
  ]);

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>{t(lang, "Final Report Center", "结课报告中心")}</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        {t(
          lang,
          "Detect completed hour packages, assign one final report per package, and track when the teacher submits or operations forwards it.",
          "系统会识别已完成的课时包，教务可按课包推送结课报告，并跟踪老师提交和教务转发状态。"
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
      ) : null}

      {err ? (
        <div style={{ background: "#fff1f2", border: "1px solid #fb7185", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Operation failed. Please retry.", "操作失败，请重试。")}
        </div>
      ) : null}

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
        {reports.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No report records yet.", "暂无结课报告记录。")}</div>
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
              {reports.map((report) => {
                const draft = parseFinalReportDraft(report.reportJson);
                const forwardMeta = readForwardMeta(report.reportJson);
                return (
                  <tr key={report.id} style={{ borderTop: "1px solid #dbeafe" }}>
                    <td style={{ padding: 6, fontWeight: 700 }}>{report.student.name}</td>
                    <td style={{ padding: 6 }}>{report.teacher.name}</td>
                    <td style={{ padding: 6 }}>{report.course.name}{report.subject ? ` / ${report.subject.name}` : ""}</td>
                    <td style={{ padding: 6 }}>
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
                          {formatBusinessDateTime(new Date(report.forwardedAt))}
                          {forwardMeta.forwardedByName ? ` (${forwardMeta.forwardedByName})` : ""}
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
                    </td>
                    <td style={{ padding: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <a href={`/api/admin/final-reports/${encodeURIComponent(report.id)}/pdf`}>{t(lang, "Download PDF", "下载PDF")}</a>
                        {report.status === "SUBMITTED" ? (
                          <form action={markFinalReportForwarded}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <button type="submit">{t(lang, "Mark forwarded to parent", "标记已转发给家长")}</button>
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

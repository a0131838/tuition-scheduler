import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatMinutesToHours, loadMidtermCandidates } from "@/lib/midterm-report";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readForwardMeta(raw: unknown): { forwardedAt: string | null; forwardedByName: string | null; locked: boolean } {
  if (!raw || typeof raw !== "object") return { forwardedAt: null, forwardedByName: null, locked: false };
  const meta = (raw as any)?._meta;
  if (!meta || typeof meta !== "object") return { forwardedAt: null, forwardedByName: null, locked: false };
  const forwardedAt = typeof meta.forwardedAt === "string" && meta.forwardedAt.trim() ? meta.forwardedAt.trim() : null;
  const forwardedByName = typeof meta.forwardedByName === "string" && meta.forwardedByName.trim() ? meta.forwardedByName.trim() : null;
  const locked = Boolean(meta.lockedAfterForwarded);
  return { forwardedAt, forwardedByName, locked };
}

async function assignMidtermReport(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  if (!packageId || !teacherId) {
    redirect("/admin/reports/midterm?err=missing");
  }

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: {
      txns: { where: { kind: "DEDUCT" }, select: { id: true } },
    },
  });
  if (!pkg || pkg.type !== "HOURS") {
    redirect("/admin/reports/midterm?err=pkg");
  }

  const total = Math.max(0, Number(pkg.totalMinutes ?? 0));
  const remaining = Math.max(0, Number(pkg.remainingMinutes ?? 0));
  const consumed = Math.max(0, total - remaining);
  const progress = total > 0 ? Math.round((consumed / total) * 100) : 0;

  const latestAttendance = await prisma.attendance.findFirst({
    where: { packageId, session: { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } },
    orderBy: { session: { startAt: "desc" } },
    include: { session: { include: { class: { select: { subjectId: true } } } } },
  });
  const subjectId = latestAttendance?.session.class.subjectId ?? null;

  const pending = await prisma.midtermReport.findFirst({
    where: { packageId, status: "ASSIGNED" },
    orderBy: { createdAt: "desc" },
  });
  if (pending) {
    await prisma.midtermReport.update({
      where: { id: pending.id },
      data: {
        teacherId,
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
        studentId: pkg.studentId,
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

  const [candidates, reports] = await Promise.all([
    loadMidtermCandidates(),
    prisma.midtermReport.findMany({
      include: {
        student: true,
        teacher: true,
        course: true,
        subject: true,
      },
      orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
      take: 300,
    }),
  ]);

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>{t(lang, "Midterm Report Center", "中期报告中心")}</h2>
      <div style={{ color: "#666", marginBottom: 10 }}>
        {t(
          lang,
          "Detect students near half-package progress and assign report writing to the subject teacher.",
          "系统会自动识别接近课时包半程的学生，教务可一键指派给任课老师填写中期报告。"
        )}
      </div>
      {ok === "assigned" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Assigned successfully.", "已成功推送给老师。")}
        </div>
      ) : ok === "forwarded" ? (
        <div style={{ background: "#ecfdf3", border: "1px solid #34d399", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Marked as forwarded and locked.", "已标记为已转发并已锁定。")}
        </div>
      ) : null}
      {err ? (
        <div style={{ background: "#fff1f2", border: "1px solid #fb7185", borderRadius: 8, padding: "6px 8px", marginBottom: 10 }}>
          {t(lang, "Operation failed. Please retry.", "操作失败，请重试。")}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #fecaca",
          background: "#fff7ed",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 800, color: "#9a3412", marginBottom: 8 }}>{t(lang, "Candidates Near Midpoint", "接近中期报告节点")}</div>
        {candidates.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No candidates for now.", "当前没有候选学生。")}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff" }}>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Student", "学生")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Course", "课程")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Progress", "进度")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Teacher", "推送老师")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Action", "操作")}
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((row) => (
                <tr key={row.packageId} style={{ borderTop: "1px solid #fed7aa" }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>{row.studentName}</td>
                  <td style={{ padding: 6 }}>{row.courseName}</td>
                  <td style={{ padding: 6 }}>
                    <b>{row.progressPercent}%</b> ({formatMinutesToHours(row.consumedMinutes)}h / {formatMinutesToHours(row.totalMinutes)}h)
                  </td>
                  <td style={{ padding: 6 }}>
                    <form action={assignMidtermReport} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="hidden" name="packageId" value={row.packageId} />
                      <select name="teacherId" defaultValue={row.defaultTeacherId}>
                        {row.teacherOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                            {opt.subjectName ? ` (${opt.subjectName})` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="submit">{t(lang, "Push", "推送")}</button>
                    </form>
                  </td>
                  <td style={{ padding: 6 }}>
                    {row.latestReportStatus === "ASSIGNED" ? (
                      <span style={{ color: "#a16207", fontWeight: 700 }}>{t(lang, "Already assigned", "已推送待提交")}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 8 }}>{t(lang, "Assigned & Submitted Reports", "已推送与已提交报告")}</div>
        {reports.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No report records.", "暂无报告记录。")}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff" }}>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Student", "学生")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Teacher", "老师")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Course", "课程")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Progress", "进度快照")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Status", "状态")}
                </th>
                <th align="left" style={{ padding: 6 }}>
                  {t(lang, "Action", "操作")}
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const forwardMeta = readForwardMeta(r.reportJson);
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #dbeafe" }}>
                    <td style={{ padding: 6, fontWeight: 700 }}>{r.student.name}</td>
                    <td style={{ padding: 6 }}>{r.teacher.name}</td>
                    <td style={{ padding: 6 }}>
                      {r.course.name}
                      {r.subject ? ` / ${r.subject.name}` : ""}
                    </td>
                    <td style={{ padding: 6 }}>
                      {r.progressPercent}% ({formatMinutesToHours(r.consumedMinutes)}h / {formatMinutesToHours(r.totalMinutes)}h)
                    </td>
                    <td style={{ padding: 6 }}>
                      {forwardMeta.locked ? (
                        <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{t(lang, "Forwarded & Locked", "已转发已锁定")}</span>
                      ) : r.status === "SUBMITTED" ? (
                        <span style={{ color: "#166534", fontWeight: 700 }}>{t(lang, "Submitted", "已提交")}</span>
                      ) : (
                        <span style={{ color: "#92400e", fontWeight: 700 }}>{t(lang, "Assigned", "待老师填写")}</span>
                      )}
                    </td>
                    <td style={{ padding: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <a href={`/api/admin/midterm-reports/${encodeURIComponent(r.id)}/pdf`}>{t(lang, "Download PDF", "下载PDF")}</a>
                        {forwardMeta.locked ? (
                          <span style={{ color: "#1d4ed8", fontSize: 12 }}>
                            {t(lang, "Forwarded", "已转发")}: {forwardMeta.forwardedAt ? new Date(forwardMeta.forwardedAt).toLocaleString() : "-"} (
                            {forwardMeta.forwardedByName || "-"})
                          </span>
                        ) : r.status === "SUBMITTED" ? (
                          <form action={markForwardedAndLock}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button type="submit">{t(lang, "Mark Forwarded + Lock", "标记已转发并锁定")}</button>
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


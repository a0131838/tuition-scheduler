import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/date-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Search = {
  limit?: string;
  msg?: string;
  err?: string;
};

function toLimit(v?: string) {
  const n = Number(v ?? "200");
  if (!Number.isFinite(n)) return 200;
  return Math.max(10, Math.min(1000, Math.round(n)));
}

type AnomalyRow = {
  attendanceId: string;
  updatedAt: Date;
  studentId: string;
  studentName: string;
  sessionId: string;
  sessionStartAt: Date;
  sessionEndAt: Date;
  sessionCourseId: string;
  sessionCourseName: string;
  packageId: string;
  packageOwnerId: string;
  packageOwnerName: string;
  packageCourseId: string;
  deductedMinutes: number;
  studentOk: boolean;
  courseOk: boolean;
};

function isSharedStudent(pkg: {
  studentId: string;
  sharedStudents: Array<{ studentId: string }>;
}, studentId: string) {
  return pkg.studentId === studentId || pkg.sharedStudents.some((x) => x.studentId === studentId);
}

function isSharedCourse(pkg: {
  courseId: string;
  sharedCourses: Array<{ courseId: string }>;
}, courseId: string) {
  return pkg.courseId === courseId || pkg.sharedCourses.some((x) => x.courseId === courseId);
}

async function loadAnomalies(limit: number): Promise<AnomalyRow[]> {
  const rows = await prisma.attendance.findMany({
    where: { packageId: { not: null } },
    include: {
      student: { select: { id: true, name: true } },
      package: {
        select: {
          id: true,
          studentId: true,
          courseId: true,
          sharedStudents: { select: { studentId: true } },
          sharedCourses: { select: { courseId: true } },
          student: { select: { id: true, name: true } },
        },
      },
      session: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          class: { select: { courseId: true, course: { select: { name: true } } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: Math.max(limit * 5, 100),
  });

  const out: AnomalyRow[] = [];
  for (const r of rows) {
    if (!r.package) continue;
    const studentOk = isSharedStudent(r.package, r.studentId);
    const courseOk = isSharedCourse(r.package, r.session.class.courseId);
    if (studentOk && courseOk) continue;

    out.push({
      attendanceId: r.id,
      updatedAt: r.updatedAt,
      studentId: r.studentId,
      studentName: r.student.name,
      sessionId: r.sessionId,
      sessionStartAt: r.session.startAt,
      sessionEndAt: r.session.endAt,
      sessionCourseId: r.session.class.courseId,
      sessionCourseName: r.session.class.course.name,
      packageId: r.package.id,
      packageOwnerId: r.package.studentId,
      packageOwnerName: r.package.student.name,
      packageCourseId: r.package.courseId,
      deductedMinutes: r.deductedMinutes,
      studentOk,
      courseOk,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function repairOneInvalidBinding(attendanceId: string, actor: { email: string; name: string; role: string }) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        student: { select: { id: true, name: true } },
        package: {
          include: {
            student: { select: { id: true, name: true } },
            sharedStudents: { select: { studentId: true } },
            sharedCourses: { select: { courseId: true } },
          },
        },
        session: { select: { id: true, startAt: true, class: { select: { courseId: true } } } },
      },
    });
    if (!row) throw new Error("attendance-not-found");
    if (!row.packageId || !row.package) throw new Error("attendance-package-empty");

    const studentOk = isSharedStudent(row.package, row.studentId);
    const courseOk = isSharedCourse(row.package, row.session.class.courseId);
    if (studentOk && courseOk) throw new Error("already-valid");

    const rollbackMinutes = Math.max(0, row.deductedMinutes ?? 0);
    if (rollbackMinutes > 0) {
      await tx.coursePackage.update({
        where: { id: row.packageId },
        data: { remainingMinutes: { increment: rollbackMinutes } },
      });
      await tx.packageTxn.create({
        data: {
          packageId: row.packageId,
          kind: "ROLLBACK",
          deltaMinutes: rollbackMinutes,
          sessionId: row.sessionId,
          note: `Data repair rollback invalid package binding. attendanceId=${attendanceId} studentId=${row.studentId}`,
        },
      });
    }

    await tx.attendance.update({
      where: { id: attendanceId },
      data: {
        deductedMinutes: 0,
        deductedCount: 0,
        packageId: null,
        waiveDeduction: true,
        waiveReason: `Historical data repair: invalid package binding fixed on ${new Date().toISOString()}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorEmail: actor.email.trim().toLowerCase(),
        actorName: actor.name,
        actorRole: actor.role,
        module: "ATTENDANCE",
        action: "HISTORICAL_REPAIR_INVALID_PACKAGE_BINDING",
        entityType: "Attendance",
        entityId: attendanceId,
        meta: {
          attendanceId,
          sessionId: row.sessionId,
          studentId: row.studentId,
          studentName: row.student.name,
          wrongPackageId: row.packageId,
          wrongPackageOwnerId: row.package.studentId,
          rollbackMinutes,
        },
      },
    });
  });
}

async function repairOneAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const attendanceId = String(formData.get("attendanceId") ?? "").trim();
  const limit = toLimit(String(formData.get("limit") ?? ""));
  if (!attendanceId) redirect(`/admin/reports/package-sharing-audit?limit=${limit}&err=missing-id`);
  try {
    await repairOneInvalidBinding(attendanceId, { email: user.email, name: user.name, role: user.role });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "repair-failed";
    redirect(`/admin/reports/package-sharing-audit?limit=${limit}&err=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/admin/reports/package-sharing-audit");
  redirect(`/admin/reports/package-sharing-audit?limit=${limit}&msg=repaired`);
}

async function repairAllAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const limit = toLimit(String(formData.get("limit") ?? ""));
  const ids = Array.from(
    new Set(
      formData
        .getAll("attendanceIds")
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  );
  if (ids.length === 0) redirect(`/admin/reports/package-sharing-audit?limit=${limit}&err=no-selected`);

  let ok = 0;
  const failed: string[] = [];
  for (const attendanceId of ids) {
    try {
      await repairOneInvalidBinding(attendanceId, { email: user.email, name: user.name, role: user.role });
      ok++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "repair-failed";
      failed.push(`${attendanceId}:${msg}`);
    }
  }

  revalidatePath("/admin/reports/package-sharing-audit");
  const failBrief = failed.length ? `&fail=${encodeURIComponent(failed.slice(0, 10).join(";"))}` : "";
  redirect(`/admin/reports/package-sharing-audit?limit=${limit}&msg=batch-repaired-${ok}${failBrief}`);
}

export default async function PackageSharingAuditPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const limit = toLimit(sp?.limit);
  const msg = String(sp?.msg ?? "");
  const err = String(sp?.err ?? "");

  const anomalies = await loadAnomalies(limit);

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
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Package Sharing Audit / 共享课包审计</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Package Sharing Audit", "共享课包审计")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Use this desk to inspect abnormal bindings first, then repair one-by-one or in batch from the current list.", "先在这里确认异常绑定，再按当前列表逐条或批量修复。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Loaded anomalies", "当前异常")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{anomalies.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Limit", "数量上限")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{limit}</div>
          </div>
        </div>
      </div>
      <div style={{ color: "#666", marginBottom: 8 }}>
        {t(
          lang,
          "Check and repair records where a student used a package without valid shared-student/shared-course relation.",
          "检查并修复：学生使用了未满足共享学生/共享课程关系的课包记录。"
        )}
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
        <a href="#package-sharing-filters">{t(lang, "Filters", "筛选")}</a>
        <a href="#package-sharing-list">{t(lang, "Anomalies", "异常列表")}</a>
      </div>

      <form id="package-sharing-filters" method="GET" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, scrollMarginTop: 96 }}>
        <label>
          {t(lang, "Limit", "数量上限")}:
          <input name="limit" type="number" min={10} max={1000} defaultValue={String(limit)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>

      {msg ? <div style={{ color: "#065f46", marginBottom: 8 }}>{msg}</div> : null}
      {err ? <div style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</div> : null}
      <div style={{ marginBottom: 10, color: "#374151" }}>
        {t(lang, "Anomaly Count", "异常数量")}: <b>{anomalies.length}</b>
      </div>

      {anomalies.length === 0 ? (
        <div style={{ color: "#6b7280" }}>{t(lang, "No anomalies found.", "未发现异常。")}</div>
      ) : (
        <>
          <form action={repairAllAction} style={{ marginBottom: 8 }}>
            <input type="hidden" name="limit" value={String(limit)} />
            {anomalies.map((x) => (
              <input key={x.attendanceId} type="hidden" name="attendanceIds" value={x.attendanceId} />
            ))}
            <button type="submit">{t(lang, "Repair All Listed", "修复当前列表全部")}</button>
          </form>

          <table id="package-sharing-list" cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", scrollMarginTop: 96 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Time", "时间")}</th>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Session", "课次")}</th>
                <th align="left">{t(lang, "Wrong Package", "错误课包")}</th>
                <th align="left">{t(lang, "Issue", "问题")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((x) => (
                <tr key={x.attendanceId} style={{ borderTop: "1px solid #e5e7eb", verticalAlign: "top" }}>
                  <td>{formatBusinessDateTime(new Date(x.updatedAt))}</td>
                  <td>
                    <div>{x.studentName}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{x.studentId}</div>
                  </td>
                  <td>
                    <div>{formatBusinessDateTime(new Date(x.sessionStartAt))} - {formatBusinessDateTime(new Date(x.sessionEndAt))}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{x.sessionCourseName}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{x.sessionId}</div>
                  </td>
                  <td>
                    <div>{x.packageOwnerName}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{x.packageId}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      {t(lang, "Deducted", "已扣")} {x.deductedMinutes}m
                    </div>
                  </td>
                  <td style={{ color: "#b91c1c", fontWeight: 700 }}>
                    {!x.studentOk ? t(lang, "Student not shared", "未共享学生") : ""}
                    {!x.studentOk && !x.courseOk ? " + " : ""}
                    {!x.courseOk ? t(lang, "Course not shared", "未共享课程") : ""}
                  </td>
                  <td>
                    <form action={repairOneAction}>
                      <input type="hidden" name="attendanceId" value={x.attendanceId} />
                      <input type="hidden" name="limit" value={String(limit)} />
                      <button type="submit">{t(lang, "Repair", "修复")}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

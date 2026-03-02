import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { isGroupPackNote } from "@/lib/package-mode";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { logAudit } from "@/lib/audit-log";
import { PackageStatus, PackageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DEDUCT_STATUSES = new Set(["PRESENT", "LATE", "ABSENT"]);

function isCompletedSession(x: {
  session: {
    teacherId: string | null;
    class: { teacherId: string };
    attendances: Array<{ status: string }>;
    feedbacks: Array<{ teacherId: string; content: string }>;
  };
}) {
  const hasRows = x.session.attendances.length > 0;
  const allMarked = x.session.attendances.every((a) => a.status !== "UNMARKED");
  const effectiveTeacherId = x.session.teacherId ?? x.session.class.teacherId;
  const hasFeedback = x.session.feedbacks.some(
    (f) => f.teacherId === effectiveTeacherId && String(f.content ?? "").trim().length > 0
  );
  return hasRows && allMarked && hasFeedback;
}

function durationMinutes(startAt: Date, endAt: Date) {
  return Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

async function autoFixDeductAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const attendanceId = String(formData.get("attendanceId") ?? "").trim();
  if (!attendanceId) redirect("/admin/reports/undeducted-completed?err=missing-id");

  const row = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      student: { select: { id: true, name: true } },
      session: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          teacherId: true,
          class: {
            select: {
              teacherId: true,
              capacity: true,
              courseId: true,
            },
          },
        },
      },
    },
  });
  if (!row) redirect("/admin/reports/undeducted-completed?err=not-found");
  if (!DEDUCT_STATUSES.has(row.status)) redirect("/admin/reports/undeducted-completed?err=bad-status");

  const isGroupClass = row.session.class.capacity !== 1;
  const needUnits = isGroupClass ? 1 : durationMinutes(row.session.startAt, row.session.endAt);
  if (needUnits <= 0) redirect("/admin/reports/undeducted-completed?err=invalid-duration");
  let fixedPackageId = "";

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.attendance.findUnique({
        where: { id: attendanceId },
        select: {
          id: true,
          studentId: true,
          sessionId: true,
          status: true,
          deductedMinutes: true,
          deductedCount: true,
        },
      });
      if (!current) throw new Error("Attendance not found");
      if (!DEDUCT_STATUSES.has(current.status)) throw new Error("Attendance status not deductible");
      if ((current.deductedMinutes ?? 0) > 0 || (current.deductedCount ?? 0) > 0) throw new Error("Attendance already deducted");

      const pkgMatches = await tx.coursePackage.findMany({
        where: {
          ...coursePackageAccessibleByStudent(current.studentId),
          AND: [coursePackageMatchesCourse(row.session.class.courseId)],
          type: PackageType.HOURS,
          status: PackageStatus.ACTIVE,
          remainingMinutes: { gte: Math.max(1, needUnits) },
          validFrom: { lte: row.session.startAt },
          OR: [{ validTo: null }, { validTo: { gte: row.session.startAt } }],
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          note: true,
          studentId: true,
          sharedStudents: {
            where: { studentId: current.studentId },
            select: { id: true },
          },
        },
      });
      const modeMatched = pkgMatches.filter((p) => (isGroupClass ? isGroupPackNote(p.note) : !isGroupPackNote(p.note)));
      const picked =
        modeMatched.find((p) => p.studentId === current.studentId) ??
        modeMatched.find((p) => p.sharedStudents.length > 0) ??
        null;
      if (!picked) throw new Error("No active package available for auto deduction");
      if (picked.studentId !== current.studentId && picked.sharedStudents.length === 0) {
        throw new Error("Auto pick package ownership validation failed");
      }
      fixedPackageId = picked.id;

      await tx.coursePackage.update({
        where: { id: picked.id },
        data: { remainingMinutes: { decrement: needUnits } },
      });
      await tx.packageTxn.create({
        data: {
          packageId: picked.id,
          kind: "DEDUCT",
          deltaMinutes: -needUnits,
          sessionId: row.session.id,
          note: `Auto repair from undeducted completed report. attendanceId=${attendanceId}`,
        },
      });
      await tx.attendance.update({
        where: { id: attendanceId },
        data: {
          packageId: picked.id,
          deductedMinutes: isGroupClass ? 0 : needUnits,
          deductedCount: isGroupClass ? 1 : 0,
          waiveDeduction: false,
          waiveReason: null,
        },
      });
    });
  } catch (e: any) {
    const msg = encodeURIComponent(String(e?.message ?? "auto-fix-failed"));
    redirect(`/admin/reports/undeducted-completed?err=${msg}`);
  }

  await logAudit({
    actor: admin,
    module: "ATTENDANCE",
    action: "REPAIR_AUTO_DEDUCT",
    entityType: "Attendance",
    entityId: attendanceId,
    meta: { attendanceId, studentId: row.student.id, sessionId: row.session.id },
  });
  revalidatePath("/admin/reports/undeducted-completed");
  if (fixedPackageId) {
    revalidatePath(`/admin/packages/${fixedPackageId}/ledger`);
    redirect(`/admin/packages/${fixedPackageId}/ledger?msg=${encodeURIComponent("Auto deduction fixed")}`);
  }
  redirect("/admin/reports/undeducted-completed?msg=auto-fixed");
}

async function markWaiveAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const attendanceId = String(formData.get("attendanceId") ?? "").trim();
  const waiveReason = String(formData.get("waiveReason") ?? "").trim();
  if (!attendanceId) redirect("/admin/reports/undeducted-completed?err=missing-id");
  if (!waiveReason) redirect("/admin/reports/undeducted-completed?err=missing-waive-reason");

  const current = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true, deductedMinutes: true, deductedCount: true, sessionId: true, studentId: true },
  });
  if (!current) redirect("/admin/reports/undeducted-completed?err=not-found");
  if ((current.deductedMinutes ?? 0) > 0 || (current.deductedCount ?? 0) > 0) {
    redirect("/admin/reports/undeducted-completed?err=already-deducted");
  }

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      waiveDeduction: true,
      waiveReason,
      packageId: null,
      deductedMinutes: 0,
      deductedCount: 0,
    },
  });

  await logAudit({
    actor: admin,
    module: "ATTENDANCE",
    action: "WAIVE_DEDUCTION",
    entityType: "Attendance",
    entityId: attendanceId,
    meta: { attendanceId, studentId: current.studentId, sessionId: current.sessionId, waiveReason },
  });
  revalidatePath("/admin/reports/undeducted-completed");
  redirect("/admin/reports/undeducted-completed?msg=waived");
}

export default async function UndeductedCompletedReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; limit?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const limitRaw = Number(sp?.limit ?? 200);
  const limit = Number.isFinite(limitRaw) ? Math.max(50, Math.min(2000, Math.floor(limitRaw))) : 200;

  const candidates = await prisma.attendance.findMany({
    where: {
      status: { in: ["PRESENT", "LATE", "ABSENT"] },
      deductedMinutes: 0,
      deductedCount: 0,
      waiveDeduction: false,
    },
    include: {
      student: { select: { id: true, name: true } },
      package: { select: { id: true, type: true } },
      session: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
          teacherId: true,
          teacher: { select: { id: true, name: true } },
          class: {
            select: {
              id: true,
              capacity: true,
              teacherId: true,
              teacher: { select: { id: true, name: true } },
              course: { select: { name: true } },
              subject: { select: { name: true } },
              level: { select: { name: true } },
              campus: { select: { name: true } },
              room: { select: { name: true } },
            },
          },
          attendances: { select: { status: true } },
          feedbacks: { select: { teacherId: true, content: true } },
        },
      },
    },
    orderBy: [{ session: { startAt: "desc" } }],
    take: limit,
  });

  const rows = candidates.filter(isCompletedSession);

  return (
    <div>
      <h2>{t(lang, "Completed But Undeducted", "已完成但未减扣")}</h2>
      <div style={{ marginBottom: 12, color: "#64748b" }}>
        {t(lang, "Count", "数量")}: <b>{rows.length}</b>
      </div>
      {sp?.msg === "auto-fixed" ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Auto fix applied.", "已自动补扣。")}</div> : null}
      {sp?.msg === "waived" ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Waive marked.", "已标记为免扣。")}</div> : null}
      {sp?.err ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Error", "错误")}: {sp.err}</div> : null}

      <form method="GET" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Limit:
          <input name="limit" type="number" min={50} max={2000} defaultValue={String(limit)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No anomaly rows.", "暂无异常记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Session Time", "课次时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Campus/Room", "校区/教室")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Deduct", "减扣")}</th>
              <th align="left">{t(lang, "Fix", "修复")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(r.session.startAt).toLocaleString()}</td>
                <td>
                  {r.student.name}
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{r.student.id}</div>
                </td>
                <td>{r.session.teacher?.name ?? r.session.class.teacher.name}</td>
                <td>
                  {r.session.class.course.name} / {r.session.class.subject?.name ?? "-"} / {r.session.class.level?.name ?? "-"}
                </td>
                <td>{r.session.class.campus.name} / {r.session.class.room?.name ?? "(none)"}</td>
                <td>{r.status}</td>
                <td style={{ color: "#b91c1c", fontWeight: 700 }}>
                  {r.deductedCount} / {r.deductedMinutes}
                </td>
                <td>
                  <div style={{ display: "grid", gap: 6, alignItems: "start" }}>
                    <form action={autoFixDeductAction}>
                      <input type="hidden" name="attendanceId" value={r.id} />
                      <button type="submit">{t(lang, "Auto Bind + Deduct", "自动绑定并补扣")}</button>
                    </form>
                    <form action={markWaiveAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="attendanceId" value={r.id} />
                      <input name="waiveReason" required placeholder={t(lang, "Waive reason", "免扣原因")} style={{ width: 180 }} />
                      <button type="submit">{t(lang, "Mark Waive", "标记免扣")}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

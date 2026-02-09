import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AttendanceStatus, PackageType, PackageStatus, Prisma } from "@prisma/client";
import AttendanceEditor, { AttendanceRow } from "./AttendanceEditor";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../../../_components/NoticeBanner";
import { isGroupPackNote, packageModeFromNote } from "@/lib/package-mode";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function buildRedirect(sessionId: string, params: Record<string, string>) {
  const p = new URLSearchParams(params);
  return `/admin/sessions/${sessionId}/attendance?${p.toString()}`;
}

function toInt(v: FormDataEntryValue | null, def = 0) {
  const n = Number(String(v ?? ""));
  return Number.isFinite(n) ? n : def;
}

const DEDUCTABLE_STATUS = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED,
]);

function durationMinutes(startAt: Date, endAt: Date) {
  return Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

function fmtRange(startAt: Date, endAt: Date) {
  const start = new Date(startAt).toLocaleString();
  const end = new Date(endAt).toLocaleString();
  return `${start} -> ${end}`;
}

function isNextRedirectError(e: any) {
  return typeof e?.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");
}

async function pickHoursPackageId(tx: Prisma.TransactionClient, opts: { studentId: string; courseId: string; at: Date }) {
  const { studentId, courseId, at } = opts;

  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      studentId,
      courseId,
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const picked = pkgMatches.find((p) => !isGroupPackNote(p.note));
  return picked?.id ?? null;
}

async function pickGroupPackPackageId(tx: Prisma.TransactionClient, opts: { studentId: string; courseId: string; at: Date }) {
  const { studentId, courseId, at } = opts;
  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      studentId,
      courseId,
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      remainingMinutes: { gt: 0 },
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const picked = pkgMatches.find((p) => isGroupPackNote(p.note));
  return picked?.id ?? null;
}

type ExistingAttendance = {
  studentId: string;
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  packageId: string | null;
  excusedCharge?: boolean;
};

type DesiredAttendance = {
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  note: string | null;
  packageId: string | null;
  excusedCharge: boolean;
};

async function applyOneStudentAttendanceAndDeduct(
  tx: Prisma.TransactionClient,
  opts: {
    sessionId: string;
    courseId: string;
    at: Date; // Use session.startAt for validity check
    studentId: string;
    desired: DesiredAttendance;
    existing?: ExistingAttendance;
    isGroupClass: boolean;
  }
) {
  const { sessionId, courseId, at, studentId, desired, existing, isGroupClass } = opts;

  const prevDm = existing?.deductedMinutes ?? 0;
  const prevDc = existing?.deductedCount ?? 0;
  const nextDmRaw = desired.deductedMinutes;

  // Only deduct when status is eligible; EXCUSED needs excusedCharge=true
  const excusedCharge = desired.status === AttendanceStatus.EXCUSED ? desired.excusedCharge : false;
  const canDeduct =
    desired.status === AttendanceStatus.EXCUSED
      ? excusedCharge
      : DEDUCTABLE_STATUS.has(desired.status);
  const normalizedNextDm = canDeduct ? nextDmRaw : 0;
  const normalizedNextDc = canDeduct ? (isGroupClass ? 1 : Math.max(0, desired.deductedCount)) : 0;
  const delta = isGroupClass ? normalizedNextDc - prevDc : normalizedNextDm - prevDm;

  // Prefer previously used packageId to keep consistency
  let packageId: string | null = desired.packageId ?? existing?.packageId ?? null;

  if (delta !== 0) {
    if (!packageId && delta > 0) {
      packageId = isGroupClass
        ? await pickGroupPackPackageId(tx, { studentId, courseId, at })
        : await pickHoursPackageId(tx, { studentId, courseId, at });
    }

    if (!packageId) {
      throw new Error(
        isGroupClass
          ? `Student ${studentId} has no active GROUP package for this course.`
          : `Student ${studentId} has no active HOURS package to deduct minutes.`
      );
    }

    const pkg = await tx.coursePackage.findFirst({
      where: {
        id: packageId,
        studentId,
        courseId,
        status: PackageStatus.ACTIVE,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gte: at } }],
      },
      select: { id: true, type: true, status: true, remainingMinutes: true, note: true },
    });

    if (!pkg) throw new Error(`Package not found: ${packageId}`);
    if (pkg.type !== PackageType.HOURS) throw new Error(`Selected package is not HOURS: ${packageId}`);
    if (pkg.status !== PackageStatus.ACTIVE) throw new Error(`Package is not ACTIVE: ${packageId}`);
    if (pkg.remainingMinutes == null) throw new Error(`Package remainingMinutes is null (please set it): ${packageId}`);
    const groupPack = isGroupPackNote(pkg.note);
    if (isGroupClass && !groupPack) throw new Error(`Selected package is not GROUP package: ${packageId}`);
    if (!isGroupClass && groupPack) throw new Error(`Selected package is GROUP package and cannot be used for 1-on-1: ${packageId}`);

    if (delta > 0) {
      if (pkg.remainingMinutes < delta) {
        throw new Error(`Not enough balance. package=${packageId}, remaining=${pkg.remainingMinutes}, need=${delta}`);
      }

      await tx.coursePackage.update({
        where: { id: packageId },
        data: { remainingMinutes: { decrement: delta } },
      });

      await tx.packageTxn.create({
        data: {
          packageId,
          kind: "DEDUCT",
          deltaMinutes: -delta,
          sessionId,
          note: isGroupClass
            ? `Auto deduct by attendance save (group count). studentId=${studentId}`
            : `Auto deduct by attendance save (minutes). studentId=${studentId}`,
        },
      });
    } else {
      const refund = -delta;

      await tx.coursePackage.update({
        where: { id: packageId },
        data: { remainingMinutes: { increment: refund } },
      });

      await tx.packageTxn.create({
        data: {
          packageId,
          kind: "ROLLBACK",
          deltaMinutes: refund,
          sessionId,
          note: isGroupClass
            ? `Auto rollback by attendance change (group count). studentId=${studentId}`
            : `Auto rollback by attendance change (minutes). studentId=${studentId}`,
        },
      });
    }
  }

  // Prefer previously used packageId to keep consistency
  const finalDeductedMinutes = isGroupClass ? 0 : normalizedNextDm;
  const finalDeductedCount = isGroupClass ? normalizedNextDc : desired.deductedCount;
  const finalPackageId =
    (isGroupClass ? finalDeductedCount > 0 : finalDeductedMinutes > 0) ? packageId : null;

  await tx.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    create: {
      sessionId,
      studentId,
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
    },
    update: {
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
    },
  });
}

async function saveAttendance(sessionId: string, formData: FormData) {
  "use server";

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        classId: true,
        startAt: true,
        endAt: true,
        studentId: true,
        class: { select: { courseId: true, capacity: true } },
      },
    });
    if (!session) redirect(buildRedirect(sessionId, { err: "Session not found" }));

    const enrollments = await prisma.enrollment.findMany({
      where: { classId: session.classId },
      select: { studentId: true },
    });
    const studentIds =
      session.class.capacity === 1 && session.studentId
        ? [session.studentId]
        : enrollments.map((e) => e.studentId);

    const existingList = await prisma.attendance.findMany({
      where: { sessionId, studentId: { in: studentIds } },
      select: {
        studentId: true,
        status: true,
        deductedMinutes: true,
        deductedCount: true,
        packageId: true,
        excusedCharge: true,
      },
    });
    const existingMap = new Map(existingList.map((a) => [a.studentId, a]));

    const excusedTotals = await prisma.attendance.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        status: AttendanceStatus.EXCUSED,
        NOT: { sessionId },
      },
      _count: { _all: true },
    });
    const excusedCountMap = new Map<string, number>(
      excusedTotals.map((r) => [r.studentId, r._count._all])
    );

    const desiredMap = new Map<string, DesiredAttendance>();
    const isGroupClass = session.class.capacity !== 1;
    for (const studentId of studentIds) {
      const statusRaw = String(formData.get(`status:${studentId}`) ?? "UNMARKED");
      const status = (Object.values(AttendanceStatus) as string[]).includes(statusRaw)
        ? (statusRaw as AttendanceStatus)
        : AttendanceStatus.UNMARKED;

      const deductedCount = Math.max(0, toInt(formData.get(`dc:${studentId}`), 0));
      const deductedMinutes = Math.max(0, toInt(formData.get(`dm:${studentId}`), 0));
      const note = String(formData.get(`note:${studentId}`) ?? "").trim() || null;
      const packageId = String(formData.get(`pkg:${studentId}`) ?? "").trim() || null;
      const excusedCharge = String(formData.get(`charge:${studentId}`) ?? "") === "on";

      const prevExcused = excusedCountMap.get(studentId) ?? 0;
      const nextExcusedCount = prevExcused + (status === AttendanceStatus.EXCUSED ? 1 : 0);
      const excusedEligible = nextExcusedCount >= 4;
      const finalExcusedCharge = status === AttendanceStatus.EXCUSED && excusedEligible ? excusedCharge : false;

      desiredMap.set(studentId, {
        status,
        deductedCount: finalExcusedCharge ? deductedCount : 0,
        deductedMinutes,
        note,
        packageId,
        excusedCharge: finalExcusedCharge,
      });
    }

    let totalDeducted = 0;
    for (const studentId of studentIds) {
      const desired = desiredMap.get(studentId)!;
      const existing = existingMap.get(studentId);
      const canDeduct =
        desired.status === AttendanceStatus.EXCUSED
          ? desired.excusedCharge
          : DEDUCTABLE_STATUS.has(desired.status);
      const prevUnits = isGroupClass ? existing?.deductedCount ?? 0 : existing?.deductedMinutes ?? 0;
      const nextUnits = canDeduct ? (isGroupClass ? 1 : desired.deductedMinutes) : 0;
      const delta = nextUnits - prevUnits;
      if (delta > 0) totalDeducted += delta;
    }

    await prisma.$transaction(async (tx) => {
      for (const studentId of studentIds) {
        const desired = desiredMap.get(studentId)!;
        const existing = existingMap.get(studentId);

        await applyOneStudentAttendanceAndDeduct(tx, {
          sessionId,
          courseId: session.class.courseId,
          at: session.startAt,
          studentId,
          desired,
          existing,
          isGroupClass,
        });
      }
    });

    redirect(
      buildRedirect(sessionId, {
        msg: isGroupClass
          ? `Saved. Deducted ${totalDeducted} class count(s). Remaining shown in table.`
          : `Saved. Deducted ${totalDeducted} minutes. Remaining shown in table.`,
      })
    );
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    redirect(buildRedirect(sessionId, { err: e?.message ?? "Save failed" }));
  }
}

async function markAllPresent(sessionId: string) {
  "use server";

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        classId: true,
        startAt: true,
        endAt: true,
        studentId: true,
        class: { select: { courseId: true, capacity: true } },
      },
    });
    if (!session) redirect(buildRedirect(sessionId, { err: "Session not found" }));

    const enrollments = await prisma.enrollment.findMany({
      where: { classId: session.classId },
      select: { studentId: true },
    });
    const studentIds =
      session.class.capacity === 1 && session.studentId
        ? [session.studentId]
        : enrollments.map((e) => e.studentId);

    const isGroupClass = session.class.capacity !== 1;
    const dm = isGroupClass ? 0 : durationMinutes(session.startAt, session.endAt);

    const existingList = await prisma.attendance.findMany({
      where: { sessionId, studentId: { in: studentIds } },
      select: { studentId: true, status: true, deductedMinutes: true, deductedCount: true, packageId: true },
    });
    const existingMap = new Map(existingList.map((a) => [a.studentId, a]));

    await prisma.$transaction(async (tx) => {
      for (const studentId of studentIds) {
        await applyOneStudentAttendanceAndDeduct(tx, {
          sessionId,
          courseId: session.class.courseId,
          at: session.startAt,
          studentId,
          desired: {
            status: AttendanceStatus.PRESENT,
            deductedCount: isGroupClass ? 1 : 0,
            deductedMinutes: dm,
            note: null,
            packageId: null,
            excusedCharge: false,
          },
          existing: existingMap.get(studentId),
          isGroupClass,
        });
      }
    });

    redirect(
      buildRedirect(sessionId, {
        msg: isGroupClass
          ? `Marked all PRESENT + deducted class count (${studentIds.length})`
          : `Marked all PRESENT + deducted minutes (${studentIds.length})`,
      })
    );
  } catch (e: any) {
    if (isNextRedirectError(e)) throw e;
    redirect(buildRedirect(sessionId, { err: e?.message ?? "Mark all failed" }));
  }
}

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { msg?: string; err?: string };
}) {
  const lang = await getLang();
  const sessionId = params.id;
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
  });

  if (!session) {
    return (
      <div>
        <h2>{t(lang, "Session Not Found", "课次不存在")}</h2>
        <a href="/admin/classes">→ {t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const [enrollments, existing] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classId: session.classId },
      include: { student: true },
      orderBy: [{ studentId: "asc" }],
    }),
    prisma.attendance.findMany({
      where: { sessionId },
      select: {
        studentId: true,
        status: true,
        deductedCount: true,
        deductedMinutes: true,
        note: true,
        packageId: true,
        excusedCharge: true,
      },
    }),
  ]);

  const map = new Map(existing.map((a) => [a.studentId, a]));

  const attendanceEnrollments =
    session.class.capacity === 1 && session.studentId
      ? enrollments.filter((e) => e.studentId === session.studentId)
      : enrollments;
  const studentIds = attendanceEnrollments.map((e) => e.studentId);
  const classIsGroup = session.class.capacity !== 1;
  const packages = await prisma.coursePackage.findMany({
    where: {
      studentId: { in: studentIds },
      courseId: session.class.courseId,
      status: PackageStatus.ACTIVE,
      validFrom: { lte: session.startAt },
      OR: [{ validTo: null }, { validTo: { gte: session.startAt } }],
    },
    orderBy: [{ studentId: "asc" }, { validTo: "asc" }],
  });

  const pkgMap = new Map<string, typeof packages>();
  for (const p of packages) {
    const arr = pkgMap.get(p.studentId) ?? [];
    arr.push(p);
    pkgMap.set(p.studentId, arr);
  }

  const excusedTotals = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      studentId: { in: studentIds },
      status: AttendanceStatus.EXCUSED,
      NOT: { sessionId },
    },
    _count: { _all: true },
  });
  const excusedCountMap = new Map<string, number>(
    excusedTotals.map((r) => [r.studentId, r._count._all])
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>{t(lang, "Attendance", "点名")}</h2>
          <div style={{ color: "#666" }}>{fmtRange(session.startAt, session.endAt)}</div>
          <div style={{ color: "#999", fontSize: 12 }}>(sessionId {session.id})</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <a href={`/admin/classes/${session.classId}/sessions`}>→ {t(lang, "Back to Sessions", "返回课次")}</a>
          <a href={`/admin/classes/${session.classId}`}>→ {t(lang, "Back to Class Detail", "返回班级详情")}</a>
        </div>
      </div>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
          <div style={{ color: "#666", fontSize: 12 }}>{t(lang, "Course", "课程")}</div>
          <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <ClassTypeBadge capacity={session.class.capacity} compact /><span>{session.class.course.name} / {session.class.subject?.name ?? "-"} / {session.class.level?.name ?? "-"}</span>
          </div>
        </div>
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
          <div style={{ color: "#666", fontSize: 12 }}>{t(lang, "Teacher", "老师")}</div>
          <div style={{ fontWeight: 700 }}>{session.teacher?.name ?? session.class.teacher.name}</div>
        </div>
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
          <div style={{ color: "#666", fontSize: 12 }}>{t(lang, "Campus / Room", "校区 / 教室")}</div>
          <div style={{ fontWeight: 700 }}>
            {session.class.campus.name} / {session.class.room?.name ?? "(none)"}
          </div>
        </div>
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
          <div style={{ color: "#666", fontSize: 12 }}>{t(lang, "Enrolled Students", "报名人数")}</div>
          <div style={{ fontWeight: 700 }}>{attendanceEnrollments.length}</div>
        </div>
      </div>
      {session.class.capacity === 1 && !session.studentId && (
        <div style={{ padding: 10, border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8 }}>
          {t(
            lang,
            "This is a 1-on-1 session without a student assigned. Please assign the student in class sessions page.",
            "这是一个未选择学生的一对一课次，请先在班级课次页面选择学生。"
          )}
        </div>
      )}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Attendance Editor", "点名编辑")}</div>
          {attendanceEnrollments.length > 0 && (
            <form action={markAllPresent.bind(null, sessionId)}>
              <button type="submit">{t(lang, "Mark All Present (deductCount=1)", "全部标记到课(扣1次)")}</button>
            </form>
          )}
        </div>

        {attendanceEnrollments.length === 0 ? (
          <div style={{ color: "#999" }}>
            {t(lang, "No enrolled students in this class yet.", "本班暂无报名学生。")}{" "}
            {t(lang, "Please add students in class detail.", "请先在班级详情页添加学生。")}
          </div>
        ) : (
          <form action={saveAttendance.bind(null, sessionId)}>
            <AttendanceEditor
              lang={lang}
              rows={attendanceEnrollments.map((e) => {
                const a = map.get(e.studentId);
                const prevExcused = excusedCountMap.get(e.studentId) ?? 0;
                const opts = (pkgMap.get(e.studentId) ?? [])
                  .filter((p) => {
                    if (p.type !== "HOURS") return false;
                    const isGroupPack = packageModeFromNote(p.note) === "GROUP_COUNT";
                    return classIsGroup ? isGroupPack : !isGroupPack;
                  })
                  .map((p) => ({
                    id: p.id,
                    label:
                      packageModeFromNote(p.note) === "GROUP_COUNT"
                        ? `GROUP (${p.remainingMinutes ?? 0} cls)`
                        : `HOURS (${p.remainingMinutes ?? 0}m)`,
                    remainingMinutes: p.remainingMinutes,
                    billingMode: packageModeFromNote(p.note) === "GROUP_COUNT" ? "COUNT" : "MINUTES",
                    validToLabel: p.validTo ? new Date(p.validTo).toLocaleDateString() : null,
                  }));
                return {
                  studentId: e.studentId,
                  studentName: e.student?.name ?? "-",
                  status: a?.status ?? AttendanceStatus.UNMARKED,
                  deductedCount: a?.deductedCount ?? 0,
                  deductedMinutes: a?.deductedMinutes ?? 0,
                  note: a?.note ?? "",
                  packageId: a?.packageId ?? (opts[0]?.id ?? ""),
                  excusedCharge: a?.excusedCharge ?? false,
                  excusedBaseCount: prevExcused,
                  packageOptions: opts,
                } as AttendanceRow;
              })}
            />
          </form>
        )}
      </div>
    </div>
  );
}








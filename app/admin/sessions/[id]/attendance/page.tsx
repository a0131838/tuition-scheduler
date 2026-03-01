import { prisma } from "@/lib/prisma";
import { AttendanceStatus, PackageStatus } from "@prisma/client";
import { AttendanceRow } from "./AttendanceEditor";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../../../_components/NoticeBanner";
import { packageModeFromNote } from "@/lib/package-mode";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import AdminSessionAttendanceClient from "./AdminSessionAttendanceClient";

function fmtRange(startAt: Date, endAt: Date) {
  const start = new Date(startAt).toLocaleString();
  const end = new Date(endAt).toLocaleString();
  return `${start} -> ${end}`;
}

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { id: sessionId } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

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
      AND: [
        {
          OR: [
            { studentId: { in: studentIds } },
            { sharedStudents: { some: { studentId: { in: studentIds } } } },
          ],
        },
        {
          OR: [
            { courseId: session.class.courseId },
            { sharedCourses: { some: { courseId: session.class.courseId } } },
          ],
        },
        { OR: [{ validTo: null }, { validTo: { gte: session.startAt } }] },
      ],
      status: PackageStatus.ACTIVE,
      validFrom: { lte: session.startAt },
    },
    orderBy: [{ studentId: "asc" }, { validTo: "asc" }],
    include: { sharedStudents: { select: { studentId: true } }, sharedCourses: { select: { courseId: true } } },
  });

  const pkgMap = new Map<string, typeof packages>();
  for (const p of packages) {
    const targetIds = new Set<string>([p.studentId, ...p.sharedStudents.map((s) => s.studentId)]);
    for (const targetId of targetIds) {
      const arr = pkgMap.get(targetId) ?? [];
      arr.push(p);
      pkgMap.set(targetId, arr);
    }
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
        {attendanceEnrollments.length === 0 ? (
          <div style={{ color: "#999" }}>
            {t(lang, "No enrolled students in this class yet.", "本班暂无报名学生。")}{" "}
            {t(lang, "Please add students in class detail.", "请先在班级详情页添加学生。")}
          </div>
        ) : (
          <AdminSessionAttendanceClient
            sessionId={sessionId}
            lang={lang}
            canMarkAll={attendanceEnrollments.length > 0}
            labels={{
              title: t(lang, "Attendance Editor", "点名编辑"),
              markAllPresent: t(lang, "Mark All Present (deductCount=1)", "全部标记到课(扣1次)"),
              save: t(lang, "Save", "保存"),
              saving: t(lang, "Saving...", "保存中..."),
              saveErrorPrefix: t(lang, "Error", "错误"),
              markAllErrorPrefix: t(lang, "Error", "错误"),
            }}
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
        )}
      </div>
    </div>
  );
}








import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import {
  ACADEMIC_MANAGEMENT_LOOKAHEAD_DAYS,
  ACADEMIC_STUDENT_LANES,
  academicLanePackageWarning,
  academicProfileCompleteness,
  academicRiskLabel,
  academicStudentLaneLabel,
  matchesAcademicStudentLane,
  normalizeAcademicStudentLane,
  requiresMonthlyAcademicReport,
  servicePlanLabel,
  studentAcademicStudentLane,
} from "@/lib/academic-management";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toDateRange(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNo = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthNo) || monthNo < 1 || monthNo > 12) return null;
  return {
    start: new Date(year, monthNo - 1, 1, 0, 0, 0, 0),
    end: new Date(year, monthNo, 1, 0, 0, 0, 0),
  };
}

function fmtMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function sessionStudentIds(session: any) {
  return new Set<string>(
    [
      session.studentId,
      session.class?.oneOnOneStudentId,
      ...(session.class?.enrollments ?? []).map((enrollment: any) => enrollment.studentId),
    ].filter(Boolean)
  );
}

export default async function AcademicManagementReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; lane?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const now = new Date();
  const month = sp?.month ?? monthKey(now);
  const lane = normalizeAcademicStudentLane(sp?.lane);
  const range = toDateRange(month);

  if (!range) {
    return (
      <div>
        <h2>{t(lang, "Academic Management Monthly Report", "学业管理月报")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const activePackagesRaw = await prisma.coursePackage.findMany({
    where: {
      type: "HOURS",
      status: "ACTIVE",
      remainingMinutes: { gt: 0 },
    },
    include: { student: { include: { studentType: true, sourceChannel: true } } },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  const activePackages = activePackagesRaw.filter((pkg) =>
    matchesAcademicStudentLane({ studentTypeName: pkg.student?.studentType?.name }, lane)
  );

  const activeStudentIds = Array.from(new Set(activePackages.map((pkg) => pkg.studentId).filter(Boolean)));
  const lookaheadEnd = new Date(now.getTime() + ACADEMIC_MANAGEMENT_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const [monthSessions, upcomingSessions] = activeStudentIds.length
    ? await Promise.all([
        prisma.session.findMany({
          where: {
            startAt: { gte: range.start, lt: range.end },
            OR: [
              { studentId: { in: activeStudentIds } },
              { class: { oneOnOneStudentId: { in: activeStudentIds } } },
              { class: { enrollments: { some: { studentId: { in: activeStudentIds } } } } },
            ],
          },
          include: {
            feedbacks: true,
            class: {
              include: {
                enrollments: { select: { studentId: true } },
              },
            },
          },
          orderBy: { startAt: "asc" },
          take: 5000,
        }),
        prisma.session.findMany({
          where: {
            startAt: { gte: now, lt: lookaheadEnd },
            OR: [
              { studentId: { in: activeStudentIds } },
              { class: { oneOnOneStudentId: { in: activeStudentIds } } },
              { class: { enrollments: { some: { studentId: { in: activeStudentIds } } } } },
            ],
          },
          include: {
            class: { include: { enrollments: { select: { studentId: true } } } },
          },
          orderBy: { startAt: "asc" },
          take: 5000,
        }),
      ])
    : [[], []];

  const byStudent = new Map<string, {
    student: (typeof activePackages)[number]["student"];
    packageCount: number;
    remainingMinutes: number;
    monthLessons: number;
    feedbackCount: number;
    latestLessonAt: Date | null;
    nextLessonAt: Date | null;
    settlementModes: Array<string | null>;
  }>();

  for (const pkg of activePackages) {
    if (!pkg.student) continue;
    const existing = byStudent.get(pkg.studentId) ?? {
      student: pkg.student,
      packageCount: 0,
      remainingMinutes: 0,
      monthLessons: 0,
      feedbackCount: 0,
      latestLessonAt: null,
      nextLessonAt: null,
      settlementModes: [],
    };
    existing.packageCount += 1;
    existing.remainingMinutes += pkg.remainingMinutes ?? 0;
    existing.settlementModes.push(pkg.settlementMode ?? null);
    byStudent.set(pkg.studentId, existing);
  }

  for (const session of monthSessions) {
    for (const studentId of sessionStudentIds(session)) {
      const row = byStudent.get(studentId);
      if (!row) continue;
      row.monthLessons += 1;
      row.feedbackCount += session.feedbacks.length;
      if (!row.latestLessonAt || session.startAt > row.latestLessonAt) row.latestLessonAt = session.startAt;
    }
  }

  for (const session of upcomingSessions) {
    for (const studentId of sessionStudentIds(session)) {
      const row = byStudent.get(studentId);
      if (!row) continue;
      if (!row.nextLessonAt || session.startAt < row.nextLessonAt) row.nextLessonAt = session.startAt;
    }
  }

  const rows = Array.from(byStudent.entries())
    .map(([studentId, row]) => {
      const completeness = academicProfileCompleteness(row.student);
      const monthlyReportNeeded = requiresMonthlyAcademicReport(row.student.servicePlanType);
      const packageWarning = academicLanePackageWarning({
        studentTypeName: row.student.studentType?.name,
        settlementModes: row.settlementModes,
      });
      const attention =
        !row.nextLessonAt ||
        completeness.percent < 70 ||
        row.student.academicRiskLevel === "HIGH" ||
        monthlyReportNeeded ||
        Boolean(row.student.nextActionDue && new Date(row.student.nextActionDue) <= lookaheadEnd);
      return { studentId, ...row, completeness, monthlyReportNeeded, packageWarning, attention };
    })
    .sort((a, b) => Number(b.attention) - Number(a.attention) || a.student.name.localeCompare(b.student.name));

  const attentionCount = rows.filter((row) => row.attention).length;

  return (
    <div>
      <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t(lang, "Academic Management Monthly Report", "学业管理月报")}</h2>
        <p style={{ color: "#475569", marginBottom: 0 }}>
          {t(lang, "Review active-package students by lessons, feedbacks, profile completeness, risk, and next action.", "按课次、反馈、档案完整度、风险和下一步动作复盘有效课包学生。")}
        </p>
      </div>

      <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input type="month" name="month" defaultValue={month} />
        <select name="lane" defaultValue={lane}>
          {ACADEMIC_STUDENT_LANES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.zh}
            </option>
          ))}
        </select>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
        <Link href="/admin/todos">{t(lang, "Todo Center", "今日待办")}</Link>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Active students", "有效课包学生")}</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{rows.length}</div>
        </div>
        <div style={{ border: "1px solid #fecaca", borderRadius: 10, padding: 10 }}>
          <div style={{ color: "#991b1b", fontSize: 12 }}>{t(lang, "Need attention", "需要关注")}</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{attentionCount}</div>
        </div>
        <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, padding: 10 }}>
          <div style={{ color: "#1d4ed8", fontSize: 12 }}>{t(lang, "Student lane", "学生类型")}</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{academicStudentLaneLabel(lane)}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>{month}</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Service / Risk", "服务 / 风险")}</th>
              <th align="left">{t(lang, "This month", "本月")}</th>
              <th align="left">{t(lang, "Next lesson", "下一节课")}</th>
              <th align="left">{t(lang, "Profile", "档案")}</th>
              <th align="left">{t(lang, "Next action", "下一步动作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId} style={{ borderTop: "1px solid #e5e7eb", background: row.attention ? "#fff7ed" : "#fff" }}>
                <td>
                  <Link href={`/admin/students/${row.studentId}`} style={{ fontWeight: 800 }}>
                    {row.student.name}
                  </Link>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{fmtMinutes(row.remainingMinutes)} / {row.packageCount} pkg</div>
                  <div style={{ color: "#334155", fontSize: 12, fontWeight: 700 }}>
                    {academicStudentLaneLabel(
                      studentAcademicStudentLane({
                        studentTypeName: row.student.studentType?.name,
                      })
                    )}
                  </div>
                  {row.packageWarning ? (
                    <div style={{ color: "#c2410c", fontSize: 12, fontWeight: 700 }}>
                      {row.packageWarning}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div>{servicePlanLabel(row.student.servicePlanType)}</div>
                  <div style={{ color: row.student.academicRiskLevel === "HIGH" ? "#be123c" : "#64748b", fontWeight: 700 }}>
                    {academicRiskLabel(row.student.academicRiskLevel)}
                  </div>
                  {row.monthlyReportNeeded ? <div style={{ color: "#1d4ed8", fontSize: 12 }}>{t(lang, "Monthly report required", "服务计划需要月报")}</div> : null}
                </td>
                <td>
                  <div>{t(lang, "Lessons", "课次")}: {row.monthLessons}</div>
                  <div>{t(lang, "Feedbacks", "反馈")}: {row.feedbackCount}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {row.latestLessonAt ? formatBusinessDateOnly(row.latestLessonAt) : "-"}
                  </div>
                </td>
                <td>{row.nextLessonAt ? formatBusinessDateTime(row.nextLessonAt) : <b style={{ color: "#be123c" }}>{t(lang, "No upcoming lesson", "暂无未来课程")}</b>}</td>
                <td>
                  <div style={{ fontWeight: 800, color: row.completeness.percent < 70 ? "#c2410c" : "#166534" }}>
                    {row.completeness.percent}%
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {row.completeness.filled}/{row.completeness.total}
                  </div>
                </td>
                <td>
                  <div style={{ whiteSpace: "pre-wrap" }}>{row.student.nextAction || "-"}</div>
                  {row.student.nextActionDue ? (
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      {t(lang, "Due", "截止")}: {formatBusinessDateOnly(new Date(row.student.nextActionDue))}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

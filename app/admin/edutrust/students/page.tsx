import { StudentContractMode } from "@prisma/client";
import { getLang, t } from "@/lib/i18n";
import {
  isEduTrustCourseContractReady,
  isEduTrustPackageHoursReady,
  studentContractModeLabel,
} from "@/lib/edutrust-student-record";
import { prisma } from "@/lib/prisma";
import EduTrustStudentRecordsClient from "./EduTrustStudentRecordsClient";

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function hours(minutes: number | null | undefined) {
  return minutes == null ? null : Math.round((minutes / 60) * 10) / 10;
}

function recordDraft(input: {
  studentId: string;
  courseId: string;
  packageId: string;
  record?: {
    status: string;
    diagnosticAssessment: string | null;
    individualLearningPlan: string | null;
    progressReview: string | null;
    finalAssessment: string | null;
    completionRecord: string | null;
    attendanceEvidenceNote: string | null;
    contractEvidenceNote: string | null;
    outcomeSummary: string | null;
    externalOutcome: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  } | null;
}) {
  return {
    studentId: input.studentId,
    courseId: input.courseId,
    packageId: input.packageId,
    status: input.record?.status ?? "DRAFT",
    diagnosticAssessment: input.record?.diagnosticAssessment ?? "",
    individualLearningPlan: input.record?.individualLearningPlan ?? "",
    progressReview: input.record?.progressReview ?? "",
    finalAssessment: input.record?.finalAssessment ?? "",
    completionRecord: input.record?.completionRecord ?? "",
    attendanceEvidenceNote: input.record?.attendanceEvidenceNote ?? "",
    contractEvidenceNote: input.record?.contractEvidenceNote ?? "",
    outcomeSummary: input.record?.outcomeSummary ?? "",
    externalOutcome: input.record?.externalOutcome ?? "",
    startedAt: dateInputValue(input.record?.startedAt),
    completedAt: dateInputValue(input.record?.completedAt),
  };
}

function metricCard(label: string, value: string | number, tone: "neutral" | "warn" | "success" = "neutral") {
  const color = tone === "warn" ? "#9a3412" : tone === "success" ? "#166534" : "#0f172a";
  return (
    <div style={{ border: "1px solid #dbe3ef", background: "#fff", borderRadius: 12, padding: 14, display: "grid", gap: 5 }}>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
      <strong style={{ fontSize: 26, color }}>{value}</strong>
    </div>
  );
}

export default async function EduTrustStudentRecordsPage() {
  const lang = await getLang();
  const packages = await prisma.coursePackage.findMany({
    where: {
      course: {
        eduTrustProfile: {
          isEduTrustCourse: true,
        },
      },
    },
    include: {
      student: true,
      course: {
        include: {
          eduTrustProfile: true,
        },
      },
      attendances: {
        select: {
          status: true,
          deductedMinutes: true,
        },
      },
      contracts: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
      eduTrustRecords: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 120,
  });

  const rows = packages.map((pkg) => {
    const profile = pkg.course.eduTrustProfile;
    const record = pkg.eduTrustRecords.find((item) => item.studentId === pkg.studentId && item.courseId === pkg.courseId) ?? null;
    const attendedMinutes = pkg.attendances.reduce((sum, attendance) => sum + Math.max(0, attendance.deductedMinutes), 0);
    const latestContract = pkg.contracts[0] ?? null;
    const courseReady = profile ? isEduTrustCourseContractReady(profile) : false;
    const hourReady = isEduTrustPackageHoursReady({
      totalMinutes: pkg.totalMinutes,
      minTotalHours: profile?.minTotalHours ?? 50,
    });
    return {
      key: `${pkg.studentId}:${pkg.courseId}:${pkg.id}`,
      studentName: pkg.student.name,
      courseName: pkg.course.name,
      complianceName: profile?.complianceName ?? "",
      packageLabel: `${pkg.type} · ${pkg.status} · ${dateInputValue(pkg.validFrom)}${pkg.validTo ? ` to ${dateInputValue(pkg.validTo)}` : ""}`,
      totalHours: hours(pkg.totalMinutes),
      attendedHours: hours(attendedMinutes) ?? 0,
      contractMode: latestContract
        ? studentContractModeLabel(latestContract.contractMode)
        : studentContractModeLabel(StudentContractMode.TUITION_AGREEMENT),
      contractStatus: latestContract?.status ?? "NO_CONTRACT",
      courseReady,
      hourReady,
      record: recordDraft({
        studentId: pkg.studentId,
        courseId: pkg.courseId,
        packageId: pkg.id,
        record,
      }),
    };
  });

  const completed = rows.filter((row) => row.record.status === "COMPLETED").length;
  const readyForReview = rows.filter((row) => row.record.status === "READY_FOR_REVIEW").length;
  const courseNotReady = rows.filter((row) => !row.courseReady).length;
  const lowHour = rows.filter((row) => !row.hourReady).length;
  const ssgContractCount = rows.filter((row) => row.contractMode.includes("SSG Standard")).length;

  const yearCounts = packages.reduce<Record<string, { completed: number; records: number }>>((acc, pkg) => {
    for (const record of pkg.eduTrustRecords) {
      const date = record.completedAt ?? record.createdAt;
      const year = String(date.getFullYear());
      acc[year] = acc[year] ?? { completed: 0, records: 0 };
      acc[year].records += 1;
      if (record.status === "COMPLETED") acc[year].completed += 1;
    }
    return acc;
  }, {});
  const trendRows = Object.entries(yearCounts).sort(([a], [b]) => a.localeCompare(b)).slice(-3);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ border: "1px solid #bfdbfe", background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 72%)", borderRadius: 16, padding: 18, display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>
            EduTrust Student Evidence / 学生证据
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "EduTrust Student Records and Outcomes", "EduTrust 学生记录与成果")}</h2>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.55 }}>
            {t(
              lang,
              "This workspace records the student-level evidence expected around course delivery: diagnostic assessment, individual learning plan, progress review, final assessment, completion record, attendance evidence, contract/FPS evidence, and outcomes trends.",
              "这里记录课程交付层面的学生证据：诊断评估、个别学习计划、进度复盘、最终评估、完成记录、出勤证据、合同/FPS 证据和成果趋势。"
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin/edutrust">{t(lang, "Course mapping", "课程映射")}</a>
          <a href="#evidence-pack">{t(lang, "Evidence pack checklist", "证据包清单")}</a>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
          {metricCard(t(lang, "EduTrust packages", "EduTrust 课包"), rows.length)}
          {metricCard(t(lang, "Completed records", "已完成学生记录"), completed, completed > 0 ? "success" : "neutral")}
          {metricCard(t(lang, "Ready for review", "可审核记录"), readyForReview)}
          {metricCard(t(lang, "Course setup risks", "课程设置风险"), courseNotReady, courseNotReady > 0 ? "warn" : "success")}
          {metricCard(t(lang, "Low-hour risks", "低课时风险"), lowHour, lowHour > 0 ? "warn" : "success")}
          {metricCard(t(lang, "SSG v4 contracts", "SSG v4 合同"), ssgContractCount)}
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 14, padding: 14 }}>
        <h3 style={{ margin: "0 0 10px" }}>{t(lang, "C7 Outcomes Three-Year Trend", "C7 成果三年趋势")}</h3>
        {trendRows.length ? (
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            {trendRows.map(([year, value]) => (
              <div key={year} style={{ border: "1px solid #dbe3ef", background: "#fff", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 800 }}>{year}</div>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 5 }}>
                  {value.completed}/{value.records} {t(lang, "completed", "已完成")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {t(lang, "No completed EduTrust student records yet.", "还没有已完成的 EduTrust 学生记录。")}
          </div>
        )}
      </section>

      <section id="evidence-pack" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 14, padding: 14, display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{t(lang, "Section A/B Evidence Pack Checklist", "Section A/B 证据包清单")}</h3>
        <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
          {t(
            lang,
            "Keep these items complete before using records externally: course file approval, SSG permission evidence, signed PEI student contract, FPS/fee collection evidence where applicable, attendance record, diagnostic assessment, learning plan, progress review, final assessment, completion record, refund/withdrawal evidence if applicable, and yearly outcomes summary.",
            "对外提交前请确保这些项目完整：课程文件审批、SSG permission 证据、已签 PEI 学生合同、适用时的 FPS/收费证据、出勤记录、诊断评估、学习计划、进度复盘、最终评估、完成记录、如适用的退款/退课证据，以及年度成果摘要。"
          )}
        </div>
      </section>

      <EduTrustStudentRecordsClient rows={rows} />
    </div>
  );
}


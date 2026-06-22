import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  EDUTRUST_COURSE_LINE_LABELS,
  defaultEduTrustProfileForCourse,
  packageMinutesBelowEduTrustMinimum,
} from "@/lib/edutrust-course-profile";
import EduTrustCourseProfilesClient from "./EduTrustCourseProfilesClient";

function courseFileDraft(file?: {
  courseWriteup?: string | null;
  admissionRequirements?: string | null;
  learningOutcomes?: string | null;
  syllabus?: string | null;
  lessonPlan?: string | null;
  assessmentPlan?: string | null;
  teacherDeployment?: string | null;
  academicBoardApproval?: string | null;
  examinationBoardApproval?: string | null;
  courseReview?: string | null;
  evidenceNotes?: string | null;
  approvedBy?: string | null;
} | null) {
  return {
    courseWriteup: file?.courseWriteup ?? "",
    admissionRequirements: file?.admissionRequirements ?? "",
    learningOutcomes: file?.learningOutcomes ?? "",
    syllabus: file?.syllabus ?? "",
    lessonPlan: file?.lessonPlan ?? "",
    assessmentPlan: file?.assessmentPlan ?? "",
    teacherDeployment: file?.teacherDeployment ?? "",
    academicBoardApproval: file?.academicBoardApproval ?? "",
    examinationBoardApproval: file?.examinationBoardApproval ?? "",
    courseReview: file?.courseReview ?? "",
    evidenceNotes: file?.evidenceNotes ?? "",
    approvedBy: file?.approvedBy ?? "",
  };
}

function profileDraft(
  courseId: string,
  profile: ReturnType<typeof defaultEduTrustProfileForCourse> & {
    courseFile?: Parameters<typeof courseFileDraft>[0];
  }
) {
  return {
    courseId,
    isEduTrustCourse: profile.isEduTrustCourse,
    courseLine: profile.courseLine,
    complianceName: profile.complianceName ?? "",
    publicName: profile.publicName ?? "",
    trackLabel: profile.trackLabel ?? "",
    minTotalHours: profile.minTotalHours,
    deliveryMode: profile.deliveryMode,
    permissionStatus: profile.permissionStatus,
    courseFileStatus: profile.courseFileStatus,
    note: profile.note ?? "",
    courseFile: courseFileDraft(profile.courseFile),
  };
}

export default async function EduTrustPage() {
  const lang = await getLang();
  const courses = await prisma.course.findMany({
    include: {
      eduTrustProfile: { include: { courseFile: true } },
      subjects: { include: { levels: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } },
      packages: {
        select: {
          id: true,
          status: true,
          totalMinutes: true,
        },
      },
      classes: {
        select: {
          id: true,
          capacity: true,
          oneOnOneStudentId: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = courses.map((course) => {
    const suggested = defaultEduTrustProfileForCourse(course.name);
    const profile = course.eduTrustProfile
      ? {
          isEduTrustCourse: course.eduTrustProfile.isEduTrustCourse,
          courseLine: course.eduTrustProfile.courseLine,
          complianceName: course.eduTrustProfile.complianceName,
          publicName: course.eduTrustProfile.publicName,
          trackLabel: course.eduTrustProfile.trackLabel,
          minTotalHours: course.eduTrustProfile.minTotalHours,
          deliveryMode: course.eduTrustProfile.deliveryMode,
          permissionStatus: course.eduTrustProfile.permissionStatus,
          courseFileStatus: course.eduTrustProfile.courseFileStatus,
          note: course.eduTrustProfile.note,
          courseFile: course.eduTrustProfile.courseFile,
        }
      : null;
    const effective = profile ?? suggested;
    const subjects = course.subjects
      .map((subject) => {
        const levels = subject.levels.map((level) => level.name).join(", ");
        return levels ? `${subject.name} [${levels}]` : subject.name;
      })
      .join(" | ");
    return {
      id: course.id,
      operationalName: course.name,
      subjects,
      packageCount: course.packages.length,
      activePackageCount: course.packages.filter((pkg) => pkg.status === "ACTIVE").length,
      lowHourPackageCount: course.packages.filter((pkg) =>
        packageMinutesBelowEduTrustMinimum(pkg.totalMinutes, effective.minTotalHours)
      ).length,
      classCount: course.classes.length,
      oneOnOneClassCount: course.classes.filter((klass) => klass.capacity === 1 || klass.oneOnOneStudentId).length,
      suggested: profileDraft(course.id, suggested),
      profile: profile ? profileDraft(course.id, profile) : null,
    };
  });

  const enabledRows = rows.filter((row) => (row.profile ?? row.suggested).isEduTrustCourse);
  const savedProfiles = rows.filter((row) => row.profile).length;
  const lowHourRisks = enabledRows.reduce((sum, row) => sum + row.lowHourPackageCount, 0);
  const lineCounts = enabledRows.reduce<Record<string, number>>((acc, row) => {
    const line = (row.profile ?? row.suggested).courseLine;
    acc[line] = (acc[line] ?? 0) + 1;
    return acc;
  }, {});

  const metricStyle = {
    border: "1px solid #dbe3ef",
    background: "#fff",
    borderRadius: 12,
    padding: 14,
    display: "grid",
    gap: 5,
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid #bfdbfe",
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 72%)",
          borderRadius: 16,
          padding: 18,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 4 }}>
            EduTrust Readiness / 合规整改
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "EduTrust Course Mapping", "EduTrust 课程映射")}</h2>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.55 }}>
            {t(
              lang,
              "Keep the operational course names unchanged. This layer maps existing courses to official EduTrust-ready course lines, flags low-hour packages, and prepares course-file work without disrupting scheduling.",
              "保留教务熟悉的运营课程名不变；这一层只负责映射官方合规课程线、提示低课时课包风险，并为 course file 做准备，不影响排课。"
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin/edutrust/students">{t(lang, "Student records and C7 outcomes", "学生记录与 C7 成果")}</a>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          <div style={metricStyle}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Current courses", "当前课程")}</span>
            <strong style={{ fontSize: 26 }}>{rows.length}</strong>
          </div>
          <div style={metricStyle}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "EduTrust candidates", "建议纳入 EduTrust")}</span>
            <strong style={{ fontSize: 26 }}>{enabledRows.length}</strong>
          </div>
          <div style={metricStyle}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Saved mappings", "已保存映射")}</span>
            <strong style={{ fontSize: 26 }}>{savedProfiles}</strong>
          </div>
          <div style={metricStyle}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Low-hour package risks", "低课时课包风险")}</span>
            <strong style={{ fontSize: 26, color: lowHourRisks > 0 ? "#9a3412" : "#166534" }}>{lowHourRisks}</strong>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 14, padding: 14 }}>
        <h3 style={{ margin: "0 0 10px" }}>{t(lang, "Suggested Course Lines", "建议课程线")}</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          {Object.entries(lineCounts).map(([line, count]) => {
            const labels = EDUTRUST_COURSE_LINE_LABELS[line as keyof typeof EDUTRUST_COURSE_LINE_LABELS];
            return (
              <div key={line} style={{ border: "1px solid #dbe3ef", borderRadius: 10, background: "#fff", padding: 12 }}>
                <div style={{ fontWeight: 800 }}>{labels?.complianceName || line}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{labels?.zh || ""}</div>
                <div style={{ fontSize: 12, color: "#2563eb", marginTop: 8 }}>{count} course(s)</div>
              </div>
            );
          })}
        </div>
      </section>

      <EduTrustCourseProfilesClient rows={rows} />
    </div>
  );
}

import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { TeachingLanguage } from "@prisma/client";
import TeacherCardView from "@/app/admin/teachers/[id]/card/TeacherCardView";

function langLabel(lang: "BILINGUAL" | "ZH" | "EN", value?: TeachingLanguage | null, other?: string | null) {
  if (value === "CHINESE") return t(lang, "Chinese", "中文");
  if (value === "ENGLISH") return t(lang, "English", "英文");
  if (value === "BILINGUAL") return t(lang, "Bilingual", "双语");
  if (other) return other;
  return "-";
}

export default async function TeacherCardSelfPage({
  searchParams,
}: {
  searchParams?: { autoprint?: string };
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();

  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const teacherFull = await prisma.teacher.findUnique({
    where: { id: teacher.id },
    include: {
      subjects: { include: { course: true } },
      subjectCourse: { include: { course: true } },
    },
  });
  if (!teacherFull) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher not found.", "老师不存在。")}</div>;
  }

  const subjectLabels = teacherFull.subjects.length
    ? teacherFull.subjects.map((s) => `${s.course.name}-${s.name}`)
    : teacherFull.subjectCourse
      ? [`${teacherFull.subjectCourse.course.name}-${teacherFull.subjectCourse.name}`]
      : [];

  return (
    <>
      <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 12px" }}>
        <a href="/teacher/card/export/pdf" style={{ fontSize: 14 }}>
          {t(lang, "Download PDF", "下载 PDF")}
        </a>
      </div>
      <TeacherCardView
        name={teacherFull.name}
        subjectText={subjectLabels.length ? subjectLabels.join("\n") : "-"}
        teachingLanguage={langLabel(lang, teacherFull.teachingLanguage, teacherFull.teachingLanguageOther)}
        yearsExperienceText={teacherFull.yearsExperience != null ? `${teacherFull.yearsExperience}` : "-"}
        nationality={teacherFull.nationality || "-"}
        almaMater={teacherFull.almaMater || "-"}
        intro={teacherFull.intro || t(lang, "No intro yet.", "暂无介绍")}
        autoPrint={searchParams?.autoprint === "1"}
      />
    </>
  );
}

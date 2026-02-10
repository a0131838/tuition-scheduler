import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TeachingLanguage } from "@prisma/client";
import TeacherCardView from "./TeacherCardView";

function langLabel(v?: TeachingLanguage | null, other?: string | null) {
  if (v === "CHINESE") return "中文";
  if (v === "ENGLISH") return "英文";
  if (v === "BILINGUAL") return "双语";
  if (other) return other;
  return "-";
}

export default async function TeacherCardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      subjects: { include: { course: true } },
      subjectCourse: { include: { course: true } },
    },
  });
  if (!teacher) return <div>Teacher not found.</div>;

  const subjectLabels = teacher.subjects.length
    ? teacher.subjects.map((s) => `${s.course.name}-${s.name}`)
    : teacher.subjectCourse
      ? [`${teacher.subjectCourse.course.name}-${teacher.subjectCourse.name}`]
      : [];

  return (
    <TeacherCardView
      name={teacher.name}
      subjectText={subjectLabels.length ? subjectLabels.join("\n") : "-"}
      teachingLanguage={langLabel(teacher.teachingLanguage, teacher.teachingLanguageOther)}
      yearsExperienceText={teacher.yearsExperience != null ? `${teacher.yearsExperience}` : "-"}
      nationality={teacher.nationality || "-"}
      almaMater={teacher.almaMater || "-"}
      intro={teacher.intro || "暂无"}
      offlineShanghai={teacher.offlineShanghai}
      offlineSingapore={teacher.offlineSingapore}
    />
  );
}

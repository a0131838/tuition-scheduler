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
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Teacher Card / 老师卡片</div>
          <h2 style={{ margin: 0 }}>{teacher.name}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>这张卡片更适合对外展示、打印或快速转发。</div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Subjects / 授课方向</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{subjectLabels.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Language / 授课语言</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>{langLabel(teacher.teachingLanguage, teacher.teachingLanguageOther)}</div>
          </div>
        </div>
      </div>
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
    </div>
  );
}

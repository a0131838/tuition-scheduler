import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { TeachingLanguage } from "@prisma/client";
import TeacherCardView from "@/app/admin/teachers/[id]/card/TeacherCardView";
import TeacherIntroClient from "./TeacherIntroClient";

function langLabel(lang: "BILINGUAL" | "ZH" | "EN", value?: TeachingLanguage | null, other?: string | null) {
  if (value === "CHINESE") return t(lang, "Chinese", "中文");
  if (value === "ENGLISH") return t(lang, "English", "英文");
  if (value === "BILINGUAL") return t(lang, "Bilingual", "双语");
  if (other) return other;
  return "-";
}

// Intro editing is handled via client fetch to avoid page jump/flash.

export default async function TeacherCardSelfPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

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
        {err ? <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div> : null}
        {msg ? <div style={{ color: "#087", marginBottom: 8 }}>{msg}</div> : null}

        <a href="/teacher/card/export/pdf" style={{ fontSize: 14 }}>
          {t(lang, "Download PDF", "下载 PDF")}
        </a>

        <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "Edit Self Intro", "编辑自我介绍")}</div>
          <TeacherIntroClient
            initialIntro={teacherFull.intro ?? ""}
            labels={{
              placeholder: t(lang, "Write your teaching intro...", "填写你的教学介绍..."),
              save: t(lang, "Save Intro", "保存介绍"),
              saved: t(lang, "Saved", "已保存"),
            }}
          />
        </div>
      </div>
      <TeacherCardView
        name={teacherFull.name}
        subjectText={subjectLabels.length ? subjectLabels.join("\n") : "-"}
        teachingLanguage={langLabel(lang, teacherFull.teachingLanguage, teacherFull.teachingLanguageOther)}
        yearsExperienceText={teacherFull.yearsExperience != null ? `${teacherFull.yearsExperience}` : "-"}
        nationality={teacherFull.nationality || "-"}
        almaMater={teacherFull.almaMater || "-"}
        intro={teacherFull.intro || t(lang, "No intro yet.", "暂无介绍")}
        autoPrint={sp?.autoprint === "1"}
      />
    </>
  );
}

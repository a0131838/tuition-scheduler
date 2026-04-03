import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { TeachingLanguage } from "@prisma/client";
import TeacherCardView from "@/app/admin/teachers/[id]/card/TeacherCardView";
import TeacherIntroClient from "./TeacherIntroClient";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

function langLabel(lang: "BILINGUAL" | "ZH" | "EN", value?: TeachingLanguage | null, other?: string | null) {
  if (value === "CHINESE") return t(lang, "Chinese", "中文");
  if (value === "ENGLISH") return t(lang, "English", "英文");
  if (value === "BILINGUAL") return t(lang, "Bilingual", "双语");
  if (other) return other;
  return "-";
}

function statCard(bg: string, border: string) {
  return {
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: bg,
  } as const;
}

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  textDecoration: "none",
} as const;

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  textDecoration: "none",
} as const;

const emptyStateCardStyle = {
  border: "1px solid #dbeafe",
  background: "#f8fbff",
  borderRadius: 16,
  padding: 18,
  display: "grid",
  gap: 10,
} as const;

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
    return (
      <div style={{ maxWidth: 920, margin: "24px auto 0", padding: "0 12px", display: "grid", gap: 14 }}>
        <TeacherWorkspaceHero
          title={t(lang, "My Teacher Card", "我的教师名片")}
          subtitle={t(lang, "Keep your public profile clear and ready for sharing.", "在这里维护你的公开教师名片，确保对外展示信息清楚可用。")}
          actions={[
            { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          ]}
        />
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
            {t(lang, "Your teacher profile is not linked yet", "老师资料暂时还未关联")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "Your teacher card cannot be shown until the current account is linked to a teacher profile.",
              "在当前账号和老师资料完成关联前，这里还不能显示你的教师名片。"
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/teacher" style={secondaryButtonStyle}>{t(lang, "Back to dashboard", "返回工作台")}</a>
          </div>
        </section>
      </div>
    );
  }

  const teacherFull = await prisma.teacher.findUnique({
    where: { id: teacher.id },
    include: {
      subjects: { include: { course: true } },
      subjectCourse: { include: { course: true } },
    },
  });
  if (!teacherFull) {
    return (
      <div style={{ maxWidth: 920, margin: "24px auto 0", padding: "0 12px", display: "grid", gap: 14 }}>
        <TeacherWorkspaceHero
          title={t(lang, "My Teacher Card", "我的教师名片")}
          subtitle={t(lang, "Keep your public profile clear and ready for sharing.", "在这里维护你的公开教师名片，确保对外展示信息清楚可用。")}
          actions={[
            { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          ]}
        />
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
            {t(lang, "Teacher profile not found", "未找到老师资料")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "The linked teacher record could not be loaded right now. Please go back to the dashboard and try again later.",
              "当前无法加载这条老师资料。请先返回工作台，稍后再试。"
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/teacher" style={secondaryButtonStyle}>{t(lang, "Back to dashboard", "返回工作台")}</a>
          </div>
        </section>
      </div>
    );
  }

  const subjectLabels = teacherFull.subjects.length
    ? teacherFull.subjects.map((s) => `${s.course.name}-${s.name}`)
    : teacherFull.subjectCourse
      ? [`${teacherFull.subjectCourse.course.name}-${teacherFull.subjectCourse.name}`]
      : [];
  const hasIntro = Boolean((teacherFull.intro ?? "").trim());

  return (
    <>
      <div style={{ maxWidth: 920, margin: "24px auto 0", padding: "0 12px", display: "grid", gap: 14 }}>
        <TeacherWorkspaceHero
          title={t(lang, "My Teacher Card", "我的教师名片")}
          subtitle={t(
            lang,
            "Keep your public teaching profile clear and up to date, then export the latest PDF when operations or families need your intro card.",
            "在这里维护你的公开教学名片，并在教务或家长需要时导出最新 PDF。"
          )}
          actions={[
            { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
            { href: "/teacher/card/export/pdf", label: t(lang, "Download PDF", "下载 PDF") },
          ]}
        />

        <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div style={statCard("#eff6ff", "#bfdbfe")}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Subjects", "科目数")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1d4ed8", marginTop: 8 }}>{subjectLabels.length || 1}</div>
            <div style={{ color: "#1e40af", marginTop: 4 }}>{t(lang, "Subjects currently shown on your card.", "当前教师名片上展示的科目数量。")}</div>
          </div>
          <div style={statCard("#ecfdf5", "#bbf7d0")}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Intro status", "介绍状态")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#166534", marginTop: 8 }}>
              {hasIntro ? t(lang, "Ready", "已就绪") : t(lang, "Needed", "待补充")}
            </div>
            <div style={{ color: "#166534", marginTop: 4 }}>{t(lang, "Shows whether your self-intro is ready for sharing.", "表示你的自我介绍是否已经可以对外展示。")}</div>
          </div>
          <div style={statCard("#fff7ed", "#fdba74")}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412" }}>{t(lang, "Teaching language", "授课语言")}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#9a3412", marginTop: 10 }}>{langLabel(lang, teacherFull.teachingLanguage, teacherFull.teachingLanguageOther)}</div>
            <div style={{ color: "#9a3412", marginTop: 4 }}>{t(lang, "Current language label shown on your teacher card.", "当前名片上展示的授课语言标签。")}</div>
          </div>
          <div style={statCard("#f5f3ff", "#ddd6fe")}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9" }}>{t(lang, "Experience", "教学经验")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#6d28d9", marginTop: 8 }}>
              {teacherFull.yearsExperience != null ? `${teacherFull.yearsExperience}` : "-"}
            </div>
            <div style={{ color: "#6d28d9", marginTop: 4 }}>{t(lang, "Years currently printed on your profile card.", "当前教师名片上打印的教学年限。")}</div>
          </div>
        </section>

        {err ? <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div> : null}
        {msg ? <div style={{ color: "#087", marginBottom: 8 }}>{msg}</div> : null}

        {!hasIntro ? (
          <section style={emptyStateCardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>
              {t(lang, "Your intro still needs one short pass", "你的自我介绍还差最后一步")}
            </div>
            <div style={{ color: "#475569", lineHeight: 1.6 }}>
              {t(
                lang,
                "Add a short teaching introduction below so operations and families can understand your profile without opening extra records.",
                "在下方补上一段简短教学介绍，这样教务和家长就不用再打开其他资料才能理解你的背景。"
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="#teacher-intro-editor" style={primaryButtonStyle}>{t(lang, "Write intro now", "现在填写介绍")}</a>
              <a href="/teacher/card/export/pdf" style={secondaryButtonStyle}>{t(lang, "Preview current PDF", "预览当前 PDF")}</a>
            </div>
          </section>
        ) : null}

        <div id="teacher-intro-editor" style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
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

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { TeachingLanguage } from "@prisma/client";
import { getLang, t } from "@/lib/i18n";

async function createTeacher(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const nationality = String(formData.get("nationality") ?? "").trim();
  const almaMater = String(formData.get("almaMater") ?? "").trim();
  const yearsExperienceRaw = String(formData.get("yearsExperience") ?? "").trim();
  const teachingLanguage = String(formData.get("teachingLanguage") ?? "").trim();
  const subjectIds = formData.getAll("subjectIds").map((v) => String(v)).filter(Boolean);

  if (!name) return;

  let yearsExperience: number | null = null;
  if (yearsExperienceRaw) {
    const n = Number(yearsExperienceRaw);
    if (Number.isFinite(n) && n >= 0) yearsExperience = n;
  }

  await prisma.teacher.create({
    data: {
      name,
      nationality: nationality || null,
      almaMater: almaMater || null,
      yearsExperience,
      teachingLanguage: (teachingLanguage as TeachingLanguage) || null,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/admin/teachers");
}

async function deleteTeacher(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;

  await prisma.teacherAvailability.deleteMany({ where: { teacherId: id } });
  await prisma.teacherAvailabilityDate.deleteMany({ where: { teacherId: id } });
  await prisma.teacherOneOnOneTemplate.deleteMany({ where: { teacherId: id } });
  await prisma.appointment.deleteMany({ where: { teacherId: id } });
  const classes = await prisma.class.findMany({
    where: { teacherId: id },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);
  if (classIds.length > 0) {
    await prisma.enrollment.deleteMany({ where: { classId: { in: classIds } } });
    await prisma.attendance.deleteMany({ where: { session: { classId: { in: classIds } } } });
    await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
  }
  await prisma.class.deleteMany({ where: { teacherId: id } });
  await prisma.teacher.delete({ where: { id } });

  revalidatePath("/admin/teachers");
}

function languageLabel(lang: string, v?: string | null) {
  if (v === TeachingLanguage.CHINESE) return lang === "EN" ? "Chinese" : "中文";
  if (v === TeachingLanguage.ENGLISH) return lang === "EN" ? "English" : "英文";
  if (v === TeachingLanguage.BILINGUAL) return lang === "EN" ? "Bilingual" : "双语";
  return "-";
}

export default async function TeachersPage() {
  const lang = await getLang();
  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      include: { subjects: { include: { course: true } }, subjectCourse: { include: { course: true } } },
    }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div>
      <h2>{t(lang, "Teachers", "老师")}</h2>

      <form action={createTeacher} style={{ display: "grid", gap: 8, marginBottom: 16, maxWidth: 860 }}>
        <input name="name" placeholder={t(lang, "Teacher name", "老师姓名")} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="nationality" placeholder={t(lang, "Nationality", "国籍")} />
          <input name="almaMater" placeholder={t(lang, "Alma Mater", "毕业学校")} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select name="subjectIds" multiple size={4} style={{ minWidth: 320 }}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course.name} - {s.name}
              </option>
            ))}
          </select>
          <span style={{ color: "#666" }}>{t(lang, "Subjects (multi-select)", "科目(多选)")}</span>

          <input
            name="yearsExperience"
            type="number"
            min={0}
            placeholder={t(lang, "Years Experience", "教学经验(年)")}
            style={{ width: 220 }}
          />

          <select name="teachingLanguage" defaultValue="">
            <option value="">{t(lang, "Teaching Language", "教学语言")}</option>
            <option value={TeachingLanguage.CHINESE}>{t(lang, "Chinese", "中文")}</option>
            <option value={TeachingLanguage.ENGLISH}>{t(lang, "English", "英文")}</option>
            <option value={TeachingLanguage.BILINGUAL}>{t(lang, "Bilingual", "双语")}</option>
          </select>
        </div>

        <button type="submit">{t(lang, "Add", "新增")}</button>
      </form>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Name", "姓名")}</th>
            <th align="left">{t(lang, "Subject", "科目")}</th>
            <th align="left">{t(lang, "Language", "语言")}</th>
            <th align="left">{t(lang, "Years", "年限")}</th>
            <th align="left">{t(lang, "Nationality", "国籍")}</th>
            <th align="left">{t(lang, "Alma Mater", "毕业学校")}</th>
            <th align="left">{t(lang, "Availability", "可用时间")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((tch) => (
            <tr key={tch.id} style={{ borderTop: "1px solid #eee" }}>
              <td>
                <a href={`/admin/teachers/${tch.id}`}>{tch.name}</a>
              </td>
              <td>
                {tch.subjects.length > 0
                  ? tch.subjects.map((s) => `${s.course.name}-${s.name}`).join(", ")
                  : tch.subjectCourse
                  ? `${tch.subjectCourse.course.name}-${tch.subjectCourse.name}`
                  : "-"}
              </td>
              <td>{languageLabel(lang, tch.teachingLanguage)}</td>
              <td>{tch.yearsExperience ?? "-"}</td>
              <td>{tch.nationality ?? "-"}</td>
              <td>{tch.almaMater ?? "-"}</td>
              <td>
                <a href={`/admin/teachers/${tch.id}/availability`}>{t(lang, "Set / View", "设置 / 查看")}</a>
              </td>
              <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`/admin/teachers/${tch.id}`}>{t(lang, "Edit", "编辑")}</a>
                <form action={deleteTeacher}>
                  <input type="hidden" name="id" value={tch.id} />
                  <ConfirmSubmitButton message={t(lang, "Delete teacher? This also deletes availability/classes/appointments.", "删除老师？将删除可用时间/班级/预约。")}>
                    {t(lang, "Delete", "删除")}
                  </ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
          {teachers.length === 0 && (
            <tr>
              <td colSpan={8}>{t(lang, "No teachers yet.", "暂无老师")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

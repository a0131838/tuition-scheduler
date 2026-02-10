import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../_components/NoticeBanner";
import AdminCoursesClient from "./AdminCoursesClient";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; err?: string }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const q = (sp?.q ?? "").trim().toLowerCase();
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const courses = await prisma.course.findMany({
    include: { subjects: { include: { levels: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h2>{t(lang, "Courses", "课程")}</h2>
      {err ? (
        <NoticeBanner
          type="error"
          title={t(lang, "Error", "错误")}
          message={
            err === "Course has classes"
              ? t(lang, "Course has classes. Please delete classes first.", "课程下已有班级，请先删除班级。")
              : err === "Course has subjects"
              ? t(lang, "Course has subjects. Please delete subjects first.", "课程下已有科目，请先删除科目。")
              : err
          }
        />
        ) : null}

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 16 }}>
        <AdminCoursesClient
          initialCourses={courses.map((c) => ({
            id: c.id,
            name: c.name,
            subjects: c.subjects.map((s) => ({ id: s.id, name: s.name, levels: s.levels.map((l) => ({ id: l.id, name: l.name })) })),
          }))}
          q={q}
          labels={{
            courseCategory: t(lang, "Course category", "课程大类"),
            addCourse: t(lang, "Add Course", "新增课程大类"),
            addCoursePlaceholder: t(lang, "Course category", "课程大类"),
            subjects: t(lang, "Subjects", "科目"),
            levels: t(lang, "Levels", "级别"),
            delete: t(lang, "Delete", "删除"),
            addSubject: t(lang, "Add Subject", "新增科目"),
            addSubjectPlaceholder: t(lang, "Add subject (comma separated)", "新增科目(逗号分隔)"),
            addLevel: t(lang, "Add Level", "新增级别"),
            addLevelPlaceholder: t(lang, "Add level (comma separated)", "新增级别(逗号分隔)"),
            noSubjects: t(lang, "No subjects yet.", "暂无科目"),
            noLevels: t(lang, "No levels yet.", "暂无级别"),
            errorPrefix: t(lang, "Error", "错误"),
            errCourseHasClasses: t(lang, "Course has classes. Please delete classes first.", "课程下已有班级，请先删除班级。"),
            errCourseHasSubjects: t(lang, "Course has subjects. Please delete subjects first.", "课程下已有科目，请先删除科目。"),
            errSubjectHasClasses: t(lang, "Subject has classes. Please delete classes first.", "科目下已有班级，请先删除班级。"),
            errLevelHasClasses: t(lang, "Level has classes. Please delete classes first.", "级别已被班级使用，请先删除班级。"),
          }}
        />
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <input
            name="q"
            defaultValue={sp?.q ?? ""}
            placeholder={t(lang, "Search courses / subjects / levels", "搜索课程/科目/级别")}
            style={{ minWidth: 320 }}
          />
          <button type="submit">{t(lang, "Search", "搜索")}</button>
          {q && (
            <a href="/admin/courses" style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
              {t(lang, "Clear", "清除")}
            </a>
          )}
        </form>
      </div>

      {/* Courses list is rendered client-side to avoid full refresh on create/delete */}

      <p style={{ color: "#666", marginTop: 12 }}>
        {t(lang, "* If a course/subject/level is used by classes, deletion is blocked.", "* 如果课程/科目/级别已被班级使用，将阻止删除。")}
      </p>
    </div>
  );
}

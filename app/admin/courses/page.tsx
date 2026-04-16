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
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Course Setup / 课程结构设置</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Courses", "课程")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Maintain the course > subject > level tree here before creating classes or teacher mappings.", "先维护课程 > 科目 > 级别结构，再继续创建班级和老师能力映射。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Course categories", "课程大类")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{courses.length}</div>
          </div>
        </div>
      </div>
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

      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #dbeafe",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#courses-editor">{t(lang, "Course editor", "课程编辑")}</a>
        <a href="#courses-search">{t(lang, "Search", "搜索")}</a>
        <a href="#courses-notes">{t(lang, "Rules", "规则")}</a>
      </div>

      <div id="courses-editor" style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 16, scrollMarginTop: 96 }}>
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
        <form id="courses-search" method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8, scrollMarginTop: 96 }}>
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

      <p id="courses-notes" style={{ color: "#666", marginTop: 12, scrollMarginTop: 96 }}>
        {t(lang, "* If a course/subject/level is used by classes, deletion is blocked.", "* 如果课程/科目/级别已被班级使用，将阻止删除。")}
      </p>
    </div>
  );
}

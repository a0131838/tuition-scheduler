import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../_components/NoticeBanner";

async function createCourse(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.course.create({ data: { name } });
  revalidatePath("/admin/courses");
}

async function createSubject(formData: FormData) {
  "use server";
  const courseId = String(formData.get("courseId") ?? "");
  const nameRaw = String(formData.get("name") ?? "");
  const names = nameRaw
    .split(/[,\n，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!courseId || names.length === 0) return;

  await prisma.subject.createMany({
    data: names.map((name) => ({ courseId, name })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/courses");
}

async function createLevel(formData: FormData) {
  "use server";
  const subjectId = String(formData.get("subjectId") ?? "");
  const nameRaw = String(formData.get("name") ?? "");
  const names = nameRaw
    .split(/[,\n，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!subjectId || names.length === 0) return;

  await prisma.level.createMany({
    data: names.map((name) => ({ subjectId, name })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/courses");
}

async function deleteCourse(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;
  const count = await prisma.class.count({ where: { courseId: id } });
  if (count > 0) redirect("/admin/courses?err=Course+has+classes&keep=1");
  const subjectCount = await prisma.subject.count({ where: { courseId: id } });
  if (subjectCount > 0) redirect("/admin/courses?err=Course+has+subjects&keep=1");

  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
}

async function deleteSubject(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const count = await prisma.class.count({ where: { subjectId: id } });
  if (count > 0) return;

  await prisma.subject.delete({ where: { id } });
  revalidatePath("/admin/courses");
}

async function deleteLevel(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const count = await prisma.class.count({ where: { levelId: id } });
  if (count > 0) return;

  await prisma.level.delete({ where: { id } });
  revalidatePath("/admin/courses");
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const lang = await getLang();
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const courses = await prisma.course.findMany({
    include: { subjects: { include: { levels: true } } },
    orderBy: { name: "asc" },
  });

  const filtered = q
    ? courses.reduce<typeof courses>((acc, c) => {
        const subjects = c.subjects.filter((s) => {
          if (s.name.toLowerCase().includes(q)) return true;
          return s.levels.some((l) => l.name.toLowerCase().includes(q));
        });
        if (c.name.toLowerCase().includes(q)) {
          acc.push({ ...c, subjects: c.subjects });
        } else if (subjects.length > 0) {
          acc.push({ ...c, subjects });
        }
        return acc;
      }, [])
    : courses;

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
        <form action={createCourse} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input name="name" placeholder={t(lang, "Course category", "课程大类")} />
          <button type="submit">{t(lang, "Add Course", "新增课程大类")}</button>
        </form>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <input
            name="q"
            defaultValue={searchParams?.q ?? ""}
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

      {filtered.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No courses yet.", "暂无课程")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => (
            <details
              key={c.id}
              open={!!q || (filtered.length === 1 && c.subjects.length > 0)}
              style={{ border: "1px solid #e8e8e8", borderRadius: 10, padding: 10, background: "#fafafa" }}
            >
              <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <b>{c.name}</b>
                  <span style={{ color: "#666", fontSize: 12 }}>
                    {t(lang, "Subjects", "科目")}: {c.subjects.length}
                  </span>
                </div>
                <form action={deleteCourse}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" title={t(lang, "If course has classes, delete is blocked", "如果课程有班级将阻止删除")}>
                    {t(lang, "Delete", "删除")}
                  </button>
                </form>
              </summary>

              <div style={{ marginTop: 10, paddingLeft: 8 }}>
                <form action={createSubject} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <input type="hidden" name="courseId" value={c.id} />
                  <input name="name" placeholder={t(lang, "Add subject (comma separated)", "新增科目(逗号分隔)")} />
                  <button type="submit">{t(lang, "Add Subject", "新增科目")}</button>
                </form>

                {c.subjects.length === 0 ? (
                  <div style={{ color: "#999" }}>{t(lang, "No subjects yet.", "暂无科目")}</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {c.subjects.map((s) => (
                      <details key={s.id} style={{ border: "1px dashed #e2e2e2", borderRadius: 8, padding: 8, background: "#fff" }}>
                        <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <b>{s.name}</b>
                            <span style={{ color: "#666", fontSize: 12 }}>
                              {t(lang, "Levels", "级别")}: {s.levels.length}
                            </span>
                          </div>
                          <form action={deleteSubject}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" title={t(lang, "If subject has classes, delete is blocked", "如果科目有班级将阻止删除")}>
                              {t(lang, "Delete", "删除")}
                            </button>
                          </form>
                        </summary>

                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {s.levels.length === 0 ? (
                              <span style={{ color: "#999" }}>{t(lang, "No levels yet.", "暂无级别")}</span>
                            ) : (
                              s.levels.map((l) => (
                                <span
                                  key={l.id}
                                  style={{
                                    display: "inline-flex",
                                    gap: 6,
                                    alignItems: "center",
                                    border: "1px solid #eee",
                                    borderRadius: 999,
                                    padding: "4px 10px",
                                  }}
                                >
                                  {l.name}
                                  <form action={deleteLevel}>
                                    <input type="hidden" name="id" value={l.id} />
                                    <button type="submit" style={{ fontSize: 12 }}>
                                      {t(lang, "Delete", "删除")}
                                    </button>
                                  </form>
                                </span>
                              ))
                            )}
                          </div>
                          <form action={createLevel} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            <input type="hidden" name="subjectId" value={s.id} />
                            <input name="name" placeholder={t(lang, "Add level (comma separated)", "新增级别(逗号分隔)")} />
                            <button type="submit">{t(lang, "Add Level", "新增级别")}</button>
                          </form>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      <p style={{ color: "#666", marginTop: 12 }}>
        {t(lang, "* If a course/subject/level is used by classes, deletion is blocked.", "* 如果课程/科目/级别已被班级使用，将阻止删除。")}
      </p>
    </div>
  );
}

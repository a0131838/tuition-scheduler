import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import SimpleModal from "../_components/SimpleModal";
import ClassCreateForm from "../_components/ClassCreateForm";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import NoticeBanner from "../_components/NoticeBanner";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../_components/workbenchStyles";

function classesSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; page?: string; pageSize?: string; studentQ?: string }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const requestedPage = Math.max(1, Number.parseInt(sp?.page ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(sp?.pageSize ?? "20", 10);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const studentQ = String(sp?.studentQ ?? "").trim();
  const studentQNorm = studentQ.toLowerCase();
  const formatId = (prefix: string, id: string) =>
    `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id}`;
  const classInclude = {
    course: true,
    subject: { include: { course: true } },
    level: { include: { subject: true } },
    teacher: true,
    campus: true,
    room: true,
    oneOnOneGroup: {
      include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
    },
    oneOnOneStudent: true,
    enrollments: { include: { student: true } },
    _count: { select: { enrollments: true, sessions: true } } as any,
  };
  const oneOnOneWhere = { capacity: 1 };
  const groupWhere = { NOT: { capacity: 1 } };

  const [oneOnOneClasses, groupTotal, courses, subjects, levels, teachers, campuses, rooms] = await Promise.all([
    prisma.class.findMany({
      where: oneOnOneWhere,
      include: {
        ...classInclude,
      },
      orderBy: { id: "asc" },
    }),
    prisma.class.count({ where: groupWhere }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ include: { subject: { include: { course: true } } }, orderBy: [{ subjectId: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ orderBy: { name: "asc" }, include: { subjects: { select: { id: true } } } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);
  const groupTotalPages = Math.max(1, Math.ceil(groupTotal / pageSize));
  const page = Math.min(requestedPage, groupTotalPages);
  const groupClasses = await prisma.class.findMany({
    where: groupWhere,
    include: { ...classInclude },
    orderBy: { id: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const totalClasses = oneOnOneClasses.length + groupTotal;
  const totalOneOnOneStudents = Array.from(
    new Set(
      oneOnOneClasses.flatMap((c) =>
        c.oneOnOneStudent?.id ? [c.oneOnOneStudent.id] : c.enrollments.map((e) => e.studentId)
      )
    )
  ).length;
  const buildPageHref = (targetPage: number, targetPageSize = pageSize) => {
    const params = new URLSearchParams();
    params.set("pageSize", String(targetPageSize));
    if (targetPage > 1) params.set("page", String(targetPage));
    const q = params.toString();
    return q ? `/admin/classes?${q}` : "/admin/classes";
  };

  return (
    <div>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>{t(lang, "Classes workbench", "班级工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Classes", "班级")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Review class load, jump into enrollments, and open the exact class or sessions page you need without rescanning the full list.",
              "这里先看班级负载，再快速进入报名、班级详情或课次页，不用每次把整页重新扫一遍。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Total classes", "班级总数")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{totalClasses}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fff7ed" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "1-on-1 templates", "一对一模板")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{oneOnOneClasses.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "1-on-1 students", "一对一学生")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{totalOneOnOneStudents}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Group classes", "班课")}</div>
            <div style={workbenchMetricValueStyle("emerald")}>{groupTotal}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Classes work map", "班级工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Create a class, scan the 1-on-1 student view, then move to group classes or enrollments management.", "建议先新建班级，再看一对一按学生视图，最后处理班课区或报名管理。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#classes-actions" style={classesSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Create and shortcuts", "创建与快捷入口")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "New class and enrollments shortcut", "新建班级和报名快捷入口")}</span>
          </a>
          <a href="#classes-one-on-one" style={classesSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "1-on-1 view", "一对一视图")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Find the student or template you need first", "先找到对应学生或模板")}</span>
          </a>
          <a href="#classes-group" style={classesSectionLinkStyle("#eff6ff", "#93c5fd")}>
            <strong>{t(lang, "Group classes", "班课区")}</strong>
            <span style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Review class size, sessions, and open the next class", "查看班级人数、课次并打开下一班")}</span>
          </a>
        </div>
      </section>
      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div id="classes-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ color: "#666" }}>
        {t(
          lang,
          "This list shows enrollments count and generated sessions count per class.",
          "这里显示每个班级的报名人数与已生成课次数。"
        )}
        </div>
        <a
          href="/admin/enrollments"
          style={{ display: "inline-block", padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}
        >
          {t(lang, "Manage Enrollments", "管理报名")}
        </a>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Create Class", "新建班级")} title={t(lang, "Create Class", "新建班级")}>
          <ClassCreateForm
            courses={courses.map((c) => ({ id: c.id, name: c.name }))}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
            levels={levels.map((l) => ({
              id: l.id,
              name: l.name,
              subjectId: l.subjectId,
              courseName: l.subject.course.name,
              subjectName: l.subject.name,
            }))}
            teachers={teachers.map((tch) => ({
              id: tch.id,
              name: tch.name,
              subjectCourseId: tch.subjectCourseId,
              subjectIds: tch.subjects.map((s) => s.id),
            }))}
            campuses={campuses.map((c) => ({ id: c.id, name: c.name }))}
            rooms={rooms.map((r) => ({
              id: r.id,
              name: r.name,
              campusName: r.campus.name,
              campusId: r.campusId,
              capacity: r.capacity,
            }))}
            labels={{
              course: t(lang, "Course", "课程"),
              subject: t(lang, "Subject", "科目"),
              level: t(lang, "Level", "级别"),
              teacher: t(lang, "Teacher", "老师"),
              campus: t(lang, "Campus", "校区"),
              roomOptional: t(lang, "Room (optional)", "教室(可选)"),
              capacity: t(lang, "Capacity", "容量"),
              create: t(lang, "Create", "创建"),
              none: t(lang, "(none)", "(无)"),
            }}
          />

          {(subjects.length === 0 || levels.length === 0 || teachers.length === 0 || campuses.length === 0) && (
            <p style={{ color: "#b00" }}>
              {t(lang, "Please create course/subject/level/teacher/campus first.", "请先创建课程/科目/级别/老师/校区。")}
            </p>
          )}
        </SimpleModal>
      </div>

      {totalClasses === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No classes yet.", "暂无班级")}</div>
      ) : (
        <>
          {(() => {
            const grouped = new Map<
              string,
              {
                key: string;
                groupLabel: string;
                teacherLabel: string;
                campusLabel: string;
                roomLabel: string;
                classes: typeof oneOnOneClasses;
                entries: { classId: string; studentId: string | null; studentName: string }[];
              }
            >();
            for (const c of oneOnOneClasses) {
              const key =
                c.oneOnOneGroupId ??
                `${c.teacherId}|${c.courseId}|${c.subjectId ?? ""}|${c.levelId ?? ""}|${c.campusId}|${c.roomId ?? ""}`;
              const labelCourse = c.oneOnOneGroup?.course ?? c.course;
              const labelSubject = c.oneOnOneGroup?.subject ?? c.subject;
              const labelLevel = c.oneOnOneGroup?.level ?? c.level;
              const labelTeacher = c.oneOnOneGroup?.teacher ?? c.teacher;
              const labelCampus = c.oneOnOneGroup?.campus ?? c.campus;
              const labelRoom = c.oneOnOneGroup?.room ?? c.room;
              const groupLabel = `${labelCourse.name}${labelSubject ? ` / ${labelSubject.name}` : ""}${
                labelLevel ? ` / ${labelLevel.name}` : ""
              }`;
              const teacherLabel = labelTeacher.name;
              const campusLabel = labelCampus.name;
              const roomLabel = labelRoom?.name ?? "(none)";
              if (!grouped.has(key)) {
                grouped.set(key, {
                  key,
                  groupLabel,
                  teacherLabel,
                  campusLabel,
                  roomLabel,
                  classes: [],
                  entries: [],
                });
              }
              const bucket = grouped.get(key)!;
              bucket.classes.push(c);
              const students =
                c.oneOnOneStudent?.name
                  ? [{ id: c.oneOnOneStudentId, name: c.oneOnOneStudent.name }]
                  : c.enrollments.length > 0
                  ? c.enrollments.map((e) => ({ id: e.studentId, name: e.student?.name ?? "-" }))
                  : [{ id: null, name: "-" }];
              for (const s of students) {
                bucket.entries.push({ classId: c.id, studentId: s.id ?? null, studentName: s.name });
              }
            }
            const oneOnOneRows = Array.from(grouped.values())
              .flatMap((g) => {
                const sessionsByClassId = new Map(g.classes.map((c) => [c.id, (c as any)._count?.sessions ?? 0]));
                return g.entries.map((e) => ({
                  classId: e.classId,
                  studentId: e.studentId,
                  studentName: e.studentName,
                  groupLabel: g.groupLabel,
                  teacherLabel: g.teacherLabel,
                  campusLabel: g.campusLabel,
                  roomLabel: g.roomLabel,
                  sessionsCount: sessionsByClassId.get(e.classId) ?? 0,
                }));
              })
              .filter((r) =>
                studentQNorm
                  ? r.studentName.toLowerCase().includes(studentQNorm) || r.teacherLabel.toLowerCase().includes(studentQNorm)
                  : true
              )
              .sort((a, b) => {
                const byStudent = a.studentName.localeCompare(b.studentName, "en", { sensitivity: "base" });
                if (byStudent !== 0) return byStudent;
                const byTeacher = a.teacherLabel.localeCompare(b.teacherLabel, "en", { sensitivity: "base" });
                if (byTeacher !== 0) return byTeacher;
                return a.groupLabel.localeCompare(b.groupLabel, "en", { sensitivity: "base" });
              });

            return (
              <>
                {grouped.size > 0 && (
                  <div id="classes-one-on-one" style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <h3 style={{ marginBottom: 0 }}>{t(lang, "1-on-1 by Student", "一对一按学生")}</h3>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {t(lang, "Classes", "班级")}: {oneOnOneClasses.length} · {t(lang, "Students", "学生")}: {totalOneOnOneStudents} ·{" "}
                        {t(lang, "Shown", "显示")}: {oneOnOneRows.length}
                      </div>
                    </div>
                    <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                      <input type="hidden" name="page" value={String(page)} />
                      <input type="hidden" name="pageSize" value={String(pageSize)} />
                      <input
                        name="studentQ"
                        defaultValue={studentQ}
                        placeholder={t(lang, "Filter by student/teacher name", "按学生/老师姓名筛选")}
                        style={{ minWidth: 260 }}
                      />
                      <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
                      <a href={`/admin/classes?page=${page}&pageSize=${pageSize}`}>{t(lang, "Clear", "清除")}</a>
                    </form>
                    {oneOnOneRows.length === 0 ? (
                      <div style={{ color: "#999", marginBottom: 10 }}>{t(lang, "No matching students.", "没有匹配的学生。")}</div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                        {oneOnOneRows.map((r) => (
                          <div key={`${r.classId}-${r.studentId ?? r.studentName}`} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
                            <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <ClassTypeBadge capacity={1} compact />
                              <a href={`/admin/classes/${r.classId}`}>{r.studentName}</a>
                            </div>
                            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                              {r.groupLabel}
                            </div>
                            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                              {t(lang, "Teacher", "老师")}: {r.teacherLabel} | {t(lang, "Campus", "校区")}: {r.campusLabel} | {t(lang, "Room", "教室")}: {r.roomLabel}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                              {formatId("CLS", r.classId)} | {t(lang, "Sessions", "课次")}: <b>{r.sessionsCount}</b>
                            </div>
                            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <a href={`/admin/classes/${r.classId}`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                                {t(lang, "View", "查看")}
                              </a>
                              <a href={`/admin/classes/${r.classId}/sessions`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                                {t(lang, "Sessions", "课次")}
                              </a>
                              <a href={`/admin/enrollments`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                                {t(lang, "Manage Enrollments", "管理报名")}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", color: "#555" }}>{t(lang, "Show template grouping", "展开模板分组视图")}</summary>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, marginTop: 10 }}>
                        {Array.from(grouped.values()).map((g) => (
                          <details key={g.key} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
                            <summary style={{ cursor: "pointer", display: "grid", gap: 4 }}>
                              <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <ClassTypeBadge capacity={1} compact />
                                <a href={`/admin/classes/${g.classes[0]?.id ?? ""}`}>{g.groupLabel}</a>
                              </div>
                              <div style={{ color: "#666", fontSize: 12 }}>
                                {t(lang, "Teacher", "老师")}: {g.teacherLabel} | {t(lang, "Campus", "校区")}: {g.campusLabel} | {t(lang, "Room", "教室")}:{" "}
                                {g.roomLabel}
                              </div>
                            </summary>
                          </details>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {groupClasses.length > 0 && (
                  <div id="classes-group">
                  <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ color: "#666", fontSize: 12 }}>
                      {t(lang, "Group Classes", "班课")} {t(lang, "Page", "页")}: {page} / {groupTotalPages} · {t(lang, "Total", "总数")}: {groupTotal}
                    </span>
                    <span style={{ color: "#666", fontSize: 12 }}>
                      {t(lang, "Per Page", "每页")}:{" "}
                      {[20, 50, 100].map((size, idx) => (
                        <span key={size}>
                          {idx > 0 ? " / " : ""}
                          {size === pageSize ? <b>{size}</b> : <a href={buildPageHref(1, size)}>{size}</a>}
                        </span>
                      ))}
                    </span>
                    <a
                      href={page > 1 ? buildPageHref(page - 1) : "#"}
                      style={{ pointerEvents: page > 1 ? "auto" : "none", opacity: page > 1 ? 1 : 0.4 }}
                    >
                      {t(lang, "Prev", "上一页")}
                    </a>
                    <a
                      href={page < groupTotalPages ? buildPageHref(page + 1) : "#"}
                      style={{ pointerEvents: page < groupTotalPages ? "auto" : "none", opacity: page < groupTotalPages ? 1 : 0.4 }}
                    >
                      {t(lang, "Next", "下一页")}
                    </a>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                    {groupClasses.map((c) => (
                      <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
                        <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <ClassTypeBadge capacity={c.capacity} compact />
                          <a href={`/admin/classes/${c.id}`}>
                            {c.course.name}
                            {c.subject ? ` / ${c.subject.name}` : ""}
                            {c.level ? ` / ${c.level.name}` : ""}
                          </a>
                        </div>
                        <div style={{ color: "#999", fontSize: 12, marginTop: 2 }}>{formatId("CLS", c.id)}</div>
                        <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                          {t(lang, "Teacher", "老师")}: {c.teacher.name}
                        </div>
                        <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                          {t(lang, "Campus", "校区")}: {c.campus.name} | {t(lang, "Room", "教室")}: {c.room?.name ?? "(none)"}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 10, fontSize: 12 }}>
                          <span>
                            {t(lang, "Enrollments", "报名")}: <b>{(c as any)._count?.enrollments ?? 0}</b>
                          </span>
                          <span>
                            {t(lang, "Sessions", "课次")}: <b>{(c as any)._count?.sessions ?? 0}</b>
                          </span>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <a href={`/admin/classes/${c.id}`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                            {t(lang, "View", "查看")}
                          </a>
                          <a href={`/admin/enrollments`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                            {t(lang, "Manage Enrollments", "管理报名")}
                          </a>
                          <a href={`/admin/classes/${c.id}/sessions`} style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
                            {t(lang, "Sessions", "课次")}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}



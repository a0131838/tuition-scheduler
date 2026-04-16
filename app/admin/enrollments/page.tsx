import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import SimpleModal from "../_components/SimpleModal";
import EnrollmentCreateForm from "../_components/EnrollmentCreateForm";
import EnrollmentExpandCollapse from "../_components/EnrollmentExpandCollapse";
import EnrollmentFilterForm from "../_components/EnrollmentFilterForm";
import NoticeBanner from "../_components/NoticeBanner";
import EnrollmentRemoveButton from "./EnrollmentRemoveButton";
import EnrollmentRestoreButton from "./EnrollmentRestoreButton";
import { isGroupPackNote } from "@/lib/package-mode";
import {
  courseEnrollmentConflictMessage,
  findStudentCourseEnrollment,
  formatEnrollmentConflict,
} from "@/lib/enrollment-conflict";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../_components/workbenchStyles";

function enrollmentsSectionLinkStyle(background: string, border: string) {
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

function classLabel(cls: {
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

type FilterableClass = {
  courseId: string;
  subjectId: string | null;
  levelId: string | null;
  teacherId: string;
  campusId: string;
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
  teacher: { name: string };
  campus: { name: string };
  room?: { name: string } | null;
};

type OneOnOneEntry = {
  classId: string;
  studentId: string | null;
  studentName: string;
  cls: {
    id: string;
    courseId: string;
    subjectId: string | null;
    levelId: string | null;
    teacherId: string;
    campusId: string;
    roomId: string | null;
    oneOnOneGroupId: string | null;
    course: { name: string };
    subject?: { name: string } | null;
    level?: { name: string } | null;
    teacher: { name: string };
    campus: { name: string };
    room?: { name: string } | null;
  };
  fromEnrollment: boolean;
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    msg?: string;
    err?: string;
    q?: string;
    courseId?: string;
    subjectId?: string;
    levelId?: string;
    teacherId?: string;
    campusId?: string;
    classType?: string;
    undoClassId?: string;
    undoStudentId?: string;
  }>;
}) {
  const lang = await getLang();
  const formatId = (prefix: string, id: string) =>
    `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id}`;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const q = (sp?.q ?? "").trim().toLowerCase();
  const courseId = (sp?.courseId ?? "").trim();
  const subjectId = (sp?.subjectId ?? "").trim();
  const levelId = (sp?.levelId ?? "").trim();
  const teacherId = (sp?.teacherId ?? "").trim();
  const campusId = (sp?.campusId ?? "").trim();
  const classType = (sp?.classType ?? "").trim();
  const undoClassId = (sp?.undoClassId ?? "").trim();
  const undoStudentId = (sp?.undoStudentId ?? "").trim();
  const isFiltered = !!(q || courseId || subjectId || levelId || teacherId || campusId || classType);

  const [classes, students, enrollments] = await Promise.all([
    prisma.class.findMany({
      include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true, oneOnOneStudent: true },
      orderBy: { id: "asc" },
    }),
    prisma.student.findMany({ orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      include: {
        student: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { id: "desc" },
    }),
  ]);

  const courseOptions = Array.from(new Map(classes.map((c) => [c.courseId, c.course]))).map(([id, c]) => ({
    id,
    name: c.name,
  }));
  const subjectOptions = Array.from(
    new Map(
      classes
        .filter((c) => c.subjectId && c.subject)
        .map((c) => [c.subjectId!, { id: c.subjectId!, name: c.subject!.name, courseId: c.courseId, courseName: c.course.name }])
    ).values()
  );
  const levelOptions = Array.from(
    new Map(
      classes
        .filter((c) => c.levelId && c.level && c.subjectId && c.subject)
        .map((c) => [
          c.levelId!,
          {
            id: c.levelId!,
            name: c.level!.name,
            subjectId: c.subjectId!,
            subjectName: c.subject!.name,
            courseName: c.course.name,
          },
        ])
    ).values()
  );
  const teacherOptions = Array.from(new Map(classes.map((c) => [c.teacherId, c.teacher]))).map(([id, t]) => ({
    id,
    name: t.name,
  }));
  const campusOptions = Array.from(new Map(classes.map((c) => [c.campusId, c.campus]))).map(([id, c]) => ({
    id,
    name: c.name,
  }));

  const activePackages = students.length
      ? await prisma.coursePackage.findMany({
        where: {
          status: "ACTIVE",
          validFrom: { lte: new Date() },
          AND: [
            {
              OR: [
                { studentId: { in: students.map((s) => s.id) } },
                { sharedStudents: { some: { studentId: { in: students.map((s) => s.id) } } } },
              ],
            },
            { OR: [{ validTo: null }, { validTo: { gte: new Date() } }] },
            { OR: [{ type: "MONTHLY" }, { type: "HOURS", remainingMinutes: { gt: 0 } }] },
          ],
        },
        select: {
          studentId: true,
          courseId: true,
          course: { select: { name: true } },
          sharedStudents: { select: { studentId: true } },
          sharedCourses: { select: { courseId: true, course: { select: { name: true } } } },
        },
      })
    : [];

  const studentCourseMap = new Map<string, Set<string>>();
  const studentCourseIdMap = new Map<string, Set<string>>();
  for (const p of activePackages) {
    const targetStudents = [p.studentId, ...p.sharedStudents.map((s) => s.studentId)];
    const coursePairs = [
      { id: p.courseId, name: p.course.name },
      ...p.sharedCourses.map((sc) => ({ id: sc.courseId, name: sc.course.name })),
    ];
    for (const sid of targetStudents) {
      if (!studentCourseMap.has(sid)) studentCourseMap.set(sid, new Set());
      if (!studentCourseIdMap.has(sid)) studentCourseIdMap.set(sid, new Set());
      for (const c of coursePairs) {
        studentCourseMap.get(sid)!.add(c.name);
        studentCourseIdMap.get(sid)!.add(c.id);
      }
    }
  }

  const enrollmentsByClass = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    if (!enrollmentsByClass.has(e.classId)) enrollmentsByClass.set(e.classId, []);
    enrollmentsByClass.get(e.classId)!.push(e);
  }

  const classMatchesFilters = (cls: FilterableClass) => {
    if (courseId && cls.courseId !== courseId) return false;
    if (subjectId && cls.subjectId !== subjectId) return false;
    if (levelId && cls.levelId !== levelId) return false;
    if (teacherId && cls.teacherId !== teacherId) return false;
    if (campusId && cls.campusId !== campusId) return false;
    return true;
  };

  const entryMatchesQuery = (cls: FilterableClass, studentName = "") => {
    if (!q) return true;
    const hay = [
      cls.course.name,
      cls.subject?.name ?? "",
      cls.level?.name ?? "",
      cls.teacher.name,
      cls.campus.name,
      cls.room?.name ?? "",
      studentName,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const filteredGroupEnrollments = enrollments.filter((e) => {
    if (e.class.capacity === 1) return false;
    if (classType === "one") return false;
    if (!classMatchesFilters(e.class)) return false;
    if (!entryMatchesQuery(e.class, e.student?.name ?? "")) return false;
    return true;
  });

  const oneOnOneEntries: OneOnOneEntry[] = [];

  for (const cls of classes.filter((c) => c.capacity === 1)) {
    if (classType === "group") continue;
    if (!classMatchesFilters(cls)) continue;

    const rows = enrollmentsByClass.get(cls.id) ?? [];
    if (rows.length > 0) {
      for (const e of rows) {
        const name = e.student?.name ?? "-";
        if (!entryMatchesQuery(cls, name)) continue;
        oneOnOneEntries.push({
          classId: cls.id,
          studentId: e.studentId,
          studentName: name,
          cls,
          fromEnrollment: true,
        });
      }
      continue;
    }

    if (cls.oneOnOneStudent?.name) {
      const name = cls.oneOnOneStudent.name;
      if (!entryMatchesQuery(cls, name)) continue;
      oneOnOneEntries.push({
        classId: cls.id,
        studentId: cls.oneOnOneStudentId ?? null,
        studentName: name,
        cls,
        fromEnrollment: false,
      });
      continue;
    }

    if (entryMatchesQuery(cls, "")) {
      oneOnOneEntries.push({
        classId: cls.id,
        studentId: null,
        studentName: "-",
        cls,
        fromEnrollment: false,
      });
    }
  }

  const oneOnOneRows = oneOnOneEntries;
  const groupRows = filteredGroupEnrollments;
  const filteredEnrollments = [...oneOnOneRows, ...groupRows];
  const oneCardStyle = {
    border: "2px solid #fdba74",
    borderRadius: 10,
    padding: 12,
    background: "linear-gradient(180deg, #fff7ed 0%, #fff 100%)",
  } as const;
  const groupCardStyle = {
    border: "2px solid #93c5fd",
    borderRadius: 10,
    padding: 12,
    background: "linear-gradient(180deg, #eff6ff 0%, #fff 100%)",
  } as const;

  const undoClass = undoClassId ? classes.find((c) => c.id === undoClassId) : null;
  const undoStudent = undoStudentId ? students.find((s) => s.id === undoStudentId) : null;

  return (
    <div>
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>{t(lang, "Enrollments workbench", "报名工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Enrollments", "报名管理")}</h2>
          <div style={{ color: "#475569", maxWidth: 940 }}>
            {t(
              lang,
              "Use this page to add enrollments, filter the roster, and separate 1-on-1 templates from group classes so you can act on the right structure quickly.",
              "这里用于新增报名、筛选报名结构，并把一对一模板和班课区分开来，便于更快处理正确的对象。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Visible rows", "当前结果")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{oneOnOneRows.length + groupRows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fff7ed" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "1-on-1 rows", "一对一")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{oneOnOneRows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("indigo"), background: "#eef2ff" }}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Group rows", "班课")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{groupRows.length}</div>
          </div>
          <div style={workbenchMetricCardStyle(isFiltered ? "rose" : "slate")}>
            <div style={workbenchMetricLabelStyle(isFiltered ? "rose" : "slate")}>{t(lang, "Filters active", "筛选状态")}</div>
            <div style={{ ...workbenchMetricValueStyle(isFiltered ? "rose" : "slate"), fontSize: 18 }}>
              {isFiltered ? t(lang, "Filtered", "已筛选") : t(lang, "All", "全部")}
            </div>
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
          <div style={{ fontWeight: 800 }}>{t(lang, "Enrollments work map", "报名工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Add a new enrollment first if needed, then narrow the list with filters, and finally work through 1-on-1 templates or group classes separately.", "如果需要先新增报名，再用筛选缩小范围，最后分别处理一对一模板或班课。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#enrollments-actions" style={enrollmentsSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Add enrollment", "新增报名")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Open the add dialog or return to schedule", "打开新增弹窗或回到周课表")}</span>
          </a>
          <a href="#enrollments-filters" style={enrollmentsSectionLinkStyle("#eff6ff", "#93c5fd")}>
            <strong>{t(lang, "Filters", "筛选区")}</strong>
            <span style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Filter by class structure, teacher, campus, or student query", "按班型、老师、校区或学生搜索过滤")}</span>
          </a>
          <a href="#enrollments-one-on-one" style={enrollmentsSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "1-on-1 templates", "一对一模板")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Review private templates and remove or inspect rows", "处理一对一模板、查看或取消报名")}</span>
          </a>
          <a href="#enrollments-group" style={enrollmentsSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Group classes", "班课区")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Handle grouped enrollments separately", "单独处理班课报名区")}</span>
          </a>
        </div>
      </section>

      <p>
        <a
          href="/admin/schedule"
          style={{ display: "inline-block", padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}
        >
          ← {t(lang, "Back to Schedule", "返回周课表")}
        </a>
      </p>

      {err ? (
        <NoticeBanner
          type="error"
          title={t(lang, "Error", "错误")}
          message={
            err === "Missing classId or studentId"
              ? t(lang, "Missing class or student.", "请先选择班级和学生。")
              : err === "Class not found"
              ? t(lang, "Class not found.", "班级不存在。")
              : err === "Student has no active package for this course"
              ? t(lang, "Student has no active package for this course.", "学生没有该课程的有效课包。")
              : err === "Already enrolled"
              ? t(lang, "Already enrolled.", "该学生已报名该班级。")
              : err
          }
        />
      ) : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}
      {undoClassId && undoStudentId && (
        <NoticeBanner
          type="warn"
          title={t(lang, "Enrollment removed.", "已取消报名")}
          message={`${undoStudent?.name ?? "-"} ${t(lang, "in", "在")} ${undoClass ? classLabel(undoClass) : undoClassId}`}
        />
      )}
      {undoClassId && undoStudentId && (
        <div style={{ marginBottom: 12 }}>
          <EnrollmentRestoreButton classId={undoClassId} studentId={undoStudentId} label={t(lang, "Undo", "撤销")} />
        </div>
      )}

      <div id="enrollments-actions" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Add Enrollment", "新增报名")} title={t(lang, "Add Enrollment", "新增报名")}>
          <EnrollmentCreateForm
            classes={classes.map((c) => ({
              id: c.id,
              courseId: c.courseId,
              courseName: c.course.name,
              subjectName: c.subject?.name ?? null,
              levelName: c.level?.name ?? null,
              teacherName: c.teacher.name,
              campusName: c.campus.name,
              roomName: c.room?.name ?? null,
            }))}
            students={students.map((s) => ({
              id: s.id,
              name: s.name,
              courseNames: Array.from(studentCourseMap.get(s.id) ?? []),
              courseIds: Array.from(studentCourseIdMap.get(s.id) ?? []),
            }))}
            labels={{
              classLabel: t(lang, "Class", "班级"),
              studentLabel: t(lang, "Student", "学生"),
              searchStudent: t(lang, "Search student name", "搜索学生姓名"),
              noActivePackage: t(lang, "No active package", "无有效课包"),
              mismatchWarn: t(lang, "Course mismatch: student has no package for this course.", "课程不匹配：学生没有该课程课包。"),
              confirm: t(lang, "Confirm Enrollment", "确认报名"),
            }}
          />
          <p style={{ color: "#666", marginTop: 10 }}>
            {t(
              lang,
              "Rule: a student can enroll in the same class only once.",
              "规则：同一学生对同一班级只能报名一次。"
            )}
          </p>
        </SimpleModal>
      </div>

      <h3>{t(lang, "Enrollment List", "报名列表")}</h3>
      <div id="enrollments-filters" style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 12 }}>
        <EnrollmentFilterForm
          courses={courseOptions}
          subjects={subjectOptions}
          levels={levelOptions}
          teachers={teacherOptions}
          campuses={campusOptions}
          initial={{
            q: sp?.q ?? "",
            courseId,
            subjectId,
            levelId,
            teacherId,
            campusId,
            classType,
          }}
          labels={{
            searchPlaceholder: t(lang, "Search by class/student/teacher/campus...", "搜索班级/学生/老师/校区..."),
            courseAll: t(lang, "Course (all)", "课程（全部）"),
            subjectAll: t(lang, "Subject (all)", "科目（全部）"),
            levelAll: t(lang, "Level (all)", "级别（全部）"),
            teacherAll: t(lang, "Teacher (all)", "老师（全部）"),
            campusAll: t(lang, "Campus (all)", "校区（全部）"),
            classTypeAll: t(lang, "Class Type (all)", "班级类型（全部）"),
            classTypeOne: t(lang, "1-on-1", "一对一"),
            classTypeGroup: t(lang, "Group", "班课"),
            apply: t(lang, "Apply", "应用"),
            clear: t(lang, "Clear", "清除"),
            exportPdf: t(lang, "Export PDF", "导出PDF"),
          }}
        />
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555", marginTop: 6 }}>
          <div>
            {t(lang, "Total", "总数")}: <b>{oneOnOneRows.length + groupRows.length}</b>
          </div>
          <div>
            {t(lang, "1-on-1", "一对一")}: <b>{oneOnOneRows.length}</b>
          </div>
          <div>
            {t(lang, "Group", "班课")}: <b>{groupRows.length}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, border: "2px solid #fdba74", background: "#fff7ed", color: "#9a3412", fontWeight: 700 }}>
            {t(lang, "1-on-1 Area", "一对一区域")}
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, border: "2px solid #93c5fd", background: "#eff6ff", color: "#1e3a8a", fontWeight: 700 }}>
            {t(lang, "Group Class Area", "班课区域")}
          </span>
        </div>
      </div>
      <EnrollmentExpandCollapse />

      {filteredEnrollments.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No enrollments yet.", "暂无报名")}</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {oneOnOneRows.length > 0 && (
            <div id="enrollments-one-on-one">
              <h3 style={{ marginBottom: 8 }}>{t(lang, "1-on-1 Templates", "一对一模板")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                {Array.from(
                  oneOnOneRows.reduce((map, e) => {
                    const key =
                      e.cls.oneOnOneGroupId ??
                      `${e.cls.teacherId}|${e.cls.courseId}|${e.cls.subjectId ?? ""}|${e.cls.levelId ?? ""}|${e.cls.campusId}|${e.cls.roomId ?? ""}`;
                    if (!map.has(key)) {
                      map.set(key, {
                        cls: e.cls,
                        rows: [] as OneOnOneEntry[],
                      });
                    }
                    map.get(key)!.rows.push(e);
                    return map;
                  }, new Map<string, { cls: OneOnOneEntry["cls"]; rows: OneOnOneEntry[] }>())
                ).map(([key, group]) => (
                  <details key={key} open data-enroll-card style={oneCardStyle}>
                    <summary style={{ cursor: "pointer", display: "grid", gap: 4, background: "#ffedd5", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontWeight: 700 }}>
                        {group.cls.course.name} / {group.cls.subject?.name ?? "-"} / {group.cls.level?.name ?? "-"}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          {t(lang, "1-on-1", "一对一")}
                        </span>
                      </div>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {t(lang, "Teacher", "老师")}: {group.cls.teacher.name} | {t(lang, "Campus", "校区")}: {group.cls.campus.name}{" "}
                        | {t(lang, "Room", "教室")}: {group.cls.room?.name ?? "(none)"}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {t(lang, "Students", "学生")}:{" "}
                        <b>{Array.from(new Set(group.rows.map((r) => r.studentId ?? r.studentName))).filter((v) => v && v !== "-").length || 0}</b>
                      </div>
                    </summary>

                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      {group.rows.map((e) => (
                        <div key={`${e.classId}-${e.studentId ?? e.studentName}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div>
                            {e.studentName || "-"}{" "}
                            {e.studentId ? <span style={{ color: "#999", fontSize: 12 }}>({formatId("STU", e.studentId)})</span> : null}
                          </div>
                          {e.fromEnrollment && e.studentId ? (
                            <EnrollmentRemoveButton
                              classId={e.classId}
                              studentId={e.studentId}
                              labels={{ remove: t(lang, "Remove", "取消报名"), undo: t(lang, "Undo", "撤销") }}
                            />
                          ) : (
                            <div style={{ color: "#999", fontSize: 12 }}>
                              {t(lang, "Not enrolled", "未报名")} ·{" "}
                              <a href={`/admin/classes/${e.classId}`}>{t(lang, "View class", "查看班级")}</a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {groupRows.length > 0 && (
            <div id="enrollments-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
              {Array.from(
                groupRows.reduce((map, e) => {
                  const key = e.classId;
                  if (!map.has(key)) map.set(key, { cls: e.class, rows: [] as typeof enrollments });
                  map.get(key)!.rows.push(e);
                  return map;
                }, new Map<string, { cls: (typeof enrollments)[number]["class"]; rows: typeof enrollments }>())
              ).map(([classId, group]) => (
                <details key={classId} open data-enroll-card style={groupCardStyle}>
                  <summary style={{ cursor: "pointer", display: "grid", gap: 4, background: "#dbeafe", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontWeight: 700 }}>
                      {group.cls.course.name} / {group.cls.subject?.name ?? "-"} / {group.cls.level?.name ?? "-"}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: "#dbeafe",
                          color: "#1e3a8a",
                        }}
                      >
                        {t(lang, "Group Class", "班课")}
                      </span>
                    </div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      {t(lang, "Teacher", "老师")}: {group.cls.teacher.name} | {t(lang, "Campus", "校区")}: {group.cls.campus.name}{" "}
                      | {t(lang, "Room", "教室")}: {group.cls.room?.name ?? "(none)"} | {formatId("CLS", classId)}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {t(lang, "Enrollments", "报名")}: <b>{group.rows.length}</b>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <a href={`/admin/enrollments/export/pdf?classId=${classId}`}>{t(lang, "Export PDF", "导出PDF")}</a>
                    </div>
                  </summary>

                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {group.rows.map((e) => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          {e.student?.name ?? "-"}{" "}
                          <span style={{ color: "#999", fontSize: 12 }}>({formatId("STU", e.studentId)})</span>
                        </div>
                        <EnrollmentRemoveButton
                          classId={e.classId}
                          studentId={e.studentId}
                          labels={{ remove: t(lang, "Remove", "取消报名"), undo: t(lang, "Undo", "撤销") }}
                        />
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

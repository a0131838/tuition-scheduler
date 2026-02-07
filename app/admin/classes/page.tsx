import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLang, t } from "@/lib/i18n";
import SimpleModal from "../_components/SimpleModal";
import ClassCreateForm from "../_components/ClassCreateForm";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function canTeachSubject(teacher: { subjectCourseId?: string | null; subjects?: Array<{ id: string }> }, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  return Array.isArray(teacher?.subjects) ? teacher.subjects.some((s) => s.id === subjectId) : false;
}

async function createClass(formData: FormData) {
  "use server";
  const subjectId = String(formData.get("subjectId") ?? "");
  const levelIdRaw = String(formData.get("levelId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const capacity = Number(formData.get("capacity") ?? 0);

  if (!subjectId || !teacherId || !campusId || !Number.isFinite(capacity) || capacity <= 0) return;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { course: true },
  });
  if (!subject) return;
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: { select: { id: true } } },
  });
  if (!teacher || !canTeachSubject(teacher as any, subjectId)) return;

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) return;
    levelId = levelIdRaw;
  }

  const courseId = subject.courseId;
  const roomId = roomIdRaw ? roomIdRaw : null;
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { campusId: true, capacity: true } });
    if (!room || room.campusId !== campusId) return;
    if (capacity > room.capacity) return;
  }

  await prisma.class.create({
    data: {
      courseId,
      subjectId,
      levelId,
      teacherId,
      campusId,
      roomId,
      capacity,
    },
  });

  revalidatePath("/admin/classes");
}

export default async function ClassesPage() {
  const lang = await getLang();
  const formatId = (prefix: string, id: string) =>
    `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id}`;
  const [classes, courses, subjects, levels, teachers, campuses, rooms] = await Promise.all([
    prisma.class.findMany({
      include: {
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
      },
      orderBy: { id: "asc" },
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ include: { subject: { include: { course: true } } }, orderBy: [{ subjectId: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ orderBy: { name: "asc" }, include: { subjects: { select: { id: true } } } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h2>{t(lang, "Classes", "班级")}</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
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
        <SimpleModal buttonLabel={t(lang, "Create Class", "新建班级")} title={t(lang, "Create Class", "新建班级")} closeOnSubmit>
          <ClassCreateForm
            action={createClass}
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

      {classes.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No classes yet.", "暂无班级")}</div>
      ) : (
        <>
          {(() => {
            const oneOnOneClasses = classes.filter((c) => c.capacity === 1);
            const groupClasses = classes.filter((c) => c.capacity !== 1);
            const totalOneOnOneStudents = Array.from(
              new Set(
                oneOnOneClasses.flatMap((c) =>
                  c.oneOnOneStudent?.id
                    ? [c.oneOnOneStudent.id]
                    : c.enrollments.map((e) => e.studentId)
                )
              )
            ).length;
            const grouped = new Map<
              string,
              {
                key: string;
                groupLabel: string;
                teacherLabel: string;
                campusLabel: string;
                roomLabel: string;
                classes: typeof classes;
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

            return (
              <>
                {grouped.size > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <h3 style={{ marginBottom: 0 }}>{t(lang, "1-on-1 Templates", "一对一模板")}</h3>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {t(lang, "Classes", "班级")}: {oneOnOneClasses.length} · {t(lang, "Students", "学生")}: {totalOneOnOneStudents}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                      {Array.from(grouped.values()).map((g) => (
                        <details key={g.key} open style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
                          <summary style={{ cursor: "pointer", display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <ClassTypeBadge capacity={1} compact />
                              <a href={`/admin/classes/${g.classes[0]?.id ?? ""}`}>{g.groupLabel}</a>
                            </div>
                            <div style={{ color: "#666", fontSize: 12 }}>
                              {t(lang, "Teacher", "老师")}: {g.teacherLabel} | {t(lang, "Campus", "校区")}: {g.campusLabel} |{" "}
                              {t(lang, "Room", "教室")}: {g.roomLabel}
                            </div>
                            <div style={{ fontSize: 12, color: "#475569" }}>
                              {t(lang, "Students", "学生")}:{" "}
                              <b>{Array.from(new Set(g.entries.map((e) => e.studentId ?? e.studentName))).length}</b> |{" "}
                              {t(lang, "Sessions", "课次")}:{" "}
                              <b>{g.classes.reduce((sum, c) => sum + ((c as any)._count?.sessions ?? 0), 0)}</b>
                            </div>
                          </summary>
                          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                            {g.entries.map((e) => {
                              return (
                                <div key={`${e.classId}-${e.studentId ?? e.studentName}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                  <div>
                                    <a href={`/admin/classes/${e.classId}`}>{e.studentName}</a>{" "}
                                    <span style={{ color: "#999", fontSize: 12 }}>{formatId("CLS", e.classId)}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <a
                                      href={`/admin/classes/${e.classId}/sessions`}
                                      style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}
                                    >
                                      {t(lang, "Sessions", "课次")}
                                    </a>
                                    <a
                                      href={`/admin/enrollments`}
                                      style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}
                                    >
                                      {t(lang, "Manage Enrollments", "管理报名")}
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {groupClasses.length > 0 && (
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
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}




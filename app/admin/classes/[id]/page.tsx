import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import NoticeBanner from "../../_components/NoticeBanner";
import { isGroupPackNote } from "@/lib/package-mode";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import ClassEnrollmentsClient from "./ClassEnrollmentsClient";
import DeleteClassClient from "./DeleteClassClient";
import ClassEditClient from "./ClassEditClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../_components/workbenchStyles";

function classSectionLinkStyle(background: string, border: string) {
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

function canTeachSubject(teacher: { subjectCourseId?: string | null; subjects?: Array<{ id: string }> }, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  return Array.isArray(teacher?.subjects) ? teacher.subjects.some((s) => s.id === subjectId) : false;
}

async function updateClass(classId: string, formData: FormData) {
  "use server";
  const subjectId = String(formData.get("subjectId") ?? "");
  const levelIdRaw = String(formData.get("levelId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const capacity = Number(formData.get("capacity") ?? 0);

  if (!subjectId || !teacherId || !campusId || !Number.isFinite(capacity) || capacity <= 0) {
    redirect(`/admin/classes/${classId}?err=Invalid+input`);
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { course: true },
  });
  if (!subject) {
    redirect(`/admin/classes/${classId}?err=Invalid+subject`);
  }
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: { select: { id: true } } },
  });
  if (!teacher || !canTeachSubject(teacher as any, subjectId)) {
    redirect(`/admin/classes/${classId}?err=Teacher+cannot+teach+this+subject`);
  }

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) {
      redirect(`/admin/classes/${classId}?err=Invalid+subject+or+level`);
    }
    levelId = levelIdRaw;
  }

  const roomId = roomIdRaw ? roomIdRaw : null;
  const courseId = subject.courseId;
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { campusId: true, capacity: true } });
    if (!room || room.campusId !== campusId) {
      redirect(`/admin/classes/${classId}?err=Room+does+not+match+campus`);
    }
    if (capacity > room.capacity) {
      redirect(`/admin/classes/${classId}?err=Class+capacity+exceeds+room+capacity`);
    }
  }

  await prisma.class.update({
    where: { id: classId },
    data: { courseId, subjectId, levelId, teacherId, campusId, roomId, capacity },
  });

  redirect(`/admin/classes/${classId}?msg=Saved`);
}

async function deleteClass(classId: string) {
  "use server";

  await prisma.enrollment.deleteMany({ where: { classId } });
  await prisma.session.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });

  redirect("/admin/classes");
}

async function addEnrollment(classId: string, formData: FormData) {
  "use server";
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) redirect(`/admin/classes/${classId}?err=Missing+studentId`);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { courseId: true, capacity: true },
  });
  if (!cls) redirect(`/admin/classes/${classId}?err=Class+not+found`);

  const now = new Date();
  const pkgs = await prisma.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(cls.courseId),
        { status: "ACTIVE" },
        { validFrom: { lte: now } },
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      ],
    },
    select: { type: true, remainingMinutes: true, note: true },
  });
  const hasValidPackage = pkgs.some((p) => {
    if (p.type === "MONTHLY") return true;
    if (p.type !== "HOURS" || (p.remainingMinutes ?? 0) <= 0) return false;
    if (cls.capacity === 1) return !isGroupPackNote(p.note);
    return true;
  });
  if (!hasValidPackage) redirect(`/admin/classes/${classId}?err=No+active+package+for+this+course`);

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });
  if (exists) redirect(`/admin/classes/${classId}?err=Already+enrolled`);

  await prisma.enrollment.create({ data: { classId, studentId } });
  redirect(`/admin/classes/${classId}?msg=Enrolled+successfully`);
}

async function removeEnrollment(classId: string, formData: FormData) {
  "use server";
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) redirect(`/admin/classes/${classId}?err=Missing+studentId`);

  await prisma.enrollment.deleteMany({ where: { classId, studentId } });
  redirect(`/admin/classes/${classId}?msg=Removed`);
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { id: classId } = await params;
  const sp = await searchParams;

  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { course: true, subject: { include: { course: true } }, level: true, teacher: true, campus: true, room: true },
  });

  if (!cls) {
    return (
      <div>
        <h2>{t(lang, "Class Not Found", "班级不存在")}</h2>
        <a href="/admin/classes">← {t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const [students, enrollments, subjects, levels, teachers, campuses, rooms] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      where: { classId },
      include: { student: true },
      orderBy: [{ studentId: "asc" }],
    }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ include: { subject: { include: { course: true } } }, orderBy: [{ subjectId: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ orderBy: { name: "asc" }, include: { subjects: { select: { id: true } } } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  const activePkgs = await prisma.coursePackage.findMany({
    where: {
      AND: [
        {
          OR: [
            { studentId: { in: students.map((s) => s.id) } },
            { sharedStudents: { some: { studentId: { in: students.map((s) => s.id) } } } },
          ],
        },
        coursePackageMatchesCourse(cls.courseId),
      ],
      status: "ACTIVE",
      validFrom: { lte: new Date() },
      OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
    },
    select: {
      studentId: true,
      type: true,
      remainingMinutes: true,
      note: true,
      sharedStudents: { select: { studentId: true } },
    },
  });
  const eligibleStudentSet = new Set<string>();
  for (const p of activePkgs) {
    const validForClass =
      p.type === "MONTHLY" || (p.type === "HOURS" && (p.remainingMinutes ?? 0) > 0 && (cls.capacity !== 1 || !isGroupPackNote(p.note)));
    if (!validForClass) continue;
    eligibleStudentSet.add(p.studentId);
    for (const s of p.sharedStudents) eligibleStudentSet.add(s.studentId);
  }

  const enrolledSet = new Set(enrollments.map((e) => e.studentId));
  const availableStudents = students.filter((s) => !enrolledSet.has(s.id) && eligibleStudentSet.has(s.id));

  return (
    <div>
      <section style={workbenchHeroStyle("indigo")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{t(lang, "Class workbench", "班级工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Class Detail", "班级详情")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Use this page to confirm the class setup, update teacher or room if needed, and manage enrollments without jumping between separate screens.",
              "这里先确认班级设定，再决定是否修改老师/教室，并在同一页处理报名，不用来回切多个页面。"
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a href="/admin/classes">{t(lang, "Back to Classes", "返回班级列表")}</a>
            <a href={`/admin/classes/${classId}/sessions`}>{t(lang, "Open Sessions", "打开课次页")}</a>
            <span style={{ color: "#999" }}>(classId {cls.id})</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Capacity", "容量")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{cls.capacity}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("blue"), background: "#eff6ff" }}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Enrolled", "已报名")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{enrollments.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Can add now", "当前可报名")}</div>
            <div style={workbenchMetricValueStyle("emerald")}>{availableStudents.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Teacher", "老师")}</div>
            <div style={{ ...workbenchMetricValueStyle("slate"), fontSize: 18 }}>{cls.teacher.name}</div>
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
          <div style={{ fontWeight: 800 }}>{t(lang, "Class work map", "班级工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Start with the summary, then edit the class setup, and finally manage enrollments or jump to the sessions page.", "建议先看班级摘要，再改班级设定，最后处理报名，或直接跳去课次页。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#class-summary" style={classSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Summary", "班级摘要")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Check teacher, campus, room, and enrollment load", "先确认老师、校区、教室和报名量")}</span>
          </a>
          <a href="#class-edit" style={classSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Edit setup", "编辑设定")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Update course, teacher, campus, room, or capacity", "修改课程、老师、校区、教室或容量")}</span>
          </a>
          <a href="#class-enrollments" style={classSectionLinkStyle("#f0fdf4", "#86efac")}>
            <strong>{t(lang, "Enrollments", "报名管理")}</strong>
            <span style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Add or remove students with valid packages", "增减有可用课包的学生")}</span>
          </a>
          <a href={`/admin/classes/${classId}/sessions`} style={classSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "Sessions page", "课次页面")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Go to session creation and schedule actions", "进入课次创建和排课操作")}</span>
          </a>
        </div>
      </section>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div id="class-summary" style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 16, background: "#fafafa" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <b>{t(lang, "Course", "课程")}:</b>
          <ClassTypeBadge capacity={cls.capacity} compact />
          <span>
            {cls.course.name}
            {cls.subject ? ` / ${cls.subject.name}` : ""} {cls.level ? ` / ${cls.level.name}` : ""}
          </span>
        </div>
        <div>
          <b>{t(lang, "Teacher", "老师")}:</b> {cls.teacher.name}
        </div>
        <div>
          <b>{t(lang, "Campus", "校区")}:</b> {cls.campus.name}
        </div>
        <div>
          <b>{t(lang, "Room", "教室")}:</b> {cls.room?.name ?? "(none)"}
        </div>
        <div style={{ marginTop: 8 }}>
          <b>{t(lang, "Enrolled", "已报名")}:</b> {enrollments.length} /{" "}
          <b>{t(lang, "Total Students", "学生总数")}:</b> {students.length}
        </div>
      </div>

      <h3 id="class-edit">{t(lang, "Edit Class", "编辑班级")}</h3>
      <ClassEditClient
        classId={classId}
        courses={subjects.length ? Array.from(new Map(subjects.map((s) => [s.courseId, s.course]))).map(([id, c]) => ({ id, name: c.name })) : []}
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
        initial={{
          courseId: cls.courseId,
          subjectId: cls.subjectId ?? subjects[0]?.id ?? "",
          levelId: cls.levelId ?? null,
          teacherId: cls.teacherId,
          campusId: cls.campusId,
          roomId: cls.roomId ?? null,
          capacity: cls.capacity,
        }}
        labels={{
          course: t(lang, "Course", "课程"),
          subject: t(lang, "Subject", "科目"),
          level: t(lang, "Level", "级别"),
          teacher: t(lang, "Teacher", "老师"),
          campus: t(lang, "Campus", "校区"),
          roomOptional: t(lang, "Room (optional)", "教室(可选)"),
          capacity: t(lang, "Capacity", "容量"),
          save: t(lang, "Save", "保存"),
          none: t(lang, "(none)", "(无)"),
          ok: t(lang, "OK", "成功"),
          error: t(lang, "Error", "错误"),
        }}
      />

      <DeleteClassClient
        classId={classId}
        confirmMessage={t(
          lang,
          "Delete class? This also deletes sessions/enrollments under it.",
          "删除班级？将同时删除课次/报名。"
        )}
        label={t(lang, "Delete Class", "删除班级")}
        labels={{ ok: t(lang, "OK", "成功"), error: t(lang, "Error", "错误") }}
      />

      <div id="class-enrollments">
      <ClassEnrollmentsClient
        classId={classId}
        initialStudents={students.map((s) => ({
          id: s.id,
          name: s.name,
          grade: s.grade ?? null,
          hasEligiblePackage: eligibleStudentSet.has(s.id),
        }))}
        initialEnrollments={enrollments.map((e) => ({
          id: e.id,
          studentId: e.studentId,
          studentName: e.student.name,
          studentGrade: e.student.grade ?? null,
        }))}
        labels={{
          enrollments: t(lang, "Enrollments", "报名"),
          selectStudent: t(lang, "Search student name", "搜索学生姓名"),
          add: t(lang, "Add", "添加"),
          remove: t(lang, "Remove", "移除"),
          noEnrollments: t(lang, "No enrollments yet.", "暂无报名"),
          ok: t(lang, "OK", "成功"),
          error: t(lang, "Error", "错误"),
        }}
      />
      </div>
    </div>
  );
}

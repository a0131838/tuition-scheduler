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
      ...coursePackageAccessibleByStudent(studentId),
      AND: [coursePackageMatchesCourse(cls.courseId)],
      status: "ACTIVE",
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
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
      <h2>{t(lang, "Class Detail", "班级详情")}</h2>
      <p>
        <a
          href="/admin/classes"
          style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}
        >
          ← {t(lang, "Back to Classes", "返回班级列表")}
        </a>{" "}
        <span style={{ color: "#999" }}>(classId {cls.id})</span>
      </p>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 16, background: "#fafafa" }}>
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

      <h3>{t(lang, "Edit Class", "编辑班级")}</h3>
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

      <ClassEnrollmentsClient
        classId={classId}
        initialAvailableStudents={availableStudents.map((s) => ({ id: s.id, name: s.name }))}
        initialEnrollments={enrollments.map((e) => ({ id: e.id, studentId: e.studentId, studentName: e.student.name }))}
        labels={{
          enrollments: t(lang, "Enrollments", "报名"),
          selectStudent: t(lang, "Select student", "选择学生"),
          add: t(lang, "Add", "添加"),
          remove: t(lang, "Remove", "移除"),
          noEnrollments: t(lang, "No enrollments yet.", "暂无报名"),
          ok: t(lang, "OK", "成功"),
          error: t(lang, "Error", "错误"),
        }}
      />
    </div>
  );
}

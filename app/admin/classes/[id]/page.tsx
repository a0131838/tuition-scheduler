import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ConfirmSubmitButton from "../../_components/ConfirmSubmitButton";
import { getLang, t } from "@/lib/i18n";

async function updateClass(classId: string, formData: FormData) {
  "use server";
  const subjectId = String(formData.get("subjectId") ?? "");
  const levelId = String(formData.get("levelId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const capacity = Number(formData.get("capacity") ?? 0);

  if (!subjectId || !levelId || !teacherId || !campusId || !Number.isFinite(capacity) || capacity <= 0) {
    redirect(`/admin/classes/${classId}?err=Invalid+input`);
  }

  const level = await prisma.level.findUnique({
    where: { id: levelId },
    include: { subject: true },
  });
  if (!level || level.subjectId !== subjectId) {
    redirect(`/admin/classes/${classId}?err=Invalid+subject+or+level`);
  }

  const roomId = roomIdRaw ? roomIdRaw : null;
  const courseId = level.subject.courseId;

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
  params: { id: string };
  searchParams?: { msg?: string; err?: string };
}) {
  const lang = await getLang();
  const classId = params.id;

  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

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
    prisma.teacher.findMany({ orderBy: { name: "asc" } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  const enrolledSet = new Set(enrollments.map((e) => e.studentId));
  const availableStudents = students.filter((s) => !enrolledSet.has(s.id));

  return (
    <div>
      <h2>{t(lang, "Class Detail", "班级详情")}</h2>
      <p>
        <a href="/admin/classes">← {t(lang, "Back to Classes", "返回班级列表")}</a>{" "}
        <span style={{ color: "#999" }}>(classId {cls.id})</span>
      </p>

      {err && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>{t(lang, "Error", "错误")}:</b> {err}
        </div>
      )}
      {msg && (
        <div style={{ padding: 12, border: "1px solid #b9e6c3", background: "#f2fff5", marginBottom: 12 }}>
          <b>{t(lang, "OK", "成功")}:</b> {msg}
        </div>
      )}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div>
          <b>{t(lang, "Course", "课程")}:</b> {cls.course.name}
          {cls.subject ? ` / ${cls.subject.name}` : ""} {cls.level ? ` / ${cls.level.name}` : ""}
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
      <form action={updateClass.bind(null, classId)} style={{ display: "grid", gap: 8, maxWidth: 860, marginBottom: 16 }}>
        <label>
          {t(lang, "Subject", "科目")}:
          <select name="subjectId" defaultValue={cls.subjectId ?? ""} style={{ marginLeft: 8, minWidth: 360 }}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course.name} - {s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Level", "级别")}:
          <select name="levelId" defaultValue={cls.levelId ?? ""} style={{ marginLeft: 8, minWidth: 360 }}>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.subject.course.name} - {l.subject.name} - {l.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Teacher", "老师")}:
          <select name="teacherId" defaultValue={cls.teacherId} style={{ marginLeft: 8, minWidth: 320 }}>
            {teachers.map((tch) => (
              <option key={tch.id} value={tch.id}>
                {tch.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Campus", "校区")}:
          <select name="campusId" defaultValue={cls.campusId} style={{ marginLeft: 8, minWidth: 320 }}>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Room (optional)", "教室(可选)")}:
          <select name="roomId" defaultValue={cls.roomId ?? ""} style={{ marginLeft: 8, minWidth: 420 }}>
            <option value="">{t(lang, "(none)", "(无)")}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} - {r.campus.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Capacity", "容量")}:
          <input name="capacity" type="number" min={1} defaultValue={cls.capacity} style={{ marginLeft: 8, width: 120 }} />
        </label>

        <button type="submit">{t(lang, "Save", "保存")}</button>
      </form>

      <div style={{ marginBottom: 24 }}>
        <form action={deleteClass.bind(null, classId)}>
          <ConfirmSubmitButton message={t(lang, "Delete class? This also deletes sessions/enrollments under it.", "删除班级？将同时删除课次/报名。")}>
            {t(lang, "Delete Class", "删除班级")}
          </ConfirmSubmitButton>
        </form>
      </div>

      <h3>{t(lang, "Enrollments", "报名")}</h3>
      <form action={addEnrollment.bind(null, classId)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select name="studentId" defaultValue="">
          <option value="">{t(lang, "Select student", "选择学生")}</option>
          {availableStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit">{t(lang, "Add", "添加")}</button>
      </form>

      <div style={{ marginTop: 12 }}>
        {enrollments.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No enrollments yet.", "暂无报名")}</div>
        ) : (
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{e.student.name}</td>
                  <td>
                    <form action={removeEnrollment.bind(null, classId)}>
                      <input type="hidden" name="studentId" value={e.studentId} />
                      <button type="submit">{t(lang, "Remove", "移除")}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLang, t } from "@/lib/i18n";

async function createClass(formData: FormData) {
  "use server";
  const subjectId = String(formData.get("subjectId") ?? "");
  const levelId = String(formData.get("levelId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const campusId = String(formData.get("campusId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const capacity = Number(formData.get("capacity") ?? 0);

  if (!subjectId || !levelId || !teacherId || !campusId || !Number.isFinite(capacity) || capacity <= 0) return;

  const level = await prisma.level.findUnique({
    where: { id: levelId },
    include: { subject: true },
  });
  if (!level || level.subjectId !== subjectId) return;

  const courseId = level.subject.courseId;
  const roomId = roomIdRaw ? roomIdRaw : null;

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
  const [classes, courses, subjects, levels, teachers, campuses, rooms] = await Promise.all([
    prisma.class.findMany({
      include: {
        course: true,
        subject: { include: { course: true } },
        level: { include: { subject: true } },
        teacher: true,
        campus: true,
        room: true,
        _count: { select: { enrollments: true, sessions: true } } as any,
      },
      orderBy: { id: "asc" },
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ include: { subject: { include: { course: true } } }, orderBy: [{ subjectId: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ orderBy: { name: "asc" } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h2>{t(lang, "Classes", "班级")}</h2>

      <p style={{ color: "#666" }}>
        {t(
          lang,
          "This list shows enrollments count and generated sessions count per class.",
          "这里显示每个班级的报名人数与已生成课次数。"
        )}
      </p>

      <h3>{t(lang, "Create Class", "新建班级")}</h3>
      <form action={createClass} style={{ display: "grid", gap: 8, maxWidth: 860, marginBottom: 16 }}>
        <label>
          {t(lang, "Subject", "科目")}:
          <select name="subjectId" defaultValue={subjects[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 360 }}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course.name} - {s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Level", "级别")}:
          <select name="levelId" defaultValue={levels[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 360 }}>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.subject.course.name} - {l.subject.name} - {l.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Teacher", "老师")}:
          <select name="teacherId" defaultValue={teachers[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 320 }}>
            {teachers.map((tch) => (
              <option key={tch.id} value={tch.id}>
                {tch.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Campus", "校区")}:
          <select name="campusId" defaultValue={campuses[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 320 }}>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Room (optional)", "教室(可选)")}:
          <select name="roomId" defaultValue="" style={{ marginLeft: 8, minWidth: 420 }}>
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
          <input name="capacity" type="number" min={1} defaultValue={6} style={{ marginLeft: 8, width: 120 }} />
        </label>

        <button type="submit" disabled={subjects.length === 0 || levels.length === 0 || teachers.length === 0 || campuses.length === 0}>
          {t(lang, "Create", "创建")}
        </button>

        {(subjects.length === 0 || levels.length === 0 || teachers.length === 0 || campuses.length === 0) && (
          <p style={{ color: "#b00" }}>
            {t(lang, "Please create course/subject/level/teacher/campus first.", "请先创建课程/科目/级别/老师/校区。")}
          </p>
        )}
      </form>

      {classes.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No classes yet.", "暂无班级")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Campus", "校区")}</th>
              <th align="left">{t(lang, "Room", "教室")}</th>
              <th align="left">{t(lang, "Enrollments", "报名")}</th>
              <th align="left">{t(lang, "Sessions", "课次")}</th>
              <th align="left">{t(lang, "Actions", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <a href={`/admin/classes/${c.id}`}>
                    {c.course.name}
                    {c.subject ? ` / ${c.subject.name}` : ""}
                    {c.level ? ` / ${c.level.name}` : ""}
                  </a>
                  <div style={{ color: "#999", fontSize: 12 }}>classId {c.id.slice(0, 8)}...</div>
                </td>
                <td>{c.teacher.name}</td>
                <td>{c.campus.name}</td>
                <td>{c.room?.name ?? "(none)"}</td>
                <td>
                  <b>{(c as any)._count?.enrollments ?? 0}</b>
                </td>
                <td>{(c as any)._count?.sessions ?? 0}</td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/admin/classes/${c.id}`}>{t(lang, "View", "查看")}</a>
                  <a href={`/admin/enrollments`}>{t(lang, "Manage Enrollments", "管理报名")}</a>
                  <a href={`/admin/classes/${c.id}/sessions`}>{t(lang, "Sessions", "课次")}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

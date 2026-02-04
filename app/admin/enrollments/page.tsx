import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import StudentSearchSelect from "../_components/StudentSearchSelect";

async function addEnrollment(formData: FormData) {
  "use server";
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  if (!classId || !studentId) {
    redirect("/admin/enrollments?err=Missing+classId+or+studentId");
  }

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });

  if (exists) {
    redirect("/admin/enrollments?err=Already+enrolled");
  }

  await prisma.enrollment.create({
    data: { classId, studentId },
  });

  redirect("/admin/enrollments?msg=Enrolled+successfully");
}

async function removeEnrollment(formData: FormData) {
  "use server";
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  if (!classId || !studentId) {
    redirect("/admin/enrollments?err=Missing+classId+or+studentId");
  }

  await prisma.enrollment.deleteMany({
    where: { classId, studentId },
  });

  redirect("/admin/enrollments?msg=Enrollment+removed");
}

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams?: { msg?: string; err?: string };
}) {
  const lang = await getLang();
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const [classes, students, enrollments] = await Promise.all([
    prisma.class.findMany({
      include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
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

  return (
    <div>
      <h2>{t(lang, "Enrollments", "报名管理")}</h2>

      <p>
        <a href="/admin/schedule">← {t(lang, "Back to Schedule", "返回周课表")}</a>
      </p>

      {err && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f2b3b3",
            background: "#fff5f5",
            marginBottom: 12,
          }}
        >
          <b>{t(lang, "Error", "错误")}:</b> {err}
        </div>
      )}
      {msg && (
        <div
          style={{
            padding: 12,
            border: "1px solid #b9e6c3",
            background: "#f2fff5",
            marginBottom: 12,
          }}
        >
          <b>{t(lang, "OK", "成功")}:</b> {msg}
        </div>
      )}

      <h3>{t(lang, "Add Enrollment", "新增报名")}</h3>
      <form action={addEnrollment} style={{ display: "grid", gap: 10, maxWidth: 900, marginBottom: 18 }}>
        <label>
          {t(lang, "Class", "班级")}:
          <select name="classId" defaultValue={classes[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 680 }}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course.name} / {c.subject?.name ?? "-"} / {c.level?.name ?? "-"} | {t(lang, "Teacher", "老师")}:
                {c.teacher.name} | {t(lang, "Campus", "校区")}: {c.campus.name} | {t(lang, "Room", "教室")}: {c.room?.name ?? "(none)"} | classId:{" "}
                {c.id.slice(0, 8)}...
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(lang, "Student", "学生")}:
          <div style={{ marginLeft: 8 }}>
            <StudentSearchSelect
              name="studentId"
              placeholder={t(lang, "Search student name", "搜索学生姓名")}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
            />
          </div>
        </label>

        <button type="submit">{t(lang, "Enroll", "确认报名")}</button>

        <p style={{ color: "#666", margin: 0 }}>
          {t(
            lang,
            "Rule: a student can enroll in the same class only once.",
            "规则：同一学生对同一班级只能报名一次。"
          )}
        </p>
      </form>

      <h3>{t(lang, "Enrollment List", "报名列表")}</h3>
      {enrollments.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No enrollments yet.", "暂无报名")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Class", "班级")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Campus", "校区")}</th>
              <th align="left">{t(lang, "Room", "教室")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  {e.student?.name ?? "-"} <span style={{ color: "#999" }}>({e.studentId.slice(0, 8)}...)</span>
                </td>
                <td>
                  {e.class.course.name} / {e.class.subject?.name ?? "-"} / {e.class.level?.name ?? "-"}{" "}
                  <span style={{ color: "#999" }}>(classId {e.classId.slice(0, 8)}...)</span>
                </td>
                <td>{e.class.teacher.name}</td>
                <td>{e.class.campus.name}</td>
                <td>{e.class.room?.name ?? "(none)"}</td>
                <td>
                  <form action={removeEnrollment}>
                    <input type="hidden" name="classId" value={e.classId} />
                    <input type="hidden" name="studentId" value={e.studentId} />
                    <button type="submit">{t(lang, "Remove", "取消报名")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

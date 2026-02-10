import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import AdminStudentsClient from "./AdminStudentsClient";

const GRADE_OPTIONS = [
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "G13",
  "UG1",
  "UG2",
  "UG3",
  "UG4",
  "大一",
  "大二",
  "大三",
  "大四",
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ sourceChannelId?: string; studentTypeId?: string }>;
}) {
  const lang = await getLang();
  const formatId = (prefix: string, id: string) =>
    `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id}`;
  const sp = await searchParams;
  const sourceChannelId = sp?.sourceChannelId ?? "";
  const studentTypeId = sp?.studentTypeId ?? "";

  const where: any = {};
  if (sourceChannelId) where.sourceChannelId = sourceChannelId;
  if (studentTypeId) where.studentTypeId = studentTypeId;

  const students = await prisma.student.findMany({
    where,
    include: { sourceChannel: true, studentType: true },
    orderBy: { name: "asc" },
  });

  const [sources, types, unpaidCounts] = await Promise.all([
    prisma.studentSourceChannel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.studentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    students.length
      ? prisma.coursePackage.groupBy({
          by: ["studentId"],
          where: { studentId: { in: students.map((s) => s.id) }, paid: false },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const unpaidMap = new Map(unpaidCounts.map((u) => [u.studentId, u._count._all]));

  return (
    <div>
      <h2>{t(lang, "Students", "学生")}</h2>

      <h3>{t(lang, "Filter", "筛选")}</h3>
      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select name="sourceChannelId" defaultValue={sourceChannelId}>
          <option value="">{t(lang, "All Sources", "全部来源")}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="studentTypeId" defaultValue={studentTypeId}>
          <option value="">{t(lang, "All Types", "全部类型")}</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
        <a href="/admin/students">{t(lang, "Clear", "清除")}</a>
      </form>

      <AdminStudentsClient
        initialStudents={students.map((s) => ({
          id: s.id,
          name: s.name,
          school: s.school ?? null,
          birthDate: s.birthDate ? new Date(s.birthDate).toISOString() : null,
          grade: s.grade ?? null,
          sourceName: s.sourceChannel?.name ?? null,
          typeName: s.studentType?.name ?? null,
          note: s.note ?? null,
          unpaidCount: unpaidMap.get(s.id) ?? 0,
        }))}
        sources={sources.map((s) => ({ id: s.id, name: s.name }))}
        types={types.map((t) => ({ id: t.id, name: t.name }))}
        gradeOptions={GRADE_OPTIONS}
        labels={{
          add: t(lang, "Add", "新增"),
          addStudent: t(lang, "Add Student", "新增学生"),
          name: t(lang, "Name", "姓名"),
          school: t(lang, "School", "学校"),
          birth: t(lang, "Birth", "出生日期"),
          grade: t(lang, "Grade", "年级"),
          source: t(lang, "Source", "来源"),
          type: t(lang, "Type", "类型"),
          unpaid: t(lang, "Unpaid", "未付款"),
          notes: t(lang, "Notes", "备注"),
          id: "ID",
          action: t(lang, "Action", "操作"),
          edit: t(lang, "Edit", "编辑"),
          delete: t(lang, "Delete", "删除"),
          deleteConfirm: t(
            lang,
            "Delete student? This also deletes enrollments/appointments/packages.",
            "删除学生？将同时删除报名/预约/课包。"
          ),
          ok: t(lang, "OK", "成功"),
          error: t(lang, "Error", "错误"),
          created: t(lang, "Created", "已创建"),
          noStudents: t(lang, "No students yet.", "暂无学生"),
        }}
      />
    </div>
  );
}



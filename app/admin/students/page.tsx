import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { getLang, t } from "@/lib/i18n";
import SimpleModal from "../_components/SimpleModal";

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

async function createStudent(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const birthDateStr = String(formData.get("birthDate") ?? "").trim();
  const sourceChannelId = String(formData.get("sourceChannelId") ?? "").trim() || null;
  const studentTypeId = String(formData.get("studentTypeId") ?? "").trim() || null;
  if (!name) return;

  let birthDate: Date | null = null;
  if (birthDateStr) {
    const [Y, M, D] = birthDateStr.split("-").map(Number);
    if (Number.isFinite(Y) && Number.isFinite(M) && Number.isFinite(D)) {
      birthDate = new Date(Y, M - 1, D, 0, 0, 0, 0);
    }
  }

  await prisma.student.create({
    data: {
      name,
      school: school || null,
      grade: grade || null,
      note: note || null,
      birthDate,
      sourceChannelId,
      studentTypeId,
    },
  });
  revalidatePath("/admin/students");
}

async function deleteStudent(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;

  await prisma.enrollment.deleteMany({ where: { studentId: id } });
  await prisma.appointment.deleteMany({ where: { studentId: id } });
  await prisma.attendance.deleteMany({ where: { studentId: id } });

  const packages = await prisma.coursePackage.findMany({
    where: { studentId: id },
    select: { id: true },
  });
  const packageIds = packages.map((p) => p.id);
  if (packageIds.length > 0) {
    await prisma.packageTxn.deleteMany({ where: { packageId: { in: packageIds } } });
  }
  await prisma.coursePackage.deleteMany({ where: { studentId: id } });

  await prisma.student.delete({ where: { id } });
  revalidatePath("/admin/students");
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: { sourceChannelId?: string; studentTypeId?: string };
}) {
  const lang = await getLang();
  const formatId = (prefix: string, id: string) =>
    `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id}`;
  const sourceChannelId = searchParams?.sourceChannelId ?? "";
  const studentTypeId = searchParams?.studentTypeId ?? "";

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

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Add", "新增")} title={t(lang, "Add Student", "新增学生")} closeOnSubmit>
          <form action={createStudent} style={{ display: "grid", gap: 8, maxWidth: 720 }}>
            <input name="name" placeholder={t(lang, "Name", "学生姓名")} />
            <input name="school" placeholder={t(lang, "School", "学校")} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input name="birthDate" type="date" />
              <select name="grade" defaultValue="">
                <option value="">{t(lang, "Grade", "年级")}</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select name="sourceChannelId" defaultValue="">
                <option value="">{t(lang, "Source", "来源渠道")}</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select name="studentTypeId" defaultValue="">
                <option value="">{t(lang, "Type", "学生类型")}</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea name="note" placeholder={t(lang, "Notes", "注意事项")} rows={3} />
            <button type="submit">{t(lang, "Add", "新增")}</button>
          </form>
        </SimpleModal>
      </div>

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

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Name", "姓名")}</th>
            <th align="left">{t(lang, "School", "学校")}</th>
            <th align="left">{t(lang, "Birth", "出生日期")}</th>
            <th align="left">{t(lang, "Grade", "年级")}</th>
            <th align="left">{t(lang, "Source", "来源")}</th>
            <th align="left">{t(lang, "Type", "类型")}</th>
            <th align="left">{t(lang, "Unpaid", "未付款")}</th>
            <th align="left">{t(lang, "Notes", "备注")}</th>
            <th align="left">ID</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
              <td>
                <a href={`/admin/students/${s.id}`}>{s.name}</a>
              </td>
              <td>{s.school ?? "-"}</td>
              <td>{s.birthDate ? new Date(s.birthDate).toLocaleDateString() : "-"}</td>
              <td>{s.grade ?? "-"}</td>
              <td>{s.sourceChannel?.name ?? "-"}</td>
              <td>{s.studentType?.name ?? "-"}</td>
              <td>
                {unpaidMap.get(s.id) ? (
                  <span style={{ color: "#b00", fontWeight: 700 }}>{unpaidMap.get(s.id)}</span>
                ) : (
                  "-"
                )}
              </td>
              <td>{s.note ?? "-"}</td>
              <td
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#475569",
                  maxWidth: 120,
                  whiteSpace: "nowrap",
                }}
                title={s.id}
              >
                {formatId("STU", s.id)}
              </td>
              <td>
                <a href={`/admin/students/${s.id}`}>{t(lang, "Edit", "编辑")}</a>{" "}
                <form action={deleteStudent}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmSubmitButton message={t(lang, "Delete student? This also deletes enrollments/appointments/packages.", "删除学生？将同时删除报名/预约/课包。")}>
                    {t(lang, "Delete", "删除")}
                  </ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={10}>{t(lang, "No students yet.", "暂无学生")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}



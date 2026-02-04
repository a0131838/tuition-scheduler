import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { getLang, t } from "@/lib/i18n";

async function createType(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.studentType.create({
    data: { name },
  });
  revalidatePath("/admin/student-types");
}

async function toggleType(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "true") === "true";
  if (!id) return;

  await prisma.studentType.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/admin/student-types");
}

async function deleteType(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const count = await prisma.student.count({ where: { studentTypeId: id } });
  if (count > 0) return;

  await prisma.studentType.delete({ where: { id } });
  revalidatePath("/admin/student-types");
}

export default async function StudentTypesPage() {
  const lang = await getLang();
  const types = await prisma.studentType.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <h2>{t(lang, "Student Types", "学生类型")}</h2>

      <form action={createType} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input name="name" placeholder={t(lang, "e.g. New / Renewal / Transfer", "例如 新生 / 续费 / 转入")} />
        <button type="submit">{t(lang, "Add", "新增")}</button>
      </form>

      {types.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No types yet.", "暂无类型")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Name", "名称")}</th>
              <th align="left">{t(lang, "Active", "启用")}</th>
              <th align="left">{t(lang, "Students", "学生")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {types.map((tt) => (
              <tr key={tt.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{tt.name}</td>
                <td>{tt.isActive ? t(lang, "Yes", "是") : t(lang, "No", "否")}</td>
                <td>
                  <a href={`/admin/students?studentTypeId=${tt.id}`}>{t(lang, "Filter", "筛选")}</a>
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <form action={toggleType}>
                    <input type="hidden" name="id" value={tt.id} />
                    <input type="hidden" name="isActive" value={String(!tt.isActive)} />
                    <button type="submit">{tt.isActive ? t(lang, "Disable", "停用") : t(lang, "Enable", "启用")}</button>
                  </form>
                  <form action={deleteType}>
                    <input type="hidden" name="id" value={tt.id} />
                    <ConfirmSubmitButton message={t(lang, "Delete type? If used by students, deletion is blocked.", "删除类型？若已被学生使用将禁止删除。")}>
                      {t(lang, "Delete", "删除")}
                    </ConfirmSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ color: "#666", marginTop: 12 }}>
        {t(lang, "* Types used by students cannot be deleted; you can disable them.", "* 已被学生使用的类型无法删除，只能禁用。")}
      </p>
    </div>
  );
}

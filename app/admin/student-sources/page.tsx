import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { getLang, t } from "@/lib/i18n";

async function createSource(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.studentSourceChannel.create({
    data: { name },
  });
  revalidatePath("/admin/student-sources");
}

async function toggleSource(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "true") === "true";
  if (!id) return;

  await prisma.studentSourceChannel.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/admin/student-sources");
}

async function deleteSource(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const count = await prisma.student.count({ where: { sourceChannelId: id } });
  if (count > 0) return;

  await prisma.studentSourceChannel.delete({ where: { id } });
  revalidatePath("/admin/student-sources");
}

export default async function StudentSourcesPage() {
  const lang = await getLang();
  const sources = await prisma.studentSourceChannel.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <h2>{t(lang, "Student Sources", "学生来源")}</h2>

      <form action={createSource} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input name="name" placeholder={t(lang, "e.g. Referral / Xiaohongshu / New Oriental", "例如 转介绍 / 小红书 / 新东方")} />
        <button type="submit">{t(lang, "Add", "新增")}</button>
      </form>

      {sources.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No sources yet.", "暂无来源")}</div>
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
            {sources.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{s.name}</td>
                <td>{s.isActive ? t(lang, "Yes", "是") : t(lang, "No", "否")}</td>
                <td>
                  <a href={`/admin/students?sourceChannelId=${s.id}`}>{t(lang, "Filter", "筛选")}</a>
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <form action={toggleSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="isActive" value={String(!s.isActive)} />
                    <button type="submit">{s.isActive ? t(lang, "Disable", "停用") : t(lang, "Enable", "启用")}</button>
                  </form>
                  <form action={deleteSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmSubmitButton message={t(lang, "Delete source? If used by students, deletion is blocked.", "删除来源？若已被学生使用将禁止删除。")}>
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
        {t(lang, "* Sources used by students cannot be deleted; you can disable them.", "* 已被学生使用的来源无法删除，只能禁用。")}
      </p>
    </div>
  );
}

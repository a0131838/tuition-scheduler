import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { getLang, t } from "@/lib/i18n";

async function createCampus(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const isOnline = String(formData.get("isOnline") ?? "") === "on";
  if (!name) return;

  await prisma.campus.create({ data: { name, isOnline } });
  revalidatePath("/admin/campuses");
}

async function deleteCampus(formData: FormData) {
  "use server";
  const campusId = String(formData.get("id"));
  if (!campusId) return;

  const classes = await prisma.class.findMany({
    where: { campusId },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);

  if (classIds.length > 0) {
    await prisma.enrollment.deleteMany({ where: { classId: { in: classIds } } });
    await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
  }

  await prisma.class.deleteMany({ where: { campusId } });
  await prisma.room.deleteMany({ where: { campusId } });
  await prisma.campus.delete({ where: { id: campusId } });

  revalidatePath("/admin/campuses");
}

export default async function CampusesPage() {
  const lang = await getLang();
  const formatId = (prefix: string, id: string) =>
    `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id}`;
  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h2>{t(lang, "Campuses", "校区")}</h2>

      <form action={createCampus} style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input name="name" placeholder={t(lang, "Campus name", "校区名称")} />
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" name="isOnline" />
          {t(lang, "Online campus", "线上校区")}
        </label>
        <button type="submit">{t(lang, "Add", "新增")}</button>
      </form>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Name", "名称")}</th>
            <th align="left">{t(lang, "Type", "类型")}</th>
            <th align="left">ID</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {campuses.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{c.name}</td>
              <td>{c.isOnline ? t(lang, "Online", "线上") : t(lang, "Offline", "线下")}</td>
              <td style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }} title={c.id}>
                {formatId("CMP", c.id)}
              </td>
              <td>
                <form action={deleteCampus}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmSubmitButton
                    message={t(
                      lang,
                      "Delete campus? This also deletes classes/sessions/enrollments/rooms under it.",
                      "删除校区？将同时删除班级/课次/报名/教室。"
                    )}
                  >
                    {t(lang, "Delete", "删除")}
                  </ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
          {campuses.length === 0 && (
            <tr>
              <td colSpan={4}>{t(lang, "No campuses yet.", "暂无校区")}</td>
            </tr>
          )}
        </tbody>
      </table>

      <p style={{ color: "#666", marginTop: 12 }}>
        {t(
          lang,
          "* Deleting a campus cascades classes, sessions, enrollments, and rooms.",
          "* 删除校区会级联删除班级、课次、报名与教室。"
        )}
      </p>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import { getLang, t } from "@/lib/i18n";
import SimpleModal from "../_components/SimpleModal";

async function createRoom(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0);
  const campusId = String(formData.get("campusId") ?? "");

  if (!name || !campusId || !Number.isFinite(capacity) || capacity <= 0) return;

  await prisma.room.create({ data: { name, capacity, campusId } });
  revalidatePath("/admin/rooms");
}

async function deleteRoom(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;

  await prisma.class.updateMany({ where: { roomId: id }, data: { roomId: null } });
  await prisma.room.delete({ where: { id } });

  revalidatePath("/admin/rooms");
}

export default async function RoomsPage() {
  const lang = await getLang();
  const [campuses, rooms] = await Promise.all([
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h2>{t(lang, "Rooms", "教室")}</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Add Room", "新增教室")} title={t(lang, "Add Room", "新增教室")} closeOnSubmit>
          <form action={createRoom} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <input name="name" placeholder={t(lang, "Room name", "教室名称")} />
            <input name="capacity" type="number" min={1} placeholder={t(lang, "Capacity", "容量")} />
            <select name="campusId" defaultValue="">
              <option value="" disabled>
                {t(lang, "Select campus", "选择校区")}
              </option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={campuses.length === 0}>
              {t(lang, "Add Room", "新增教室")}
            </button>
            {campuses.length === 0 && <p style={{ color: "#b00" }}>{t(lang, "Please create a campus first.", "请先创建校区。")}</p>}
          </form>
        </SimpleModal>
      </div>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Room", "教室")}</th>
            <th align="left">{t(lang, "Campus", "校区")}</th>
            <th align="left">{t(lang, "Capacity", "容量")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{r.name}</td>
              <td>{r.campus.name}</td>
              <td>{r.capacity}</td>
              <td>
                <form action={deleteRoom}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmSubmitButton message={t(lang, "Delete room?", "删除教室？")}>
                    {t(lang, "Delete", "删除")}
                  </ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
          {rooms.length === 0 && (
            <tr>
              <td colSpan={4}>{t(lang, "No rooms yet.", "暂无教室")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}



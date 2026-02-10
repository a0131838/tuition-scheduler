import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import RoomsClient from "./RoomsClient";

export default async function RoomsPage() {
  const lang = await getLang();
  const [campuses, rooms] = await Promise.all([
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h2>{t(lang, "Rooms", "教室")}</h2>
      <RoomsClient
        campuses={campuses.map((c) => ({ id: c.id, name: c.name }))}
        initialRooms={rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, campusId: r.campusId, campusName: r.campus.name }))}
        labels={{
          addRoom: t(lang, "Add Room", "新增教室"),
          roomName: t(lang, "Room name", "教室名称"),
          capacity: t(lang, "Capacity", "容量"),
          selectCampus: t(lang, "Select campus", "选择校区"),
          add: t(lang, "Add Room", "新增教室"),
          createCampusFirst: t(lang, "Please create a campus first.", "请先创建校区。"),
          room: t(lang, "Room", "教室"),
          campus: t(lang, "Campus", "校区"),
          action: t(lang, "Action", "操作"),
          delete: t(lang, "Delete", "删除"),
          deleteConfirm: t(lang, "Delete room?", "删除教室？"),
          noRooms: t(lang, "No rooms yet.", "暂无教室"),
          errorPrefix: t(lang, "Error", "错误"),
        }}
      />
    </div>
  );
}



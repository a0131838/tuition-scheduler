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
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Room Setup / 教室设置</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Rooms", "教室")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Use this page after campuses are ready so offline classes can be scheduled against real rooms.", "校区建立后在这里维护教室，后续线下排课才能准确匹配场地。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Campus count", "校区数量")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{campuses.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Room count", "教室数量")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{rooms.length}</div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #dbeafe",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#room-editor">{t(lang, "Room editor", "教室编辑")}</a>
      </div>
      <div id="room-editor" style={{ scrollMarginTop: 96 }}>
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
    </div>
  );
}


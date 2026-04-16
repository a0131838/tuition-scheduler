import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import CampusesClient from "./CampusesClient";

export default async function CampusesPage() {
  const lang = await getLang();
  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

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
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Campus Setup / 校区设置</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Campuses", "校区")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Maintain campus basics here before adding rooms, classes, or offline schedules.", "先维护校区基础信息，再继续配置教室、班级和线下排课。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Campus count", "校区数量")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{campuses.length}</div>
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
        <a href="#campus-editor">{t(lang, "Campus editor", "校区编辑")}</a>
        <a href="#campus-notes">{t(lang, "Notes", "说明")}</a>
      </div>
      <div id="campus-editor" style={{ scrollMarginTop: 96 }}>
      <CampusesClient
        initialCampuses={campuses.map((c) => ({ id: c.id, name: c.name, isOnline: c.isOnline, requiresRoom: c.requiresRoom }))}
        labels={{
          campusName: t(lang, "Campus name", "校区名称"),
          onlineCampus: t(lang, "Online campus", "线上校区"),
          requiresRoom: t(lang, "Requires room", "需要教室"),
          noRoomNeeded: t(lang, "Room optional", "教室可空"),
          add: t(lang, "Add", "新增"),
          name: t(lang, "Name", "名称"),
          type: t(lang, "Type", "类型"),
          typeOnline: t(lang, "Online", "线上"),
          typeOffline: t(lang, "Offline", "线下"),
          action: t(lang, "Action", "操作"),
          delete: t(lang, "Delete", "删除"),
          deleteConfirm: t(
            lang,
            "Delete campus? This also deletes classes/sessions/enrollments/rooms under it.",
            "删除校区？将同时删除班级/课次/报名/教室。"
          ),
          noCampuses: t(lang, "No campuses yet.", "暂无校区"),
          errorPrefix: t(lang, "Error", "错误"),
        }}
      />
      </div>

      <p id="campus-notes" style={{ color: "#666", marginTop: 12, scrollMarginTop: 96 }}>
        {t(
          lang,
          "* Deleting a campus cascades classes, sessions, enrollments, and rooms.",
          "* 删除校区会级联删除班级、课次、报名与教室。"
        )}
      </p>
    </div>
  );
}

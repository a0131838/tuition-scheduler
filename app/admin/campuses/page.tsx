import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import CampusesClient from "./CampusesClient";

export default async function CampusesPage() {
  const lang = await getLang();
  const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h2>{t(lang, "Campuses", "校区")}</h2>
      <CampusesClient
        initialCampuses={campuses.map((c) => ({ id: c.id, name: c.name, isOnline: c.isOnline }))}
        labels={{
          campusName: t(lang, "Campus name", "校区名称"),
          onlineCampus: t(lang, "Online campus", "线上校区"),
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

import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import StudentSourcesClient from "./StudentSourcesClient";

export default async function StudentSourcesPage() {
  const lang = await getLang();
  const sources = await prisma.studentSourceChannel.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <h2>{t(lang, "Student Sources", "学生来源")}</h2>

      <StudentSourcesClient
        initialSources={sources.map((x) => ({ id: x.id, name: x.name, isActive: x.isActive }))}
        labels={{
          placeholder: t(lang, "e.g. Referral / Xiaohongshu / New Oriental", "例如 转介绍 / 小红书 / 新东方"),
          add: t(lang, "Add", "新增"),
          name: t(lang, "Name", "名称"),
          active: t(lang, "Active", "启用"),
          students: t(lang, "Students", "学生"),
          action: t(lang, "Action", "操作"),
          yes: t(lang, "Yes", "是"),
          no: t(lang, "No", "否"),
          filter: t(lang, "Filter", "筛选"),
          disable: t(lang, "Disable", "停用"),
          enable: t(lang, "Enable", "启用"),
          delete: t(lang, "Delete", "删除"),
          deleteConfirm: t(
            lang,
            "Delete source? If used by students, deletion is blocked.",
            "删除来源？若已被学生使用将禁止删除。"
          ),
          deleteBlocked: t(lang, "Source is used by students, cannot delete.", "该来源已被学生使用，无法删除。"),
          errorPrefix: t(lang, "Error", "错误"),
        }}
      />

      <p style={{ color: "#666", marginTop: 12 }}>
        {t(lang, "* Sources used by students cannot be deleted; you can disable them.", "* 已被学生使用的来源无法删除，只能禁用。")}
      </p>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import StudentTypesClient from "./StudentTypesClient";

export default async function StudentTypesPage() {
  const lang = await getLang();
  const types = await prisma.studentType.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <h2>{t(lang, "Student Types", "学生类型")}</h2>

      <StudentTypesClient
        initialTypes={types.map((x) => ({ id: x.id, name: x.name, isActive: x.isActive }))}
        labels={{
          placeholder: t(lang, "e.g. New / Renewal / Transfer", "例如 新生 / 续费 / 转入"),
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
            "Delete type? If used by students, deletion is blocked.",
            "删除类型？若已被学生使用将禁止删除。"
          ),
          deleteBlocked: t(lang, "Type is used by students, cannot delete.", "该类型已被学生使用，无法删除。"),
          errorPrefix: t(lang, "Error", "错误"),
        }}
      />

      <p style={{ color: "#666", marginTop: 12 }}>
        {t(lang, "* Types used by students cannot be deleted; you can disable them.", "* 已被学生使用的类型无法删除，只能禁用。")}
      </p>
    </div>
  );
}

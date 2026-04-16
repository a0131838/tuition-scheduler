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
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Student Type Setup / 学生类型设置</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Student Types", "学生类型")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Keep the student lifecycle labels consistent here so dashboards and reports stay readable.", "统一维护学生类型标签，让仪表盘和报表里的学生状态更容易理解。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Type options", "类型选项")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{types.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Active options", "启用项")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{types.filter((item) => item.isActive).length}</div>
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
        <a href="#student-type-editor">{t(lang, "Type editor", "类型编辑")}</a>
        <a href="#student-type-rules">{t(lang, "Rules", "规则")}</a>
      </div>

      <div id="student-type-editor" style={{ scrollMarginTop: 96 }}>
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
      </div>

      <p id="student-type-rules" style={{ color: "#666", marginTop: 12, scrollMarginTop: 96 }}>
        {t(lang, "* Types used by students cannot be deleted; you can disable them.", "* 已被学生使用的类型无法删除，只能禁用。")}
      </p>
    </div>
  );
}

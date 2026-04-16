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
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Lead Source Setup / 学生来源设置</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Student Sources", "学生来源")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Maintain the lead-source list here so student records and reports can use a consistent source vocabulary.", "统一维护学生来源词表，方便学生档案和来源报表使用一致口径。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Source options", "来源选项")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{sources.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Active options", "启用项")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{sources.filter((item) => item.isActive).length}</div>
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
        <a href="#student-source-editor">{t(lang, "Source editor", "来源编辑")}</a>
        <a href="#student-source-rules">{t(lang, "Rules", "规则")}</a>
      </div>

      <div id="student-source-editor" style={{ scrollMarginTop: 96 }}>
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
      </div>

      <p id="student-source-rules" style={{ color: "#666", marginTop: 12, scrollMarginTop: 96 }}>
        {t(lang, "* Sources used by students cannot be deleted; you can disable them.", "* 已被学生使用的来源无法删除，只能禁用。")}
      </p>
    </div>
  );
}

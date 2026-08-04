import Link from "next/link";
import { redirect } from "next/navigation";
import { isManagerUser, requireManager } from "@/lib/auth";
import { requireCommunicationCenterUser } from "@/lib/communication-access";
import {
  createParentCommunicationTemplateVersion,
  listParentCommunicationTemplates,
  publishParentCommunicationTemplate,
} from "@/lib/parent-communication-templates";

async function createVersionAction(formData: FormData) {
  "use server";
  const user = await requireManager();
  try {
    await createParentCommunicationTemplateVersion({
      code: String(formData.get("code") ?? ""), title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") ?? ""), content: String(formData.get("content") ?? ""),
      editPolicy: String(formData.get("editPolicy") ?? "LOCKED"),
      actor: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    redirect(`/admin/communications/templates?err=${encodeURIComponent(error instanceof Error ? error.message : "Create failed")}`);
  }
  redirect("/admin/communications/templates?ok=Draft+version+created");
}

async function publishAction(formData: FormData) {
  "use server";
  const user = await requireManager();
  try {
    await publishParentCommunicationTemplate(String(formData.get("id") ?? ""), { id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    redirect(`/admin/communications/templates?err=${encodeURIComponent(error instanceof Error ? error.message : "Publish failed")}`);
  }
  redirect("/admin/communications/templates?ok=Template+published");
}

const field: React.CSSProperties = { width: "100%", padding: 9, border: "1px solid #cbd5e1", boxSizing: "border-box" };
const button: React.CSSProperties = { padding: "9px 12px", border: "1px solid #b8c5d6", background: "#fff", fontWeight: 800, cursor: "pointer" };

export default async function CommunicationTemplatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCommunicationCenterUser();
  const canManage = await isManagerUser(user);
  const params = await searchParams;
  const rows = await listParentCommunicationTemplates();
  const latestMap = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latestMap.has(row.code)) latestMap.set(row.code, row);
  const latestByCode = Array.from(latestMap.values());
  return <main style={{ maxWidth: 1180, display: "grid", gap: 16 }}>
    <header style={{ borderBottom: "1px solid #dbe3ed", paddingBottom: 14 }}>
      <div style={{ color: "#b45309", fontWeight: 900, fontSize: 12 }}>CONTROLLED PARENT MESSAGES / 家长话术管控</div>
      <h1 style={{ margin: "5px 0" }}>家长沟通模板中心</h1>
      <p style={{ color: "#526071", margin: 0 }}>员工只能复制已发布版本；修改会创建新草稿，管理发布后才生效。旧任务保留原文和模板版本。</p>
      <Link href="/admin/communications" style={{ ...button, display: "inline-block", marginTop: 10, textDecoration: "none", color: "#10243e" }}>返回沟通工作台</Link>
    </header>
    {params.ok ? <div style={{ color: "#166534", fontWeight: 800 }}>{String(params.ok)}</div> : null}
    {params.err ? <div style={{ color: "#b91c1c", fontWeight: 800 }}>{String(params.err)}</div> : null}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
      <div style={{ padding: 14, background: "#f8fafc" }}><strong>{latestByCode.length}</strong><br />固定业务场景</div>
      <div style={{ padding: 14, background: "#ecfdf5" }}><strong>{rows.filter((row) => row.status === "PUBLISHED").length}</strong><br />当前已发布版本</div>
      <div style={{ padding: 14, background: "#fff7ed" }}><strong>{rows.filter((row) => row.status === "DRAFT").length}</strong><br />待管理发布草稿</div>
    </section>
    <section style={{ display: "grid", gap: 12 }}>
      {latestByCode.map((latest) => {
        const versions = rows.filter((row) => row.code === latest.code);
        const published = versions.find((row) => row.status === "PUBLISHED") ?? latest;
        return <details key={latest.code} style={{ borderTop: "2px solid #d7e0ea", padding: "12px 0" }} open={latest.status === "DRAFT"}>
          <summary style={{ cursor: "pointer", fontWeight: 850 }}>{published.title} · {published.code} · 当前 V{published.version} {latest.status === "DRAFT" ? `· 草稿 V${latest.version}` : ""}</summary>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(360px,2fr)", gap: 12 }}>
            <div style={{ color: "#526071", fontSize: 13 }}><div>类别：{published.category}</div><div>渠道：{published.channel}</div><div>语言：{published.language}</div><div>编辑策略：{published.editPolicy}</div><div>历史版本：{versions.map((row) => `V${row.version} ${row.status}`).join(" · ")}</div></div>
            {canManage ? <form action={createVersionAction} style={{ display: "grid", gap: 8 }}>
              <input type="hidden" name="code" value={published.code} /><input type="hidden" name="category" value={published.category} />
              <label>标题<input name="title" defaultValue={latest.title} required style={field} /></label>
              <label>编辑策略<select name="editPolicy" defaultValue={latest.editPolicy} style={field}><option value="LOCKED">固定内容</option><option value="OPTIONAL_NOTE">只允许补充备注</option><option value="MANAGER_CUSTOM">管理可自定义</option></select></label>
              <label>模板内容<textarea name="content" defaultValue={latest.content} required rows={10} style={field} /></label>
              <button style={button}>另存为新草稿版本</button>
            </form> : <pre style={{ whiteSpace: "pre-wrap", margin: 0, padding: 12, background: "#f8fafc", fontFamily: "inherit" }}>{published.content}</pre>}
          </div>
          {canManage && latest.status === "DRAFT" ? <form action={publishAction} style={{ marginTop: 10 }}><input type="hidden" name="id" value={latest.id} /><button style={{ ...button, background: "#166534", color: "#fff" }}>发布 V{latest.version}</button></form> : null}
        </details>;
      })}
    </section>
  </main>;
}

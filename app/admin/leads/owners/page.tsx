import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { normalizeLeadText } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

function read(formData: FormData, key: string, max = 500) {
  return normalizeLeadText(formData.get(key), max);
}

function revalidateOwnerPages() {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/new");
  revalidatePath("/admin/leads/owners");
}

async function addOwnerAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const name = read(formData, "name", 120);
  if (!name) redirect("/admin/leads/owners?err=name");
  await prisma.leadResourceOwner.upsert({
    where: { name },
    update: {
      email: read(formData, "email", 160) || null,
      note: read(formData, "note", 500) || null,
      isActive: true,
    },
    create: {
      name,
      email: read(formData, "email", 160) || null,
      note: read(formData, "note", 500) || null,
    },
  });
  revalidateOwnerPages();
  redirect("/admin/leads/owners?ok=saved");
}

async function updateOwnerAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = read(formData, "id", 80);
  const name = read(formData, "name", 120);
  if (!id || !name) redirect("/admin/leads/owners?err=name");
  await prisma.leadResourceOwner.update({
    where: { id },
    data: {
      name,
      email: read(formData, "email", 160) || null,
      note: read(formData, "note", 500) || null,
    },
  });
  revalidateOwnerPages();
  redirect("/admin/leads/owners?ok=saved");
}

async function setOwnerActiveAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = read(formData, "id", 80);
  const isActive = read(formData, "isActive", 5) === "1";
  if (!id) redirect("/admin/leads/owners");
  await prisma.leadResourceOwner.update({ where: { id }, data: { isActive } });
  revalidateOwnerPages();
  redirect("/admin/leads/owners?ok=saved");
}

export default async function LeadOwnersPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const owners = await prisma.leadResourceOwner.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const fieldStyle = { minHeight: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" } as const;
  const labelStyle = { display: "grid", gap: 5, fontWeight: 800, fontSize: 13 } as const;

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <p><Link href="/admin/leads">{t(lang, "Back to resources", "返回资源列表")}</Link></p>
      <section style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: "0 0 6px" }}>{t(lang, "Resource Owners", "资源负责人名单")}</h2>
        <div style={{ color: "#475569" }}>{t(lang, "Maintain the names available when assigning sales or customer-service ownership.", "维护创建和分配资源时可选择的销售/客服负责人。")}</div>
      </section>

      {sp?.ok === "saved" ? <div style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: 10 }}>{t(lang, "Owner list saved.", "负责人名单已保存。")}</div> : null}
      {sp?.err === "name" ? <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: 10 }}>{t(lang, "Owner name is required.", "负责人姓名必填。")}</div> : null}

      <section style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Add owner", "新增负责人")}</h3>
        <form action={addOwnerAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "end" }}>
          <label style={labelStyle}>{t(lang, "Name", "姓名")}*<input name="name" required style={fieldStyle} /></label>
          <label style={labelStyle}>{t(lang, "Email", "邮箱")}<input name="email" type="email" style={fieldStyle} /></label>
          <label style={labelStyle}>{t(lang, "Note", "备注")}<input name="note" style={fieldStyle} /></label>
          <button type="submit" style={{ minHeight: 38 }}>{t(lang, "Save Owner", "保存负责人")}</button>
        </form>
      </section>

      <section style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Owner", "Email", "Note", "Status", "Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id}>
                  <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>
                    <form id={`owner-${owner.id}`} action={updateOwnerAction} style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="id" value={owner.id} />
                      <input name="name" defaultValue={owner.name} required style={fieldStyle} />
                    </form>
                  </td>
                  <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}><input form={`owner-${owner.id}`} name="email" type="email" defaultValue={owner.email || ""} style={fieldStyle} /></td>
                  <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}><input form={`owner-${owner.id}`} name="note" defaultValue={owner.note || ""} style={fieldStyle} /></td>
                  <td style={{ padding: 10, borderTop: "1px solid #f1f5f9", fontWeight: 900, color: owner.isActive ? "#166534" : "#64748b" }}>{owner.isActive ? t(lang, "Active", "启用") : t(lang, "Inactive", "停用")}</td>
                  <td style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button form={`owner-${owner.id}`} type="submit">{t(lang, "Save", "保存")}</button>
                      <form action={setOwnerActiveAction}>
                        <input type="hidden" name="id" value={owner.id} />
                        <input type="hidden" name="isActive" value={owner.isActive ? "0" : "1"} />
                        <button type="submit">{owner.isActive ? t(lang, "Deactivate", "停用") : t(lang, "Activate", "启用")}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {owners.length === 0 ? <tr><td colSpan={5} style={{ padding: 16, color: "#64748b" }}>{t(lang, "No owner records yet.", "暂无负责人记录。")}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

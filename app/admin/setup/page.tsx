import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";
import AdminSetupClient from "@/app/admin/setup/_components/AdminSetupClient";

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string }>;
}) {
  const sp = await searchParams;
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const count = await prisma.user.count();
  if (count > 0) {
    redirect("/admin/login");
  }

  return (
    <div style={{ maxWidth: 640, display: "grid", gap: 14 }}>
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Initial Setup / 初始化</div>
          <h2 style={{ margin: 0 }}>Setup Admin / 初始化管理员</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            首次安装时先创建管理员账号；完成后系统会自动跳回登录页。
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Admin users / 管理员数量</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{count}</div>
          </div>
        </div>
      </div>
      {err ? <NoticeBanner type="error" title="Error" message={err} /> : null}
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
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#setup-admin-form">Setup form / 初始化表单</a>
      </div>
      <div id="setup-admin-form" style={{ scrollMarginTop: 96 }}>
        <AdminSetupClient />
      </div>
    </div>
  );
}

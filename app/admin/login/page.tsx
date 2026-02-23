import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";
import AdminLoginClient from "@/app/admin/login/_components/AdminLoginClient";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const next = sp?.next ? decodeURIComponent(sp.next) : "";
  let dbUnavailable = false;
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      redirect("/admin/setup");
    }
  } catch (error) {
    dbUnavailable = true;
    console.error("[admin/login] failed to query users", error);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui",
        background: "#f8fafc",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "24px 26px",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#fff",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <img
            src="/logo.png"
            alt="Company Logo"
            style={{
              width: 280,
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              marginBottom: 6,
              display: "block",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
          <div style={{ fontSize: 18, fontWeight: 700 }}>Tuition Scheduler</div>
          <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>教学排课与运营管理系统</div>
          <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700 }}>Login / 登录</div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
            请输入管理员或老师账号
          </div>
        </div>

        {err ? <NoticeBanner type="error" title="Error" message={err} /> : null}
        {dbUnavailable ? (
          <NoticeBanner
            type="error"
            title="Service Temporary Unavailable"
            message="数据库连接异常，请稍后重试。Database connection is temporarily unavailable, please try again shortly."
          />
        ) : null}

        <AdminLoginClient next={next} />
      </section>
    </main>
  );
}

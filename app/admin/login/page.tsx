import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/route-guards";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();
  const portal = String(formData.get("portal") ?? "").trim().toLowerCase();

  if (!email || !password) {
    redirect("/admin/login?err=Missing+email+or+password");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect("/admin/login?err=Invalid+credentials");
  }

  const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) {
    redirect("/admin/login?err=Invalid+credentials");
  }

  await createSession(user.id);
  const safeNext = sanitizeNextPath(next);
  if (safeNext) {
    redirect(safeNext);
  }
  if (portal === "teacher") {
    if (user.role === "TEACHER") {
      redirect("/teacher");
    }
    if (user.role === "ADMIN" && user.teacherId) {
      redirect("/teacher");
    }
    redirect("/admin/login?err=This+account+cannot+enter+Teacher+Portal");
  }
  if (user.role === "TEACHER") {
    redirect("/teacher");
  }
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { err?: string; next?: string };
}) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const next = searchParams?.next ? decodeURIComponent(searchParams.next) : "";
  const count = await prisma.user.count();

  if (count === 0) {
    redirect("/admin/setup");
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

        <form action={login} style={{ display: "grid", gap: 12 }}>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
            />
          </label>
          <button
            type="submit"
            name="portal"
            value="admin"
            style={{
              marginTop: 4,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5f5",
              background: "#eef2ff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            进入管理端 / Admin
          </button>
          <button
            type="submit"
            name="portal"
            value="teacher"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            进入老师端 / Teacher
          </button>
        </form>
      </section>
    </main>
  );
}



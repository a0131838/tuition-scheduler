import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

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
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { err?: string };
}) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const count = await prisma.user.count();

  if (count === 0) {
    redirect("/admin/setup");
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Admin Login / 管理员登录</h2>
      {err && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>Error:</b> {err}
        </div>
      )}
      <form action={login} style={{ display: "grid", gap: 10 }}>
        <label>
          Email:
          <input name="email" type="email" required style={{ marginLeft: 6, width: "100%" }} />
        </label>
        <label>
          Password:
          <input name="password" type="password" required style={{ marginLeft: 6, width: "100%" }} />
        </label>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

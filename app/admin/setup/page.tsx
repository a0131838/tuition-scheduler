import { prisma } from "@/lib/prisma";
import { createPasswordHash, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function setupAdmin(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !name || !password) {
    redirect("/admin/setup?err=Missing+fields");
  }

  const exists = await prisma.user.count();
  if (exists > 0) {
    redirect("/admin/login");
  }

  const { salt, hash } = createPasswordHash(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "ADMIN",
      language: "BILINGUAL",
      passwordSalt: salt,
      passwordHash: hash,
    },
  });

  await createSession(user.id);
  redirect("/admin");
}

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams?: { err?: string };
}) {
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const count = await prisma.user.count();
  if (count > 0) {
    redirect("/admin/login");
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2>Setup Admin / 初始化管理员</h2>
      {err && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>Error:</b> {err}
        </div>
      )}
      <form action={setupAdmin} style={{ display: "grid", gap: 10 }}>
        <label>
          Email:
          <input name="email" type="email" required style={{ marginLeft: 6, width: "100%" }} />
        </label>
        <label>
          Name:
          <input name="name" type="text" required style={{ marginLeft: 6, width: "100%" }} />
        </label>
        <label>
          Password:
          <input name="password" type="password" required style={{ marginLeft: 6, width: "100%" }} />
        </label>
        <button type="submit">Create Admin</button>
      </form>
    </div>
  );
}

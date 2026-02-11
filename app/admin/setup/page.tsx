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
    <div style={{ maxWidth: 480 }}>
      <h2>Setup Admin / 初始化管理员</h2>
      {err ? <NoticeBanner type="error" title="Error" message={err} /> : null}
      <AdminSetupClient />
    </div>
  );
}

import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assessmentPartnerMiniappPath, generateAssessmentPartnerUrlLink } from "@/lib/school-guide-partner-url-link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PAGE = "/admin/assessment-partners";

async function requireAssessmentAdmin() {
  const user = await requireAdmin();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}

async function createLink(formData: FormData) {
  "use server";
  await requireAssessmentAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  if (!name) redirect(`${PAGE}?err=${encodeURIComponent("请填写合作方名称")}`);
  try {
    await prisma.schoolGuideAssessmentPartnerLink.create({ data: { name, slug: randomBytes(16).toString("hex") } });
  } catch {
    redirect(`${PAGE}?err=${encodeURIComponent("创建失败；请检查名称是否重复")}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?msg=${encodeURIComponent("入口已创建。可复制下方网页链接进行受控试测。")}`);
}

async function setActive(formData: FormData) {
  "use server";
  await requireAssessmentAdmin();
  const id = String(formData.get("id") || "");
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.schoolGuideAssessmentPartnerLink.update({ where: { id }, data: { isActive } });
  revalidatePath(PAGE);
  redirect(`${PAGE}?msg=${encodeURIComponent(isActive ? "入口已启用" : "入口已停用")}`);
}

async function createUrlLink(formData: FormData) {
  "use server";
  await requireAssessmentAdmin();
  const id = String(formData.get("id") || "");
  const link = await prisma.schoolGuideAssessmentPartnerLink.findUnique({ where: { id } });
  if (!link?.isActive) redirect(`${PAGE}?err=${encodeURIComponent("入口不存在或已停用")}`);
  if (link.urlLink) redirect(`${PAGE}?msg=${encodeURIComponent("此入口已有微信链接")}`);
  try {
    const urlLink = await generateAssessmentPartnerUrlLink(link.slug);
    await prisma.schoolGuideAssessmentPartnerLink.update({ where: { id }, data: { urlLink } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    redirect(`${PAGE}?err=${encodeURIComponent(message)}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?msg=${encodeURIComponent("微信链接已生成，请先用正式版真机试测再发送")}`);
}

export default async function AssessmentPartnersPage({ searchParams }: { searchParams?: Promise<{ msg?: string; err?: string }> }) {
  await requireAssessmentAdmin();
  const sp = await searchParams;
  const links = await prisma.schoolGuideAssessmentPartnerLink.findMany({
    include: { _count: { select: { sessions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return <main style={{ maxWidth: 960, padding: "24px", margin: "0 auto" }}>
    <h1>合作方专属测评入口</h1>
    <p>一个合作方一个入口。家长打开后直接进入英语优先的测评选择；小学和中学 AEIS 的数学是独立卷。后台仅记录来源和测评次数，家长报告仍由原有授权流程查看。</p>
    {sp?.msg && <p style={{ color: "#166534" }}>{sp.msg}</p>}
    {sp?.err && <p style={{ color: "#b91c1c" }}>{sp.err}</p>}
    <form action={createLink} style={{ display: "flex", gap: 12, margin: "24px 0" }}>
      <input name="name" required maxLength={80} placeholder="合作方名称" style={{ flex: 1, padding: 10 }} />
      <button type="submit">创建专属入口</button>
    </form>
    <p>网页链接现在可直接在手机浏览器打开，用于受控试测。正式对外推广前，请老师审阅题目、评分和报告，并走完一遍真实答题。微信 URL Link 仍需新小程序正式发布后生成。</p>
    {links.map((link) => <section key={link.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, margin: "16px 0" }}>
      <h2 style={{ marginTop: 0 }}>{link.name} <small>{link.isActive ? "启用中" : "已停用"}</small></h2>
      <p>已开始测评：{link._count.sessions} 次</p>
      <p>网页测评链接：<a href={`https://sgtmanage.com/school-guide/academic-assessment?partner=${link.slug}`} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>{`https://sgtmanage.com/school-guide/academic-assessment?partner=${link.slug}`}</a></p>
      <p>小程序页面路径：<code style={{ overflowWrap: "anywhere" }}>{assessmentPartnerMiniappPath(link.slug)}</code></p>
      {link.urlLink && <p>可发送的微信链接：<a href={link.urlLink} target="_blank" rel="noopener noreferrer">{link.urlLink}</a></p>}
      {!link.urlLink && link.isActive && <form action={createUrlLink}><input type="hidden" name="id" value={link.id} /><button type="submit">正式版已发布，生成微信链接</button></form>}
      <form action={setActive} style={{ marginTop: 12 }}><input type="hidden" name="id" value={link.id} /><input type="hidden" name="isActive" value={link.isActive ? "false" : "true"} /><button type="submit">{link.isActive ? "停用入口" : "重新启用"}</button></form>
    </section>)}
  </main>;
}

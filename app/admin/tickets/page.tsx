import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { TICKET_OWNER_OPTIONS, TICKET_STATUS_OPTIONS, TICKET_TYPE_OPTIONS } from "@/lib/tickets";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

async function markDoneAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const back = String(formData.get("back") ?? "/admin/tickets");
  if (!id) redirect(back);
  await prisma.ticket.update({
    where: { id },
    data: { status: "Completed", completedAt: new Date(), completedByUserId: user.id },
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/teacher/tickets");
  redirect(back);
}

async function reopenAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const back = String(formData.get("back") ?? "/admin/tickets");
  if (!id) redirect(back);
  await prisma.ticket.update({
    where: { id },
    data: { status: "Confirmed", completedAt: null, completedByUserId: null },
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/teacher/tickets");
  redirect(back);
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; owner?: string; type?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const status = String(sp?.status ?? "").trim();
  const owner = String(sp?.owner ?? "").trim();
  const type = String(sp?.type ?? "").trim();

  const rows = await prisma.ticket.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { ticketNo: { contains: q, mode: "insensitive" } },
              { studentName: { contains: q, mode: "insensitive" } },
              { teacher: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(owner ? { owner } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  const backHref = `/admin/tickets?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&owner=${encodeURIComponent(owner)}&type=${encodeURIComponent(type)}`;

  return (
    <div>
      <h2>{t(lang, "Ticket Center", "工单中心")}</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Link scroll={false} href="/tickets/intake" target="_blank">
          {t(lang, "Open Intake Link", "打开录入链接")}
        </Link>
        <Link scroll={false} href="/admin/tickets/handover">
          {t(lang, "Daily Handover", "每日交接")}
        </Link>
        <Link scroll={false} href="/admin/tickets/sop">
          {t(lang, "SOP One Pager", "SOP一页纸")}
        </Link>
      </div>

      <form method="GET" className="ts-filter-bar" style={{ marginBottom: 12 }}>
        <input name="q" defaultValue={q} placeholder={t(lang, "Search ticket/student/teacher", "搜索工单号/学生/老师")} />
        <select name="status" defaultValue={status}>
          <option value="">{t(lang, "All Status", "全部状态")}</option>
          {TICKET_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.zh} / {o.en}
            </option>
          ))}
        </select>
        <select name="owner" defaultValue={owner}>
          <option value="">{t(lang, "All Owners", "全部负责人")}</option>
          {TICKET_OWNER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.zh} / {o.en}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type}>
          <option value="">{t(lang, "All Types", "全部类型")}</option>
          {TICKET_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.zh} / {o.en}
            </option>
          ))}
        </select>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Clear", "清空")}</Link>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Ticket</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Priority", "优先级")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Owner", "负责人")}</th>
              <th align="left">{t(lang, "Summary", "摘要")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td>{r.ticketNo}</td>
                <td>{r.createdAt.toLocaleString()}</td>
                <td>
                  <div>{r.studentName}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{r.course ?? "-"}</div>
                </td>
                <td>{r.type}</td>
                <td>{r.priority}</td>
                <td>
                  <div>{r.status}</div>
                  {r.completedAt ? (
                    <div style={{ fontSize: 12, color: "#166534" }}>
                      {t(lang, "Done At", "完成时间")}: {r.completedAt.toLocaleString()}
                    </div>
                  ) : null}
                </td>
                <td>{r.owner ?? "-"}</td>
                <td style={{ maxWidth: 340 }}>{r.summary ?? "-"}</td>
                <td>
                  {r.status !== "Completed" ? (
                    <form action={markDoneAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <button type="submit">{t(lang, "Mark Completed", "标记已完成")}</button>
                    </form>
                  ) : (
                    <form action={reopenAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <button type="submit">{t(lang, "Reopen", "重新打开")}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


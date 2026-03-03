import { requireTeacher } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { canTransitionTicketStatus, TICKET_STATUS_OPTIONS } from "@/lib/tickets";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function proofItems(proof: string | null | undefined) {
  if (!proof) return [];
  return proof
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeProofUrl(item: string) {
  if (item.startsWith("/uploads/tickets/")) {
    const name = item.replace("/uploads/tickets/", "");
    return `/api/tickets/files/${encodeURIComponent(name)}`;
  }
  return item;
}

async function markDoneTeacherAction(formData: FormData) {
  "use server";
  const user = await requireTeacher();
  const id = String(formData.get("id") ?? "").trim();
  const back = String(formData.get("back") ?? "/teacher/tickets");
  const note = String(formData.get("completionNote") ?? "").trim().slice(0, 1000);
  if (!id) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, summary: true },
  });
  if (!row) redirect(back);
  if (!canTransitionTicketStatus(row.status, "Completed")) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=status-flow`);
  }
  if (!note) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=need-note`);
  }

  await prisma.ticket.update({
    where: { id },
    data: {
      status: "Completed",
      completedAt: new Date(),
      completedByUserId: user.id,
      summary: `${row.summary ? `${row.summary}\n` : ""}[Completed Note] ${note}`,
    },
  });
  revalidatePath("/teacher/tickets");
  revalidatePath("/admin/tickets");
  redirect(back);
}

export default async function TeacherTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; err?: string }>;
}) {
  await requireTeacher();
  const lang = await getLang();
  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const status = String(sp?.status ?? "").trim();
  const err = String(sp?.err ?? "").trim();

  const rows = await prisma.ticket.findMany({
    where: {
      isArchived: false,
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
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  const backHref = `/teacher/tickets?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`;

  return (
    <div>
      <h2>{t(lang, "Ticket Board", "工单看板")}</h2>
      {err === "status-flow" ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          状态流转不允许 / Invalid status transition
        </div>
      ) : null}
      {err === "need-note" ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          完成时必须填写完成说明 / Completion note is required when marking completed
        </div>
      ) : null}

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
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1020 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Ticket</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Summary", "摘要")}</th>
              <th align="left">{t(lang, "Proof", "证据")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td>{r.ticketNo}</td>
                <td>{r.createdAt.toLocaleString()}</td>
                <td>{r.studentName}</td>
                <td>{r.type}</td>
                <td>{r.status}</td>
                <td style={{ maxWidth: 320 }}>{r.summary ?? "-"}</td>
                <td style={{ maxWidth: 220 }}>
                  {proofItems(r.proof).length === 0 ? (
                    "-"
                  ) : (
                    <div style={{ display: "grid", gap: 4 }}>
                      {proofItems(r.proof).map((item, idx) => {
                        const href = normalizeProofUrl(item);
                        const isLink = href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
                        if (!isLink) return <span key={`${r.id}-proof-${idx}`}>{item}</span>;
                        return (
                          <a key={`${r.id}-proof-${idx}`} href={href} target="_blank" rel="noreferrer">
                            {`Proof ${idx + 1}`}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td>
                  {r.status !== "Completed" ? (
                    <form action={markDoneTeacherAction} style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <input name="completionNote" placeholder="完成说明 / Completion note" />
                      <button type="submit">{t(lang, "Mark Completed", "标记已完成")}</button>
                    </form>
                  ) : (
                    <span style={{ color: "#166534", fontWeight: 700 }}>{t(lang, "Done", "已完成")}</span>
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

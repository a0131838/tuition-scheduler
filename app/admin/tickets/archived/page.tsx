import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { TICKET_OWNER_OPTIONS, TICKET_STATUS_OPTIONS, TICKET_TYPE_OPTIONS } from "@/lib/tickets";
import Link from "next/link";

function proofItems(proof: string | null | undefined) {
  if (!proof) return [];
  return proof
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default async function AdminArchivedTicketsPage({
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
      isArchived: true,
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
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
  });

  return (
    <div>
      <h2>{t(lang, "Archived Tickets", "已归档工单")}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Back to Ticket Center", "返回工单中心")}</Link>
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
        <Link scroll={false} href="/admin/tickets/archived">{t(lang, "Clear", "清空")}</Link>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Ticket</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Owner", "负责人")}</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Completed", "完成时间")}</th>
              <th align="left">{t(lang, "Updated", "更新时间")}</th>
              <th align="left">{t(lang, "Summary", "摘要")}</th>
              <th align="left">{t(lang, "Proof", "证据")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td>{r.ticketNo}</td>
                <td>{r.studentName}</td>
                <td>{r.type}</td>
                <td>{r.status}</td>
                <td>{r.owner ?? "-"}</td>
                <td>{r.createdAt.toLocaleString()}</td>
                <td>{r.completedAt ? r.completedAt.toLocaleString() : "-"}</td>
                <td>{r.updatedAt.toLocaleString()}</td>
                <td style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>{r.summary ?? "-"}</td>
                <td style={{ maxWidth: 260, whiteSpace: "pre-wrap" }}>
                  {proofItems(r.proof).length === 0 ? (
                    "-"
                  ) : (
                    <div style={{ display: "grid", gap: 4 }}>
                      {proofItems(r.proof).map((item, idx) => {
                        const isLink = item.startsWith("/") || item.startsWith("http://") || item.startsWith("https://");
                        if (!isLink) return <span key={`${r.id}-proof-${idx}`}>{item}</span>;
                        const imageLike = /\.(png|jpe?g|webp|gif)$/i.test(item);
                        return (
                          <a key={`${r.id}-proof-${idx}`} href={item} target="_blank" rel="noreferrer">
                            {imageLike ? `Image ${idx + 1}` : `File ${idx + 1}`}
                          </a>
                        );
                      })}
                    </div>
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

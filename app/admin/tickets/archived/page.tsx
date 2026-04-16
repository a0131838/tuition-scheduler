import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  normalizeTicketPriorityValue,
  normalizeTicketTypeValue,
  parseTicketSituationSummary,
  TICKET_OWNER_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_TYPE_OPTIONS,
  ticketTypeAliases,
} from "@/lib/tickets";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { existsSync } from "fs";
import { BUSINESS_UPLOAD_PREFIX, resolveStoredBusinessFilePath } from "@/lib/business-file-storage";
import { formatBusinessDateTime } from "@/lib/date-only";
import { formatSchedulingCoordinationSystemText } from "@/lib/scheduling-coordination";

function proofItems(proof: string | null | undefined) {
  if (!proof) return [];
  return proof
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeProofUrl(item: string) {
  if (item.startsWith("/uploads/tickets/")) {
    const name = item.replace("/uploads/tickets/", "");
    return `/api/tickets/files/${encodeURIComponent(name)}`;
  }
  return item;
}

function extractTicketProofFilename(item: string) {
  const raw = item.trim();
  if (!raw) return "";
  if (raw.startsWith("/uploads/tickets/")) {
    return raw.replace("/uploads/tickets/", "").trim();
  }
  if (raw.startsWith("/api/tickets/files/")) {
    return decodeURIComponent(raw.split("/").pop() ?? "").trim();
  }
  return "";
}

function isTicketProofMissing(item: string) {
  const filename = extractTicketProofFilename(item);
  if (!filename) return false;
  const abs = resolveStoredBusinessFilePath(`${BUSINESS_UPLOAD_PREFIX.tickets}${filename}`, BUSINESS_UPLOAD_PREFIX.tickets);
  if (!abs) return true;
  return !existsSync(abs);
}

function appendQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, "https://local.invalid");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function sanitizeArchivedBack(raw: string | null | undefined, fallback: string) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/admin/tickets/archived")) return fallback;
  return value.slice(0, 1000);
}

async function deleteTicketAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim().slice(0, 80);
  const back = sanitizeArchivedBack(String(formData.get("back") ?? ""), "/admin/tickets/archived#archived-ticket-list");
  if (!id) redirect(back);
  if (!isStrictSuperAdmin(user)) {
    redirect(appendQuery(back, { err: "delete-forbidden" }));
  }
  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, isArchived: true },
  });
  if (!row) redirect(back);
  if (!row.isArchived && !["Completed", "Cancelled"].includes(row.status)) {
    redirect(appendQuery(back, { err: "need-closed-delete" }));
  }
  await prisma.ticket.delete({ where: { id } });
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/tickets/archived");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/teacher/tickets");
  redirect(appendQuery(back, { ok: "deleted" }));
}

export default async function AdminArchivedTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; owner?: string; type?: string; err?: string; ok?: string }>;
}) {
  const adminUser = await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const status = String(sp?.status ?? "").trim();
  const owner = String(sp?.owner ?? "").trim();
  const type = String(sp?.type ?? "").trim();
  const err = String(sp?.err ?? "").trim();
  const ok = String(sp?.ok ?? "").trim();
  const canHardDeleteTickets = isStrictSuperAdmin(adminUser);
  const backHref = `/admin/tickets/archived?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&owner=${encodeURIComponent(owner)}&type=${encodeURIComponent(type)}`;

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
      ...(type ? { type: { in: ticketTypeAliases(type) } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
  });

  return (
    <div>
      <div
        style={{
          border: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #f8fafc 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
            Archive Desk / 归档工单区
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Archived Tickets", "已归档工单")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(
              lang,
              "Use this page for historical lookup, recovery checks, and permanent deletion by the super admin.",
              "这里主要用于历史回看、恢复排查，以及超管执行永久删除。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Matched archived tickets", "当前匹配工单")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{rows.length}</div>
          </div>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Delete permission", "删除权限")}</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>
              {canHardDeleteTickets ? t(lang, "Enabled", "已开启") : t(lang, "View only", "仅查看")}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Back to Ticket Center", "返回工单中心")}</Link>
      </div>
      {err ? <div style={{ color: "#b91c1c", marginBottom: 8 }}>{err === "delete-forbidden" ? t(lang, "Only Zhao Hongwei can permanently delete tickets.", "只有 Zhao Hongwei 可以永久删除工单。") : err === "need-closed-delete" ? t(lang, "Only completed, cancelled, or archived tickets can be permanently deleted.", "只有已完成、已取消或已归档工单可以永久删除。") : ""}</div> : null}
      {ok === "deleted" ? <div style={{ color: "#166534", marginBottom: 8 }}>{t(lang, "Ticket deleted permanently.", "工单已永久删除。")}</div> : null}

      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #e2e8f0",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#archived-ticket-filters">{t(lang, "Filters", "筛选")}</a>
        <a href="#archived-ticket-list">{t(lang, "Archived list", "归档列表")}</a>
      </div>

      <form id="archived-ticket-filters" method="GET" className="ts-filter-bar" style={{ marginBottom: 12, scrollMarginTop: 96 }}>
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

      <div id="archived-ticket-list" className="table-scroll" style={{ scrollMarginTop: 96 }}>
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Ticket</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Source", "来源")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Priority", "优先级")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Owner", "负责人")}</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Completed", "完成时间")}</th>
              <th align="left">{t(lang, "Updated", "更新时间")}</th>
              <th align="left">{t(lang, "Situation", "情况")}</th>
              <th align="left">{t(lang, "Proof", "证据")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr id={`archived-ticket-row-${r.id}`} key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td><Link scroll={false} href={`/admin/tickets/${r.id}?back=${encodeURIComponent(`${backHref}#archived-ticket-row-${r.id}`)}`}>{r.ticketNo}</Link></td>
                <td>{r.studentName}</td>
                <td>{r.source}</td>
                <td>{normalizeTicketTypeValue(r.type)}</td>
                <td>{normalizeTicketPriorityValue(r.priority)}</td>
                <td>{r.status}</td>
                <td>{r.owner ?? "-"}</td>
                <td>{formatBusinessDateTime(r.createdAt)}</td>
                <td>{r.completedAt ? formatBusinessDateTime(r.completedAt) : "-"}</td>
                <td>{formatBusinessDateTime(r.updatedAt)}</td>
                <td style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                  {formatSchedulingCoordinationSystemText(parseTicketSituationSummary(r.summary).currentIssue || r.summary || "-")}
                </td>
                <td style={{ maxWidth: 260, whiteSpace: "pre-wrap" }}>
                  {proofItems(r.proof).length === 0 ? (
                    "-"
                  ) : (
                    <details>
                      <summary style={{ cursor: "pointer" }}>{proofItems(r.proof).length} files</summary>
                      <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                        {proofItems(r.proof).map((item, idx) => {
                          const href = normalizeProofUrl(item);
                          const isLink = href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
                          const missing = isTicketProofMissing(item);
                          if (!isLink) {
                            return (
                              <span key={`${r.id}-proof-${idx}`} style={{ color: missing ? "#b91c1c" : undefined }}>
                                {item}
                                {missing ? "（文件缺失，请补传）" : ""}
                              </span>
                            );
                          }
                          const imageLike = /\.(png|jpe?g|webp|gif)$/i.test(href);
                          return (
                            <div key={`${r.id}-proof-${idx}`} style={{ display: "grid", gap: 2 }}>
                              <a href={href} target="_blank" rel="noreferrer" style={{ color: missing ? "#b91c1c" : undefined }}>
                                {imageLike ? `Image ${idx + 1}` : `File ${idx + 1}`}
                              </a>
                              {missing ? <span style={{ color: "#b91c1c", fontSize: 12 }}>文件缺失，请补传 / Missing file, re-upload required</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </td>
                <td>
                  <div style={{ display: "grid", gap: 6, maxWidth: 220 }}>
                    <Link scroll={false} href={`/admin/tickets/${r.id}?back=${encodeURIComponent(`${backHref}#archived-ticket-row-${r.id}`)}`}>
                      {t(lang, "Open", "打开")}
                    </Link>
                    {canHardDeleteTickets ? (
                      <form action={deleteTicketAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="back" value={`${backHref}#archived-ticket-list`} />
                        <button type="submit" style={{ background: "#7f1d1d", color: "#fff", borderColor: "#7f1d1d" }}>{t(lang, "Delete permanently", "永久删除")}</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

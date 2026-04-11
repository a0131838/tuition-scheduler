import { requireAdmin } from "@/lib/auth";
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
      ...(type ? { type: { in: ticketTypeAliases(type) } } : {}),
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td>{r.ticketNo}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

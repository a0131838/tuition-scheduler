import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  canTransitionTicketStatus,
  normalizeTicketPriorityValue,
  normalizeTicketTypeValue,
  parseTicketSituationSummary,
  TICKET_STATUS_OPTIONS,
} from "@/lib/tickets";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { existsSync } from "fs";
import { BUSINESS_UPLOAD_PREFIX, resolveStoredBusinessFilePath } from "@/lib/business-file-storage";
import { formatBusinessDateTime } from "@/lib/date-only";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

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

function statCard(bg: string, border: string) {
  return {
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: bg,
  } as const;
}

async function markDoneTeacherAction(formData: FormData) {
  "use server";
  const { user, teacher } = await requireTeacherProfile();
  const id = String(formData.get("id") ?? "").trim();
  const back = String(formData.get("back") ?? "/teacher/tickets");
  const note = String(formData.get("completionNote") ?? "").trim().slice(0, 1000);
  if (!id) redirect(back);
  if (!teacher) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=not-linked`);
  }

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, summary: true, teacher: true },
  });
  if (!row) redirect(back);
  const isOwnByTeacherName = (row.teacher ?? "").trim().toLowerCase() === teacher.name.trim().toLowerCase();
  if (!isOwnByTeacherName) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=forbidden`);
  }
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
  const { teacher } = await requireTeacherProfile();
  const lang = await getLang();
  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const status = String(sp?.status ?? "").trim();
  const err = String(sp?.err ?? "").trim();
  if (!teacher) {
    return (
      <div>
        <h2>{t(lang, "Ticket Board", "工单看板")}</h2>
        <div style={{ color: "#b91c1c" }}>
          老师资料未关联，暂时无法查看工单。/ Teacher profile is not linked yet.
        </div>
      </div>
    );
  }

  const rows = await prisma.ticket.findMany({
    where: {
      isArchived: false,
      teacher: { equals: teacher.name, mode: "insensitive" },
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
  const urgentCount = rows.filter((row) => ["high", "urgent"].includes(String(row.priority ?? "").trim().toLowerCase())).length;
  const missingProofCount = rows.filter((row) => proofItems(row.proof).some((item) => isTicketProofMissing(item))).length;
  const openActionCount = rows.filter((row) => row.status !== "Completed").length;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Ticket Board", "工单看板")}
        subtitle={t(
          lang,
          "Track your open tickets, spot missing proof early, and close work with a clear completion note instead of scanning a dense board.",
          "集中查看自己的未完成工单，尽早发现缺失证据，并用清晰的完成说明收尾，不再需要在密集表格里来回扫描。"
        )}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/tickets?status=Open", label: t(lang, "Open active tickets", "查看未完成工单") },
        ]}
      />
      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div style={statCard("#eff6ff", "#bfdbfe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Open tickets", "未归档工单")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1d4ed8", marginTop: 8 }}>{rows.length}</div>
          <div style={{ color: "#1e40af", marginTop: 4 }}>{t(lang, "Tickets currently assigned to you.", "当前分配给你的工单数量。")}</div>
        </div>
        <div style={statCard("#fff7ed", "#fdba74")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412" }}>{t(lang, "Urgent priority", "高优先级")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#9a3412", marginTop: 8 }}>{urgentCount}</div>
          <div style={{ color: "#9a3412", marginTop: 4 }}>{t(lang, "High / urgent tickets needing attention.", "需要优先处理的高优先级工单。")}</div>
        </div>
        <div style={statCard("#fef2f2", "#fecaca")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>{t(lang, "Missing proof", "证据缺失")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#b91c1c", marginTop: 8 }}>{missingProofCount}</div>
          <div style={{ color: "#991b1b", marginTop: 4 }}>{t(lang, "Tickets with proof files missing locally.", "本地证据文件已经缺失的工单。")}</div>
        </div>
        <div style={statCard("#ecfdf5", "#bbf7d0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Need completion", "待完成")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#166534", marginTop: 8 }}>{openActionCount}</div>
          <div style={{ color: "#166534", marginTop: 4 }}>{t(lang, "Tickets still waiting for your completion note.", "仍在等待你填写完成说明的工单。")}</div>
        </div>
      </section>
      {err === "status-flow" ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          {t(lang, "This ticket cannot be marked completed from its current status.", "当前状态下不能直接标记这张工单为已完成。")}
        </div>
      ) : null}
      {err === "need-note" ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          {t(lang, "Add a completion note before marking this ticket completed.", "请先填写完成说明，再标记这张工单为已完成。")}
        </div>
      ) : null}
      {err === "forbidden" ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          {t(lang, "You can only update tickets assigned to you.", "你只能操作分配给自己的工单。")}
        </div>
      ) : null}
      {err === "not-linked" ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          {t(lang, "Your teacher profile is not linked yet, so ticket actions are unavailable.", "老师档案尚未关联，暂时无法执行工单操作。")}
        </div>
      ) : null}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, background: "#ffffff", display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>{t(lang, "Ticket filters", "工单筛选")}</div>
      <form method="GET" className="ts-filter-bar" style={{ marginBottom: 0 }}>
        <input name="q" defaultValue={q} placeholder={t(lang, "Search ticket no., student, or teacher", "搜索工单号、学生或老师")} />
        <select name="status" defaultValue={status}>
          <option value="">{t(lang, "All statuses", "全部状态")}</option>
          {TICKET_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(lang, o.en, o.zh)}
            </option>
          ))}
        </select>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>
      <div style={{ fontSize: 13, color: "#475569" }}>
        {t(lang, "Tip: filter to one status first, then work through completion notes from top to bottom.", "建议先按状态收窄范围，再从上到下处理完成说明，会比整张看板来回扫更稳。")}
      </div>
      </section>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1020 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Ticket</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Priority", "优先级")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Situation", "情况")}</th>
              <th align="left">{t(lang, "Proof", "证据")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td>{r.ticketNo}</td>
                <td>{formatBusinessDateTime(r.createdAt)}</td>
                <td>{r.studentName}</td>
                <td>{normalizeTicketTypeValue(r.type)}</td>
                <td>{normalizeTicketPriorityValue(r.priority)}</td>
                <td>{r.status}</td>
                <td style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                  {parseTicketSituationSummary(r.summary).currentIssue || r.summary || "-"}
                </td>
                <td style={{ maxWidth: 220 }}>
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
                          return (
                            <div key={`${r.id}-proof-${idx}`} style={{ display: "grid", gap: 2 }}>
                              <a href={href} target="_blank" rel="noreferrer" style={{ color: missing ? "#b91c1c" : undefined }}>
                                {t(lang, `Proof file ${idx + 1}`, `凭证文件 ${idx + 1}`)}
                              </a>
                              {missing ? <span style={{ color: "#b91c1c", fontSize: 12 }}>{t(lang, "File missing. Please re-upload it.", "文件缺失，请重新上传。")}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </td>
                <td>
                  {r.status !== "Completed" ? (
                    <form action={markDoneTeacherAction} style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <input name="completionNote" placeholder={t(lang, "Completion note", "完成说明")} />
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

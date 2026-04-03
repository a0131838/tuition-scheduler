import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  canTransitionTicketStatus,
  generateIntakeToken,
  TICKET_OWNER_OPTIONS,
  normalizeTicketPriorityValue,
  normalizeTicketTypeValue,
  normalizeTicketString,
  parseTicketSituationSummary,
  TICKET_STATUS_OPTIONS,
  TICKET_TYPE_OPTIONS,
  ticketTypeAliases,
} from "@/lib/tickets";
import { getOverdueTicketFollowupGroups } from "@/lib/ticket-followups";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatBusinessDateTime } from "@/lib/date-only";

function trimValue(formData: FormData, key: string, max = 400) {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, max) : "";
}

function validateByOptions(value: string | null, options: { value: string }[]) {
  if (!value) return null;
  return options.some((o) => o.value === value) ? value : null;
}

function proofItems(proof: string | null | undefined) {
  if (!proof) return [];
  return proof
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function situationLines(summary: string | null | undefined, nextAction: string | null | undefined, nextActionDue: Date | null | undefined) {
  const parsed = parseTicketSituationSummary(summary);
  return {
    currentIssue: parsed.currentIssue || "-",
    requiredAction: parsed.requiredAction || nextAction || "-",
    latestDeadline: parsed.latestDeadlineText || (nextActionDue ? formatBusinessDateTime(nextActionDue) : "-"),
  };
}

async function updateStatusAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = trimValue(formData, "back", 500) || "/admin/tickets";
  const nextStatus = trimValue(formData, "nextStatus", 60);
  const completionNote = trimValue(formData, "completionNote", 1000);
  if (!id || !nextStatus) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, summary: true, isArchived: true },
  });
  if (!row) redirect(back);
  if (row.isArchived) redirect(`${back}${back.includes("?") ? "&" : "?"}err=archived-locked`);
  if (row.status === "Completed") redirect(`${back}${back.includes("?") ? "&" : "?"}err=completed-locked`);
  if (!canTransitionTicketStatus(row.status, nextStatus)) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=status-flow`);
  }
  if (nextStatus === "Completed" && !completionNote) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=need-note`);
  }

  await prisma.ticket.update({
    where: { id },
    data: {
      status: nextStatus,
      completedAt: nextStatus === "Completed" ? new Date() : null,
      completedByUserId: nextStatus === "Completed" ? user.id : null,
      summary:
        nextStatus === "Completed"
          ? `${row.summary ? `${row.summary}\n` : ""}[Completed Note] ${completionNote}`
          : row.summary,
    },
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/teacher/tickets");
  redirect(back);
}

async function archiveTicketAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = trimValue(formData, "back", 500) || "/admin/tickets";
  if (!id) redirect(back);
  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, isArchived: true },
  });
  if (!row) redirect(back);
  if (row.isArchived) redirect(back);
  if (!["Completed", "Cancelled"].includes(row.status)) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=need-closed-archive`);
  }
  await prisma.ticket.update({
    where: { id },
    data: { isArchived: true },
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/teacher/tickets");
  redirect(back);
}

async function createIntakeTokenAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const label = trimValue(formData, "label", 120) || "Default";
  const expiresAtRaw = trimValue(formData, "expiresAt", 30);
  const expiresAt =
    /^\d{4}-\d{2}-\d{2}$/.test(expiresAtRaw) ? new Date(`${expiresAtRaw}T23:59:59+08:00`) : null;
  await prisma.ticketIntakeToken.create({
    data: {
      token: generateIntakeToken(),
      label,
      createdByUserId: user.id,
      expiresAt,
    },
  });
  revalidatePath("/admin/tickets");
  redirect("/admin/tickets?tok=1");
}

async function disableTokenAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  if (!id) redirect("/admin/tickets");
  await prisma.ticketIntakeToken.update({
    where: { id },
    data: { isActive: false },
  });
  revalidatePath("/admin/tickets");
  redirect("/admin/tickets?tok=1");
}

async function deleteTokenAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  if (!id) redirect("/admin/tickets");
  await prisma.ticketIntakeToken.delete({ where: { id } });
  revalidatePath("/admin/tickets");
  redirect("/admin/tickets?tok=1");
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; owner?: string; type?: string; err?: string; tok?: string; focus?: string; ok?: string; fields?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const status = String(sp?.status ?? "").trim();
  const owner = String(sp?.owner ?? "").trim();
  const type = String(sp?.type ?? "").trim();
  const focus = String(sp?.focus ?? "").trim();
  const err = String(sp?.err ?? "").trim();
  const ok = String(sp?.ok ?? "").trim();
  const fields = String(sp?.fields ?? "").trim();
  const tokenSaved = sp?.tok === "1";

  const [rows, tokens, overdueGroups] = await Promise.all([
    prisma.ticket.findMany({
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
        ...(owner ? { owner } : {}),
        ...(type ? { type: { in: ticketTypeAliases(type) } } : {}),
        ...(focus === "mgmt"
          ? {
              OR: [
                { status: "Exception" },
                { priority: { contains: "紧急" } },
                { priority: { contains: "Urgent", mode: "insensitive" } },
                {
                  AND: [
                    { nextActionDue: { lt: new Date() } },
                    { status: { notIn: ["Completed", "Cancelled"] } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.ticketIntakeToken.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    getOverdueTicketFollowupGroups({ perOwnerLimit: 5, totalLimit: 80 }),
  ]);

  const activeToken = tokens.find((x) => x.isActive && (!x.expiresAt || x.expiresAt.getTime() > Date.now()));
  const intakeLink = activeToken ? `/tickets/intake/${activeToken.token}` : "";
  const backHref = `/admin/tickets?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&owner=${encodeURIComponent(owner)}&type=${encodeURIComponent(type)}&focus=${encodeURIComponent(focus)}`;

  return (
    <div>
      <h2>{t(lang, "Ticket Center", "工单中心")}</h2>
      {err ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          {err === "status-flow" && t(lang, "Invalid status transition.", "状态流转不允许。")}
          {err === "need-note" && t(lang, "Completion note is required when marking completed.", "标记完成时必须填写完成说明。")}
          {err === "completed-locked" && t(lang, "Completed ticket is locked. Use archive instead.", "已完成工单不可修改，请改用归档。")}
          {err === "archived-locked" && t(lang, "Archived ticket is locked.", "已归档工单不可修改。")}
          {err === "need-closed-archive" && t(lang, "Only completed or cancelled tickets can be archived.", "仅已完成或已取消工单可归档。")}
          {err === "edit-required" && t(lang, "Could not save edits. Student, source, type, priority, and owner are required.", "保存编辑失败：学生、来源、类型、优先级和负责人为必填项。")}
          {err === "edit-package-required" && t(lang, "Could not save edits. Grade and course are required for new-student package purchases.", "保存编辑失败：新学生购买课时包时必须填写年级和课程。")}
          {err === "edit-type-required" &&
            t(
              lang,
              `Could not save edits. Required fields are missing for this ticket type${fields ? `: ${decodeURIComponent(fields)}` : ""}.`,
              `保存编辑失败：该工单类型缺少必填字段${fields ? `：${decodeURIComponent(fields)}` : "。"}`
            )}
          {err === "edit-situation" && t(lang, "Could not save edits. All situation fields are required.", "保存编辑失败：情况说明相关字段必须全部填写。")}
        </div>
      ) : null}
      {ok === "edited" ? <div style={{ color: "#166534", marginBottom: 8 }}>{t(lang, "Ticket updated.", "工单已更新。")}</div> : null}
      {tokenSaved ? <div style={{ color: "#166534", marginBottom: 8 }}>{t(lang, "Intake link updated.", "录入链接已更新。")}</div> : null}
      {focus === "mgmt" ? (
        <div style={{ color: "#7c2d12", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 8, marginBottom: 8 }}>
          {t(lang, "Management focus: exception, urgent, and overdue unfinished tickets.", "管理介入视图：异常、紧急和逾期未完成工单。")}
        </div>
      ) : null}
      <div style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 10, padding: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Overdue follow-up queue", "超时催办清单")}</div>
          <div style={{ fontSize: 12, color: "#7f1d1d" }}>
            {overdueGroups.length === 0
              ? t(lang, "No overdue tickets.", "当前无超时工单。")
              : t(
                  lang,
                  `${overdueGroups.reduce((sum, group) => sum + group.count, 0)} overdue tickets across ${overdueGroups.length} owners`,
                  `${overdueGroups.reduce((sum, group) => sum + group.count, 0)} 张超时工单，涉及 ${overdueGroups.length} 位负责人`
                )}
          </div>
        </div>
        {overdueGroups.length === 0 ? (
          <div style={{ color: "#166534", fontSize: 13 }}>{t(lang, "No overdue follow-up needed right now.", "当前无超时工单，可按正常节奏处理。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {overdueGroups.map((group) => (
              <div key={group.owner} style={{ border: "1px solid #fecaca", borderRadius: 8, background: "#fff", padding: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {group.owner} <span style={{ color: "#b91c1c" }}>({group.count})</span>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.items.map((item) => (
                    <div key={item.id} style={{ border: "1px solid #fee2e2", borderRadius: 6, background: "#fffafa", padding: 6, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <b>{item.ticketNo}</b>
                        <span style={{ color: "#b91c1c", fontWeight: 700 }}>{item.overdueLabel}</span>
                      </div>
                      <div>{item.studentName} | {normalizeTicketTypeValue(item.type)}</div>
                      <div>{t(lang, "Priority", "优先级")}: {normalizeTicketPriorityValue(item.priority)}</div>
                      <div>{t(lang, "Next step", "下一步")}: {item.nextAction ?? "-"}</div>
                      <div>{t(lang, "Due", "截止")}: {formatBusinessDateTime(new Date(item.nextActionDue))}</div>
                      <Link scroll={false} href={item.openHref}>{t(lang, "Open ticket", "打开工单")}</Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 12, background: "#f8fafc" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Intake link management", "录入链接管理")}</div>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
          {t(lang, "The label becomes the default intake owner for this link and is also used to filter that person's ticket board. For example, use", "标签会作为该链接默认录入人，并用于个人工单看板过滤。比如给")}
          {" "}
          <b>Emily</b>
          {" "}
          {t(lang, "when creating Emily's link.", "建链接时，标签直接填 Emily。")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {intakeLink ? (
            <Link scroll={false} href={intakeLink} target="_blank">
              {t(lang, "Open active intake link", "打开当前录入链接")}
            </Link>
          ) : (
            <span style={{ color: "#92400e" }}>{t(lang, "No active intake link.", "暂无可用录入链接。")}</span>
          )}
          <Link scroll={false} href="/admin/tickets/handover">
            {t(lang, "Daily Handover", "每日交接")}
          </Link>
          <Link scroll={false} href="/admin/tickets/sop">
            {t(lang, "SOP One Pager", "SOP一页纸")}
          </Link>
          <Link
            scroll={false}
            href="/admin/tickets/sop"
            style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "6px 10px", fontWeight: 700 }}
          >
            {t(lang, "SOP for customer support", "给客服看的 SOP")}
          </Link>
          <Link scroll={false} href="/admin/tickets/archived">
            {t(lang, "Archived Tickets", "已归档工单")}
          </Link>
        </div>
        <form action={createIntakeTokenAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input name="label" placeholder={t(lang, "Label", "标签")} />
          <label>
            {t(lang, "Expiry date", "失效日")}:
            <input name="expiresAt" type="date" />
          </label>
          <button type="submit">{t(lang, "Create intake link", "新建录入链接")}</button>
        </form>
        <div className="table-scroll">
          <table cellPadding={6} style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#eef2ff" }}>
                <th align="left">{t(lang, "Label", "标签")}</th>
                <th align="left">{t(lang, "Token", "令牌")}</th>
                <th align="left">{t(lang, "Status", "状态")}</th>
                <th align="left">{t(lang, "Expiry", "失效日")}</th>
                <th align="left">{t(lang, "Link", "链接")}</th>
                <th align="left">{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((tk) => {
                const expired = !!tk.expiresAt && tk.expiresAt.getTime() <= Date.now();
                return (
                  <tr key={tk.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td>{tk.label ?? "-"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{tk.token}</td>
                    <td>{tk.isActive && !expired ? t(lang, "Active", "可用") : t(lang, "Inactive", "不可用")}</td>
                    <td>{tk.expiresAt ? formatBusinessDateTime(tk.expiresAt) : "-"}</td>
                    <td>
                      <Link scroll={false} href={`/tickets/intake/${tk.token}`} target="_blank">
                        {t(lang, "Open", "打开")}
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {tk.isActive ? (
                          <form action={disableTokenAction}>
                            <input type="hidden" name="id" value={tk.id} />
                            <button type="submit">{t(lang, "Disable", "停用")}</button>
                          </form>
                        ) : null}
                        <form action={deleteTokenAction}>
                          <input type="hidden" name="id" value={tk.id} />
                          <button type="submit">{t(lang, "Delete", "删除")}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <form method="GET" className="ts-filter-bar" style={{ marginBottom: 12 }}>
        <input name="q" defaultValue={q} placeholder={t(lang, "Search ticket/student/teacher", "搜索工单号/学生/老师")} />
        <select name="status" defaultValue={status}>
          <option value="">{t(lang, "All Status", "全部状态")}</option>
          {TICKET_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(lang, o.en, o.zh)}
            </option>
          ))}
        </select>
        <select name="owner" defaultValue={owner}>
          <option value="">{t(lang, "All Owners", "全部负责人")}</option>
          {TICKET_OWNER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(lang, o.en, o.zh)}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type}>
          <option value="">{t(lang, "All Types", "全部类型")}</option>
          {TICKET_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(lang, o.en, o.zh)}
            </option>
          ))}
        </select>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Clear", "清空")}</Link>
        <Link scroll={false} href="/admin/tickets?focus=mgmt">{t(lang, "Management focus", "管理介入")}</Link>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1030, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "84px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "60px" }} />
            <col style={{ width: "72px" }} />
            <col style={{ width: "64px" }} />
            <col style={{ width: "78px" }} />
            <col style={{ width: "64px" }} />
            <col style={{ width: "86px" }} />
            <col style={{ width: "270px" }} />
            <col style={{ width: "54px" }} />
            <col style={{ width: "230px" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Ticket</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Source", "来源")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Priority", "优先级")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Owner", "负责人")}</th>
              <th align="left">SLA</th>
              <th align="left">{t(lang, "Situation", "情况")}</th>
              <th align="left">{t(lang, "Proof", "证据")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const situation = situationLines(r.summary, r.nextAction, r.nextActionDue);
              return (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0", verticalAlign: "top" }}>
                <td>
                  <Link scroll={false} href={`/admin/tickets/${r.id}?back=${encodeURIComponent(backHref)}`}>
                    {r.ticketNo}
                  </Link>
                </td>
                <td>
                  <div>{r.studentName}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{formatBusinessDateTime(r.createdAt)}</div>
                </td>
                <td>{r.source}</td>
                <td>{normalizeTicketTypeValue(r.type)}</td>
                <td>{normalizeTicketPriorityValue(r.priority)}</td>
                <td>
                  <div>{r.status}</div>
                  {r.completedAt ? (
                    <div style={{ fontSize: 12, color: "#166534" }}>
                      {t(lang, "Done At", "完成时间")}: {formatBusinessDateTime(r.completedAt)}
                    </div>
                  ) : null}
                </td>
                <td>{r.owner ?? "-"}</td>
                <td>{r.slaDue ? formatBusinessDateTime(r.slaDue) : "-"}</td>
                <td style={{ whiteSpace: "normal", lineHeight: 1.35 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div><b>{t(lang, "Current issue", "当前问题")}</b>: <span style={{ whiteSpace: "pre-wrap" }}>{situation.currentIssue}</span></div>
                    <div><b>{t(lang, "Required action", "需要怎么做")}</b>: <span style={{ whiteSpace: "pre-wrap" }}>{situation.requiredAction}</span></div>
                    <div><b>{t(lang, "Latest deadline", "最晚截止")}</b>: {situation.latestDeadline}</div>
                  </div>
                </td>
                <td>
                  {proofItems(r.proof).length === 0 ? (
                    "-"
                  ) : (
                    <div>{t(lang, `${proofItems(r.proof).length} files`, `${proofItems(r.proof).length} 份文件`)}</div>
                  )}
                </td>
                <td>
                  {r.status === "Completed" || r.status === "Cancelled" ? (
                    <div style={{ display: "grid", gap: 6, maxWidth: 210 }}>
                      <div style={{ color: r.status === "Cancelled" ? "#b45309" : "#166534", fontWeight: 700 }}>
                        {r.status === "Cancelled"
                          ? t(lang, "Cancelled (archivable)", "已取消（可归档）")
                          : t(lang, "Completed (locked)", "已完成（锁定）")}
                      </div>
                      <form action={archiveTicketAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="back" value={backHref} />
                        <button type="submit">{t(lang, "Archive", "归档")}</button>
                      </form>
                    </div>
                  ) : (
                    <form action={updateStatusAction} style={{ display: "grid", gap: 6, maxWidth: 210 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <select name="nextStatus" defaultValue={r.status} style={{ width: "100%", boxSizing: "border-box" }}>
                        {TICKET_STATUS_OPTIONS.filter((o) => canTransitionTicketStatus(r.status, o.value)).map((o) => (
                          <option key={o.value} value={o.value}>
                            {t(lang, o.en, o.zh)}
                          </option>
                        ))}
                      </select>
                      <input
                        name="completionNote"
                        placeholder={t(lang, "Completion note (required only when marking completed)", "完成说明（仅标记完成时必填）")}
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                      <button type="submit" style={{ width: "100%", boxSizing: "border-box" }}>{t(lang, "Save", "保存")}</button>
                    </form>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

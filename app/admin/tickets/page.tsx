import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  canTransitionTicketStatus,
  generateIntakeToken,
  normalizeTicketPriorityValue,
  normalizeTicketTypeValue,
  parseTicketSituationSummary,
  TICKET_OWNER_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_TYPE_OPTIONS,
  ticketTypeAliases,
} from "@/lib/tickets";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

function trimValue(formData: FormData, key: string, max = 400) {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, max) : "";
}

function proofItems(proof: string | null | undefined) {
  if (!proof) return [];
  return proof
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function proofItemsAll(proof: string | null | undefined) {
  if (!proof) return [];
  return proof
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeProofUrl(item: string) {
  if (item.startsWith("/uploads/tickets/")) {
    const name = item.replace("/uploads/tickets/", "");
    return `/api/tickets/files/${encodeURIComponent(name)}`;
  }
  return item;
}

function asText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s || "-";
}

function situationPreview(summary: string | null | undefined) {
  const parsed = parseTicketSituationSummary(summary);
  return parsed.currentIssue || asText(summary);
}

function situationLines(summary: string | null | undefined, nextAction: string | null | undefined, nextActionDue: Date | null | undefined) {
  const parsed = parseTicketSituationSummary(summary);
  return {
    currentIssue: asText(parsed.currentIssue),
    requiredAction: asText(parsed.requiredAction || nextAction),
    latestDeadline: parsed.latestDeadlineText || (nextActionDue ? nextActionDue.toLocaleString() : "-"),
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
  if (row.status !== "Completed") {
    redirect(`${back}${back.includes("?") ? "&" : "?"}err=need-completed-archive`);
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
  searchParams?: Promise<{ q?: string; status?: string; owner?: string; type?: string; err?: string; tok?: string; focus?: string }>;
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
  const tokenSaved = sp?.tok === "1";

  const [rows, tokens] = await Promise.all([
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
  ]);

  const activeToken = tokens.find((x) => x.isActive && (!x.expiresAt || x.expiresAt.getTime() > Date.now()));
  const intakeLink = activeToken ? `/tickets/intake/${activeToken.token}` : "";
  const backHref = `/admin/tickets?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&owner=${encodeURIComponent(owner)}&type=${encodeURIComponent(type)}&focus=${encodeURIComponent(focus)}`;

  return (
    <div>
      <h2>{t(lang, "Ticket Center", "工单中心")}</h2>
      {err ? (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          {err === "status-flow" && "状态流转不允许 / Invalid status transition"}
          {err === "need-note" && "完成时必须填写完成说明 / Completion note is required when marking completed"}
          {err === "completed-locked" && "已完成工单不可修改，请使用归档 / Completed ticket is locked. Use archive."}
          {err === "archived-locked" && "已归档工单不可修改 / Archived ticket is locked."}
          {err === "need-completed-archive" && "仅已完成工单可归档 / Only completed tickets can be archived."}
        </div>
      ) : null}
      {tokenSaved ? <div style={{ color: "#166534", marginBottom: 8 }}>录入链接已更新 / Intake link updated</div> : null}
      {focus === "mgmt" ? (
        <div style={{ color: "#7c2d12", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 8, marginBottom: 8 }}>
          管理介入视图 / Management Focus: 异常、紧急、逾期未完成工单
        </div>
      ) : null}

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 12, background: "#f8fafc" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>录入链接管理 / Intake Link Management</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {intakeLink ? (
            <Link scroll={false} href={intakeLink} target="_blank">
              打开当前录入链接 / Open Active Intake Link
            </Link>
          ) : (
            <span style={{ color: "#92400e" }}>暂无可用录入链接 / No active intake link</span>
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
            SOP给客服看 / SOP for CS
          </Link>
          <Link scroll={false} href="/admin/tickets/archived">
            {t(lang, "Archived Tickets", "已归档工单")}
          </Link>
        </div>
        <form action={createIntakeTokenAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input name="label" placeholder="标签 / Label" />
          <label>
            失效日 / Expire Date:
            <input name="expiresAt" type="date" />
          </label>
          <button type="submit">新建录入链接 / Create Link</button>
        </form>
        <div className="table-scroll">
          <table cellPadding={6} style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#eef2ff" }}>
                <th align="left">Label</th>
                <th align="left">Token</th>
                <th align="left">Status</th>
                <th align="left">Expire</th>
                <th align="left">Action</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((tk) => {
                const expired = !!tk.expiresAt && tk.expiresAt.getTime() <= Date.now();
                return (
                  <tr key={tk.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td>{tk.label ?? "-"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{tk.token}</td>
                    <td>{tk.isActive && !expired ? "Active / 可用" : "Inactive / 不可用"}</td>
                    <td>{tk.expiresAt ? tk.expiresAt.toLocaleString() : "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {tk.isActive ? (
                          <form action={disableTokenAction}>
                            <input type="hidden" name="id" value={tk.id} />
                            <button type="submit">停用 / Disable</button>
                          </form>
                        ) : null}
                        <form action={deleteTokenAction}>
                          <input type="hidden" name="id" value={tk.id} />
                          <button type="submit">删除 / Delete</button>
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
        <Link scroll={false} href="/admin/tickets?focus=mgmt">Mgmt Focus / 管理介入</Link>
      </form>

      <div className="table-scroll">
        <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180, tableLayout: "fixed" }}>
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
            <col style={{ width: "150px" }} />
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
              <th align="left">{t(lang, "Details", "详情")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const situation = situationLines(r.summary, r.nextAction, r.nextActionDue);
              return (
              <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0", verticalAlign: "top" }}>
                <td>{r.ticketNo}</td>
                <td>
                  <div>{r.studentName}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{r.createdAt.toLocaleString()}</div>
                </td>
                <td>{r.source}</td>
                <td>{normalizeTicketTypeValue(r.type)}</td>
                <td>{normalizeTicketPriorityValue(r.priority)}</td>
                <td>
                  <div>{r.status}</div>
                  {r.completedAt ? (
                    <div style={{ fontSize: 12, color: "#166534" }}>
                      {t(lang, "Done At", "完成时间")}: {r.completedAt.toLocaleString()}
                    </div>
                  ) : null}
                </td>
                <td>{r.owner ?? "-"}</td>
                <td>{r.slaDue ? r.slaDue.toLocaleString() : "-"}</td>
                <td style={{ whiteSpace: "normal", lineHeight: 1.35 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div><b>当前问题</b>: <span style={{ whiteSpace: "pre-wrap" }}>{situation.currentIssue}</span></div>
                    <div><b>需要怎么做</b>: <span style={{ whiteSpace: "pre-wrap" }}>{situation.requiredAction}</span></div>
                    <div><b>最晚截止</b>: {situation.latestDeadline}</div>
                  </div>
                </td>
                <td>
                  {proofItems(r.proof).length === 0 ? (
                    "-"
                  ) : (
                    <div>{proofItems(r.proof).length} 份 / files</div>
                  )}
                </td>
                <td>
                  <details>
                    <summary style={{ cursor: "pointer" }}>查看详情 / Details</summary>
                    <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12, color: "#334155" }}>
                      {(() => {
                        const parsed = parseTicketSituationSummary(r.summary);
                        return (
                          <>
                            <div><b>学生姓名</b>: {asText(r.studentName)}</div>
                            <div><b>来源</b>: {asText(r.source)}</div>
                            <div><b>工单类型</b>: {asText(normalizeTicketTypeValue(r.type))}</div>
                            <div><b>优先级</b>: {asText(normalizeTicketPriorityValue(r.priority))}</div>
                            <div><b>状态</b>: {asText(r.status)}</div>
                            <div><b>负责人</b>: {asText(r.owner)}</div>
                            <div><b>年级</b>: {asText(r.grade)}</div>
                            <div><b>课程</b>: {asText(r.course)}</div>
                            <div><b>老师</b>: {asText(r.teacher)}</div>
                            <div><b>对接人</b>: {asText(r.poc)}</div>
                            <div><b>当前微信群名称</b>: {asText(r.wechat)}</div>
                            <div><b>时长(分钟)</b>: {r.durationMin ?? "-"}</div>
                            <div><b>授课形式</b>: {asText(r.mode)}</div>
                            <div><b>版本</b>: {asText(r.version)}</div>
                            <div><b>系统已更新</b>: {asText(r.systemUpdated)}</div>
                            <div><b>SLA截止</b>: {r.slaDue ? r.slaDue.toLocaleString() : "-"}</div>
                            <div><b>录入人</b>: {asText(r.createdByName)}</div>
                            <div><b>地址或链接</b>: <span style={{ whiteSpace: "pre-wrap" }}>{asText(r.addressOrLink)}</span></div>
                            <div><b>S – Situation / 当前问题</b>: <span style={{ whiteSpace: "pre-wrap" }}>{asText(parsed.currentIssue)}</span></div>
                            <div><b>S – Situation / 需要怎么做</b>: <span style={{ whiteSpace: "pre-wrap" }}>{asText(parsed.requiredAction || r.nextAction)}</span></div>
                            <div><b>S – Situation / 最晚截止时间</b>: {parsed.latestDeadlineText || (r.nextActionDue ? r.nextActionDue.toLocaleString() : "-")}</div>
                          </>
                        );
                      })()}
                      <div>
                        <b>全部证据</b>:{" "}
                        {proofItemsAll(r.proof).length === 0 ? (
                          "-"
                        ) : (
                          <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                            {proofItemsAll(r.proof).map((item, idx) => {
                              const href = normalizeProofUrl(item);
                              const isLink = href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
                              if (!isLink) return <span key={`${r.id}-proof-all-${idx}`}>{item}</span>;
                              const imageLike = /\.(png|jpe?g|webp|gif)$/i.test(href);
                              return (
                                <a key={`${r.id}-proof-all-${idx}`} href={href} target="_blank" rel="noreferrer">
                                  {imageLike ? `Image ${idx + 1}` : `File ${idx + 1}`}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </td>
                <td>
                  {r.status === "Completed" ? (
                    <div style={{ display: "grid", gap: 6, maxWidth: 210 }}>
                      <div style={{ color: "#166534", fontWeight: 700 }}>
                        已完成（锁定）/ Completed (Locked)
                      </div>
                      <form action={archiveTicketAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="back" value={backHref} />
                        <button type="submit">归档 / Archive</button>
                      </form>
                    </div>
                  ) : (
                    <form action={updateStatusAction} style={{ display: "grid", gap: 6, maxWidth: 210 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <select name="nextStatus" defaultValue={r.status} style={{ width: "100%", boxSizing: "border-box" }}>
                        {TICKET_STATUS_OPTIONS.filter((o) => canTransitionTicketStatus(r.status, o.value)).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.zh} / {o.en}
                          </option>
                        ))}
                      </select>
                      <input
                        name="completionNote"
                        placeholder="完成说明(仅完成时必填) / Completion note"
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

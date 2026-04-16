import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
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
import { formatSchedulingCoordinationSystemText } from "@/lib/scheduling-coordination";
import TicketStatusSubmitButton from "@/app/admin/_components/TicketStatusSubmitButton";
import WorkbenchActionBanner from "../_components/WorkbenchActionBanner";
import WorkbenchScrollMemoryClient from "../_components/WorkbenchScrollMemoryClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
  workbenchStickyPanelStyle,
} from "../_components/workbenchStyles";

function ticketSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

function trimValue(formData: FormData, key: string, max = 400) {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, max) : "";
}

function validateByOptions(value: string | null, options: { value: string }[]) {
  if (!value) return null;
  return options.some((o) => o.value === value) ? value : null;
}

function appendQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, "https://local.invalid");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
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
    currentIssue: formatSchedulingCoordinationSystemText(parsed.currentIssue || "-"),
    requiredAction: formatSchedulingCoordinationSystemText(parsed.requiredAction || nextAction || "-"),
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

async function deleteTicketAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = trimValue(formData, "back", 500) || "/admin/tickets";
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
  redirect("/admin/tickets?tok=1#intake-link-management");
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
  redirect("/admin/tickets?tok=1#intake-link-management");
}

async function deleteTokenAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  if (!id) redirect("/admin/tickets");
  await prisma.ticketIntakeToken.delete({ where: { id } });
  revalidatePath("/admin/tickets");
  redirect("/admin/tickets?tok=1#intake-link-management");
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; owner?: string; type?: string; err?: string; tok?: string; focus?: string; ok?: string; fields?: string }>;
}) {
  const adminUser = await requireAdmin();
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
  const canHardDeleteTickets = isStrictSuperAdmin(adminUser);

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
  const overdueTicketCount = overdueGroups.reduce((sum, group) => sum + group.count, 0);
  const activeTicketCount = rows.filter((row) => !["Completed", "Cancelled"].includes(row.status)).length;
  const ticketErrorMessage =
    err === "status-flow" ? t(lang, "Invalid status transition.", "状态流转不允许。")
    : err === "need-note" ? t(lang, "Completion note is required when marking completed.", "标记完成时必须填写完成说明。")
    : err === "completed-locked" ? t(lang, "Completed ticket is locked. Use archive instead.", "已完成工单不可修改，请改用归档。")
    : err === "archived-locked" ? t(lang, "Archived ticket is locked.", "已归档工单不可修改。")
    : err === "need-closed-archive" ? t(lang, "Only completed or cancelled tickets can be archived.", "仅已完成或已取消工单可归档。")
    : err === "edit-required" ? t(lang, "Could not save edits. Student, source, type, priority, and owner are required.", "保存编辑失败：学生、来源、类型、优先级和负责人为必填项。")
    : err === "edit-package-required" ? t(lang, "Could not save edits. Grade and course are required for new-student package purchases.", "保存编辑失败：新学生购买课时包时必须填写年级和课程。")
    : err === "edit-type-required"
      ? t(
          lang,
          `Could not save edits. Required fields are missing for this ticket type${fields ? `: ${decodeURIComponent(fields)}` : ""}.`,
          `保存编辑失败：该工单类型缺少必填字段${fields ? `：${decodeURIComponent(fields)}` : "。"}`
        )
    : err === "edit-situation" ? t(lang, "Could not save edits. All situation fields are required.", "保存编辑失败：情况说明相关字段必须全部填写。")
    : err === "delete-forbidden" ? t(lang, "Only Zhao Hongwei can permanently delete tickets.", "只有 Zhao Hongwei 可以永久删除工单。")
    : err === "need-closed-delete" ? t(lang, "Only completed, cancelled, or archived tickets can be permanently deleted.", "只有已完成、已取消或已归档工单可以永久删除。")
    : "";

  return (
    <div>
      <WorkbenchScrollMemoryClient storageKey="adminTicketsScroll" />
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>{t(lang, "Operations ticket desk", "运营工单工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Ticket Center", "工单中心")}</h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Start here for open work, overdue follow-up, and intake links. Use the work map below to jump directly to the next section instead of rescanning the whole page.",
              "这里集中处理待办工单、超时催办和录入链接。先看摘要，再通过下方工作地图直接跳到下一步，不用每次从头扫整页。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Visible tickets", "当前列表")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{rows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fff7ed" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Still open", "未结束")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{activeTicketCount}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle(overdueTicketCount > 0 ? "rose" : "emerald"), background: overdueTicketCount > 0 ? "#fff7f7" : "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle(overdueTicketCount > 0 ? "rose" : "emerald")}>{t(lang, "Overdue follow-up", "超时催办")}</div>
            <div style={workbenchMetricValueStyle(overdueTicketCount > 0 ? "rose" : "emerald")}>{overdueTicketCount}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Intake link", "录入链接")}</div>
            <div style={{ ...workbenchMetricValueStyle(activeToken ? "slate" : "amber"), fontSize: 18 }}>
              {activeToken ? t(lang, "Active", "可用") : t(lang, "None", "暂无")}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          ...workbenchStickyPanelStyle(5, 8),
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Ticket work map", "工单工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {focus === "mgmt"
              ? t(lang, "Management focus is on, so overdue and exception work should be cleared first.", "当前已切到管理介入视图，建议先处理超时和异常。")
              : t(lang, "Clear overdue items first, then update intake links or move to the filtered list.", "建议先清超时催办，再维护录入链接或进入筛选列表。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#ticket-overdue-follow-up" style={ticketSectionLinkStyle("#fff1f2", "#fecaca")}>
            <strong>{t(lang, "Overdue queue", "超时催办")}</strong>
            <span style={{ fontSize: 12, color: "#7f1d1d" }}>{overdueTicketCount > 0 ? t(lang, "Escalate stalled tickets first", "先催办卡住的工单") : t(lang, "No urgent follow-up right now", "当前没有急催办")}</span>
          </a>
          <a href="#intake-link-management" style={ticketSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Intake links", "录入链接")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{activeToken ? t(lang, "Keep the current intake owner link healthy", "维护当前录入链接可用性") : t(lang, "Create a new active intake link", "补一个新的可用录入链接")}</span>
          </a>
          <a href="#ticket-filters" style={ticketSectionLinkStyle("#eff6ff", "#93c5fd")}>
            <strong>{t(lang, "Filters", "筛选条件")}</strong>
            <span style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Jump to search, owner, status, and focus shortcuts", "快速定位搜索、负责人、状态和管理介入筛选")}</span>
          </a>
          <a href="#ticket-list" style={ticketSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Ticket list", "工单列表")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Work one ticket at a time without rescanning the page", "一条条处理，不用反复从顶部找入口")}</span>
          </a>
        </div>
      </section>
      {ticketErrorMessage ? (
        <WorkbenchActionBanner
          tone="error"
          title={t(lang, "Action blocked", "操作未完成")}
          description={ticketErrorMessage}
          actions={[{ href: backHref || "/admin/tickets", label: t(lang, "Back to current list", "返回当前列表") }]}
        />
      ) : null}
      {ok === "edited" ? (
        <WorkbenchActionBanner
          tone="success"
          title={t(lang, "Ticket updated.", "工单已更新。")}
          description={t(lang, "You can continue in the current filtered list without searching for the row again.", "你可以直接回到当前筛选列表继续处理，不用重新搜索。")}
          actions={[{ href: backHref || "/admin/tickets", label: t(lang, "Back to current list", "返回当前列表") }]}
        />
      ) : null}
      {tokenSaved ? (
        <WorkbenchActionBanner
          tone="success"
          title={t(lang, "Intake link updated.", "录入链接已更新。")}
          description={t(lang, "The intake link section below already reflects the latest active token state.", "下方录入链接区已经显示最新的可用状态。")}
          actions={[{ href: "#intake-link-management", label: t(lang, "Jump to intake links", "跳到录入链接"), emphasis: "primary" }]}
        />
      ) : null}
      {ok === "deleted" ? (
        <WorkbenchActionBanner
          tone="success"
          title={t(lang, "Ticket deleted permanently.", "工单已永久删除。")}
          description={t(lang, "You are back in the filtered worklist, so you can continue with the next ticket immediately.", "现在已经回到筛选后的工作列表，可以直接继续处理下一张工单。")}
          actions={[{ href: backHref || "/admin/tickets", label: t(lang, "Continue in list", "继续看列表"), emphasis: "primary" }]}
        />
      ) : null}
      {focus === "mgmt" ? (
        <WorkbenchActionBanner
          tone="warn"
          title={t(lang, "Management focus is active", "当前已开启管理介入视图")}
          description={t(lang, "This view narrows the desk to exception, urgent, and overdue unfinished tickets.", "这个视图会把工作台收窄到异常、紧急和逾期未完成工单。")}
          actions={[{ href: "/admin/tickets", label: t(lang, "Back to all tickets", "回到全部工单") }]}
        />
      ) : null}
      <div id="ticket-overdue-follow-up" style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 10, padding: 10, marginBottom: 12 }}>
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

      <div id="intake-link-management" style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 12, background: "#f8fafc" }}>
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

      <form id="ticket-filters" method="GET" className="ts-filter-bar" style={{ ...workbenchFilterPanelStyle, marginBottom: 12 }}>
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

      <div id="ticket-list" className="table-scroll">
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
              <tr id={`ticket-row-${r.id}`} key={r.id} style={{ borderTop: "1px solid #e2e8f0", verticalAlign: "top" }}>
                <td>
                  <Link scroll={false} href={`/admin/tickets/${r.id}?back=${encodeURIComponent(`${backHref}#ticket-row-${r.id}`)}`}>
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
                        <input type="hidden" name="back" value={`${backHref}#ticket-list`} />
                        <button type="submit">{t(lang, "Archive", "归档")}</button>
                      </form>
                      {canHardDeleteTickets ? (
                        <form action={deleteTicketAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="back" value={`${backHref}#ticket-list`} />
                          <button type="submit" style={{ background: "#7f1d1d", color: "#fff", borderColor: "#7f1d1d" }}>
                            {t(lang, "Delete permanently", "永久删除")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : (
                    <form action={updateStatusAction} style={{ display: "grid", gap: 6, maxWidth: 210 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={`${backHref}#ticket-row-${r.id}`} />
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
                      <TicketStatusSubmitButton
                        label={t(lang, "Save", "保存")}
                        promptLabel={t(lang, "Please add a completion note before marking this ticket completed.", "标记完成前请先填写完成说明。")}
                        missingNoteAlert={t(lang, "Completion note is required. Nothing was submitted.", "完成说明不能为空，本次未提交。")}
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
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

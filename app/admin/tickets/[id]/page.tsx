import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketTeacherId } from "@/lib/ticket-teacher";
import {
  canTransitionTicketStatus,
  composeTicketSituation,
  getTicketFieldLabel,
  getTicketTypeTemplate,
  normalizeTicketInt,
  normalizeTicketPriorityValue,
  normalizeTicketTypeValue,
  normalizeTicketString,
  parseDateLike,
  parseTicketSituationSummary,
  TICKET_MODE_OPTIONS,
  TICKET_OWNER_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_SOURCE_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_SYSTEM_UPDATED_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TICKET_VERSION_OPTIONS,
  validateTicketTypeRequirements,
} from "@/lib/tickets";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { existsSync } from "fs";
import path from "path";
import { formatBusinessDateTime } from "@/lib/date-only";

function trimValue(formData: FormData, key: string, max = 400) {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, max) : "";
}

function validateByOptions(value: string | null, options: { value: string }[]) {
  if (!value) return null;
  return options.some((o) => o.value === value) ? value : null;
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
  const abs = path.join(process.cwd(), "public", "uploads", "tickets", filename);
  return !existsSync(abs);
}

function asText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s || "-";
}

function toDateTimeLocalValue(v: Date | null | undefined) {
  if (!v) return "";
  const y = v.getFullYear();
  const m = String(v.getMonth() + 1).padStart(2, "0");
  const d = String(v.getDate()).padStart(2, "0");
  const hh = String(v.getHours()).padStart(2, "0");
  const mm = String(v.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function sanitizeAdminBack(raw: string | null | undefined, fallback: string) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/admin/tickets")) return fallback;
  return value.slice(0, 1000);
}

function appendQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, "https://local.invalid");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}`;
}

function isTicketOverdue(ticket: { nextActionDue: Date | null; status: string }) {
  if (!ticket.nextActionDue) return false;
  if (ticket.status === "Completed" || ticket.status === "Cancelled") return false;
  return ticket.nextActionDue.getTime() < Date.now();
}

function flowState(status: string, node: string) {
  const ordering: Record<string, number> = {
    "Need Info": 1,
    Confirmed: 3,
    Completed: 4,
  };
  if (status === node) return "active";
  if (node === "Need Info" && status !== "Need Info") return "done";
  if (node === "Confirmed" && status === "Completed") return "done";
  if (node === "Completed" && status === "Completed") return "active";
  if (ordering[node] && ordering[status] && ordering[status] > ordering[node]) return "done";
  return "idle";
}

function flowCardStyle(state: string, pulsing: boolean) {
  if (state === "active") {
    return {
      border: "1px solid #f97316",
      background: "#fff7ed",
      color: "#9a3412",
      boxShadow: "0 0 0 2px rgba(249,115,22,0.12)",
      animation: pulsing ? "ticketFlowPulse 1.35s ease-in-out infinite" : undefined,
    } as const;
  }
  if (state === "done") {
    return {
      border: "1px solid #86efac",
      background: "#f0fdf4",
      color: "#166534",
    } as const;
  }
  return {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#475569",
  } as const;
}

async function updateStatusAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
  const nextStatus = trimValue(formData, "nextStatus", 60);
  const completionNote = trimValue(formData, "completionNote", 1000);
  if (!id || !nextStatus) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, summary: true, isArchived: true },
  });
  if (!row) redirect(back);
  if (row.isArchived) redirect(appendQuery(back, { err: "archived-locked" }));
  if (row.status === "Completed") redirect(appendQuery(back, { err: "completed-locked" }));
  if (!canTransitionTicketStatus(row.status, nextStatus)) {
    redirect(appendQuery(back, { err: "status-flow" }));
  }
  if (nextStatus === "Completed" && !completionNote) {
    redirect(appendQuery(back, { err: "need-note" }));
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
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/teacher/tickets");
  redirect(appendQuery(back, { ok: "status" }));
}

async function updateTicketFieldsAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
  if (!id) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, isArchived: true },
  });
  if (!row) redirect(back);
  if (row.isArchived) redirect(appendQuery(back, { err: "archived-locked" }));
  if (row.status === "Completed") redirect(appendQuery(back, { err: "completed-locked" }));

  const studentName = normalizeTicketString(formData.get("studentName"), 120);
  const source = validateByOptions(normalizeTicketString(formData.get("source"), 60), TICKET_SOURCE_OPTIONS);
  const type = validateByOptions(normalizeTicketString(formData.get("type"), 60), TICKET_TYPE_OPTIONS);
  const priority = validateByOptions(normalizeTicketString(formData.get("priority"), 60), TICKET_PRIORITY_OPTIONS);
  const owner = validateByOptions(normalizeTicketString(formData.get("owner"), 20), TICKET_OWNER_OPTIONS);
  if (!studentName || !source || !type || !priority || !owner) {
    redirect(appendQuery(back, { err: "edit-required" }));
  }

  const grade = normalizeTicketString(formData.get("grade"), 40);
  const course = normalizeTicketString(formData.get("course"), 120);
  const teacher = normalizeTicketString(formData.get("teacher"), 120);
  const teacherIdInput = normalizeTicketString(formData.get("teacherId"), 80);
  if (!teacher) {
    redirect(appendQuery(back, { err: "edit-teacher-required" }));
  }
  const durationMin = normalizeTicketInt(formData.get("durationMin"));
  const mode = validateByOptions(normalizeTicketString(formData.get("mode"), 40), TICKET_MODE_OPTIONS);
  const wechat = normalizeTicketString(formData.get("wechat"), 120);
  const requirementCheck = validateTicketTypeRequirements({
    type,
    grade,
    course,
    teacher,
    durationMin,
    mode,
    wechat,
  });
  if (requirementCheck.missingLabels.length > 0) {
    redirect(
      appendQuery(back, {
        err: "edit-type-required",
        fields: requirementCheck.missingLabels.join("、"),
      })
    );
  }

  const situationCurrent = normalizeTicketString(formData.get("situationCurrent"), 2000);
  const situationAction = normalizeTicketString(formData.get("situationAction"), 2000);
  const situationDeadlineRaw = normalizeTicketString(formData.get("situationDeadline"), 40);
  const situationDeadline = parseDateLike(formData.get("situationDeadline"));
  if (!situationCurrent || !situationAction || !situationDeadlineRaw || !situationDeadline) {
    redirect(appendQuery(back, { err: "edit-situation" }));
  }
  const teacherId = await resolveTicketTeacherId({
    teacherName: teacher,
    teacherId: teacherIdInput,
  });

  await prisma.ticket.update({
    where: { id },
    data: {
      studentName,
      source,
      type,
      priority,
      owner,
      grade,
      course,
      teacher,
      poc: normalizeTicketString(formData.get("poc"), 120),
      wechat,
      durationMin,
      mode,
      version: validateByOptions(normalizeTicketString(formData.get("version"), 10), TICKET_VERSION_OPTIONS),
      systemUpdated: validateByOptions(normalizeTicketString(formData.get("systemUpdated"), 5), TICKET_SYSTEM_UPDATED_OPTIONS),
      slaDue: parseDateLike(formData.get("slaDue")),
      createdByName: normalizeTicketString(formData.get("createdByName"), 120),
      addressOrLink: normalizeTicketString(formData.get("addressOrLink"), 500),
      summary: composeTicketSituation({
        currentIssue: situationCurrent,
        requiredAction: situationAction,
        latestDeadlineText: situationDeadlineRaw,
      }),
      nextAction: situationAction,
      nextActionDue: situationDeadline,
    },
  });
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/teacher/tickets");
  redirect(appendQuery(back, { ok: "edited" }));
}

async function archiveTicketAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
  if (!id) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, isArchived: true },
  });
  if (!row) redirect(back);
  if (row.isArchived) redirect(back);
  if (!["Completed", "Cancelled"].includes(row.status)) {
    redirect(appendQuery(back, { err: "need-closed-archive" }));
  }

  await prisma.ticket.update({
    where: { id },
    data: { isArchived: true },
  });
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/teacher/tickets");
  redirect(appendQuery(back, { ok: "archived" }));
}

export default async function AdminTicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string; err?: string; ok?: string; fields?: string }>;
}) {
  await requireAdmin();
  const route = await params;
  const sp = await searchParams;
  const id = String(route.id ?? "").trim();
  const listBack = sanitizeAdminBack(sp?.back, "/admin/tickets");
  const selfHref =
    listBack === "/admin/tickets"
      ? `/admin/tickets/${id}`
      : appendQuery(`/admin/tickets/${id}`, { back: listBack });
  const err = String(sp?.err ?? "").trim();
  const ok = String(sp?.ok ?? "").trim();
  const fields = String(sp?.fields ?? "").trim();

  const row = await prisma.ticket.findUnique({
    where: { id },
  });
  if (!row) notFound();

  const parsed = parseTicketSituationSummary(row.summary);
  const template = getTicketTypeTemplate(row.type);
  const typeFieldHint = template.requiredFields.length
    ? `本类型必填：${template.requiredFields.map(getTicketFieldLabel).join("、")}`
    : "本类型无额外必填字段";
  const overdue = isTicketOverdue(row);
  const flowNodes = [
    { key: "Need Info", label: "待补信息", caption: "Need Info" },
    { key: "Waiting Teacher", label: "等老师", caption: "Waiting Teacher" },
    { key: "Waiting Parent", label: "等家长/合作方", caption: "Waiting Parent" },
    { key: "Confirmed", label: "已确认", caption: "Confirmed" },
    { key: "Completed", label: "已完成", caption: "Completed" },
  ];
  const sideNodes = [
    { key: "Exception", label: "异常升级", caption: "Exception" },
    { key: "Cancelled", label: "已取消", caption: "Cancelled" },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style>{`
        @keyframes ticketFlowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.20); }
          50% { box-shadow: 0 0 0 6px rgba(249,115,22,0.12); }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>后台工单详情 / Ticket Detail</div>
          <h2 style={{ margin: 0 }}>{row.ticketNo}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link scroll={false} href={listBack} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
            返回工单中心 / Back
          </Link>
          {!row.isArchived ? (
            <Link scroll={false} href="/admin/tickets/archived" style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
              已归档工单 / Archived
            </Link>
          ) : null}
        </div>
      </div>

      {err ? (
        <div style={{ color: "#b91c1c", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: 10 }}>
          {err === "status-flow" && "状态流转不允许 / Invalid status transition"}
          {err === "need-note" && "完成时必须填写完成说明 / Completion note is required when marking completed"}
          {err === "completed-locked" && "已完成工单不可修改，请使用归档 / Completed ticket is locked. Use archive."}
          {err === "archived-locked" && "已归档工单不可修改 / Archived ticket is locked."}
          {err === "need-closed-archive" && "仅已完成或已取消工单可归档 / Only completed or cancelled tickets can be archived."}
          {err === "edit-required" && "编辑保存失败：学生、来源、类型、优先级、负责人必填 / Required fields missing."}
          {err === "edit-teacher-required" && "编辑保存失败：老师必填 / Teacher is required."}
          {err === "edit-type-required" &&
            `编辑保存失败：该工单类型缺少必填字段 / Missing required fields for this ticket type${fields ? `: ${fields}` : ""}`}
          {err === "edit-situation" && "编辑保存失败：Situation 三项必填 / Situation fields are required."}
        </div>
      ) : null}
      {ok === "edited" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          工单已更新 / Ticket updated
        </div>
      ) : null}
      {ok === "status" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          工单状态已更新 / Ticket status updated
        </div>
      ) : null}
      {ok === "archived" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          工单已归档 / Ticket archived
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>学生 / Student</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{row.studentName}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>负责人 / Owner</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{asText(row.owner)}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>当前状态 / Status</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{row.status}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: overdue ? "#fff1f2" : "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>下一步截止 / Due</div>
          <div style={{ fontWeight: 700, marginTop: 4, color: overdue ? "#b91c1c" : "#0f172a" }}>
            {row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "-"}
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>流程图 / Workflow</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            基于当前状态显示，不含历史流转记录。/ Shows current stage only, not full history.
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            {flowNodes.map((node) => {
              const state = flowState(row.status, node.key);
              return (
                <div
                  key={node.key}
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 88,
                    display: "grid",
                    alignContent: "space-between",
                    ...flowCardStyle(state, overdue && row.status === node.key),
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{node.caption}</div>
                  <div style={{ fontWeight: 700 }}>{node.label}</div>
                  <div style={{ fontSize: 12 }}>
                    {row.status === node.key ? (overdue ? "当前卡在此步，且已超时" : "当前正在此步") : state === "done" ? "主流程已越过此步" : "等待进入"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            {sideNodes.map((node) => {
              const active = row.status === node.key;
              return (
                <div
                  key={node.key}
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 76,
                    border: active ? "1px solid #dc2626" : "1px dashed #cbd5e1",
                    background: active ? "#fef2f2" : "#f8fafc",
                    color: active ? "#991b1b" : "#475569",
                    animation: active && overdue ? "ticketFlowPulse 1.35s ease-in-out infinite" : undefined,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{node.caption}</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>{node.label}</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    {active ? "当前在此分支" : "特殊分支，按需进入"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderRadius: 10, padding: 10, background: overdue ? "#fff7ed" : "#f8fafc", border: overdue ? "1px solid #fdba74" : "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>当前处理提示 / Current Guidance</div>
            <div style={{ color: overdue ? "#9a3412" : "#334155" }}>
              {overdue
                ? `当前工单已超时，优先处理下一步：${asText(row.nextAction)}`
                : `当前下一步：${asText(row.nextAction)}`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff", display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>详细信息 / Details</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", fontSize: 14 }}>
            <div><b>来源</b>: {asText(row.source)}</div>
            <div><b>工单类型</b>: {asText(normalizeTicketTypeValue(row.type))}</div>
            <div><b>优先级</b>: {asText(normalizeTicketPriorityValue(row.priority))}</div>
            <div><b>年级</b>: {asText(row.grade)}</div>
            <div><b>课程</b>: {asText(row.course)}</div>
            <div><b>老师</b>: {asText(row.teacher)}</div>
            <div><b>对接人</b>: {asText(row.poc)}</div>
            <div><b>微信群</b>: {asText(row.wechat)}</div>
            <div><b>时长(分钟)</b>: {row.durationMin ?? "-"}</div>
            <div><b>授课形式</b>: {asText(row.mode)}</div>
            <div><b>版本</b>: {asText(row.version)}</div>
            <div><b>系统已更新</b>: {asText(row.systemUpdated)}</div>
            <div><b>SLA截止</b>: {row.slaDue ? formatBusinessDateTime(row.slaDue) : "-"}</div>
            <div><b>录入人</b>: {asText(row.createdByName)}</div>
            <div><b>创建时间</b>: {formatBusinessDateTime(row.createdAt)}</div>
            <div><b>更新时间</b>: {formatBusinessDateTime(row.updatedAt)}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Situation</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div><b>当前问题</b>: <span style={{ whiteSpace: "pre-wrap" }}>{asText(parsed.currentIssue)}</span></div>
              <div><b>需要怎么做</b>: <span style={{ whiteSpace: "pre-wrap" }}>{asText(parsed.requiredAction || row.nextAction)}</span></div>
              <div><b>最晚截止时间</b>: {parsed.latestDeadlineText || (row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "-")}</div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>地址或链接 / Address or Link</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>{asText(row.addressOrLink)}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>证据 / Proof</div>
            {proofItemsAll(row.proof).length === 0 ? (
              <div style={{ color: "#64748b" }}>-</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {proofItemsAll(row.proof).map((item, idx) => {
                  const href = normalizeProofUrl(item);
                  const isLink = href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
                  const missing = isTicketProofMissing(item);
                  if (!isLink) {
                    return (
                      <span key={`${row.id}-proof-${idx}`} style={{ color: missing ? "#b91c1c" : undefined }}>
                        {item}
                        {missing ? "（文件缺失，请补传）" : ""}
                      </span>
                    );
                  }
                  const imageLike = /\.(png|jpe?g|webp|gif)$/i.test(href);
                  return (
                    <div key={`${row.id}-proof-${idx}`} style={{ display: "grid", gap: 2 }}>
                      <a href={href} target="_blank" rel="noreferrer" style={{ color: missing ? "#b91c1c" : undefined }}>
                        {imageLike ? `图片 ${idx + 1} / Image ${idx + 1}` : `文件 ${idx + 1} / File ${idx + 1}`}
                      </a>
                      {missing ? <span style={{ color: "#b91c1c", fontSize: 12 }}>文件缺失，请补传 / Missing file, re-upload required</span> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>状态操作 / Status Action</div>
            {row.isArchived ? (
              <div style={{ color: "#334155" }}>当前工单已归档，只读查看。/ This ticket is archived and now read-only.</div>
            ) : row.status === "Completed" || row.status === "Cancelled" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: row.status === "Cancelled" ? "#b45309" : "#166534", fontWeight: 700 }}>
                  {row.status === "Cancelled"
                    ? "已取消（可归档）/ Cancelled (Archivable)"
                    : "已完成（锁定，可归档）/ Completed (Locked, Archivable)"}
                </div>
                <form action={archiveTicketAction} style={{ display: "grid", gap: 8 }}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="back" value={selfHref} />
                  <button type="submit">归档 / Archive</button>
                </form>
              </div>
            ) : (
              <form action={updateStatusAction} style={{ display: "grid", gap: 8 }}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="back" value={selfHref} />
                <label>
                  下一状态 / Next Status
                  <select name="nextStatus" defaultValue={row.status} style={{ width: "100%", boxSizing: "border-box" }}>
                    {TICKET_STATUS_OPTIONS.filter((o) => canTransitionTicketStatus(row.status, o.value)).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.zh} / {o.en}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  完成说明（仅完成时必填）/ Completion note
                  <textarea name="completionNote" rows={3} style={{ width: "100%", boxSizing: "border-box" }} />
                </label>
                <button type="submit">保存状态 / Save Status</button>
              </form>
            )}
          </div>

          {!row.isArchived && row.status !== "Completed" ? (
            <form action={updateTicketFieldsAction} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff", display: "grid", gap: 10 }}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="back" value={selfHref} />
              <div style={{ fontWeight: 700 }}>编辑工单 / Edit Ticket</div>
              <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 10, padding: 10, fontSize: 12, color: "#334155" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{template.title}</div>
                <div>{typeFieldHint}</div>
                <div style={{ marginTop: 4 }}>录入提示：{template.checklist.join("；")}</div>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                <label>
                  学生姓名*
                  <input name="studentName" defaultValue={row.studentName} style={{ width: "100%", boxSizing: "border-box" }} />
                </label>
                <label>
                  来源*
                  <select name="source" defaultValue={row.source} style={{ width: "100%", boxSizing: "border-box" }}>
                    {TICKET_SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  工单类型*
                  <select name="type" defaultValue={row.type} style={{ width: "100%", boxSizing: "border-box" }}>
                    {TICKET_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  优先级*
                  <select name="priority" defaultValue={row.priority} style={{ width: "100%", boxSizing: "border-box" }}>
                    {TICKET_PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  负责人*
                  <select name="owner" defaultValue={row.owner ?? ""} style={{ width: "100%", boxSizing: "border-box" }}>
                    <option value="">请选择 / Select</option>
                    {TICKET_OWNER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  年级{template.requiredFields.includes("grade") ? "*" : ""}
                  <input
                    name="grade"
                    required={template.requiredFields.includes("grade")}
                    defaultValue={row.grade ?? ""}
                    placeholder={template.requiredFields.includes("grade") || template.suggestedFields.includes("grade") ? "如：P3 / G6" : ""}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <label>
                  课程{template.requiredFields.includes("course") ? "*" : ""}
                  <input
                    name="course"
                    required={template.requiredFields.includes("course")}
                    defaultValue={row.course ?? ""}
                    placeholder={template.requiredFields.includes("course") || template.suggestedFields.includes("course") ? "如：英语口语 / Math" : ""}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <label>
                  老师*
                  <input
                    name="teacher"
                    required
                    defaultValue={row.teacher ?? ""}
                    placeholder="填写当前老师或目标老师"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <label>
                  对接人
                  <input name="poc" defaultValue={row.poc ?? ""} style={{ width: "100%", boxSizing: "border-box" }} />
                </label>
                <label>
                  当前微信群名称{template.requiredFields.includes("wechat") ? "*" : ""}
                  <input
                    name="wechat"
                    required={template.requiredFields.includes("wechat")}
                    defaultValue={row.wechat ?? ""}
                    placeholder={template.requiredFields.includes("wechat") || template.suggestedFields.includes("wechat") ? "如：欧阳梓恩家长群" : ""}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <label>
                  时长{template.requiredFields.includes("durationMin") ? "*" : ""}(分钟)
                  <input
                    name="durationMin"
                    type="number"
                    min={1}
                    required={template.requiredFields.includes("durationMin")}
                    defaultValue={row.durationMin ?? ""}
                    placeholder={template.requiredFields.includes("durationMin") || template.suggestedFields.includes("durationMin") ? "如：60 / 120" : ""}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <label>
                  授课形式{template.requiredFields.includes("mode") ? "*" : ""}
                  <select name="mode" required={template.requiredFields.includes("mode")} defaultValue={row.mode ?? ""} style={{ width: "100%", boxSizing: "border-box" }}>
                    <option value="">可选 / Optional</option>
                    {TICKET_MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  版本
                  <select name="version" defaultValue={row.version ?? ""} style={{ width: "100%", boxSizing: "border-box" }}>
                    <option value="">可选 / Optional</option>
                    {TICKET_VERSION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  系统已更新
                  <select name="systemUpdated" defaultValue={row.systemUpdated ?? ""} style={{ width: "100%", boxSizing: "border-box" }}>
                    <option value="">可选 / Optional</option>
                    {TICKET_SYSTEM_UPDATED_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.zh} / {o.en}</option>
                    ))}
                  </select>
                </label>
                <label>
                  SLA截止
                  <DateTimeSplitInput name="slaDue" defaultValue={toDateTimeLocalValue(row.slaDue)} wrapperStyle={{ width: "100%" }} />
                </label>
                <label>
                  录入人
                  <input name="createdByName" defaultValue={row.createdByName ?? ""} style={{ width: "100%", boxSizing: "border-box" }} />
                </label>
              </div>

              <label>
                地址或链接
                <textarea name="addressOrLink" rows={2} defaultValue={row.addressOrLink ?? ""} style={{ width: "100%", boxSizing: "border-box" }} />
              </label>
              <label>
                当前问题*
                <textarea
                  name="situationCurrent"
                  rows={4}
                  defaultValue={parsed.currentIssue}
                  placeholder={template.currentPlaceholder}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </label>
              <label>
                需要怎么做*
                <textarea
                  name="situationAction"
                  rows={4}
                  defaultValue={parsed.requiredAction || row.nextAction || ""}
                  placeholder={template.actionPlaceholder}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </label>
              <label>
                最晚截止时间*
                <DateTimeSplitInput
                  name="situationDeadline"
                  defaultValue={toDateTimeLocalValue(row.nextActionDue)}
                  wrapperStyle={{ width: "100%" }}
                />
              </label>
              <button type="submit">保存工单内容 / Save Ticket</button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

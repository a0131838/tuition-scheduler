import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
import { BUSINESS_UPLOAD_PREFIX, resolveStoredBusinessFilePath } from "@/lib/business-file-storage";
import { formatBusinessDateTime } from "@/lib/date-only";
import TicketStatusSubmitButton from "@/app/admin/_components/TicketStatusSubmitButton";
import WorkflowSourceBanner from "@/app/admin/_components/WorkflowSourceBanner";
import { formatBusinessDateOnly, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  buildParentAvailabilityExpiresAt,
  buildParentAvailabilityPath,
  buildParentAvailabilityShareText,
  coerceParentAvailabilityPayload,
  createParentAvailabilityToken,
  deriveParentAvailabilitySearchWindow,
  formatParentAvailabilityFieldRows,
} from "@/lib/parent-availability";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";
import {
  buildSchedulingCoordinationSlotShareText,
  buildSchedulingCoordinationTeacherOptions,
  deriveSchedulingCoordinationPhase,
  formatSchedulingCoordinationSystemText,
  inferSchedulingCoordinationDurationMin,
  listSchedulingCoordinationCandidateSlots,
  listSchedulingCoordinationParentMatchedSlots,
  schedulingCoordinationParentChoiceLoggedText,
  schedulingCoordinationTeacherExceptionAction,
  schedulingCoordinationTeacherExceptionLoggedText,
  schedulingCoordinationWaitingParentAction,
  schedulingCoordinationWaitingParentChoiceAction,
  schedulingCoordinationWaitingParentSummary,
} from "@/lib/scheduling-coordination";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import {
  existingResultSessionIdForAction,
  isTicketSchedulingActionResolved,
  normalizeSchedulingActionInput,
  schedulingActionCanBeReady,
  schedulingActionDefinition,
  schedulingActionStatusLabel,
  schedulingActionInclude,
  schedulingResolutionActionStatus,
  schedulingResolutionDefinition,
  schedulingResolutionTicketStatus,
  TICKET_SCHEDULING_ACTION_STATUSES,
  TICKET_SCHEDULING_ACTION_TYPES,
  TICKET_SCHEDULING_RESOLUTION_MODES,
} from "@/lib/ticket-scheduling-actions";
import { buildTicketOperationCard, isSchedulingTicketType } from "@/lib/ticket-operation-card";
import {
  AI_TICKET_COMMAND_LABELS,
  prepareAdminAiTicketPlan,
  readAdminAiTicketPlan,
} from "@/lib/admin-ai-ticket-plan";

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

function formatAiPlanDateTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return formatBusinessDateTime(new Date(value));
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
  if (!value.startsWith("/admin/tickets") && !value.startsWith("/admin/todos")) return fallback;
  return value.slice(0, 1000);
}

function sanitizeTodoBack(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/admin/todos")) return "/admin/todos";
  return value.slice(0, 1000);
}

function appendQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, "https://local.invalid");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
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

function coordinationPhaseToneStyle(key: string) {
  if (key === "ready_to_schedule" || key === "availability_options_ready") {
    return { border: "1px solid #86efac", background: "#f0fdf4", color: "#166534" } as const;
  }
  if (key === "teacher_exception_needed" || key === "waiting_teacher_exception") {
    return { border: "1px solid #fdba74", background: "#fff7ed", color: "#9a3412" } as const;
  }
  if (key === "closed") {
    return { border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569" } as const;
  }
  return { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8" } as const;
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
    select: {
      status: true, summary: true, isArchived: true,
      schedulingActions: { select: { status: true } },
    },
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
  if (
    nextStatus === "Completed" &&
    row.schedulingActions.some((action) => !isTicketSchedulingActionResolved(action))
  ) {
    redirect(appendQuery(back, { err: "scheduling-actions-open" }));
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
  const adminUser = await requireAdmin();
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
  const type = validateByOptions(normalizeTicketString(formData.get("type"), 60), TICKET_TYPE_OPTIONS);
  const priority = validateByOptions(normalizeTicketString(formData.get("priority"), 60), TICKET_PRIORITY_OPTIONS);
  const owner = validateByOptions(normalizeTicketString(formData.get("owner"), 20), TICKET_OWNER_OPTIONS);
  if (!studentName || !type || !priority || !owner) {
    redirect(appendQuery(back, { err: "edit-required" }));
  }

  const grade = normalizeTicketString(formData.get("grade"), 40);
  const course = normalizeTicketString(formData.get("course"), 120);
  const teacher = normalizeTicketString(formData.get("teacher"), 120);
  const teacherIdInput = normalizeTicketString(formData.get("teacherId"), 80);
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
  const teacherId = teacher
    ? await resolveTicketTeacherId({
        teacherName: teacher,
        teacherId: teacherIdInput,
      })
    : null;

  await prisma.ticket.update({
    where: { id },
    data: {
      studentName,
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

async function deleteTicketAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
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

async function regenerateParentAvailabilityAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
  if (!id) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      isArchived: true,
      type: true,
      parentAvailabilityRequest: {
        select: {
          ticketId: true,
        },
      },
    },
  });
  if (!row) redirect(back);
  if (row.isArchived || ["Completed", "Cancelled"].includes(row.status)) {
    redirect(appendQuery(back, { err: "closed-parent-form" }));
  }
  if (row.type !== "排课协调" || !row.parentAvailabilityRequest) {
    redirect(appendQuery(back, { err: "no-parent-form" }));
  }

  const now = new Date();
  const expiresAt = buildParentAvailabilityExpiresAt();

  await prisma.$transaction([
    prisma.parentAvailabilityRequest.update({
      where: { ticketId: id },
      data: {
        token: createParentAvailabilityToken(),
        isActive: true,
        expiresAt,
        submittedAt: null,
        payloadJson: Prisma.JsonNull,
      },
    }),
    prisma.ticket.update({
      where: { id },
      data: {
        status: "Waiting Parent",
        parentAvailability: schedulingCoordinationWaitingParentSummary(),
        nextAction: schedulingCoordinationWaitingParentAction(),
        nextActionDue: now,
        lastUpdateAt: now,
      },
    }),
  ]);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/admin/todos");
  redirect(appendQuery(back, { ok: "parent-link-regenerated" }));
}

async function markCoordinationParentChoiceAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
  if (!id) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, type: true, status: true, isArchived: true, summary: true },
  });
  if (!row || row.type !== "排课协调" || row.isArchived || ["Completed", "Cancelled"].includes(row.status)) {
    redirect(appendQuery(back, { err: "closed-parent-form" }));
  }

  const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextAction = schedulingCoordinationWaitingParentChoiceAction();
  const previousSummary = parseTicketSituationSummary(row.summary);
  await prisma.ticket.update({
    where: { id },
    data: {
      status: "Waiting Parent",
      nextAction,
      nextActionDue: nextDue,
      lastUpdateAt: new Date(),
      summary: composeTicketSituation({
        currentIssue: formatSchedulingCoordinationSystemText(previousSummary.currentIssue || row.summary || "Scheduling coordination follow-up"),
        requiredAction: [
          formatSchedulingCoordinationSystemText(previousSummary.requiredAction),
          schedulingCoordinationParentChoiceLoggedText(),
          nextAction,
        ]
          .filter(Boolean)
          .join("\n\n"),
        latestDeadlineText: formatBusinessDateTime(nextDue),
      }),
    },
  });
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/admin/todos");
  revalidatePath("/admin/students");
  redirect(appendQuery(back, { ok: "coordination-waiting-parent-choice" }));
}

async function markCoordinationTeacherExceptionAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), "/admin/tickets");
  if (!id) redirect(back);

  const row = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, type: true, status: true, isArchived: true, summary: true },
  });
  if (!row || row.type !== "排课协调" || row.isArchived || ["Completed", "Cancelled"].includes(row.status)) {
    redirect(appendQuery(back, { err: "closed-parent-form" }));
  }

  const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextAction = schedulingCoordinationTeacherExceptionAction();
  const previousSummary = parseTicketSituationSummary(row.summary);
  await prisma.ticket.update({
    where: { id },
    data: {
      status: "Waiting Teacher",
      nextAction,
      nextActionDue: nextDue,
      lastUpdateAt: new Date(),
      summary: composeTicketSituation({
        currentIssue: formatSchedulingCoordinationSystemText(previousSummary.currentIssue || row.summary || "Scheduling coordination follow-up"),
        requiredAction: [
          formatSchedulingCoordinationSystemText(previousSummary.requiredAction),
          schedulingCoordinationTeacherExceptionLoggedText(),
          nextAction,
        ]
          .filter(Boolean)
          .join("\n\n"),
        latestDeadlineText: formatBusinessDateTime(nextDue),
      }),
    },
  });
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/admin/todos");
  revalidatePath("/teacher/scheduling-exceptions");
  redirect(appendQuery(back, { ok: "coordination-waiting-teacher" }));
}

async function addTicketSchedulingActionAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const ticketId = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), `/admin/tickets/${ticketId}`);
  const action = normalizeSchedulingActionInput({
    actionType: trimValue(formData, "actionType", 40),
    sourceSessionId: trimValue(formData, "sourceSessionId", 80) || null,
    notes: trimValue(formData, "notes", 2000) || null,
  });
  if (!ticketId || !action) redirect(appendQuery(back, { err: "scheduling-action-invalid" }));
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { studentId: true, status: true, isArchived: true } });
  if (!ticket || ticket.isArchived || ["Completed", "Cancelled"].includes(ticket.status)) redirect(appendQuery(back, { err: "scheduling-action-closed" }));
  let inferredCourseLabel = action.courseLabel;
  if (action.sourceSessionId) {
    if (!ticket.studentId) redirect(appendQuery(back, { err: "scheduling-action-student" }));
    const source = await prisma.session.findFirst({ where: { id: action.sourceSessionId, ...sessionBelongsToStudentWhere(ticket.studentId!) }, select: { id: true, class: { select: { course: { select: { name: true } }, subject: { select: { name: true } }, level: { select: { name: true } } } } } });
    if (!source) redirect(appendQuery(back, { err: "scheduling-action-source" }));
    inferredCourseLabel = [source.class.course.name, source.class.subject?.name, source.class.level?.name].filter(Boolean).join(" / ");
  }
  const last = await prisma.ticketSchedulingAction.findFirst({ where: { ticketId }, orderBy: { sequence: "desc" }, select: { sequence: true } });
  const created = await prisma.ticketSchedulingAction.create({ data: { ticketId, sequence: (last?.sequence ?? -1) + 1, ...action, courseLabel: inferredCourseLabel } });
  if (inferredCourseLabel) await prisma.ticket.update({ where: { id: ticketId }, data: { course: inferredCourseLabel } });
  await prisma.auditLog.create({ data: {
    actorEmail: user.email.trim().toLowerCase(), actorName: user.name?.trim() || null, actorRole: user.role,
    module: "TICKETS", action: "ADMIN_ADD_TICKET_SCHEDULING_ACTION", entityType: "TicketSchedulingAction", entityId: created.id,
    meta: { ticketId, actionType: action.actionType, sourceSessionId: action.sourceSessionId },
  } });
  revalidatePath(`/admin/tickets/${ticketId}`);
  redirect(appendQuery(back, { ok: "scheduling-action-added" }));
}

async function updateTicketSchedulingActionAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const ticketId = trimValue(formData, "id", 80);
  const actionId = trimValue(formData, "actionId", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), `/admin/tickets/${ticketId}`);
  const current = await prisma.ticketSchedulingAction.findFirst({ where: { id: actionId, ticketId }, include: { ticket: { select: { studentId: true, status: true, isArchived: true } } } });
  if (!current || current.ticket.isArchived || ["Completed", "Cancelled"].includes(current.ticket.status)) redirect(appendQuery(back, { err: "scheduling-action-closed" }));
  if (["APPLIED", "CANCELLED"].includes(current.status)) redirect(appendQuery(back, { err: "scheduling-action-resolved" }));
  const sourceSessionId = trimValue(formData, "sourceSessionId", 80) || null;
  if (sourceSessionId) {
    if (!current.ticket.studentId) redirect(appendQuery(back, { err: "scheduling-action-student" }));
    const source = await prisma.session.findFirst({ where: { id: sourceSessionId, ...sessionBelongsToStudentWhere(current.ticket.studentId!) }, select: { id: true } });
    if (!source) redirect(appendQuery(back, { err: "scheduling-action-source" }));
  }
  let status = trimValue(formData, "actionStatus", 40);
  if (!TICKET_SCHEDULING_ACTION_STATUSES.some((item) => item.value === status) || status === "APPLIED") status = current.status;
  if (
    status === "READY" &&
    !schedulingActionCanBeReady({
      actionType: current.actionType,
      sourceSessionId,
      requestedStartAt: current.requestedStartAt,
      requestedEndAt: current.requestedEndAt,
      requestedTeacherId: current.requestedTeacherId,
      courseLabel: current.courseLabel,
      durationMin: current.durationMin,
    })
  ) status = "NEED_INFO";
  await prisma.$transaction([
    prisma.ticketSchedulingAction.update({ where: { id: actionId }, data: { sourceSessionId, status, notes: trimValue(formData, "notes", 2000) || null } }),
    prisma.auditLog.create({ data: {
      actorEmail: user.email.trim().toLowerCase(), actorName: user.name?.trim() || null, actorRole: user.role,
      module: "TICKETS", action: "ADMIN_UPDATE_TICKET_SCHEDULING_ACTION", entityType: "TicketSchedulingAction", entityId: actionId,
      meta: { ticketId, fromStatus: current.status, toStatus: status, sourceSessionId },
    } }),
  ]);
  revalidatePath(`/admin/tickets/${ticketId}`);
  redirect(appendQuery(back, { ok: "scheduling-action-updated" }));
}

async function resolveTicketSchedulingActionsAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const ticketId = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), `/admin/tickets/${ticketId}#scheduling-actions`);
  const resolution = schedulingResolutionDefinition(trimValue(formData, "resolutionMode", 80));
  const resolutionNote = trimValue(formData, "resolutionNote", 1500);
  const verified = trimValue(formData, "resolutionVerified", 10) === "1";
  const selectedActionIds = new Set(
    formData
      .getAll("resolvedActionId")
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  );

  if (!resolution) redirect(appendQuery(back, { err: "scheduling-resolution-mode" }));
  if (!resolutionNote) redirect(appendQuery(back, { err: "scheduling-resolution-note" }));
  if (!verified) redirect(appendQuery(back, { err: "scheduling-resolution-verification" }));

  const now = new Date();
  const actorName = user.name?.trim() || user.email;
  const outcome = await prisma.$transaction(async (tx) => {
    const latestTicket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        status: true,
        summary: true,
        risksNotes: true,
        isArchived: true,
        schedulingActions: {
          orderBy: { sequence: "asc" },
          select: { id: true, sequence: true, actionType: true, status: true, notes: true },
        },
      },
    });
    if (!latestTicket || latestTicket.isArchived || ["Completed", "Cancelled"].includes(latestTicket.status)) {
      return "closed" as const;
    }

    const unresolvedActions = latestTicket.schedulingActions.filter((action) => !isTicketSchedulingActionResolved(action));
    if (
      resolution.value === "NOT_REQUIRED" &&
      latestTicket.schedulingActions.some((action) => action.status === "APPLIED")
    ) {
      return "mixed" as const;
    }

    const targetActions = resolution.value === "PARTIALLY_COMPLETED_EXTERNALLY"
      ? unresolvedActions.filter((action) => selectedActionIds.has(action.id))
      : unresolvedActions;
    if (resolution.value === "PARTIALLY_COMPLETED_EXTERNALLY" && targetActions.length === 0) {
      return "selection" as const;
    }

    const nextActionStatus = schedulingResolutionActionStatus(resolution.value);
    for (const action of targetActions) {
      const notePrefix = resolution.value === "NOT_REQUIRED"
        ? "[工单级核验：无需处理]"
        : "[工单级核验：已在其他页面处理完成]";
      const updated = await tx.ticketSchedulingAction.updateMany({
        where: {
          id: action.id,
          ticketId,
          status: { notIn: ["APPLIED", "CANCELLED"] },
        },
        data: {
          status: nextActionStatus,
          appliedAt: nextActionStatus === "APPLIED" ? now : undefined,
          appliedByUserId: nextActionStatus === "APPLIED" ? user.id : undefined,
          notes: action.notes
            ? `${action.notes}\n\n${notePrefix} ${resolutionNote}`
            : `${notePrefix} ${resolutionNote}`,
        },
      });
      if (updated.count !== 1) return "stale" as const;
    }

    const unresolvedAfter = unresolvedActions.length - targetActions.length;
    const closingStatus = schedulingResolutionTicketStatus(resolution.value, unresolvedAfter);
    const completed = closingStatus === "Completed";
    const closed = Boolean(closingStatus);
    const visibleLog = `[${formatBusinessDateTime(now)}] ${actorName} · ${resolution.label}\n${resolutionNote}`;
    const nextAction = closingStatus === "Cancelled"
      ? "已核验整张工单无需处理，工单关闭。"
      : completed
        ? "实际处理结果已统一核验，工单完成。"
        : `已补录 ${targetActions.length} 个动作，仍有 ${unresolvedAfter} 个排课动作待处理。`;

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: closingStatus ?? undefined,
        systemUpdated: completed ? "Y" : undefined,
        completedAt: completed ? now : undefined,
        completedByUserId: completed ? user.id : undefined,
        nextAction,
        nextActionDue: closed ? null : undefined,
        summary: closingStatus
          ? `${latestTicket.summary ? `${latestTicket.summary}\n` : ""}${completed ? "[Completed Note]" : "[Cancelled Note]"} ${resolutionNote}`
          : undefined,
        risksNotes: latestTicket.risksNotes
          ? `${latestTicket.risksNotes}\n\n${visibleLog}`
          : visibleLog,
        lastUpdateAt: now,
      },
    });
    if (closed) {
      await tx.parentAvailabilityRequest.updateMany({ where: { ticketId }, data: { isActive: false } });
    }
    await tx.auditLog.create({
      data: {
        actorEmail: user.email.trim().toLowerCase(),
        actorName: user.name?.trim() || null,
        actorRole: user.role,
        module: "TICKETS",
        action: "ADMIN_RESOLVE_TICKET_SCHEDULING_ACTIONS",
        entityType: "Ticket",
        entityId: ticketId,
        meta: {
          resolutionMode: resolution.value,
          resolutionNote,
          affectedActionIds: targetActions.map((action) => action.id),
          affectedActionCount: targetActions.length,
          unresolvedAfter,
          closingStatus,
        },
      },
    });
    return "ok" as const;
  });

  if (outcome === "closed") redirect(appendQuery(back, { err: "scheduling-action-closed" }));
  if (outcome === "mixed") redirect(appendQuery(back, { err: "scheduling-resolution-mixed" }));
  if (outcome === "selection") redirect(appendQuery(back, { err: "scheduling-resolution-selection" }));
  if (outcome === "stale") redirect(appendQuery(back, { err: "scheduling-action-resolved" }));

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/todos");
  revalidatePath("/teacher/tickets");
  redirect(appendQuery(back, { ok: "scheduling-resolution-saved" }));
}

async function linkExistingSchedulingResultAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const ticketId = trimValue(formData, "id", 80);
  const actionId = trimValue(formData, "actionId", 80);
  const resultSessionId = trimValue(formData, "existingResultSessionId", 80) || null;
  const resolutionNote = trimValue(formData, "existingResultNote", 1000);
  const verified = trimValue(formData, "existingResultVerified", 10) === "1";
  const back = sanitizeAdminBack(trimValue(formData, "back", 1000), `/admin/tickets/${ticketId}#scheduling-actions`);

  if (!resolutionNote) redirect(appendQuery(back, { err: "existing-result-note" }));
  if (!verified) redirect(appendQuery(back, { err: "existing-result-verification" }));

  const current = await prisma.ticketSchedulingAction.findFirst({
    where: { id: actionId, ticketId },
    include: {
      ticket: {
        select: {
          studentId: true,
          status: true,
          isArchived: true,
        },
      },
    },
  });
  if (!current || current.ticket.isArchived || ["Completed", "Cancelled"].includes(current.ticket.status)) {
    redirect(appendQuery(back, { err: "scheduling-action-closed" }));
  }
  if (isTicketSchedulingActionResolved(current)) {
    redirect(appendQuery(back, { err: "scheduling-action-resolved" }));
  }
  if (!current.ticket.studentId) {
    redirect(appendQuery(back, { err: "scheduling-action-student" }));
  }

  const linkedSessionId = existingResultSessionIdForAction({
    actionType: current.actionType,
    sourceSessionId: current.sourceSessionId,
    resultSessionId,
  });
  if (!linkedSessionId) {
    redirect(appendQuery(back, { err: "existing-result-session" }));
  }
  const linkedSession = await prisma.session.findFirst({
    where: {
      id: linkedSessionId,
      ...sessionBelongsToStudentWhere(current.ticket.studentId),
    },
    select: { id: true },
  });
  if (!linkedSession) {
    redirect(appendQuery(back, { err: "existing-result-session" }));
  }

  const now = new Date();
  const actorName = user.name?.trim() || user.email;
  const visibleLog = `[${formatBusinessDateTime(now)}] ${actorName} · 关联已有排课结果\n${resolutionNote}`;

  const linked = await prisma.$transaction(async (tx) => {
    const latestTicket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        status: true,
        summary: true,
        risksNotes: true,
        isArchived: true,
      },
    });
    if (!latestTicket || latestTicket.isArchived || ["Completed", "Cancelled"].includes(latestTicket.status)) {
      return false;
    }
    const applied = await tx.ticketSchedulingAction.updateMany({
      where: {
        id: actionId,
        ticketId,
        status: { notIn: ["APPLIED", "CANCELLED"] },
      },
      data: {
        status: "APPLIED",
        resultSessionId: linkedSession.id,
        appliedAt: now,
        appliedByUserId: user.id,
        notes: current.notes
          ? `${current.notes}\n\n[Existing result linked] ${resolutionNote}`
          : `[Existing result linked] ${resolutionNote}`,
      },
    });
    if (applied.count !== 1) return false;

    const unresolved = await tx.ticketSchedulingAction.count({
      where: { ticketId, status: { notIn: ["APPLIED", "CANCELLED"] } },
    });
    const allResolved = unresolved === 0;
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: allResolved ? "Completed" : undefined,
        systemUpdated: "Y",
        completedAt: allResolved ? now : undefined,
        completedByUserId: allResolved ? user.id : undefined,
        nextAction: allResolved
          ? "所有排课动作已核验完成，无需继续跟进。"
          : `已有结果已关联，仍有 ${unresolved} 个排课动作待执行。`,
        nextActionDue: allResolved ? null : undefined,
        summary: allResolved
          ? `${latestTicket.summary ? `${latestTicket.summary}\n` : ""}[Completed Note] ${resolutionNote}`
          : undefined,
        risksNotes: latestTicket.risksNotes
          ? `${latestTicket.risksNotes}\n\n${visibleLog}`
          : visibleLog,
        lastUpdateAt: now,
      },
    });
    if (allResolved) {
      await tx.parentAvailabilityRequest.updateMany({
        where: { ticketId },
        data: { isActive: false },
      });
    }
    await tx.auditLog.create({
      data: {
        actorEmail: user.email.trim().toLowerCase(),
        actorName: user.name?.trim() || null,
        actorRole: user.role,
        module: "TICKETS",
        action: "ADMIN_LINK_EXISTING_SCHEDULING_RESULT",
        entityType: "TicketSchedulingAction",
        entityId: actionId,
        meta: {
          ticketId,
          actionType: current.actionType,
          fromStatus: current.status,
          resultSessionId: linkedSession.id,
          resolutionNote,
          allResolved,
        },
      },
    });
    return true;
  });
  if (!linked) {
    redirect(appendQuery(back, { err: "scheduling-action-resolved" }));
  }

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/teacher/tickets");
  redirect(appendQuery(back, { ok: "existing-result-linked" }));
}

async function prepareAiTicketPlanAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const ticketId = trimValue(formData, "id", 80);
  const back = sanitizeAdminBack(trimValue(formData, "back", 1_000), `/admin/tickets/${ticketId}#ticket-decision`);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, isArchived: true, status: true },
  });
  if (!ticket || ticket.isArchived || ["Completed", "Cancelled"].includes(ticket.status)) {
    redirect(appendQuery(back, { err: "ai-plan-closed" }));
  }
  try {
    await prepareAdminAiTicketPlan(user, ticketId);
  } catch {
    redirect(appendQuery(back, { err: "ai-plan-unavailable" }));
  }
  revalidatePath(`/admin/tickets/${ticketId}`);
  redirect(appendQuery(back, { ok: "ai-plan-prepared" }));
}

export default async function AdminTicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string; err?: string; ok?: string; fields?: string; source?: string; todoBack?: string; work?: string; guide?: string }>;
}) {
  const adminUser = await requireAdmin();
  const route = await params;
  const sp = await searchParams;
  const id = String(route.id ?? "").trim();
  const sourceWorkflow = String(sp?.source ?? "").trim().toLowerCase() === "todo" || String(sp?.back ?? "").startsWith("/admin/todos") ? "todo" : "";
  const todoBack = sanitizeTodoBack(sp?.todoBack ?? sp?.back);
  const listBack = sanitizeAdminBack(sp?.back ?? (sourceWorkflow === "todo" ? todoBack : ""), "/admin/tickets");
  const selfHrefParams: Record<string, string> = {};
  if (listBack !== "/admin/tickets") selfHrefParams.back = listBack;
  if (sourceWorkflow === "todo") {
    selfHrefParams.source = "todo";
    selfHrefParams.todoBack = todoBack;
  }
  const selfHref =
    Object.keys(selfHrefParams).length > 0
      ? appendQuery(`/admin/tickets/${id}`, selfHrefParams)
      : `/admin/tickets/${id}`;
  const statusSectionHref = `${selfHref}#status-action`;
  const coordinationConsoleHref = `${selfHref}#coordination-console`;
  const ticketEditHref = `${selfHref}#ticket-edit`;
  const err = String(sp?.err ?? "").trim();
  const ok = String(sp?.ok ?? "").trim();
  const fields = String(sp?.fields ?? "").trim();
  const canHardDeleteTicket = isStrictSuperAdmin(adminUser);

  const row = await prisma.ticket.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, sourceChannel: { select: { name: true } } } },
      parentAvailabilityRequest: {
        select: {
          token: true,
          isActive: true,
          expiresAt: true,
          submittedAt: true,
          courseLabel: true,
          payloadJson: true,
        },
      },
      schedulingActions: {
        include: schedulingActionInclude,
        orderBy: { sequence: "asc" },
      },
    },
  });
  if (!row) notFound();

  const requestEntry = row.parentAssistedByName || row.createdByName?.startsWith("员工代录：")
    ? "员工代家长录入 / Staff-assisted parent request"
    : row.source === "家长小程序"
      ? "家长小程序 / Parent miniapp"
      : "后台或专用录入链接 / Admin or dedicated intake link";

  const isSchedulingTicket = isSchedulingTicketType(row.type);
  const aiPlanResult = !row.isArchived && !["Completed", "Cancelled"].includes(row.status)
    ? await readAdminAiTicketPlan(adminUser, row.id)
    : null;
  const sessionInclude = {
    teacher: { select: { name: true } },
    class: {
      include: {
        course: { select: { name: true } },
        subject: { select: { name: true } },
        level: { select: { name: true } },
        teacher: { select: { name: true } },
      },
    },
  } as const;
  const existingResultStart = new Date();
  existingResultStart.setDate(existingResultStart.getDate() - 180);
  const [upcomingSessions, existingResultSessions] = isSchedulingTicket && row.studentId
    ? await Promise.all([
        prisma.session.findMany({
          where: { startAt: { gte: new Date() }, ...sessionBelongsToStudentWhere(row.studentId) },
          include: sessionInclude,
          orderBy: { startAt: "asc" },
          take: 30,
        }),
        prisma.session.findMany({
          where: { startAt: { gte: existingResultStart }, ...sessionBelongsToStudentWhere(row.studentId) },
          include: sessionInclude,
          orderBy: { startAt: "desc" },
          take: 80,
        }),
      ])
    : [[], []];

  const parsed = parseTicketSituationSummary(row.summary);
  const template = getTicketTypeTemplate(row.type);
  const typeFieldHint = template.requiredFields.length
    ? `本类型必填：${template.requiredFields.map(getTicketFieldLabel).join("、")}`
    : "本类型无额外必填字段";
  const overdue = isTicketOverdue(row);
  const parentAvailabilityPayload = row.parentAvailabilityRequest?.submittedAt
    ? coerceParentAvailabilityPayload(row.parentAvailabilityRequest.payloadJson)
    : null;
  const parentAvailabilityRows = parentAvailabilityPayload
    ? formatParentAvailabilityFieldRows(parentAvailabilityPayload)
    : [];
  const parentAvailabilityHref = row.parentAvailabilityRequest
    ? buildParentAvailabilityPath(row.parentAvailabilityRequest.token)
    : null;
  const parentAvailabilityShareText = parentAvailabilityHref
    ? buildParentAvailabilityShareText({
        studentName: row.studentName,
        courseLabel: row.parentAvailabilityRequest?.courseLabel ?? row.course,
        url: `https://sgtmanage.com${parentAvailabilityHref}`,
      })
    : "";
  const studentCoordinationHref = row.studentId
    ? `/admin/students/${row.studentId}?focus=scheduling-coordination#scheduling-coordination`
    : "";
  const coordinationContext =
    row.type === "排课协调" && row.studentId
      ? await (async () => {
          const [enrollments, teachers] = await Promise.all([
            prisma.enrollment.findMany({
              where: { studentId: row.studentId! },
              include: {
                class: {
                  include: {
                    subject: true,
                    level: true,
                    teacher: true,
                  },
                },
              },
            }),
            prisma.teacher.findMany({ include: { subjects: true }, orderBy: { name: "asc" } }),
          ]);
          const teacherOptions = buildSchedulingCoordinationTeacherOptions({ enrollments, teachers });
          const classIds = enrollments.map((item) => item.classId);
          const futureEnd = new Date();
          futureEnd.setDate(futureEnd.getDate() + 60);
          const relevantSessions = classIds.length
            ? await prisma.session.findMany({
                where: {
                  classId: { in: classIds },
                  startAt: { gte: new Date(), lt: futureEnd },
                  OR: [{ studentId: null }, { studentId: row.studentId! }],
                },
                select: { startAt: true, endAt: true },
                orderBy: { startAt: "asc" },
              })
            : [];
          const durationMin = inferSchedulingCoordinationDurationMin({
            ticketDurationMin: row.durationMin,
            upcomingSessions: relevantSessions,
            monthlySessions: relevantSessions,
          });
          const parentSearchWindow = parentAvailabilityPayload
            ? deriveParentAvailabilitySearchWindow({
                payload: parentAvailabilityPayload,
                now: new Date(),
              })
            : null;
          const availabilitySlots =
            teacherOptions.length > 0
              ? await listSchedulingCoordinationCandidateSlots({
                  studentId: row.studentId!,
                  teacherOptions,
                  startAt: parentSearchWindow?.startAt ?? new Date(),
                  horizonDays: parentSearchWindow?.horizonDays,
                  durationMin,
                  maxSlots: parentAvailabilityPayload?.selectionMode === "calendar" ? 24 : 12,
                })
              : [];
          const matchedParentSlots =
            teacherOptions.length > 0
              ? await listSchedulingCoordinationParentMatchedSlots({
                  studentId: row.studentId!,
                  teacherOptions,
                  payload: parentAvailabilityPayload,
                  startAt: new Date(),
                  durationMin,
                  maxSlots: 5,
                })
              : [];
          return {
            teacherCount: teacherOptions.length,
            durationMin,
            matchedParentSlots,
            fallbackSlots: availabilitySlots.slice(0, 3),
          };
        })()
      : null;
  const coordinationPhase = row.type === "排课协调"
    ? deriveSchedulingCoordinationPhase({
        ticketStatus: row.status,
        hasParentForm: Boolean(row.parentAvailabilityRequest),
        parentSubmittedAt: row.parentAvailabilityRequest?.submittedAt ?? null,
        matchedSlotCount: coordinationContext?.matchedParentSlots.length ?? 0,
        parentAvailabilitySummary: row.parentAvailability ?? null,
      })
    : null;
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
  const unresolvedSchedulingActions = row.schedulingActions.filter((action) => !isTicketSchedulingActionResolved(action));
  const operationCard = buildTicketOperationCard({
    type: row.type,
    status: row.status,
    owner: row.owner,
    nextAction: row.nextAction,
    isArchived: row.isArchived,
    schedulingActions: row.schedulingActions,
  });
  const showFormalExecution = String(sp?.work ?? "").trim() === "execute";
  const executionGuide = String(sp?.guide ?? "").trim() === "ai" ? "ai" : "manual";
  const formalExecutionHref = `${appendQuery(selfHref, { work: "execute", guide: "ai" })}#scheduling-actions`;
  const manualExecutionHref = `${appendQuery(selfHref, { work: "execute", guide: "manual" })}#scheduling-actions`;
  const aiOsTicketHref = `/api/admin/ai-os/sso?next=${encodeURIComponent(`/?ticket=${row.id}`)}`;
  const businessStatusLabel = row.isArchived
    ? "已归档"
    : row.status === "Completed"
      ? "已完成"
      : row.status === "Cancelled"
        ? "已取消"
        : unresolvedSchedulingActions.some((action) => action.status === "WAITING_PARENT")
          ? "等待家长"
          : unresolvedSchedulingActions.some((action) => action.status === "WAITING_TEACHER")
            ? "等待老师"
            : unresolvedSchedulingActions.some((action) => action.status === "NEED_INFO")
              ? "资料待补充"
              : unresolvedSchedulingActions.length > 0
                ? `处理中（${unresolvedSchedulingActions.length} 个动作）`
                : row.status === "Confirmed"
                  ? "处理中"
                  : row.status;
  const proofItems = proofItemsAll(row.proof);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style>{`
        @keyframes ticketFlowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.20); }
          50% { box-shadow: 0 0 0 6px rgba(249,115,22,0.12); }
        }
      `}</style>

      <div
        style={{
          borderBottom: "1px solid #cbd5e1",
          padding: "4px 0 18px",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#047857", fontWeight: 800, marginBottom: 5 }}>{row.ticketNo}</div>
            <h2 style={{ margin: 0, fontSize: 28 }}>{row.studentName} · {normalizeTicketTypeValue(row.type)}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#475569", marginTop: 8, fontSize: 13 }}>
              <span>{businessStatusLabel}</span><span>·</span><span>负责人 {asText(row.owner)}</span>
              {row.nextActionDue ? <><span>·</span><span style={{ color: overdue ? "#b91c1c" : "inherit", fontWeight: overdue ? 800 : 500 }}>截止 {formatBusinessDateTime(row.nextActionDue)}</span></> : null}
            </div>
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
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 13,
          fontWeight: 750,
        }}
      >
        <a href={isSchedulingTicket ? "#ticket-decision" : "#ticket-request"}>处理当前工单</a>
        <a href="#ticket-request">查看家长需求</a>
        <a href="#ticket-advanced">完整资料与历史</a>
      </div>

      {sourceWorkflow === "todo" ? (
        <WorkflowSourceBanner
          tone="amber"
          title="From Todo Center / 来自待办中心"
          description="This ticket was opened from today's work queue. Finish the follow-up here, then return to the same todo section when you are ready for the next item. / 这条工单是从今日待办进入的；处理完当前跟进后，可直接回到同一个待办区块继续下一条。"
          primaryHref={todoBack}
          primaryLabel="Back to Todo Center / 返回待办中心"
          secondaryActions={
            <Link scroll={false} href="/admin/tickets" style={{ fontWeight: 700 }}>
              Ticket Center / 工单中心
            </Link>
          }
        />
      ) : null}

      {err ? (
        <div style={{ color: "#b91c1c", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: 10 }}>
          {err === "status-flow" && "状态流转不允许 / Invalid status transition"}
          {err === "need-note" && "完成时必须填写完成说明 / Completion note is required when marking completed"}
          {err === "scheduling-actions-open" && "仍有未执行的排课动作，不能完成整张工单 / Resolve every scheduling action before closing the ticket."}
          {err === "scheduling-action-invalid" && "排课动作内容无效，请重新选择 / Invalid scheduling action."}
          {err === "scheduling-action-closed" && "已关闭工单不能修改排课动作 / Closed ticket cannot change scheduling actions."}
          {err === "scheduling-action-resolved" && "已执行的动作不能手工改写 / Applied action is locked."}
          {err === "scheduling-action-student" && "请先给工单关联学生 / Link the ticket to a student first."}
          {err === "scheduling-action-source" && "所选原课程不属于该学生 / Selected lesson does not belong to this student."}
          {err === "existing-result-note" && "关联已有结果时必须填写核验备注 / Verification note is required."}
          {err === "existing-result-verification" && "请先确认正式课表已经完成对应处理 / Confirm the formal schedule was already updated."}
          {err === "existing-result-session" && "请选择属于该学生的实际处理课程 / Select the student's actual result lesson."}
          {err === "scheduling-resolution-mode" && "请选择这张工单的实际处理方式 / Select how this ticket was actually handled."}
          {err === "scheduling-resolution-note" && "请只填写一次共同核验说明 / Add one shared verification note."}
          {err === "scheduling-resolution-verification" && "请确认已经核对正式系统或真实沟通记录 / Confirm the formal record was verified."}
          {err === "scheduling-resolution-selection" && "部分完成时至少勾选一个已经完成的动作 / Select at least one completed action."}
          {err === "scheduling-resolution-mixed" && "这张工单已有动作实际执行，不能整单标记为无需处理；请选择部分完成或继续正常执行。"}
          {err === "completed-locked" && "已完成工单不可修改，请使用归档 / Completed ticket is locked. Use archive."}
          {err === "archived-locked" && "已归档工单不可修改 / Archived ticket is locked."}
          {err === "need-closed-archive" && "仅已完成或已取消工单可归档 / Only completed or cancelled tickets can be archived."}
          {err === "closed-parent-form" && "当前工单已关闭，不能再重生家长表单链接 / Closed tickets cannot regenerate parent links."}
          {err === "no-parent-form" && "当前工单没有家长时间表单链接 / No parent form is attached to this ticket."}
          {err === "edit-required" && "编辑保存失败：学生、来源、类型、优先级、负责人必填 / Required fields missing."}
          {err === "edit-type-required" &&
            `编辑保存失败：该工单类型缺少必填字段 / Missing required fields for this ticket type${fields ? `: ${fields}` : ""}`}
          {err === "edit-situation" && "编辑保存失败：Situation 三项必填 / Situation fields are required."}
          {err === "delete-forbidden" && "只有 Zhao Hongwei 可以永久删除工单 / Only Zhao Hongwei can permanently delete tickets."}
          {err === "need-closed-delete" && "只有已完成、已取消或已归档工单可以永久删除 / Only completed, cancelled, or archived tickets can be permanently deleted."}
          {err === "ai-plan-closed" && "已关闭工单不再重新生成AI方案。"}
          {err === "ai-plan-unavailable" && "AI方案暂时未能生成；你仍可使用下方人工处理，不会阻塞工单。"}
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
      {ok === "ai-plan-prepared" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          AI已按最新工单、课表和课包重新准备建议；正式操作仍需员工确认。
        </div>
      ) : null}
      {ok === "archived" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          工单已归档 / Ticket archived
        </div>
      ) : null}
      {ok === "deleted" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          工单已永久删除 / Ticket deleted permanently
        </div>
      ) : null}
      {ok === "parent-link-regenerated" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          家长时间表单链接已重生，当前工单已回到等待家长 / Parent availability link regenerated
        </div>
      ) : null}
      {ok === "coordination-waiting-parent-choice" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          已标记为等待家长确认候选时间 / Coordination ticket moved to waiting for the parent choice
        </div>
      ) : null}
      {ok === "coordination-waiting-teacher" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          已标记为等待老师例外确认 / Coordination ticket moved to waiting for teacher exception confirmation
        </div>
      ) : null}
      {ok === "scheduling-action-added" || ok === "scheduling-action-updated" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          排课动作已保存 / Scheduling action saved
        </div>
      ) : null}
      {ok === "existing-result-linked" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          已关联正式课表中的处理结果，并写入审计记录 / Existing schedule result linked and audited
        </div>
      ) : null}
      {ok === "scheduling-resolution-saved" ? (
        <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 10 }}>
          整张工单的实际处理结果已保存；动作与工单状态已自动更新。
        </div>
      ) : null}

      <section
        id="ticket-request"
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 14,
          padding: 16,
          background: "#fff",
          display: "grid",
          gap: 12,
          scrollMarginTop: 96,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ color: "#475569", fontSize: 12, fontWeight: 800 }}>Request / 家长需求</div>
            <div style={{ fontSize: 20, fontWeight: 850, marginTop: 4 }}>{row.studentName} · {normalizeTicketTypeValue(row.type)}</div>
          </div>
          <div style={{ color: overdue ? "#b91c1c" : "#475569", fontWeight: 750 }}>
            {row.nextActionDue ? `截止 ${formatBusinessDateTime(row.nextActionDue)}` : "无单独截止时间"}
          </div>
        </div>
        <div style={{ borderLeft: "4px solid #2563eb", paddingLeft: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 5 }}>家长原话或问题摘要</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
            {formatSchedulingCoordinationSystemText(asText(parsed.currentIssue || row.summary))}
          </div>
        </div>
        <div style={{ borderLeft: "4px solid #94a3b8", paddingLeft: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 5 }}>希望处理</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
            {formatSchedulingCoordinationSystemText(asText(parsed.requiredAction || row.nextAction))}
          </div>
        </div>
        {proofItems.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 12, fontWeight: 750 }}>附件 {proofItems.length} 个：</span>
            {proofItems.map((item, index) => {
              const href = normalizeProofUrl(item);
              const isLink = href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://");
              return isLink ? (
                <a key={`${row.id}-request-proof-${index}`} href={href} target="_blank" rel="noreferrer">
                  查看附件 {index + 1}
                </a>
              ) : (
                <span key={`${row.id}-request-proof-${index}`}>{item}</span>
              );
            })}
          </div>
        ) : null}
      </section>

      <section
        id="ticket-decision"
        style={{
          borderTop: "4px solid #0f766e",
          padding: "18px 0 4px",
          display: "grid",
          gap: 16,
          scrollMarginTop: 24,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ color: "#047857", fontSize: 12, fontWeight: 850 }}>{operationCard.laneLabel} · 当前只做这一步</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{operationCard.stepTitle}</div>
          <div style={{ color: "#475569", maxWidth: 880, lineHeight: 1.6 }}>{operationCard.stepDescription}</div>
        </div>

        {aiPlanResult ? (
          <div style={{ border: "1px solid #fdba74", borderRadius: 14, background: "#fff7ed", padding: 16, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#c2410c", fontSize: 12, fontWeight: 900 }}>AI处理建议 · 不直接修改正式数据</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                  {aiPlanResult.status === "READY" ? aiPlanResult.plan.workflowLabel : "让AI先读取整张工单"}
                </div>
              </div>
              {aiPlanResult.status === "READY" ? (
                <span style={{ borderRadius: 999, padding: "5px 10px", background: "#ffedd5", color: "#9a3412", fontSize: 12, fontWeight: 850 }}>
                  {aiPlanResult.plan.preparationStatus === "READY" ? "方案已准备" : aiPlanResult.plan.preparationStatus === "BLOCKED" ? "有条件待处理" : "待生成方案"}
                </span>
              ) : null}
            </div>

            {aiPlanResult.status === "READY" ? (
              <>
                <div style={{ borderLeft: "4px solid #ea580c", paddingLeft: 12, display: "grid", gap: 5 }}>
                  <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 800 }}>AI理解的完整业务指令</div>
                  <div style={{ fontWeight: 800, lineHeight: 1.65 }}>{aiPlanResult.plan.canonicalRequestText}</div>
                  <div style={{ color: aiPlanResult.plan.consistencyNeedsConfirmation ? "#b91c1c" : "#57534e", fontSize: 12 }}>
                    {aiPlanResult.plan.consistencyNeedsConfirmation
                      ? "正文与截图有差异：只确认冲突事实后再执行。"
                      : `已按同一份AI结果整理 · 识别参考 ${aiPlanResult.plan.confidencePercent}%`}
                  </div>
                </div>

                {aiPlanResult.plan.operations.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 900 }}>建议执行 {aiPlanResult.plan.operations.length} 项</div>
                    {aiPlanResult.plan.operations.slice(0, 12).map((operation) => {
                      const time = formatAiPlanDateTime(operation.startAt);
                      return (
                        <div key={`${operation.sequence}-${operation.commandType}-${operation.targetId ?? "new"}`} style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: 9, padding: "9px 11px" }}>
                          <b>{operation.sequence}. {AI_TICKET_COMMAND_LABELS[operation.commandType] ?? "人工核对操作"}</b>
                          {[time, operation.teacherName].filter(Boolean).length ? (
                            <span style={{ color: "#57534e", marginLeft: 8 }}>{[time, operation.teacherName].filter(Boolean).join(" · ")}</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {aiPlanResult.plan.blockers.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ color: "#991b1b", fontWeight: 900 }}>执行前还要处理</div>
                    {aiPlanResult.plan.blockers.map((blocker, index) => (
                      <div key={`${blocker.code}-${index}`} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 12px", display: "grid", gap: 3 }}>
                        <b>{blocker.title}</b>
                        <span style={{ color: "#57534e" }}>{blocker.detail}</span>
                        <span style={{ color: "#9a3412", fontSize: 12 }}>下一步：{blocker.action}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ color: aiPlanResult.status === "UNAVAILABLE" ? "#b91c1c" : "#57534e" }}>
                {aiPlanResult.message} 人工处理入口仍然可用。
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <form action={prepareAiTicketPlanAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="back" value={`${selfHref}#ticket-decision`} />
                <button type="submit" style={{ padding: "10px 15px", background: "#ea580c", color: "#fff", fontWeight: 850 }}>
                  {aiPlanResult.status === "READY" ? "按最新数据重新生成AI建议" : "让AI读取并生成建议"}
                </button>
              </form>
              <a href={aiOsTicketHref} style={{ fontWeight: 800 }}>在AI OS查看完整方案 →</a>
            </div>
            <div style={{ color: "#78716c", fontSize: 12 }}>
              AI只负责读取、核对和准备建议；前期不会自动落课、扣课时、改考勤、算工资或发送真实消息。
            </div>
          </div>
        ) : null}

        {isSchedulingTicket && !row.isArchived && !["Completed", "Cancelled"].includes(row.status) ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
              <div style={{ borderLeft: "4px solid #ea580c", padding: "12px 14px", display: "grid", gap: 8, background: "#fff7ed" }}>
                <div style={{ color: "#9a3412", fontSize: 12, fontWeight: 850 }}>方案一：继续由系统完成正式课表操作</div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>按AI建议，由员工正式执行</div>
                <div style={{ color: "#57534e", fontSize: 13 }}>先看上方AI整理的完整方案，再进入原系统完成最终核对，由系统继续正式执行。</div>
                <a href={formalExecutionHref} style={{ justifySelf: "start", padding: "10px 15px", borderRadius: 8, background: "#ea580c", color: "#fff", fontWeight: 850, textDecoration: "none" }}>
                  按AI建议进入人工确认 →
                </a>
              </div>
              <div style={{ borderLeft: "4px solid #0f766e", padding: "12px 14px", display: "grid", gap: 8, background: "#f0fdfa" }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>人工手动处理（始终保留）</div>
                <div style={{ color: "#475569", fontSize: 13 }}>AI不准确、暂时不可用或员工已有更可靠信息时，直接按原流程处理。</div>
                <a href={manualExecutionHref} style={{ justifySelf: "start", padding: "10px 15px", borderRadius: 8, border: "1px solid #0f766e", color: "#0f766e", fontWeight: 850, textDecoration: "none", background: "#fff" }}>
                  不采用AI，直接人工处理 →
                </a>
              </div>
            </div>

            <form
              action={resolveTicketSchedulingActionsAction}
              style={{
                borderTop: "1px solid #d6d3d1",
                paddingTop: 16,
                display: "grid",
                gap: 13,
              }}
            >
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="back" value={`${selfHref}#ticket-decision`} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>方案二：实际工作已经处理过，只核验一次</div>
                <div style={{ color: "#57534e", fontSize: 13, marginTop: 5 }}>
                  不需要再逐项填写。“已处理完成”和“无需处理”会写入不同审计结果，避免把未做的工作记成已执行。
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
                {TICKET_SCHEDULING_RESOLUTION_MODES.map((mode) => (
                  <label key={mode.value} style={{ border: "1px solid #a8a29e", borderRadius: 10, padding: 12, display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", background: "#fff" }}>
                    <input type="radio" name="resolutionMode" value={mode.value} required style={{ marginTop: 3 }} />
                    <span><b>{mode.label}</b><span style={{ display: "block", color: "#78716c", fontSize: 12, marginTop: 4 }}>{mode.description}</span></span>
                  </label>
                ))}
              </div>
              <details style={{ borderLeft: "3px solid #d6d3d1", paddingLeft: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>只有部分动作已完成？在这里选择具体动作</summary>
                {unresolvedSchedulingActions.length ? (
                  <div style={{ display: "grid", gap: 7, marginTop: 10, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
                    {unresolvedSchedulingActions.map((action, index) => (
                      <label key={action.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <input type="checkbox" name="resolvedActionId" value={action.id} style={{ marginTop: 3 }} />
                        <span>动作 {index + 1} · {schedulingActionDefinition(action.actionType)?.label ?? action.actionType}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#78716c", fontSize: 13, marginTop: 8 }}>这张旧工单没有结构化动作，可直接选择“已处理完成”或“无需处理”。</div>
                )}
              </details>
              <label style={{ fontWeight: 800 }}>
                一次性核验说明
                <textarea
                  name="resolutionNote"
                  rows={3}
                  required
                  placeholder="例如：Eva 已在学生课表完成改课并与家长确认；本工单为事后补录。"
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 5 }}
                />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input name="resolutionVerified" type="checkbox" value="1" required style={{ marginTop: 3 }} />
                <span>我已核对正式课表或真实沟通记录，确认不会造成重复排课、重复取消或漏处理。</span>
              </label>
              <button type="submit" style={{ justifySelf: "start", padding: "11px 18px", fontWeight: 850, background: "#0f766e", color: "#fff" }}>
                保存实际结果并自动更新工单
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ color: "#334155" }}>{operationCard.stepDescription}</div>
            <a href="#ticket-advanced" style={{ fontWeight: 800 }}>查看处理资料与状态 →</a>
          </div>
        )}
      </section>

      <details id="ticket-workflow" style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff", scrollMarginTop: 96 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>内部流程状态（高级）/ Internal workflow state</summary>
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
                ? `当前工单已超时，优先处理下一步：${formatSchedulingCoordinationSystemText(asText(row.nextAction))}`
                : `当前下一步：${formatSchedulingCoordinationSystemText(asText(row.nextAction))}`}
            </div>
          </div>
        </div>
      </details>

      {isSchedulingTicket ? (
        <details id="scheduling-actions" open={showFormalExecution} style={{ border: "1px solid #99f6e4", borderRadius: 14, padding: 14, background: "#f0fdfa", scrollMarginTop: 24 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900, fontSize: 18 }}>
            {executionGuide === "ai" ? "按AI建议人工确认并正式执行" : "人工手动执行（保留）"} · {unresolvedSchedulingActions.length} 个动作待处理
          </summary>
          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#047857", fontSize: 12, fontWeight: 800 }}>排课执行单 / Scheduling work order</div>
              <div style={{ fontSize: 20, fontWeight: 850, marginTop: 4 }}>
                {executionGuide === "ai" ? "员工核对AI建议后进入正式课表" : "按原有方式人工处理正式课表"}
              </div>
              <div style={{ color: "#57534e", fontSize: 13, marginTop: 6 }}>
                {executionGuide === "ai"
                  ? "AI建议不是执行结果；员工仍需核对课程、老师、日期、时间和课时影响，正式系统会再次检查权限与冲突。"
                  : "人工入口不会被AI替代；AI不可用或建议不准确时直接使用，仍执行原有课程、老师时间、冲突和权限校验。"}
              </div>
            </div>
            <a href={row.studentId ? `/admin/students/${row.studentId}#scheduling-coordination` : "/admin/schedule"} style={{ fontWeight: 750 }}>打开学生排课工作区 →</a>
          </div>

          {row.schedulingActions.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {row.schedulingActions.map((action, index) => {
                const definition = schedulingActionDefinition(action.actionType);
                const locked = ["APPLIED", "CANCELLED"].includes(action.status) || row.isArchived || ["Completed", "Cancelled"].includes(row.status);
                const executionParams = new URLSearchParams({
                  ticketId: row.id,
                  ticketActionId: action.id,
                  ticketActionType: action.actionType,
                  ticketReturn: `${selfHref}#scheduling-actions`,
                });
                if (action.sourceSessionId) executionParams.set("ticketSessionId", action.sourceSessionId);
                if (action.requestedTeacherId) executionParams.set("ticketRequestedTeacherId", action.requestedTeacherId);
                if (action.requestedStartAt) executionParams.set("quickStartAt", formatBusinessDateTime(action.requestedStartAt).replace(" ", "T"));
                if (action.durationMin) executionParams.set("quickDurationMin", String(action.durationMin));
                let executionHref = "";
                let executionLabel = "";
                if (!locked && row.studentId) {
                  if (action.actionType === "CREATE_SESSION") {
                    executionParams.set("focus", "quick-schedule");
                    executionParams.set("quickOpen", "1");
                    executionParams.set("quickMode", "create");
                    executionHref = `/admin/students/${row.studentId}?${executionParams.toString()}#quick-schedule`;
                    executionLabel = "安排新课程 / Schedule lesson";
                  } else if (action.actionType === "RESCHEDULE_SESSION" && action.sourceSessionId) {
                    executionParams.set("focus", "quick-schedule");
                    executionParams.set("quickOpen", "1");
                    executionParams.set("quickMode", "reschedule");
                    executionHref = `/admin/students/${row.studentId}?${executionParams.toString()}#quick-schedule`;
                    executionLabel = "修改这节课 / Reschedule lesson";
                  } else if (action.actionType === "CANCEL_SESSION" && action.sourceSessionId) {
                    executionHref = `/admin/students/${row.studentId}?${executionParams.toString()}#session-${action.sourceSessionId}`;
                    executionLabel = "处理取消或请假 / Process cancellation";
                  } else if (action.actionType === "REPLACE_TEACHER" && action.sourceSessionId) {
                    executionHref = `/admin/students/${row.studentId}?${executionParams.toString()}#session-${action.sourceSessionId}`;
                    executionLabel = "更换本节课老师 / Replace teacher";
                  } else if (action.actionType === "COORDINATE_ONLY") {
                    executionHref = studentCoordinationHref;
                    executionLabel = "进入排课协调 / Open coordination";
                  }
                }
                return (
                  <form key={action.id} action={updateTicketSchedulingActionAction} style={{ borderTop: "3px solid #292524", paddingTop: 12, display: "grid", gap: 12 }}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="actionId" value={action.id} />
                    <input type="hidden" name="back" value={`${selfHref}#scheduling-actions`} />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div><span style={{ color: "#9a3412", fontSize: 12, fontWeight: 800 }}>动作 {index + 1}</span><div style={{ fontWeight: 850, fontSize: 17 }}>{definition?.label ?? action.actionType}</div></div>
                      <span style={{ borderRadius: 999, padding: "5px 10px", background: action.status === "APPLIED" ? "#dcfce7" : action.status === "CONFLICT" ? "#fee2e2" : "#ffedd5", color: action.status === "APPLIED" ? "#166534" : action.status === "CONFLICT" ? "#991b1b" : "#9a3412", fontSize: 12, fontWeight: 800 }}>{schedulingActionStatusLabel(action.status)}</span>
                    </div>
                    {action.sourceSession ? (
                      <div style={{ borderLeft: "4px solid #ea580c", paddingLeft: 10 }}><div style={{ fontWeight: 750 }}>原课程：{formatBusinessDateTime(action.sourceSession.startAt)}–{formatBusinessTimeOnly(action.sourceSession.endAt)}</div><div style={{ color: "#57534e", fontSize: 13 }}>{action.sourceSession.class.course.name} · {action.sourceSession.teacher?.name ?? action.sourceSession.class.teacher.name}</div></div>
                    ) : definition?.needsSource ? <div style={{ color: "#b91c1c", fontWeight: 750 }}>还缺：选择要修改的原课程</div> : null}
                    {action.requestedStartAt || action.courseLabel || action.notes ? (
                      <div style={{ display: "grid", gap: 4, color: "#57534e", fontSize: 13 }}>
                        {action.requestedStartAt ? <div><b>希望时间：</b>{formatBusinessDateTime(action.requestedStartAt)}</div> : null}
                        {action.courseLabel ? <div><b>课程：</b>{action.courseLabel}</div> : null}
                        {action.notes ? <div style={{ whiteSpace: "pre-wrap" }}><b>补充说明：</b>{action.notes}</div> : null}
                      </div>
                    ) : null}
                    {!locked ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {executionHref ? (
                          <a
                            href={executionHref}
                            style={{
                              justifySelf: "start",
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: "#ea580c",
                              color: "#fff",
                              fontWeight: 850,
                              textDecoration: "none",
                            }}
                          >
                            {executionLabel} →
                          </a>
                        ) : (
                          <div style={{ color: "#b91c1c", fontWeight: 750 }}>
                            {row.studentId ? "请先在下方补充原课程或动作资料。" : "请先给工单关联正确学生。"}
                          </div>
                        )}
                        <details style={{ borderTop: "1px solid #fdba74", paddingTop: 10 }}>
                          <summary style={{ cursor: "pointer", color: "#7c2d12", fontWeight: 800 }}>
                            单项例外：补资料或修改等待状态
                          </summary>
                          <div style={{ color: "#78716c", fontSize: 12, marginTop: 7 }}>只有这一项与整张工单不同，或仍需正常执行时才打开。</div>
                          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 10 }}>
                            <label>原课程
                              <select name="sourceSessionId" defaultValue={action.sourceSessionId ?? ""} style={{ width: "100%" }}>
                                <option value="">{definition?.needsSource ? "请选择原课程" : "无需原课程"}</option>
                                {upcomingSessions.map((session) => <option key={session.id} value={session.id}>{formatBusinessDateTime(session.startAt)} · {session.class.course.name} · {session.teacher?.name ?? session.class.teacher.name}</option>)}
                              </select>
                            </label>
                            <label>本动作等待状态（仅异常时修改）
                              <select name="actionStatus" defaultValue={action.status} style={{ width: "100%" }}>
                                {TICKET_SCHEDULING_ACTION_STATUSES.filter((item) => item.value !== "APPLIED").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                              </select>
                            </label>
                            <label style={{ gridColumn: "1 / -1" }}>动作说明<textarea name="notes" rows={2} defaultValue={action.notes ?? ""} style={{ width: "100%", boxSizing: "border-box" }} /></label>
                            <button type="submit" formNoValidate>保存补充资料 / Save details</button>
                          </div>
                        </details>
                        {["CREATE_SESSION", "RESCHEDULE_SESSION", "CANCEL_SESSION", "REPLACE_TEACHER"].includes(action.actionType) ? (
                          <details style={{ borderTop: "1px solid #fdba74", paddingTop: 10 }}>
                            <summary style={{ cursor: "pointer", color: "#9a3412", fontWeight: 800 }}>
                              已在其他页面处理？关联已有结果
                            </summary>
                            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                              <div style={{ color: "#7c2d12", fontSize: 12 }}>
                                仅当正式课表已经完成对应操作时使用。系统会记录操作者、课程和核验备注；不要用它跳过尚未执行的改课或取消。
                              </div>
                              {action.actionType === "CREATE_SESSION" ? (
                                <label>
                                  实际新增课程
                                  <select name="existingResultSessionId" defaultValue="" style={{ width: "100%" }}>
                                    <option value="">请选择正式课表中的对应课程</option>
                                    {existingResultSessions.map((session) => (
                                      <option key={session.id} value={session.id}>
                                        {formatBusinessDateTime(session.startAt)} · {session.class.course.name} · {session.teacher?.name ?? session.class.teacher.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <div style={{ color: "#57534e", fontSize: 13 }}>
                                  核验对象固定为上方原课程，系统不会允许改选该学生的其他课程。
                                </div>
                              )}
                              <label>
                                核验备注
                                <textarea
                                  name="existingResultNote"
                                  rows={3}
                                  placeholder="说明在哪个页面、由谁、何时完成了处理，以及核对结果"
                                  style={{ width: "100%", boxSizing: "border-box" }}
                                />
                              </label>
                              <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <input name="existingResultVerified" type="checkbox" value="1" style={{ marginTop: 3 }} />
                                <span>我已核对正式课表，确认该动作已经实际完成，不会造成重复排课、重复取消或重复改课。</span>
                              </label>
                              <button type="submit" formAction={linkExistingSchedulingResultAction}>
                                关联已有结果并写入审计
                              </button>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ color: "#57534e", fontSize: 13 }}>该动作已经锁定；状态来自正式课表执行或员工核验补录。</div>
                    )}
                    {action.resultSession ? <div style={{ color: "#166534", fontWeight: 750 }}>执行结果：{formatBusinessDateTime(action.resultSession.startAt)} · {action.resultSession.class.course.name}</div> : null}
                  </form>
                );
              })}
            </div>
          ) : <div style={{ color: "#9a3412", fontWeight: 750 }}>这是一张旧工单，还没有结构化动作。请先添加一个动作；不会自动猜测历史文字。</div>}

          {!row.isArchived && !["Completed", "Cancelled"].includes(row.status) ? (
            <details style={{ borderTop: "1px solid #fdba74", paddingTop: 12 }}>
              <summary style={{ cursor: "pointer", color: "#9a3412", fontWeight: 800 }}>
                发现遗漏？补充另一个动作 / Add missing action
              </summary>
              <form action={addTicketSchedulingActionAction} style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                <input type="hidden" name="id" value={row.id} /><input type="hidden" name="back" value={`${selfHref}#scheduling-actions`} />
                <label>添加动作<select name="actionType" style={{ width: "100%" }}>{TICKET_SCHEDULING_ACTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label>原课程（改课/取消/换老师必选）<select name="sourceSessionId" style={{ width: "100%" }}><option value="">稍后补充</option>{upcomingSessions.map((session) => <option key={session.id} value={session.id}>{formatBusinessDateTime(session.startAt)} · {session.class.course.name}</option>)}</select></label>
                <label style={{ gridColumn: "1 / -1" }}>补充说明<textarea name="notes" rows={2} style={{ width: "100%", boxSizing: "border-box" }} /></label>
                <button type="submit">＋ 添加排课动作</button>
              </form>
            </details>
          ) : null}
          </div>
        </details>
      ) : null}

      <details id="ticket-advanced" style={{ border: "1px solid #cbd5e1", borderRadius: 14, padding: 14, background: "#f8fafc", scrollMarginTop: 96 }}>
        <summary style={{ cursor: "pointer", fontWeight: 850, fontSize: 16 }}>
          历史、状态与高级修改 / History, status and advanced edits
        </summary>
        <div style={{ marginTop: 14, color: "#475569", fontSize: 13 }}>
          日常排课不需要打开这里。仅用于查看完整资料、协调历史、修正录入错误、归档或处理例外。
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", marginTop: 14 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff", display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>详细信息 / Details</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", fontSize: 14 }}>
            <div><b>工单入口 / Request Entry</b>: {requestEntry}</div>
            <div><b>沟通渠道 / Communication Channel</b>: {asText(row.parentCommunicationSource)}</div>
            <div>
              <b>学生来源 / Student Source</b>: {row.student?.sourceChannel?.name ? (
                row.student.sourceChannel.name
              ) : row.studentId ? (
                <span style={{ color: "#b91c1c", fontWeight: 800 }}>
                  未设置 / Not set · <a href={`/admin/students/${encodeURIComponent(row.studentId)}#edit-student`}>打开学生档案补充</a>
                </span>
              ) : "未关联学生 / No linked student"}
            </div>
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
              <div><b>当前问题</b>: <span style={{ whiteSpace: "pre-wrap" }}>{formatSchedulingCoordinationSystemText(asText(parsed.currentIssue))}</span></div>
              <div><b>需要怎么做</b>: <span style={{ whiteSpace: "pre-wrap" }}>{formatSchedulingCoordinationSystemText(asText(parsed.requiredAction || row.nextAction))}</span></div>
              <div><b>最晚截止时间</b>: {parsed.latestDeadlineText || (row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "-")}</div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>地址或链接 / Address or Link</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>{asText(row.addressOrLink)}</div>
          </div>

          {row.parentAvailabilityRequest ? (
            <div id="coordination-console" style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#f8fbff", padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>排课协调控制台 / Scheduling Coordination Console</div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: row.parentAvailabilityRequest.submittedAt ? "#dcfce7" : "#fef3c7",
                    color: row.parentAvailabilityRequest.submittedAt ? "#166534" : "#92400e",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {row.parentAvailabilityRequest.submittedAt ? "家长已提交 / Parent submitted" : "等待家长 / Waiting for parent"}
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                <div><b>课程 / Course</b>: {asText(row.parentAvailabilityRequest.courseLabel)}</div>
              <div><b>最近提交 / Latest submission</b>: {row.parentAvailabilityRequest.submittedAt ? formatBusinessDateTime(row.parentAvailabilityRequest.submittedAt) : "-"}</div>
              <div><b>有效期 / Expires at</b>: {row.parentAvailabilityRequest.expiresAt ? formatBusinessDateTime(row.parentAvailabilityRequest.expiresAt) : "-"}</div>
              <div><b>下一步 / Next step</b>: {formatSchedulingCoordinationSystemText(row.nextAction || "-")}</div>
            </div>
            {coordinationPhase ? (
              <div style={{ ...coordinationPhaseToneStyle(coordinationPhase.key), borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>协调阶段 / Coordination phase</div>
                <div style={{ fontWeight: 800 }}>{coordinationPhase.title}</div>
                <div style={{ fontSize: 13 }}>{formatSchedulingCoordinationSystemText(coordinationPhase.description)}</div>
                <div style={{ fontSize: 13 }}><b>Suggested next step</b>: {formatSchedulingCoordinationSystemText(coordinationPhase.nextStep)}</div>
              </div>
            ) : null}
            {coordinationContext ? (
              <div style={{ border: "1px solid #dbeafe", borderRadius: 10, background: "#fff", padding: 10, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>availability 命中结果 / Availability-backed result</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {coordinationContext.teacherCount} teachers · {coordinationContext.durationMin} mins
                    </div>
                  </div>
                  {parentAvailabilityPayload ? (
                    coordinationContext.matchedParentSlots.length > 0 ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ color: "#166534", fontSize: 13 }}>
                          已找到 {coordinationContext.matchedParentSlots.length} 条符合家长提交时间的老师 availability，可直接发给家长确认。 /
                          {` ${coordinationContext.matchedParentSlots.length} matching availability-backed slot(s) are ready to send to the parent.`}
                        </div>
                        {coordinationContext.matchedParentSlots.map((slot) => (
                          <div key={`ticket-match-${slot.slotKey}`} style={{ border: "1px solid #bbf7d0", borderRadius: 10, padding: 10, background: "#f0fdf4", display: "grid", gap: 6 }}>
                            <div style={{ fontWeight: 800 }}>
                              {formatBusinessDateOnly(slot.startAt)} {formatBusinessTimeOnly(slot.startAt)}-{formatBusinessTimeOnly(slot.endAt)}
                            </div>
                            <div style={{ color: "#334155", fontSize: 13 }}>
                              {slot.teacherName}
                              {slot.teacherSubjectLabel ? ` | ${slot.teacherSubjectLabel}` : ""}
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <CopyTextButton
                                text={buildSchedulingCoordinationSlotShareText(slot, "default")}
                                label="复制发送文案 / Copy Message"
                                copiedLabel="已复制文案 / Copied"
                              />
                              {row.status !== "Waiting Parent" ? (
                                <form action={markCoordinationParentChoiceAction}>
                                  <input type="hidden" name="id" value={row.id} />
                                  <input type="hidden" name="back" value={coordinationConsoleHref} />
                                  <button type="submit">标记已发候选时间 / Mark options sent</button>
                                </form>
                              ) : null}
                              {studentCoordinationHref ? <a href={studentCoordinationHref}>打开学生协调页 / Open student coordination</a> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ color: "#b45309", fontSize: 13 }}>
                          当前没有命中家长提交偏好的 availability，建议先看最近替代时间；如果家长坚持特殊时间，再走老师例外确认。 /
                          No current availability matches the submitted parent preferences.
                        </div>
                        {coordinationContext.fallbackSlots.length > 0 ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            {coordinationContext.fallbackSlots.map((slot) => (
                              <div key={`ticket-alt-${slot.slotKey}`} style={{ border: "1px solid #fde68a", borderRadius: 10, padding: 10, background: "#fffbeb", display: "grid", gap: 6 }}>
                                <div style={{ fontWeight: 800 }}>
                                  {formatBusinessDateOnly(slot.startAt)} {formatBusinessTimeOnly(slot.startAt)}-{formatBusinessTimeOnly(slot.endAt)}
                                </div>
                                <div style={{ color: "#334155", fontSize: 13 }}>
                                  {slot.teacherName}
                                  {slot.teacherSubjectLabel ? ` | ${slot.teacherSubjectLabel}` : ""}
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <CopyTextButton
                                    text={buildSchedulingCoordinationSlotShareText(slot, "alternative")}
                                    label="复制替代文案 / Copy Alternative"
                                    copiedLabel="已复制文案 / Copied"
                                  />
                                  {row.status !== "Waiting Parent" ? (
                                    <form action={markCoordinationParentChoiceAction}>
                                      <input type="hidden" name="id" value={row.id} />
                                      <input type="hidden" name="back" value={coordinationConsoleHref} />
                                      <button type="submit">标记已发替代时间 / Mark alternatives sent</button>
                                    </form>
                                  ) : null}
                                  {row.status !== "Waiting Teacher" && row.status !== "Exception" ? (
                                    <form action={markCoordinationTeacherExceptionAction}>
                                      <input type="hidden" name="id" value={row.id} />
                                      <input type="hidden" name="back" value={coordinationConsoleHref} />
                                      <button type="submit">转老师例外确认 / Ask teacher exception</button>
                                    </form>
                                  ) : null}
                                  {studentCoordinationHref ? <a href={studentCoordinationHref}>打开学生协调页 / Open student coordination</a> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: "#475569", fontSize: 13 }}>
                            当前没找到可直接用的替代 availability。请保留工单并走老师例外确认。 / No direct alternative availability was found.
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      家长提交后，这里会直接显示 availability 命中结果和可复制的候选时间文案。 / Once the parent submits, this panel will show matching slot options here.
                    </div>
                  )}
                </div>
              ) : null}
              {parentAvailabilityRows.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>家长最近提交 / Latest parent submission</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                    {parentAvailabilityRows.map((item) => (
                      <div key={`${item.label}:${item.value}`} style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: 10 }}>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.label}</div>
                        <div style={{ fontWeight: 700, marginTop: 4, whiteSpace: "pre-wrap" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: "#475569", fontSize: 13 }}>
                  家长还没提交结构化时间偏好。先发链接，等家长提交后再根据老师 availability 继续排课。/ The parent has not submitted structured time preferences yet.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {parentAvailabilityHref ? (
                  <a href={parentAvailabilityHref} target="_blank" rel="noreferrer">
                    打开家长表单 / Open parent form
                  </a>
                ) : null}
                {parentAvailabilityHref ? (
                  <CopyTextButton
                    text={`https://sgtmanage.com${parentAvailabilityHref}`}
                    label="复制链接 / Copy Link"
                    copiedLabel="已复制链接 / Copied"
                  />
                ) : null}
                {parentAvailabilityShareText ? (
                  <CopyTextButton
                    text={parentAvailabilityShareText}
                    label="复制发送文案 / Copy Message"
                    copiedLabel="已复制文案 / Copied"
                  />
                ) : null}
                {studentCoordinationHref ? (
                  <a href={studentCoordinationHref}>
                    打开学生协调页 / Open student coordination
                  </a>
                ) : null}
                <form action={regenerateParentAvailabilityAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="back" value={coordinationConsoleHref} />
                  <button type="submit">重生家长链接 / Regenerate Link</button>
                </form>
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                默认规则：老师已提交的 availability 先作为可直接排课依据；只有家长要求时间不命中 availability 时，才回到老师做例外确认。/ Teacher availability stays the default scheduling source.
              </div>
            </div>
          ) : null}

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
          <div id="status-action" style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>状态操作 / Status Action</div>
            {row.isArchived ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "#334155" }}>当前工单已归档，只读查看。/ This ticket is archived and now read-only.</div>
                {canHardDeleteTicket ? (
                  <form action={deleteTicketAction} style={{ display: "grid", gap: 6 }}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="back" value={listBack} />
                    <button type="submit" style={{ background: "#7f1d1d", color: "#fff", borderColor: "#7f1d1d" }}>永久删除 / Delete Permanently</button>
                    <div style={{ fontSize: 12, color: "#7f1d1d" }}>仅 Zhao Hongwei 可用，且删除后不可恢复。/ Only Zhao Hongwei can use this and it cannot be undone.</div>
                  </form>
                ) : null}
              </div>
            ) : row.status === "Completed" || row.status === "Cancelled" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: row.status === "Cancelled" ? "#b45309" : "#166534", fontWeight: 700 }}>
                  {row.status === "Cancelled"
                    ? "已取消（可归档）/ Cancelled (Archivable)"
                    : "已完成（锁定，可归档）/ Completed (Locked, Archivable)"}
                </div>
                <form action={archiveTicketAction} style={{ display: "grid", gap: 8 }}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="back" value={statusSectionHref} />
                  <button type="submit">归档 / Archive</button>
                </form>
                {canHardDeleteTicket ? (
                  <form action={deleteTicketAction} style={{ display: "grid", gap: 6 }}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="back" value={listBack} />
                    <button type="submit" style={{ background: "#7f1d1d", color: "#fff", borderColor: "#7f1d1d" }}>永久删除 / Delete Permanently</button>
                    <div style={{ fontSize: 12, color: "#7f1d1d" }}>仅 Zhao Hongwei 可用，且删除后不可恢复。/ Only Zhao Hongwei can use this and it cannot be undone.</div>
                  </form>
                ) : null}
              </div>
            ) : (
              <form action={updateStatusAction} style={{ display: "grid", gap: 8 }}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="back" value={statusSectionHref} />
                <label>
                  下一状态 / Next Status
                  <select name="nextStatus" defaultValue={row.status} style={{ width: "100%", boxSizing: "border-box" }}>
                    {TICKET_STATUS_OPTIONS.filter(
                      (o) =>
                        canTransitionTicketStatus(row.status, o.value) &&
                        !(o.value === "Completed" && unresolvedSchedulingActions.length > 0)
                    ).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.zh} / {o.en}
                      </option>
                    ))}
                  </select>
                </label>
                {unresolvedSchedulingActions.length === 0 ? (
                  <label>
                    完成说明（仅完成时必填）/ Completion note
                    <textarea name="completionNote" rows={3} style={{ width: "100%", boxSizing: "border-box" }} />
                  </label>
                ) : (
                  <div style={{ color: "#9a3412", fontSize: 12, fontWeight: 750 }}>
                    仍有 {unresolvedSchedulingActions.length} 个动作待执行，完成状态由正式课表自动回写。
                  </div>
                )}
                <TicketStatusSubmitButton
                  label="保存状态 / Save Status"
                  promptLabel="标记完成前请先填写完成说明。 / Please add a completion note before marking this ticket completed."
                  missingNoteAlert="完成说明不能为空，本次未提交。 / Completion note is required, so nothing was submitted."
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </form>
            )}
          </div>

          {!row.isArchived && row.status !== "Completed" ? (
            <form id="ticket-edit" action={updateTicketFieldsAction} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#fff", display: "grid", gap: 10 }}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="back" value={ticketEditHref} />
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
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>工单入口 / Request Entry</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>{requestEntry}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>系统记录，只读，不随编辑覆盖。</div>
                </div>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>沟通渠道 / Communication Channel</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>{asText(row.parentCommunicationSource)}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>来自本次家长沟通记录。</div>
                </div>
                <div style={{ border: `1px solid ${row.student?.sourceChannel?.name ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "8px 10px", background: row.student?.sourceChannel?.name ? "#f0fdf4" : "#fef2f2" }}>
                  <div style={{ fontSize: 12, color: row.student?.sourceChannel?.name ? "#166534" : "#991b1b", fontWeight: 700 }}>学生来源 / Student Source</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>{row.student?.sourceChannel?.name || "未设置 / Not set"}</div>
                  {row.studentId && !row.student?.sourceChannel?.name ? <a href={`/admin/students/${encodeURIComponent(row.studentId)}#edit-student`} style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 800 }}>打开学生档案补充</a> : null}
                </div>
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
                  老师{template.requiredFields.includes("teacher") ? "*" : ""}
                  <input
                    name="teacher"
                    required={template.requiredFields.includes("teacher")}
                    defaultValue={row.teacher ?? ""}
                    placeholder={
                      template.requiredFields.includes("teacher") || template.suggestedFields.includes("teacher")
                        ? "填写当前老师、目标老师或主要老师"
                        : ""
                    }
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
      </details>
    </div>
  );
}

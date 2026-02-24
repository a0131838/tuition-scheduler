import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";

const BIZ_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const PAYROLL_RATE_FALLBACK_KEY = "teacher_payroll_rates_v1";
const PAYROLL_PUBLISH_FALLBACK_KEY = "teacher_payroll_publish_v1";

export type PayrollRange = {
  start: Date;
  end: Date;
};

export type PayrollBreakdownRow = {
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  subjectId: string | null;
  subjectName: string | null;
  levelId: string | null;
  levelName: string | null;
  sessionCount: number;
  totalMinutes: number;
  totalHours: number;
  hourlyRateCents: number;
  amountCents: number;
};

export type PayrollTeacherSummary = {
  teacherId: string;
  teacherName: string;
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  totalAmountCents: number;
  completedSessions: number;
  pendingSessions: number;
};

export type PayrollRateEditorRow = {
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  subjectId: string | null;
  subjectName: string | null;
  levelId: string | null;
  levelName: string | null;
  hourlyRateCents: number;
  matchedSessions: number;
  matchedHours: number;
};

export type PayrollTeacherDetailComboRow = {
  courseId: string;
  courseName: string;
  subjectId: string | null;
  subjectName: string | null;
  levelId: string | null;
  levelName: string | null;
  sessionCount: number;
  totalMinutes: number;
  totalHours: number;
  hourlyRateCents: number;
  amountCents: number;
};

export type PayrollTeacherDetailSessionRow = {
  sessionId: string;
  startAt: Date;
  endAt: Date;
  studentName: string;
  studentSessionCount: number;
  courseName: string;
  subjectName: string | null;
  levelName: string | null;
  totalMinutes: number;
  totalHours: number;
  hourlyRateCents: number;
  amountCents: number;
  isCompleted: boolean;
};

type PayrollRateItem = {
  teacherId: string;
  courseId: string;
  subjectId: string | null;
  levelId: string | null;
  hourlyRateCents: number;
};

export type PayrollScope = "all" | "completed";

export type PayrollPublishItem = {
  teacherId: string;
  month: string;
  scope: PayrollScope;
  sentAt: string;
  confirmedAt: string | null;
  managerApprovedBy: string[];
  managerApprovedAt: string | null;
  financePaidAt: string | null;
  financePaidBy: string | null;
  financeConfirmedAt: string | null;
  financeRejectedAt: string | null;
  financeRejectedBy: string | null;
  financeRejectReason: string | null;
};

export function parseMonth(s?: string | null) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function bizMidnightUtc(year: number, month1to12: number, day: number) {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0) - BIZ_UTC_OFFSET_MS);
}

export function toPayrollRange(month: string): PayrollRange | null {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const prevYear = parsed.month === 1 ? parsed.year - 1 : parsed.year;
  const prevMonth = parsed.month === 1 ? 12 : parsed.month - 1;
  const start = bizMidnightUtc(prevYear, prevMonth, 15);
  const end = bizMidnightUtc(parsed.year, parsed.month, 15);
  return { start, end };
}

function normalizePayrollScope(scope?: string | null): PayrollScope {
  return scope === "completed" ? "completed" : "all";
}

function payrollPublishKey(teacherId: string, month: string, scope: PayrollScope) {
  return `${teacherId}__${month}__${scope}`;
}

function comboKey(teacherId: string, courseId: string, subjectId: string | null, levelId: string | null) {
  return `${teacherId}__${courseId}__${subjectId ?? ""}__${levelId ?? ""}`;
}

function toHours(totalMinutes: number) {
  return Number((totalMinutes / 60).toFixed(2));
}

function resolveRateCents(
  rateMap: Map<string, number>,
  teacherId: string,
  courseId: string,
  subjectId: string | null,
  levelId: string | null
) {
  const exact = rateMap.get(comboKey(teacherId, courseId, subjectId, levelId));
  if (typeof exact === "number") return exact;
  if (levelId) {
    const noLevel = rateMap.get(comboKey(teacherId, courseId, subjectId, null));
    if (typeof noLevel === "number") return noLevel;
  }
  if (subjectId || levelId) {
    const courseOnly = rateMap.get(comboKey(teacherId, courseId, null, null));
    if (typeof courseOnly === "number") return courseOnly;
  }
  return 0;
}

function isMissingRateTableError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

function parseFallbackRateItems(raw: string | null): PayrollRateItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PayrollRateItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const x = item as Record<string, unknown>;
      const teacherId = typeof x.teacherId === "string" ? x.teacherId : "";
      const courseId = typeof x.courseId === "string" ? x.courseId : "";
      const subjectId = typeof x.subjectId === "string" && x.subjectId.trim() ? x.subjectId : null;
      const levelId = typeof x.levelId === "string" && x.levelId.trim() ? x.levelId : null;
      const hourlyRateCents = Number(x.hourlyRateCents);
      if (!teacherId || !courseId || !Number.isFinite(hourlyRateCents) || hourlyRateCents < 0) continue;
      out.push({
        teacherId,
        courseId,
        subjectId,
        levelId,
        hourlyRateCents: Math.round(hourlyRateCents),
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function loadFallbackRateItems() {
  const row = await prisma.appSetting.findUnique({
    where: { key: PAYROLL_RATE_FALLBACK_KEY },
    select: { value: true },
  });
  return parseFallbackRateItems(row?.value ?? null);
}

function parsePayrollPublishItems(raw: string | null): PayrollPublishItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PayrollPublishItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const x = item as Record<string, unknown>;
      const teacherId = typeof x.teacherId === "string" ? x.teacherId : "";
      const month = typeof x.month === "string" ? x.month : "";
      const scope = normalizePayrollScope(typeof x.scope === "string" ? x.scope : "all");
      const sentAt = typeof x.sentAt === "string" ? x.sentAt : "";
      const confirmedAt = typeof x.confirmedAt === "string" && x.confirmedAt.trim() ? x.confirmedAt : null;
      const managerApprovedBy = Array.isArray(x.managerApprovedBy)
        ? x.managerApprovedBy.map((v) => String(v ?? "").trim().toLowerCase()).filter(Boolean)
        : [];
      const managerApprovedAt = typeof x.managerApprovedAt === "string" && x.managerApprovedAt.trim() ? x.managerApprovedAt : null;
      const financePaidAt = typeof x.financePaidAt === "string" && x.financePaidAt.trim() ? x.financePaidAt : null;
      const financePaidBy = typeof x.financePaidBy === "string" && x.financePaidBy.trim() ? x.financePaidBy : null;
      const financeConfirmedAt =
        typeof x.financeConfirmedAt === "string" && x.financeConfirmedAt.trim() ? x.financeConfirmedAt : null;
      const financeRejectedAt =
        typeof x.financeRejectedAt === "string" && x.financeRejectedAt.trim() ? x.financeRejectedAt : null;
      const financeRejectedBy =
        typeof x.financeRejectedBy === "string" && x.financeRejectedBy.trim() ? x.financeRejectedBy.trim().toLowerCase() : null;
      const financeRejectReason =
        typeof x.financeRejectReason === "string" && x.financeRejectReason.trim() ? x.financeRejectReason.trim() : null;
      if (!teacherId || !parseMonth(month) || !sentAt) continue;
      out.push({
        teacherId,
        month,
        scope,
        sentAt,
        confirmedAt,
        managerApprovedBy,
        managerApprovedAt,
        financePaidAt,
        financePaidBy,
        financeConfirmedAt,
        financeRejectedAt,
        financeRejectedBy,
        financeRejectReason,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function loadPayrollPublishItems() {
  const row = await prisma.appSetting.findUnique({
    where: { key: PAYROLL_PUBLISH_FALLBACK_KEY },
    select: { value: true },
  });
  return parsePayrollPublishItems(row?.value ?? null);
}

async function savePayrollPublishItems(items: PayrollPublishItem[]) {
  await prisma.appSetting.upsert({
    where: { key: PAYROLL_PUBLISH_FALLBACK_KEY },
    update: { value: JSON.stringify(items) },
    create: {
      key: PAYROLL_PUBLISH_FALLBACK_KEY,
      value: JSON.stringify(items),
    },
  });
}

export async function markTeacherPayrollSent(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  actorEmail?: string | null;
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month)) return false;
  const actorEmail = (input.actorEmail ?? "").trim().toLowerCase();
  const canOverridePaid = actorEmail === "zhaohongwei0880@gmail.com";

  const now = new Date().toISOString();
  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (existing) {
    if (existing.financePaidAt && !canOverridePaid) return false;
    existing.sentAt = now;
  } else {
    items.push({
      teacherId: input.teacherId,
      month: input.month,
      scope,
      sentAt: now,
      confirmedAt: null,
      managerApprovedBy: [],
      managerApprovedAt: null,
      financePaidAt: null,
      financePaidBy: null,
      financeConfirmedAt: null,
      financeRejectedAt: null,
      financeRejectedBy: null,
      financeRejectReason: null,
    });
  }
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "TEACHER_PAYROLL",
    action: "SEND",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope },
  });
  return true;
}

export async function revokeTeacherPayrollSent(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  actorEmail?: string | null;
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month)) return false;
  const actorEmail = (input.actorEmail ?? "").trim().toLowerCase();
  const canOverridePaid = actorEmail === "zhaohongwei0880@gmail.com";

  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const items = await loadPayrollPublishItems();
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  if (existing.financePaidAt && !canOverridePaid) return false;
  const next = items.filter((x) => payrollPublishKey(x.teacherId, x.month, x.scope) !== key);
  await savePayrollPublishItems(next);
  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "TEACHER_PAYROLL",
    action: "REVOKE_SEND",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope },
  });
  return true;
}

export async function confirmTeacherPayroll(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  actorEmail?: string | null;
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month)) return false;

  const now = new Date().toISOString();
  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  existing.confirmedAt = now;
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.actorEmail, role: "TEACHER" },
    module: "TEACHER_PAYROLL",
    action: "TEACHER_CONFIRM",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope },
  });
  return true;
}

export async function managerApproveTeacherPayroll(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  approverEmail: string;
  allManagerApproverEmails: string[];
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month) || !input.approverEmail) return false;
  const normalizedApprover = input.approverEmail.trim().toLowerCase();

  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  if (!existing.confirmedAt) return false;

  existing.managerApprovedBy = Array.from(new Set([...(existing.managerApprovedBy ?? []), normalizedApprover]));
  const allManagers = Array.from(new Set((input.allManagerApproverEmails ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean)));
  if (allManagers.length > 0 && allManagers.every((x) => existing.managerApprovedBy.includes(x))) {
    existing.managerApprovedAt = new Date().toISOString();
  }
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.approverEmail, role: "ADMIN" },
    module: "TEACHER_PAYROLL",
    action: "MANAGER_APPROVE",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope, approvedBy: input.approverEmail },
  });
  return true;
}

export async function financeMarkTeacherPayrollPaid(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  financeEmail: string;
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month) || !input.financeEmail) return false;
  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  if (!existing.managerApprovedAt) return false;
  if (!existing.financeConfirmedAt) return false;
  existing.financePaidAt = new Date().toISOString();
  existing.financePaidBy = input.financeEmail.trim().toLowerCase();
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.financeEmail, role: "FINANCE" },
    module: "TEACHER_PAYROLL",
    action: "FINANCE_MARK_PAID",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope },
  });
  return true;
}

export async function financeConfirmTeacherPayroll(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  financeEmail?: string | null;
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month)) return false;
  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  if (!existing.managerApprovedAt) return false;
  const hadLegacyPaidWithoutConfirm = Boolean(existing.financePaidAt) && !existing.financeConfirmedAt;
  existing.financeConfirmedAt = new Date().toISOString();
  if (hadLegacyPaidWithoutConfirm) {
    existing.financePaidAt = null;
    existing.financePaidBy = null;
  }
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.financeEmail, role: "FINANCE" },
    module: "TEACHER_PAYROLL",
    action: "FINANCE_CONFIRM",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope },
  });
  return true;
}

export async function financeFinalizeTeacherPayroll(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  financeEmail: string;
  allManagerApproverEmails?: string[];
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month) || !input.financeEmail) return false;
  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  if (!existing.managerApprovedAt) {
    const requiredManagers = Array.from(
      new Set((input.allManagerApproverEmails ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean))
    );
    const approvedManagers = Array.from(new Set((existing.managerApprovedBy ?? []).map((x) => x.trim().toLowerCase())));
    const allManagersApproved =
      requiredManagers.length > 0 && requiredManagers.every((x) => approvedManagers.includes(x));
    if (!allManagersApproved) return false;
    existing.managerApprovedAt = new Date().toISOString();
  }
  const now = new Date().toISOString();
  existing.financePaidAt = existing.financePaidAt ?? now;
  existing.financePaidBy = input.financeEmail.trim().toLowerCase();
  existing.financeConfirmedAt = now;
  existing.financeRejectedAt = null;
  existing.financeRejectedBy = null;
  existing.financeRejectReason = null;
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.financeEmail, role: "FINANCE" },
    module: "TEACHER_PAYROLL",
    action: "FINANCE_FINALIZE",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope },
  });
  return true;
}

export async function financeRejectTeacherPayroll(input: {
  teacherId: string;
  month: string;
  scope?: string | null;
  financeEmail: string;
  reason: string;
}) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month) || !input.financeEmail || !input.reason.trim()) return false;
  const items = await loadPayrollPublishItems();
  const key = payrollPublishKey(input.teacherId, input.month, scope);
  const existing = items.find((x) => payrollPublishKey(x.teacherId, x.month, x.scope) === key);
  if (!existing) return false;
  if (!existing.managerApprovedAt) return false;
  existing.financePaidAt = null;
  existing.financePaidBy = null;
  existing.financeConfirmedAt = null;
  existing.financeRejectedAt = new Date().toISOString();
  existing.financeRejectedBy = input.financeEmail.trim().toLowerCase();
  existing.financeRejectReason = input.reason.trim();
  await savePayrollPublishItems(items);
  await logAudit({
    actor: { email: input.financeEmail, role: "FINANCE" },
    module: "TEACHER_PAYROLL",
    action: "FINANCE_REJECT",
    entityType: "TeacherPayroll",
    entityId: `${input.teacherId}:${input.month}:${scope}`,
    meta: { teacherId: input.teacherId, month: input.month, scope, reason: input.reason.trim() },
  });
  return true;
}

export async function getTeacherPayrollPublishStatus(month: string, scopeInput?: string | null) {
  const scope = normalizePayrollScope(scopeInput);
  if (!parseMonth(month)) return new Map<string, PayrollPublishItem>();
  const items = await loadPayrollPublishItems();
  const out = new Map<string, PayrollPublishItem>();
  for (const item of items) {
    if (item.month !== month) continue;
    if (item.scope !== scope) continue;
    out.set(item.teacherId, item);
  }
  return out;
}

export async function getTeacherPayrollPublishForTeacher(input: { teacherId: string; month: string; scope?: string | null }) {
  const scope = normalizePayrollScope(input.scope);
  if (!input.teacherId || !parseMonth(input.month)) return null;
  const items = await loadPayrollPublishItems();
  return (
    items.find((x) => x.teacherId === input.teacherId && x.month === input.month && x.scope === scope) ?? null
  );
}

async function saveFallbackRateItem(nextItem: PayrollRateItem) {
  const items = await loadFallbackRateItems();
  const key = comboKey(nextItem.teacherId, nextItem.courseId, nextItem.subjectId, nextItem.levelId);
  const deduped = items.filter(
    (item) => comboKey(item.teacherId, item.courseId, item.subjectId, item.levelId) !== key
  );
  deduped.push(nextItem);
  await prisma.appSetting.upsert({
    where: { key: PAYROLL_RATE_FALLBACK_KEY },
    update: { value: JSON.stringify(deduped) },
    create: {
      key: PAYROLL_RATE_FALLBACK_KEY,
      value: JSON.stringify(deduped),
    },
  });
}

export async function upsertTeacherPayrollRate(input: PayrollRateItem) {
  const subjectKey = input.subjectId ?? "";
  const levelKey = input.levelId ?? "";
  try {
    await prisma.teacherCourseRate.upsert({
      where: {
        teacherId_courseId_subjectKey_levelKey: {
          teacherId: input.teacherId,
          courseId: input.courseId,
          subjectKey,
          levelKey,
        },
      },
      update: { hourlyRateCents: input.hourlyRateCents },
      create: {
        teacherId: input.teacherId,
        courseId: input.courseId,
        subjectId: input.subjectId,
        levelId: input.levelId,
        subjectKey,
        levelKey,
        hourlyRateCents: input.hourlyRateCents,
      },
    });
    return;
  } catch (err) {
    if (!isMissingRateTableError(err)) throw err;
  }
  await saveFallbackRateItem(input);
}

export async function loadTeacherPayroll(month: string, scopeInput?: string | null) {
  const scope = normalizePayrollScope(scopeInput);
  const range = toPayrollRange(month);
  if (!range) return null;

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: range.start, lt: range.end },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      class: {
        select: {
          teacher: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
        },
      },
      attendances: { select: { status: true } },
      feedbacks: { select: { teacherId: true, content: true } },
    },
    orderBy: { startAt: "asc" },
    take: 10000,
  });

  const teacherIds = new Set<string>();
  for (const s of sessions) {
    const effectiveTeacher = s.teacher ?? s.class.teacher;
    if (effectiveTeacher?.id) teacherIds.add(effectiveTeacher.id);
  }

  let rates: Array<{
    teacherId: string;
    courseId: string;
    subjectId: string | null;
    levelId: string | null;
    hourlyRateCents: number;
    teacher: { id: string; name: string };
    course: { id: string; name: string };
    subject: { id: string; name: string } | null;
    level: { id: string; name: string } | null;
  }> = [];
  let loadedFromTable = true;

  try {
    rates = await prisma.teacherCourseRate.findMany({
      where: {
        teacherId: { in: Array.from(teacherIds) },
      },
      include: {
        teacher: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        level: { select: { id: true, name: true } },
      },
      orderBy: [{ teacher: { name: "asc" } }, { course: { name: "asc" } }],
    });
  } catch (err) {
    if (!isMissingRateTableError(err)) throw err;
    loadedFromTable = false;
    const fallbackRates = await loadFallbackRateItems();

    const teacherMap = new Map<string, { id: string; name: string }>();
    const courseMap = new Map<string, { id: string; name: string }>();
    const subjectMap = new Map<string, { id: string; name: string }>();
    const levelMap = new Map<string, { id: string; name: string }>();

    for (const s of sessions) {
      const effectiveTeacher = s.teacher ?? s.class.teacher;
      if (effectiveTeacher) teacherMap.set(effectiveTeacher.id, effectiveTeacher);
      courseMap.set(s.class.course.id, s.class.course);
      if (s.class.subject) subjectMap.set(s.class.subject.id, s.class.subject);
      if (s.class.level) levelMap.set(s.class.level.id, s.class.level);
    }

    rates = fallbackRates
      .map((r) => {
        const teacher = teacherMap.get(r.teacherId);
        const course = courseMap.get(r.courseId);
        if (!teacher || !course) return null;
        return {
          teacherId: r.teacherId,
          courseId: r.courseId,
          subjectId: r.subjectId,
          levelId: r.levelId,
          hourlyRateCents: r.hourlyRateCents,
          teacher,
          course,
          subject: r.subjectId ? subjectMap.get(r.subjectId) ?? null : null,
          level: r.levelId ? levelMap.get(r.levelId) ?? null : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  const rateMap = new Map<string, number>();
  for (const r of rates) {
    rateMap.set(comboKey(r.teacherId, r.courseId, r.subjectId, r.levelId), r.hourlyRateCents);
  }

  const breakdownByCombo = new Map<string, PayrollBreakdownRow>();
  const teacherTotals = new Map<string, PayrollTeacherSummary>();

  for (const s of sessions) {
    const effectiveTeacher = s.teacher ?? s.class.teacher;
    if (!effectiveTeacher) continue;
    const completed = isSessionCompleted(
      {
        teacherId: s.teacherId ?? null,
        class: { teacherId: s.class.teacher.id },
        attendances: s.attendances,
        feedbacks: s.feedbacks,
      },
      effectiveTeacher.id
    );
    if (scope === "completed" && !completed) continue;

    const totalMinutes = Math.max(0, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000));
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) continue;

    const courseId = s.class.course.id;
    const courseName = s.class.course.name;
    const subjectId = s.class.subject?.id ?? null;
    const subjectName = s.class.subject?.name ?? null;
    const levelId = s.class.level?.id ?? null;
    const levelName = s.class.level?.name ?? null;

    const hourlyRateCents = resolveRateCents(rateMap, effectiveTeacher.id, courseId, subjectId, levelId);
    const amountCents = Math.round((totalMinutes * hourlyRateCents) / 60);

    const key = comboKey(effectiveTeacher.id, courseId, subjectId, levelId);
    const prev = breakdownByCombo.get(key);
    if (prev) {
      prev.sessionCount += 1;
      prev.totalMinutes += totalMinutes;
      prev.totalHours = toHours(prev.totalMinutes);
      prev.amountCents += amountCents;
    } else {
      breakdownByCombo.set(key, {
        teacherId: effectiveTeacher.id,
        teacherName: effectiveTeacher.name,
        courseId,
        courseName,
        subjectId,
        subjectName,
        levelId,
        levelName,
        sessionCount: 1,
        totalMinutes,
        totalHours: toHours(totalMinutes),
        hourlyRateCents,
        amountCents,
      });
    }

    const teacherPrev = teacherTotals.get(effectiveTeacher.id);
    if (teacherPrev) {
      teacherPrev.totalSessions += 1;
      teacherPrev.totalMinutes += totalMinutes;
      teacherPrev.totalHours = toHours(teacherPrev.totalMinutes);
      teacherPrev.totalAmountCents += amountCents;
      if (completed) teacherPrev.completedSessions += 1;
      else teacherPrev.pendingSessions += 1;
    } else {
      teacherTotals.set(effectiveTeacher.id, {
        teacherId: effectiveTeacher.id,
        teacherName: effectiveTeacher.name,
        totalSessions: 1,
        totalMinutes,
        totalHours: toHours(totalMinutes),
        totalAmountCents: amountCents,
        completedSessions: completed ? 1 : 0,
        pendingSessions: completed ? 0 : 1,
      });
    }
  }

  const breakdownRows = Array.from(breakdownByCombo.values()).sort((a, b) => {
    if (a.teacherName !== b.teacherName) return a.teacherName.localeCompare(b.teacherName);
    if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
    const aSubject = a.subjectName ?? "";
    const bSubject = b.subjectName ?? "";
    if (aSubject !== bSubject) return aSubject.localeCompare(bSubject);
    return (a.levelName ?? "").localeCompare(b.levelName ?? "");
  });

  const summaryRows = Array.from(teacherTotals.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  const rateEditorMap = new Map<string, PayrollRateEditorRow>();
  for (const row of breakdownRows) {
    rateEditorMap.set(comboKey(row.teacherId, row.courseId, row.subjectId, row.levelId), {
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      courseId: row.courseId,
      courseName: row.courseName,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      levelId: row.levelId,
      levelName: row.levelName,
      hourlyRateCents: row.hourlyRateCents,
      matchedSessions: row.sessionCount,
      matchedHours: row.totalHours,
    });
  }

  for (const r of rates) {
    const key = comboKey(r.teacherId, r.courseId, r.subjectId, r.levelId);
    if (!rateEditorMap.has(key)) {
      rateEditorMap.set(key, {
        teacherId: r.teacherId,
        teacherName: r.teacher.name,
        courseId: r.courseId,
        courseName: r.course.name,
        subjectId: r.subjectId,
        subjectName: r.subject?.name ?? null,
        levelId: r.levelId,
        levelName: r.level?.name ?? null,
        hourlyRateCents: r.hourlyRateCents,
        matchedSessions: 0,
        matchedHours: 0,
      });
    }
  }

  const rateEditorRows = Array.from(rateEditorMap.values()).sort((a, b) => {
    if (a.teacherName !== b.teacherName) return a.teacherName.localeCompare(b.teacherName);
    if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
    const aSubject = a.subjectName ?? "";
    const bSubject = b.subjectName ?? "";
    if (aSubject !== bSubject) return aSubject.localeCompare(bSubject);
    return (a.levelName ?? "").localeCompare(b.levelName ?? "");
  });

  const grandTotalAmountCents = summaryRows.reduce((acc, row) => acc + row.totalAmountCents, 0);
  const grandTotalHours = Number(summaryRows.reduce((acc, row) => acc + row.totalHours, 0).toFixed(2));

  return {
    range,
    breakdownRows,
    summaryRows,
    rateEditorRows,
    grandTotalAmountCents,
    grandTotalHours,
    scope,
    usingRateFallback: !loadedFromTable,
  };
}

function resolveSessionStudentName(session: {
  student?: { name: string } | null;
  class: {
    oneOnOneStudent?: { name: string } | null;
    enrollments?: Array<{ student: { name: string } }>;
  };
}) {
  if (session.student?.name) return session.student.name;
  if (session.class.oneOnOneStudent?.name) return session.class.oneOnOneStudent.name;
  const names = (session.class.enrollments ?? []).map((e) => e.student.name).filter(Boolean);
  if (names.length === 0) return "-";
  if (names.length === 1) return names[0];
  return names.join(", ");
}

function isSessionCompleted(
  session: {
    teacherId: string | null;
    class: { teacherId: string };
    attendances: Array<{ status: string }>;
    feedbacks: Array<{ teacherId: string; content: string }>;
  },
  teacherId: string
) {
  if (!session.attendances.length) return false;
  const allMarked = session.attendances.every((a) => a.status !== "UNMARKED");
  if (!allMarked) return false;
  const effectiveTeacherId = session.teacherId ?? session.class.teacherId;
  const feedbackTeacherId = effectiveTeacherId || teacherId;
  const hasFeedback = session.feedbacks.some((f) => f.teacherId === feedbackTeacherId && String(f.content ?? "").trim().length > 0);
  return hasFeedback;
}

export async function loadTeacherPayrollDetail(month: string, teacherId: string, scopeInput?: string | null) {
  const scope = normalizePayrollScope(scopeInput);
  const range = toPayrollRange(month);
  if (!range) return null;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, name: true },
  });
  if (!teacher) return null;

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: range.start, lt: range.end },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
    },
    include: {
      student: { select: { name: true } },
      class: {
        select: {
          teacherId: true,
          oneOnOneStudent: { select: { name: true } },
          enrollments: { include: { student: { select: { name: true } } } },
          course: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
        },
      },
      attendances: { select: { status: true } },
      feedbacks: { select: { teacherId: true, content: true } },
    },
    orderBy: { startAt: "asc" },
    take: 10000,
  });

  let rates: Array<{
    teacherId: string;
    courseId: string;
    subjectId: string | null;
    levelId: string | null;
    hourlyRateCents: number;
  }> = [];
  let loadedFromTable = true;
  try {
    rates = await prisma.teacherCourseRate.findMany({
      where: { teacherId },
      select: {
        teacherId: true,
        courseId: true,
        subjectId: true,
        levelId: true,
        hourlyRateCents: true,
      },
    });
  } catch (err) {
    if (!isMissingRateTableError(err)) throw err;
    loadedFromTable = false;
    rates = (await loadFallbackRateItems()).filter((r) => r.teacherId === teacherId);
  }

  const rateMap = new Map<string, number>();
  for (const r of rates) {
    rateMap.set(comboKey(r.teacherId, r.courseId, r.subjectId, r.levelId), r.hourlyRateCents);
  }

  const comboMap = new Map<string, PayrollTeacherDetailComboRow>();
  const sessionRows: PayrollTeacherDetailSessionRow[] = [];
  let totalMinutes = 0;
  let totalAmountCents = 0;

  for (const s of sessions) {
    const effectiveTeacherId = s.teacherId ?? s.class.teacherId;
    if (effectiveTeacherId !== teacherId) continue;
    const completed = isSessionCompleted(s, teacherId);
    if (scope === "completed" && !completed) continue;

    const minutes = Math.max(0, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000));
    if (!minutes) continue;

    const courseId = s.class.course.id;
    const courseName = s.class.course.name;
    const subjectId = s.class.subject?.id ?? null;
    const subjectName = s.class.subject?.name ?? null;
    const levelId = s.class.level?.id ?? null;
    const levelName = s.class.level?.name ?? null;
    const hourlyRateCents = resolveRateCents(rateMap, teacherId, courseId, subjectId, levelId);
    const amountCents = Math.round((minutes * hourlyRateCents) / 60);

    const key = comboKey(teacherId, courseId, subjectId, levelId);
    const prev = comboMap.get(key);
    if (prev) {
      prev.sessionCount += 1;
      prev.totalMinutes += minutes;
      prev.totalHours = toHours(prev.totalMinutes);
      prev.amountCents += amountCents;
    } else {
      comboMap.set(key, {
        courseId,
        courseName,
        subjectId,
        subjectName,
        levelId,
        levelName,
        sessionCount: 1,
        totalMinutes: minutes,
        totalHours: toHours(minutes),
        hourlyRateCents,
        amountCents,
      });
    }

    sessionRows.push({
      sessionId: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      studentName: resolveSessionStudentName(s),
      studentSessionCount: 0,
      courseName,
      subjectName,
      levelName,
      totalMinutes: minutes,
      totalHours: toHours(minutes),
      hourlyRateCents,
      amountCents,
      isCompleted: completed,
    });

    totalMinutes += minutes;
    totalAmountCents += amountCents;
  }

  const studentSessionCountMap = new Map<string, number>();
  for (const row of sessionRows) {
    studentSessionCountMap.set(row.studentName, (studentSessionCountMap.get(row.studentName) ?? 0) + 1);
  }
  for (const row of sessionRows) {
    row.studentSessionCount = studentSessionCountMap.get(row.studentName) ?? 0;
  }

  const comboRows = Array.from(comboMap.values()).sort((a, b) => {
    if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
    const aSubject = a.subjectName ?? "";
    const bSubject = b.subjectName ?? "";
    if (aSubject !== bSubject) return aSubject.localeCompare(bSubject);
    return (a.levelName ?? "").localeCompare(b.levelName ?? "");
  });

  return {
    teacher,
    range,
    comboRows,
    sessionRows,
    totalSessions: sessionRows.length,
    totalMinutes,
    totalHours: toHours(totalMinutes),
    totalAmountCents,
    scope,
    usingRateFallback: !loadedFromTable,
  };
}

export function formatMoneyCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export function formatComboLabel(courseName: string, subjectName: string | null, levelName: string | null) {
  return [courseName, subjectName, levelName].filter(Boolean).join(" / ");
}



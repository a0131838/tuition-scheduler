import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly, parseBusinessDateStart } from "@/lib/date-only";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { summarizeManagerReflectionHistory } from "@/lib/manager-reflection-summary";
import { SystemUserRole } from "@/lib/staff-roles";

const MANAGER_REFLECTION_KEY = "manager_daily_reflection_v1";

export type ManagerReflectionChecklistKey =
  | "receiptsInvoicesClaimsChecked"
  | "feedbackQualityChecked"
  | "midtermReportsChecked"
  | "finalReportsChecked";

export type ManagerReflectionEntry = {
  id: string;
  date: string;
  managerEmail: string;
  checklist: Record<ManagerReflectionChecklistKey, boolean>;
  wentWell: string;
  didNotGoWell: string;
  couldBeBetter: string;
  followUpActions: string;
  createdAt: string;
  updatedAt: string;
};

type ManagerReflectionStore = {
  entries: ManagerReflectionEntry[];
};

const EMPTY_MANAGER_REFLECTION_STORE: ManagerReflectionStore = { entries: [] };

export const MANAGER_REFLECTION_CHECKLIST: Array<{ key: ManagerReflectionChecklistKey; en: string; zh: string }> = [
  {
    key: "receiptsInvoicesClaimsChecked",
    en: "Outstanding receipts / invoices / claims approval checked",
    zh: "已检查未完成收据 / 发票 / 报销审批",
  },
  {
    key: "feedbackQualityChecked",
    en: "Teacher feedback quality checked",
    zh: "已检查老师课后反馈质量",
  },
  {
    key: "midtermReportsChecked",
    en: "Mid-term report follow-up checked",
    zh: "已跟进中期报告",
  },
  {
    key: "finalReportsChecked",
    en: "End-term report follow-up checked",
    zh: "已跟进结课报告",
  },
];

function emptyChecklist(): Record<ManagerReflectionChecklistKey, boolean> {
  return {
    receiptsInvoicesClaimsChecked: false,
    feedbackQualityChecked: false,
    midtermReportsChecked: false,
    finalReportsChecked: false,
  };
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanText(value: unknown, maxLength = 3000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sanitizeReflectionEntry(input: unknown): ManagerReflectionEntry | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const date = cleanText(raw.date, 10);
  const managerEmail = normalizeEmail(String(raw.managerEmail ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !managerEmail) return null;
  const rawChecklist = raw.checklist && typeof raw.checklist === "object" ? (raw.checklist as Record<string, unknown>) : {};
  return {
    id: cleanText(raw.id, 80) || `${managerEmail}:${date}`,
    date,
    managerEmail,
    checklist: {
      receiptsInvoicesClaimsChecked: Boolean(rawChecklist.receiptsInvoicesClaimsChecked),
      feedbackQualityChecked: Boolean(rawChecklist.feedbackQualityChecked),
      midtermReportsChecked: Boolean(rawChecklist.midtermReportsChecked),
      finalReportsChecked: Boolean(rawChecklist.finalReportsChecked),
    },
    wentWell: cleanText(raw.wentWell),
    didNotGoWell: cleanText(raw.didNotGoWell),
    couldBeBetter: cleanText(raw.couldBeBetter),
    followUpActions: cleanText(raw.followUpActions),
    createdAt: cleanText(raw.createdAt, 40) || new Date().toISOString(),
    updatedAt: cleanText(raw.updatedAt, 40) || new Date().toISOString(),
  };
}

function sanitizeReflectionStore(input: unknown): ManagerReflectionStore {
  if (!input || typeof input !== "object") return EMPTY_MANAGER_REFLECTION_STORE;
  const rawEntries = Array.isArray((input as Record<string, unknown>).entries)
    ? ((input as Record<string, unknown>).entries as unknown[])
    : [];
  const seen = new Set<string>();
  const entries: ManagerReflectionEntry[] = [];
  for (const rawEntry of rawEntries) {
    const entry = sanitizeReflectionEntry(rawEntry);
    if (!entry) continue;
    const key = `${entry.managerEmail}:${entry.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  return { entries };
}

export async function loadManagerReflectionStore() {
  const { store } = await loadJsonAppSettingForDb(
    prisma as any,
    MANAGER_REFLECTION_KEY,
    EMPTY_MANAGER_REFLECTION_STORE,
    sanitizeReflectionStore,
  );
  return store;
}

export async function saveManagerReflectionEntry(input: {
  date: string;
  managerEmail: string;
  checklist: Record<ManagerReflectionChecklistKey, boolean>;
  wentWell: string;
  didNotGoWell: string;
  couldBeBetter: string;
  followUpActions: string;
}) {
  const date = cleanText(input.date, 10);
  const managerEmail = normalizeEmail(input.managerEmail);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  if (!managerEmail) throw new Error("Missing manager email");
  const now = new Date().toISOString();
  let saved: ManagerReflectionEntry | null = null;
  await mutateJsonAppSetting({
    key: MANAGER_REFLECTION_KEY,
    fallback: EMPTY_MANAGER_REFLECTION_STORE,
    sanitize: sanitizeReflectionStore,
    mutate(store) {
      const key = `${managerEmail}:${date}`;
      const existingIndex = store.entries.findIndex((entry) => `${entry.managerEmail}:${entry.date}` === key);
      const existing = existingIndex >= 0 ? store.entries[existingIndex] : null;
      saved = {
        id: existing?.id ?? key,
        date,
        managerEmail,
        checklist: {
          ...emptyChecklist(),
          ...input.checklist,
        },
        wentWell: cleanText(input.wentWell),
        didNotGoWell: cleanText(input.didNotGoWell),
        couldBeBetter: cleanText(input.couldBeBetter),
        followUpActions: cleanText(input.followUpActions),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (existingIndex >= 0) store.entries[existingIndex] = saved;
      else store.entries.push(saved);
      store.entries = sanitizeReflectionStore(store).entries.slice(0, 800);
    },
  });
  return saved!;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayRange(dateOnly: string) {
  const start = parseBusinessDateStart(dateOnly) ?? parseBusinessDateStart(formatBusinessDateOnly(new Date()))!;
  return { start, end: addDays(start, 1) };
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function courseText(cls: {
  course?: { name: string } | null;
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return [cls.course?.name, cls.subject?.name, cls.level?.name].filter(Boolean).join(" / ");
}

export async function loadManagerQualityWorkspace(input: {
  managerEmail: string;
  managerRole: SystemUserRole;
  date?: string | null;
  historyDays?: number | null;
}) {
  const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : formatBusinessDateOnly(new Date());
  const historyDays = [7, 14, 30, 90].includes(Number(input.historyDays)) ? Number(input.historyDays) : 14;
  const { start, end } = dayRange(date);
  const last7Start = addDays(start, -6);
  const historyStart = addDays(start, -(historyDays - 1));

  const [
    sessions,
    enrollments,
    recentFeedbacks,
    midtermReports,
    finalReports,
    reflectionStore,
    approvalInbox,
  ] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { gte: start, lt: end } },
      include: {
        teacher: true,
        student: true,
        class: {
          include: {
            teacher: true,
            course: true,
            subject: true,
            level: true,
            campus: true,
            room: true,
            enrollments: { include: { student: true } },
            oneOnOneStudent: true,
          },
        },
      },
      orderBy: [{ startAt: "asc" }],
    }),
    prisma.enrollment.findMany({
      include: { student: true },
    }),
    prisma.sessionFeedback.findMany({
      where: { submittedAt: { gte: last7Start, lt: end } },
      include: {
        teacher: true,
        session: { include: { class: { include: { course: true, subject: true, level: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 80,
    }),
    prisma.midtermReport.findMany({
      where: { archivedAt: null, status: { in: ["ASSIGNED", "SUBMITTED"] } },
      include: { student: true, teacher: true, course: true, subject: true },
      orderBy: [{ status: "asc" }, { assignedAt: "asc" }],
      take: 80,
    }),
    prisma.finalReport.findMany({
      where: { archivedAt: null, status: { in: ["ASSIGNED", "SUBMITTED", "FORWARDED"] } },
      include: { student: true, teacher: true, course: true, subject: true },
      orderBy: [{ status: "asc" }, { assignedAt: "asc" }],
      take: 80,
    }),
    loadManagerReflectionStore(),
    getApprovalInboxData(input.managerEmail, input.managerRole),
  ]);

  const enrollmentsByClass = new Map<string, string[]>();
  for (const enrollment of enrollments) {
    const list = enrollmentsByClass.get(enrollment.classId) ?? [];
    list.push(enrollment.student.name);
    enrollmentsByClass.set(enrollment.classId, list);
  }

  const leadDeskRows = sessions.map((session) => {
    const teacherId = session.teacherId ?? session.class.teacherId;
    const teacherName = session.teacher?.name ?? session.class.teacher.name;
    const studentNames =
      session.student?.name
        ? [session.student.name]
        : session.class.oneOnOneStudent?.name
          ? [session.class.oneOnOneStudent.name]
          : enrollmentsByClass.get(session.classId) ?? [];
    return {
      id: session.id,
      teacherId,
      teacherName,
      startTime: formatBusinessTimeOnly(new Date(session.startAt)),
      endTime: formatBusinessTimeOnly(new Date(session.endAt)),
      timeRange: `${formatBusinessTimeOnly(new Date(session.startAt))}-${formatBusinessTimeOnly(new Date(session.endAt))}`,
      durationMinutes: minutesBetween(new Date(session.startAt), new Date(session.endAt)),
      course: courseText(session.class),
      students: studentNames.join(", ") || "-",
      campus: session.class.campus.name,
      room: session.class.room?.name ?? "",
      mode: session.class.capacity === 1 ? "1:1" : `Group (${session.class.capacity})`,
    };
  });

  const byTeacher = new Map<string, typeof leadDeskRows>();
  for (const row of leadDeskRows) {
    const list = byTeacher.get(row.teacherName) ?? [];
    list.push(row);
    byTeacher.set(row.teacherName, list);
  }
  const leadDeskGroups = Array.from(byTeacher.entries())
    .map(([teacherName, rows]) => ({ teacherName, rows }))
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  const feedbackRows = recentFeedbacks.map((feedback) => {
    const issues: string[] = [];
    if (feedback.content.trim().length < 120) issues.push("Short content");
    if (!feedback.classPerformance?.trim()) issues.push("Missing class performance");
    if (!feedback.homework?.trim()) issues.push("Missing homework");
    if (feedback.status === "LATE") issues.push("Late feedback");
    return {
      id: feedback.id,
      teacherName: feedback.teacher.name,
      submittedAt: formatBusinessDateTime(new Date(feedback.submittedAt)),
      course: courseText(feedback.session.class),
      focusStudentName: feedback.focusStudentName ?? "",
      status: feedback.status,
      issues,
    };
  });

  const reportRows = [
    ...midtermReports.map((report) => ({
      id: report.id,
      type: "Mid-term",
      status: report.status,
      studentName: report.student.name,
      teacherName: report.teacher.name,
      course: courseText(report),
      assignedAt: formatBusinessDateOnly(new Date(report.assignedAt)),
    })),
    ...finalReports.map((report) => ({
      id: report.id,
      type: "End-term",
      status: report.status,
      studentName: report.student.name,
      teacherName: report.teacher.name,
      course: courseText(report),
      assignedAt: formatBusinessDateOnly(new Date(report.assignedAt)),
    })),
  ];

  const managerEmail = normalizeEmail(input.managerEmail);
  const currentEntry = reflectionStore.entries.find((entry) => entry.managerEmail === managerEmail && entry.date === date) ?? null;
  const recentEntries = reflectionStore.entries
    .filter((entry) => entry.managerEmail === managerEmail && entry.date >= formatBusinessDateOnly(historyStart) && entry.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const reflectionSummary = summarizeManagerReflectionHistory(recentEntries, MANAGER_REFLECTION_CHECKLIST);

  return {
    date,
    historyDays,
    leadDeskGroups,
    leadDeskTotals: {
      sessions: leadDeskRows.length,
      teachers: leadDeskGroups.length,
      students: new Set(leadDeskRows.flatMap((row) => row.students.split(", ").filter((name) => name && name !== "-"))).size,
    },
    approvalInboxSummary: approvalInbox.summary,
    feedbackRows,
    feedbackSummary: {
      recentCount: feedbackRows.length,
      issueCount: feedbackRows.filter((row) => row.issues.length > 0).length,
    },
    reportRows,
    reportSummary: {
      midtermActive: midtermReports.length,
      finalActive: finalReports.length,
      assigned: reportRows.filter((row) => row.status === "ASSIGNED").length,
      submitted: reportRows.filter((row) => row.status === "SUBMITTED").length,
    },
    currentEntry,
    recentEntries,
    kpiSummary: {
      logDays: reflectionSummary.logDays,
      completedLogDays: reflectionSummary.completedLogDays,
      completionRate: reflectionSummary.completionRate,
      checklistCompletionRate: reflectionSummary.checklistCompletionRate,
      itemStats: reflectionSummary.itemStats,
    },
  };
}

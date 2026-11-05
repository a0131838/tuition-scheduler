import type { Prisma } from "@prisma/client";

export type FinalDeskView = "unassigned" | "writing" | "review" | "all";
export type FinalDeskParams = {
  view: FinalDeskView; q: string; teacherId: string; courseId: string;
  status: string; page: number; showAssigned: boolean;
  reportId: string; packageId: string; studentId: string;
};
const statuses = new Set(["all", "active", "submitted", "pending-delivery", "delivered", "exempt", "archived", "shared", "expired-shares"]);
const text = (value: unknown, max = 120) => String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim().slice(0, max);

export function parseFinalDeskParams(raw: Record<string, unknown>): FinalDeskParams {
  const view = text(raw.view);
  const legacy = statuses.has(view) && view !== "all";
  const status = legacy ? view : text(raw.status);
  return {
    view: legacy ? "all" : ["writing", "review", "all"].includes(view) ? view as FinalDeskView : "unassigned",
    q: text(raw.q), teacherId: text(raw.teacherId, 80), courseId: text(raw.courseId, 80),
    status: statuses.has(status) ? status : "all",
    page: Math.max(1, Math.min(1000000, Math.floor(Number(text(raw.page))) || 1)),
    showAssigned: text(raw.showAssigned) === "1",
    reportId: text(raw.reportId, 80), packageId: text(raw.packageId, 80), studentId: text(raw.studentId, 80),
  };
}

export function finalDeskUrl(state: FinalDeskParams, changes: Partial<FinalDeskParams> = {}, anchor = "") {
  const p = { ...state, ...changes }, q = new URLSearchParams();
  q.set("view", p.view);
  for (const key of ["q", "teacherId", "courseId", "reportId", "packageId", "studentId"] as const) if (p[key]) q.set(key, p[key]);
  if (p.page > 1) q.set("page", String(p.page));
  if (p.view === "all" && p.status !== "all") q.set("status", p.status);
  if (p.view === "unassigned" && p.showAssigned) q.set("showAssigned", "1");
  return `/admin/reports/final?${q}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;
}

/** Whitelist the desk query rather than accepting an arbitrary redirect URL. */
export function finalDeskReturnUrl(returnTo: unknown) {
  let raw: Record<string, unknown> = {};
  try {
    const url = new URL(String(returnTo || ""), "https://desk.invalid");
    if (url.origin === "https://desk.invalid" && url.pathname === "/admin/reports/final") raw = Object.fromEntries(url.searchParams);
  } catch { /* Use the default desk for invalid return context. */ }
  return finalDeskUrl(parseFinalDeskParams(raw));
}

export function finalDeskResultUrl(returnTo: unknown, kind: "ok" | "err", code: string, assignedReportId?: string) {
  const state = parseFinalDeskParams(Object.fromEntries(new URL(finalDeskReturnUrl(returnTo), "https://desk.invalid").searchParams));
  if (assignedReportId || (kind === "ok" && code === "exempt" && state.packageId && state.studentId && !state.reportId)) {
    state.packageId = ""; state.studentId = ""; state.reportId = "";
  }
  const url = new URL(finalDeskUrl(state), "https://desk.invalid");
  url.searchParams.set(kind, code);
  if (assignedReportId) url.searchParams.set("assignedReportId", assignedReportId);
  url.hash = assignedReportId ? "final-report-assignment-result" : "final-report-operation-result";
  return url.pathname + url.search + url.hash;
}

export function finalDeskReportWhere(p: FinalDeskParams, view: Exclude<FinalDeskView, "unassigned"> = p.view === "unassigned" ? "all" : p.view, now = new Date()): Prisma.FinalReportWhereInput {
  const where: Prisma.FinalReportWhereInput = {
    ...(p.teacherId ? { teacherId: p.teacherId } : {}), ...(p.courseId ? { courseId: p.courseId } : {}),
    ...(p.q ? { OR: [ { student: { name: { contains: p.q, mode: "insensitive" } } }, { teacher: { name: { contains: p.q, mode: "insensitive" } } }, { course: { name: { contains: p.q, mode: "insensitive" } } } ] } : {}),
  };
  if (view === "writing") return { ...where, archivedAt: null, deliveredAt: null, status: "ASSIGNED" };
  if (view === "review") return { ...where, archivedAt: null, deliveredAt: null, status: { in: ["SUBMITTED", "FORWARDED"] } };
  if (p.status === "archived") return { ...where, archivedAt: { not: null } };
  if (p.status === "all") return where;
  where.archivedAt = null;
  if (p.status === "submitted") where.status = "SUBMITTED";
  if (p.status === "pending-delivery") { where.deliveredAt = null; where.status = { in: ["SUBMITTED", "FORWARDED"] }; }
  if (p.status === "delivered") where.deliveredAt = { not: null };
  if (p.status === "exempt") where.status = "EXEMPT";
  if (p.status === "shared" || p.status === "expired-shares") {
    where.shareToken = { not: null }; where.shareEnabledAt = { not: null }; where.shareRevokedAt = null;
    if (p.status === "expired-shares") where.shareExpiresAt = { lte: now };
    else where.AND = [{ OR: [{ shareExpiresAt: null }, { shareExpiresAt: { gt: now } }] }];
  }
  return where;
}

type Candidate = {
  studentName: string; courseId: string; courseName: string;
  teacherOptions: Array<{ id: string; name: string; latestReportStatus: string | null }>;
};
export function filterFinalDeskCandidates<T extends Candidate>(rows: T[], p: FinalDeskParams): T[] {
  const q = p.q.toLocaleLowerCase();
  return rows.filter(row => {
    const teachers = p.showAssigned ? row.teacherOptions : row.teacherOptions.filter(t => !t.latestReportStatus);
    return teachers.length > 0 && (!p.courseId || p.courseId === row.courseId)
      && (!p.teacherId || teachers.some(t => t.id === p.teacherId))
      && (!q || [row.studentName, row.courseName, ...teachers.map(t => t.name)].some(v => v.toLocaleLowerCase().includes(q)));
  });
}

export function finalDeskPagination(total: number, requested: number) {
  const pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(pages, Math.max(1, Math.floor(requested) || 1));
  return { page, pages, skip: (page - 1) * 20, take: 20 };
}

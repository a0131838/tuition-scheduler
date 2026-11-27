import type { Prisma } from "@prisma/client";
import { formatBusinessDateOnly } from "./date-only";
import { prisma } from "./prisma";

type Window = { state: "ready"; start: Date; end: Date } | { state: "waiting" | "ambiguous"; reason: string };
export const periodEvidence = {
  id: true,
  totalMinutes: true,
  remainingMinutes: true,
  txns: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      createdAt: true,
      kind: true,
      sessionId: true,
      deltaMinutes: true,
      correctionEntry: { select: { id: true } },
      correctionSources: { select: { unit: true, deltaUnits: true } },
    },
  },
  attendances: {
    select: {
      studentId: true,
      sessionId: true,
      status: true,
      deductedMinutes: true,
      session: { select: { startAt: true, endAt: true } },
    },
    orderBy: [{ session: { startAt: "asc" } }, { id: "asc" }],
  },
  finalReportPeriods: {
    select: {
      purchaseTxnId: true,
      studentId: true,
      startsAt: true,
      endsAt: true,
      reports: { where: { submittedAt: { not: null } }, select: { reportJson: true } },
    },
  },
} satisfies Prisma.CoursePackageSelect;
type Evidence = Prisma.CoursePackageGetPayload<{ select: typeof periodEvidence }>;

export function purchaseMinutes(purchase: {
  deltaMinutes: number;
  correctionSources: { unit: string; deltaUnits: number }[];
}) {
  return purchase.correctionSources.reduce(
    (total, c) => total + (c.unit === "MINUTES" ? c.deltaUnits : 0),
    purchase.deltaMinutes,
  );
}

export function savedPeriodWindow(json: unknown) {
  const meta = (json as { _meta?: { periodWindow?: { start?: string; end?: string } } } | null)?._meta
    ?.periodWindow;
  if (!meta?.start || !meta.end) return null;
  return { start: new Date(meta.start), end: new Date(meta.end) };
}

const uncertain = (reason: string): Window => ({ state: "ambiguous", reason });
const waiting: Window = { state: "waiting", reason: "Awaiting attendance in this period / 等待本期实际出勤" };

export function inferPeriodWindow(
  pkg: Evidence,
  studentId: string,
  purchaseId: string,
  now = new Date(),
): Window {
  const periods = pkg.finalReportPeriods.filter((p) => p.studentId === studentId);
  const selected = periods.find((p) => p.purchaseTxnId === purchaseId);
  if (selected?.startsAt && selected.endsAt)
    return { state: "ready", start: selected.startsAt, end: selected.endsAt };
  const credits = pkg.txns.filter((t) => t.kind === "PURCHASE" && purchaseMinutes(t) > 0);
  const index = credits.findIndex((t) => t.id === purchaseId);
  if (index < 0) return uncertain("Credit no longer available / 本笔入账已变更");
  if (
    !pkg.attendances.some(
      (a) => a.studentId === studentId && a.session.endAt <= now && ["PRESENT", "LATE"].includes(a.status),
    )
  )
    return waiting;
  const net = new Map<string, number>();
  for (const t of pkg.txns) {
    if (!t.deltaMinutes || t.kind === "PURCHASE" || t.correctionEntry) continue;
    if (!t.sessionId || !["DEDUCT", "ROLLBACK"].includes(t.kind))
      return uncertain("Unallocated adjustment / 有未分配到课次的调整");
    net.set(t.sessionId, (net.get(t.sessionId) ?? 0) - t.deltaMinutes);
  }
  const total = credits.reduce((sum, c) => sum + purchaseMinutes(c), 0);
  const spent = pkg.attendances.reduce((sum, a) => sum + a.deductedMinutes, 0);
  for (const a of pkg.attendances) net.set(a.sessionId, (net.get(a.sessionId) ?? 0) - a.deductedMinutes);
  if (
    total !== pkg.totalMinutes ||
    total - spent !== pkg.remainingMinutes ||
    [...net.values()].some((n) => n !== 0)
  )
    return uncertain("Attendance and package history differ / 出勤与课时流水未能对齐");
  if (credits.some((c, i) => i && +c.createdAt === +credits[i - 1].createdAt))
    return uncertain("Simultaneous purchase entries / 多笔入账时间相同");
  // A confirmed boundary is a teaching decision for this student only.
  // Continue counting later credits from that boundary on an individual package.
  let anchor: Date | null = null;
  let firstCredit = 0;
  if (pkg.attendances.every((a) => a.studentId === studentId)) {
    for (let i = index - 1; i >= 0; i--) {
      const previous = periods.find((p) => p.purchaseTxnId === credits[i].id);
      if (previous?.endsAt) {
        anchor = previous.endsAt;
        firstCredit = i + 1;
        break;
      }
    }
  }
  const low = credits.slice(firstCredit, index).reduce((sum, c) => sum + purchaseMinutes(c), 0);
  const high = low + purchaseMinutes(credits[index]);
  let used = 0,
    start: Date | undefined,
    end: Date | undefined;
  for (const a of pkg.attendances) {
    const s = a.session;
    if (anchor && s.endAt <= anchor) continue;
    const next = used + a.deductedMinutes;
    if (a.deductedMinutes < 0 || (anchor && s.startAt < anchor))
      return uncertain("Lesson crosses a boundary / 课次跨越期次分界");
    if ((used < low && next > low) || (used < high && next > high))
      return uncertain("Lesson spans two credits / 一节课横跨两笔课时");
    if (
      used >= low &&
      used < high &&
      s.endAt <= now &&
      a.studentId === studentId &&
      ["PRESENT", "LATE"].includes(a.status)
    ) {
      if (!a.deductedMinutes && index > 0 && used === low)
        return uncertain("Uncharged lesson at boundary / 分界处有未扣课的课次");
      if (index > 0 && formatBusinessDateOnly(s.startAt) < formatBusinessDateOnly(credits[index].createdAt))
        return uncertain("Lessons predate the renewal / 课次早于续费入账日期");
      start ??= s.startAt;
      if (!end || s.endAt > end) end = s.endAt;
    }
    used = next;
  }
  if (!start || !end) return waiting;
  // A time range must not inadvertently include a lesson allocated to another credit.
  if (
    pkg.attendances.some(
      (a) =>
        a.studentId === studentId &&
        ["PRESENT", "LATE"].includes(a.status) &&
        ((a.session.startAt < start! && a.session.endAt > start!) ||
          (a.session.startAt < end! && a.session.endAt > end!)),
    )
  ) {
    return uncertain("Overlapping lessons at boundary / 分界处的课次时间重叠");
  }
  for (const p of periods) {
    if (p.purchaseTxnId === purchaseId) continue;
    const bounds = [
      p.startsAt && p.endsAt ? { start: p.startsAt, end: p.endsAt } : null,
      ...p.reports.map((r) => savedPeriodWindow(r.reportJson)),
    ];
    if (bounds.some((b) => b && b.start < end! && b.end > start!))
      return uncertain("Overlaps another report period / 与另一报告期重叠");
  }
  return { state: "ready", start, end };
}

export async function loadPeriodEvidence(packageId: string, db: Prisma.TransactionClient = prisma) {
  return db.coursePackage.findUniqueOrThrow({ where: { id: packageId }, select: periodEvidence });
}

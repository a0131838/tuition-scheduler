import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function toMinFromDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtSlotRange(startMin: number, endMin: number) {
  const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
  const sm = String(startMin % 60).padStart(2, "0");
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${sh}:${sm}-${eh}:${em}`;
}

export async function inspectTeacherSchedulingAvailability(
  db: DbClient,
  teacherId: string,
  startAt: Date,
  endAt: Date
) {
  if (startAt.toDateString() !== endAt.toDateString()) {
    return { error: "课程不能跨越两个自然日", source: null as "date" | "weekly" | null };
  }

  const approvedLeave = await db.hrLeaveRequest.findFirst({
    where: {
      status: "APPROVED",
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      employee: { teacherId },
    },
    select: { leaveType: true, startAt: true, endAt: true },
  });
  if (approvedLeave) {
    return {
      error: `老师在该时段已有已批准假期（${approvedLeave.leaveType}），请更换老师或时间`,
      source: null as "date" | "weekly" | null,
    };
  }

  const startMin = toMinFromDate(startAt);
  const endMin = toMinFromDate(endAt);
  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 23, 59, 59, 999);

  const weekday = startAt.getDay();
  const [dateSlots, weeklySlots] = await Promise.all([
    db.teacherAvailabilityDate.findMany({
      where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
      select: { startMin: true, endMin: true },
      orderBy: { startMin: "asc" },
    }),
    db.teacherAvailability.findMany({
      where: { teacherId, weekday },
      select: { startMin: true, endMin: true },
      orderBy: { startMin: "asc" },
    }),
  ]);

  // A dated entry is an explicit exception for that day and therefore takes
  // precedence.  When no dated entry exists, fall back to the teacher's normal
  // weekly availability instead of treating the teacher as unavailable.
  const source = dateSlots.length ? "date" as const : "weekly" as const;
  const slots = dateSlots.length ? dateSlots : weeklySlots;

  if (slots.length === 0) {
    return {
      error: `${WEEKDAYS[weekday] ?? `星期${weekday}`}没有录入可用时间，请先联系老师确认并补充老师时间`,
      source: null as "date" | "weekly" | null,
    };
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const sourceLabel = source === "date" ? "当天特殊可用时间" : "每周常规可用时间";
    return {
      error: `${WEEKDAYS[weekday] ?? `星期${weekday}`} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}不在老师的${sourceLabel}内；可用：${ranges}`,
      source,
    };
  }

  return { error: null as string | null, source };
}

export async function checkTeacherSchedulingAvailability(
  db: DbClient,
  teacherId: string,
  startAt: Date,
  endAt: Date
) {
  const result = await inspectTeacherSchedulingAvailability(db, teacherId, startAt, endAt);
  return result.error;
}

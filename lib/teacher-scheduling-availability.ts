import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    return { error: "Session spans multiple days", source: null as "date" | null };
  }

  const startMin = toMinFromDate(startAt);
  const endMin = toMinFromDate(endAt);
  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 23, 59, 59, 999);

  const slots = await db.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
    select: { startMin: true, endMin: true },
    orderBy: { startMin: "asc" },
  });

  if (slots.length === 0) {
    const weekday = startAt.getDay();
    return {
      error: `No date availability on ${WEEKDAYS[weekday] ?? weekday} (no date slots)`,
      source: null as "date" | null,
    };
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const weekday = startAt.getDay();
    return {
      error: `Outside date availability ${WEEKDAYS[weekday] ?? weekday} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}. Available: ${ranges}`,
      source: "date" as const,
    };
  }

  return { error: null as string | null, source: "date" as const };
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

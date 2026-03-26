import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

export function overlapsMinutes(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function dayBounds(date: Date) {
  return {
    dayStart: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
    dayEnd: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  };
}

export async function findDateAvailabilityOverlap(
  db: DbClient,
  teacherId: string,
  date: Date,
  startMin: number,
  endMin: number
) {
  const { dayStart, dayEnd } = dayBounds(date);
  return db.teacherAvailabilityDate.findFirst({
    where: {
      teacherId,
      date: { gte: dayStart, lte: dayEnd },
      startMin: { lt: endMin },
      endMin: { gt: startMin },
    },
    select: { id: true, startMin: true, endMin: true },
  });
}

export async function findWeeklyAvailabilityOverlap(
  db: DbClient,
  teacherId: string,
  weekday: number,
  startMin: number,
  endMin: number
) {
  return db.teacherAvailability.findFirst({
    where: {
      teacherId,
      weekday,
      startMin: { lt: endMin },
      endMin: { gt: startMin },
    },
    select: { id: true, startMin: true, endMin: true },
  });
}

export function isAvailabilityDuplicateError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

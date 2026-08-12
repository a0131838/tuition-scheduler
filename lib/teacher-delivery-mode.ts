import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type DeliveryMode = "ONLINE" | "CAMPUS" | "HOME";

type CampusLite = { id: string; name: string; isOnline: boolean };

const HOME_LOCATION_PATTERN = /(上门|到家|home|home visit)/i;

export function campusDeliveryMode(campus: Pick<CampusLite, "name" | "isOnline">): DeliveryMode {
  if (campus.isOnline) return "ONLINE";
  return HOME_LOCATION_PATTERN.test(campus.name) ? "HOME" : "CAMPUS";
}

function modeLabel(mode: DeliveryMode) {
  if (mode === "ONLINE") return "线上";
  if (mode === "HOME") return "上门";
  return "校区线下";
}

async function hasHistoricalModeEvidence(db: DbClient, teacherId: string, mode: DeliveryMode) {
  if (mode === "CAMPUS") return false;
  const homeNames = ["上门", "到家", "home"];
  const campusFilter = mode === "ONLINE"
    ? { isOnline: true }
    : {
        isOnline: false,
        OR: homeNames.map((name) => ({ name: { contains: name, mode: "insensitive" as const } })),
      };
  const session = await db.session.findFirst({
    where: {
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      class: { campus: campusFilter },
    },
    select: { id: true },
  });
  return Boolean(session);
}

export async function checkTeacherDeliveryMode(db: DbClient, teacherId: string, campus: CampusLite) {
  const teacher = await db.teacher.findUnique({
    where: { id: teacherId },
    select: { name: true, offlineSingapore: true, teachingOnline: true, teachingHome: true },
  });
  if (!teacher) return "老师不存在。";
  const mode = campusDeliveryMode(campus);
  const explicit = mode === "ONLINE" ? teacher.teachingOnline : mode === "HOME" ? teacher.teachingHome : teacher.offlineSingapore;
  if (explicit || await hasHistoricalModeEvidence(db, teacherId, mode)) return null;
  return `${teacher.name} 尚未确认可${modeLabel(mode)}授课，请先在老师资料中勾选该授课方式。`;
}

export async function checkTeacherTravelBuffer(
  db: DbClient,
  input: { teacherId: string; sessionId?: string | null; startAt: Date; endAt: Date; campus: CampusLite; minimumMinutes?: number }
) {
  const minimumMinutes = input.minimumMinutes ?? 30;
  const windowStart = new Date(input.startAt.getTime() - minimumMinutes * 60_000);
  const windowEnd = new Date(input.endAt.getTime() + minimumMinutes * 60_000);
  const nearby = await db.session.findMany({
    where: {
      id: input.sessionId ? { not: input.sessionId } : undefined,
      OR: [{ teacherId: input.teacherId }, { teacherId: null, class: { teacherId: input.teacherId } }],
      startAt: { lt: windowEnd },
      endAt: { gt: windowStart },
    },
    select: { id: true, startAt: true, endAt: true, class: { select: { campus: { select: { id: true, name: true, isOnline: true } } } } },
  });
  const currentMode = campusDeliveryMode(input.campus);
  for (const row of nearby) {
    if (row.startAt < input.endAt && row.endAt > input.startAt) continue;
    const adjacentMode = campusDeliveryMode(row.class.campus);
    if (currentMode !== "HOME" && adjacentMode !== "HOME") continue;
    const gapMinutes = row.endAt <= input.startAt
      ? Math.floor((input.startAt.getTime() - row.endAt.getTime()) / 60_000)
      : Math.floor((row.startAt.getTime() - input.endAt.getTime()) / 60_000);
    if (gapMinutes < minimumMinutes) {
      return `该老师相邻课程包含上门授课，前后需至少预留 ${minimumMinutes} 分钟；当前仅有 ${Math.max(0, gapMinutes)} 分钟。`;
    }
  }
  return null;
}

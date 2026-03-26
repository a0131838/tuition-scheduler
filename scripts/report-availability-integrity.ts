import { prisma } from "@/lib/prisma";

type DateSlot = {
  id: string;
  teacherId: string;
  date: Date;
  startMin: number;
  endMin: number;
};

type WeeklySlot = {
  id: string;
  teacherId: string;
  weekday: number;
  startMin: number;
  endMin: number;
};

function keyDate(slot: DateSlot) {
  return `${slot.teacherId}|${slot.date.toISOString()}|${slot.startMin}|${slot.endMin}`;
}

function keyWeekly(slot: WeeklySlot) {
  return `${slot.teacherId}|${slot.weekday}|${slot.startMin}|${slot.endMin}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fmtRange(startMin: number, endMin: number) {
  const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
  const sm = String(startMin % 60).padStart(2, "0");
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${sh}:${sm}-${eh}:${em}`;
}

function analyzeDateSlots(slots: DateSlot[]) {
  const duplicateMap = new Map<string, DateSlot[]>();
  const grouped = new Map<string, DateSlot[]>();

  for (const slot of slots) {
    const dupKey = keyDate(slot);
    const groupKey = `${slot.teacherId}|${slot.date.toISOString()}`;
    duplicateMap.set(dupKey, [...(duplicateMap.get(dupKey) ?? []), slot]);
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), slot]);
  }

  const duplicateGroups = Array.from(duplicateMap.values()).filter((group) => group.length > 1);
  const overlapGroups = Array.from(grouped.entries())
    .map(([groupKey, groupSlots]) => {
      const sorted = [...groupSlots].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id));
      const conflicts: Array<{ first: DateSlot; second: DateSlot }> = [];
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].startMin >= sorted[i].endMin) break;
          if (overlaps(sorted[i].startMin, sorted[i].endMin, sorted[j].startMin, sorted[j].endMin)) {
            conflicts.push({ first: sorted[i], second: sorted[j] });
          }
        }
      }
      if (conflicts.length === 0) return null;
      const [teacherId, isoDate] = groupKey.split("|");
      const merged: Array<{ startMin: number; endMin: number }> = [];
      for (const slot of sorted) {
        const last = merged[merged.length - 1];
        if (!last || slot.startMin >= last.endMin) {
          merged.push({ startMin: slot.startMin, endMin: slot.endMin });
        } else {
          last.endMin = Math.max(last.endMin, slot.endMin);
        }
      }
      return {
        teacherId,
        date: isoDate,
        slotCount: sorted.length,
        conflicts,
        merged,
      };
    })
    .filter(Boolean) as Array<{
      teacherId: string;
      date: string;
      slotCount: number;
      conflicts: Array<{ first: DateSlot; second: DateSlot }>;
      merged: Array<{ startMin: number; endMin: number }>;
    }>;

  return { duplicateGroups, overlapGroups };
}

function analyzeWeeklySlots(slots: WeeklySlot[]) {
  const duplicateMap = new Map<string, WeeklySlot[]>();
  const grouped = new Map<string, WeeklySlot[]>();

  for (const slot of slots) {
    const dupKey = keyWeekly(slot);
    const groupKey = `${slot.teacherId}|${slot.weekday}`;
    duplicateMap.set(dupKey, [...(duplicateMap.get(dupKey) ?? []), slot]);
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), slot]);
  }

  const duplicateGroups = Array.from(duplicateMap.values()).filter((group) => group.length > 1);
  const overlapGroups = Array.from(grouped.entries())
    .map(([groupKey, groupSlots]) => {
      const sorted = [...groupSlots].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id));
      const conflicts: Array<{ first: WeeklySlot; second: WeeklySlot }> = [];
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].startMin >= sorted[i].endMin) break;
          if (overlaps(sorted[i].startMin, sorted[i].endMin, sorted[j].startMin, sorted[j].endMin)) {
            conflicts.push({ first: sorted[i], second: sorted[j] });
          }
        }
      }
      if (conflicts.length === 0) return null;
      const [teacherId, weekdayRaw] = groupKey.split("|");
      const merged: Array<{ startMin: number; endMin: number }> = [];
      for (const slot of sorted) {
        const last = merged[merged.length - 1];
        if (!last || slot.startMin >= last.endMin) {
          merged.push({ startMin: slot.startMin, endMin: slot.endMin });
        } else {
          last.endMin = Math.max(last.endMin, slot.endMin);
        }
      }
      return {
        teacherId,
        weekday: Number(weekdayRaw),
        slotCount: sorted.length,
        conflicts,
        merged,
      };
    })
    .filter(Boolean) as Array<{
      teacherId: string;
      weekday: number;
      slotCount: number;
      conflicts: Array<{ first: WeeklySlot; second: WeeklySlot }>;
      merged: Array<{ startMin: number; endMin: number }>;
    }>;

  return { duplicateGroups, overlapGroups };
}

async function main() {
  const [dateSlots, weeklySlots] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      select: { id: true, teacherId: true, date: true, startMin: true, endMin: true },
      orderBy: [{ teacherId: "asc" }, { date: "asc" }, { startMin: "asc" }],
    }),
    prisma.teacherAvailability.findMany({
      select: { id: true, teacherId: true, weekday: true, startMin: true, endMin: true },
      orderBy: [{ teacherId: "asc" }, { weekday: "asc" }, { startMin: "asc" }],
    }),
  ]);

  const dateReport = analyzeDateSlots(dateSlots);
  const weeklyReport = analyzeWeeklySlots(weeklySlots);

  const output = {
    generatedAt: new Date().toISOString(),
    policy: {
      overlapHandling: "merge overlapping only; do not merge adjacent ranges",
      exactDuplicateHandling: "keep one row, remove the rest",
    },
    dateAvailability: {
      totalRows: dateSlots.length,
      exactDuplicateGroupCount: dateReport.duplicateGroups.length,
      exactDuplicateExtraRows: dateReport.duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
      overlapGroupCount: dateReport.overlapGroups.length,
      sampleExactDuplicates: dateReport.duplicateGroups.slice(0, 10).map((group) => ({
        teacherId: group[0].teacherId,
        date: fmtDate(group[0].date),
        range: fmtRange(group[0].startMin, group[0].endMin),
        ids: group.map((slot) => slot.id),
      })),
      sampleOverlapMerges: dateReport.overlapGroups.slice(0, 10).map((group) => ({
        teacherId: group.teacherId,
        date: group.date.slice(0, 10),
        slotCount: group.slotCount,
        mergedRanges: group.merged.map((slot) => fmtRange(slot.startMin, slot.endMin)),
        examplePairs: group.conflicts.slice(0, 3).map((pair) => ({
          first: fmtRange(pair.first.startMin, pair.first.endMin),
          second: fmtRange(pair.second.startMin, pair.second.endMin),
        })),
      })),
    },
    weeklyAvailability: {
      totalRows: weeklySlots.length,
      exactDuplicateGroupCount: weeklyReport.duplicateGroups.length,
      exactDuplicateExtraRows: weeklyReport.duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
      overlapGroupCount: weeklyReport.overlapGroups.length,
      sampleExactDuplicates: weeklyReport.duplicateGroups.slice(0, 10).map((group) => ({
        teacherId: group[0].teacherId,
        weekday: group[0].weekday,
        range: fmtRange(group[0].startMin, group[0].endMin),
        ids: group.map((slot) => slot.id),
      })),
      sampleOverlapMerges: weeklyReport.overlapGroups.slice(0, 10).map((group) => ({
        teacherId: group.teacherId,
        weekday: group.weekday,
        slotCount: group.slotCount,
        mergedRanges: group.merged.map((slot) => fmtRange(slot.startMin, slot.endMin)),
        examplePairs: group.conflicts.slice(0, 3).map((pair) => ({
          first: fmtRange(pair.first.startMin, pair.first.endMin),
          second: fmtRange(pair.second.startMin, pair.second.endMin),
        })),
      })),
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

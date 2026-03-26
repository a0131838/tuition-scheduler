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

function mergeOverlappingRanges<T extends { startMin: number; endMin: number }>(slots: T[]) {
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const merged: Array<{ startMin: number; endMin: number }> = [];
  for (const slot of sorted) {
    const last = merged[merged.length - 1];
    if (!last || slot.startMin >= last.endMin) {
      merged.push({ startMin: slot.startMin, endMin: slot.endMin });
    } else {
      last.endMin = Math.max(last.endMin, slot.endMin);
    }
  }
  return merged;
}

function keyDate(slot: Pick<DateSlot, "teacherId" | "date" | "startMin" | "endMin">) {
  return `${slot.teacherId}|${slot.date.toISOString()}|${slot.startMin}|${slot.endMin}`;
}

function keyWeekly(slot: Pick<WeeklySlot, "teacherId" | "weekday" | "startMin" | "endMin">) {
  return `${slot.teacherId}|${slot.weekday}|${slot.startMin}|${slot.endMin}`;
}

function partitionDateSlots(slots: DateSlot[]) {
  const duplicateMap = new Map<string, DateSlot[]>();
  const overlapMap = new Map<string, DateSlot[]>();

  for (const slot of slots) {
    duplicateMap.set(keyDate(slot), [...(duplicateMap.get(keyDate(slot)) ?? []), slot]);
    const overlapKey = `${slot.teacherId}|${slot.date.toISOString()}`;
    overlapMap.set(overlapKey, [...(overlapMap.get(overlapKey) ?? []), slot]);
  }

  const duplicateDeleteIds = Array.from(duplicateMap.values()).flatMap((group) =>
    [...group].sort((a, b) => a.id.localeCompare(b.id)).slice(1).map((slot) => slot.id)
  );

  const overlapPlans = Array.from(overlapMap.values())
    .map((group) => {
      const merged = mergeOverlappingRanges(group);
      const normalizedExisting = Array.from(
        new Set(group.map((slot) => `${slot.startMin}-${slot.endMin}`))
      ).sort();
      const normalizedMerged = merged.map((slot) => `${slot.startMin}-${slot.endMin}`).sort();
      if (normalizedExisting.length === normalizedMerged.length && normalizedExisting.every((item, idx) => item === normalizedMerged[idx])) {
        return null;
      }
      const sorted = [...group].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id));
      return {
        teacherId: group[0]!.teacherId,
        date: group[0]!.date,
        deleteIds: group.map((slot) => slot.id),
        createRanges: merged,
        before: sorted.map((slot) => ({ id: slot.id, range: fmtRange(slot.startMin, slot.endMin) })),
      };
    })
    .filter(Boolean) as Array<{
      teacherId: string;
      date: Date;
      deleteIds: string[];
      createRanges: Array<{ startMin: number; endMin: number }>;
      before: Array<{ id: string; range: string }>;
    }>;

  return { duplicateDeleteIds, overlapPlans };
}

function partitionWeeklySlots(slots: WeeklySlot[]) {
  const duplicateMap = new Map<string, WeeklySlot[]>();
  const overlapMap = new Map<string, WeeklySlot[]>();

  for (const slot of slots) {
    duplicateMap.set(keyWeekly(slot), [...(duplicateMap.get(keyWeekly(slot)) ?? []), slot]);
    const overlapKey = `${slot.teacherId}|${slot.weekday}`;
    overlapMap.set(overlapKey, [...(overlapMap.get(overlapKey) ?? []), slot]);
  }

  const duplicateDeleteIds = Array.from(duplicateMap.values()).flatMap((group) =>
    [...group].sort((a, b) => a.id.localeCompare(b.id)).slice(1).map((slot) => slot.id)
  );

  const overlapPlans = Array.from(overlapMap.values())
    .map((group) => {
      const merged = mergeOverlappingRanges(group);
      const normalizedExisting = Array.from(
        new Set(group.map((slot) => `${slot.startMin}-${slot.endMin}`))
      ).sort();
      const normalizedMerged = merged.map((slot) => `${slot.startMin}-${slot.endMin}`).sort();
      if (normalizedExisting.length === normalizedMerged.length && normalizedExisting.every((item, idx) => item === normalizedMerged[idx])) {
        return null;
      }
      const sorted = [...group].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id));
      return {
        teacherId: group[0]!.teacherId,
        weekday: group[0]!.weekday,
        deleteIds: group.map((slot) => slot.id),
        createRanges: merged,
        before: sorted.map((slot) => ({ id: slot.id, range: fmtRange(slot.startMin, slot.endMin) })),
      };
    })
    .filter(Boolean) as Array<{
      teacherId: string;
      weekday: number;
      deleteIds: string[];
      createRanges: Array<{ startMin: number; endMin: number }>;
      before: Array<{ id: string; range: string }>;
    }>;

  return { duplicateDeleteIds, overlapPlans };
}

async function main() {
  const apply = process.argv.includes("--apply");

  const [dateSlots, weeklySlots] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      select: { id: true, teacherId: true, date: true, startMin: true, endMin: true },
      orderBy: [{ teacherId: "asc" }, { date: "asc" }, { startMin: "asc" }, { id: "asc" }],
    }),
    prisma.teacherAvailability.findMany({
      select: { id: true, teacherId: true, weekday: true, startMin: true, endMin: true },
      orderBy: [{ teacherId: "asc" }, { weekday: "asc" }, { startMin: "asc" }, { id: "asc" }],
    }),
  ]);

  const datePlan = partitionDateSlots(dateSlots);
  const weeklyPlan = partitionWeeklySlots(weeklySlots);

  const summary = {
    mode: apply ? "apply" : "dry-run",
    policy: {
      overlapHandling: "merge overlapping only; do not merge adjacent ranges",
      exactDuplicateHandling: "keep lexicographically smallest id, remove the rest",
    },
    dateAvailability: {
      duplicateDeleteCount: datePlan.duplicateDeleteIds.length,
      overlapRewriteGroupCount: datePlan.overlapPlans.length,
      sampleRewrites: datePlan.overlapPlans.slice(0, 10).map((plan) => ({
        teacherId: plan.teacherId,
        date: fmtDate(plan.date),
        before: plan.before,
        after: plan.createRanges.map((slot) => fmtRange(slot.startMin, slot.endMin)),
      })),
    },
    weeklyAvailability: {
      duplicateDeleteCount: weeklyPlan.duplicateDeleteIds.length,
      overlapRewriteGroupCount: weeklyPlan.overlapPlans.length,
      sampleRewrites: weeklyPlan.overlapPlans.slice(0, 10).map((plan) => ({
        teacherId: plan.teacherId,
        weekday: plan.weekday,
        before: plan.before,
        after: plan.createRanges.map((slot) => fmtRange(slot.startMin, slot.endMin)),
      })),
    },
  };

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (datePlan.duplicateDeleteIds.length > 0) {
    await prisma.teacherAvailabilityDate.deleteMany({
      where: { id: { in: datePlan.duplicateDeleteIds } },
    });
  }

  for (const plan of datePlan.overlapPlans) {
    await prisma.$transaction(async (tx) => {
      await tx.teacherAvailabilityDate.deleteMany({
        where: { id: { in: plan.deleteIds } },
      });
      if (plan.createRanges.length > 0) {
        await tx.teacherAvailabilityDate.createMany({
          data: plan.createRanges.map((slot) => ({
            teacherId: plan.teacherId,
            date: plan.date,
            startMin: slot.startMin,
            endMin: slot.endMin,
          })),
        });
      }
    });
  }

  if (weeklyPlan.duplicateDeleteIds.length > 0) {
    await prisma.teacherAvailability.deleteMany({
      where: { id: { in: weeklyPlan.duplicateDeleteIds } },
    });
  }

  for (const plan of weeklyPlan.overlapPlans) {
    await prisma.$transaction(async (tx) => {
      await tx.teacherAvailability.deleteMany({
        where: { id: { in: plan.deleteIds } },
      });
      if (plan.createRanges.length > 0) {
        await tx.teacherAvailability.createMany({
          data: plan.createRanges.map((slot) => ({
            teacherId: plan.teacherId,
            weekday: plan.weekday,
            startMin: slot.startMin,
            endMin: slot.endMin,
          })),
        });
      }
    });
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        applied: true,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

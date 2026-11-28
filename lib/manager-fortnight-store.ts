import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { formatBusinessDateOnly } from "./date-only";
import { cycleDates, FIRST_DUE, openActions, readContent, shift, validDay, type Content } from "./fortnightly-reflection";

async function schedule(db: Pick<Prisma.TransactionClient, "managerReflectionSchedule">, managerId: string) {
  const row = await db.managerReflectionSchedule.findUnique({
    where: { managerId }, include: { periods: { orderBy: { dueDate: "asc" } } },
  });
  return {
    firstDue: row?.firstDue ?? FIRST_DUE,
    periods: (row?.periods ?? []).map(p => ({ ...p, content: p.content as Content })),
  };
}

export function loadFortnights(managerId: string) {
  return schedule(prisma, managerId);
}

export async function writeFortnight(managerId: string, form: FormData, now = new Date()) {
  const today = formatBusinessDateOnly(now);
  const intent = form.get("intent");
  return prisma.$transaction(async db => {
    // Serialize schedule changes and action reviews across periods for this owner.
    await db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${"manager-reflection/" + managerId}))`;
    const { firstDue, periods } = await schedule(db, managerId);
    if (firstDue !== form.get("anchor")) throw new Error("Schedule changed. Reload this page / 周期已调整，请刷新");
    if (intent === "configure") {
      const value = String(form.get("firstDue") ?? "");
      if (periods.length || !validDay(value) || value < today || value > shift(today, 366)) throw new Error("Choose a first due date within the next year, before saving the first entry / 请在首次保存前选择今天起一年内的截止日");
      await db.managerReflectionSchedule.upsert({where:{managerId}, create:{managerId, firstDue:value}, update:{firstDue:value}});
      return;
    }
    if (intent !== "draft" && intent !== "submit") throw new Error("Unknown action / 操作无效");
    const dueDate = String(form.get("due") ?? "");
    if (!cycleDates(firstDue, today).includes(dueDate)) throw new Error("Invalid reflection period / 复盘周期无效");
    const submit = intent === "submit";
    if (submit && today < shift(dueDate,-13)) throw new Error("Save a draft until the period starts / 周期开始前可保存草稿");
    const existing = periods.find(p => p.dueDate === dueDate);
    if (existing?.submittedAt) throw new Error("Already submitted. View the saved reflection / 本期已提交，请查看已保存的记录");
    if (Number(form.get("revision")) !== (existing?.revision ?? 0)) throw new Error("A newer draft exists. Reload before editing / 已有新版草稿，请刷新后编辑");
    const content = readContent(form, submit, openActions(periods, dueDate));
    const data = { content, revision: (existing?.revision ?? 0) + 1, submittedAt: submit ? now : null };
    if (existing) {
      await db.managerFortnightReflection.update({where:{managerId_dueDate:{managerId,dueDate}},data});
    } else {
      await db.managerReflectionSchedule.upsert({where:{managerId},create:{managerId, firstDue},update:{}});
      await db.managerFortnightReflection.create({data:{managerId,dueDate,...data}});
    }
  });
}

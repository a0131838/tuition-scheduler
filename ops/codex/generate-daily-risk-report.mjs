#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtDateTime(d) {
  return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function startOfDayLocal(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDayLocal(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

const UNMARKED_OVERDUE_HOURS = 3;

function isHighPriority(p) {
  const x = String(p || "").toUpperCase();
  return x === "P0" || x === "P1" || x === "HIGH" || x === "URGENT";
}

function isClosedStatus(s) {
  const x = String(s || "").toUpperCase();
  return x === "DONE" || x === "COMPLETED" || x === "CLOSED";
}

async function main() {
  const now = new Date();
  const sod = startOfDayLocal(now);
  const eod = endOfDayLocal(now);
  const unmarkedThresholdAt = new Date(now.getTime() - UNMARKED_OVERDUE_HOURS * 60 * 60 * 1000);

  const [
    ticketsToday,
    overdueTickets,
    highPriorityOpenTickets,
    txnsToday,
    unmarkedAttendances,
  ] = await Promise.all([
    prisma.ticket.findMany({
      where: { createdAt: { gte: sod, lte: eod } },
      orderBy: { createdAt: "desc" },
      select: { id: true, ticketNo: true, priority: true, status: true, owner: true, createdAt: true },
      take: 200,
    }),
    prisma.ticket.findMany({
      where: {
        isArchived: false,
        nextActionDue: { not: null, lt: now },
      },
      orderBy: { nextActionDue: "asc" },
      select: {
        id: true,
        ticketNo: true,
        owner: true,
        status: true,
        priority: true,
        nextActionDue: true,
      },
      take: 300,
    }),
    prisma.ticket.findMany({
      where: { isArchived: false },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        ticketNo: true,
        owner: true,
        status: true,
        priority: true,
        updatedAt: true,
      },
      take: 300,
    }),
    prisma.packageTxn.findMany({
      where: { createdAt: { gte: sod, lte: eod } },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, deltaMinutes: true, packageId: true, note: true, createdAt: true },
      take: 500,
    }),
    prisma.attendance.findMany({
      where: {
        status: "UNMARKED",
        session: {
          endAt: { lt: unmarkedThresholdAt },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        student: { select: { name: true } },
        session: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            teacher: { select: { name: true } },
            class: { select: { teacher: { select: { name: true } }, course: { select: { name: true } } } },
          },
        },
      },
      take: 500,
    }),
  ]);

  const overdueOpen = overdueTickets.filter((t) => !isClosedStatus(t.status));
  const highPriorityOpen = highPriorityOpenTickets.filter((t) => !isClosedStatus(t.status) && isHighPriority(t.priority));

  const txnsAdjust = txnsToday.filter((t) => t.kind === "ADJUST");
  const txnsRollback = txnsToday.filter((t) => t.kind === "ROLLBACK");
  const txnsLargeDeduct = txnsToday.filter((t) => t.kind === "DEDUCT" && Math.abs(t.deltaMinutes) >= 180);

  const ownerMissMap = new Map();
  for (const t of overdueOpen) {
    const owner = (t.owner || "未分配").trim() || "未分配";
    ownerMissMap.set(owner, (ownerMissMap.get(owner) || 0) + 1);
  }

  const teacherMissMap = new Map();
  for (const a of unmarkedAttendances) {
    const teacher = a.session.teacher?.name || a.session.class.teacher?.name || "未识别老师";
    teacherMissMap.set(teacher, (teacherMissMap.get(teacher) || 0) + 1);
  }

  const ownerMissingList = [...ownerMissMap.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const teacherMissingList = [...teacherMissMap.entries()]
    .map(([teacher, count]) => ({ teacher, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const highRiskItems = [
    ...txnsAdjust.slice(0, 5).map((x) => `财务高风险 ADJUST: txn=${x.id} 分钟变动=${x.deltaMinutes}`),
    ...txnsRollback.slice(0, 5).map((x) => `财务高风险 ROLLBACK: txn=${x.id} 分钟变动=${x.deltaMinutes}`),
    ...txnsLargeDeduct.slice(0, 5).map((x) => `财务复核 DEDUCT(大额): txn=${x.id} 分钟变动=${x.deltaMinutes}`),
    ...overdueOpen.slice(0, 5).map(
      (x) => `工单超时: ${x.ticketNo} owner=${x.owner || "未分配"} due=${x.nextActionDue ? fmtDateTime(x.nextActionDue) : "-"}`,
    ),
  ];

  const lines = [];
  lines.push(`【小赵日报】${fmtDate(now)} 系统经营与风控汇总`);
  lines.push("");
  lines.push("一、今天系统发生了什么");
  lines.push(`- 今日新增工单: ${ticketsToday.length}`);
  lines.push(`- 今日课包流水: ${txnsToday.length}（ADJUST ${txnsAdjust.length} / ROLLBACK ${txnsRollback.length} / 大额DEDUCT ${txnsLargeDeduct.length}）`);
  lines.push(`- 当前高优先未闭环工单: ${highPriorityOpen.length}`);
  lines.push(`- 当前超时工单(nextActionDue已过): ${overdueOpen.length}`);
  lines.push(`- 当前超时未点名(课程结束超过${UNMARKED_OVERDUE_HOURS}小时): ${unmarkedAttendances.length}`);
  lines.push("");

  lines.push("二、高风险清单（Top）");
  if (highRiskItems.length === 0) {
    lines.push("- 暂无高风险项");
  } else {
    for (const r of highRiskItems) lines.push(`- ${r}`);
  }
  lines.push("");

  lines.push("三、员工可能遗忘未做事项");
  if (ownerMissingList.length === 0 && teacherMissingList.length === 0) {
    lines.push("- 暂无明显遗漏");
  } else {
    if (ownerMissingList.length > 0) {
      lines.push("- 工单维度（按owner统计超时项）:");
      for (const x of ownerMissingList) lines.push(`  - ${x.owner}: ${x.count} 项`);
    }
    if (teacherMissingList.length > 0) {
      lines.push(`- 教务维度（按老师统计超时未点名，阈值${UNMARKED_OVERDUE_HOURS}小时）:`);
      for (const x of teacherMissingList) lines.push(`  - ${x.teacher}: ${x.count} 节`);
    }
  }
  lines.push("");

  lines.push("四、老板明日优先动作建议");
  lines.push("- 先处理：财务ADJUST/ROLLBACK相关流水复核");
  lines.push("- 再处理：超时工单前5项指定责任人与完成时限");
  lines.push("- 再处理：未点名最多的老师，先闭环点名");

  console.log(lines.join("\n"));

  if (process.argv.includes("--json")) {
    const payload = {
      date: fmtDate(now),
      summary: {
        ticketsToday: ticketsToday.length,
        txnsToday: txnsToday.length,
        txnsAdjust: txnsAdjust.length,
        txnsRollback: txnsRollback.length,
        txnsLargeDeduct: txnsLargeDeduct.length,
        highPriorityOpen: highPriorityOpen.length,
        overdueOpen: overdueOpen.length,
        unmarkedAttendances: unmarkedAttendances.length,
      },
      highRiskItems,
      ownerMissingList,
      teacherMissingList,
    };
    console.error("\n--- JSON ---");
    console.error(JSON.stringify(payload, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(`daily report failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

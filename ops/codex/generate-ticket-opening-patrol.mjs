#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtDateTime(d) { return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function priorityScore(priority) {
  const x = String(priority || '');
  if (x.includes('1小时')) return 400;
  if (x.includes('6小时')) return 300;
  if (x.includes('24小时')) return 200;
  if (x.includes('紧急')) return 150;
  return 100;
}
function overdueBadge(dueAt, now) {
  if (!dueAt) return '-';
  const due = new Date(dueAt);
  return due < now ? `${fmtDateTime(due)}（已超时）` : fmtDateTime(due);
}

async function main() {
  const now = new Date();
  const tickets = await prisma.ticket.findMany({
    where: {
      isArchived: false,
      status: { notIn: ['Completed', 'Cancelled'] },
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      ticketNo: true,
      studentName: true,
      owner: true,
      priority: true,
      status: true,
      type: true,
      nextActionDue: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 300,
  });

  const highPriorityNew = tickets
    .filter((t) => ['1小时紧急', '6小时紧急'].includes(String(t.priority || '')))
    .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const overdueOrNear = tickets
    .filter((t) => t.nextActionDue)
    .sort((a, b) => new Date(a.nextActionDue) - new Date(b.nextActionDue))
    .slice(0, 8);

  const stalled = tickets
    .filter((t) => t.nextActionDue && new Date(t.nextActionDue) < now && (now - new Date(t.updatedAt)) > 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.nextActionDue) - new Date(b.nextActionDue))
    .slice(0, 5);

  const lines = [];
  lines.push(`【工单开工巡检】${fmtDate(now)}`);
  lines.push('');
  lines.push('一、新增高优先级工单');
  if (highPriorityNew.length === 0) {
    lines.push('- 今日暂无 1小时/6小时紧急工单');
  } else {
    for (const t of highPriorityNew) {
      lines.push(`- ${t.ticketNo}｜${t.priority}｜${t.type}｜${t.studentName}｜负责人 ${t.owner || '未分配'}｜${overdueBadge(t.nextActionDue, now)}`);
    }
  }
  lines.push('');
  lines.push('二、即将超时或已超时工单');
  if (overdueOrNear.length === 0) {
    lines.push('- 当前无待关注工单');
  } else {
    for (const t of overdueOrNear) {
      lines.push(`- ${t.ticketNo}｜${t.priority || '-'}｜${t.status}｜${t.studentName}｜负责人 ${t.owner || '未分配'}｜${overdueBadge(t.nextActionDue, now)}`);
    }
  }
  lines.push('');
  lines.push('三、卡住未推进工单');
  if (stalled.length === 0) {
    lines.push('- 暂无超过24小时未推进且已到截止时间的工单');
  } else {
    for (const t of stalled) {
      lines.push(`- ${t.ticketNo}｜${t.status}｜负责人 ${t.owner || '未分配'}｜最晚截止 ${overdueBadge(t.nextActionDue, now)}`);
    }
  }
  lines.push('');
  lines.push('四、建议下一步动作');
  lines.push('- 先清 1小时紧急和已超时工单，逐张明确负责人和回写时间。');
  lines.push('- 再清超过24小时未推进工单，避免继续积压。');
  lines.push('- 上午11点前回看一次最早截止工单是否已更新状态。');

  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error(`ticket patrol report failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

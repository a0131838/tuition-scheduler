#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const UNMARKED_OVERDUE_HOURS = 3;

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtDateTime(d) { return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function overdueLabel(mins) {
  if (mins < 60) return `${mins}分钟超时`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}小时${m}分钟超时` : `${h}小时超时`;
}
function priorityScore(priority) {
  const x = String(priority || '');
  if (x.includes('1小时')) return 400;
  if (x.includes('6小时')) return 300;
  if (x.includes('24小时')) return 200;
  if (x.includes('紧急')) return 150;
  return 100;
}

async function main() {
  const now = new Date();
  const thresholdAt = new Date(now.getTime() - UNMARKED_OVERDUE_HOURS * 60 * 60 * 1000);

  const [tickets, attendances] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        isArchived: false,
        status: { notIn: ['Completed', 'Cancelled'] },
        OR: [
          { nextActionDue: { lt: now } },
          { priority: { in: ['1小时紧急', '6小时紧急'] } },
        ],
      },
      orderBy: [{ nextActionDue: 'asc' }, { createdAt: 'desc' }],
      select: {
        ticketNo: true,
        owner: true,
        status: true,
        priority: true,
        nextActionDue: true,
        studentName: true,
        type: true,
      },
      take: 200,
    }),
    prisma.attendance.findMany({
      where: {
        status: 'UNMARKED',
        session: { endAt: { lt: thresholdAt } },
      },
      select: {
        studentId: true,
        session: {
          select: {
            id: true,
            endAt: true,
            startAt: true,
            teacher: { select: { name: true } },
            class: {
              select: {
                teacher: { select: { name: true } },
                course: { select: { name: true } },
                subject: { select: { name: true } },
                level: { select: { name: true } },
              },
            },
          },
        },
      },
      take: 200,
    }),
  ]);

  const ticketsByOwner = new Map();
  const sortedTickets = [...tickets].sort((a, b) => {
    const diff = priorityScore(b.priority) - priorityScore(a.priority);
    if (diff !== 0) return diff;
    return new Date(a.nextActionDue || 0).getTime() - new Date(b.nextActionDue || 0).getTime();
  });
  for (const t of sortedTickets) {
    const owner = String(t.owner || '未分配').trim() || '未分配';
    const bucket = ticketsByOwner.get(owner) || [];
    bucket.push(t);
    ticketsByOwner.set(owner, bucket);
  }

  const unmarkedByTeacher = new Map();
  for (const row of attendances) {
    const teacher = row.session.teacher?.name || row.session.class.teacher?.name || '未识别老师';
    const courseLabel = [row.session.class.course.name, row.session.class.subject?.name, row.session.class.level?.name].filter(Boolean).join(' / ');
    const overdueMinutes = Math.max(0, Math.floor((now.getTime() - new Date(row.session.endAt).getTime()) / 60000));
    const bucket = unmarkedByTeacher.get(teacher) || [];
    bucket.push({
      sessionId: row.session.id,
      startAt: row.session.startAt,
      endAt: row.session.endAt,
      courseLabel,
      overdueMinutes,
    });
    unmarkedByTeacher.set(teacher, bucket);
  }

  const lines = [];
  lines.push(`【员工遗漏追踪】${fmtDate(now)}`);
  lines.push('');
  lines.push('一、今日最需要盯的负责人');
  if (ticketsByOwner.size === 0) {
    lines.push('- 暂无超时/高优先待闭环工单');
  } else {
    for (const [owner, items] of [...ticketsByOwner.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8)) {
      lines.push(`- ${owner}: ${items.length} 项`);
      for (const item of items.slice(0, 3)) {
        lines.push(`  - ${item.ticketNo}｜${item.priority}｜${item.type}｜${item.studentName}｜${item.nextActionDue ? fmtDateTime(new Date(item.nextActionDue)) : '-'}${item.nextActionDue && new Date(item.nextActionDue) < now ? '（已超时）' : ''}`);
      }
    }
  }
  lines.push('');
  lines.push(`二、超时未点名（>${UNMARKED_OVERDUE_HOURS}小时）`);
  if (unmarkedByTeacher.size === 0) {
    lines.push('- 暂无超时未点名');
  } else {
    for (const [teacher, items] of [...unmarkedByTeacher.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8)) {
      lines.push(`- ${teacher}: ${items.length} 节`);
      for (const item of items.sort((a, b) => b.overdueMinutes - a.overdueMinutes).slice(0, 3)) {
        lines.push(`  - ${fmtDateTime(new Date(item.startAt))}｜${item.courseLabel}｜${overdueLabel(item.overdueMinutes)}｜去点名: /admin/sessions/${item.sessionId}/attendance`);
      }
    }
  }
  lines.push('');
  lines.push('三、建议今日收口动作');
  lines.push('- 先清 1小时紧急和已超时工单，明确责任人与回写时间。');
  lines.push(`- 再清老师超时未点名，优先处理超过${UNMARKED_OVERDUE_HOURS}小时的课次。`);
  lines.push('- 晚上收工前确认所有高优先待闭环项是否已更新状态。');

  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error(`employee miss report failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

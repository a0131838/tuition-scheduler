#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ABNORMAL_KINDS = new Set(['ADJUST', 'ROLLBACK']);

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtDateTime(d) { return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function parseApprovalItems(raw) {
  if (!raw) return [];
  try { const x = JSON.parse(raw); return Array.isArray(x) ? x : []; } catch { return []; }
}

async function main() {
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [txnsToday, undeductedRows, appSettings] = await Promise.all([
    prisma.packageTxn.findMany({
      where: { createdAt: { gte: sod, lte: eod }, kind: { in: ['ADJUST', 'ROLLBACK', 'DEDUCT'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, kind: true, deltaMinutes: true, note: true, createdAt: true, packageId: true },
    }),
    prisma.attendance.findMany({
      where: {
        status: { in: ['PRESENT', 'LATE', 'ABSENT'] },
        deductedMinutes: 0,
        deductedCount: 0,
        waiveDeduction: false,
      },
      select: {
        id: true,
        student: { select: { name: true } },
        session: { select: { startAt: true, class: { select: { course: { select: { name: true } } } } } },
      },
      take: 100,
    }),
    prisma.appSetting.findMany({
      where: { key: { in: ['parent_receipt_approval_v1', 'partner_receipt_approval_v1'] } },
      select: { key: true, value: true },
    }),
  ]);

  const abnormal = txnsToday.filter((x) => ABNORMAL_KINDS.has(x.kind));
  const largeDeduct = txnsToday.filter((x) => x.kind === 'DEDUCT' && Math.abs(x.deltaMinutes) >= 180);
  const approvalMap = Object.fromEntries(appSettings.map((x) => [x.key, parseApprovalItems(x.value)]));
  const parentPending = (approvalMap['parent_receipt_approval_v1'] || []).filter((x) => (x.managerApprovedBy || []).length > 0 && (x.financeApprovedBy || []).length === 0 && !x.financeRejectedAt).length;
  const partnerPending = (approvalMap['partner_receipt_approval_v1'] || []).filter((x) => (x.managerApprovedBy || []).length > 0 && (x.financeApprovedBy || []).length === 0 && !x.financeRejectedAt).length;

  const lines = [];
  lines.push(`【今日财务异常汇总】${fmtDate(now)}`);
  lines.push('');
  lines.push('一、结论');
  lines.push(`- 今日异常流水：${abnormal.length} 笔（ADJUST/ROLLBACK）`);
  lines.push(`- 今日大额扣课：${largeDeduct.length} 笔`);
  lines.push(`- 已完成未减扣：${undeductedRows.length} 条`);
  lines.push(`- 待财务审批：${parentPending + partnerPending} 条`);
  lines.push('');
  lines.push('二、关键异常');
  if (abnormal.length === 0 && largeDeduct.length === 0 && undeductedRows.length === 0 && parentPending + partnerPending === 0) {
    lines.push('- 今日暂无需要老板关注的财务异常');
  } else {
    for (const row of abnormal.slice(0, 5)) {
      lines.push(`- ${row.kind}｜txn=${row.id}｜分钟变动=${row.deltaMinutes}｜${fmtDateTime(new Date(row.createdAt))}`);
    }
    for (const row of largeDeduct.slice(0, 3)) {
      lines.push(`- 大额DEDUCT｜txn=${row.id}｜分钟变动=${row.deltaMinutes}｜${fmtDateTime(new Date(row.createdAt))}`);
    }
    for (const row of undeductedRows.slice(0, 5)) {
      lines.push(`- 未减扣｜${row.student.name}｜${row.session.class.course.name}｜${fmtDateTime(new Date(row.session.startAt))}`);
    }
    if (parentPending + partnerPending > 0) {
      lines.push(`- 待审批｜家长收据 ${parentPending} 条｜合作方收据 ${partnerPending} 条`);
    }
  }
  lines.push('');
  lines.push('三、建议下一步');
  lines.push('- 先复核 ADJUST/ROLLBACK 的原因分类、审批人、证据备注是否完整。');
  lines.push('- 再处理已完成未减扣，避免课包和出勤对账继续积压。');
  lines.push('- 如有待审批收据，优先完成财务审批闭环。');

  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error(`finance anomaly report failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

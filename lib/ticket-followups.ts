import { prisma } from "@/lib/prisma";

type TicketFollowupRow = {
  id: string;
  ticketNo: string;
  studentName: string;
  type: string;
  priority: string;
  status: string;
  owner: string | null;
  nextAction: string | null;
  nextActionDue: Date;
  createdAt: Date;
};

export type OverdueTicketFollowupItem = {
  id: string;
  ticketNo: string;
  studentName: string;
  type: string;
  priority: string;
  status: string;
  owner: string | null;
  nextAction: string | null;
  nextActionDue: string;
  overdueMinutes: number;
  overdueLabel: string;
  openHref: string;
};

export type OverdueTicketFollowupGroup = {
  owner: string;
  count: number;
  maxOverdueMinutes: number;
  items: OverdueTicketFollowupItem[];
};

function overdueLabel(overdueMinutes: number) {
  if (overdueMinutes < 60) return `${overdueMinutes} min overdue`;
  const hours = Math.floor(overdueMinutes / 60);
  const minutes = overdueMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m overdue` : `${hours}h overdue`;
}

function byPriorityScore(priority: string) {
  if (priority.includes("1小时") || /1\s*hour/i.test(priority)) return 400;
  if (priority.includes("6小时") || /6\s*hour/i.test(priority)) return 300;
  if (priority.includes("24小时") || /24\s*hour/i.test(priority)) return 200;
  if (priority.includes("紧急") || /urgent/i.test(priority)) return 150;
  return 100;
}

export async function getOverdueTicketFollowupGroups(options?: {
  now?: Date;
  perOwnerLimit?: number;
  totalLimit?: number;
}) {
  const now = options?.now ?? new Date();
  const perOwnerLimit = Math.max(1, Math.min(options?.perOwnerLimit ?? 6, 20));
  const totalLimit = Math.max(1, Math.min(options?.totalLimit ?? 60, 200));

  const rows = await prisma.ticket.findMany({
    where: {
      isArchived: false,
      nextActionDue: { lt: now },
      status: { notIn: ["Completed", "Cancelled"] },
    },
    orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
    take: totalLimit,
    select: {
      id: true,
      ticketNo: true,
      studentName: true,
      type: true,
      priority: true,
      status: true,
      owner: true,
      nextAction: true,
      nextActionDue: true,
      createdAt: true,
    },
  }) as TicketFollowupRow[];

  const groups = new Map<string, OverdueTicketFollowupItem[]>();

  for (const row of rows) {
    const overdueMinutes = Math.max(0, Math.floor((now.getTime() - row.nextActionDue.getTime()) / 60000));
    const key = row.owner?.trim() || "Unassigned / 未分配";
    const item: OverdueTicketFollowupItem = {
      id: row.id,
      ticketNo: row.ticketNo,
      studentName: row.studentName,
      type: row.type,
      priority: row.priority,
      status: row.status,
      owner: row.owner,
      nextAction: row.nextAction,
      nextActionDue: row.nextActionDue.toISOString(),
      overdueMinutes,
      overdueLabel: overdueLabel(overdueMinutes),
      openHref: `/admin/tickets?q=${encodeURIComponent(row.ticketNo)}`,
    };
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries())
    .map(([owner, items]) => {
      const sorted = items
        .sort((a, b) => {
          const diff = byPriorityScore(b.priority) - byPriorityScore(a.priority);
          if (diff !== 0) return diff;
          return b.overdueMinutes - a.overdueMinutes;
        })
        .slice(0, perOwnerLimit);
      return {
        owner,
        count: items.length,
        maxOverdueMinutes: Math.max(...items.map((x) => x.overdueMinutes), 0),
        items: sorted,
      };
    })
    .sort((a, b) => {
      if (b.maxOverdueMinutes !== a.maxOverdueMinutes) return b.maxOverdueMinutes - a.maxOverdueMinutes;
      return b.count - a.count;
    });
}

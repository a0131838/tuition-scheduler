import { Prisma } from "@prisma/client";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import {
  coordinationBoardTicketDto,
  coordinationBoardTicketInclude,
} from "@/lib/miniapp-scheduling-coordination-board";
import { prisma } from "@/lib/prisma";
import { SCHEDULING_COORDINATION_TICKET_TYPE, TICKET_OWNER_OPTIONS } from "@/lib/tickets";

const FILTER_STATUSES = ["Waiting Parent", "Waiting Teacher", "Confirmed", "Exception"];

function clean(value: string | null, maxLen = 100) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) {
    return bad("Scheduling coordination permission required", 403);
  }

  const url = new URL(req.url);
  const status = clean(url.searchParams.get("status"), 40);
  const owner = clean(url.searchParams.get("owner"), 40);
  const query = clean(url.searchParams.get("q"), 80);
  const overdueOnly = url.searchParams.get("overdue") === "true";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  if (status && !FILTER_STATUSES.includes(status)) return bad("Invalid coordination status", 409);
  if (owner && !TICKET_OWNER_OPTIONS.some((item) => item.value === owner)) return bad("Invalid owner", 409);

  const openWhere: Prisma.TicketWhereInput = {
    type: SCHEDULING_COORDINATION_TICKET_TYPE,
    isArchived: false,
    status: { notIn: ["Completed", "Cancelled"] },
  };
  const where: Prisma.TicketWhereInput = {
    ...openWhere,
    ...(status ? { status } : {}),
    ...(owner ? { owner } : {}),
    ...(overdueOnly ? { nextActionDue: { lt: new Date() } } : {}),
    ...(query
      ? {
          OR: [
            { studentName: { contains: query, mode: "insensitive" } },
            { ticketNo: { contains: query, mode: "insensitive" } },
            { course: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [tickets, totalOpen, overdue, waitingParent, waitingTeacher, confirmed, exception] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: coordinationBoardTicketInclude,
      orderBy: [{ nextActionDue: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: limit,
    }),
    prisma.ticket.count({ where: openWhere }),
    prisma.ticket.count({ where: { ...openWhere, nextActionDue: { lt: new Date() } } }),
    prisma.ticket.count({ where: { ...openWhere, status: "Waiting Parent" } }),
    prisma.ticket.count({ where: { ...openWhere, status: "Waiting Teacher" } }),
    prisma.ticket.count({ where: { ...openWhere, status: "Confirmed" } }),
    prisma.ticket.count({ where: { ...openWhere, status: "Exception" } }),
  ]);

  return ok({
    tickets: tickets.map(coordinationBoardTicketDto),
    summary: { totalOpen, overdue, waitingParent, waitingTeacher, confirmed, exception },
  });
}

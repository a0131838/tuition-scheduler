import { prisma } from "@/lib/prisma";
import { bearerToken, bad } from "@/app/api/miniapp/_lib";
import { getStaffMiniappSession } from "@/lib/miniapp-staff";
import { schedulingActionInclude } from "@/lib/ticket-scheduling-actions";

export async function requireMiniappStaff(req: Request) {
  const token = bearerToken(req);
  if (!token) return { ok: false as const, response: bad("Unauthorized", 401) };
  const session = await getStaffMiniappSession(token);
  if (!session) return { ok: false as const, response: bad("Unauthorized", 401) };
  return { ok: true as const, session, user: session.user };
}

export async function getStaffRequestTicket(id: string, options?: { includeAllSources?: boolean }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { schedulingActions: { include: schedulingActionInclude, orderBy: { sequence: "asc" } } },
  });
  if (!ticket || (!options?.includeAllSources && ticket.source !== "家长小程序")) return null;
  return ticket;
}

export async function getParentRequestTicket(id: string) {
  return getStaffRequestTicket(id);
}

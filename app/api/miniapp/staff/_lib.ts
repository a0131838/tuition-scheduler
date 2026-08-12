import { prisma } from "@/lib/prisma";
import { bearerToken, bad } from "@/app/api/miniapp/_lib";
import { getStaffMiniappSession } from "@/lib/miniapp-staff";
import { schedulingActionInclude } from "@/lib/ticket-scheduling-actions";
import { isMutationMethod } from "@/lib/observer-mode";

export async function requireMiniappStaff(req: Request) {
  const token = bearerToken(req);
  if (!token) return { ok: false as const, response: bad("Unauthorized", 401) };
  const session = await getStaffMiniappSession(token);
  if (!session) return { ok: false as const, response: bad("Unauthorized", 401) };
  if (session.user.isObserver && isMutationMethod(req.method) && !new URL(req.url).pathname.endsWith("/auth/logout")) {
    return { ok: false as const, response: bad("观察者账号为只读，不能执行此操作 / Observer account is read-only", 403) };
  }
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

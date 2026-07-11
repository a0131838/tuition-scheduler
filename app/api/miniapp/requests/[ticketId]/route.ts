import { prisma } from "@/lib/prisma";
import { miniappRequestDto } from "@/lib/miniapp-parent-requests";
import { bad, ok, requireMiniappStudentAccess } from "../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !ticket.studentId || ticket.source !== "家长小程序" || !ticket.parentVisible) return bad("Request not found", 404);

  const auth = await requireMiniappStudentAccess(req, ticket.studentId, "canCreateRequests");
  if (!auth.ok) return auth.response;

  return ok({ request: miniappRequestDto(ticket) });
}

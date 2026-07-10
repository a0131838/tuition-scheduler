import { prisma } from "@/lib/prisma";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { logParentPortalAudit } from "@/lib/parent-portal";
import { TICKET_UPLOAD_ACCEPT, TICKET_UPLOAD_MAX_BYTES } from "@/lib/tickets";
import { bad, ok, requireMiniappStudentAccess } from "../../../_lib";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !ticket.studentId || ticket.source !== "家长小程序") return bad("Request not found", 404);

  const auth = await requireMiniappStudentAccess(req, ticket.studentId, "canCreateRequests");
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return bad("Invalid form data");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return bad("No file uploaded");
  if (files.length > 10) return bad("Too many files");

  const urls: string[] = [];
  for (const file of files) {
    if (file.size > TICKET_UPLOAD_MAX_BYTES) return bad(`File too large: ${file.name}`);
    if (file.type && !TICKET_UPLOAD_ACCEPT.includes(file.type)) return bad(`Unsupported file type: ${file.name}`);
    const stored = await storeBusinessUpload(file, {
      allowedPrefix: BUSINESS_UPLOAD_PREFIX.tickets,
      maxBytes: TICKET_UPLOAD_MAX_BYTES,
      fallbackOriginalName: "parent-request-file",
    });
    urls.push(`/api/tickets/files/${stored.storedFileName}`);
  }

  const currentProof = String(ticket.proof ?? "").trim();
  const nextProof = [currentProof, ...urls].filter(Boolean).join("\n").slice(0, 5000);
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      proof: nextProof,
      lastUpdateAt: new Date(),
    },
  });

  await logParentPortalAudit({
    parentId: auth.parent.id,
    studentId: ticket.studentId,
    action: "miniapp.request.attachments.upload",
    targetType: "Ticket",
    targetId: ticket.id,
    meta: { count: urls.length },
  }).catch(() => null);

  return ok({ urls, requestId: updated.id });
}

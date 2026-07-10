import { bad, ok } from "@/app/api/miniapp/_lib";
import { getParentRequestTicket, requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { prisma } from "@/lib/prisma";
import { TICKET_UPLOAD_ACCEPT, TICKET_UPLOAD_MAX_BYTES } from "@/lib/tickets";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const ticket = await getParentRequestTicket(id);
  if (!ticket) return bad("Parent request not found", 404);

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
      fallbackOriginalName: "staff-parent-request-file",
    });
    urls.push(`/api/tickets/files/${stored.storedFileName}`);
  }

  const currentProof = String(ticket.proof ?? "").trim();
  const nextProof = [currentProof, ...urls].filter(Boolean).join("\n").slice(0, 5000);
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      proof: nextProof,
      lastUpdateAt: new Date(),
    },
  });

  return ok({ urls, requestId: ticket.id });
}

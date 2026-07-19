import { bad, ok } from "@/app/api/miniapp/_lib";
import { getStaffRequestTicket, requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { TICKET_UPLOAD_ACCEPT, TICKET_UPLOAD_MAX_BYTES } from "@/lib/tickets";

export const runtime = "nodejs";

function ticketProofUrls(proof: string | null | undefined) {
  return String(proof ?? "").split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function ticketFileName(url: string) {
  if (url.startsWith("/api/tickets/files/")) return decodeURIComponent(url.split("/").pop() || "").trim();
  if (url.startsWith(BUSINESS_UPLOAD_PREFIX.tickets)) return url.slice(BUSINESS_UPLOAD_PREFIX.tickets.length).trim();
  return "";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const url = new URL(req.url);
  const includeAllSources = url.searchParams.get("scope") === "all";
  const ticket = await getStaffRequestTicket(id, { includeAllSources });
  if (!ticket) return bad(includeAllSources ? "Ticket not found" : "Parent request not found", 404);
  const requestedUrl = url.searchParams.get("file")?.trim() || "";
  if (!requestedUrl || !ticketProofUrls(ticket.proof).includes(requestedUrl)) return bad("Attachment not found", 404);
  const filename = ticketFileName(requestedUrl);
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) return bad("Attachment not found", 404);
  await logAudit({
    actor: auth.user,
    module: "TICKET",
    action: "VIEW_TICKET_ATTACHMENT",
    entityType: "Ticket",
    entityId: ticket.id,
    meta: { filename },
  });
  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.tickets,
    relativePath: `${BUSINESS_UPLOAD_PREFIX.tickets}${filename}`,
    originalFileName: filename,
    fallbackFileName: "ticket-file",
    inlineFileName: filename,
    cacheControl: "private, no-store",
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const includeAllSources = new URL(req.url).searchParams.get("scope") === "all";
  const ticket = await getStaffRequestTicket(id, { includeAllSources });
  if (!ticket) return bad(includeAllSources ? "Ticket not found" : "Parent request not found", 404);

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

  await logAudit({
    actor: auth.user,
    module: "TICKET",
    action: "UPLOAD_TICKET_ATTACHMENT",
    entityType: "Ticket",
    entityId: ticket.id,
    meta: { count: urls.length, urls },
  });

  return ok({ urls, requestId: ticket.id });
}

import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { logAudit } from "@/lib/audit-log";
import { canUseMiniappLeadDesk } from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ leadId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappLeadDesk(auth.user)) return bad("Lead desk permission required", 403);
  const { leadId } = await context.params;
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, leadNo: true, sourceDetail: true } });
  if (!lead) return bad("Lead not found", 404);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return bad("Screenshot is required");
  if (!file.type.startsWith("image/")) return bad("Only image screenshots are supported");
  try {
    const stored = await storeBusinessUpload(file, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.tickets, subdirSegments: ["leads", lead.id], maxBytes: 10 * 1024 * 1024 });
    const marker = `[咨询截图] ${stored.relativePath}`;
    await prisma.lead.update({ where: { id: lead.id }, data: { sourceDetail: [lead.sourceDetail, marker].filter(Boolean).join("\n").slice(0, 1000) } });
    await logAudit({ actor: auth.user, module: "leads", action: "UPLOAD_EVIDENCE", entityType: "Lead", entityId: lead.id, meta: { leadNo: lead.leadNo, originalName: stored.originalName } });
    return ok({ saved: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Screenshot upload failed", 409);
  }
}

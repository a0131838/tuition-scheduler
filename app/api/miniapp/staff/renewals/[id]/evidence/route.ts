import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { canUseMiniappAcademicDesk } from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Renewal center permission required", 403);
  const { id } = await params;
  const task = await prisma.renewalTask.findUnique({ where: { id } });
  if (!task) return bad("Renewal task not found", 404);
  const form = await req.formData().catch(() => null);
  const file = form?.get("files");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return bad("Screenshot is required");
  const stored = await storeBusinessUpload(file, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications,
    subdirSegments: ["renewals"],
    maxBytes: 10 * 1024 * 1024,
    fallbackOriginalName: "renewal-wechat-evidence.jpg",
  });
  const updated = await prisma.renewalTask.update({ where: { id }, data: { evidenceUrl: stored.relativePath } });
  await logAudit({
    actor: auth.user,
    module: "RENEWAL",
    action: "UPLOAD_WECHAT_EVIDENCE",
    entityType: "RenewalTask",
    entityId: id,
    meta: { evidenceUrl: stored.relativePath },
  });
  return ok({ evidenceUrl: updated.evidenceUrl });
}

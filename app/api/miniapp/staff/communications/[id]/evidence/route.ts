import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { logAudit } from "@/lib/audit-log";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { uploadStorageError } from "@/lib/upload-storage-error";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Communication center permission required", 403);
  const { id } = await params;
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id } });
  if (!task) return bad("Communication task not found", 404);
  const form = await req.formData().catch(() => null);
  const file = form?.get("files");
  if (!(file instanceof File)) return bad("Screenshot is required");
  if (!file.type.startsWith("image/")) return bad("Only image screenshots are supported");
  let stored: Awaited<ReturnType<typeof storeBusinessUpload>>;
  try {
    stored = await storeBusinessUpload(file, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications, maxBytes: 10 * 1024 * 1024, fallbackOriginalName: "wechat-evidence.jpg" });
  } catch (error) {
    const failure = uploadStorageError(error, auth.user.language);
    return bad(failure.message, failure.status);
  }
  const updated = await prisma.parentCommunicationTask.update({ where: { id }, data: { evidenceUrl: stored.relativePath } });
  await logAudit({ actor: auth.user, module: "COMMUNICATION", action: "UPLOAD_WECHAT_EVIDENCE", entityType: "ParentCommunicationTask", entityId: id, meta: { evidenceUrl: stored.relativePath } });
  return ok({ evidenceUrl: updated.evidenceUrl });
}

import { communicationActor, requireCommunicationCenterUser } from "@/lib/communication-access";
import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { prisma } from "@/lib/prisma";
import { attachRescheduleEvidence, isRescheduleNotice } from "@/lib/reschedule-notices";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCommunicationCenterUser();
  const { id } = await params;
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id } });
  if (!task) return Response.json({ ok: false, message: "Communication task not found" }, { status: 404 });
  if (isRescheduleNotice(task) && (task.ownerUserId !== user.id || task.supersededAt || task.manualSentAt || !["READY_TO_SEND", "CLAIMED"].includes(task.status))) {
    return Response.json({ ok: false, message: "请由当前负责人处理最新的待发改课通知。" }, { status: 409 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ ok: false, message: "请选择图片截图" }, { status: 400 });
  const stored = await storeBusinessUpload(file, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications, maxBytes: 10 * 1024 * 1024, fallbackOriginalName: "wechat-evidence.jpg" });
  if (isRescheduleNotice(task)) {
    try {
      const updated = await attachRescheduleEvidence(task, user.id, stored.relativePath);
      return Response.json({ ok: true, evidenceUrl: updated.evidenceUrl });
    } catch (error) {
      return Response.json({ ok: false, message: error instanceof Error ? error.message : "截图登记失败" }, { status: 409 });
    }
  }
  await prisma.parentCommunicationTask.update({ where: { id }, data: { evidenceUrl: stored.relativePath } });
  await logAudit({ actor: communicationActor(user), module: "COMMUNICATION", action: "UPLOAD_WECHAT_EVIDENCE", entityType: "ParentCommunicationTask", entityId: id, meta: { evidenceUrl: stored.relativePath } });
  return Response.json({ ok: true, evidenceUrl: stored.relativePath });
}

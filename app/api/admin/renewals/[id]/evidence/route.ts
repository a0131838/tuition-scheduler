import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { prisma } from "@/lib/prisma";
import { requireRenewalCenterUser } from "@/lib/renewal-access";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRenewalCenterUser();
  const { id } = await params;
  const task = await prisma.renewalTask.findUnique({ where: { id } });
  if (!task) return Response.json({ ok: false, message: "续费任务不存在" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return Response.json({ ok: false, message: "请选择微信发送截图" }, { status: 400 });
  }
  const stored = await storeBusinessUpload(file, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications,
    subdirSegments: ["renewals"],
    maxBytes: 10 * 1024 * 1024,
    fallbackOriginalName: "renewal-wechat-evidence.jpg",
  });
  await prisma.renewalTask.update({ where: { id }, data: { evidenceUrl: stored.relativePath } });
  await logAudit({
    actor: user,
    module: "RENEWAL",
    action: "UPLOAD_WECHAT_EVIDENCE",
    entityType: "RenewalTask",
    entityId: id,
    meta: { evidenceUrl: stored.relativePath },
  });
  return Response.json({ ok: true, evidenceUrl: stored.relativePath });
}
